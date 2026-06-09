/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'veterinarian' | 'cashier' | 'owner' | 'dummy_admin';

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  avatarColor: string;
  pin?: string;
}

export type ItemCategory = 'retail' | 'prescription' | 'lab_service' | 'service' | 'vaccine';

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  unit: string;
  location?: string;
}

export type AppointmentStatus = 'booked' | 'in-progress' | 'completed' | 'cancelled';

export interface Appointment {
  id: string;
  petName: string;
  petType: 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other';
  breed: string;
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  date: string;
  time: string;
  veterinarian: string;
  reason: string;
  status: AppointmentStatus;
}

export interface Vaccination {
  itemId: string;
  name: string;
  price: number;
  billed: boolean;
  dateAdministered: string;
  nextDueDate: string;
  status: 'active' | 'overdue' | 'due-soon';
}

export interface LabResult {
  id: string;
  testName: string;
  requestDate: string;
  resultDate?: string;
  status: 'pending' | 'completed' | 'urgent';
  value?: string;
  referenceRange?: string;
  notes?: string;
}

export interface MedicalRecord {
  id: string;
  patientId: string; // matches petName_ownerPhone usually
  petName: string;
  petType: 'Dog' | 'Cat' | 'Bird' | 'Rabbit' | 'Other';
  breed: string;
  age: string;
  weight: number; // in kg
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  visitDate: string;
  symptoms: string;
  diagnosis: string;
  treatmentNotes: string;
  prescribedMeds: Array<{ itemId: string; name: string; dosage: string; quantity: number }>;
  vaccinations: Vaccination[];
  labResults: LabResult[];
  createdDate: string;
  attendingVet?: string;
}

export interface InvoiceItem {
  itemId: string;
  sku: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'e_wallet';

export interface PosShift {
  id: string;
  openedAt: string;
  closedAt?: string;
  status: 'open' | 'closed';
  openedBy: string;
}

export interface Invoice {
  id: string;
  appointmentId?: string; // Opt association
  patientId: string;
  petName: string;
  ownerName: string;
  ownerPhone: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  cogs?: number;
  profit?: number;
  paymentMethod?: PaymentMethod;
  paymentStatus: 'unpaid' | 'paid' | 'void';
  createdBy: string;
  shiftId?: string;
  notes?: string;
}

export interface ClientNotification {
  id: string;
  petName: string;
  ownerName: string;
  recipient: string; // phone or email
  type: 'appointment_reminder' | 'vaccine_alert' | 'followup' | 'lab_result';
  channel: 'sms' | 'email' | 'push';
  message: string;
  scheduledTime: string;
  status: 'queued' | 'sent' | 'failed';
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'urgent';
  category: 'inventory' | 'appointment' | 'system' | 'lab';
  message: string;
  timestamp: string;
  read: boolean;
}

export interface OfflineSyncItem {
  id: string;
  action: 'create_appointment' | 'create_invoice' | 'update_medical_record' | 'delete_medical_record' | 'checkout_pos' | 'update_stock' | 'add_inventory' | 'create_alert' | 'create_notification';
  collection: 'appointments' | 'invoices' | 'records' | 'inventory' | 'alerts' | 'notifications';
  payload: any;
  timestamp: string;
}
