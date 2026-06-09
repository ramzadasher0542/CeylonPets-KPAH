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
  SystemAlert,
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

// ---------------------------------------------------------------
// MEDICAL RECORDS
// ---------------------------------------------------------------

export async function fetchMedicalRecords(): Promise<MedicalRecord[]> {
  try {
    const { data, error } = await supabase
      .from(DB_TABLES.RECORDS)
      .select('id, patient_id, pet_name, owner_phone, visit_date, data')
      .order('visit_date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_records_v2', JSON.stringify([]));
      return [];
    }

    // Full record is stored in the `data` JSONB column
    const records: MedicalRecord[] = data.map((row: any) => row.data as MedicalRecord);

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
      id:          rec.id,
      patient_id:  rec.patientId,
      pet_name:    rec.petName,
      owner_phone: rec.ownerPhone,
      visit_date:  rec.visitDate,
      data:        rec,   // full object stored as JSONB
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
      .select('id, pet_name, owner_name, date, total, payment_status, data')
      .neq('payment_status', 'void')
      .order('date', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) {
      localStorage.setItem('ceylon_invoices_v2', JSON.stringify([]));
      return [];
    }

    const invoices: Invoice[] = data.map((row: any) => row.data as Invoice);

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
      total:          inv.total,
      profit:         inv.profit || 0,
      cogs:           inv.cogs || 0,
      status:         inv.paymentStatus,
      payment_method: inv.paymentMethod,
      shift_id:       inv.shiftId,
      data:           inv,   // full object stored as JSONB
    });
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
  total_cogs: number;
  net_profit: number;
  clinical_care_revenue: number;
  pet_shop_revenue: number;
  prescription_revenue: number;
}

export async function fetchShiftMetrics(): Promise<ShiftMetrics | null> {
  const { data, error } = await supabase.rpc('get_current_shift_metrics');
  if (error) {
    console.error('[CeylonPets] Error fetching shift metrics:', error);
    return null;
  }
  // The RPC returns a TABLE, so data is an array of rows
  return data && data.length > 0 ? (data[0] as ShiftMetrics) : null;
}

export async function fetchLowStockCount(): Promise<number> {
  const { data, error } = await supabase.rpc('get_low_stock_count');
  if (error) {
    console.error('[CeylonPets] Error fetching low stock count:', error);
    return 0;
  }
  return Number(data) || 0;
}

export async function fetchActiveShiftId(): Promise<string | undefined> {
  const { data, error } = await supabase.rpc('get_active_shift_id');
  if (error || !data) {
    return undefined;
  }
  return data as string;
}
