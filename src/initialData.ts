/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, InventoryItem, Appointment, MedicalRecord, ClientNotification, SystemAlert } from './types';

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Dr. Kandy Cruz, DVM',
    username: 'drkandy',
    role: 'owner',
    avatarColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'usr-2',
    name: 'Dr. Dave Assistant, DVM',
    username: 'drdave',
    role: 'veterinarian',
    avatarColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    id: 'usr-3',
    name: 'Samantha Pierce (Reception)',
    username: 'samantha',
    role: 'cashier',
    avatarColor: 'bg-amber-100 text-amber-800 border-amber-300'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  // Services
  { id: 'inv-1', sku: 'SV-001', name: 'General Medical Consultation', category: 'service', price: 45.00, cost: 0, stock: 9999, minStock: 0, unit: 'visit' },
  { id: 'inv-2', sku: 'SV-002', name: 'Rabies Vaccine Administration', category: 'vaccine', price: 25.00, cost: 8.00, stock: 153, minStock: 20, unit: 'dose' },
  { id: 'inv-3', sku: 'SV-003', name: 'DHPP Core Vaccine Shot', category: 'vaccine', price: 35.00, cost: 12.00, stock: 85, minStock: 15, unit: 'dose' },
  { id: 'inv-4', sku: 'SV-004', name: 'Complete Blood Count (CBC) Lab', category: 'lab_service', price: 65.00, cost: 15.00, stock: 50, minStock: 5, unit: 'test' },
  { id: 'inv-5', sku: 'SV-005', name: 'Dental Scaling & Polishing', category: 'service', price: 150.00, cost: 25.00, stock: 9999, minStock: 0, unit: 'session' },
  { id: 'inv-6', sku: 'SV-006', name: 'Spay & Neuter Surgery Package', category: 'service', price: 220.00, cost: 40.00, stock: 9999, minStock: 0, unit: 'surgery' },
  { id: 'inv-7', sku: 'SV-007', name: 'Diagnostic Abdomen X-Ray', category: 'lab_service', price: 110.00, cost: 5.00, stock: 9999, minStock: 0, unit: 'session' },

  // Medications
  { id: 'inv-8', sku: 'MD-001', name: 'Amoxicillin Trihydrate Drops 15ml', category: 'prescription', price: 18.50, cost: 6.20, stock: 45, minStock: 10, unit: 'vial' },
  { id: 'inv-9', sku: 'MD-002', name: 'Apoquel Flea Allergy 16mg (30 tabs)', category: 'prescription', price: 89.00, cost: 48.00, stock: 24, minStock: 5, unit: 'box' },
  { id: 'inv-10', sku: 'MD-003', name: 'Heartgard Plus Chewables Medium Dog', category: 'prescription', price: 54.00, cost: 28.50, stock: 32, minStock: 8, unit: 'box' },
  { id: 'inv-11', sku: 'MD-004', name: 'Carprofen Caplets 75mg Pain Relief', category: 'prescription', price: 42.00, cost: 20.00, stock: 3, minStock: 10, unit: 'bottle' }, // Trigger warning
  { id: 'inv-12', sku: 'MD-005', name: 'Otomax Ear Drops for Otitis', category: 'prescription', price: 29.90, cost: 12.40, stock: 20, minStock: 5, unit: 'bottle' },

  // Retail Items
  { id: 'inv-13', sku: 'RT-001', name: 'Royal Canin Vet Diet Gastrointestinal Dog 5kg', category: 'retail', price: 68.00, cost: 42.00, stock: 12, minStock: 4, unit: 'bag' },
  { id: 'inv-14', sku: 'RT-002', name: 'Royal Canin Urinary S/O Dry Cat Food 2.5kg', category: 'retail', price: 44.50, cost: 28.00, stock: 2, minStock: 5, unit: 'bag' }, // Trigger warning
  { id: 'inv-15', sku: 'RT-003', name: 'Premium Hypoallergenic Beef Jerky Treats', category: 'retail', price: 14.90, cost: 7.50, stock: 68, minStock: 15, unit: 'pack' },
  { id: 'inv-16', sku: 'RT-004', name: 'Snoozy Orthopedic Memory Foam Pet Bed', category: 'retail', price: 85.00, cost: 45.00, stock: 8, minStock: 2, unit: 'item' },
  { id: 'inv-17', sku: 'RT-005', name: 'Kandy Signature Soft Leather Dog Collar', category: 'retail', price: 19.50, cost: 8.00, stock: 25, minStock: 5, unit: 'item' },
  { id: 'inv-18', sku: 'RT-006', name: 'Whack-A-Mouse Cat Interactive Laser Toy', category: 'retail', price: 24.99, cost: 11.50, stock: 15, minStock: 4, unit: 'item' },
  { id: 'inv-19', sku: 'RT-007', name: 'Frontline Gold Spot-On Flea Treatment Cat', category: 'retail', price: 58.00, cost: 35.00, stock: 18, minStock: 5, unit: 'pack' }
];

