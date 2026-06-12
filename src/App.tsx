/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db } from './lib/localDb';
import { 
  HeartHandshake, 
  LayoutDashboard, 
  Gamepad, 
  Calendar, 
  FileHeart, 
  FolderHeart, 
  Warehouse, 
  AlertTriangle, 
  PhoneCall, 
  Users, 
  LogOut, 
  Activity, 
  Wifi, 
  WifiOff,
  CloudLightning,
  Sparkles,
  Lock,
  Smartphone,
  CheckCircle2,
  Bookmark,
  Printer
} from 'lucide-react';

import { 
  InventoryItem, 
  Appointment, 
  MedicalRecord, 
  ClientNotification, 
  SystemAlert, 
  Invoice, 
  AppointmentStatus,
  OfflineSyncItem
} from './types';



// Modular Sub-components
import DashboardAnalytics from './components/DashboardAnalytics';
import POSRegister from './components/POSRegister';
import AppointmentsManager from './components/AppointmentsManager';
import MedicalRecordsManager from './components/MedicalRecordsManager';
import InventoryManager from './components/InventoryManager';
import NotificationsModal from './components/NotificationsModal';
import PatientPortal from './components/PatientPortal';
import SystemSettings, { SystemConfig } from './components/SystemSettings';
import ToastContainer, { showToast } from './components/Toast';

// Supabase data layer
import { supabase, DB_TABLES } from './lib/supabase';
import { fetchStaffUsers, upsertStaffUser, fetchSystemConfig, upsertSystemConfig } from './lib/auth';
import {
  fetchInventory,    upsertInventoryItem, updateInventoryStockCAS,
  fetchAppointments, upsertAppointment,
  fetchMedicalRecords, upsertMedicalRecord,
  fetchInvoices,     upsertInvoice,
  fetchNotifications, upsertNotification,
  fetchAlerts,       upsertAlert, deleteMedicalRecord,
  fetchActiveShiftId
} from './lib/db';

