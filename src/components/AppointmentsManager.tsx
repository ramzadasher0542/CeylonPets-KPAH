/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar, 
  Clock, 
  Search, 
  Plus, 
  User, 
  CheckCircle2, 
  Activity, 
  X, 
  Sparkles,
  RefreshCw,
  Phone,
  Bookmark,
  Stethoscope,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Appointment, AppointmentStatus, MedicalRecord, User as StaffUser } from '../types';
import { showToast } from './Toast';
import { fetchVeterinarians } from '../lib/db';
import { formatDisplayDate, formatDisplayTime } from '../utils/time';

interface AppointmentsProps {
  appointments: Appointment[];
  records: MedicalRecord[];
  isOnline: boolean;
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onAddRecord: (record: MedicalRecord) => void;
}

export default function AppointmentsManager({ 
  appointments,
  records,
  isOnline, 
  onAddAppointment, 
  onUpdateStatus,
  onAddRecord
}: AppointmentsProps) {
  // Navigation tabs: 'planner' or 'history'
  const [activeSubTab, setActiveSubTab] = useState<'planner' | 'history'>('planner');

  // Filters for Live Planner
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // History panel states
  const [historyAppointments, setHistoryAppointments] = useState<Appointment[]>([]);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyPage, setHistoryPage] = useState(0);
  const [historySearch, setHistorySearch] = useState('');
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const historyLimit = 10;

  // Fetch function for history
  const loadHistory = async (page: number, search: string) => {
    setIsHistoryLoading(true);
    try {
      const storedHistory = localStorage.getItem('ceylon_history_v2');
      let allHistory: Appointment[] = storedHistory ? JSON.parse(storedHistory) : [];
      if (!Array.isArray(allHistory)) allHistory = [];

      // Add offline fallback in case there are completed/cancelled still in main appointments array
      const offlineHistory = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled');
      
      // Combine them and deduplicate by id
      const combined = [...allHistory, ...offlineHistory];
      const uniqueHistory = Array.from(new Map(combined.map(item => [item.id, item])).values());
      
      // Sort by date/time descending
      uniqueHistory.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time}`);
        const dateB = new Date(`${b.date}T${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });

      const filtered = search ? uniqueHistory.filter(a => 
        a.petName.toLowerCase().includes(search.toLowerCase()) || 
        a.ownerName.toLowerCase().includes(search.toLowerCase()) ||
        a.date.includes(search)
      ) : uniqueHistory;

      const start = page * historyLimit;
      setHistoryAppointments(filtered.slice(start, start + historyLimit));
      setHistoryCount(filtered.length);
    } catch (err) {
      console.error('Failed to load historical appointments:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Debounced/lazy loading of history when tab is open, page changes, or search filter changes
  useEffect(() => {
    if (activeSubTab === 'history') {
      const delayDebounce = setTimeout(() => {
        loadHistory(historyPage, historySearch);
      }, historySearch ? 300 : 0);
      return () => clearTimeout(delayDebounce);
    }
  }, [activeSubTab, historyPage, historySearch]);

  // Reset page when search term changes
  useEffect(() => {
    setHistoryPage(0);
  }, [historySearch]);
  
  // New appointment form states
  const [showAddModal, setShowAddModal] = useState(false);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other'>('Dog');
  const [breed, setBreed] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [date, setDate] = useState(formatDisplayDate(new Date()));
  const [time, setTime] = useState(formatDisplayTime(new Date()));
  const [veterinarian, setVeterinarian] = useState('Dr. Bandara');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  
  // Phase 2: Front-Desk Intake Overhaul States
  const [admissionType, setAdmissionType] = useState('OPD');
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [sex, setSex] = useState('Male');

  // Apply scheduling filters
  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = apt.petName.toLowerCase().includes(searchFilter.toLowerCase()) || 
                          apt.ownerName.toLowerCase().includes(searchFilter.toLowerCase()) ||
                          apt.reason.toLowerCase().includes(searchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: AppointmentStatus) => {
    switch(status) {
      case 'booked':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold uppercase rounded-lg">Booked</span>;
      case 'in-progress':
        return <span className="px-2.5 py-1 bg-sky-100 text-sky-800 text-[10px] font-bold uppercase rounded-lg animate-pulse flex items-center gap-1"><Activity className="h-3 w-3" /> In Treatment</span>;
      case 'completed':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase rounded-lg flex items-center gap-1">✓ Complete</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold uppercase rounded-lg">Cancelled</span>;
    }
  };

  const handleCreateAppointment = (e: React.FormEvent | React.KeyboardEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!petName || !date || !time) {
      setFormError('Patient Name, Visit Date, and Time are required.');
      return;
    }

    const metadata = JSON.stringify({ type: admissionType, phone2, address, sex });
    const tokenBlock = `:::METADATA${metadata}:::`;
    const packedReason = `${tokenBlock}\n${reason}`;

    const newApt: Appointment = {
      // Enforce pure numeric identity string
      id: String(Date.now()),
      petName,
      petType,
      breed: breed || 'Mixed breed',
      ownerName,
      ownerPhone,
      ownerEmail: ownerEmail || 'not-provided@example.com',
      date: formatDisplayDate(date),
      time: formatDisplayTime(time),
      veterinarian,
      reason: packedReason,
      status: 'booked'
    };

    onAddAppointment(newApt);
    setShowAddModal(false);

    // Clear state
    setPetName('');
    setBreed('');
    setOwnerName('');
    setOwnerPhone('');
    setOwnerEmail('');
    setReason('');
    setFormError('');
    setAdmissionType('OPD');
    setPhone2('');
    setAddress('');
    setSex('Male');
    setDate(formatDisplayDate(new Date()));
    setTime(formatDisplayTime(new Date()));
  };

  const handleCheckIn = (apt: Appointment) => {
    const normalizedPhone = apt.ownerPhone.replace(/\D/g, '');
    const patientExists = records.some(r => r.ownerPhone.replace(/\D/g, '') === normalizedPhone && r.petName.toLowerCase() === apt.petName.toLowerCase());
    
    if (!patientExists) {
      const newPatientId = `${apt.petName}_${normalizedPhone}`;
      const newRecord: MedicalRecord = {
        // Enforce pure numeric identity string
        id: String(Date.now()),
        patientId: newPatientId,
        petName: apt.petName,
        petType: apt.petType,
        breed: apt.breed || 'Mixed breed',
        age: 'Unknown',
        weight: 0,
        ownerName: apt.ownerName,
        ownerPhone: apt.ownerPhone,
        ownerEmail: apt.ownerEmail || 'not-provided@example.com',
        visitDate: apt.date,
        attendingVet: apt.veterinarian,
        symptoms: '',
        diagnosis: '',
        treatmentNotes: '',
        prescribedMeds: [],
        vaccinations: [],
        labResults: [],
        createdDate: new Date().toISOString().split('T')[0]
      };
      onAddRecord(newRecord);
    }

    onUpdateStatus(apt.id, 'in-progress');
  };

  return (
    <div className="space-y-4" id="appointments-tab-system">
      
      {/* Subtab selection */}
      <div className="flex bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 max-w-md">
        <button
          onClick={() => setActiveSubTab('planner')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
            activeSubTab === 'planner'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/30'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Live Scheduling Planner
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
            activeSubTab === 'history'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/30'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Historical Appointment Logs
        </button>
      </div>

      {activeSubTab === 'planner' ? (
        <>
          {/* Header operations */}
          <div className="bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs sticky top-0 z-10">
            
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input name="searchAppointmentLogByPet461" id="search-appointment-log-by-pet--461"
                type="text"
                placeholder="Search appointment log by pet, owner, or medical reasons..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
              />
            </div>

            {/* Tab filters and creation */}
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-200">
                {['all', 'booked', 'in-progress'].map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                      statusFilter === status 
                        ? 'bg-sky-500 text-white shadow-sm' 
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {status === 'in-progress' ? 'Active' : status}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAddModal(true)}
                className="ml-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="h-4 w-4" /> Book Consultation
              </button>
            </div>
          </div>

          {/* Grid Appointments list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAppointments.map(apt => {
              let displayReason = apt.reason;
              let meta: any = null;
              const metaMatch = apt.reason.match(/:::METADATA(.*?):::/);
              if (metaMatch) {
                try {
                  meta = JSON.parse(metaMatch[1]);
                  displayReason = apt.reason.replace(metaMatch[0], '').trim();
                } catch (e) {}
              }

              return (
              <div 
                key={apt.id} 
                className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:border-sky-300 transition-all relative group"
                style={{ borderColor: apt.status === 'in-progress' ? '#bae6fd' : '#f1f5f9' }}
              >
                {/* Top row */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="p-2.5 bg-sky-50 text-sky-700 rounded-xl font-bold font-mono text-center leading-none min-w-[42px]">
                        <span className="block text-xs uppercase text-sky-500">{apt.petType}</span>
                        <span className="text-[10px] font-semibold text-slate-500 block truncate max-w-[48px]">{apt.breed}</span>
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-slate-800 leading-snug flex items-center gap-1">
                          {apt.petName}
                          {meta?.sex && <span className="ml-1 text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">{meta.sex}</span>}
                        </h5>
                        <p className="text-xs text-slate-400 font-medium">{apt.ownerName} {meta?.phone2 && <span className="text-[10px] ml-1">/ {meta.phone2}</span>}</p>
                        {meta?.address && <p className="text-[10px] text-slate-400 truncate max-w-[150px]" title={meta.address}>{meta.address}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {getStatusBadge(apt.status)}
                      {meta?.type && (
                        <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded-md ${
                          meta.type === 'OPD' ? 'bg-indigo-50 text-indigo-600' : 
                          meta.type === 'Hospital Admission' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {meta.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Reason card */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl mt-3 text-xs">
                    <span className="text-[9px] font-mono text-slate-400 block uppercase font-bold tracking-wider">Appointment Complaint</span>
                    <p className="text-slate-700 font-medium leading-relaxed mt-0.5 whitespace-pre-wrap">{displayReason}</p>
                  </div>
                </div>

                {/* Middle meta row */}
                <div className="space-y-1.5 text-xs text-slate-500 font-medium border-t border-dashed border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-sky-500" />
                    <span>Scheduled Date: {formatDisplayDate(apt.date)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-sky-500" />
                    <span>Scheduled Time: {formatDisplayTime(apt.time)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Stethoscope className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Provider: {apt.veterinarian}</span>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {apt.status === 'booked' && (
                    <>
                      <button
                        onClick={() => handleCheckIn(apt)}
                        className="flex-1 py-1.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-lg cursor-pointer text-[11px] text-center"
                      >
                        Check-In Clinic
                      </button>
                      <button
                        onClick={() => onUpdateStatus(apt.id, 'cancelled')}
                        className="py-1.5 px-3 border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-rose-600 font-bold rounded-lg cursor-pointer text-[11px]"
                      >
                        Cancel
                      </button>
                    </>
                  )}
                  {apt.status === 'in-progress' && (
                    <button
                      onClick={() => onUpdateStatus(apt.id, 'completed')}
                      className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer text-[11px] text-center"
                    >
                      Conclude Vet Care
                    </button>
                  )}
                  {apt.status === 'completed' && (
                    <div className="w-full text-center text-[10px] text-emerald-600 font-bold bg-emerald-50/50 p-2 rounded-lg flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Checked out, Invoice generated.
                    </div>
                  )}
                  {apt.status === 'cancelled' && (
                    <p className="w-full text-center text-[10px] text-slate-400 font-mono italic">
                      Cancelled visit log.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
            {filteredAppointments.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center h-48 bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-500 text-xs">
                <Calendar className="h-10 w-10 text-slate-300 opacity-50 mb-3" />
                <span className="font-bold">No scheduled veterinary visits match the query filters.</span>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-6 rounded-3xl border border-sky-100 shadow-sm space-y-6 flex-1 flex flex-col min-h-[400px]">
          {/* Top Header of History tab */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h4 className="text-sm font-extrabold text-slate-800">Historical Appointment Logs</h4>
              <p className="text-[10px] text-slate-400 mt-1">Archived records of completed and cancelled check-ups</p>
            </div>

            {/* Search box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                id="history-search"
                name="historySearch"
                aria-label="Search historical appointments"
                type="text"
                placeholder="Search by name or date (YYYY-MM-DD)..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
              />
            </div>
          </div>

          {/* Table/List Area */}
          <div className="flex-1 overflow-x-auto min-h-0 custom-scrollbar">
            {isHistoryLoading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
                <RefreshCw className="h-8 w-8 text-sky-500 animate-spin" />
                <span className="font-bold text-xs">Retrieving archives from vet ledger...</span>
              </div>
            ) : historyAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 bg-slate-50 border border-slate-100 rounded-3xl p-12 text-center text-slate-500 text-xs">
                <Calendar className="h-10 w-10 text-slate-300 opacity-50 mb-3" />
                <span className="font-bold">No historical appointments found.</span>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-mono text-[9px] tracking-wider font-bold">
                    <th className="py-3 px-4">Patient / Pet</th>
                    <th className="py-3 px-4">Owner Contact</th>
                    <th className="py-3 px-4">Consultation Details</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyAppointments.map((apt) => {
                    let displayReason = apt.reason;
                    let meta: any = null;
                    const metaMatch = apt.reason.match(/:::METADATA(.*?):::/);
                    if (metaMatch) {
                      try {
                        meta = JSON.parse(metaMatch[1]);
                        displayReason = apt.reason.replace(metaMatch[0], '').trim();
                      } catch (e) {}
                    }
                    return (
                    <tr key={apt.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 flex items-center gap-1.5">
                          {apt.petName}
                          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-bold rounded-md font-mono">
                            {apt.petType}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{apt.breed || 'Mixed breed'} {meta?.sex && `(${meta.sex})`}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-700 flex items-center gap-1">
                          {apt.ownerName}
                          {meta?.type && <span className="px-1 py-0.5 bg-slate-200 text-slate-600 rounded text-[8px] uppercase">{meta.type}</span>}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium">{apt.ownerPhone} {meta?.phone2 && `/ ${meta.phone2}`}</div>
                      </td>
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="text-slate-700 font-medium truncate" title={displayReason}>
                          {displayReason}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">{apt.veterinarian || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="font-bold">{formatDisplayDate(apt.date)}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{formatDisplayTime(apt.time)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {getStatusBadge(apt.status)}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer/Pagination controls */}
          {historyCount > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-auto">
              <span className="text-[10px] font-semibold text-slate-400">
                Showing {historyPage * historyLimit + 1} - {Math.min((historyPage + 1) * historyLimit, historyCount)} of {historyCount} archived entries
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={historyPage === 0 || isHistoryLoading}
                  onClick={() => setHistoryPage((p) => p - 1)}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-xs font-extrabold text-slate-700 px-2 font-mono">
                  {historyPage + 1}
                </span>
                <button
                  disabled={(historyPage + 1) * historyLimit >= historyCount || isHistoryLoading}
                  onClick={() => setHistoryPage((p) => p + 1)}
                  className="p-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Appointment Modal Overlay */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-xl w-full text-xs shadow-xl animate-fade-in flex flex-col overflow-hidden max-h-[calc(100vh-40px)]">
            
            <div className="flex justify-between items-start shrink-0 p-6 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 leading-none">Schedule Veterinary Check-up</h4>
                <p className="text-[10px] text-slate-400 mt-1">Add details regarding patient and primary clinic complaint</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form 
              onSubmit={handleCreateAppointment} 
              className="flex flex-col min-h-0 overflow-hidden"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLElement;
                  if (target.tagName === 'TEXTAREA' && e.shiftKey) return;
                  e.preventDefault();
                  handleCreateAppointment(e);
                }
              }}
            >
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                {formError && (
                  <div className="text-red-600 bg-red-50 p-2 rounded mb-4 border border-red-200">
                    {formError}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                  
                  {/* Admission Type */}
                  <div className="space-y-0.5 col-span-3 pb-2 border-b border-slate-100 mb-2">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="admission-type">Admission Type</label>
                    <select name="admissionType" id="admission-type"
                      value={admissionType}
                      onChange={(e) => setAdmissionType(e.target.value)}
                      className="w-full md:w-1/3 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="OPD">OPD</option>
                      <option value="Hospital Admission">Hospital Admission</option>
                      <option value="Vaccination">Vaccination</option>
                    </select>
                  </div>

                  {/* Pet info */}
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="patient-name">Patient Name *</label>
                    <input name="patientName" id="patient-name"
                      type="text"
                      required
                      maxLength={100}
                      placeholder="Coco, Buster, etc."
                      value={petName}
                      onChange={(e) => { setPetName(e.target.value); if (formError) setFormError(''); }}
                      className={`w-full px-2 py-1.5 bg-slate-50 border ${formError && !petName ? 'border-red-500' : 'border-slate-200'} rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold`}
                    />
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="animal-classification">Animal Classification</label>
                    <select name="animalClassification" id="animal-classification"
                      value={petType}
                      onChange={(e) => setPetType(e.target.value as any)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Rabbit">Rabbit</option>
                      <option value="Bird">Bird</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="breed-description">Breed / Description</label>
                    <input name="breedDescription" id="breed-description"
                      type="text"
                      maxLength={100}
                      placeholder="Goldendoodle, etc."
                      value={breed}
                      onChange={(e) => setBreed(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="patient-sex">Patient Sex</label>
                    <select name="patientSex" id="patient-sex"
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {/* Owner info */}
                  <div className="space-y-0.5 col-span-3 border-t border-slate-100 pt-3 mt-1" />
                  
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-name">Owner Name *</label>
                    <input name="ownerName" id="owner-name"
                      type="text"
                      required
                      maxLength={100}
                      placeholder="Isabella Bennett"
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-phone">Owner Phone *</label>
                    <div className="flex relative items-center">
                      <span className="absolute left-2 font-mono font-bold text-slate-400 text-[11px]">+94</span>
                      <input name="ownerPhone" id="owner-phone"
                        type="text"
                        required
                        maxLength={15}
                        placeholder="77 123 4567"
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-phone2">Backup Phone</label>
                    <div className="flex relative items-center">
                      <span className="absolute left-2 font-mono font-bold text-slate-400 text-[11px]">+94</span>
                      <input name="ownerPhone2" id="owner-phone2"
                        type="text"
                        maxLength={15}
                        placeholder="71 987 6543"
                        value={phone2}
                        onChange={(e) => setPhone2(e.target.value)}
                        className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-0.5 col-span-3">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-address">Address</label>
                    <input name="ownerAddress" id="owner-address"
                      type="text"
                      maxLength={200}
                      placeholder="123 Peradeniya Rd"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-3 hidden">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-email-address">Owner Email Address</label>
                    <input name="ownerEmailAddress" id="owner-email-address"
                      type="email"
                      maxLength={100}
                      placeholder="isabella.b@example.com"
                      value={ownerEmail}
                      onChange={(e) => setOwnerEmail(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  {/* Scheduling meta */}
                  <div className="space-y-0.5 col-span-3 border-t border-slate-100 pt-3 mt-1" />
                  
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="visit-date">Visit Date</label>
                    <input name="visitDate" id="visit-date"
                      type="date"
                      value={date}
                      onChange={(e) => { setDate(e.target.value); if (formError) setFormError(''); }}
                      className={`w-full px-2 py-1.5 bg-slate-50 border ${formError && !date ? 'border-red-500' : 'border-slate-200'} rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold`}
                    />
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="hour-slot">Hour Slot</label>
                    <input name="hourSlot" id="hour-slot"
                      type="time"
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    />
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="assigned-doctor-vet">Assigned Doctor/Vet</label>
                    <select name="assignedDoctorVet" id="assigned-doctor-vet"
                      value={veterinarian}
                      onChange={(e) => setVeterinarian(e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    >
                      <option value="Dr. Bandara">Dr. Bandara</option>
                      <option value="Dr. Ismail">Dr. Ismail</option>
                      <option value="Residential Doctor">Residential Doctor</option>
                      <option value="OPD Doctor">OPD Doctor</option>
                      <option value="Emergency Doctor">Emergency Doctor</option>
                    </select>
                  </div>

                  <div className="space-y-0.5 col-span-3">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="reason-for-care-chief-complaint">Reason for Care / Chief Complaint *</label>
                    <textarea name="reasonForCareChiefComplaint" id="reason-for-care-chief-complaint"
                      required
                      maxLength={1000}
                      rows={2}
                      placeholder="e.g. Coughing, rabies vaccines booster need, ear canal check-up"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-[11px]"
                    />
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex gap-2 p-6 pt-4 justify-end border-t border-slate-100 bg-white">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
                >
                  Create Appointment Slot
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
