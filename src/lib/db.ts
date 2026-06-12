import { formatDisplayDate, formatDisplayTime } from '../utils/time';
import {
  InventoryItem,
  Appointment,
  MedicalRecord,
  Invoice,
  ClientNotification,
  User,
  SystemAlert
} from '../types';

function safeCache<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function safeWrite<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error(`Failed to write to local storage key: ${key}`, err);
  }
}

// INVENTORY
export async function fetchInventory(): Promise<InventoryItem[]> {
  return safeCache('ceylon_inventory_v2', []);
}

export async function upsertInventoryItem(item: InventoryItem): Promise<void> {
  const items = safeCache<InventoryItem>('ceylon_inventory_v2', []);
  const idx = items.findIndex(i => i.id === item.id);
  
  if (item.category === 'lab_service' || item.category === 'service') { 
    item.stock = 0; 
    item.minStock = 0; 
  }
  
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.push(item);
  }
  safeWrite('ceylon_inventory_v2', items);
}

export async function deleteInventoryItem(id: string): Promise<void> {
  let items = safeCache<InventoryItem>('ceylon_inventory_v2', []);
  items = items.filter(i => i.id !== id);
  safeWrite('ceylon_inventory_v2', items);
}

export async function updateInventoryStockCAS(itemId: string, newStock: number, expectedStock: number): Promise<void> {
  const items = safeCache<InventoryItem>('ceylon_inventory_v2', []);
  const item = items.find(i => i.id === itemId);
  if (!item || item.stock !== expectedStock) {
    throw new Error('CAS_MISMATCH');
  }
  item.stock = newStock;
  safeWrite('ceylon_inventory_v2', items);
}

// APPOINTMENTS
export async function fetchAppointments(): Promise<Appointment[]> {
  const items = safeCache<Appointment>('ceylon_appointments_v2', []);
  // Return only booked and in-progress, sorted by date desc
  return items
    .filter(a => a.status === 'booked' || a.status === 'in-progress')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function fetchHistoricalAppointmentsArchive(
  page = 0,
  limit = 50,
  search?: string
): Promise<{ appointments: Appointment[]; count: number }> {
  const items = safeCache<Appointment>('ceylon_appointments_v2', []);
  let filtered = items.filter(a => a.status === 'completed' || a.status === 'cancelled');

  if (search && search.trim() !== '') {
    const term = search.trim().toLowerCase();
    if (/^\d{4}-\d{2}-\d{2}$/.test(term)) {
      filtered = filtered.filter(a => a.date === term);
    } else {
      filtered = filtered.filter(a => 
        a.petName.toLowerCase().includes(term) || 
        a.ownerName.toLowerCase().includes(term)
      );
    }
  }

  filtered.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.time.localeCompare(a.time);
  });

  const count = filtered.length;
  const start = page * limit;
  const end = start + limit;
  return { appointments: filtered.slice(start, end), count };
}

export async function upsertAppointment(apt: Appointment): Promise<void> {
  const items = safeCache<Appointment>('ceylon_appointments_v2', []);
  const idx = items.findIndex(a => a.id === apt.id);
  const formattedApt = {
    ...apt,
    date: formatDisplayDate(apt.date),
    time: formatDisplayTime(apt.time)
  };

  if (idx >= 0) {
    items[idx] = formattedApt;
  } else {
    items.push(formattedApt);
  }
  safeWrite('ceylon_appointments_v2', items);
}

export async function fetchVeterinarians(): Promise<User[]> {
  const users = safeCache<User>('ceylon_staff_users', []);
  return users
    .filter(u => u.role === 'veterinarian' || u.role === 'admin')
    .sort((a, b) => a.name.localeCompare(b.name));
}

// MEDICAL RECORDS
export async function fetchMedicalRecords(): Promise<MedicalRecord[]> {
  const records = safeCache<MedicalRecord>('ceylon_records_v2', []);
  return records.sort((a, b) => new Date(b.visitDate).getTime() - new Date(a.visitDate).getTime());
}

export async function upsertMedicalRecord(rec: MedicalRecord): Promise<void> {
  const records = safeCache<MedicalRecord>('ceylon_records_v2', []);
  const idx = records.findIndex(r => r.id === rec.id);
  const formattedRec = {
    ...rec,
    visitDate: formatDisplayDate(rec.visitDate)
  };

  if (idx >= 0) {
    records[idx] = formattedRec;
  } else {
    records.push(formattedRec);
  }
  safeWrite('ceylon_records_v2', records);
}

export async function deleteMedicalRecord(id: string): Promise<void> {
  let records = safeCache<MedicalRecord>('ceylon_records_v2', []);
  records = records.filter(r => r.id !== id);
  safeWrite('ceylon_records_v2', records);
}

