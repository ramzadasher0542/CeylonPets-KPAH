/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * auth.ts — Supabase-backed authentication helpers
 * ---------------------------------------------------------------
 * Provides functions to fetch staff users and system configuration
 * from Supabase. Falls back to localStorage cache if offline.
 *
 * ⚠️  The PIN hashing algorithm and login logic remain in App.tsx
 *     unchanged. This file only handles data retrieval.
 */

import { supabase, DB_TABLES } from './supabase';
import { User } from '../types';
import { SystemConfig } from '../components/SystemSettings';

// ---------------------------------------------------------------
// Staff Users
// ---------------------------------------------------------------

/**
 * Fetch all dynamic staff users from Supabase.
 * Maps snake_case DB columns → camelCase TypeScript User interface.
 * Falls back to localStorage cache if the query fails (offline).
 */
export async function fetchStaffUsers(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.USERS)
      .select('id, name, username, role, avatar_color, pin')
      .order('name');

    if (error) throw error;

    if (!data || data.length === 0) return getCachedUsers();

    // Map snake_case columns → camelCase User interface
    const users: User[] = data.map((row: any) => ({
      id:          row.id,
      name:        row.name,
      username:    row.username,
      role:        row.role,
      avatarColor: row.avatar_color,
      pin:         row.pin ?? undefined,
    }));

    // Refresh the localStorage cache with fresh cloud data
    localStorage.setItem('ceylon_users_v2', JSON.stringify(users));
    return users;

  } catch (err) {
    console.warn('[CeylonPets] Supabase fetchStaffUsers failed, using localStorage cache:', err);
    return getCachedUsers();
  }
}

/**
 * Upsert a single user record to Supabase (used by Settings when
 * an admin adds or edits a staff member).
 */
export async function upsertStaffUser(user: User): Promise<void> {
  try {
    const { error } = await supabase
      .from(DB_TABLES.USERS)
      .upsert({
        id:           user.id,
        name:         user.name,
        username:     user.username,
        role:         user.role,
        avatar_color: user.avatarColor,
        pin:          user.pin ?? null,
      }, { onConflict: 'id' });

    if (error) throw error;
  } catch (err) {
    console.warn('[CeylonPets] Supabase upsertStaffUser failed (offline — changes saved locally):', err);
  }
}

/**
 * Delete a staff user from Supabase by ID.
 */
export async function deleteStaffUser(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from(DB_TABLES.USERS)
      .delete()
      .eq('id', userId);

    if (error) throw error;
  } catch (err) {
    console.warn('[CeylonPets] Supabase deleteStaffUser failed (offline):', err);
  }
}

// ---------------------------------------------------------------
// System Configuration
// ---------------------------------------------------------------

/**
 * Fetch the clinic system configuration from Supabase.
 * The config is stored as a single JSONB row (id = 1).
 * Falls back to localStorage if offline.
 */
export async function fetchSystemConfig(): Promise<SystemConfig | null> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.SYSTEM_CONFIG)
      .select('config')
      .eq('id', 1)
      .single();

    if (error) {
      // PGRST116 = row not found (table exists but no config row yet)
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    if (!data?.config) return null;

    // Refresh localStorage cache
    localStorage.setItem('ceylon_system_config_v2', JSON.stringify(data.config));
    return data.config as SystemConfig;

  } catch (err) {
    console.warn('[CeylonPets] Supabase fetchSystemConfig failed, using localStorage cache:', err);
    return getCachedSystemConfig();
  }
}

/**
 * Save the full system config object to Supabase (upsert row id=1).
 */
export async function upsertSystemConfig(config: SystemConfig): Promise<void> {
  try {
    const { error } = await supabase
      .from(DB_TABLES.SYSTEM_CONFIG)
      .upsert({ id: 1, config }, { onConflict: 'id' });

    if (error) throw error;
  } catch (err) {
    console.warn('[CeylonPets] Supabase upsertSystemConfig failed (offline — saved locally):', err);
  }
}

// ---------------------------------------------------------------
// Private localStorage fallback helpers
// ---------------------------------------------------------------

function getCachedUsers(): User[] {
  try {
    const raw = localStorage.getItem('ceylon_users_v2');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getCachedSystemConfig(): SystemConfig | null {
  try {
    const raw = localStorage.getItem('ceylon_system_config_v2');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
