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

// Helper to hash a PIN synchronously using a custom salted polynomial hash
function hashPin(pin) {
  if (!pin) return '';
  const isPlaintext = /^\d{4}$/.test(pin);
  if (!isPlaintext) return pin;

  let hash = 5381;
  const salt = "CeylonPetsSecuritySalt";
  const combined = pin + salt;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash * 33) ^ combined.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

async function cleanAndSeed() {
  console.log('--- Reseller Production Starter Database Prep ---');

  // 1. Purge all dynamic customer table datasets
  const dynamicTables = [
    DB_TABLES.INVENTORY,
    DB_TABLES.APPOINTMENTS,
    DB_TABLES.RECORDS,
    DB_TABLES.INVOICES,
    DB_TABLES.NOTIFICATIONS,
    DB_TABLES.ALERTS
  ];

  for (const table of dynamicTables) {
    console.log(`Clearing transaction history in table: ${table}...`);
    const { error } = await supabase.from(table).delete().neq('id', '_non_existent_');
    if (error) console.error(`❌ Error clearing table ${table}:`, error.message);
  }

  // 2. Setup the dynamic staff users catalog with a single master administrative owner
  console.log('Resetting users catalog to clean system owner...');
  const { error: clearUsersErr } = await supabase.from(DB_TABLES.USERS).delete().neq('id', '_non_existent_');
  if (clearUsersErr) console.error('Failed to clear users table:', clearUsersErr.message);

  const { error: seedUsersErr } = await supabase.from(DB_TABLES.USERS).insert([
    {
      id: 'usr-owner',
      name: 'System Administrator',
      username: 'admin',
      role: 'owner',
      avatar_color: 'bg-indigo-600 text-white border-indigo-700',
      pin: hashPin('5692')
    }
  ]);
  if (seedUsersErr) console.error('❌ Failed to seed System Administrator account:', seedUsersErr.message);
  else console.log('✅ Successfully seeded dynamic Master System Owner account ("admin", PIN: 5692).');

  // 3. Reset the system config parameters to a clean starter state
  console.log('Resetting system configurations settings...');
  const { error: clearConfigErr } = await supabase.from(DB_TABLES.SYSTEM_CONFIG).delete().neq('id', 0);
  if (clearConfigErr) console.error('Failed to clear config table:', clearConfigErr.message);

  const { error: seedConfigErr } = await supabase.from(DB_TABLES.SYSTEM_CONFIG).insert([
    {
      id: 1,
      config: {
        appName: "CeylonPets",
        hospitalName: "Ceylon Pets Animal Hospital",
        resellerName: "ASH POINT SOLUTIONS",
        invoiceBranding: "Tablet Field Service Suite • Powered by ASH POINT SOLUTIONS",
        invoiceLogo: "🐾",
        invoiceFooterMessage: "Please pay upon discharge. Thank you for choosing CeylonPets!",
        invoiceSubFooterMessage: "* CEYLONPETS OFFICIAL RECEIPT *",
        masterPin: hashPin("5692"),
        dummyAdminPin: hashPin("7777"),
        cloudEndpoint: "https://vault.ashpointsolutions.lk/api/backup/client1",
        cloudBackupEnabled: true,
        rolePermissions: {
          cashier: ["pos"],
          veterinarian: ["dashboard", "appointments", "records"],
          admin: ["dashboard", "pos", "appointments", "records", "inventory", "reminders", "portal"]
        }
      }
    }
  ]);

  if (seedConfigErr) console.error('❌ Failed to seed default system configuration:', seedConfigErr.message);
  else console.log('✅ Successfully seeded clean system configurations settings.');

  console.log('Starter Seeding Pass Completed Successfully! Production database ready for launch.');
}

cleanAndSeed().catch(console.error);
