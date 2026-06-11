/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * db.ts — Supabase data access layer for all clinic collections
 * ---------------------------------------------------------------
 * Provides fetch + upsert functions for every data collection.
 * Each fetch tries Supabase first; falls back to localStorage cache.
 * Each upsert writes to Supabase (best-effort) and always keeps
 * the localStorage cache in sync for offline resilience.
 */

import { supabase, DB_TABLES } from './supabase';
import {
  InventoryItem,
  Appointment,
  MedicalRecord,
  Invoice,
  ClientNotification,
  User,
  SystemAlert
} from '../types';

// ---------------------------------------------------------------
// Generic upsert/delete helpers
// ---------------------------------------------------------------

async function supabaseUpsert(table: string, row: object, conflictCol = 'id'): Promise<void> {
  const { error } = await supabase
    .from(table)
    .upsert(row, { onConflict: conflictCol });
  if (error) throw error;
}

async function supabaseDelete(table: string, id: string): Promise<void> {
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id);
  if (error) throw error;
}

function safeCache<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------
// INVENTORY
// ---------------------------------------------------------------

export async function fetchInventory(): Promise<InventoryItem[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.INVENTORY)
      .select('id, sku, name, category, price, cost, stock, min_stock, unit, location')
      .order('name');

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_inventory_v2', JSON.stringify([]));
      return [];
    }

    const items: InventoryItem[] = data.map((row: any) => ({
      id:       row.id,
      sku:      row.sku,
      name:     row.name,
      category: row.category,
      price:    Number(row.price),
      cost:     Number(row.cost),
      stock:    Number(row.stock),
      minStock: Number(row.min_stock),
      unit:     row.unit,
      location: row.location ?? undefined,
    }));

    localStorage.setItem('ceylon_inventory_v2', JSON.stringify(items));
    return items;

  } catch (err) {
    console.warn('[CeylonPets] fetchInventory offline — using cache:', err);
    return safeCache('ceylon_inventory_v2', []);
  }
}

export async function upsertInventoryItem(item: InventoryItem): Promise<void> {
  try {
    const payload = {
      id:        item.id,
      sku:       item.sku,
      name:      item.name,
      category:  item.category,
      price:     item.price,
      cost:      item.cost,
      stock:     item.stock,
      min_stock: item.minStock,
      unit:      item.unit,
      location:  item.location ?? null,
    };

    if (payload.category === 'lab_service' || payload.category === 'service') { 
      payload.stock = 0; 
      payload.min_stock = 0; 
    }

    await supabaseUpsert(DB_TABLES.INVENTORY, payload);
  } catch (err) {
    console.warn('[CeylonPets] upsertInventoryItem offline:', err);
    throw err;
  }
}

export async function deleteInventoryItem(id: string): Promise<void> {
  try {
    await supabaseDelete(DB_TABLES.INVENTORY, id);
  } catch (err) {
    console.warn('[CeylonPets] deleteInventoryItem offline:', err);
    throw err;
  }
}

export async function updateInventoryStockCAS(itemId: string, newStock: number, expectedStock: number): Promise<void> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.INVENTORY)
      .update({ stock: newStock })
      .eq('id', itemId)
      .eq('stock', expectedStock)
      .select('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('CAS_MISMATCH');
    }
  } catch (err) {
    console.warn('[CeylonPets] updateInventoryStockCAS failed:', err);
    throw err;
  }
}

// ---------------------------------------------------------------
// APPOINTMENTS
// ---------------------------------------------------------------

export async function fetchAppointments(): Promise<Appointment[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.APPOINTMENTS)
      .select('id, pet_name, pet_type, breed, owner_name, owner_phone, owner_email, date, time, veterinarian, reason, status')
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_appointments_v2', JSON.stringify([]));
      return [];
    }

    const apts: Appointment[] = data.map((row: any) => ({
      id:          row.id,
      petName:     row.pet_name,
      petType:     row.pet_type,
      breed:       row.breed ?? '',
      ownerName:   row.owner_name,
      ownerPhone:  row.owner_phone,
      ownerEmail:  row.owner_email ?? '',
      date:        row.date,
      time:        row.time,
      veterinarian:row.veterinarian ?? '',
      reason:      row.reason ?? '',
      status:      row.status,
    }));

    localStorage.setItem('ceylon_appointments_v2', JSON.stringify(apts));
    return apts;

  } catch (err) {
    console.warn('[CeylonPets] fetchAppointments offline — using cache:', err);
    return safeCache('ceylon_appointments_v2', []);
  }
}

