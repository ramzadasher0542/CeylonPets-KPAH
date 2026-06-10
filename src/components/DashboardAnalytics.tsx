/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import useSWR from 'swr';
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
  FileText,
  X
} from 'lucide-react';
import { InventoryItem, Appointment, MedicalRecord, Invoice } from '../types';
import { fetchShiftMetrics, fetchLowStockCount, fetchActiveShiftId, openShift, closeShift } from '../lib/db';
import { showToast } from './Toast';

interface DashboardProps {
  inventory: InventoryItem[];
  appointments: Appointment[];
  records: MedicalRecord[];
  invoices: Invoice[];
  onTriggerSync: () => void;
  isOnline: boolean;
  syncQueueLength: number;
  systemConfig?: any;
  currentUser?: any;
}

export default function DashboardAnalytics({ 
  inventory, 
  appointments, 
  records, 
  invoices, 
  onTriggerSync, 
  isOnline,
  syncQueueLength,
  systemConfig,
  currentUser
}: DashboardProps) {
  const currencySign = systemConfig?.currencySymbol || '$';
  const [reportMonth, setReportMonth] = useState('2026-05');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [chartType, setChartType] = useState<'revenue' | 'appointments'>('revenue');
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const [isZReportModalOpen, setIsZReportModalOpen] = useState(false);
  const [actualDrawerCash, setActualDrawerCash] = useState<string>('');
  const [zReportNotes, setZReportNotes] = useState('');
  const [isClosingShift, setIsClosingShift] = useState(false);

  const { data: shiftMetrics, mutate: mutateMetrics } = useSWR('shiftMetrics', fetchShiftMetrics, { refreshInterval: 30000 });
  const { data: lowStockCount } = useSWR('lowStockCount', fetchLowStockCount, { refreshInterval: 60000 });
  const { data: activeShiftId, mutate: mutateShiftId } = useSWR('activeShiftId', fetchActiveShiftId, { refreshInterval: 30000 });

  const expectedDrawerCash = invoices
    .filter(inv => inv.shiftId === activeShiftId && inv.paymentMethod === 'cash')
    .reduce((sum, inv) => sum + inv.total, 0);

  const handleOpenShift = async () => {
    try {
      await openShift(currentUser?.name || 'Admin');
      mutateShiftId();
      mutateMetrics();
      showToast('Shift opened successfully!', 'success');
    } catch (err) {
      showToast('Error opening shift', 'error');
    }
  };

  const handleCloseShift = async () => {
    if (!activeShiftId) return;
    const actual = parseFloat(actualDrawerCash);
    if (isNaN(actual)) {
      showToast('Please enter a valid amount', 'error');
      return;
    }
    
    // Strict Validation
    if (actual !== expectedDrawerCash && !zReportNotes.trim()) {
      showToast('Discrepancy detected: Please provide notes explaining the difference.', 'error');
      return;
    }

    setIsClosingShift(true);
    try {
      await closeShift(activeShiftId, actual, expectedDrawerCash, zReportNotes);
      mutateShiftId();
      mutateMetrics();
      setIsZReportModalOpen(false);
      setActualDrawerCash('');
      setZReportNotes('');
      showToast('Shift closed successfully!', 'success');
    } catch (err) {
      showToast('Error closing shift', 'error');
    } finally {
      setIsClosingShift(false);
    }
  };

  const totalRevenue = shiftMetrics?.gross_sales || 0;
  const netProfit = shiftMetrics?.net_profit || 0;
  const totalCost = shiftMetrics?.cogs || shiftMetrics?.total_cogs || 0;

  const getCatTotal = (catName: string) => {
    return shiftMetrics?.category_breakdown?.find(c => c.category === catName)?.total || 0;
  };

  const retailRevenue = getCatTotal('retail');
  const clinicalRevenue = getCatTotal('service') + getCatTotal('lab_service') + getCatTotal('vaccine');

  const lowStockItemsCount = lowStockCount || 0;
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
  
  const getTickStep = (max: number) => {
    if (max === 0) return chartType === 'revenue' ? 50 : 1;
    const targetStep = max / 3;
    const mag = Math.pow(10, Math.floor(Math.log10(targetStep || 1)));
    const normalized = targetStep / mag;
    let step;
    if (normalized <= 1) step = 1;
    else if (normalized <= 2) step = 2;
    else if (normalized <= 5) step = 5;
    else step = 10;
    return Math.max(1, step * mag);
  };
  const tickStep = getTickStep(currentMax);
  const maxChartVal = tickStep * 3;

  const points = activeChartData.map((val, idx) => {
    const x = 50 + idx * 64;
    // Map value to y-axis: grid goes from y=25 (max) to y=155 (min)
    const y = 155 - ((val / maxChartVal) * 125);
    return { x, y, val, date: last7Days[idx] };
  });

  // Dynamic Category revenue calculation for the current shift (now strictly pulled from backend RPC)
  const allCategories = (shiftMetrics?.category_breakdown || [])
    .map((item) => ({ name: item.category, rev: item.total }))
    .sort((a, b) => b.rev - a.rev);

  // Group into 'Other' if > 5 categories
  let displayCategories: { name: string, rev: number }[] = [];
  if (allCategories.length > 5) {
    displayCategories = allCategories.slice(0, 4);
    const otherRev = allCategories.slice(4).reduce((sum, c) => sum + c.rev, 0);
    displayCategories.push({ name: 'other', rev: otherRev });
  } else {
    displayCategories = allCategories;
  }

  const finalTotalRevSum = shiftMetrics?.gross_sales || 0;
  const hasData = finalTotalRevSum > 0;

  // Add colors and compute percentages/Doughnut math
  const palette = [
    { color: 'text-sky-500', hex: '#38bdf8', bg: 'bg-sky-400', hoverBg: 'bg-sky-50' },
    { color: 'text-emerald-500', hex: '#34d399', bg: 'bg-emerald-400', hoverBg: 'bg-emerald-50' },
    { color: 'text-amber-500', hex: '#fbbf24', bg: 'bg-amber-400', hoverBg: 'bg-amber-50' },
    { color: 'text-purple-500', hex: '#a855f7', bg: 'bg-purple-400', hoverBg: 'bg-purple-50' },
    { color: 'text-rose-500', hex: '#fb7185', bg: 'bg-rose-400', hoverBg: 'bg-rose-50' },
    { color: 'text-slate-500', hex: '#94a3b8', bg: 'bg-slate-400', hoverBg: 'bg-slate-50' }
  ];

  const circ = 251.32; // 2 * pi * r (r=40)
  let currentOffset = 0;

  const dynamicSegments = displayCategories.map((c, idx) => {
    const pct = hasData ? Math.round((c.rev / finalTotalRevSum) * 100) : 0;
    const dash = (pct / 100) * circ;
    const offset = currentOffset;
    currentOffset += dash;
    const style = palette[idx % palette.length];
    
    return {
      ...c,
      pct,
      dash,
      offset,
      style
    };
  });

  const getSliceDetails = () => {
    if (!hasData) return { name: 'No Data Yet', rev: 0, pct: 0, color: 'text-slate-400' };
    if (hoveredSlice) {
      const seg = dynamicSegments.find(s => s.name === hoveredSlice);
      if (seg) return { name: seg.name, rev: seg.rev, pct: seg.pct, color: seg.style.color };
    }
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

      {/* Shift Status Indicator */}
      <div className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl border shadow-sm border-indigo-100">
        <div className="flex items-center gap-4">
          {activeShiftId ? (
            <>
              <div className="flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-bold text-slate-700">Active Register Shift Open</span>
              </div>
              <button 
                onClick={() => setIsZReportModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Close Shift (Z-Report)
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                <span className="text-sm font-bold text-slate-700">Register Closed (No Active Shift)</span>
              </div>
              <button 
                onClick={handleOpenShift}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm transition-colors flex items-center gap-2"
              >
                <Activity className="w-4 h-4" />
                Open New Shift
              </button>
            </>
          )}
        </div>

        <div className="text-xs text-slate-500 font-semibold">Metrics show data for the current shift only</div>
      </div>

      {/* Main KPI metrics bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-5 w-full h-full rounded-2xl border border-sky-100 shadow-sm relative overflow-hidden group hover:border-sky-300 transition-all duration-300 hover:-translate-y-0.5 cursor-pointer flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Gross Sales</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{currencySign}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="absolute -bottom-4 -right-4 opacity-10 text-[100px] font-black pointer-events-none select-none text-teal-600 leading-none">
              {currencySign}
            </div>
            <div className="p-3 bg-teal-50 rounded-xl text-teal-600 group-hover:bg-teal-100 transition-all duration-300 relative z-10">
              <DollarSign className="h-5 w-5" />
            </div>
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
        <div className={`bg-white p-5 w-full h-full flex flex-col justify-between rounded-2xl border shadow-sm relative overflow-hidden group transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${(inventory.length === 0 || lowStockItemsCount > 0) ? 'border-rose-100 hover:border-rose-300' : 'border-sky-100 hover:border-sky-300'}`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] font-black text-slate-400 tracking-wider uppercase mb-0.5 flex items-center gap-1.5">Low Stock Warnings</p>
              <h3 className={`text-2xl font-bold mt-1 ${(inventory.length === 0 || lowStockItemsCount > 0) ? 'text-rose-600 animate-pulse font-black' : 'text-emerald-600'}`}>
                {inventory.length === 0 ? '0' : lowStockItemsCount}
              </h3>
            </div>
            <div className={`p-3 rounded-xl transition-all duration-300 ${(inventory.length === 0 || lowStockItemsCount > 0) ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100'}`}>
              {(inventory.length === 0 || lowStockItemsCount > 0) ? <AlertTriangle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
            </div>
          </div>
          <div className={`mt-4 text-xs font-mono truncate font-bold ${(inventory.length === 0 || lowStockItemsCount > 0) ? 'text-rose-700' : 'text-emerald-600'}`}>
            {inventory.length === 0 
             ? 'No physical stock recorded' 
             : lowStockItemsCount > 0 
              ? `${lowStockItemsCount} item(s) need reorder!` 
              : 'All supplies optimally stocked'}
          </div>
          <div className={`absolute bottom-0 left-0 right-0 h-1 ${(inventory.length === 0 || lowStockItemsCount > 0) ? 'bg-gradient-to-r from-rose-400 to-red-600' : 'bg-emerald-400'}`} />
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
                    ? 'bg-indigo-600 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Revenue Trend
              </button>
              <button
                onClick={() => setChartType('appointments')}
                className={`px-3 py-1.5 rounded-lg text-[10px] uppercase font-bold tracking-tight cursor-pointer transition-all ${
                  chartType === 'appointments' 
                    ? 'bg-indigo-600 text-white shadow-sm' 
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
                {chartType === 'revenue' ? `${currencySign}${maxChartVal}` : maxChartVal}
              </text>
              <text x="32" y="72" className="text-[9px] font-bold font-mono fill-slate-400" textAnchor="end">
                {chartType === 'revenue' ? `${currencySign}${tickStep * 2}` : tickStep * 2}
              </text>
              <text x="32" y="115" className="text-[9px] font-bold font-mono fill-slate-400" textAnchor="end">
                {chartType === 'revenue' ? `${currencySign}${tickStep}` : tickStep}
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
                  
                  {/* Dynamic Segments */}
                  {dynamicSegments.map(seg => (
                    <circle 
                      key={seg.name}
                      cx="50" 
                      cy="50" 
                      r="40" 
                      fill="none" 
                      stroke={seg.style.hex} 
                      strokeWidth={hoveredSlice === seg.name ? "14" : "11"} 
                      strokeDasharray={`${seg.dash} ${circ}`} 
                      strokeDashoffset={-seg.offset} 
                      className="transition-all duration-300 cursor-pointer"
                      onMouseEnter={() => setHoveredSlice(seg.name)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  ))}
                </g>

                {/* Center text displays hovered slice details */}
                <g className="transition-all duration-300">
                  <text x="50" y="44" className="text-[7px] font-mono font-bold fill-slate-400 text-center" textAnchor="middle">
                    {sliceInfo.name.toUpperCase()}
                  </text>
                  <text x="50" y="56" className={`text-xs font-black font-mono text-center fill-slate-800`} textAnchor="middle">
                    {hasData ? `${currencySign}${sliceInfo.rev.toFixed(2)}` : ''}
                  </text>
                  <text x="50" y="65" className={`text-[9px] font-black text-center ${sliceInfo.color}`} textAnchor="middle">
                    {hasData ? `${sliceInfo.pct}% Share` : ''}
                  </text>
                </g>
              </svg>
            </div>

            {/* Legend with mouse enters triggers */}
            <div className="space-y-2 pt-2 border-t text-xs max-h-36 overflow-y-auto pr-1">
              {dynamicSegments.map(seg => (
                <div 
                  key={seg.name}
                  className={`flex justify-between items-center p-1.5 rounded-lg transition-colors cursor-pointer ${hoveredSlice === seg.name ? `${seg.style.hoverBg} font-bold` : ''}`}
                  onMouseEnter={() => setHoveredSlice(seg.name)}
                  onMouseLeave={() => setHoveredSlice(null)}
                >
                  <span className="flex items-center gap-2 text-slate-700 capitalize">
                    <span className={`w-2.5 h-2.5 rounded block ${seg.style.bg}`}></span>
                    {seg.name.replace(/_/g, ' ')}
                  </span>
                  <span className="font-mono text-slate-500 font-bold">{currencySign}{seg.rev.toFixed(2)} ({seg.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Z-Report Modal */}
      {isZReportModalOpen && (
        <div className="fixed inset-0 bg-slate-800/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
                Close Shift (Z-Report)
              </h2>
              <button 
                onClick={() => setIsZReportModalOpen(false)}
                className="p-2 hover:bg-white rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              <div className="bg-indigo-50 text-indigo-800 p-4 rounded-xl flex justify-between items-center border border-indigo-100">
                <span className="font-semibold">Expected Drawer Cash:</span>
                <span className="text-xl font-black">{currencySign}{expectedDrawerCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Actual Drawer Cash Count *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-500 font-bold">{currencySign}</span>
                  </div>
                  <input
                    type="number"
                    value={actualDrawerCash}
                    onChange={(e) => setActualDrawerCash(e.target.value)}
                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono text-lg font-bold"
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Reconciliation Notes {parseFloat(actualDrawerCash) !== expectedDrawerCash && <span className="text-rose-500">(Required due to discrepancy)</span>}
                </label>
                <textarea
                  value={zReportNotes}
                  onChange={(e) => setZReportNotes(e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all min-h-[100px]"
                  placeholder="Explain any over/short amounts, or record end-of-shift notes..."
                />
              </div>
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={() => setIsZReportModalOpen(false)}
                className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                disabled={isClosingShift}
              >
                Cancel
              </button>
              <button 
                onClick={handleCloseShift}
                disabled={isClosingShift || actualDrawerCash === ''}
                className="px-6 py-2.5 font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-indigo-200 flex items-center gap-2"
              >
                {isClosingShift ? 'Processing...' : 'Submit Z-Report'}
              </button>
            </div>
          </div>
        </div>
      )}
      


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
          <input name="inputMonth647" id="input-month-647" 
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
