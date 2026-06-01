/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase Client Configuration
 * ---------------------------------------------------------------
 * Initializes and exports the Supabase client singleton used across
 * the entire CeylonPets application.
 *
 * Environment variables are loaded from .env.local by Vite:
 *   VITE_SUPABASE_URL      → Your Supabase project URL
 *   VITE_SUPABASE_ANON_KEY → Your Supabase public anon key
 */
/// <reference types="vite/client" />

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[CeylonPets] Missing Supabase environment variables.\n' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---------------------------------------------------------------
// Database Table Name Constants
// Centralised here so renaming a table only requires one change.
// ---------------------------------------------------------------
export const DB_TABLES = {
  USERS:         'users',
  SYSTEM_CONFIG: 'system_config',
  INVENTORY:     'inventory',
  APPOINTMENTS:  'appointments',
  RECORDS:       'medical_records',
  INVOICES:      'invoices',
  NOTIFICATIONS: 'notifications',
  ALERTS:        'system_alerts',
} as const;

/**
 * Uploads a file to the Supabase 'assets' storage bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadImageToStorage(file: File, path: string): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${path}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  
  const { data, error } = await supabase.storage
    .from('assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    });

  if (error) {
    console.error('Supabase storage upload error:', error);
    throw error;
  }

  const { data: { publicUrl } } = supabase.storage
    .from('assets')
    .getPublicUrl(data.path);

  return publicUrl;
}