export async function upsertAppointment(apt: Appointment): Promise<void> {
  try {
    await supabaseUpsert(DB_TABLES.APPOINTMENTS, {
      id:           apt.id,
      pet_name:     apt.petName,
      pet_type:     apt.petType,
      breed:        apt.breed,
      owner_name:   apt.ownerName,
      owner_phone:  apt.ownerPhone,
      owner_email:  apt.ownerEmail,
      date:         apt.date,
      time:         apt.time,
      veterinarian: apt.veterinarian,
      reason:       apt.reason,
      status:       apt.status,
    });
  } catch (err) {
    console.warn('[CeylonPets] upsertAppointment offline:', err);
    throw err;
  }
}

export async function fetchVeterinarians(): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.USERS)
      .select('id, name, username, role, avatar_color, pin')
      .in('role', ['veterinarian', 'admin'])
      .order('name');

    if (error) throw error;
    if (!data) return [];

    return data.map((row: any) => ({
      id:          row.id,
      name:        row.name,
      username:    row.username,
      role:        row.role,
      avatarColor: row.avatar_color,
      pin:         row.pin ?? undefined,
    }));
  } catch (err) {
    console.error('[CeylonPets] Failed to fetch veterinarians:', err);
    return [];
  }
}

// ---------------------------------------------------------------
// MEDICAL RECORDS
// ---------------------------------------------------------------

export async function fetchMedicalRecords(): Promise<MedicalRecord[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.RECORDS)
      .select('id, patient_id, pet_name, owner_phone, visit_date, attending_vet, data')
      .order('visit_date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_records_v2', JSON.stringify([]));
      return [];
    }

    // Full record is stored in the `data` JSONB column
    const records: MedicalRecord[] = data.map((row: any) => {
      const rec = row.data as MedicalRecord;
      if (row.attending_vet && !rec.attendingVet) {
        rec.attendingVet = row.attending_vet;
      }
      return rec;
    });

    localStorage.setItem('ceylon_records_v2', JSON.stringify(records));
    return records;

  } catch (err) {
    console.warn('[CeylonPets] fetchMedicalRecords offline — using cache:', err);
    return safeCache('ceylon_records_v2', []);
  }
}

export async function upsertMedicalRecord(rec: MedicalRecord): Promise<void> {
  try {
    await supabaseUpsert(DB_TABLES.RECORDS, {
      id:            rec.id,
      patient_id:    rec.patientId,
      pet_name:      rec.petName,
      owner_phone:   rec.ownerPhone,
      visit_date:    rec.visitDate,
      attending_vet: rec.attendingVet ?? null,
      data:          rec,   // full object stored as JSONB
    });
  } catch (err) {
    console.warn('[CeylonPets] upsertMedicalRecord offline:', err);
    throw err;
  }
}

export async function deleteMedicalRecord(id: string): Promise<void> {
  try {
    await supabaseDelete(DB_TABLES.RECORDS, id);
  } catch (err) {
    console.warn('[CeylonPets] deleteMedicalRecord offline:', err);
    throw err;
  }
}

// ---------------------------------------------------------------
// INVOICES
// ---------------------------------------------------------------

export async function fetchInvoices(): Promise<Invoice[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.INVOICES)
      .select('id, pet_name, owner_name, date, sales_total, payment_status, status, data')
      .neq('payment_status', 'void')
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_invoices_v2', JSON.stringify([]));
      return [];
    }

    const invoices: Invoice[] = data.map((row: any) => {
      const inv = row.data as any;
      if (inv.sales_total === undefined) {
        inv.sales_total = inv.total ?? row.sales_total ?? 0;
        delete inv.total;
      }
      if (row.status && row.status !== inv.paymentStatus) {
        inv.paymentStatus = row.status as any;
      }
      return inv as Invoice;
    });

    localStorage.setItem('ceylon_invoices_v2', JSON.stringify(invoices));
    return invoices;

  } catch (err) {
    console.warn('[CeylonPets] fetchInvoices offline — using cache:', err);
    return safeCache('ceylon_invoices_v2', []);
  }
}

