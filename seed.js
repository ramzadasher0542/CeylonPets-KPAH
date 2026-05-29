// c:\Users\USER\Downloads\kandy-vetcare\seed.js
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
for (const k in envConfig) {
  process.env[k] = envConfig[k];
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DB_TABLES = {
  USERS:         'users',
  SYSTEM_CONFIG: 'system_config',
  INVENTORY:     'inventory',
  APPOINTMENTS:  'appointments',
  RECORDS:       'medical_records',
  INVOICES:      'invoices',
  NOTIFICATIONS: 'notifications',
  ALERTS:        'system_alerts',
};

// Raw initial data matching initialData.ts
const INITIAL_INVENTORY = [
  { id: 'inv-1', sku: 'SV-001', name: 'General Medical Consultation', category: 'service', price: 45.00, cost: 0, stock: 9999, min_stock: 0, unit: 'visit' },
  { id: 'inv-2', sku: 'SV-002', name: 'Rabies Vaccine Administration', category: 'service', price: 25.00, cost: 8.00, stock: 153, min_stock: 20, unit: 'dose' },
  { id: 'inv-3', sku: 'SV-003', name: 'DHPP Core Vaccine Shot', category: 'service', price: 35.00, cost: 12.00, stock: 85, min_stock: 15, unit: 'dose' },
  { id: 'inv-4', sku: 'SV-004', name: 'Complete Blood Count (CBC) Lab', category: 'service', price: 65.00, cost: 15.00, stock: 50, min_stock: 5, unit: 'test' },
  { id: 'inv-5', sku: 'SV-005', name: 'Dental Scaling & Polishing', category: 'service', price: 150.00, cost: 25.00, stock: 9999, min_stock: 0, unit: 'session' },
  { id: 'inv-6', sku: 'SV-006', name: 'Spay & Neuter Surgery Package', category: 'service', price: 220.00, cost: 40.00, stock: 9999, min_stock: 0, unit: 'surgery' },
  { id: 'inv-7', sku: 'SV-007', name: 'Diagnostic Abdomen X-Ray', category: 'service', price: 110.00, cost: 5.00, stock: 9999, min_stock: 0, unit: 'session' },
  { id: 'inv-8', sku: 'MD-001', name: 'Amoxicillin Trihydrate Drops 15ml', category: 'medication', price: 18.50, cost: 6.20, stock: 45, min_stock: 10, unit: 'vial' },
  { id: 'inv-9', sku: 'MD-002', name: 'Apoquel Flea Allergy 16mg (30 tabs)', category: 'medication', price: 89.00, cost: 48.00, stock: 24, min_stock: 5, unit: 'box' },
  { id: 'inv-10', sku: 'MD-003', name: 'Heartgard Plus Chewables Medium Dog', category: 'medication', price: 54.00, cost: 28.50, stock: 32, min_stock: 8, unit: 'box' },
  { id: 'inv-11', sku: 'MD-004', name: 'Carprofen Caplets 75mg Pain Relief', category: 'medication', price: 42.00, cost: 20.00, stock: 3, min_stock: 10, unit: 'bottle' },
  { id: 'inv-12', sku: 'MD-005', name: 'Otomax Ear Drops for Otitis', category: 'medication', price: 29.90, cost: 12.40, stock: 20, min_stock: 5, unit: 'bottle' },
  { id: 'inv-13', sku: 'RT-001', name: 'Royal Canin Vet Diet Gastrointestinal Dog 5kg', category: 'retail', price: 68.00, cost: 42.00, stock: 12, min_stock: 4, unit: 'bag' },
  { id: 'inv-14', sku: 'RT-002', name: 'Royal Canin Urinary S/O Dry Cat Food 2.5kg', category: 'retail', price: 44.50, cost: 28.00, stock: 2, min_stock: 5, unit: 'bag' },
  { id: 'inv-15', sku: 'RT-003', name: 'Premium Hypoallergenic Beef Jerky Treats', category: 'retail', price: 14.90, cost: 7.50, stock: 68, min_stock: 15, unit: 'pack' },
  { id: 'inv-16', sku: 'RT-004', name: 'Snoozy Orthopedic Memory Foam Pet Bed', category: 'retail', price: 85.00, cost: 45.00, stock: 8, min_stock: 2, unit: 'item' },
  { id: 'inv-17', sku: 'RT-005', name: 'Kandy Signature Soft Leather Dog Collar', category: 'retail', price: 19.50, cost: 8.00, stock: 25, min_stock: 5, unit: 'item' },
  { id: 'inv-18', sku: 'RT-006', name: 'Whack-A-Mouse Cat Interactive Laser Toy', category: 'retail', price: 24.99, cost: 11.50, stock: 15, min_stock: 4, unit: 'item' },
  { id: 'inv-19', sku: 'RT-007', name: 'Frontline Gold Spot-On Flea Treatment Cat', category: 'retail', price: 58.00, cost: 35.00, stock: 18, min_stock: 5, unit: 'pack' }
];

const INITIAL_APPOINTMENTS = [
  {
    id: 'apt-1',
    pet_name: 'Coco',
    pet_type: 'Dog',
    breed: 'Goldendoodle',
    owner_name: 'Isabella Bennett',
    owner_phone: '+1 (555) 781-4200',
    owner_email: 'isabella.b@example.com',
    date: '2026-05-22',
    time: '09:00',
    veterinarian: 'Dr. Kandy Cruz, DVM',
    reason: 'Annual Vaccination and Dental checkup',
    status: 'booked'
  },
  {
    id: 'apt-2',
    pet_name: 'Whiskers',
    pet_type: 'Cat',
    breed: 'Siamese Mix',
    owner_name: 'James Chen',
    owner_phone: '+1 (555) 304-9182',
    owner_email: 'j.chen99@example.com',
    date: '2026-05-22',
    time: '10:30',
    veterinarian: 'Dr. Dave Assistant, DVM',
    reason: 'Ear infection consult & drops follow-up',
    status: 'in-progress'
  },
  {
    id: 'apt-3',
    pet_name: 'Buster',
    pet_type: 'Dog',
    breed: 'Beagle',
    owner_name: 'Robert Vance',
    owner_phone: '+1 (555) 923-4567',
    owner_email: 'vance@refrigeration.com',
    date: '2026-05-21',
    time: '14:00',
    veterinarian: 'Dr. Kandy Cruz, DVM',
    reason: 'Surgical recovery stitch removal & pain check',
    status: 'completed'
  },
  {
    id: 'apt-4',
    pet_name: 'Mochi',
    pet_type: 'Rabbit',
    breed: 'Holland Lop',
    owner_name: 'Sarah Gomez',
    owner_phone: '+1 (555) 123-9876',
    owner_email: 'sarahg@example.com',
    date: '2026-05-22',
    time: '15:15',
    veterinarian: 'Dr. Dave Assistant, DVM',
    reason: 'Gastrointestinal check-up & general lethargy',
    status: 'booked'
  },
  {
    id: 'apt-5',
    pet_name: 'Bella',
    pet_type: 'Dog',
    breed: 'French Bulldog',
    owner_name: 'Michael Scott',
    owner_phone: '+1 (555) 472-8321',
    owner_email: 'michael.scott@dundermifflin.com',
    date: '2026-05-21',
    time: '11:00',
    veterinarian: 'Dr. Kandy Cruz, DVM',
    reason: 'Flea allergy dermatitis review and Apoquel refills',
    status: 'completed'
  }
];

const INITIAL_MEDICAL_RECORDS = [
  {
    id: 'rec-1',
    patient_id: 'Coco_5557814200',
    pet_name: 'Coco',
    owner_phone: '+1 (555) 781-4200',
    visit_date: '2026-03-15',
    data: {
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
        { name: 'Rabies (3-Year)', dateAdministered: '2025-05-15', nextDueDate: '2028-05-15', status: 'active' },
        { name: 'DHPP Parvovirus', dateAdministered: '2025-05-15', nextDueDate: '2026-05-15', status: 'overdue' },
        { name: 'Bordetella Kennel Cough', dateAdministered: '2025-11-20', nextDueDate: '2026-11-20', status: 'active' }
      ],
      labResults: [
        { id: 'lab-1', testName: 'Fecal Flotation Parasite Scan', requestDate: '2026-03-15', resultDate: '2026-03-15', status: 'completed', value: 'Negative', referenceRange: 'Negative', notes: 'No cysts or ova seen.' }
      ],
      createdDate: '2026-03-15'
    }
  },
  {
    id: 'rec-2',
    patient_id: 'Whiskers_5553049182',
    pet_name: 'Whiskers',
    owner_phone: '+1 (555) 304-9182',
    visit_date: '2026-05-22',
    data: {
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
        { name: 'FVRCP Cat Respiratory Trio', dateAdministered: '2025-08-20', nextDueDate: '2026-08-20', status: 'active' },
        { name: 'Feline Leukemia (FeLV)', dateAdministered: '2025-08-20', nextDueDate: '2026-08-20', status: 'active' }
      ],
      labResults: [
        { id: 'lab-2', testName: 'Ear Swab Cytology Screen', requestDate: '2026-05-22', resultDate: '2026-05-22', status: 'completed', value: 'High Malassezia Spores (Yeast)', referenceRange: 'None to Light Genus', notes: 'Confirming high yeast infection count.' }
      ],
      createdDate: '2026-05-22'
    }
  }
];

