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

let client;
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[CeylonPets] Missing Supabase environment variables.\n' +
    'Running in isolated local development mode. Cloud sync disabled.'
  );
  // Provide a robust mock offline client that absorbs chained calls
  const mockPromise = Promise.resolve({ data: null, error: { message: 'Offline mode' } });
  const createMockChain = () => {
    const chain: any = new Proxy(function() {}, {
      get: function(target, prop) {
        if (prop === 'then') return mockPromise.then.bind(mockPromise);
        if (prop === 'catch') return mockPromise.catch.bind(mockPromise);
        if (prop === 'finally') return mockPromise.finally.bind(mockPromise);
        return chain;
      },
      apply: function() {
        return chain;
      }
    });
    return chain;
  };

  client = {
    from: () => createMockChain(),
    channel: () => ({
      on: () => ({ subscribe: () => ({ unsubscribe: () => {} }) })
    }),
    storage: {
      from: () => ({
        upload: () => Promise.resolve({ data: null, error: { message: 'Offline mode' } }),
        getPublicUrl: () => ({ data: { publicUrl: '' } })
      })
    }
  } as any;
} else {
  client = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    }
  });
}

export const supabase = client;

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
