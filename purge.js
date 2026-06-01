// c:\Users\USER\Downloads\kandy-vetcare\purge.js
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
  INVENTORY:     'inventory',
  APPOINTMENTS:  'appointments',
  RECORDS:       'medical_records',
  INVOICES:      'invoices',
  NOTIFICATIONS: 'notifications',
  ALERTS:        'system_alerts',
};

async function purgeAllTables() {
  console.log('--- Purging CeylonPets History & Stock Databases ---');
  
  for (const [key, tableName] of Object.entries(DB_TABLES)) {
    console.log(`Purging table: ${tableName}...`);
    
    const { error } = await supabase
      .from(tableName)
      .delete()
      .neq('id', '_non_existent_');
      
    if (error) {
      console.error(`❌ Failed to purge table ${tableName}:`, error.message);
    } else {
      console.log(`✅ Table "${tableName}" successfully cleared of all dynamic data.`);
    }
  }
  
  console.log('Database Purge Complete! Users and System Configuration have been preserved.');
}

purgeAllTables().catch(console.error);