// INVOICES
export async function fetchInvoices(): Promise<Invoice[]> {
  const invoices = safeCache<Invoice>('ceylon_invoices_v2', []);
  return invoices
    .filter(inv => inv.paymentStatus !== 'void')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export async function upsertInvoice(inv: Invoice): Promise<void> {
  const invoices = safeCache<Invoice>('ceylon_invoices_v2', []);
  const idx = invoices.findIndex(i => i.id === inv.id);
  const formattedInv = {
    ...inv,
    date: formatDisplayDate(inv.date)
  };

  if (idx >= 0) {
    invoices[idx] = formattedInv;
  } else {
    invoices.push(formattedInv);
  }
  safeWrite('ceylon_invoices_v2', invoices);

  if (inv.appointmentId) {
    const apts = safeCache<Appointment>('ceylon_appointments_v2', []);
    const aptIdx = apts.findIndex(a => a.id === inv.appointmentId);
    if (aptIdx >= 0) {
      apts[aptIdx].status = 'completed';
      safeWrite('ceylon_appointments_v2', apts);
    }
  }
}

// NOTIFICATIONS
export async function fetchNotifications(): Promise<ClientNotification[]> {
  return safeCache<ClientNotification>('ceylon_notifications_v2', []);
}

export async function upsertNotification(notif: ClientNotification): Promise<void> {
  if (!notif || !notif.id) return;
  const notifs = safeCache<ClientNotification>('ceylon_notifications_v2', []);
  const idx = notifs.findIndex(n => n.id === notif.id);
  if (idx >= 0) {
    notifs[idx] = notif;
  } else {
    notifs.push(notif);
  }
  safeWrite('ceylon_notifications_v2', notifs);
}

// ALERTS
export async function fetchAlerts(): Promise<SystemAlert[]> {
  return safeCache<SystemAlert>('ceylon_alerts_v2', []);
}

export async function upsertAlert(alert: SystemAlert): Promise<void> {
  if (!alert || !alert.id) return;
  const alerts = safeCache<SystemAlert>('ceylon_alerts_v2', []);
  const idx = alerts.findIndex(a => a.id === alert.id);
  if (idx >= 0) {
    alerts[idx] = alert;
  } else {
    alerts.push(alert);
  }
  safeWrite('ceylon_alerts_v2', alerts);
}

// POS SHIFTS & METRICS
export interface ShiftMetrics {
  gross_sales: number;
  total_cogs?: number;
  cogs?: number;
  net_profit: number;
  category_breakdown: { category: string; total: number }[];
  payment_breakdown?: { method: string; total: number }[];
}

export async function fetchShiftMetrics(): Promise<ShiftMetrics | null> {
  const invoices = safeCache<Invoice>('ceylon_invoices_v2', []);
  const shiftId = await fetchActiveShiftId();
  
  if (!shiftId || shiftId === 'local-offline-shift') {
     return {
      gross_sales: 0, total_cogs: 0, cogs: 0, net_profit: 0,
      category_breakdown: [{ category: 'service', total: 0 }, { category: 'retail', total: 0 }]
    };
  }

  const shiftInvoices = invoices.filter(inv => inv.shiftId === shiftId && inv.paymentStatus === 'paid');
  
  let grossSales = 0;
  let totalCogs = 0;
  let clinicalRevenue = 0;
  let retailRevenue = 0;

  shiftInvoices.forEach(inv => {
    grossSales += inv.sales_total;
    totalCogs += inv.cogs || 0;
    
    inv.items?.forEach(item => {
      const isService = item.category === 'service' || item.category === 'lab_service';
      if (isService) {
        clinicalRevenue += (item.price * item.quantity);
      } else {
        retailRevenue += (item.price * item.quantity);
      }
    });
  });

  return {
    gross_sales: grossSales,
    total_cogs: totalCogs,
    cogs: totalCogs,
    net_profit: grossSales - totalCogs,
    category_breakdown: [
      { category: 'service', total: clinicalRevenue },
      { category: 'retail', total: retailRevenue }
    ]
  };
}

export async function fetchLowStockCount(): Promise<number> {
  const inventory = safeCache<InventoryItem>('ceylon_inventory_v2', []);
  return inventory.filter(item => item.category !== 'service' && item.category !== 'lab_service' && item.stock <= item.minStock).length;
}

export async function fetchActiveShiftId(): Promise<string | null> {
  return localStorage.getItem('ceylon_active_shift_id') || 'local-offline-shift';
}

export async function openShift(openedBy: string): Promise<string | null> {
  const shiftId = `shift-${Date.now()}`;
  localStorage.setItem('ceylon_active_shift_id', shiftId);
  return shiftId;
}

export async function closeShift(shiftId: string, actualCash: number, expectedCash: number, notes: string): Promise<void> {
  localStorage.removeItem('ceylon_active_shift_id');
}

export async function fetchFullSystemState(): Promise<any> {
  return {
    app: 'CeylonPets',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    collections: {
      inventory: safeCache('ceylon_inventory_v2', []),
      appointments: safeCache('ceylon_appointments_v2', []),
      records: safeCache('ceylon_records_v2', []),
      invoices: safeCache('ceylon_invoices_v2', []),
      pos_shifts: [],
      system_alerts: safeCache('ceylon_alerts_v2', []),
      notifications: safeCache('ceylon_notifications_v2', [])
    }
  };
}

export async function masterSystemPurge(): Promise<void> {
  localStorage.removeItem('ceylon_inventory_v2');
  localStorage.removeItem('ceylon_appointments_v2');
  localStorage.removeItem('ceylon_records_v2');
  localStorage.removeItem('ceylon_invoices_v2');
  localStorage.removeItem('ceylon_alerts_v2');
  localStorage.removeItem('ceylon_notifications_v2');
  localStorage.removeItem('ceylon_active_shift_id');
}

export async function reconstituteSystemState(payload: any): Promise<void> {
  if (!payload || !payload.collections) {
    throw new Error("Invalid backup payload. Ensure this file is a valid CeylonPets JSON export.");
  }

  await masterSystemPurge();

  if (payload.collections.inventory) safeWrite('ceylon_inventory_v2', payload.collections.inventory);
  if (payload.collections.appointments) safeWrite('ceylon_appointments_v2', payload.collections.appointments);
  if (payload.collections.records) safeWrite('ceylon_records_v2', payload.collections.records);
  if (payload.collections.invoices) safeWrite('ceylon_invoices_v2', payload.collections.invoices);
  if (payload.collections.system_alerts) safeWrite('ceylon_alerts_v2', payload.collections.system_alerts);
  if (payload.collections.notifications) safeWrite('ceylon_notifications_v2', payload.collections.notifications);
}
