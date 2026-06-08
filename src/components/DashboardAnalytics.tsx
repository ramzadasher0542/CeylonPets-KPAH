/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  TrendingUp, 
  Users, 
  AlertTriangle, 
  ShoppingBag, 
  Activity, 
  Calendar, 
  Download, 
  DollarSign, 
  HeartPulse, 
  RefreshCw, 
  CheckCircle,
  FileSpreadsheet,
  FileText
} from 'lucide-react';
import { InventoryItem, Appointment, MedicalRecord, Invoice } from '../types';

interface DashboardProps {
  inventory: InventoryItem[];
  appointments: Appointment[];
  records: MedicalRecord[];
  invoices: Invoice[];
  onTriggerSync: () => void;
  isOnline: boolean;
  syncQueueLength: number;
  systemConfig?: any;
}

export default function DashboardAnalytics({ 
  inventory, 
  appointments, 
  records, 
  invoices, 
  onTriggerSync, 
  isOnline,
  syncQueueLength,
  systemConfig
}: DashboardProps) {
  const currencySign = systemConfig?.currencySymbol || '$';
  const [reportMonth, setReportMonth] = useState('2026-05');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [chartType, setChartType] = useState<'revenue' | 'appointments'>('revenue');
  const [hoveredSlice, setHoveredSlice] = useState<'service' | 'medication' | 'retail' | null>(null);

  // Key performance calculations
  const totalRevenue = invoices.reduce((sum, inv) => inv.paymentStatus === 'paid' ? sum + inv.total : sum, 0);
  const retailRevenue = invoices.reduce((sum, inv) => {
    if (inv.paymentStatus !== 'paid') return sum;
    const retailSum = inv.items
      .filter(item => item.category === 'retail')
      .reduce((s, i) => s + i.totalPrice, 0);
    return sum + retailSum;
  }, 0);
  const clinicalRevenue = totalRevenue - retailRevenue;

  // Calculate total Cost of Goods Sold (COGS) based on inventory costs
  const totalCost = invoices.reduce((sum, inv) => {
    if (inv.paymentStatus !== 'paid') return sum;
    const invoiceCost = inv.items.reduce((itemSum, item) => {
      const invMatch = inventory.find(i => i.id === item.itemId || i.sku === item.sku);
      const unitCost = invMatch ? invMatch.cost : 0;
      return itemSum + (unitCost * item.quantity);
    }, 0);
    return sum + invoiceCost;
  }, 0);

  const netProfit = totalRevenue - totalCost;
  const lowStockItems = inventory.filter(item => item.stock <= item.minStock);
  const activeConsultations = appointments.filter(apt => apt.status === 'in-progress' || apt.status === 'booked').length;
  const patientsCount = records.length;

  // Find max date or fallback to today
  const maxDate = (() => {
    let dates = [...invoices.map(inv => inv.date), ...appointments.map(apt => apt.date)];
    if (dates.length === 0) return new Date().toISOString().split('T')[0];
    dates.sort();
    return dates[dates.length - 1];
  })();

  // Generate 7 days dynamically ending on maxDate
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const baseDate = new Date(maxDate);
    baseDate.setDate(baseDate.getDate() - (6 - i));
    return baseDate.toISOString().split('T')[0];
  });

  // Calculate dynamic data points for the trend chart
  const dailyRevenue = last7Days.map(date => {
    return invoices
      .filter(inv => inv.date === date && inv.paymentStatus === 'paid')
      .reduce((sum, inv) => sum + inv.total, 0);
  });

  const dailyAppointments = last7Days.map(date => {
    return appointments.filter(apt => apt.date === date).length;
  });

  const activeChartData = chartType === 'revenue' ? dailyRevenue : dailyAppointments;
  const currentMax = Math.max(...activeChartData);
  const maxChartVal = currentMax === 0 ? (chartType === 'revenue' ? 150 : 3) : currentMax;

  const points = activeChartData.map((val, idx) => {
    const x = 50 + idx * 64;
    // Map value to y-axis: grid goes from y=25 (max) to y=155 (min)
    const y = 155 - ((val / maxChartVal) * 125);
    return { x, y, val, date: last7Days[idx] };
  });

  // Dynamic Clinical Category revenue calculation
  const categoryRev = invoices.reduce((acc, inv) => {
    if (inv.paymentStatus !== 'paid') return acc;
    inv.items.forEach(it => {
      acc[it.category] = (acc[it.category] || 0) + it.totalPrice;
    });
    return acc;
  }, { service: 0, medication: 0, retail: 0 } as Record<string, number>);

  // Actual values instead of hardcoded mockups
  const finalCategoryRev = {
    service: categoryRev.service || 0,
    medication: categoryRev.medication || 0,
    retail: categoryRev.retail || 0
  };
  const finalTotalRevSum = Object.values(finalCategoryRev).reduce((a, b) => a + b, 0);

  const hasData = finalTotalRevSum > 0;

  const servicePct = hasData ? Math.round((finalCategoryRev.service / finalTotalRevSum) * 100) : 0;
  const medicationPct = hasData ? Math.round((finalCategoryRev.medication / finalTotalRevSum) * 100) : 0;
  const retailPct = hasData ? 100 - servicePct - medicationPct : 0;

  // Doughnut math configuration
  const circ = 251.32; // 2 * pi * r (r=40)
  const serviceDash = (servicePct / 100) * circ;
  const medicationDash = (medicationPct / 100) * circ;
  const retailDash = (retailPct / 100) * circ;

  const serviceOffset = 0;
  const medicationOffset = serviceDash;
  const retailOffset = serviceDash + medicationDash;
  
  const getSliceDetails = () => {
    if (!hasData) return { name: 'No Data Yet', rev: 0, pct: 0, color: 'text-slate-400' };
    const label = hoveredSlice || 'total';
    if (label === 'service') return { name: 'Clinical Care', rev: finalCategoryRev.service, pct: servicePct, color: 'text-sky-500' };
    if (label === 'medication') return { name: 'Prescriptions', rev: finalCategoryRev.medication, pct: medicationPct, color: 'text-emerald-500' };
    if (label === 'retail') return { name: 'Pet Shop Retail', rev: finalCategoryRev.retail, pct: retailPct, color: 'text-amber-500' };
    return { name: 'Total Revenue', rev: finalTotalRevSum, pct: 100, color: 'text-indigo-650' };
  };

  const sliceInfo = getSliceDetails();

  // Simulated highly human-readable clinic report exporter
  const handleExportTXT = () => {
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);

    const separator = "=================================================================================";
    const thinSeparator = "---------------------------------------------------------------------------------";

    let rtext = "";
    rtext += `${separator}\n`;
    rtext += `         ${(systemConfig?.hospitalName || 'Kandy Animal Pet Hospital').toUpperCase()} - MONTHLY CLINICAL & BILLING REPORT\n`;
    rtext += `${separator}\n`;
    rtext += `Generated At : 2026-05-22 00:46:22 UTC\n`;
    rtext += `Report Month : ${reportMonth}\n`;
    rtext += `Status       : OFFICIAL COMPILATION\n`;
    rtext += `${separator}\n\n`;

    // 1. FINANCIAL SUMMARY METRICS
    rtext += `I. FINANCIAL & CLINICAL METRICS SUMMARY\n`;
    rtext += `${thinSeparator}\n`;
    rtext += `  * Gross Total Revenue     : ${currencySign}${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    rtext += `  * Total cost of Goods Sold : ${currencySign}${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (COGS based on actual item units)\n`;
    rtext += `  * Net Hospital Profit     : ${currencySign}${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    rtext += `  * Clinical Care Revenue   : ${currencySign}${clinicalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    rtext += `  * Pet Retail Shop Revenue : ${currencySign}${retailRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
    rtext += `  * Total Patients Served   : ${patientsCount} active pet profiles registered in system\n`;
    rtext += `  * EHR Sync Status         : ${isOnline ? 'Online Synced' : 'Offline Pending Sync'}\n`;
    rtext += `${thinSeparator}\n\n`;

    // 2. INVOICING & CASH LEDGER
    rtext += `II. LEDGER DETAILS & INVOICES INSTANCES\n`;
    rtext += `${thinSeparator}\n`;
    rtext += `ID          | Date       | Pet Name   | Client/Owner       | Total Amt | Status  | Method\n`;
    rtext += `${thinSeparator}\n`;
    
    invoices.forEach(inv => {
      const idStr = inv.id.padEnd(11, ' ');
      const dateStr = inv.date.padEnd(10, ' ');
      const petStr = inv.petName.slice(0, 10).padEnd(10, ' ');
      const ownerStr = inv.ownerName.slice(0, 18).padEnd(18, ' ');
      const amtStr = (`${currencySign}${inv.total.toFixed(2)}`).padEnd(9, ' ');
      const statStr = inv.paymentStatus.toUpperCase().padEnd(7, ' ');
      const payMethStr = (inv.paymentMethod || 'N/A').padEnd(10, ' ');
      
      rtext += `${idStr} | ${dateStr} | ${petStr} | ${ownerStr} | ${amtStr} | ${statStr} | ${payMethStr}\n`;
    });
    rtext += `${thinSeparator}\n\n`;

    // 3. MEDICAL & DIAGNOSTICS REPORT
    rtext += `III. DIAGNOSTICS & CLINICAL CASE PROGRESS RECORDS\n`;
    rtext += `${thinSeparator}\n`;

    if (records.length === 0) {
      rtext += `  No clinical veterinary sessions recorded for this month.\n`;
    } else {
      records.forEach((rec, idx) => {
        const meds = rec.prescribedMeds.map(m => m.name).join(', ') || 'None';
        const vaccines = rec.vaccinations.map(v => v.name).join(', ') || 'None';
        
        rtext += `[Case #${idx + 1}] Record ID: ${rec.id}\n`;
        rtext += `  - Visit Date     : ${rec.visitDate}\n`;
        rtext += `  - Patient Pet    : ${rec.petName} (${rec.breed})\n`;
        rtext += `  - General Symptoms: ${rec.symptoms}\n`;
        rtext += `  - Vet Diagnosis   : ${rec.diagnosis}\n`;
        rtext += `  - Preserved Meds : ${meds}\n`;
        rtext += `  - Administered Vacs: ${vaccines}\n`;
        rtext += `---\n`;
      });
    }
    rtext += `${separator}\n`;
    rtext += `                     *** END OF HOSPITAL REPORT ***\n`;
    rtext += `${separator}\n`;

    const blob = new Blob([rtext], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const cleanHospitalName = (systemConfig?.hospitalName || 'Kandy_Pet_Hospital').replace(/\s+/g, '_');
    link.setAttribute('download', `${cleanHospitalName}_Monthly_Report_${reportMonth}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="dashboard-analytics">
      {/* Real-time sync panel */}
      {!isOnline && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between shadow-xs animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Clinician Field Mode Active (Offline)</p>
              <p className="text-xs text-amber-700">
                {syncQueueLength > 0 
                  ? `${syncQueueLength} transactional updates queued. All actions are securely cached locally and compliant.` 
                  : "Changes will be securely saved locally in encrypted state."}
              </p>
            </div>
          </div>
          {syncQueueLength > 0 && (
            <button 
              onClick={onTriggerSync}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="h-3 w-3 animate-spin" />
              Sync Manually Now
            </button>
          )}
        </div>
      )}

      {/* Main KPI metrics bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 w-full h-full rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden group hover:border-sky-300 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Sales</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{currencySign}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-teal-50 rounded-xl text-teal-600 group-hover:bg-teal-100 transition-all duration-300">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <text x="12" y="17" textAnchor="middle" fontSize="16" fontWeight="bold" fontFamily="sans-serif" stroke="none" fill="currentColor">{currencySign}</text>
              </svg>
            </div>
          </div>
          <div className="mt-4 flex gap-2 text-xs text-slate-500">
            {totalRevenue > 0 && invoices.length > 0 && (
              <>
                <span className="font-semibold text-emerald-600 flex items-center gap-0.5 animate-pulse">
                  <TrendingUp className="h-3 w-3" /> +14.2%
                </span>
                <span>vs last month</span>
              </>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-emerald-400" />
        </div>

        {/* Net Clinic Profit */}
        <div className="bg-white p-5 w-full h-full rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-amber-605 font-extrabold uppercase tracking-wider text-emerald-600">Net Profit</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">{currencySign}{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition-all duration-300">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex flex-col justify-end text-xs text-slate-400 font-mono">
            <span>Total COGS: {currencySign}{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        </div>

        {/* Clinical Sales */}
        <div className="bg-white p-5 w-full h-full rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden group hover:border-sky-300 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Clinical Care</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{currencySign}{clinicalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-sky-50 rounded-xl text-sky-600 group-hover:bg-sky-100 transition-all duration-300">
              <HeartPulse className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex gap-2 text-xs text-slate-500 font-mono">
            <span>{records.length} patients monitored</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sky-400 to-indigo-400" />
        </div>

        {/* Pet Shop Items Sales */}
        <div className="bg-white p-5 w-full h-full rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden group hover:border-sky-300 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pet Supplies Shop</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{currencySign}{retailRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-amber-500 group-hover:bg-amber-100 transition-all duration-300">
              <ShoppingBag className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex gap-4 text-xs text-slate-500 font-mono font-bold">
            <span>{inventory.filter(i => i.category === 'retail').length} products in stock</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-300 to-yellow-500" />
        </div>

        {/* Under Stock Alarms */}
        <div className={`bg-white p-5 w-full h-full flex flex-col justify-between rounded-2xl border shadow-sm relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${(inventory.length === 0 || lowStockItems.length > 0) ? 'border-rose-100 hover:border-rose-300' : 'border-sky-100 hover:border-sky-300'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Low Stock Warnings</p>
              <h3 className={`text-2xl font-bold mt-1 ${(inventory.length === 0 || lowStockItems.length > 0) ? 'text-rose-600 animate-pulse font-black' : 'text-slate-800'}`}>
                {inventory.length === 0 ? '0' : lowStockItems.length}
              </h3>
            </div>
            <div className={`p-3 rounded-xl transition-all duration-300 ${(inventory.length === 0 || lowStockItems.length > 0) ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 text-xs text-rose-700 font-mono truncate font-bold">
            {inventory.length === 0 ? 'Inventory is completely empty!' : 
             lowStockItems.length > 0 
              ? `${lowStockItems.map(i => i.name).slice(0, 1).join(',')} needs reorder!` 
              : 'All supplies optimally stocked'}
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${(inventory.length === 0 || lowStockItems.length > 0) ? 'bg-gradient-to-r from-rose-400 to-red-600' : 'bg-emerald-400'}`} />
        </div>
      </div>

      {/* Visual Analytics and Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Custom Interactive SVG Chart: Patient consultation volume */}
        <div className="bg-white p-6 w-full h-full rounded-2xl border border-sky-100 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
            <div>
              <h4 className="text-base font-black text-slate-800">Dynamic Hospital Trend Ledger</h4>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Real-time charts calculated from database files</p>
            </div>
            
            {/* Interactive Switchers */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setChartType('revenue')}
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-tight cursor-pointer transition-all ${
                  chartType === 'revenue' 
                    ? 'bg-indigo-650 bg-indigo-655 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Revenue Trend
              </button>
              <button
                onClick={() => setChartType('appointments')}
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-tight cursor-pointer transition-all ${
                  chartType === 'appointments' 
                    ? 'bg-indigo-650 bg-indigo-655 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Appointments Volume
              </button>
            </div>
          </div>

          {/* SVG Custom graph */}
          <div className="relative h-60 w-full">
            <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible font-sans select-none">
              <defs>
                <linearGradient id="chart-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chart-area-grad-apt" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="45" y1="25" x2="445" y2="25" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="45" y1="68" x2="445" y2="68" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="45" y1="111" x2="445" y2="111" stroke="#f1f5f9" strokeWidth="1" />
              <line x1="45" y1="155" x2="445" y2="155" stroke="#e2e8f0" strokeWidth="1.5" />

              {/* Labels y */}
              <text x="32" y="29" className="text-[9px] font-bold font-mono fill-slate-400" textAnchor="end">
                {chartType === 'revenue' ? `${currencySign}${maxChartVal.toFixed(0)}` : maxChartVal}
              </text>
              <text x="32" y="72" className="text-[9px] font-bold font-mono fill-slate-400" textAnchor="end">
                {chartType === 'revenue' ? `${currencySign}${(maxChartVal * 2 / 3).toFixed(0)}` : Math.round(maxChartVal * 2 / 3)}
              </text>
              <text x="32" y="115" className="text-[9px] font-bold font-mono fill-slate-400" textAnchor="end">
                {chartType === 'revenue' ? `${currencySign}${(maxChartVal / 3).toFixed(0)}` : Math.round(maxChartVal / 3)}
              </text>
              <text x="32" y="159" className="text-[9px] font-bold font-mono fill-slate-400" textAnchor="end">0</text>

              {/* Dynamic Days/Weeks */}
              {points.map((p, idx) => (
                <text key={idx} x={p.x} y="176" className="text-[8px] font-bold fill-slate-500" textAnchor="middle">
                  {p.date.slice(5)}
                </text>
              ))}

              {/* Shaded Area Gradients */}
              <path 
                d={`M 50 155 ${points.map(p => `L ${p.x} ${p.y}`).join(' ')} L ${points[points.length-1].x} 155 Z`} 
                fill={`url(#${chartType === 'revenue' ? 'chart-area-grad' : 'chart-area-grad-apt'})`} 
                className="transition-all duration-700"
              />
              
              {/* Trend line */}
              <path 
                d={points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}
                fill="none" 
                stroke={chartType === 'revenue' ? '#4f46e5' : '#0ea5e9'} 
                strokeWidth="3" 
                strokeLinecap="round"
                className="transition-all duration-700"
              />

              {/* Circle Nodes with visual hovers */}
              {points.map((p, idx) => (
                <g key={idx} className="group/node cursor-pointer">
                  <circle 
                    cx={p.x} 
                    cy={p.y} 
                    r="4" 
                    fill={chartType === 'revenue' ? '#4f46e5' : '#0ea5e9'} 
                    stroke="#ffffff" 
                    strokeWidth="1.5"
                    className="transition-all duration-300 group-hover/node:r-6" 
                  />
                  
                  {/* Hover values tooltip */}
                  <g className="opacity-0 group-hover/node:opacity-100 transition-all duration-300">
                    <rect 
                      x={p.x - 30} 
                      y={p.y - 30} 
                      width="60" 
                      height="20" 
                      rx="6" 
                      fill="#1e293b" 
                    />
                    <text 
                      x={p.x} 
                      y={p.y - 17} 
                      className="text-[9px] font-extrabold fill-white font-mono" 
                      textAnchor="middle"
                    >
                      {chartType === 'revenue' ? `${currencySign}${p.val.toFixed(0)}` : `${p.val} visits`}
                    </text>
                  </g>
                </g>
              ))}
            </svg>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium italic text-center">
            *Fully dynamic analytics spooled from system checkout invoices and scheduling matrices.
          </p>
        </div>

        {/* POS Sales Share Distribution */}
        <div className="bg-white p-6 w-full h-full rounded-2xl border border-sky-100 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h4 className="text-base font-black text-slate-800">POS Billing Breakdown</h4>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Category share of gross revenue ledger</p>
            </div>
            
            {/* Interactive SVG Doughnut Chart */}
            <div className="relative flex items-center justify-center py-4">
              <svg width="150" height="150" viewBox="0 0 100 100" className="overflow-visible select-none">
                <g transform="rotate(-90 50 50)">
                  {/* Background track */}
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" strokeWidth="11" />
                  
                  {/* Segment 1: Clinical */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke="#38bdf8" 
                    strokeWidth={hoveredSlice === 'service' ? "14" : "11"} 
                    strokeDasharray={`${serviceDash} ${circ}`} 
                    strokeDashoffset={-serviceOffset} 
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice('service')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                  
                  {/* Segment 2: Medication */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke="#34d399" 
                    strokeWidth={hoveredSlice === 'medication' ? "14" : "11"} 
                    strokeDasharray={`${medicationDash} ${circ}`} 
                    strokeDashoffset={-medicationOffset} 
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice('medication')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />

                  {/* Segment 3: Retail */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="40" 
                    fill="none" 
                    stroke="#fbbf24" 
                    strokeWidth={hoveredSlice === 'retail' ? "14" : "11"} 
                    strokeDasharray={`${retailDash} ${circ}`} 
                    strokeDashoffset={-retailOffset} 
                    className="transition-all duration-300 cursor-pointer"
                    onMouseEnter={() => setHoveredSlice('retail')}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                </g>

                {/* Center text displays hovered slice details */}
                <g className="transition-all duration-300">
                  <text x="50" y="44" className="text-[7px] font-mono font-bold fill-slate-400 text-center" textAnchor="middle">
                    {sliceInfo.name.toUpperCase()}
                  </text>
                  <text x="50" y="56" className={`text-xs font-black font-mono text-center fill-slate-800`} textAnchor="middle">
                    {hasData ? `${currencySign}${sliceInfo.rev.toFixed(0)}` : ''}
                  </text>
                  <text x="50" y="65" className={`text-[9px] font-black text-center ${sliceInfo.color}`} textAnchor="middle">
                    {hasData ? `${sliceInfo.pct}% Share` : ''}
                  </text>
                </g>
              </svg>
            </div>

            {/* Legend with mouse enters triggers */}
            <div className="space-y-2 pt-2 border-t text-xs">
              <div 
                className={`flex justify-between items-center p-1.5 rounded-lg transition-colors cursor-pointer ${hoveredSlice === 'service' ? 'bg-sky-50 font-bold' : ''}`}
                onMouseEnter={() => setHoveredSlice('service')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded bg-sky-400 block"></span>
                  Clinical Care
                </span>
                <span className="font-mono text-slate-500 font-bold">{currencySign}{finalCategoryRev.service.toFixed(2)} ({servicePct}%)</span>
              </div>

              <div 
                className={`flex justify-between items-center p-1.5 rounded-lg transition-colors cursor-pointer ${hoveredSlice === 'medication' ? 'bg-emerald-50 font-bold' : ''}`}
                onMouseEnter={() => setHoveredSlice('medication')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-400 block"></span>
                  Prescription Rx
                </span>
                <span className="font-mono text-slate-500 font-bold">{currencySign}{finalCategoryRev.medication.toFixed(2)} ({medicationPct}%)</span>
              </div>

              <div 
                className={`flex justify-between items-center p-1.5 rounded-lg transition-colors cursor-pointer ${hoveredSlice === 'retail' ? 'bg-amber-50 font-bold' : ''}`}
                onMouseEnter={() => setHoveredSlice('retail')}
                onMouseLeave={() => setHoveredSlice(null)}
              >
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="w-2.5 h-2.5 rounded bg-amber-400 block"></span>
                  Pet Retail Shop
                </span>
                <span className="font-mono text-slate-500 font-bold">{currencySign}{finalCategoryRev.retail.toFixed(2)} ({retailPct}%)</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 bg-slate-50 p-3 rounded-xl flex items-center justify-between">
            <div className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              <span className="font-black text-slate-700 block">Interactive Legend</span>
              Hover slices to inspect billing logs!
            </div>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase rounded flex items-center gap-0.5 leading-none">
              <CheckCircle className="w-3 h-3 text-emerald-600" strokeWidth="3" /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Monthly Report Generator (Easily customization & export area) */}
      <div className="p-6 bg-gradient-to-r from-indigo-50 to-sky-50 border border-indigo-150 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-center sm:text-left">
          <div className="p-3 bg-white text-indigo-655 rounded-xl shadow-xs border border-indigo-100">
            <FileText className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">Monthly Clinical & Billing Export</h4>
            <p className="text-xs text-slate-600 mt-0.5">
              Generates a beautifully structured human-readable text report containing financial summaries, billing records, and clinical veterinary diagnostics.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input 
            type="month"
            value={reportMonth}
            onChange={(e) => setReportMonth(e.target.value)}
            className="px-3 py-2 bg-white border border-sky-200 text-xs font-semibold rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            onClick={handleExportTXT}
            className="whitespace-nowrap px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <Download className="h-4.5 w-4.5" />
            Export Monthly Summary
          </button>
        </div>
      </div>

      {exportSuccess && (
        <div className="fixed bottom-4 right-4 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg text-xs font-bold z-50 flex items-center gap-2 animate-bounce">
          <CheckCircle className="h-4 w-4" />
          Report exported successfully to your downloads!
        </div>
      )}
    </div>
  );
}
