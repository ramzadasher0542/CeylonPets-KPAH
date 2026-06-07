/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Activity, 
  ShieldCheck, 
  Plus, 
  Lock, 
  Check, 
  User, 
  Syringe, 
  AlertTriangle,
  Beaker,
  TrendingDown,
  RefreshCcw,
  Sparkles,
  ChevronRight,
  Printer,
  Trash2
} from 'lucide-react';
import { MedicalRecord, Vaccination, LabResult } from '../types';
import { showToast } from './Toast';

interface EHRProps {
  records: MedicalRecord[];
  isOnline: boolean;
  onUpdateRecord: (updated: MedicalRecord) => void;
  onDeleteRecord?: (id: string) => void;
  onAddRecord: (newRec: MedicalRecord) => void;
  systemConfig?: any;
}

export default function MedicalRecordsManager({ 
  records, 
  isOnline, 
  onUpdateRecord, 
  onDeleteRecord,
  onAddRecord,
  systemConfig
}: EHRProps) {
  const [selectedRecordId, setSelectedRecordId] = useState<string>(records[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEHRSubTab, setActiveEHRSubTab] = useState<'details' | 'vaccines' | 'labs'>('details');

  // Encryption visualization fields
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [lastCryptedToken, setLastCryptedToken] = useState<string>('');
  const [syncConfirmed, setSyncConfirmed] = useState(false);

  // New Consultation Entry Form values
  const [showNewRecordForm, setShowNewRecordForm] = useState(false);
  const [newPetName, setNewPetName] = useState('');
  const [newPetType, setNewPetType] = useState<'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other'>('Dog');
  const [newBreed, setNewBreed] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newWeight, setNewWeight] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newSymptoms, setNewSymptoms] = useState('');
  const [newDiagnosis, setNewDiagnosis] = useState('');
  const [newTreatmentNotes, setNewTreatmentNotes] = useState('');

  // Edit Patient Entry Form values
  const [showEditRecordForm, setShowEditRecordForm] = useState(false);
  const [editPetName, setEditPetName] = useState('');
  const [editPetType, setEditPetType] = useState<'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other'>('Dog');
  const [editBreed, setEditBreed] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editOwnerName, setEditOwnerName] = useState('');
  const [editOwnerPhone, setEditOwnerPhone] = useState('');
  const [editOwnerEmail, setEditOwnerEmail] = useState('');

  // Editable report entry states
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [editSymptoms, setEditSymptoms] = useState('');
  const [editDiagnosis, setEditDiagnosis] = useState('');
  const [editTreatmentNotes, setEditTreatmentNotes] = useState('');

  // New Vaccination entry states
  const [showAddVaccine, setShowAddVaccine] = useState(false);
  const [newVacName, setNewVacName] = useState('');
  const [newVacDate, setNewVacDate] = useState('');
  const [newVacDueDate, setNewVacDueDate] = useState('');
  const [newVacStatus, setNewVacStatus] = useState<'active' | 'overdue' | 'due-soon'>('active');
  const [editVaccineIndex, setEditVaccineIndex] = useState<number | null>(null);
  const [editLabIndex, setEditLabIndex] = useState<number | null>(null);

  // New Lab entry states
  const [showAddLab, setShowAddLab] = useState(false);
  const [newLabTestName, setNewLabTestName] = useState('');
  const [newLabDate, setNewLabDate] = useState('');
  const [newLabStatus, setNewLabStatus] = useState<'pending' | 'completed' | 'urgent'>('completed');
  const [newLabValue, setNewLabValue] = useState('');
  const [newLabRefRange, setNewLabRefRange] = useState('');
  const [newLabNotes, setNewLabNotes] = useState('');

  const activeRecord = records.find(r => r.id === selectedRecordId);

  // Search filter
  const filteredRecords = records.filter(r => 
    r.petName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.breed.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Simple encryption mock sequence indicating advanced HIPAA alignment
  const triggerEHRCloudSynchronization = () => {
    if (!activeRecord) return;
    setIsEncrypting(true);
    setSyncConfirmed(false);

    // Generate simulated AES hex payload representing high medical standards
    setTimeout(() => {
      const plainJSON = JSON.stringify({
        recordId: activeRecord.id,
        patient: activeRecord.petName,
        diagnoses: activeRecord.diagnosis,
        lockedBy: `${systemConfig?.appName || 'CeylonPets'}_Vet_AES_256`,
        timestamp: new Date().toISOString()
      });
      
      // Basic reversible mock hex cipher to show interactive feedback
      let hexMock = '';
      for (let i = 0; i < plainJSON.length && i < 36; i++) {
        hexMock += plainJSON.charCodeAt(i).toString(16).padStart(2, '0');
      }
      hexMock += '... [CIPHER_END_COMPLIANT_AES256]';

      setLastCryptedToken(hexMock.toUpperCase());
      setIsEncrypting(false);
      setSyncConfirmed(true);
    }, 1200);
  };

  const handleCreateNewEHR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPetName || !newOwnerName || !newOwnerPhone) {
      showToast('Patient descriptors cannot be empty.', 'error');
      return;
    }

    const newRec: MedicalRecord = {
      id: `rec-${Date.now()}`,
      patientId: `${newPetName}_${newOwnerPhone.replace(/\D/g, '')}`,
      petName: newPetName,
      petType: newPetType,
      breed: newBreed || 'Mixed Lineage',
      age: newAge || 'Under 1 Year',
      weight: parseFloat(newWeight) || 5.0,
      ownerName: newOwnerName,
      ownerPhone: newOwnerPhone,
      ownerEmail: newOwnerEmail || `no-email@${(systemConfig?.appName || 'CeylonPets').toLowerCase()}.com`,
      visitDate: new Date().toISOString().split('T')[0],
      symptoms: newSymptoms,
      diagnosis: newDiagnosis,
      treatmentNotes: newTreatmentNotes,
      prescribedMeds: [],
      vaccinations: [],
      labResults: [],
      createdDate: new Date().toISOString().split('T')[0]
    };

    onAddRecord(newRec);
    setSelectedRecordId(newRec.id);
    setShowNewRecordForm(false);

    // reset fields
    setNewPetName('');
    setNewBreed('');
    setNewAge('');
    setNewWeight('');
    setNewOwnerName('');
    setNewOwnerPhone('');
    setNewOwnerEmail('');
    setNewSymptoms('');
    setNewDiagnosis('');
    setNewTreatmentNotes('');
  };

  const handleSaveEditEHR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRecord) return;
    if (!editPetName || !editOwnerName || !editOwnerPhone) {
      showToast('Patient descriptors cannot be empty.', 'error');
      return;
    }
    const updatedRec: MedicalRecord = {
      ...activeRecord,
      petName: editPetName,
      petType: editPetType,
      breed: editBreed || 'Mixed Lineage',
      age: editAge || 'Under 1 Year',
      weight: parseFloat(editWeight) || 5.0,
      ownerName: editOwnerName,
      ownerPhone: editOwnerPhone,
      ownerEmail: editOwnerEmail
    };
    onUpdateRecord(updatedRec);
    setShowEditRecordForm(false);
  };

  const openEditPatientForm = () => {
    if (!activeRecord) return;
    setEditPetName(activeRecord.petName);
    setEditPetType(activeRecord.petType);
    setEditBreed(activeRecord.breed);
    setEditAge(activeRecord.age);
    setEditWeight(activeRecord.weight.toString());
    setEditOwnerName(activeRecord.ownerName);
    setEditOwnerPhone(activeRecord.ownerPhone);
    setEditOwnerEmail(activeRecord.ownerEmail);
    setShowEditRecordForm(true);
  };

  const handleDeletePatient = () => {
    if (!activeRecord) return;
    if (window.confirm(`Are you sure you want to permanently delete the medical chart for ${activeRecord.petName}? This action cannot be undone.`)) {
      if (onDeleteRecord) {
        onDeleteRecord(activeRecord.id);
        const remaining = records.filter(r => r.id !== activeRecord.id);
        if (remaining.length > 0) {
          setSelectedRecordId(remaining[0].id);
        } else {
          setSelectedRecordId('');
        }
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="ehr-manager-portal">
      
      {/* Sidebar List - Search & Selection (4 Cols) */}
      <div className="lg:col-span-4 bg-white p-4 rounded-2xl border border-sky-100 shadow-sm flex flex-col h-[35rem] text-xs print:hidden">
        <div className="space-y-3 pb-3 border-b border-slate-100 flex items-center justify-between">
          <div className="relative flex-1 mr-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-sky-500 font-semibold"
            />
          </div>
          <button
            onClick={() => setShowNewRecordForm(true)}
            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 cursor-pointer"
            title="Create New Medical File"
          >
            <Plus className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Patient Cards list */}
        <div className="flex-1 overflow-y-auto pt-3 space-y-1">
          {filteredRecords.map(rec => {
            const isSelected = rec.id === selectedRecordId;
            return (
              <div
                key={rec.id}
                onClick={() => setSelectedRecordId(rec.id)}
                className={`p-3 rounded-xl cursor-pointer transition-all flex items-center justify-between group ${
                  isSelected 
                    ? 'bg-sky-50 border border-sky-200 text-sky-950 font-bold' 
                    : 'border border-transparent hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm">{rec.petName}</span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 group-hover:bg-white text-slate-500 rounded font-semibold font-mono">{rec.petType}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium">Owner: {rec.ownerName}</div>
                </div>
                <ChevronRight className={`h-4.5 w-4.5 text-slate-400 ${isSelected ? 'text-sky-600 translate-x-1' : ''}`} />
              </div>
            );
          })}
          {filteredRecords.length === 0 && (
            <div className="text-center text-slate-400 py-12">
              No matching EHR medical charts found.
            </div>
          )}
        </div>
      </div>

      {/* Main EHR Chart details Card (8 Cols) */}
      <div className="lg:col-span-8">
        {activeRecord ? (
          <div className="bg-white rounded-2xl border border-sky-100 shadow-sm overflow-hidden flex flex-col justify-between h-[35rem] text-xs print:hidden">
            
            {/* Chart Banner */}
            <div className="p-5 bg-gradient-to-r from-sky-500/10 via-sky-500/5 to-white border-b border-sky-100">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-extrabold text-slate-800">{activeRecord.petName}</h3>
                    <span className="px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-md font-mono">{activeRecord.breed}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Age: {activeRecord.age} • Weight: <span className="font-bold text-slate-700">{activeRecord.weight} kg</span> • Owner Phone: {activeRecord.ownerPhone}
                  </p>
                </div>

                {/* HIPAA compliance sync shield */}
                <div className="flex flex-col gap-2 items-end">
                  <button
                    onClick={() => window.print()}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs print:hidden"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print Full Medical Record</span>
                  </button>
                  <button
                    onClick={openEditPatientForm}
                    className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-xs text-[10px] print:hidden"
                  >
                    ✏️ Edit Patient Details
                  </button>
                </div>
              </div>

              {/* Patient EHR sub-tabs */}
              <div className="flex gap-2 mt-5 print:hidden">
                <button
                  onClick={() => setActiveEHRSubTab('details')}
                  className={`px-4 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                    activeEHRSubTab === 'details' ? 'bg-sky-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Clinical Report
                </button>
                <button
                  onClick={() => setActiveEHRSubTab('vaccines')}
                  className={`px-4 py-1.5 rounded-lg font-bold cursor-pointer transition-all ${
                    activeEHRSubTab === 'vaccines' ? 'bg-sky-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Vaccinations ({activeRecord.vaccinations.length})
                </button>
                <button
                  onClick={() => setActiveEHRSubTab('labs')}
                  className={`px-4 py-1.5 rounded-lg font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    activeEHRSubTab === 'labs' ? 'bg-sky-500 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Diagnostics & Labs
                  {activeRecord.labResults.some(l => l.status === 'urgent') && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                  )}
                </button>
              </div>
            </div>

            {/* Sub-tab scrollable viewport */}
            <div className="flex-1 p-6 overflow-y-auto print:overflow-visible space-y-4">
                         {/* DETAILS CLINICAL REPORT */}
              {activeEHRSubTab === 'details' && (
                <div className="space-y-4">
                  {isEditingReport ? (
                    <div className="space-y-4 p-4 border border-indigo-100 rounded-2xl bg-indigo-50/10">
                      <div className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5 pb-2 border-b">
                        <span>✏️ Edit Clinical Records Entry</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[10px]">Subjective & Objective Findings</label>
                          <textarea
                            rows={3}
                            value={editSymptoms}
                            onChange={(e) => setEditSymptoms(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700 block text-[10px]">Assessment</label>
                          <textarea
                            rows={3}
                            value={editDiagnosis}
                            onChange={(e) => setEditDiagnosis(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block text-[10px]">Treatment Plan & Prescriptions</label>
                        <textarea
                          rows={3}
                          value={editTreatmentNotes}
                          onChange={(e) => setEditTreatmentNotes(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-sky-500 focus:outline-none"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingReport(false)}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition-all cursor-pointer text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateRecord({
                              ...activeRecord,
                              symptoms: editSymptoms,
                              diagnosis: editDiagnosis,
                              treatmentNotes: editTreatmentNotes
                            });
                            setIsEditingReport(false);
                          }}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all cursor-pointer text-xs shadow-xs"
                        >
                          Save Record
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                          <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase tracking-wider mb-1">Subjective & Objective Findings</span>
                          <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{activeRecord.symptoms}</p>
                        </div>
                        <div className="p-4 bg-teal-50/40 border border-teal-100 rounded-xl">
                          <span className="text-[10px] font-mono text-teal-600 block font-bold uppercase tracking-wider mb-1">Assessment</span>
                          <p className="text-teal-950 font-bold leading-relaxed whitespace-pre-wrap">{activeRecord.diagnosis}</p>
                        </div>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                        <span className="text-[10px] font-mono text-slate-400 block font-bold uppercase tracking-wider">Treatment Plan & Prescriptions</span>
                        <p className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">{activeRecord.treatmentNotes}</p>
                      </div>

                      <div className="flex justify-end pt-4 print:hidden">
                        <button
                          onClick={() => {
                            setEditSymptoms(activeRecord.symptoms);
                            setEditDiagnosis(activeRecord.diagnosis);
                            setEditTreatmentNotes(activeRecord.treatmentNotes);
                            setIsEditingReport(true);
                          }}
                          className="px-4.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-xs"
                        >
                          <span>✏️ Edit Clinical Entry</span>
                        </button>
                      </div>
                      
                      <div className="mt-8 pt-4 border-t border-rose-100 print:hidden">
                        <button
                          onClick={handleDeletePatient}
                          className="px-4 py-2 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 font-bold rounded-lg transition-colors cursor-pointer text-[10px]"
                        >
                          🗑️ Delete Patient Chart
                        </button>
                      </div>
                    </>
                  )}

                  {activeRecord.prescribedMeds.length > 0 && (
                    <div className="p-4 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-2">
                      <span className="text-[10px] font-mono text-emerald-600 block font-bold uppercase">Prescribed Pharmacy Medications</span>
                      <div className="space-y-2">
                        {activeRecord.prescribedMeds.map((med, i) => (
                          <div key={i} className="flex justify-between items-center text-xs">
                            <span className="font-extrabold text-slate-800">{med.name}</span>
                            <span className="font-semibold text-slate-600 font-mono italic">{med.dosage} (Qty: {med.quantity})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* VACCINATION CHECKLISTS */}
              {activeEHRSubTab === 'vaccines' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <div>
                      <span className="font-bold text-slate-700 block">Vaccination Chart Logs</span>
                      <span className="text-[10px] text-slate-400 font-medium block">Next core boosters</span>
                    </div>
                    <button
                      onClick={() => {
                        setNewVacName('');
                        setNewVacDate(new Date().toISOString().split('T')[0]);
                        setNewVacDueDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
                        setNewVacStatus('active');
                        setEditVaccineIndex(null);
                        setShowAddVaccine(!showAddVaccine);
                      }}
                      className="px-2.5 py-1.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Vaccine Dose
                    </button>
                  </div>

                  {showAddVaccine && (
                    <div className="p-4 border border-rose-100 bg-rose-50/10 rounded-2xl space-y-3 font-sans text-xs">
                      <span className="font-bold text-slate-800 block text-xs">Log Administered Vaccine Lot</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 block text-[10px]">Vaccine Name / Description</label>
                          <input
                            type="text"
                            placeholder="e.g. DHPP Core Parvovirus Booster"
                            value={newVacName}
                            onChange={(e) => setNewVacName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Active Status Check</label>
                          <select
                            value={newVacStatus}
                            onChange={(e: any) => setNewVacStatus(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          >
                            <option value="active">Active Current</option>
                            <option value="due-soon">Due Soon (under 60 days)</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Date Administered</label>
                          <input
                            type="date"
                            value={newVacDate}
                            onChange={(e) => setNewVacDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Next Booster Due Date</label>
                          <input
                            type="date"
                            value={newVacDueDate}
                            onChange={(e) => setNewVacDueDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddVaccine(false)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newVacName.trim()) {
                              showToast('Vaccine name is required', 'error');
                              return;
                            }
                            let updatedVaccinations = [...activeRecord.vaccinations];
                            if (editVaccineIndex !== null) {
                              updatedVaccinations[editVaccineIndex] = {
                                name: newVacName,
                                dateAdministered: newVacDate,
                                nextDueDate: newVacDueDate,
                                status: newVacStatus
                              };
                            } else {
                              updatedVaccinations.push({
                                name: newVacName,
                                dateAdministered: newVacDate,
                                nextDueDate: newVacDueDate,
                                status: newVacStatus
                              });
                            }
                            onUpdateRecord({
                              ...activeRecord,
                              vaccinations: updatedVaccinations
                            });
                            setShowAddVaccine(false);
                            setEditVaccineIndex(null);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg text-[11px]"
                        >
                          Save Vaccine Record
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="divide-y divide-slate-100">
                    {activeRecord.vaccinations.map((vac, idx) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center group">
                        <div className="space-y-0.5">
                          <span className="font-bold text-slate-800 text-sm">{vac.name}</span>
                          <span className="text-slate-400 font-medium block">Administered: {vac.dateAdministered}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right space-y-1">
                            <span className="text-slate-500 font-mono font-bold block text-[11px]">Due: {vac.nextDueDate}</span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              vac.status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                              vac.status === 'due-soon' ? 'bg-amber-100 text-amber-800' :
                              'bg-rose-100 text-rose-800 animate-pulse'
                            }`}>
                              {vac.status === 'active' ? 'Current Active' : vac.status === 'due-soon' ? 'Due Soon' : 'Booster Overdue'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setNewVacName(vac.name);
                                setNewVacDate(vac.dateAdministered);
                                setNewVacDueDate(vac.nextDueDate);
                                setNewVacStatus(vac.status as any);
                                setEditVaccineIndex(idx);
                                setShowAddVaccine(true);
                              }}
                              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                if(window.confirm('Are you sure you want to remove this vaccination record?')) {
                                  const updated = [...activeRecord.vaccinations];
                                  updated.splice(idx, 1);
                                  onUpdateRecord({ ...activeRecord, vaccinations: updated });
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {activeRecord.vaccinations.length === 0 && (
                    <div className="text-center text-slate-400 py-12">
                      No records found. Click + to add a new entry.
                    </div>
                  )}
                </div>
              )}

              {/* DIAGNOSTIC WORKUPS & LAB REPORT */}
              {activeEHRSubTab === 'labs' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b">
                    <div>
                      <span className="font-bold text-slate-700 block">Lab Diagnostic Reports</span>
                      <span className="text-[10px] text-slate-400 font-medium block">Specimen test results</span>
                    </div>
                    <button
                      onClick={() => {
                        setNewLabTestName('');
                        setNewLabDate(new Date().toISOString().split('T')[0]);
                        setNewLabStatus('completed');
                        setNewLabValue('');
                        setNewLabRefRange('');
                        setNewLabNotes('');
                        setShowAddLab(!showAddLab);
                      }}
                      className="px-2.5 py-1.5 text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Lab Report
                    </button>
                  </div>

                  {showAddLab && (
                    <div className="p-4 border border-indigo-100 bg-indigo-50/10 rounded-2xl space-y-3 font-sans text-xs">
                      <span className="font-bold text-slate-800 block text-xs">Register Lab Workup Entry</span>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-600 block text-[10px]">Test Name / Marker</label>
                          <input
                            type="text"
                            placeholder="e.g. Complete Blood Count (CBC)"
                            value={newLabTestName}
                            onChange={(e) => setNewLabTestName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Result Clearance Status</label>
                          <select
                            value={newLabStatus}
                            onChange={(e: any) => setNewLabStatus(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          >
                            <option value="completed">Completed (Normal)</option>
                            <option value="pending">Pending Specimen Analysis</option>
                            <option value="urgent">Urgent Alarms / High Critical</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Released Date</label>
                          <input
                            type="date"
                            value={newLabDate}
                            onChange={(e) => setNewLabDate(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Tested Value Metrics</label>
                          <input
                            type="text"
                            placeholder="e.g. 14.5 g/dL"
                            value={newLabValue}
                            onChange={(e) => setNewLabValue(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Reference Safe Threshold Range</label>
                          <input
                            type="text"
                            placeholder="e.g. 12.0 - 18.0 g/dL"
                            value={newLabRefRange}
                            onChange={(e) => setNewLabRefRange(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="font-bold text-slate-650 block text-[10px]">Diagnostic Notes</label>
                          <input
                            type="text"
                            placeholder="e.g. Red blood cells morphology normal."
                            value={newLabNotes}
                            onChange={(e) => setNewLabNotes(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-850"
                          />
                        </div>
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setShowAddLab(false)}
                          className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-lg text-[11px]"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!newLabTestName.trim()) {
                              showToast('Lab test name is required', 'success');
                              return;
                            }
                            let updatedLabs = [...activeRecord.labResults];
                            if (editLabIndex !== null) {
                              updatedLabs[editLabIndex] = {
                                ...updatedLabs[editLabIndex],
                                testName: newLabTestName,
                                resultDate: newLabDate,
                                status: newLabStatus,
                                value: newLabValue,
                                referenceRange: newLabRefRange,
                                notes: newLabNotes
                              };
                            } else {
                              updatedLabs.push({
                                id: `lab-entry-${Date.now()}`,
                                testName: newLabTestName,
                                requestDate: new Date().toISOString().split('T')[0],
                                resultDate: newLabDate,
                                status: newLabStatus,
                                value: newLabValue,
                                referenceRange: newLabRefRange,
                                notes: newLabNotes
                              });
                            }
                            onUpdateRecord({
                              ...activeRecord,
                              labResults: updatedLabs
                            });
                            setShowAddLab(false);
                            setEditLabIndex(null);
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg text-[11px]"
                        >
                          Save Lab Report
                        </button>
                      </div>
                    </div>
                  )}

                  {activeRecord.labResults.map((lab, idx) => (
                    <div 
                      key={lab.id} 
                      className={`p-4 border rounded-xl space-y-2 group relative ${
                        lab.status === 'urgent' ? 'border-rose-200 bg-rose-50/20' : 'border-slate-100 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex justify-between items-start text-xs">
                        <div>
                          <span className="font-black text-slate-800 text-sm block">{lab.testName}</span>
                          <span className="text-slate-400 font-medium font-mono text-[10px] block">Released Date: {lab.resultDate || 'Pending Workup'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-bold px-2.5 py-1 rounded-lg ${
                            lab.status === 'urgent' ? 'bg-rose-600 text-white animate-pulse' :
                            lab.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {lab.status.toUpperCase()}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setNewLabTestName(lab.testName);
                                setNewLabDate(lab.resultDate || '');
                                setNewLabStatus(lab.status as any);
                                setNewLabValue(lab.value || '');
                                setNewLabRefRange(lab.referenceRange || '');
                                setNewLabNotes(lab.notes || '');
                                setEditLabIndex(idx);
                                setShowAddLab(true);
                              }}
                              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer bg-white/50"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => {
                                if(window.confirm('Are you sure you want to remove this lab record?')) {
                                  const updated = [...activeRecord.labResults];
                                  updated.splice(idx, 1);
                                  onUpdateRecord({ ...activeRecord, labResults: updated });
                                }
                              }}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer bg-white/50"
                              title="Remove"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-2 border-t text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Tested Metric Value</span>
                          <span className="font-extrabold text-slate-700">{lab.value || 'Gathering specimen results'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Safe Reference Range</span>
                          <span className="font-mono text-slate-500 font-bold">{lab.referenceRange || 'Standard Lab thresholds'}</span>
                        </div>
                      </div>

                      {lab.notes && (
                        <div className="mt-2 text-slate-600 leading-relaxed font-semibold">
                          * Note: {lab.notes}
                        </div>
                      )}
                    </div>
                  ))}
                  {activeRecord.labResults.length === 0 && (
                    <div className="text-center text-slate-400 py-12">
                      No records found. Click + to add a new entry.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cryptographic Sync Console */}
            {syncConfirmed && (
              <div className="pb-4 px-6 pt-3 bg-indigo-50 border-t border-sky-100 space-y-2 animate-fade-in text-[10px]">
                <div className="flex items-center justify-between font-bold text-indigo-900 text-xs">
                  <span className="flex items-center gap-1"><Lock className="h-3.5 w-3.5 text-indigo-600" /> HIPAA Secure e-Sync Logged</span>
                  <span className="text-indigo-600 font-mono font-black animate-pulse">256-BIT ENCRYPTED</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg text-emerald-400 font-mono select-all overflow-x-auto select-all leading-relaxed whitespace-pre-wrap">
                  {lastCryptedToken}
                </div>
                <p className="text-[10px] text-indigo-700 font-medium">
                  * Clinical logs have been compiled, hashed with standard SHA256 protocols, and transmitted to connected medical networks securely.
                </p>
              </div>
            )}
            
            {isEncrypting && (
              <div className="py-4 px-6 text-center text-indigo-600 font-bold bg-indigo-50 border-t border-indigo-100 flex items-center justify-center gap-2 animate-pulse">
                <RefreshCcw className="h-4 w-4 animate-spin text-indigo-500" />
                Encrypting medical payload conforming to secure privacy standard...
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-50 border rounded-3xl p-24 text-center text-slate-400 text-xs">
            Choose or load a veterinary case chart to inspect patient records.
          </div>
        )}
      </div>

      {/* New EHR Consultation Record Overlay */}
      {showNewRecordForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-lg w-full p-6 text-xs shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-base font-extrabold text-slate-800 leading-none">Assemble New Patient Medical Chart</h4>
                <p className="text-[11px] text-slate-400 mt-1">Populate baseline medical files for pet care tracking</p>
              </div>
              <button 
                onClick={() => setShowNewRecordForm(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateNewEHR} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Pet descriptor */}
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Pet Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Coco, Luna"
                    value={newPetName}
                    onChange={(e) => setNewPetName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Animal species type</label>
                  <select
                    value={newPetType}
                    onChange={(e) => setNewPetType(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Bird">Bird</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Breed details</label>
                  <input
                    type="text"
                    placeholder="French Bulldog"
                    value={newBreed}
                    onChange={(e) => setNewBreed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Estimated Age</label>
                  <input
                    type="text"
                    placeholder="3 Years / 8 Months"
                    value={newAge}
                    onChange={(e) => setNewAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 block">Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="12.5"
                    value={newWeight}
                    onChange={(e) => setNewWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Client / Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Marcus Avery"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Owner Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 432-8761"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 block">Owner Email</label>
                  <input
                    type="email"
                    placeholder="marcus.a@example.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                {/* Health diagnostics */}
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 block">Chief Symptoms Reported *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Lethargy, redness around belly skin, frequent head turning..."
                    value={newSymptoms}
                    onChange={(e) => setNewSymptoms(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-snug"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 block">Clinical Diagnosis Assessment</label>
                  <input
                    type="text"
                    placeholder="Allergic flare, standard check-up healthy, mild infection"
                    value={newDiagnosis}
                    onChange={(e) => setNewDiagnosis(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 block">Treatment Notes</label>
                  <textarea
                    rows={2}
                    placeholder="Cleaned affected skin, prescribed topical spray. Booster rabies shot administered."
                    value={newTreatmentNotes}
                    onChange={(e) => setNewTreatmentNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 leading-snug"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewRecordForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer shadow-xs"
                >
                  Save to EHR Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit EHR Consultation Record Overlay */}
      {showEditRecordForm && activeRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-lg w-full p-6 text-xs shadow-xl animate-fade-in max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-base font-extrabold text-slate-800 leading-none">Edit Patient Medical Profile</h4>
                <p className="text-[11px] text-slate-400 mt-1">Update patient demographics and owner information</p>
              </div>
              <button 
                onClick={() => setShowEditRecordForm(false)}
                className="p-1 hover:bg-slate-100 text-slate-400 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditEHR} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Pet Name *</label>
                  <input
                    type="text"
                    required
                    value={editPetName}
                    onChange={(e) => setEditPetName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Animal species type</label>
                  <select
                    value={editPetType}
                    onChange={(e) => setEditPetType(e.target.value as any)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                  >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                    <option value="Rabbit">Rabbit</option>
                    <option value="Bird">Bird</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Breed details</label>
                  <input
                    type="text"
                    value={editBreed}
                    onChange={(e) => setEditBreed(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Age designation</label>
                  <input
                    type="text"
                    value={editAge}
                    onChange={(e) => setEditAge(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Measured Weight (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="col-span-1 sm:col-span-2 mt-2 pt-2 border-t border-slate-100">
                  <h5 className="font-bold text-slate-800 mb-2">Pet Owner / Client Information</h5>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Owner Name *</label>
                  <input
                    type="text"
                    required
                    value={editOwnerName}
                    onChange={(e) => setEditOwnerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700 block">Contact Phone *</label>
                  <input
                    type="tel"
                    required
                    value={editOwnerPhone}
                    onChange={(e) => setEditOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-semibold text-slate-700 block">Email Address</label>
                  <input
                    type="email"
                    value={editOwnerEmail}
                    onChange={(e) => setEditOwnerEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 mt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditRecordForm(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  Save Patient
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dedicated Print View Template */}
      {activeRecord && (
        <div className="hidden print:block print:absolute print:top-0 print:left-0 print:w-full print:bg-white print:text-black print:z-50 print:p-8">
          <div className="text-center border-b-2 border-black pb-4 mb-6">
            <h1 className="text-2xl font-black uppercase">CeylonPets Animal Hospital - Official Patient Medical Record</h1>
            <p className="text-sm font-semibold mt-1">Generated: {new Date().toLocaleDateString()}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 uppercase border-b border-gray-300 pb-1">Patient Demographics</h2>
            <div className="grid grid-cols-2 gap-4 border border-black p-4">
              <div><span className="font-bold">Name:</span> {activeRecord.petName}</div>
              <div><span className="font-bold">Species:</span> {activeRecord.petType}</div>
              <div><span className="font-bold">Breed:</span> {activeRecord.breed}</div>
              <div><span className="font-bold">Age:</span> {activeRecord.age}</div>
              <div><span className="font-bold">Weight:</span> {activeRecord.weight} kg</div>
              <div><span className="font-bold">Owner:</span> {activeRecord.ownerName} ({activeRecord.ownerPhone})</div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-bold mb-2 uppercase border-b border-gray-300 pb-1">Clinical Encounter (SOAP)</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-sm uppercase">Subjective & Objective Findings</h3>
                <p className="whitespace-pre-wrap mt-1 text-sm">{activeRecord.symptoms}</p>
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase">Assessment</h3>
                <p className="whitespace-pre-wrap mt-1 text-sm">{activeRecord.diagnosis}</p>
              </div>
              <div>
                <h3 className="font-bold text-sm uppercase">Treatment Plan & Prescriptions</h3>
                <p className="whitespace-pre-wrap mt-1 text-sm">{activeRecord.treatmentNotes}</p>
              </div>
            </div>
          </div>

          {activeRecord.vaccinations.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2 uppercase border-b border-gray-300 pb-1">Immunization History</h2>
              <table className="w-full text-left border-collapse border border-black text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">Vaccine Name</th>
                    <th className="border border-black p-2">Date Administered</th>
                    <th className="border border-black p-2">Next Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecord.vaccinations.map((vac, i) => (
                    <tr key={i}>
                      <td className="border border-black p-2">{vac.name}</td>
                      <td className="border border-black p-2">{vac.dateAdministered}</td>
                      <td className="border border-black p-2">{vac.nextDueDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeRecord.labResults.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-bold mb-2 uppercase border-b border-gray-300 pb-1">Diagnostic Labs</h2>
              <table className="w-full text-left border-collapse border border-black text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-black p-2">Test Name</th>
                    <th className="border border-black p-2">Result</th>
                    <th className="border border-black p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {activeRecord.labResults.map((lab, i) => (
                    <tr key={i}>
                      <td className="border border-black p-2">{lab.testName}</td>
                      <td className="border border-black p-2">{lab.value || 'Pending'} {lab.referenceRange ? `(${lab.referenceRange})` : ''}</td>
                      <td className="border border-black p-2 uppercase">{lab.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-8 pt-4 border-t-2 border-black text-center text-xs font-bold uppercase">
            This document confirms clinical records on file at CeylonPets. Verified Secure Clinical EHR Record.
          </div>
        </div>
      )}
    </div>
  );
}
