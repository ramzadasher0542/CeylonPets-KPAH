/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Calendar as CalendarIcon, 
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
  ChevronRight,
  List as ListIcon,
  Edit2,
  Trash2,
  Filter,
  MoreVertical
} from 'lucide-react';
import { Appointment, AppointmentStatus, MedicalRecord } from '../types';
import { showToast } from './Toast';
import { formatDisplayDate, formatDisplayTime } from '../utils/time';

interface AppointmentsProps {
  appointments: Appointment[];
  records: MedicalRecord[];
  isOnline: boolean;
  onAddAppointment: (appointment: Appointment) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
  onAddRecord: (record: MedicalRecord) => void;
  onUpdateAppointment?: (appointment: Appointment) => void;
}

export default function AppointmentsManager({ 
  appointments,
  records,
  isOnline, 
  onAddAppointment, 
  onUpdateStatus,
  onAddRecord,
  onUpdateAppointment
}: AppointmentsProps) {
  
  // Dual-View & Header State
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [timeframe, setTimeframe] = useState<'day' | 'week' | 'month'>('week');
  const [doctorFilter, setDoctorFilter] = useState('All Doctors');
  const [searchQuery, setSearchQuery] = useState('');
  
  // List View Specific State
  const [statusFilter, setStatusFilter] = useState('All');
  const listFilters = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled', 'No show'];

  // Global Combined Appointments (Active + History)
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const storedHistory = localStorage.getItem('ceylon_history_v2');
    let history: Appointment[] = storedHistory ? JSON.parse(storedHistory) : [];
    if (!Array.isArray(history)) history = [];

    const combined = [...history, ...appointments];
    const unique = Array.from(new Map(combined.map(item => [item.id, item])).values());
    
    unique.sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.time}`);
      const dateB = new Date(`${b.date}T${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    setAllAppointments(unique);
  }, [appointments]);

  // Original Form State + Edit State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAptId, setEditingAptId] = useState<string | null>(null);
  
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
  
  const [admissionType, setAdmissionType] = useState('OPD');
  const [phone2, setPhone2] = useState('');
  const [address, setAddress] = useState('');
  const [sex, setSex] = useState('Male');

  // Popover State
  const [selectedPopoverApt, setSelectedPopoverApt] = useState<Appointment | null>(null);

  // Core Handlers
  const resetForm = () => {
    setEditingAptId(null);
    setPetName(''); setBreed(''); setOwnerName(''); setOwnerPhone(''); setOwnerEmail('');
    setReason(''); setFormError(''); setAdmissionType('OPD'); setPhone2(''); setAddress('');
    setSex('Male'); setDate(formatDisplayDate(new Date())); setTime(formatDisplayTime(new Date()));
  };

  const handleEditClick = (apt: Appointment) => {
    if (apt.status === 'completed') return; // Secure Lockout
    setEditingAptId(apt.id);
    setPetName(apt.petName);
    setPetType(apt.petType);
    setBreed(apt.breed);
    setOwnerName(apt.ownerName);
    setOwnerPhone(apt.ownerPhone);
    setOwnerEmail(apt.ownerEmail);
    setDate(apt.date);
    setTime(apt.time);
    setVeterinarian(apt.veterinarian);
    
    let displayReason = apt.reason;
    const match = apt.reason.match(/:::METADATA(.*?):::/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        setAdmissionType(meta.type || 'OPD');
        setPhone2(meta.phone2 || '');
        setAddress(meta.address || '');
        setSex(meta.sex || 'Male');
        displayReason = apt.reason.replace(match[0], '').trim();
      } catch(e){}
    } else {
      setAdmissionType('OPD'); setPhone2(''); setAddress(''); setSex('Male');
    }
    
    setReason(displayReason);
    setSelectedPopoverApt(null);
    setShowAddModal(true);
  };

  const handleCreateAppointment = (e: React.FormEvent | React.KeyboardEvent) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    if (!petName || !date || !time) {
      setFormError('Patient Name, Visit Date, and Time are required.');
      return;
    }

    const metadata = JSON.stringify({ type: admissionType, phone2, address, sex });
    const tokenBlock = `:::METADATA${metadata}:::`;
    const packedReason = `${tokenBlock}\n${reason}`;
    const now = new Date().toISOString();

    if (editingAptId) {
      const existingApt = allAppointments.find(a => a.id === editingAptId);
      const updatedApt = {
        ...existingApt,
        id: editingAptId,
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
        updated_at: now
      } as any;
      
      if (onUpdateAppointment) {
        onUpdateAppointment(updatedApt);
      }
    } else {
      const aptNumber = 'APT-' + (1000 + allAppointments.length + 1);
      const newApt = {
        id: crypto.randomUUID(),
        aptNumber,
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
        status: 'booked',
        created_at: now,
        updated_at: now,
        is_deleted: false
      } as any;
      onAddAppointment(newApt);
    }

    setShowAddModal(false);
    resetForm();
  };

  const handleCheckIn = (apt: Appointment) => {
    const normalizedPhone = apt.ownerPhone.replace(/\D/g, '');
    const patientExists = records.some(r => r.ownerPhone.replace(/\D/g, '') === normalizedPhone && r.petName.toLowerCase() === apt.petName.toLowerCase());
    
    if (!patientExists) {
      const newRecord: MedicalRecord = {
        id: String(Date.now()),
        patientId: `${apt.petName}_${normalizedPhone}`,
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
    setSelectedPopoverApt(null);
  };

  // Date Math Helpers
  const toLocalISODate = (d: Date) => {
    const z = (n: number) => ('0' + n).slice(-2);
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };

  const getWeekDays = (baseDate: Date) => {
    const d = new Date(baseDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
    return days;
  };

  const nextPeriod = () => {
    const d = new Date(currentDate);
    if (timeframe === 'week') d.setDate(d.getDate() + 7);
    else if (timeframe === 'day') d.setDate(d.getDate() + 1);
    else d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  const prevPeriod = () => {
    const d = new Date(currentDate);
    if (timeframe === 'week') d.setDate(d.getDate() - 7);
    else if (timeframe === 'day') d.setDate(d.getDate() - 1);
    else d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  // Data Filtering with Global Search
  const baseFilteredApts = allAppointments.filter(apt => {
    if (doctorFilter !== 'All Doctors' && apt.veterinarian !== doctorFilter) return false;
    
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesSearch = 
        apt.petName.toLowerCase().includes(q) || 
        apt.ownerName.toLowerCase().includes(q) || 
        apt.ownerPhone.toLowerCase().includes(q) ||
        (apt.aptNumber && apt.aptNumber.toLowerCase().includes(q));
      
      if (!matchesSearch) return false;
    }
    
    return true;
  });

  const listFilteredApts = baseFilteredApts.filter(apt => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Pending') return apt.status === 'booked';
    if (statusFilter === 'Confirmed') return apt.status === 'in-progress';
    if (statusFilter === 'Completed') return apt.status === 'completed';
    if (statusFilter === 'Cancelled' || statusFilter === 'No show') return apt.status === 'cancelled';
    return true;
  });

  // UI Helpers
  const getStatusPill = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'booked') return <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-md text-[10px] font-bold uppercase border border-amber-100">Pending</span>;
    if (s === 'in-progress') return <span className="px-2 py-0.5 bg-sky-50 text-sky-600 rounded-md text-[10px] font-bold uppercase border border-sky-100">In Treatment</span>;
    if (s === 'completed') return <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-md text-[10px] font-bold uppercase border border-emerald-100">Completed</span>;
    if (s === 'cancelled') return <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-md text-[10px] font-bold uppercase border border-rose-100">Cancelled</span>;
    return <span className="px-2 py-0.5 bg-slate-50 text-slate-600 rounded-md text-[10px] font-bold uppercase border border-slate-200">{status}</span>;
  };

  const getServicePill = (reason: string) => {
    let meta: any = null;
    const match = reason.match(/:::METADATA(.*?):::/);
    if (match) {
      try { meta = JSON.parse(match[1]); } catch(e){}
    }
    const type = meta?.type || 'OPD';
    return <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold border border-indigo-100">{type}</span>;
  };

  const currentDisplayAptNumber = editingAptId 
    ? allAppointments.find(a => a.id === editingAptId)?.aptNumber || 'N/A'
    : 'APT-' + (1000 + allAppointments.length + 1);

  // Render Core Views
  const renderCalendarView = () => {
    if (timeframe === 'month') {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      const days = [];
      for(let i=0; i<start.getDay(); i++) days.push(null);
      for(let i=1; i<=end.getDate(); i++) days.push(new Date(currentDate.getFullYear(), currentDate.getMonth(), i));
      
      return (
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="p-3 text-center text-[10px] uppercase font-bold text-slate-500">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 flex-1 bg-slate-200 gap-px border-t border-slate-200 overflow-y-auto custom-scrollbar">
            {days.map((d, i) => {
              if(!d) return <div key={`empty-${i}`} className="bg-slate-50/50 min-h-[100px]" />;
              const dayStr = toLocalISODate(d);
              const apts = baseFilteredApts.filter(a => a.date === dayStr);
              return (
                <div 
                  key={dayStr} 
                  className="bg-white p-2 min-h-[100px] hover:bg-slate-50 transition-colors cursor-pointer flex flex-col"
                  onClick={() => { setCurrentDate(d); setTimeframe('day'); }}
                >
                  <div className={`text-xs font-bold mb-1.5 ${d.toDateString() === new Date().toDateString() ? 'text-indigo-600 bg-indigo-50 w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-600'}`}>{d.getDate()}</div>
                  <div className="space-y-1 flex-1">
                    {apts.map(a => (
                      <div 
                        key={a.id} 
                        onClick={(e) => { e.stopPropagation(); setSelectedPopoverApt(a); }}
                        className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 p-1.5 rounded-lg truncate shadow-xs font-medium hover:bg-indigo-100 transition-colors"
                      >
                        {a.time} - {a.petName}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      );
    }

    // 24-Hour Loop Integration
    const days = timeframe === 'day' ? [currentDate] : getWeekDays(currentDate);
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex-1 flex flex-col border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="grid border-b border-slate-200 bg-slate-50 sticky top-0 z-10" style={{ gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))` }}>
          <div className="p-3 border-r border-slate-200 flex items-end justify-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time</div>
          {days.map(d => (
            <div 
              key={d.toISOString()} 
              className="p-3 text-center border-r border-slate-200 last:border-r-0 cursor-pointer hover:bg-slate-100 transition-colors"
              onClick={() => { setCurrentDate(d); setTimeframe('day'); }}
            >
              <div className="text-[10px] uppercase font-bold text-slate-400">{d.toLocaleDateString('en-US', {weekday:'short'})}</div>
              <div className={`text-sm font-extrabold mt-0.5 ${d.toDateString()===new Date().toDateString() ? 'text-indigo-600':'text-slate-700'}`}>{d.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {hours.map(hour => (
            <div key={hour} className="grid border-b border-slate-100 min-h-[90px]" style={{ gridTemplateColumns: `70px repeat(${days.length}, minmax(0, 1fr))` }}>
              <div className="p-2 border-r border-slate-200 bg-slate-50 flex items-start justify-center pt-3 text-[10px] font-bold text-slate-400">
                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
              </div>
              {days.map(d => {
                const dayStr = toLocalISODate(d);
                const apts = baseFilteredApts.filter(a => a.date === dayStr && parseInt(a.time.split(':')[0], 10) === hour);
                return (
                  <div key={dayStr} className="p-1.5 border-r border-slate-100 last:border-r-0 relative hover:bg-slate-50/50 transition-colors">
                    {apts.map(a => (
                      <div 
                        key={a.id} 
                        onClick={(e) => { e.stopPropagation(); setSelectedPopoverApt(a); }}
                        className={`mb-1.5 p-2 border rounded-xl text-[10px] leading-tight shadow-xs cursor-pointer hover:shadow-sm transition-all group ${
                          a.status === 'completed' 
                            ? 'bg-slate-50 border-slate-200 text-slate-500' 
                            : 'bg-indigo-50 border-indigo-100 text-indigo-800 hover:border-indigo-300'
                        }`}
                      >
                        <div className="font-bold truncate">{a.petName}</div>
                        <div className="truncate opacity-80 mt-0.5 font-medium">{a.ownerName}</div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderListView = () => (
    <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center gap-2 overflow-x-auto custom-scrollbar">
        {listFilters.map(filter => (
          <button 
            key={filter} 
            onClick={() => setStatusFilter(filter)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${statusFilter === filter ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
              <th className="py-4 px-4">Apt #</th>
              <th className="py-4 px-4">Time</th>
              <th className="py-4 px-4">Pet</th>
              <th className="py-4 px-4">Owner</th>
              <th className="py-4 px-4">Service</th>
              <th className="py-4 px-4">Status</th>
              <th className="py-4 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {listFilteredApts.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                  <CalendarIcon className="h-10 w-10 text-slate-200 mx-auto mb-3" />
                  No appointments found for the selected filters.
                </td>
              </tr>
            ) : listFilteredApts.map((apt) => {
              const isLocked = apt.status === 'completed';
              return (
              <tr key={apt.id} className="hover:bg-slate-50 transition-colors group">
                <td className="py-4 px-4">
                  <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">{apt.aptNumber || 'N/A'}</span>
                </td>
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-800">{formatDisplayDate(apt.date)}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{formatDisplayTime(apt.time)}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">{apt.petName}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{apt.petType} - {apt.breed || 'Mixed'}</div>
                </td>
                <td className="py-4 px-4">
                  <div className="font-bold text-slate-700">{apt.ownerName}</div>
                  <div className="text-[10px] text-slate-500 font-medium font-mono">{apt.ownerPhone}</div>
                </td>
                <td className="py-4 px-4">
                  {getServicePill(apt.reason)}
                </td>
                <td className="py-4 px-4">
                  {getStatusPill(apt.status)}
                </td>
                <td className="py-4 px-4">
                  <div className="flex items-center justify-end gap-1">
                    {apt.status === 'booked' && (
                      <button onClick={() => handleCheckIn(apt)} title="Check In" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer">
                        <CheckCircle2 className="h-4 w-4" />
                      </button>
                    )}
                    <button 
                      onClick={() => handleEditClick(apt)} 
                      disabled={isLocked}
                      title={isLocked ? "Read Only" : "Edit"} 
                      className={`p-1.5 rounded-lg transition-colors ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer'}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => onUpdateStatus(apt.id, 'cancelled')} 
                      disabled={isLocked}
                      title={isLocked ? "Read Only" : "Delete/Cancel"} 
                      className={`p-1.5 rounded-lg transition-colors ${isLocked ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer'}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col space-y-4" id="appointments-tab-system">
      
      {/* Unified Control Header with Wrap and Spacing */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 shrink-0">
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            {viewMode === 'calendar' && timeframe === 'day' && (
              <button onClick={() => setTimeframe('month')} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold mr-1 shadow-sm cursor-pointer">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
            )}
            Appointment Calendar
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setViewMode('calendar')} className={`p-1.5 px-3 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700 cursor-pointer'}`}>
              <CalendarIcon className="h-4 w-4" /> Calendar
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 px-3 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700 cursor-pointer'}`}>
              <ListIcon className="h-4 w-4" /> List
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 w-full md:w-auto justify-center">
          <button onClick={prevPeriod} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-xs transition-colors cursor-pointer">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-extrabold text-slate-700 shadow-xs transition-colors cursor-pointer">
            Today
          </button>
          <button onClick={nextPeriod} className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 shadow-xs transition-colors cursor-pointer">
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="px-3 text-sm font-extrabold text-slate-800 min-w-[140px] text-center">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        </div>

        <div className="flex items-center gap-3 w-full xl:w-auto justify-end flex-wrap flex-1">
          {/* Global Search Input */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search apts, names, phone..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
            />
          </div>

          {viewMode === 'calendar' && (
            <div className="flex bg-slate-100 p-1 rounded-xl hidden sm:flex">
              {['day', 'week', 'month'].map(t => (
                <button key={t} onClick={() => setTimeframe(t as any)} className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${timeframe === t ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
          
          <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} className="hidden md:block px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer">
            <option>All Doctors</option>
            <option>Dr. Bandara</option>
            <option>Dr. Ismail</option>
          </select>

          <button onClick={() => { resetForm(); setShowAddModal(true); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap">
            <Plus className="h-4 w-4" /> New Appointment
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? renderCalendarView() : renderListView()}

      {/* Calendar Quick Action Popover Modal */}
      {selectedPopoverApt && createPortal(
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setSelectedPopoverApt(null)}>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl p-5 max-w-sm w-full animate-fade-in relative" onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedPopoverApt(null)} className="absolute top-3 right-3 p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"><X className="h-4 w-4" /></button>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-extrabold text-slate-800">{selectedPopoverApt.petName}</h3>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{selectedPopoverApt.aptNumber}</span>
            </div>
            <p className="text-xs text-slate-500 font-medium mb-4">{selectedPopoverApt.date} at {selectedPopoverApt.time}</p>
            
            <div className="space-y-2">
              {selectedPopoverApt.status === 'booked' && (
                <button onClick={() => handleCheckIn(selectedPopoverApt)} className="w-full py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-bold rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer transition-colors">
                  <CheckCircle2 className="h-4 w-4" /> Check In Patient
                </button>
              )}
              
              {selectedPopoverApt.status !== 'completed' ? (
                <>
                  <button onClick={() => handleEditClick(selectedPopoverApt)} className="w-full py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-bold rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer transition-colors">
                    <Edit2 className="h-4 w-4" /> Edit Details
                  </button>
                  <button onClick={() => { onUpdateStatus(selectedPopoverApt.id, 'cancelled'); setSelectedPopoverApt(null); }} className="w-full py-2 bg-white text-rose-600 hover:bg-rose-50 border border-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-2 cursor-pointer transition-colors">
                    <Trash2 className="h-4 w-4" /> Cancel Appointment
                  </button>
                </>
              ) : (
                <div className="w-full py-2 bg-slate-50 text-slate-400 border border-slate-200 font-bold rounded-xl text-xs flex justify-center items-center gap-2 cursor-not-allowed">
                  Completed (Read Only)
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Main Appointment Form Modal */}
      {showAddModal && createPortal(
        <div className="fixed inset-0 z-[70] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-xl w-full text-xs shadow-xl animate-fade-in flex flex-col overflow-hidden max-h-[calc(100vh-40px)]">
            <div className="flex justify-between items-start shrink-0 p-6 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 leading-none">{editingAptId ? 'Edit Appointment' : 'Schedule Veterinary Check-up'}</h4>
                <p className="text-[10px] text-slate-400 mt-1">Update patient details and primary clinic complaint</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer">✕</button>
            </div>
            <form onSubmit={handleCreateAppointment} className="flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                {formError && <div className="text-red-600 bg-red-50 p-2 rounded mb-4 border border-red-200">{formError}</div>}
                
                <div className="grid grid-cols-3 gap-2.5 text-[11px]">
                  {/* Read-Only Apt Number & Admission Type */}
                  <div className="col-span-3 pb-2 border-b border-slate-100 mb-2 flex items-center gap-4">
                    <div className="flex-1 max-w-[150px]">
                      <label className="font-bold text-slate-600 block text-[10px] mb-0.5">Appointment Number</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={currentDisplayAptNumber} 
                        className="w-full px-2 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono font-bold cursor-not-allowed focus:outline-none" 
                      />
                    </div>
                    <div className="flex-1 max-w-[200px]">
                      <label className="font-bold text-slate-600 block text-[10px] mb-0.5" htmlFor="admission-type">Admission Type</label>
                      <select name="admissionType" id="admission-type" value={admissionType} onChange={(e) => setAdmissionType(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold">
                        <option value="OPD">OPD</option>
                        <option value="Hospital Admission">Hospital Admission</option>
                        <option value="Vaccination">Vaccination</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="patient-name">Patient Name *</label>
                    <input name="patientName" id="patient-name" type="text" required maxLength={100} placeholder="Coco, Buster, etc." value={petName} onChange={(e) => { setPetName(e.target.value); if (formError) setFormError(''); }} className={`w-full px-2 py-1.5 bg-slate-50 border ${formError && !petName ? 'border-red-500' : 'border-slate-200'} rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold`} />
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="animal-classification">Animal Classification</label>
                    <select name="animalClassification" id="animal-classification" value={petType} onChange={(e) => setPetType(e.target.value as any)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold">
                      <option value="Dog">Dog</option>
                      <option value="Cat">Cat</option>
                      <option value="Rabbit">Rabbit</option>
                      <option value="Bird">Bird</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="breed-description">Breed / Description</label>
                    <input name="breedDescription" id="breed-description" type="text" maxLength={100} placeholder="Goldendoodle, etc." value={breed} onChange={(e) => setBreed(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold" />
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="patient-sex">Patient Sex</label>
                    <select name="patientSex" id="patient-sex" value={sex} onChange={(e) => setSex(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold">
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="space-y-0.5 col-span-3 border-t border-slate-100 pt-3 mt-1" />
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-name">Owner Name *</label>
                    <input name="ownerName" id="owner-name" type="text" required maxLength={100} placeholder="Isabella Bennett" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold" />
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-phone">Owner Phone *</label>
                    <div className="flex relative items-center">
                      <span className="absolute left-2 font-mono font-bold text-slate-400 text-[11px]">+94</span>
                      <input name="ownerPhone" id="owner-phone" type="text" required maxLength={15} placeholder="77 123 4567" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono" />
                    </div>
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-phone2">Backup Phone</label>
                    <div className="flex relative items-center">
                      <span className="absolute left-2 font-mono font-bold text-slate-400 text-[11px]">+94</span>
                      <input name="ownerPhone2" id="owner-phone2" type="text" maxLength={15} placeholder="71 987 6543" value={phone2} onChange={(e) => setPhone2(e.target.value)} className="w-full pl-8 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono" />
                    </div>
                  </div>
                  <div className="space-y-0.5 col-span-3">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="owner-address">Address</label>
                    <input name="ownerAddress" id="owner-address" type="text" maxLength={200} placeholder="123 Peradeniya Rd" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold" />
                  </div>
                  <div className="space-y-0.5 col-span-3 border-t border-slate-100 pt-3 mt-1" />
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="visit-date">Visit Date</label>
                    <input name="visitDate" id="visit-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); if (formError) setFormError(''); }} className={`w-full px-2 py-1.5 bg-slate-50 border ${formError && !date ? 'border-red-500' : 'border-slate-200'} rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold`} />
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="hour-slot">Hour Slot</label>
                    <input name="hourSlot" id="hour-slot" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold" />
                  </div>
                  <div className="space-y-0.5 col-span-1">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="assigned-doctor-vet">Assigned Doctor/Vet</label>
                    <select name="assignedDoctorVet" id="assigned-doctor-vet" value={veterinarian} onChange={(e) => setVeterinarian(e.target.value)} className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold">
                      <option value="Dr. Bandara">Dr. Bandara</option>
                      <option value="Dr. Ismail">Dr. Ismail</option>
                      <option value="Residential Doctor">Residential Doctor</option>
                      <option value="OPD Doctor">OPD Doctor</option>
                      <option value="Emergency Doctor">Emergency Doctor</option>
                    </select>
                  </div>
                  <div className="space-y-0.5 col-span-3">
                    <label className="font-bold text-slate-600 block text-[10px]" htmlFor="reason-for-care">Reason for Care / Chief Complaint *</label>
                    <textarea name="reasonForCare" id="reason-for-care" required maxLength={1000} rows={2} placeholder="e.g. Coughing, rabies vaccines booster need..." value={reason} onChange={(e) => setReason(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-normal focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold text-[11px]" />
                  </div>
                </div>
              </div>
              <div className="shrink-0 flex gap-2 p-6 pt-4 justify-end border-t border-slate-100 bg-white">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-1.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 cursor-pointer transition-colors">Close</button>
                <button type="submit" className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl cursor-pointer shadow-xs transition-colors">{editingAptId ? 'Save Changes' : 'Create Appointment Slot'}</button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