export async function upsertInvoice(inv: Invoice): Promise<void> {
  try {
    await supabaseUpsert(DB_TABLES.INVOICES, {
      id:             inv.id,
      pet_name:       inv.petName,
      owner_name:     inv.ownerName,
      date:           inv.date,
      sales_total:    inv.sales_total,
      profit:         inv.profit || 0,
      cogs:           inv.cogs || 0,
      status:         inv.paymentStatus,
      payment_status: inv.paymentStatus,
      payment_method: inv.paymentMethod,
      shift_id:       inv.shiftId,
      data:           inv,   // full object stored as JSONB
    });

    if (inv.appointmentId) {
      const { error } = await supabase
        .from(DB_TABLES.APPOINTMENTS)
        .update({ status: 'completed' })
        .eq('id', inv.appointmentId);
      
      if (error) {
        console.error('[CeylonPets] Failed to cascade appointment resolution:', error);
      }
    }
  } catch (err) {
    console.warn('[CeylonPets] upsertInvoice offline:', err);
    throw err;
  }
}

// ---------------------------------------------------------------
// NOTIFICATIONS
// ---------------------------------------------------------------

export async function fetchNotifications(): Promise<ClientNotification[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.NOTIFICATIONS)
      .select('id, data')
      .order('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_notifications_v2', JSON.stringify([]));
      return [];
    }

    const notifs: ClientNotification[] = data.map((row: any) => row.data as ClientNotification);
    localStorage.setItem('ceylon_notifications_v2', JSON.stringify(notifs));
    return notifs;

  } catch (err) {
    console.warn('[CeylonPets] fetchNotifications offline — using cache:', err);
    return safeCache('ceylon_notifications_v2', []);
  }
}

export async function upsertNotification(notif: ClientNotification): Promise<void> {
  try {
    await supabaseUpsert(DB_TABLES.NOTIFICATIONS, { id: notif.id, data: notif });
  } catch (err) {
    console.warn('[CeylonPets] upsertNotification offline:', err);
    throw err;
  }
}

// ---------------------------------------------------------------
// SYSTEM ALERTS
// ---------------------------------------------------------------

export async function fetchAlerts(): Promise<SystemAlert[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.ALERTS)
      .select('id, data')
      .order('id');

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_alerts_v2', JSON.stringify([]));
      return [];
    }

    const alerts: SystemAlert[] = data.map((row: any) => row.data as SystemAlert);
    localStorage.setItem('ceylon_alerts_v2', JSON.stringify(alerts));
    return alerts;

  } catch (err) {
    console.warn('[CeylonPets] fetchAlerts offline — using cache:', err);
    return safeCache('ceylon_alerts_v2', []);
  }
}

export async function upsertAlert(alert: SystemAlert): Promise<void> {
  try {
    await supabaseUpsert(DB_TABLES.ALERTS, { id: alert.id, data: alert });
  } catch (err) {
    console.warn('[CeylonPets] upsertAlert offline:', err);
    throw err;
  }
}

// ---------------------------------------------------------------
// POS SHIFTS & RPC METRICS
// ---------------------------------------------------------------

export interface ShiftMetrics {
  gross_sales: number;
  total_cogs?: number;
  cogs?: number;
  net_profit: number;
  category_breakdown: { category: string; total: number }[];
  payment_breakdown?: { method: string; total: number }[];
}


export async function fetchShiftMetrics(): Promise<ShiftMetrics | null> {
  const { data, error } = await supabase.rpc('get_current_shift_metrics');
  if (error) {
    console.error('[CeylonPets] Error fetching shift metrics:', error);
    return null;
  }
  
  if (!data) return null;

  // If the user hasn't run the `fix_dashboard_rpc_json.sql` migration, 
  // the RPC will still return an Array (TABLE format). We must handle this 
  // gracefully so the Gross Sales card doesn't crash to 0.00.
  if (Array.isArray(data)) {
    if (data.length === 0) return null;
    
    // Construct a fallback ShiftMetrics object using the old array data
    // The pie chart will be empty, but top metrics will survive.
    const legacyData = data[0];
    return {
      gross_sales: legacyData.gross_sales || 0,
      total_cogs: legacyData.total_cogs || 0,
      cogs: legacyData.total_cogs || 0,
      net_profit: legacyData.net_profit || 0,
      // Create a simulated breakdown from the legacy columns so the cards don't stay 0
      category_breakdown: [
        { category: 'service', total: legacyData.clinical_care_revenue || 0 },
        { category: 'retail', total: legacyData.pet_shop_revenue || 0 }
      ]
    } as ShiftMetrics;
  }

  // If the user HAS run the migration, data will be a JSON object
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as ShiftMetrics;
    } catch (e) {
      console.error('Failed to parse shift metrics JSON string:', e);
      return null;
    }
  }

  return data as ShiftMetrics;
}

export async function fetchLowStockCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_low_stock_count');
  if (error) {
    console.error('[CeylonPets] Error fetching low stock count:', error);
    return 0;
  }
  return Number(data) || 0;
}