// Helper to hash a PIN synchronously using a custom salted polynomial hash
function hashPin(pin: string): string {
  if (!pin) return '';
  // If it's already a hex hash (8-character hex), do not hash it again.
  // Plaintext PINs are always 4-digit numbers.
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

// Helper to safely parse JSON from localStorage with fallbacks
function safeGetLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Error parsing localStorage key "${key}":`, e);
    return defaultValue;
  }
}

export default function App() {
  // First Deployment Boot Reboot Utility
  useState(() => {
    try {
      const booted = localStorage.getItem('ceylon_deployment_final_force_clear_v1');
      if (!booted) {
        console.log('[CeylonPets] Force clear trigger detected. Purging all browser local storage databases...');
        localStorage.clear();
        localStorage.setItem('ceylon_deployment_final_force_clear_v1', 'true');
      }
    } catch (e) {
      console.error('[CeylonPets] Error during deployment boot initialization:', e);
    }
  });

  // Main Databases (Loaded from LocalStorage or Default rich datasets for a fresh start)
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    return safeGetLocalStorage('ceylon_inventory_v2', []);
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    return safeGetLocalStorage('ceylon_appointments_v2', []);
  });

  const [records, setRecords] = useState<MedicalRecord[]>(() => {
    return safeGetLocalStorage('ceylon_records_v2', []);
  });

  const [notifications, setNotifications] = useState<ClientNotification[]>(() => {
    return safeGetLocalStorage('ceylon_notifications_v2', []);
  });

  const [alerts, setAlerts] = useState<SystemAlert[]>(() => {
    return safeGetLocalStorage('ceylon_alerts_v2', []);
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    return safeGetLocalStorage('ceylon_invoices_v2', []);
  });

  // Offline / Connectivity States
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncQueue, setSyncQueue] = useState<OfflineSyncItem[]>([]);

  // Sync Progress Indicators
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncStepDescription, setSyncStepDescription] = useState('');

  // Reseller Whitelabeling Configuration
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(() => {
    const saved = localStorage.getItem('ceylon_system_config_v2');
    const defaultConfig = {
      appName: 'CeylonPets',
      resellerName: 'ASH POINT SOLUTIONS',
      hospitalName: 'Ceylon Pets Animal Hospital',
      hospitalAddress: 'No. 34 Palace Road, Petaluma CA',
      hospitalPhone: '+1 (555) 781-4200',
      hospitalEmail: 'contact@ceylonpets.lk',
      invoiceLogo: '🐾',
      invoiceFooterMessage: 'Please pay upon discharge. Thank you for choosing CeylonPets!',
      invoiceSubFooterMessage: '* CEYLONPETS OFFICIAL RECEIPT *',
      invoiceExtraFooterMessage: '',
      taxRate: 0.08,
      currencySymbol: 'Rs.',
      selectedReceiptPrinter: 'Epson TM-T88VI Serial COM Port',
      selectedReportPrinter: 'HP LaserJet Enterprise MFP M528',
      receiptPaperSize: '80mm',
      connectionType: 'usb',
      localAutosaveInterval: 30,
      cloudEndpoint: 'https://vault.ashpointsolutions.lk/api/backup/client1',
      cloudBackupEnabled: true,
      emailDigestEnabled: true,
      recipientEmails: ['manager@ceylonpets.lk', 'accounts@ceylonpets.lk'],
      digestSchedule: 'daily_end',
      rolePermissions: {
        cashier: ['pos'],
        veterinarian: ['dashboard', 'appointments', 'records'],
        admin: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal'],
        owner: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal']
      },
      masterPin: hashPin('5692'),
      dummyAdminPin: hashPin('7777')
    };

    if (!saved) return defaultConfig;
    try {
      const parsed = JSON.parse(saved);
      const merged = { ...defaultConfig, ...parsed };
      
      if (!merged.rolePermissions) {
        merged.rolePermissions = defaultConfig.rolePermissions;
      } else {
        merged.rolePermissions.cashier = (merged.rolePermissions.cashier || ['pos']).filter(
          (view: string) => view === 'pos' || view === 'portal'
        );
        if (merged.rolePermissions.cashier.length === 0) {
          merged.rolePermissions.cashier = ['pos'];
        }
        if (!merged.rolePermissions.veterinarian) {
          merged.rolePermissions.veterinarian = defaultConfig.rolePermissions.veterinarian;
        }
        if (!merged.rolePermissions.admin) {
          merged.rolePermissions.admin = defaultConfig.rolePermissions.admin;
        }
        if (!merged.rolePermissions.owner) {
          merged.rolePermissions.owner = defaultConfig.rolePermissions.owner;
        }
      }
      if (merged.masterPin && merged.masterPin === defaultConfig.masterPin) merged.masterPin = hashPin(merged.masterPin);
      if (merged.dummyAdminPin && merged.dummyAdminPin === defaultConfig.dummyAdminPin) merged.dummyAdminPin = hashPin(merged.dummyAdminPin);
      return merged;
    } catch (e) {
      return defaultConfig;
    }
  });


  // Load users and pins separately from localStorage
  const [pinCache, setPinCache] = useState<Record<string, string>>(() => {
    let baseUsers = [];
    try {
      const saved = localStorage.getItem('ceylon_users_v3');
      baseUsers = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing ceylon_users_v3:', e);
      baseUsers = [];
    }

    const cache: Record<string, string> = {};
    baseUsers.forEach((user: any) => {
      let p = user.pin;
      if (!p) {
        if (user.username === 'admin') p = hashPin('0000');
        else p = hashPin('0000');
      } else {
        p = hashPin(p);
      }
      cache[user.username] = p;
    });
    return cache;
  });

  const [users, setUsers] = useState<any[]>(() => {
    let baseUsers = [];
    try {
      const saved = localStorage.getItem('ceylon_users_v3');
      baseUsers = saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error parsing ceylon_users_v3:', e);
      baseUsers = [];
    }

    return baseUsers.map((user: any) => {
      const { pin, ...safeU } = user;
      return safeU;
    });
  });

  // Access / Logins
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Current Screen selection
  const [activeView, setActiveView] = useState<'dashboard' | 'pos' | 'appointments' | 'records' | 'inventory' | 'reminders' | 'portal' | 'settings'>('dashboard');

  // ─── Sync state to localStorage (offline cache) + Supabase (write-through) ──
  // localStorage writes are synchronous and instant (offline resilience).
  // Supabase writes are best-effort async (silently ignored when offline).

  useEffect(() => {
    localStorage.setItem('ceylon_system_config_v2', JSON.stringify(systemConfig));
    if (currentUser) {
      upsertSystemConfig(systemConfig, currentUser).catch(() => {}); // best-effort cloud sync
    }
  }, [systemConfig, currentUser]);

  useEffect(() => {
    const fullUsers = users.map(u => {
      const realPin = pinCache[u.username] || u.pin;
      return { ...u, pin: realPin };
    });
    localStorage.setItem('ceylon_users_v3', JSON.stringify(fullUsers));
    if (currentUser) {
      fullUsers.forEach(u => upsertStaffUser(u, currentUser).catch(() => {}));
    }
  }, [users, pinCache, currentUser]);

  useEffect(() => {
    localStorage.setItem('ceylon_inventory_v2', JSON.stringify(inventory));
    inventory.forEach(item => upsertInventoryItem(item).catch(() => {}));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('ceylon_appointments_v2', JSON.stringify(appointments));
    appointments.forEach(apt => upsertAppointment(apt).catch(() => {}));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem('ceylon_records_v2', JSON.stringify(records));
    records.forEach(rec => upsertMedicalRecord(rec).catch(() => {}));
  }, [records]);

  useEffect(() => {
    localStorage.setItem('ceylon_notifications_v2', JSON.stringify(notifications));
    notifications.forEach(n => upsertNotification(n).catch(() => {}));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('ceylon_alerts_v2', JSON.stringify(alerts));
    alerts.forEach(a => upsertAlert(a).catch(() => {}));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('ceylon_invoices_v2', JSON.stringify(invoices));
    invoices.forEach(inv => upsertInvoice(inv).catch(() => {}));
  }, [invoices]);


  // User state sync removed for security (forces login on refresh)

  // ─── Supabase: hydrate all state from cloud on app mount ───────────────────
  // Loads instantly from localStorage cache (above), then silently refreshes
  // from Supabase in the background. Works offline (falls back to cache).
  const hydrateUsers = async () => {
    const cloudUsers = await fetchStaffUsers();
    const cache: Record<string, string> = {};
    const safeUsers = cloudUsers.map(({ pin, ...u }) => {
      if (pin) cache[u.username] = pin;
      return u;
    });
    setPinCache(prev => ({ ...prev, ...cache }));
    setUsers(safeUsers);
  };

  useEffect(() => {
    hydrateUsers();
    fetchSystemConfig().then(cloudConfig => {
      if (cloudConfig) setSystemConfig(cloudConfig);
    });
    fetchInventory().then(data => { setInventory(data); });
    fetchAppointments().then(data => { setAppointments(data); });
    fetchMedicalRecords().then(data => { setRecords(data); });
    fetchInvoices().then(data => { setInvoices(data); });
    fetchNotifications().then(data => { setNotifications(data); });
    fetchAlerts().then(data => { setAlerts(data); });
    
    // Hydrate offline sync queue from IndexedDB
    db.getItem('sync_queue').then((savedQueue: unknown) => {
      if (savedQueue && Array.isArray(savedQueue)) {
        setSyncQueue(savedQueue as OfflineSyncItem[]);
      }
    });
  }, []); // runs once on mount

  // ─── Auto-sync: listen for real browser connectivity changes ───────────────
  // When the device's network connection is restored, the browser fires the
  // 'online' event. We hook into it to automatically drain the offline queue
  // to Supabase — zero manual action required from the user.
  // The 'offline' event sets isOnline to false so subsequent mutations are
  // captured in the sync queue instead of going straight to Supabase.
  useEffect(() => {
    const handleOnline = () => {
      console.log('[CeylonPets] Network restored — triggering Supabase offline queue sync.');
      triggerAutoSynchronize();
    };

    const handleOffline = () => {
      console.log('[CeylonPets] Network lost — entering offline field mode. Changes will be queued locally.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Align initial isOnline with the actual browser state on mount
    // (in case the app was opened while already offline)
    if (!navigator.onLine) {
      setIsOnline(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncQueue, inventory, appointments]); // re-registers when queue or state changes so closures stay fresh

  // ─── Supabase Real-Time Subscriptions ──────────────────────────────────────
  // Automatically listens for insertions, updates, and deletions on all tables
  // and syncs changes to the client state immediately without requiring refresh.
  useEffect(() => {
    // 1. Inventory Subscription
    const inventoryChannel = supabase
      .channel('realtime-inventory')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.INVENTORY },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time inventory change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new;
              const mappedItem: InventoryItem = {
                id:       row.id,
                sku:      row.sku,
                name:     row.name,
                category: row.category as any,
                price:    Number(row.price),
                cost:     Number(row.cost),
                stock:    Number(row.stock),
                minStock: Number(row.min_stock),
                unit:     row.unit,
                location: row.location ?? undefined,
              };
              setInventory(prev => {
                const exists = prev.some(item => item.id === mappedItem.id);
                if (exists) {
                  return prev.map(item => item.id === mappedItem.id ? mappedItem : item);
                } else {
                  return [mappedItem, ...prev];
                }
              });
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setInventory(prev => prev.filter(item => item.id !== oldId));
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime inventory change:', err);
          }
        }
      )
      .subscribe();

    // 2. Appointments Subscription
    const appointmentsChannel = supabase
      .channel('realtime-appointments')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.APPOINTMENTS },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time appointments change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const row = payload.new;
              const mappedApt: Appointment = {
                id:          row.id,
                petName:     row.pet_name,
                petType:     row.pet_type as any,
                breed:       row.breed ?? '',
                ownerName:   row.owner_name,
                ownerPhone:  row.owner_phone,
                ownerEmail:  row.owner_email ?? '',
                date:        row.date,
                time:        row.time,
                veterinarian:row.veterinarian ?? '',
                reason:      row.reason ?? '',
                status:      row.status as any,
              };
              setAppointments(prev => {
                const exists = prev.some(a => a.id === mappedApt.id);
                if (exists) {
                  return prev.map(a => a.id === mappedApt.id ? mappedApt : a);
                } else {
                  return [mappedApt, ...prev];
                }
              });
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setAppointments(prev => prev.filter(a => a.id !== oldId));
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime appointments change:', err);
          }
        }
      )
      .subscribe();

    // 3. Medical Records Subscription
    const recordsChannel = supabase
      .channel('realtime-records')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.RECORDS },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time records change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const record = payload.new.data as MedicalRecord; // stored as JSONB in `data`
              if (record) {
                setRecords(prev => {
                  const exists = prev.some(r => r.id === record.id);
                  if (exists) {
                    return prev.map(r => r.id === record.id ? record : r);
                  } else {
                    return [record, ...prev];
                  }
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setRecords(prev => prev.filter(r => r.id !== oldId));
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime records change:', err);
          }
        }
      )
      .subscribe();

    // 4. Invoices Subscription
    const invoicesChannel = supabase
      .channel('realtime-invoices')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.INVOICES },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time invoices change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const invoice = payload.new.data as Invoice; // stored as JSONB in `data`
              if (invoice) {
                setInvoices(prev => {
                  const exists = prev.some(i => i.id === invoice.id);
                  if (exists) {
                    return prev.map(i => i.id === invoice.id ? invoice : i);
                  } else {
                    return [invoice, ...prev];
                  }
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setInvoices(prev => prev.filter(i => i.id !== oldId));
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime invoices change:', err);
          }
        }
      )
      .subscribe();

    // 5. Notifications Subscription
    const notificationsChannel = supabase
      .channel('realtime-notifications')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.NOTIFICATIONS },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time notifications change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const notif = payload.new.data as ClientNotification; // stored as JSONB in `data`
              if (notif) {
                setNotifications(prev => {
                  const exists = prev.some(n => n.id === notif.id);
                  if (exists) {
                    return prev.map(n => n.id === notif.id ? notif : n);
                  } else {
                    return [notif, ...prev];
                  }
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setNotifications(prev => prev.filter(n => n.id !== oldId));
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime notifications change:', err);
          }
        }
      )
      .subscribe();

    // 6. Alerts Subscription
    const alertsChannel = supabase
      .channel('realtime-alerts')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.ALERTS },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time alerts change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const alert = payload.new.data as SystemAlert; // stored as JSONB in `data`
              if (alert) {
                setAlerts(prev => {
                  const exists = prev.some(a => a.id === alert.id);
                  if (exists) {
                    return prev.map(a => a.id === alert.id ? alert : a);
                  } else {
                    return [alert, ...prev];
                  }
                });
              }
            } else if (payload.eventType === 'DELETE') {
              const oldId = payload.old.id;
              setAlerts(prev => prev.filter(a => a.id !== oldId));
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime alerts change:', err);
          }
        }
      )
      .subscribe();

    // 7. System Config Subscription
    const configChannel = supabase
      .channel('realtime-config')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: DB_TABLES.SYSTEM_CONFIG },
        (payload: any) => {
          try {
            console.log('[CeylonPets] Real-time system config change:', payload);
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const config = payload.new.config as SystemConfig;
              if (config) setSystemConfig(config);
            }
          } catch (err) {
            console.error('[CeylonPets] Error processing realtime system config change:', err);
          }
        }
      )
      .subscribe();

    // Cleanup channels on unmount
    return () => {
      inventoryChannel.unsubscribe();
      appointmentsChannel.unsubscribe();
      recordsChannel.unsubscribe();
      invoicesChannel.unsubscribe();
      notificationsChannel.unsubscribe();
      alertsChannel.unsubscribe();
      configChannel.unsubscribe();
    };
  }, []);

  // Securely govern live activeView redirection based on role permissions

  useEffect(() => {
    if (currentUser) {
      if (!isViewPermitted(activeView, currentUser)) {
        setActiveView(getDefaultViewForUser(currentUser));
      }
    }
  }, [currentUser, activeView, systemConfig]);

  // ─── Supabase Offline Queue Drainer ────────────────────────────────────────
  // Processes every item in syncQueue against the correct Supabase table.
  // Called automatically when the browser fires the 'online' event, and also
  // manually when the user clicks the connectivity toggle button.
  const pushToOfflineQueue = async (item: OfflineSyncItem) => {
    try {
      const currentQueue: OfflineSyncItem[] = (await db.getItem('sync_queue')) || [];
      const offlineRecord = { ...item, _queued_at: new Date().toISOString() };
      currentQueue.push(offlineRecord);
      await db.setItem('sync_queue', currentQueue);
      setSyncQueue(currentQueue);
      console.log('Transaction safely stored in IndexedDB offline queue.');
    } catch (error) {
      console.error('CRITICAL: Failed to write to local storage!', error);
    }
  };

  const triggerAutoSynchronize = async () => {
    try {
      const queue: OfflineSyncItem[] = (await db.getItem('sync_queue')) || [];
      if (queue.length === 0) {
        setIsOnline(true);
        return;
      }

    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStepDescription('Connecting to Supabase cloud database...');

      // Take a snapshot of the queue at the moment sync starts
      const queueSnapshot = [...queue];
      const total = queueSnapshot.length;
      let processed = 0;
      const failed: OfflineSyncItem[] = [];

      setSyncProgress(20);
      setSyncStepDescription(`Processing ${total} queued offline change${total !== 1 ? 's' : ''}...`);

      for (let i = 0; i < queueSnapshot.length; i++) {
        const item = queueSnapshot[i];
        try {
        switch (item.action) {

          // ── Invoices / POS Sales ─────────────────────────────────────────
          case 'create_invoice':
            await upsertInvoice(item.payload as Invoice);
            break;

          // ── Appointments ─────────────────────────────────────────────────
          case 'create_appointment':
            // Payload can be a full Appointment OR just {id, status} for status updates
            if (item.payload.petName) {
              await upsertAppointment(item.payload as Appointment);
            } else if (item.payload.id && item.payload.status) {
              // Status-only update: fetch current from state and upsert updated version
              const matched = appointments.find(a => a.id === item.payload.id);
              if (matched) await upsertAppointment({ ...matched, status: item.payload.status });
            }
            break;

          // ── Medical Records ───────────────────────────────────────────────
          case 'update_medical_record':
            await upsertMedicalRecord(item.payload as MedicalRecord);
            break;

          case 'delete_medical_record':
            await deleteMedicalRecord(item.payload as string);
            break;

          // ── Inventory: new item added while offline ───────────────────────
          case 'add_inventory':
            await upsertInventoryItem(item.payload as InventoryItem);
            break;

          // ── Inventory: stock level changed (sale or manual adjust) ────────
          // Payload is {itemId, qtyDelta} — resolve against current in-memory state
          case 'update_stock': {
            const { itemId, qtyDelta } = item.payload as { itemId: string; qtyDelta: number };
            const currentItem = inventory.find(i => i.id === itemId);
            if (currentItem) {
              const correctedStock = Math.max(0, currentItem.stock + qtyDelta);
              await upsertInventoryItem({ ...currentItem, stock: correctedStock });
            }
            break;
          }

          // ── Checkout POS (legacy action type alias) ───────────────────────
          case 'checkout_pos':
            await upsertInvoice(item.payload as Invoice);
            break;

          // ── Alerts & Notifications ────────────────────────────────────────
          case 'create_alert':
            await upsertAlert(item.payload as SystemAlert);
            break;

          case 'create_notification':
            await upsertNotification(item.payload as ClientNotification);
            break;

          default:
            console.warn('[CeylonPets] Unknown sync action, skipping:', item.action);
        }

        processed++;
        const pct = 20 + Math.round((processed / total) * 65); // progress 20→85
        setSyncProgress(pct);
        setSyncStepDescription(
          `Synced ${processed} / ${total}: ${item.collection} (${item.action})`
        );

        } catch (err) {
          console.error('Sync failed on item:', item, err);
          failed.push(item);
          // Preserve the failed item and all items after it for chronological integrity
          const remainingQueue = queueSnapshot.slice(i);
          await db.setItem('sync_queue', remainingQueue);
          setSyncQueue(remainingQueue);
          throw new Error('Supabase rejection. Halting sync queue.');
        }
      }

      // If loop completes successfully without throwing
      await db.removeItem('sync_queue');
      setSyncQueue([]);
      console.log('Sync complete. Queue emptied.');

      // ── Finalize ────────────────────────────────────────────────────────────
    setSyncProgress(90);
    setSyncStepDescription('Finalising & updating clinic alert log...');

    const successCount = total - failed.length;

    const completionAlert: SystemAlert = {
      id: `al-sync-${Date.now()}`,
      severity: failed.length === 0 ? 'info' : 'warning',
      category: 'system',
      message: failed.length === 0
        ? `Cloud Sync Complete ✓ — ${successCount} offline change${successCount !== 1 ? 's' : ''} pushed to Supabase successfully.`
        : `Cloud Sync Partial — ${successCount} pushed, ${failed.length} item${failed.length !== 1 ? 's' : ''} failed and re-queued for retry.`,
      timestamp: new Date().toISOString(),
      read: false
    };

      setAlerts(prev => [completionAlert, ...prev]);

      setIsOnline(true);
      setIsSyncing(false);
      setSyncProgress(100);
    } catch (error) {
      console.error('Sync process interrupted. Will retry later.', error);
      setIsOnline(true);
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  // Connectivity Toggler
  const handleToggleConnectivity = () => {
    if (!isOnline) {
      triggerAutoSynchronize();
    } else {
      setIsOnline(false);
      // showToast('Entered Vet Field care mode! Calculations and edits will store securely locally.', 'success');
    }
  };

  // State manipulation triggers
  const handleAddProduct = (product: InventoryItem) => {
    setInventory(prev => [product, ...prev]);
    showToast(`${product.name} added to inventory.`);

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-${Date.now()}`,
        action: 'add_inventory',
        collection: 'inventory',
        payload: product,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      upsertInventoryItem(product).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-${Date.now()}`,
          action: 'add_inventory',
          collection: 'inventory',
          payload: product,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };

  const handleUpdateStock = async (itemId: string, qtyDelta: number, expectedStock?: number) => {
    const currentItem = inventory.find(i => i.id === itemId);
    if (!currentItem) return;
    const newStock = Math.max(0, currentItem.stock + qtyDelta);
    const updatedItem = { ...currentItem, stock: newStock };

    if (expectedStock !== undefined && isOnline) {
      try {
        await updateInventoryStockCAS(itemId, newStock, expectedStock);
      } catch (err: any) {
        if (err.message === 'CAS_MISMATCH') {
          fetchInventory().then(items => setInventory(items));
        }
        throw err;
      }
    }

    setInventory(prev => 
      prev.map(item => {
        if (item.id === itemId) {
          return updatedItem;
        }
        return item;
      })
    );

    if (newStock <= currentItem.minStock && currentItem.category !== 'service') {
      const lowStockAlert: SystemAlert = {
        id: `al-${Date.now()}-${itemId}`,
        severity: 'urgent',
        category: 'inventory',
        message: `LOW STOCK ACTION: ${currentItem.name} (${currentItem.sku}) is running out! Current: ${newStock} units left.`,
        timestamp: new Date().toISOString(),
        read: false
      };
      setAlerts(prev => [lowStockAlert, ...prev]);
      
      if (isOnline) {
        try {
          await upsertAlert(lowStockAlert);
        } catch (error) {
          const syncItemAlert: OfflineSyncItem = {
            id: `sync-alert-${Date.now()}`,
            action: 'create_alert',
            collection: 'alerts',
            payload: lowStockAlert,
            timestamp: new Date().toISOString()
          };
          pushToOfflineQueue(syncItemAlert);
        }
      } else {
        const syncItemAlert: OfflineSyncItem = {
          id: `sync-alert-${Date.now()}`,
          action: 'create_alert',
          collection: 'alerts',
          payload: lowStockAlert,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItemAlert);
      }
    }
    showToast(`Stock updated: ${currentItem.name} (${newStock} remaining).`);

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-${Date.now()}-${itemId}`,
        action: 'update_stock',
        collection: 'inventory',
        payload: { itemId, qtyDelta },
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else if (expectedStock === undefined) {
      try {
        await upsertInventoryItem(updatedItem);
      } catch (error) {
        const syncItem: OfflineSyncItem = {
          id: `sync-${Date.now()}-${itemId}`,
          action: 'update_stock',
          collection: 'inventory',
          payload: { itemId, qtyDelta },
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      }
    }
  };

  const handleUpdatePrice = (id: string, newPrice: number) => {
    const currentItem = inventory.find(i => i.id === id);
    if (!currentItem) return;
    const updatedItem = { ...currentItem, price: newPrice };

    setInventory(prev => 
      prev.map(item => item.id === id ? updatedItem : item)
    );
    showToast(`Price updated for item.`);

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-price-${Date.now()}-${id}`,
        action: 'add_inventory',
        collection: 'inventory',
        payload: updatedItem,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      upsertInventoryItem(updatedItem).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-price-${Date.now()}-${id}`,
          action: 'add_inventory',
          collection: 'inventory',
          payload: updatedItem,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };

  const handleAddAppointment = (appointment: Appointment) => {
    setAppointments(prev => [appointment, ...prev]);
    showToast(`Appointment scheduled for ${appointment.petName}.`);

    // Setup automated client reminders queue
    const emailNotif: ClientNotification = {
      id: `not-em-${Date.now()}`,
      petName: appointment.petName,
      ownerName: appointment.ownerName,
      recipient: appointment.ownerEmail,
      type: 'appointment_reminder',
      channel: 'email',
      message: `Friendly reminder: ${appointment.petName} has an appointment scheduled at ${systemConfig.hospitalName} on ${appointment.date} at ${appointment.time} for: ${appointment.reason}.`,
      scheduledTime: appointment.date,
      status: 'queued'
    };

    setNotifications(prev => [emailNotif, ...prev]);

    if (!isOnline) {
      const syncItemApt: OfflineSyncItem = {
        id: `sync-apt-${Date.now()}`,
        action: 'create_appointment',
        collection: 'appointments',
        payload: appointment,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItemApt);
    } else {
      upsertAppointment(appointment).catch(() => {
        const syncItemApt: OfflineSyncItem = {
          id: `sync-apt-${Date.now()}`,
          action: 'create_appointment',
          collection: 'appointments',
          payload: appointment,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItemApt);
      });
      upsertNotification(emailNotif).catch(console.warn);
    }
  };

  const handleUpdateAppointmentStatus = (id: string, status: AppointmentStatus) => {
    const aptDetails = appointments.find(a => a.id === id);
    if (!aptDetails) return;
    const updatedApt = { ...aptDetails, status };

    if (status === 'completed' || status === 'cancelled') {
      setAppointments(prev => prev.filter(apt => apt.id !== id));
    } else {
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? updatedApt : apt)
      );
    }

    // If status checked in, automatically trigger notification for vaccination reviews in EHR
    let checkAlert: SystemAlert | null = null;
    if (status === 'in-progress') {
      checkAlert = {
        id: `al-check-${Date.now()}`,
        severity: 'info',
        category: 'appointment',
        message: `Clinician Alert: ${aptDetails.petName} (${aptDetails.petType}) has checked into consultation room. Reason: ${aptDetails.reason}`,
        timestamp: new Date().toISOString(),
        read: false
      };
      setAlerts(prev => [checkAlert, ...prev]);
    }
    showToast(`Appointment status updated to ${status}.`);

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-status-${Date.now()}`,
        action: 'create_appointment', // simple mock
        collection: 'appointments',
        payload: { id, status },
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
      if (checkAlert) {
        const syncAlert: OfflineSyncItem = {
          id: `sync-al-${Date.now()}`,
          action: 'create_alert',
          collection: 'alerts',
          payload: checkAlert,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncAlert);
      }
    } else {
      upsertAppointment(updatedApt).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-status-${Date.now()}`,
          action: 'create_appointment',
          collection: 'appointments',
          payload: { id, status },
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
      if (checkAlert) {
        upsertAlert(checkAlert).catch(() => {
          const syncAlert: OfflineSyncItem = {
            id: `sync-al-${Date.now()}`,
            action: 'create_alert',
            collection: 'alerts',
            payload: checkAlert,
            timestamp: new Date().toISOString()
          };
          pushToOfflineQueue(syncAlert);
        });
      }
    }
  };

  const handleAddRecord = (newRec: MedicalRecord) => {
    setRecords(prev => [newRec, ...prev]);
    showToast(`Medical record added for ${newRec.petName}.`);

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-rec-${Date.now()}`,
        action: 'update_medical_record',
        collection: 'records',
        payload: newRec,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      upsertMedicalRecord(newRec).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-rec-${Date.now()}`,
          action: 'update_medical_record',
          collection: 'records',
          payload: newRec,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };

  const handleUpdateRecord = (updated: MedicalRecord) => {
    setRecords(prev =>
      prev.map(r => r.id === updated.id ? updated : r)
    );
    showToast(`Medical record updated for ${updated.petName}.`);

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-rec-upd-${Date.now()}`,
        action: 'update_medical_record',
        collection: 'records',
        payload: updated,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      upsertMedicalRecord(updated).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-rec-upd-${Date.now()}`,
          action: 'update_medical_record',
          collection: 'records',
          payload: updated,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };

  const handleDeleteRecord = (id: string) => {
    setRecords(prev => prev.filter(r => r.id !== id));
    showToast('Medical record permanently deleted.', 'success');

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-rec-del-${Date.now()}`,
        action: 'delete_medical_record',
        collection: 'records',
        payload: id,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      deleteMedicalRecord(id).catch((err) => {
        const syncItem: OfflineSyncItem = {
          id: `sync-rec-del-${Date.now()}`,
          action: 'delete_medical_record',
          collection: 'records',
          payload: id,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };


  const handleAddInvoice = async (invoice: Invoice) => {
    // Attempt to tag invoice with active shift ID
    const currentShiftId = await fetchActiveShiftId();
    if (currentShiftId) {
      invoice.shiftId = currentShiftId;
    }

    setInvoices(prev => [invoice, ...prev]);
    showToast(`Invoice added: $${invoice.sales_total.toFixed(2)}.`);

    // Also look for corresponding appointment and mark it 'completed'
    if (invoice.appointmentId) {
      handleUpdateAppointmentStatus(invoice.appointmentId, 'completed');
    }

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-inv-${Date.now()}`,
        action: 'create_invoice',
        collection: 'invoices',
        payload: invoice,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      try {
        await upsertInvoice(invoice);
      } catch (error) {
        const syncItem: OfflineSyncItem = {
          id: `sync-inv-${Date.now()}`,
          action: 'create_invoice',
          collection: 'invoices',
          payload: invoice,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      }
    }
  };

  const handleVoidInvoice = (invoiceId: string) => {
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice || targetInvoice.paymentStatus === 'void') return;

    const voidAlert: SystemAlert = {
      id: `al-void-${Date.now()}-${invoiceId}`,
      severity: 'warning',
      category: 'system',
      message: `TRANSACTION VOIDED: Invoice ${invoiceId} has been successfully voided. Inventory stock levels reinstated.`,
      timestamp: new Date().toISOString(),
      read: false
    };

    setAlerts(prevAlerts => [voidAlert, ...prevAlerts]);

    targetInvoice.items.forEach(item => {
      if (item.category !== 'service') {
        handleUpdateStock(item.itemId, item.quantity);
      }
    });

    const updatedInvoice = { ...targetInvoice, paymentStatus: 'void' as const };
    setInvoices(prev => prev.map(inv => inv.id === invoiceId ? updatedInvoice : inv));

    if (!isOnline) {
      const syncInv: OfflineSyncItem = {
        id: `sync-inv-void-${Date.now()}`,
        action: 'create_invoice',
        collection: 'invoices',
        payload: updatedInvoice,
        timestamp: new Date().toISOString()
      };
      const syncAlert: OfflineSyncItem = {
        id: `sync-al-void-${Date.now()}`,
        action: 'create_alert',
        collection: 'alerts',
        payload: voidAlert,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncInv);
      pushToOfflineQueue(syncAlert);
    } else {
      upsertInvoice(updatedInvoice).catch(() => {
        const syncInv: OfflineSyncItem = {
          id: `sync-inv-void-${Date.now()}`,
          action: 'create_invoice',
          collection: 'invoices',
          payload: updatedInvoice,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncInv);
      });
      upsertAlert(voidAlert).catch(() => {
        const syncAlert: OfflineSyncItem = {
          id: `sync-al-void-${Date.now()}`,
          action: 'create_alert',
          collection: 'alerts',
          payload: voidAlert,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncAlert);
      });
    }
  };

  const handleDismissAlert = (id: string) => {
    const alert = alerts.find(a => a.id === id);
    if (!alert) return;
    const updatedAlert = { ...alert, read: true };
    setAlerts(prev => prev.map(a => a.id === id ? updatedAlert : a));

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-alert-dismiss-${Date.now()}`,
        action: 'create_alert',
        collection: 'alerts',
        payload: updatedAlert,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      upsertAlert(updatedAlert).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-alert-dismiss-${Date.now()}`,
          action: 'create_alert',
          collection: 'alerts',
          payload: updatedAlert,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };

  const handleSendNotification = (id: string) => {
    const notif = notifications.find(n => n.id === id);
    if (!notif) return;
    const updatedNotif = { ...notif, status: 'sent' as const };
    setNotifications(prev => prev.map(n => n.id === id ? updatedNotif : n));

    if (!isOnline) {
      const syncItem: OfflineSyncItem = {
        id: `sync-notif-${Date.now()}`,
        action: 'create_notification', // mock action
        collection: 'notifications',
        payload: updatedNotif,
        timestamp: new Date().toISOString()
      };
      pushToOfflineQueue(syncItem);
    } else {
      upsertNotification(updatedNotif).catch(() => {
        const syncItem: OfflineSyncItem = {
          id: `sync-notif-${Date.now()}`,
          action: 'create_notification',
          collection: 'notifications',
          payload: updatedNotif,
          timestamp: new Date().toISOString()
        };
        pushToOfflineQueue(syncItem);
      });
    }
  };

  const handleRestoreSnapshot = (snapshot: any) => {
    if (snapshot.config) setSystemConfig(snapshot.config);
    if (snapshot.inventory) setInventory(snapshot.inventory);
    if (snapshot.users) setUsers(snapshot.users);
    if (snapshot.invoices) setInvoices(snapshot.invoices);
    if (snapshot.appointments) setAppointments(snapshot.appointments);
    if (snapshot.records) setRecords(snapshot.records);
    if (snapshot.alerts) setAlerts(snapshot.alerts);
    if (snapshot.notifications) setNotifications(snapshot.notifications);
  };

  const handleForceCloudSync = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStepDescription("Discarding local offline changes...");
    
    // Wipe local sync queue completely
    setSyncQueue([]);
    await db.removeItem('sync_queue');

    setSyncProgress(30);
    setSyncStepDescription("Downloading cloud inventory...");
    const cloudInventory = await fetchInventory();
    setInventory(cloudInventory);

    setSyncProgress(50);
    setSyncStepDescription("Downloading cloud appointments...");
    const cloudAppointments = await fetchAppointments();
    setAppointments(cloudAppointments);

    setSyncProgress(65);
    setSyncStepDescription("Downloading cloud invoices...");
    const cloudInvoices = await fetchInvoices();
    setInvoices(cloudInvoices);

    setSyncProgress(80);
    setSyncStepDescription("Downloading remaining cloud data...");
    const cloudRecords = await fetchMedicalRecords();
    setRecords(cloudRecords);
    
    const cloudAlerts = await fetchAlerts();
    setAlerts(cloudAlerts);
    
    const cloudNotifications = await fetchNotifications();
    setNotifications(cloudNotifications);

    setSyncProgress(100);
    setSyncStepDescription("Cloud synchronization complete.");
    
    setTimeout(() => {
      setIsSyncing(false);
      setSyncProgress(0);
      setSyncStepDescription("");
    }, 2000);
  };

  const handlePurgeDatabases = async () => {
    setIsSyncing(true);
    setSyncProgress(20);
    setSyncStepDescription("Connecting to database cloud target...");
    try {
      const deleteEndpoints = [
        DB_TABLES.INVENTORY,
        DB_TABLES.APPOINTMENTS,
        DB_TABLES.RECORDS,
        DB_TABLES.INVOICES,
        DB_TABLES.NOTIFICATIONS,
        DB_TABLES.ALERTS
      ];

      setSyncProgress(50);
      setSyncStepDescription("Purging Supabase cloud tables...");
      
      for (const table of deleteEndpoints) {
        const { error } = await supabase.from(table).delete().neq('id', '_non_existent_');
        if (error) console.error(`Error deleting table ${table}:`, error);
      }

      setSyncProgress(85);
      setSyncStepDescription("Purging client local caches...");
      
      // Explicitly remove local storage keys to prevent orphaned data lingering after reload
      const localKeysToClear = [
        'ceylon_inventory_v2',
        'ceylon_appointments_v2',
        'ceylon_records_v2',
        'ceylon_invoices_v2',
        'ceylon_notifications_v2',
        'ceylon_alerts_v2',
        'ceylon_sync_queue_v2'
      ];
      localKeysToClear.forEach(key => localStorage.removeItem(key));
      
      // Global cache busting for ghost data eradication
      localStorage.clear();
      sessionStorage.clear();

      setInventory([]);
      setAppointments([]);
      setRecords([]);
      setInvoices([]);
      setNotifications([]);
      setAlerts([]);
      setSyncQueue([]);
      await db.removeItem('sync_queue');

      setSyncProgress(100);
      setSyncStepDescription("Database purge completed!");
      showToast("Database purge completed successfully! All live history records are cleared. System configurations and staff users are preserved.", 'success');
      window.location.reload();
    } catch (e: any) {
      console.error("Purge failed:", e);
      showToast("Error: Cloud connection failed. Local databases have been purged, but cloud tables might still retain some records.", 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleVerifyMasterPin = (pin: string): boolean => {
    const ownerPinHash = systemConfig.masterPin || hashPin('0000');
    return hashPin(pin) === ownerPinHash;
  };

  const handleHardReboot = async () => {
    setIsSyncing(true);
    setSyncProgress(10);
    setSyncStepDescription("Initializing Hard Reboot slate reset...");
    try {
      // 1. Purge Supabase Dynamic tables
      const dynamicTables = [
        DB_TABLES.INVENTORY,
        DB_TABLES.APPOINTMENTS,
        DB_TABLES.RECORDS,
        DB_TABLES.INVOICES,
        DB_TABLES.NOTIFICATIONS,
        DB_TABLES.ALERTS
      ];

      setSyncProgress(30);
      setSyncStepDescription("Purging cloud transactional databases...");
      for (const table of dynamicTables) {
        const { error } = await supabase.from(table).delete().neq('id', '_non_existent_');
        if (error) console.error(`Error deleting table ${table}:`, error);
      }

      // 2. Remove ALL local storage keys (dynamic data + settings/users)
      const localKeysToClear = [
        'ceylon_inventory_v2',
        'ceylon_appointments_v2',
        'ceylon_records_v2',
        'ceylon_invoices_v2',
        'ceylon_notifications_v2',
        'ceylon_alerts_v2',
        'ceylon_sync_queue_v2',
        'ceylon_system_config_v2',
        'ceylon_settings_v1',
        'ceylon_users_v3'
      ];
      localKeysToClear.forEach(key => localStorage.removeItem(key));
      
      // Global cache busting for ghost data eradication
      localStorage.clear();
      sessionStorage.clear();
      
      localStorage.setItem('ceylon_deployment_final_force_clear_v1', 'true');

      // 3. Clear React state for dynamic data
      setInventory([]);
      setAppointments([]);
      setRecords([]);
      setInvoices([]);
      setNotifications([]);
      setAlerts([]);
      setSyncQueue([]);
      setUsers([]);
      setCurrentUser(null);

      setSyncProgress(100);
      setSyncStepDescription("System slate completely reset!");
      showToast("HARD REBOOT COMPLETE!  The entire cloud database, local storage caches, dynamic staff users, and configs have been wiped and reset to a pristine starter slate.  You will now be logged out and the application will reload.", 'success');
      window.location.reload();
    } catch (e: any) {
      console.error("Hard reboot failed:", e);
      showToast("Error: Hard reboot cloud operations failed. Cloud connection error.", 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Granular secure roles validation helpers
  const isViewPermitted = (viewName: string, user: any): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true; // POS service provider master bypass
    if (user.role === 'dummy_admin') {
      return viewName === 'settings';
    }
    if (user.role === 'pet_parent') {
      return viewName === 'portal';
    }
    
    // Explicitly block non-admin users from accessing system settings
    if (viewName === 'settings') return false;
    
    // Dynamically retrieve configured permissions
    const userRole = user.role; // 'admin', 'veterinarian', 'cashier'
    const defaultPermissions = {
      cashier: ['pos'],
      veterinarian: ['dashboard', 'appointments', 'records'],
      admin: ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal']
    };
    const permissions = (systemConfig.rolePermissions || defaultPermissions)[userRole as 'cashier' | 'veterinarian' | 'admin' | 'owner'] || [];
    
    // Clinicians & administrative staff have general permission to load Pet Parent control
    if (viewName === 'portal') return true;
    
    return permissions.includes(viewName);
  };

  const getDefaultViewForUser = (user: any): any => {
    if (!user) return 'portal';
    if (user.role === 'admin') return 'settings';
    if (user.role === 'dummy_admin') return 'settings';
    if (user.role === 'pet_parent') return 'portal';
    
    // Sort clinical features based on access priority
    const priorityViews = ['dashboard', 'pos', 'appointments', 'records', 'inventory', 'reminders', 'portal'] as const;
    for (const view of priorityViews) {
      if (isViewPermitted(view, user)) {
        return view;
      }
    }
    return 'portal';
  };

  const handleSwitchUserRole = (user: any) => {
    setCurrentUser(user);
    if (user) {
      if (user.role === 'pet_parent') {
        setActiveView('portal');
      } else {
        setActiveView(getDefaultViewForUser(user));
      }
    }
  };

  const [selectedUsername, setSelectedUsername] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUsername) {
      showToast("Please select a staff member first.", 'info');
      return;
    }
    
    const ownerPinHash = systemConfig.masterPin || hashPin('5692');
    const dummyPinHash = systemConfig.dummyAdminPin || hashPin('7777');
    const enteredPinHash = hashPin(enteredPin);

    // 1. Check Master Owner PIN
    if (selectedUsername === 'ashpoint_owner') {
      if (enteredPinHash === ownerPinHash) {
        const ownerUser = {
          id: 'usr-ash-owner',
          name: `${systemConfig.appName} System Admin`,
          username: 'ashpoint_owner',
          role: 'admin',
          avatarColor: 'bg-indigo-600 text-white border-indigo-700'
        };
        
        setCurrentUser(ownerUser);
        setEnteredPin('');
        setSelectedUsername('');
        setPinError(false);
        setActiveView('settings'); // directly open settings for convenience
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 2000);
        setEnteredPin('');
      }
      return;
    }

    // 2. Check Dummy Printer Admin PIN
    if (selectedUsername === 'printer_assistant') {
      if (enteredPinHash === dummyPinHash) {
        const dummyUser = {
          id: 'usr-dummy-printer',
          name: 'Printer Setup Assistant',
          username: 'printer_assistant',
          role: 'dummy_admin',
          avatarColor: 'bg-slate-600 text-white border-slate-705'
        };

        setCurrentUser(dummyUser);
        setEnteredPin('');
        setSelectedUsername('');
        setPinError(false);
        setActiveView('settings'); // open settings (which will restrict tabs to printer only)
      } else {
        setPinError(true);
        setTimeout(() => setPinError(false), 2000);
        setEnteredPin('');
      }
      return;
    }

    // 3. Search dynamic clinicians in database
    const foundUser = users.find(u => u.username === selectedUsername);
    const cachedPin = pinCache[selectedUsername];
    if (foundUser && hashPin(enteredPin) === cachedPin) {
      setCurrentUser(foundUser);
      setEnteredPin('');
      setSelectedUsername('');
      setPinError(false);
      setActiveView(getDefaultViewForUser(foundUser));
    } else {
      setPinError(true);
      setTimeout(() => setPinError(false), 2000);
      setEnteredPin('');
    }
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-slate-50 flex flex-col font-sans relative antialiased leading-none text-xs text-slate-800">
      
      {/* 1. Secure Role-Based PIN Login / Welcome Wall */}
      {!currentUser ? (
        <div className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-sky-100 max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 overflow-hidden shadow-2xl animate-fade-in text-xs">
            
            {/* Visual Column - matching the photo (vibrant blue & yellow pastel, cushions and neon branding) */}
            <div className="p-8 bg-sky-600 text-white flex flex-col justify-between space-y-8 relative overflow-hidden">
              <div className="relative z-10 font-sans flex flex-col h-full justify-between">
                <div className="space-y-6">
                  <span className="px-3 py-1 bg-white/20 text-white font-bold rounded-full text-[9px] uppercase tracking-wider flex items-center gap-1.5 w-max">
                    <span className="text-sm select-none leading-none">{systemConfig.invoiceLogo}</span> {systemConfig.appName} Core Medical Suite
                  </span>
                  
                  {systemConfig.loginLogoUrl ? (
                    <div className="inline-block w-full py-2">
                      <img 
                        src={systemConfig.loginLogoUrl} 
                        alt="Clinic Logo" 
                        className="w-auto max-w-xs md:max-w-sm max-h-48 object-contain mix-blend-normal"
                      />
                    </div>
                  ) : (
                    <div className="bg-white/10 p-6 rounded-2xl backdrop-blur-sm border-2 border-white/30 border-dashed inline-block">
                      <p className="text-white/70 font-bold text-xs uppercase tracking-widest text-center">Your Logo Here<br/><span className="text-[9px] font-medium opacity-75 capitalize mt-1 block">(Upload via System Settings)</span></p>
                    </div>
                  )}
                  
                  <p className="text-white/80 leading-relaxed font-semibold text-sm max-w-sm">
                    Serving Pet parents cleanly and securely. Tablet-ready clinical charts, custom billing registers, and automated client alerts.
                  </p>
                </div>

                <div className="text-white/90 font-semibold tracking-wide text-[10px] uppercase flex flex-col gap-0.5 mt-12 pb-4">
                  <span className="opacity-70 tracking-widest">CeylonPets Medical OS</span>
                  <span className="font-black text-[13px] tracking-widest drop-shadow-sm text-yellow-300">
                    POWERED BY ASH POINT SOLUTIONS
                  </span>
                </div>
              </div>

              {/* Shading decorations */}
              <div className="absolute -bottom-8 -left-8 w-44 h-44 bg-sky-500 rounded-full blur-xl opacity-50" />
            </div>

            {/* Login Selection Column */}
            <div className="p-8 flex flex-col justify-between space-y-6 font-sans">
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Secure Clinician Sign-In</h3>
                  <p className="text-slate-400 mt-1">Select your account and enter your secure 4-digit PIN to access the terminal.</p>
                </div>
              </div>

              {/* Login Form with username + numeric PIN */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <form onSubmit={handlePinSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="login-username" className="font-bold text-slate-700 block text-[10px]">Select Staff Member</label>
                    <select
                      id="login-username"
                      name="username"
                      autoComplete="username"
                      value={selectedUsername}
                      onChange={(e) => setSelectedUsername(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500 text-xs font-semibold text-slate-700"
                      required
                    >
                      <option value="" disabled>-- Choose Staff --</option>
                      <option value="ashpoint_owner">Service Provider (System Root Admin)</option>
                      <option value="printer_assistant">Printer Setup Assistant (Hardware Config)</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.name} ({u.role.toUpperCase()})
                        </option>
                      ))}
                    </select>
                    {/* Hidden username input for password managers */}
                    <input type="text" name="username" autoComplete="username" className="sr-only hidden" aria-hidden="true" value={selectedUsername} readOnly />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label htmlFor="login-pin" className="font-bold text-slate-700 block text-[10px]">Enter 4-Digit Passcode PIN</label>
                      {pinError && <span className="text-[10px] text-rose-600 font-semibold animate-pulse">Incorrect passcode pin.</span>}
                    </div>
                    <div className="flex gap-2">
                      <input
                        id="login-pin"
                        name="pin"
                        type="password"
                        autoComplete="current-password"
                        maxLength={4}
                        placeholder="••••"
                        value={enteredPin}
                        onChange={(e) => setEnteredPin(e.target.value)}
                        className="flex-1 px-3 py-2.5 bg-slate-50 border border-slate-200 text-center font-mono font-bold tracking-widest text-sm rounded-xl focus:outline-none focus:ring-1 focus:ring-sky-500"
                        required
                      />
                      <button
                        type="submit"
                        className="px-5 bg-slate-800 hover:bg-slate-900 font-extrabold text-white rounded-xl transition-all font-mono"
                      >
                        Verify
                      </button>
                    </div>
                  </div>
                </form>

                {/* Patient Owner Portal bypass options */}
                <button
                  onClick={() => handleSwitchUserRole({ name: 'Isabella Bennett (Client)', role: 'pet_parent' })}
                  className="w-full text-center py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 hover:border-indigo-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Enter Patient Portal View (No PIN required)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 2. Sync Progress Modal Overlay */}
      {isSyncing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-sky-100 p-6 max-w-sm w-full space-y-4 shadow-xl text-center text-xs animate-fade-in">
            <CloudLightning className="h-8 w-8 text-sky-500 mx-auto animate-bounce" />
            <div>
              <h4 className="text-base font-extrabold text-slate-800">Synchronizing Local Ledger</h4>
              <p className="text-[11px] text-slate-400 mt-1">Broadcasting offline data updates securely to national standard EHR servers...</p>
            </div>

            {/* Progress metrics */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative">
              <div 
                className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${syncProgress}%` }}
              />
            </div>

            <p className="font-mono text-[10px] text-indigo-600 font-bold border p-2 bg-slate-50 rounded-lg">
              {syncStepDescription}
            </p>
          </div>
        </div>
      )}

      {/* 3. Main Convertible Dashboard App Shell */}
      {currentUser && (
        <>
          {/* Header Bar */}
          <header className="bg-white border-b border-sky-100 sticky top-0 z-40 px-6 py-2 shadow-sm print:hidden">
            <div className="w-full max-w-[1920px] mx-auto px-4 md:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
              
              {/* Title & Logo */}
              <div className="flex items-center gap-2.5 justify-center sm:justify-start">
                <div className="p-2 bg-indigo-600 text-white rounded-xl text-xs font-sans flex items-center justify-center leading-none">
                  <span className="text-sm select-none">{systemConfig.invoiceLogo}</span>
                </div>
                <div>
                  <h1 className="text-base font-extrabold tracking-tight font-display text-slate-800 flex items-center gap-1.5 animate-pulse">
                    {systemConfig.hospitalName}
                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-100 text-yellow-850 border border-yellow-250 rounded font-sans uppercase">{systemConfig.appName} POS Suite</span>
                  </h1>
                  <p className="text-[9px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">Desktop Clinical POS Suite • Powered by {systemConfig.resellerName}</p>
                </div>
              </div>

              {/* Status and Logged User Details */}
              <div className="flex items-center gap-3 flex-wrap justify-center">
                
                {/* Connection switch button */}
                <button
                  onClick={handleToggleConnectivity}
                  className={`px-3 py-1 rounded-full border text-[9px] font-bold tracking-wider uppercase inline-flex items-center justify-center gap-1.5 cursor-pointer select-none transition-all ${
                    isOnline 
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100' 
                      : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 animate-pulse'
                  }`}
                  title={isOnline ? "Switch to Offline field mode" : "Restore server link"}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                      <span>Online Synchronized</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="h-3.5 w-3.5 text-amber-600" />
                      <span>Remote Camp (Offline)</span>
                      {syncQueue.length > 0 && (
                        <span className="bg-amber-600 text-white px-1.5 py-0.5 rounded text-[9px] font-mono leading-none">
                          {syncQueue.length} Queue
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* User Profile info */}
                <div className="flex items-center gap-2.5 pl-3 border-l border-slate-200">
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center font-bold font-mono text-[11px] ${
                    currentUser.role === 'admin' ? 'bg-emerald-100 text-emerald-700 border-emerald-300' :
                    currentUser.role === 'veterinarian' ? 'bg-blue-100 text-blue-700 border-blue-300' : 
                    currentUser.role === 'owner' ? 'bg-indigo-100 text-indigo-700 border-indigo-300' : 'bg-amber-100 text-amber-700 border-amber-300'
                  }`}>
                    {currentUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="text-left text-[11px] font-semibold text-slate-600">
                    <span className="block font-black text-slate-800 leading-none">{currentUser.name}</span>
                    <span className="block text-[9px] mt-0.5 text-slate-400 capitalize">{currentUser.role} console</span>
                  </div>
                </div>

                {/* Logout */}
                <button
                  onClick={() => setCurrentUser(null)}
                  className="p-2 border border-slate-200 hover:border-rose-200 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50/25 rounded-xl cursor-pointer transition-colors"
                  title="Secure lock screen"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>
          </header>

          {/* Core App Body Container */}
          <main className="flex-1 overflow-y-auto custom-scrollbar w-full max-w-[1920px] mx-auto px-4 md:px-8 py-4 sm:py-6 space-y-6">
            
            {/* Primary Navigation Hub (Staff Navigation Tabs) *) */}
            {currentUser?.role === 'dummy_admin' ? (
              <nav className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs font-sans print:hidden">
                <button
                  onClick={() => setActiveView('settings')}
                  className="px-4 py-2 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer bg-indigo-600 text-white border-indigo-700 shadow-sm"
                >
                  <Printer className="h-4.5 w-4.5" />
                  <span>Printer Setup (Hardware Panel Only)</span>
                </button>
              </nav>
            ) : (
              <nav className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-sky-100 text-xs print:hidden">
                {isViewPermitted('dashboard', currentUser) && (
                  <button
                    onClick={() => setActiveView('dashboard')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'dashboard' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <LayoutDashboard className="h-4.5 w-4.5 text-sky-500" />
                    <span>Executive Dashboard</span>
                  </button>
                )}

                {isViewPermitted('pos', currentUser) && (
                  <button
                    onClick={() => setActiveView('pos')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'pos' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Warehouse className="h-4.5 w-4.5 text-sky-500" />
                    <span>POS Terminal checkout</span>
                  </button>
                )}

                {isViewPermitted('appointments', currentUser) && (
                  <button
                    onClick={() => setActiveView('appointments')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'appointments' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Calendar className="h-4.5 w-4.5 text-sky-500" />
                    <span>Scheduling Planner</span>
                  </button>
                )}

                {isViewPermitted('records', currentUser) && (
                  <button
                    onClick={() => setActiveView('records')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'records' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <FileHeart className="h-4.5 w-4.5 text-sky-500" />
                    <span>EHR Health Charts</span>
                  </button>
                )}

                {isViewPermitted('inventory', currentUser) && (
                  <button
                    onClick={() => setActiveView('inventory')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'inventory' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Warehouse className="h-4.5 w-4.5 text-sky-500" />
                    <span>Item & Shop Stock</span>
                  </button>
                )}

                {isViewPermitted('reminders', currentUser) && (
                  <button
                    onClick={() => setActiveView('reminders')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'reminders' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <AlertTriangle className="h-4.5 w-4.5 text-sky-500" />
                    <span>Hospital Reminders</span>
                    {alerts.filter(a => !a.read).length > 0 && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                    )}
                  </button>
                )}

                {isViewPermitted('portal', currentUser) && (
                  <button
                    onClick={() => setActiveView('portal')}
                    className={`px-4 py-2 bg-white rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ${
                      activeView === 'portal' ? 'border-sky-500 text-sky-800 shadow-sm bg-sky-50/20' : 'border-slate-100 hover:bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Smartphone className="h-4.5 w-4.5 text-sky-500" />
                    <span>Pet Parent Portal</span>
                  </button>
                )}

                {isViewPermitted('settings', currentUser) && (
                  <button
                    onClick={() => setActiveView('settings')}
                    className={`px-4 py-2 rounded-xl border flex items-center gap-1.5 font-bold cursor-pointer transition-all ml-auto ${
                      activeView === 'settings' 
                        ? 'border-indigo-500 text-indigo-800 shadow-sm bg-indigo-50/30' 
                        : 'border-slate-100 hover:bg-slate-100 text-slate-500 bg-white'
                    }`}
                  >
                    <Lock className={`h-4.5 w-4.5 font-bold ${activeView === 'settings' ? 'text-indigo-600' : 'text-indigo-500'}`} />
                    <span>{systemConfig.appName} Settings</span>
                  </button>
                )}
              </nav>
            )}

            {/* Render selected subview panel */}
            <div className="animate-fade-in">
              {activeView === 'dashboard' && isViewPermitted('dashboard', currentUser) && (
                <DashboardAnalytics 
                  inventory={inventory}
                  appointments={appointments}
                  records={records}
                  invoices={invoices}
                  onTriggerSync={triggerAutoSynchronize}
                  isOnline={isOnline}
                  syncQueueLength={syncQueue.length}
                  systemConfig={systemConfig}
                  currentUser={currentUser}
                />
              )}

              {activeView === 'pos' && isViewPermitted('pos', currentUser) && (() => {
                const { masterPin, dummyAdminPin, ...safeSystemConfig } = systemConfig;
                return (
                  <POSRegister
                    inventory={inventory}
                    appointments={appointments}
                    records={records}
                    isOnline={isOnline}
                    currentUser={currentUser}
                    invoices={invoices}
                    onUpdateStock={handleUpdateStock}
                    onAddInvoice={handleAddInvoice}
                    onVoidInvoice={handleVoidInvoice}
                    systemConfig={safeSystemConfig}
                    onVerifyMasterPin={handleVerifyMasterPin}
                    onTriggerInventorySync={triggerAutoSynchronize}
                  />
                );
              })()}

              {activeView === 'appointments' && isViewPermitted('appointments', currentUser) && (
                <AppointmentsManager
                  appointments={appointments}
                  records={records}
                  isOnline={isOnline}
                  onAddAppointment={handleAddAppointment}
                  onUpdateStatus={handleUpdateAppointmentStatus}
                  onAddRecord={handleAddRecord}
                />
              )}

              {activeView === 'records' && isViewPermitted('records', currentUser) && (
                <MedicalRecordsManager
                  records={records}
                  inventory={inventory}
                  isOnline={isOnline}
                  onUpdateRecord={handleUpdateRecord}
                  onDeleteRecord={handleDeleteRecord}
                  users={users}
                  onAddRecord={handleAddEHRRecord => {
                    handleAddRecord(handleAddEHRRecord);
                    const mockAlert: SystemAlert = {
                      id: `al-add-rec-${Date.now()}`,
                      severity: 'info',
                      category: 'system',
                      message: `New EHR Profile Assembled: ${handleAddEHRRecord.petName} has been fully registered inside the cloud EHR under phone ${handleAddEHRRecord.ownerPhone}`,
                      timestamp: new Date().toISOString(),
                      read: false
                    };
                    setAlerts(prev => [mockAlert, ...prev]);
                  }}
                  systemConfig={systemConfig}
                />
              )}

              {activeView === 'inventory' && isViewPermitted('inventory', currentUser) && (
                <InventoryManager
                  inventory={inventory}
                  onAddProduct={handleAddProduct}
                  onUpdateStock={handleUpdateStock}
                  onUpdatePrice={handleUpdatePrice}
                  onUpdateInventory={setInventory}
                  systemConfig={systemConfig}
                />
              )}

              {activeView === 'reminders' && isViewPermitted('reminders', currentUser) && (
                <NotificationsModal
                  notifications={notifications}
                  alerts={alerts}
                  onDismissAlert={handleDismissAlert}
                  onSendNotification={handleSendNotification}
                />
              )}

              {activeView === 'portal' && isViewPermitted('portal', currentUser) && (
                <PatientPortal
                  records={records}
                  appointments={appointments}
                  isOnline={isOnline}
                  onBookAppointment={(apt) => {
                    handleAddAppointment(apt);
                    const portalAlert: SystemAlert = {
                      id: `al-pt-${Date.now()}`,
                      severity: 'info',
                      category: 'appointment',
                      message: `Portal Action: New Consultation Request logged from ${apt.ownerName} for ${apt.petName}. Reason: ${apt.reason}`,
                      timestamp: new Date().toISOString(),
                      read: false
                    };
                    setAlerts(prev => [portalAlert, ...prev]);
                  }}
                  systemConfig={systemConfig}
                />
              )}

              {activeView === 'settings' && isViewPermitted('settings', currentUser) && (() => {
                const { masterPin, dummyAdminPin, ...safeSystemConfig } = systemConfig;
                return (
                  <SystemSettings
                    config={safeSystemConfig}
                    onChangeConfig={setSystemConfig}
                    users={users.map(({ pin, ...safeU }) => safeU)}
                    onForceCloudSync={handleForceCloudSync}
                    onRefreshUsers={hydrateUsers}
                    onAddUser={(user) => {
                      const { pin, ...safeUser } = user;
                      if (pin) {
                        setPinCache(prev => ({ ...prev, [user.username]: pin }));
                      }
                      setUsers(prev => [...prev, safeUser]);
                      showToast(`User ${safeUser.name} added successfully.`);
                    }}
                    onRemoveUser={(id) => {
                      setUsers(prev => prev.filter(u => u.id !== id));
                      showToast('User removed.');
                    }}
                    inventory={inventory}
                    invoices={invoices}
                    currentUser={currentUser}
                    onUpdateInventory={(newInv) => setInventory(newInv)}
                    onRestoreSnapshot={handleRestoreSnapshot}
                    onPurgeDatabases={handlePurgeDatabases}
                    onHardReboot={handleHardReboot}
                  />
                );
              })()}
            </div>
          </main>

        </>
      )}
      <ToastContainer />
    </div>
  );
}