export const INITIAL_APPOINTMENTS: Appointment[] = [
  {
    id: 'apt-1',
    petName: 'Coco',
    petType: 'Dog',
    breed: 'Goldendoodle',
    ownerName: 'Isabella Bennett',
    ownerPhone: '+1 (555) 781-4200',
    ownerEmail: 'isabella.b@example.com',
    date: '2026-05-22',
    time: '09:00',
    veterinarian: 'Dr. Kandy Cruz, DVM',
    reason: 'Annual Vaccination and Dental checkup',
    status: 'booked'
  },
  {
    id: 'apt-2',
    petName: 'Whiskers',
    petType: 'Cat',
    breed: 'Siamese Mix',
    ownerName: 'James Chen',
    ownerPhone: '+1 (555) 304-9182',
    ownerEmail: 'j.chen99@example.com',
    date: '2026-05-22',
    time: '10:30',
    veterinarian: 'Dr. Dave Assistant, DVM',
    reason: 'Ear infection consult & drops follow-up',
    status: 'in-progress'
  },
  {
    id: 'apt-3',
    petName: 'Buster',
    petType: 'Dog',
    breed: 'Beagle',
    ownerName: 'Robert Vance',
    ownerPhone: '+1 (555) 923-4567',
    ownerEmail: 'vance@refrigeration.com',
    date: '2026-05-21',
    time: '14:00',
    veterinarian: 'Dr. Kandy Cruz, DVM',
    reason: 'Surgical recovery stitch removal & pain check',
    status: 'completed'
  },
  {
    id: 'apt-4',
    petName: 'Mochi',
    petType: 'Rabbit',
    breed: 'Holland Lop',
    ownerName: 'Sarah Gomez',
    ownerPhone: '+1 (555) 123-9876',
    ownerEmail: 'sarahg@example.com',
    date: '2026-05-22',
    time: '15:15',
    veterinarian: 'Dr. Dave Assistant, DVM',
    reason: 'Gastrointestinal check-up & general lethargy',
    status: 'booked'
  },
  {
    id: 'apt-5',
    petName: 'Bella',
    petType: 'Dog',
    breed: 'French Bulldog',
    ownerName: 'Michael Scott',
    ownerPhone: '+1 (555) 472-8321',
    ownerEmail: 'michael.scott@dundermifflin.com',
    date: '2026-05-21',
    time: '11:00',
    veterinarian: 'Dr. Kandy Cruz, DVM',
    reason: 'Flea allergy dermatitis review and Apoquel refills',
    status: 'completed'
  }
];