export async function fetchActiveShiftId(): Promise<string | null> {
  const { data, error } = await supabase.rpc('get_active_shift_id');
  if (error || !data) {
    return null;
  }
  return data as string;
}

export async function openShift(openedBy: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('pos_shifts')
    .insert({ status: 'open', opened_by: openedBy })
    .select('id')
    .single();
    
  if (error) {
    console.error('[CeylonPets] Error opening shift:', error);
    throw error;
  }
  return data?.id || null;
}

export async function closeShift(shiftId: string, actualCash: number, expectedCash: number, notes: string): Promise<void> {
  const { error } = await supabase
    .from('pos_shifts')
    .update({ 
      status: 'closed', 
      closed_at: new Date().toISOString(),
      actual_drawer_cash: actualCash,
      expected_drawer_cash: expectedCash,
      notes: notes
    })
    .eq('id', shiftId);

  if (error) {
    console.error('[CeylonPets] Error closing shift:', error);
    throw error;
  }
}

// ---------------------------------------------------------------
// DISASTER RECOVERY & ECOSYSTEM SERIALIZATION
// ---------------------------------------------------------------

export async function fetchFullSystemState(): Promise<any> {
  const [
    { data: inventory },
    { data: appointments },
    { data: records },
    { data: invoices },
    { data: posShifts },
    { data: alerts },
    { data: notifications }
  ] = await Promise.all([
    supabase.from(DB_TABLES.INVENTORY).select('*'),
    supabase.from(DB_TABLES.APPOINTMENTS).select('*'),
    supabase.from(DB_TABLES.RECORDS).select('*'),
    supabase.from(DB_TABLES.INVOICES).select('*'),
    supabase.from('pos_shifts').select('*'),
    supabase.from(DB_TABLES.ALERTS).select('*'),
    supabase.from(DB_TABLES.NOTIFICATIONS).select('*')
  ]);

  return {
    app: 'CeylonPets',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    collections: {
      inventory: inventory || [],
      appointments: appointments || [],
      records: records || [],
      invoices: invoices || [],
      pos_shifts: posShifts || [],
      system_alerts: alerts || [],
      notifications: notifications || []
    }
  };
}

export async function masterSystemPurge(): Promise<void> {
  // Use .not('id','is',null) — deletes every row regardless of UUID value
  const tables = [
    DB_TABLES.INVOICES,
    DB_TABLES.NOTIFICATIONS,
    DB_TABLES.ALERTS,
    DB_TABLES.RECORDS,
    DB_TABLES.APPOINTMENTS,
    'pos_shifts',
    DB_TABLES.INVENTORY
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().not('id', 'is', null);
    if (error) {
      console.warn(`[MasterPurge] Warning: Could not fully clear '${table}': ${error.message}`);
    }
  }

  // Clear local storage caches
  localStorage.removeItem('ceylon_inventory_v2');
  localStorage.removeItem('ceylon_appointments_v2');
  localStorage.removeItem('ceylon_records_v2');
  localStorage.removeItem('ceylon_invoices_v2');
}

export async function reconstituteSystemState(payload: any): Promise<void> {
  if (!payload || !payload.collections) {
    throw new Error("Invalid backup payload. Ensure this file is a valid CeylonPets JSON export.");
  }

  // Phase 1: Purge all existing rows first
  await masterSystemPurge();

  // Phase 2: Dependency-Aware Reconstitution using UPSERT (conflict-safe)
  // onConflict: 'id' means existing rows get overwritten instead of crashing
  const tablesOrder = [
    { name: DB_TABLES.INVENTORY,     data: payload.collections.inventory },
    { name: 'pos_shifts',            data: payload.collections.pos_shifts },
    { name: DB_TABLES.APPOINTMENTS,  data: payload.collections.appointments },
    { name: DB_TABLES.RECORDS,       data: payload.collections.records },
    { name: DB_TABLES.INVOICES,      data: payload.collections.invoices },
    { name: DB_TABLES.ALERTS,        data: payload.collections.system_alerts },
    { name: DB_TABLES.NOTIFICATIONS, data: payload.collections.notifications ?? payload.collections.client_notifications }
  ];

  for (const table of tablesOrder) {
    if (table.data && Array.isArray(table.data) && table.data.length > 0) {
      const { error } = await supabase
        .from(table.name)
        .upsert(table.data, { onConflict: 'id', ignoreDuplicates: false });
      if (error) {
        console.error(`[Reconstitution] Failed on table '${table.name}':`, error);
        throw new Error(`Failed to restore table '${table.name}': ${error.message}`);
      }
    }
  }
}

