/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Heart, 
  Search, 
  Syringe, 
  FileText, 
  Calendar, 
  MapPin, 
  Smile, 
  Sparkles,
  Award,
  CheckCircle2,
  CalendarDays,
  Smartphone
} from 'lucide-react';
import { MedicalRecord, Appointment, Vaccination } from '../types';
import { showToast } from './Toast';

interface PortalProps {
  records: MedicalRecord[];
  appointments: Appointment[];
  isOnline: boolean;
  onBookAppointment: (appointment: Appointment) => void;
  systemConfig?: any;
}

export default function PatientPortal({ 
  records, 
  appointments, 
  isOnline, 
  onBookAppointment,
  systemConfig
}: PortalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [matchingRecords, setMatchingRecords] = useState<MedicalRecord[]>([]);
  const [isSearched, setIsSearched] = useState(false);
  const [selectedPetId, setSelectedPetId] = useState<string>('');

  // Booking states for pet parent
  const [bookingPet, setBookingPet] = useState<MedicalRecord | null>(null);
  const [bookingReason, setBookingReason] = useState('');
  const [bookingDate, setBookingDate] = useState('2026-05-23');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [bookingOutcome, setBookingOutcome] = useState(false);

  const handleDownloadPassport = (pet: MedicalRecord) => {
    const printWindow = window.open('', '_blank', 'width=500,height=700');
    if (!printWindow) {
      showToast('Pop-up blocked! Please allow pop-ups to print/download the vaccine passport.', 'error');
      return;
    }

    const hospitalName = systemConfig?.hospitalName || 'Ceylon Pets Animal Hospital';
    const hospitalAddress = systemConfig?.hospitalAddress || 'No. 34 Palace Road, Petaluma CA';
    const hospitalPhone = systemConfig?.hospitalPhone || '+1 (555) 781-4200';
    const logoEmoji = systemConfig?.invoiceLogo || '🐾';

    const printHtml = `
      <html>
        <head>
          <title>Vaccine Passport: ${pet.petName}</title>
          <style>
            @media print {
              .no-print { display: none !important; }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              padding: 30px;
              color: #1e293b;
              line-height: 1.5;
            }
            .header {
              text-align: center;
              padding-bottom: 20px;
              border-bottom: 2px solid #e2e8f0;
              margin-bottom: 25px;
            }
            .title {
              font-size: 22px;
              font-weight: 800;
              color: #4f46e5;
              letter-spacing: -0.5px;
              margin-top: 5px;
            }
            .subtitle {
              font-size: 11px;
              color: #64748b;
              font-weight: 650;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .pet-info {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 16px;
              padding: 20px;
              margin-bottom: 25px;
              display: grid;
              grid-template-cols: 1fr 1fr;
              gap: 15px;
            }
            .info-item span {
              display: block;
              font-size: 10px;
              color: #64748b;
              text-transform: uppercase;
              font-weight: 700;
            }
            .info-item strong {
              font-size: 13px;
              color: #0f172a;
            }
            .vaccine-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            .vaccine-table th {
              background-color: #4f46e5;
              color: #ffffff;
              font-size: 11px;
              text-transform: uppercase;
              font-weight: 700;
              padding: 10px 15px;
              text-align: left;
            }
            .vaccine-table td {
              padding: 12px 15px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 12px;
            }
            .status-badge {
              font-size: 10px;
              font-weight: 700;
              text-transform: uppercase;
              padding: 3px 8px;
              border-radius: 9999px;
              display: inline-block;
            }
            .active { background-color: #dcfce7; color: #15803d; }
            .due-soon { background-color: #fef3c7; color: #b45309; }
            .overdue { background-color: #fee2e2; color: #b91c1c; }
            .footer {
              text-align: center;
              margin-top: 40px;
              font-size: 10px;
              color: #94a3b8;
              border-top: 1px solid #e2e8f0;
              padding-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="position: fixed; top: 24px; right: 24px; display: flex; gap: 12px; z-index: 1000;">
            <button onclick="window.close()" style="padding: 10px 16px; border-radius: 8px; border: 1px solid #cbd5e1; background: white; color: #475569; font-weight: 600; cursor: pointer; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">Back to EHR</button>
            <button onclick="window.print()" style="padding: 10px 16px; border-radius: 8px; border: none; background: #4f46e5; color: white; font-weight: 600; cursor: pointer; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">Print Document</button>
          </div>
          <div class="header">
            <span style="font-size: 32px;">${logoEmoji}</span>
            <div class="subtitle">Official Healthcare Certificate</div>
            <div class="title">COMPANION VACCINE PASSPORT</div>
          </div>
          
          <div class="pet-info">
            <div class="info-item">
              <span>Patient Name</span>
              <strong>${pet.petName}</strong>
            </div>
            <div class="info-item">
              <span>Classification</span>
              <strong>${pet.petType} (${pet.breed})</strong>
            </div>
            <div class="info-item">
              <span>Age & Weight</span>
              <strong>${pet.age} / ${pet.weight} kg</strong>
            </div>
            <div class="info-item">
              <span>Owner Reference</span>
              <strong>${pet.ownerName}</strong>
            </div>
          </div>
          
          <h3 style="font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #0f172a;">Immunization History</h3>
          <table class="vaccine-table">
            <thead>
              <tr>
                <th>Protection Target</th>
                <th>Administered Date</th>
                <th>Next Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${pet.vaccinations.map(v => `
                <tr>
                  <td><strong>${v.name}</strong></td>
                  <td>${v.dateAdministered}</td>
                  <td>${v.nextDueDate}</td>
                  <td>
                    <span class="status-badge ${v.status}">
                      ${v.status}
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            This document confirms immunization records on file at ${hospitalName}.<br/>
            ${hospitalAddress} • PH: ${hospitalPhone}<br/>
            <strong style="display: block; margin-top: 10px; color: #64748b;">* VERIFIED SECURE CLINICAL EHR RECORD *</strong>
          </div>
          
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const handleSearchPortal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) return;

    // Filter medical records matching owner phone number
    const sanitizedQuery = phoneNumber.replace(/\D/g, '');
    const found = records.filter(rec => {
      const recPhone = rec.ownerPhone.replace(/\D/g, '');
      return recPhone.includes(sanitizedQuery);
    });

    setMatchingRecords(found);
    setIsSearched(true);
    if (found.length > 0) {
      setSelectedPetId(found[0].id);
    } else {
      setSelectedPetId('');
    }
  };

  const activeEHR = matchingRecords.find(r => r.id === selectedPetId);

  const handleBookNextBooster = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingPet || !bookingReason) {
      showToast('Specify vaccine booster intent.', 'success');
      return;
    }

    const newApt: Appointment = {
      id: `apt-p-${Date.now()}`,
      petName: bookingPet.petName,
      petType: bookingPet.petType,
      breed: bookingPet.breed,
      ownerName: bookingPet.ownerName,
      ownerPhone: bookingPet.ownerPhone,
      ownerEmail: bookingPet.ownerEmail,
      date: bookingDate,
      time: bookingTime,
      veterinarian: 'Dr. Kandy Cruz, DVM',
      reason: `Portal Request: ${bookingReason}`,
      status: 'booked'
    };

    onBookAppointment(newApt);
    setBookingOutcome(true);
    setBookingReason('');
    setTimeout(() => {
      setBookingOutcome(false);
      setBookingPet(null);
    }, 4000);
  };

  return (
    <div className="space-y-6" id="patient-portal-component">
      {/* Portal Greeting Banner */}
      <div className="p-6 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-xl text-xs space-y-2">
          <span className="px-3 py-1 bg-white/20 text-white rounded-full font-bold uppercase tracking-wider text-[9px] backdrop-blur-xs flex items-center gap-1 w-max">
            <Smartphone className="w-3.5 h-3.5" /> Pet Parent Portal
          </span>
          <h2 className="text-2.5xl font-extrabold tracking-tight">{systemConfig?.hospitalName || 'Kandy Animal Hospital'} Portal</h2>
          <p className="text-white/80 font-medium leading-relaxed">
            Welcome pet parents! Retrieve your companion's vaccine schedule, therapeutic diagnosis history, and schedule boosters instantly.
          </p>
        </div>
        {/* Subtle decorative circles */}
        <div className="absolute top-0 right-0 w-44 h-44 bg-white/5 rounded-full -translate-y-12 translate-x-12 blur-xl" />
        <div className="absolute bottom-0 right-1/4 w-32 h-32 bg-white/5 rounded-full translate-y-12 blur-lg" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Phone Lookup & Search box (5 Cols) */}
        <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-sky-50 shadow-sm space-y-4 text-xs flex flex-col justify-between">
          <form onSubmit={handleSearchPortal} className="space-y-3">
            <span className="font-extrabold text-slate-800 block text-xs">Verify Phone Number</span>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Retrieve files by entering your patient registration mobile number (e.g., 555-781-4200 or 555-304-9182 for immediate tests).
            </p>
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
              <input name="eG15557814200757" id="e-g-1-555-781-4200-757"
                type="tel"
                placeholder="e.g. +1 (555) 781-4200"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 text-xs font-semibold rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold rounded-xl transition-all shadow-xs cursor-pointer"
            >
              Secure Retrieve Record
            </button>
          </form>

          {/* Quick instructions or address listing below */}
          <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
            <div className="flex items-center gap-2 text-slate-600 font-bold">
              <MapPin className="h-4 w-4 text-sky-500" />
              Hospital Location info
            </div>
            <p className="text-slate-400 text-[10px] leading-relaxed">
              {systemConfig?.hospitalName || 'Ceylon Pets Animal Hospital'}<br />
              {systemConfig?.hospitalAddress || 'No. 34 Palace Road, Petaluma CA'}<br />
              Emergency Clinic Line: {systemConfig?.hospitalPhone || '+1 (555) 781-4200'}
            </p>
          </div>
        </div>

        {/* Dynamic Display area (8 Cols) */}
        <div className="md:col-span-8">
          {isSearched ? (
            matchingRecords.length > 0 ? (
              <div className="space-y-4 text-xs">
                {/* Pet tabs in case of multiple companions */}
                {matchingRecords.length > 1 && (
                  <div className="flex gap-2 p-1 bg-slate-100 border rounded-xl">
                    {matchingRecords.map(rec => (
                      <button
                        key={rec.id}
                        onClick={() => setSelectedPetId(rec.id)}
                        className={`flex-1 py-1 px-3 text-xs font-bold rounded-lg cursor-pointer transition-all ${
                          selectedPetId === rec.id 
                            ? 'bg-sky-500 text-white shadow-xs' 
                            : 'text-slate-600 hover:text-slate-800'
                        }`}
                      >
                        {rec.petName} ({rec.breed})
                      </button>
                    ))}
                  </div>
                )}

                {activeEHR && (
                  <div className="bg-white rounded-3xl border border-sky-100 shadow-sm overflow-hidden divide-y divide-sky-50">
                    
                    {/* Healthcare summary metadata */}
                    <div className="p-5 bg-sky-50/40 flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-base leading-none">
                          <Smile className="h-4 w-5 text-indigo-500" />
                          <span>Patient companion: {activeEHR.petName}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                          Classification: {activeEHR.petType} ({activeEHR.breed}) • Age: {activeEHR.age}
                        </p>
                      </div>
                      
                      <div className="flex gap-2 ml-auto">
                        <button 
                          onClick={() => handleDownloadPassport(activeEHR)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition-transform transform active:scale-95 cursor-pointer flex items-center gap-1.5"
                        >
                          <Award className="h-4 w-4" /> Download Vaccine Passport
                        </button>
                        <button 
                          onClick={() => setBookingPet(activeEHR)}
                          className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-transform transform active:scale-95 cursor-pointer"
                        >
                          Book Next Vaccine Check-up
                        </button>
                      </div>
                    </div>

                    {/* Vaccination details */}
                    <div className="p-5 space-y-3">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <Syringe className="h-4.5 w-4.5 text-sky-500" />
                        Vaccination & Immunity Timeline
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {activeEHR.vaccinations.map((v, i) => (
                          <div key={i} className="p-3 border border-slate-100 rounded-xl relative overflow-hidden bg-slate-50/20">
                            <span className="text-[10px] font-mono text-slate-400 block font-bold">CORE PROTECTION</span>
                            <span className="font-extrabold text-slate-850 text-sm block mt-0.5">{v.name}</span>
                            <span className="text-[9px] text-slate-500 block mt-1">Given: {v.dateAdministered} • Next: <span className="font-bold text-slate-700">{v.nextDueDate}</span></span>
                            
                            <span className={`absolute top-2 right-2 text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                              v.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              v.status === 'due-soon' ? 'bg-amber-100 text-amber-800 font-medium' :
                              'bg-rose-100 text-rose-800 font-bold animate-pulse'
                            }`}>
                              {v.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Latest Medical Visited Records */}
                    <div className="p-5 space-y-2">
                      <span className="font-extrabold text-slate-800 flex items-center gap-1">
                        <FileText className="h-4.5 w-4.5 text-sky-500" />
                        Therapeutic Records (Last Consultation)
                      </span>
                      <div className="p-4 bg-slate-50 rounded-2xl flex flex-col gap-2 border border-slate-100 mb-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700">Diagnosis: {activeEHR.diagnosis || 'Standard Check'}</span>
                          <span className="font-mono text-[9px] text-slate-400">Visit Date: {activeEHR.visitDate}</span>
                        </div>
                        <p className="text-slate-500 leading-relaxed font-semibold mt-1">
                          Clinical Notes: {activeEHR.symptoms}<br />
                          Instructions: {activeEHR.treatmentNotes}
                        </p>
                      </div>

                      {/* Interactive Lab Diagnostics Card */}
                      {activeEHR.labResults && activeEHR.labResults.length > 0 && (
                        <div className="space-y-2 mt-4 pt-3 border-t">
                          <span className="font-extrabold text-slate-800 flex items-center gap-1">
                            <Award className="h-4.5 w-4.5 text-indigo-500" />
                            Clinical Diagnostics & Lab Cytologies
                          </span>
                          <div className="grid grid-cols-1 gap-2">
                            {activeEHR.labResults.map((lab) => (
                              <div 
                                key={lab.id} 
                                className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all ${
                                  lab.status === 'urgent' 
                                    ? 'bg-rose-50/50 border-rose-200 text-rose-900 shadow-xs animate-pulse' 
                                    : 'bg-slate-50 border-slate-100 text-slate-800'
                                }`}
                              >
                                <div className="flex justify-between items-center flex-wrap gap-2">
                                  <span className="font-bold text-slate-850 flex items-center gap-1.5">
                                    <span className={`w-2 h-2 rounded-full ${lab.status === 'urgent' ? 'bg-rose-600 animate-ping' : 'bg-indigo-600'}`} />
                                    {lab.testName}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-mono font-black uppercase ${
                                    lab.status === 'urgent' ? 'bg-rose-200 text-rose-800' :
                                    lab.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {lab.status}
                                  </span>
                                </div>
                                <div className="grid grid-cols-2 gap-4 text-[10px] font-mono font-bold mt-1 text-slate-500 border-t pt-2 border-slate-200/50">
                                  <div>
                                    <span className="block text-[8px] text-slate-400 font-sans">DETECTED VALUE</span>
                                    <span className={`text-xs ${lab.status === 'urgent' ? 'text-rose-700 font-extrabold' : 'text-slate-805 text-slate-800 font-semibold'}`}>
                                      {lab.value || 'Pending analysis'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="block text-[8px] text-slate-400 font-sans">REFERENCE STANDARD</span>
                                    <span>{lab.referenceRange || 'N/A'}</span>
                                  </div>
                                </div>
                                {lab.notes && (
                                  <p className="text-[11px] leading-relaxed text-slate-500 font-sans italic mt-1.5 border-t pt-1.5 border-dashed border-slate-200/50">
                                    <strong>Pathologist Notes:</strong> {lab.notes}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-8 text-center text-rose-800 text-xs">
                No active records discovered linked under that phone number. Try <span className="font-mono font-bold">+1 (555) 781-4200</span>
              </div>
            )
          ) : (
            <div className="bg-slate-50 border border-dashed border-sky-100 rounded-3xl p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
              <Smartphone className="h-10 w-10 text-sky-300 stroke-1 mb-2 animate-bounce" />
              <p className="font-bold text-slate-500 text-base leading-none">Retrieve Companion Details</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-sm">
                Enter your registered mobile number on the left panel to secure-verify vaccination logs and treatment records instantly.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Book Booster Checklist Slide and Modal */}
      {bookingPet && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-md w-full text-xs shadow-xl animate-fade-in flex flex-col overflow-hidden max-h-[calc(100vh-40px)]">
            
            <div className="flex justify-between items-start shrink-0 p-6 pb-4 border-b border-slate-100">
              <div>
                <h4 className="text-base font-extrabold text-slate-800 leading-none flex items-center gap-1.5">
                  <Calendar className="w-5 h-5 text-indigo-500" /> Request Care Booking
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Connect directly with Dr. Kandy Cruz, DVM for vaccine booster appointments</p>
              </div>
              <button 
                onClick={() => setBookingPet(null)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {bookingOutcome ? (
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2 text-center animate-pulse">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                  <h5 className="font-black text-emerald-900 text-xs">Booster Request Submitted!</h5>
                  <p className="text-[10px] text-slate-500">
                    We've successfully registered your appointment request for {bookingPet.petName} on his medical record ledger. Kandy staff will text/email confirmation soon.
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBookNextBooster} className="flex flex-col min-h-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-700 block" htmlFor="booster-goal-requested-vaccine">Booster Goal / Requested vaccine</label>
                    <select name="boosterGoalRequestedVaccine" id="booster-goal-requested-vaccine"
                      value={bookingReason}
                      onChange={(e) => setBookingReason(e.target.value)}
                      className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-xs"
                      required
                    >
                      <option value="">-- Choose Protection Type --</option>
                      <option value="Annual DHPP Vaccine Booster">Annual DHPP Vaccine Booster</option>
                      <option value="Rabies (3-Year) Vaccine Dose">Rabies (3-Year) Vaccine Dose</option>
                      <option value="Bordetella Kennel Cough Spray">Bordetella Kennel Cough Spray</option>
                      <option value="General Health Medical checkup">General Health Medical checkup</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 block" htmlFor="desired-date">Desired Date</label>
                      <input name="desiredDate" id="desired-date"
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700 block" htmlFor="desired-hours">Desired Hours</label>
                      <input name="desiredHours" id="desired-hours"
                        type="time"
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 p-6 pt-4 border-t border-slate-100 flex gap-2 bg-white">
                  <button
                    type="button"
                    onClick={() => setBookingPet(null)}
                    className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Submit Booking Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