export const INITIAL_MEDICAL_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-1',
    patientId: 'Coco_5557814200',
    petName: 'Coco',
    petType: 'Dog',
    breed: 'Goldendoodle',
    age: '2 Years',
    weight: 23.4,
    ownerName: 'Isabella Bennett',
    ownerPhone: '+1 (555) 781-4200',
    ownerEmail: 'isabella.b@example.com',
    visitDate: '2026-03-15',
    symptoms: 'Mild tartaring on incisors, owner requests routine scale.',
    diagnosis: 'Mild gingivitis without periodontal pocketing.',
    treatmentNotes: 'Booked dental scaling under anesthesia. Scheduled for next visit.',
    prescribedMeds: [],
    vaccinations: [
      { itemId: 'inv-2', name: 'Rabies (3-Year)', price: 25.00, billed: true, dateAdministered: '2025-05-15', nextDueDate: '2028-05-15', status: 'active' },
      { itemId: 'inv-3', name: 'DHPP Parvovirus', price: 35.00, billed: true, dateAdministered: '2025-05-15', nextDueDate: '2026-05-15', status: 'overdue' }, // Trigger warning
      { itemId: 'mock-1', name: 'Bordetella Kennel Cough', price: 20.00, billed: true, dateAdministered: '2025-11-20', nextDueDate: '2026-11-20', status: 'active' }
    ],
    labResults: [
      { id: 'lab-1', testName: 'Fecal Flotation Parasite Scan', requestDate: '2026-03-15', resultDate: '2026-03-15', status: 'completed', value: 'Negative', referenceRange: 'Negative', notes: 'No cysts or ova seen.' }
    ],
    createdDate: '2026-03-15'
  },
  {
    id: 'rec-2',
    patientId: 'Whiskers_5553049182',
    petName: 'Whiskers',
    petType: 'Cat',
    breed: 'Siamese Mix',
    age: '7 Years',
    weight: 4.8,
    ownerName: 'James Chen',
    ownerPhone: '+1 (555) 304-9182',
    ownerEmail: 'j.chen99@example.com',
    visitDate: '2026-05-22',
    symptoms: 'Frequent head shaking, scratching at right ear, red discharge.',
    diagnosis: 'Otitis externa (fungal/yeast infection)',
    treatmentNotes: 'Cleaned ear canal carefully. Administered first doses of medication.',
    prescribedMeds: [
      { itemId: 'inv-12', name: 'Otomax Ear Drops for Otitis', dosage: '4 drops twice daily into right ear canal', quantity: 1 }
    ],
    vaccinations: [
      { itemId: 'mock-2', name: 'FVRCP Cat Respiratory Trio', price: 30.00, billed: true, dateAdministered: '2025-08-20', nextDueDate: '2026-08-20', status: 'active' },
      { itemId: 'mock-3', name: 'Feline Leukemia (FeLV)', price: 28.00, billed: true, dateAdministered: '2025-08-20', nextDueDate: '2026-08-20', status: 'active' }
    ],
    labResults: [
      { id: 'lab-2', testName: 'Ear Swab Cytology Screen', requestDate: '2026-05-22', resultDate: '2026-05-22', status: 'completed', value: 'High Malassezia Spores (Yeast)', referenceRange: 'None to Light Genus', notes: 'Confirming high yeast infection count.' }
    ],
    createdDate: '2026-05-22'
  },
  {
    id: 'rec-3',
    patientId: 'Bella_5554728321',
    petName: 'Bella',
    petType: 'Dog',
    breed: 'French Bulldog',
    age: '3 Years',
    weight: 11.2,
    ownerName: 'Michael Scott',
    ownerPhone: '+1 (555) 472-8321',
    ownerEmail: 'michael.scott@dundermifflin.com',
    visitDate: '2026-05-21',
    symptoms: 'Pruritus (severe scratching), erythematous patches on paws & underbelly.',
    diagnosis: 'Atopic flea allergy dermatitis flare.',
    treatmentNotes: 'Prescribed Apoquel for systemic pruritus control. Advised high-grade topical flea preventatives.',
    prescribedMeds: [
      { itemId: 'inv-9', name: 'Apoquel Flea Allergy 16mg (30 tabs)', dosage: '1 tablet daily for 30 days', quantity: 1 }
    ],
    vaccinations: [
      { itemId: 'inv-2', name: 'Rabies (3-Year)', price: 25.00, billed: true, dateAdministered: '2024-04-12', nextDueDate: '2027-04-12', status: 'active' },
      { itemId: 'inv-3', name: 'DHPP Parvovirus', price: 35.00, billed: true, dateAdministered: '2026-05-21', nextDueDate: '2027-05-21', status: 'active' }
    ],
    labResults: [],
    createdDate: '2026-05-21'
  }
];

export const INITIAL_NOTIFICATIONS: ClientNotification[] = [
  {
    id: 'not-1',
    petName: 'Coco',
    ownerName: 'Isabella Bennett',
    recipient: 'isabella.b@example.com',
    type: 'appointment_reminder',
    channel: 'email',
    message: 'Friendly reminder: Coco has an appointment at Kandy Animal Pet Hospital on 2026-05-22 at 09:00 for: Annual Vaccination and Dental checkup.',
    scheduledTime: '2026-05-21',
    status: 'sent'
  },
  {
    id: 'not-2',
    petName: 'Coco',
    ownerName: 'Isabella Bennett',
    recipient: '+1 (555) 781-4200',
    type: 'vaccine_alert',
    channel: 'sms',
    message: 'URGENT ALERT: Cocos DHPP Parvovirus vaccination is currently OVERDUE. Please bring Coco in or contact us to arrange. - Kandy Pet Hospital',
    scheduledTime: '2026-05-21',
    status: 'sent'
  },
  {
    id: 'not-3',
    petName: 'Mochi',
    ownerName: 'Sarah Gomez',
    recipient: '+1 (555) 123-9876',
    type: 'appointment_reminder',
    channel: 'sms',
    message: 'Hi Sarah, Mochis appointment with Dr. Dave is tomorrow at 15:15. Reply YES to confirm or CALL to reschedule.',
    scheduledTime: '2026-05-21',
    status: 'queued'
  }
];

export const INITIAL_ALERTS: SystemAlert[] = [
  {
    id: 'al-1',
    severity: 'urgent',
    category: 'inventory',
    message: 'CRITICAL INVENTORY ALERT: Carprofen Caplets (MD-004) has fallen below minimum safety stock! Only 3 left (Min: 10).',
    timestamp: '2026-05-21T18:30:00Z',
    read: false
  },
  {
    id: 'al-2',
    severity: 'warning',
    category: 'inventory',
    message: 'Low Stock Notification: Royal Canin Urinary S/O Cat Food (RT-002) is running low. Total stock: 2 bags.',
    timestamp: '2026-05-21T20:15:00Z',
    read: false
  },
  {
    id: 'al-3',
    severity: 'info',
    category: 'system',
    message: 'API Sync Completed: Successfully fully backed up 14 diagnostic items to Cloud EHR system.',
    timestamp: '2026-05-21T21:00:00Z',
    read: true
  }
];