async function checkAndSeed() {
  console.log('--- Supabase Seeding Script ---');

  for (const [key, tableName] of Object.entries(DB_TABLES)) {
    console.log(`Checking table: ${tableName}...`);
    const { data, error } = await supabase.from(tableName).select('*').limit(1);

    if (error) {
      if (error.code === 'PGRST116' || error.status === 404 || error.message.includes('does not exist')) {
        console.warn(`⚠️ Table "${tableName}" does not exist yet (REST 404/PGRST116).`);
      } else {
        console.error(`❌ Error querying table "${tableName}":`, error.message, error.code);
      }
      continue;
    }

    console.log(`✅ Table "${tableName}" exists.`);
    
    // Seed tables if empty
    if (tableName === 'users') {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
      if (count === 0) {
        console.log(`Seeding users...`);
        const { error: seedErr } = await supabase.from(tableName).insert([
          { id: 'usr-1', name: 'Dr. Kandy Cruz, DVM', username: 'drkandy', role: 'admin', avatar_color: 'bg-emerald-100 text-emerald-800 border-emerald-300', pin: 'b85e6b5a' },
          { id: 'usr-2', name: 'Dr. Dave Assistant, DVM', username: 'drdave', role: 'veterinarian', avatar_color: 'bg-blue-100 text-blue-800 border-blue-300', pin: 'c7a3f912' },
          { id: 'usr-3', name: 'Samantha Pierce (Reception)', username: 'samantha', role: 'cashier', avatar_color: 'bg-amber-100 text-amber-800 border-amber-300', pin: 'd4f8a021' }
        ]);
        if (seedErr) console.error('Failed to seed users:', seedErr);
        else console.log('Successfully seeded users!');
      } else {
        console.log('users table already contains data. Skipping seed.');
      }
    } else if (tableName === 'inventory') {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
      if (count === 0) {
        console.log(`Seeding inventory...`);
        const { error: seedErr } = await supabase.from(tableName).insert(INITIAL_INVENTORY);
        if (seedErr) console.error('Failed to seed inventory:', seedErr);
        else console.log('Successfully seeded inventory!');
      } else {
        console.log('inventory table already contains data. Skipping seed.');
      }
    } else if (tableName === 'appointments') {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
      if (count === 0) {
        console.log(`Seeding appointments...`);
        const { error: seedErr } = await supabase.from(tableName).insert(INITIAL_APPOINTMENTS);
        if (seedErr) console.error('Failed to seed appointments:', seedErr);
        else console.log('Successfully seeded appointments!');
      } else {
        console.log('appointments table already contains data. Skipping seed.');
      }
    } else if (tableName === 'medical_records') {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
      if (count === 0) {
        console.log(`Seeding medical records...`);
        const { error: seedErr } = await supabase.from(tableName).insert(INITIAL_MEDICAL_RECORDS);
        if (seedErr) console.error('Failed to seed medical records:', seedErr);
        else console.log('Successfully seeded medical records!');
      } else {
        console.log('medical_records table already contains data. Skipping seed.');
      }
    } else if (tableName === 'system_config') {
      const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
      if (count === 0) {
        console.log(`Seeding system config...`);
        // Seed default config
        const { error: seedErr } = await supabase.from(tableName).insert([
          {
            id: 1,
            config: {
              appName: "CeylonPets",
              hospitalName: "Ceylon Pets Animal Hospital",
              resellerName: "ASH POINT SOLUTIONS",
              invoiceBranding: "Tablet Field Service Suite • Powered by ASH POINT SOLUTIONS",
              invoiceLogo: "🐾",
              masterPin: "5692",
              dummyAdminPin: "7777",
              cloudEndpoint: "https://vault.ashpointsolutions.lk/api/backup/client1",
              rolePermissions: {
                cashier: ["pos"],
                veterinarian: ["dashboard", "appointments", "records"],
                admin: ["dashboard", "pos", "appointments", "records", "inventory", "reminders", "portal"]
              }
            }
          }
        ]);
        if (seedErr) console.error('Failed to seed system config:', seedErr);
        else console.log('Successfully seeded system config!');
      } else {
        console.log('system_config table already contains data. Skipping seed.');
      }
    }
  }
}

checkAndSeed().catch(console.error);
