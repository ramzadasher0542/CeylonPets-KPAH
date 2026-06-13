import { User } from '../types';
import { SystemConfig } from '../components/SystemSettings';

export function fetchStaffRegistry(): User[] {
  try {
    const raw = localStorage.getItem('ceylon_users_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch (err) {
    console.error('[CeylonPets POS] Corrupted storage payload encountered during user registry parse:', err);
  }
  return [];
}

export function fetchSystemConfig(): SystemConfig {
  try {
    const raw = localStorage.getItem('ceylon_system_config_v3');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.error('[CeylonPets POS] Corrupted storage payload encountered during config parse:', err);
  }
  
  // Immutable constitutional fallback state to guarantee runtime continuity
  return {
    appName: 'Ceylon Pets POS',
    resellerName: 'Ash Point Solutions',
    hospitalName: 'Ceylon Pets Animal Hospital',
    hospitalAddress: 'Kandy, Sri Lanka',
    hospitalPhone: '+94 81 234 5678',
    hospitalEmail: 'contact@ceylonpets.lk',
    invoiceLogo: '🐾',
    invoiceFooterMessage: 'Thank you for choosing Ceylon Pets!',
    invoiceSubFooterMessage: '* OFFICIAL RECEIPT *',
    invoiceExtraFooterMessage: 'POWERED BY ASH POINT SOLUTIONS',
    posLogoUrl: '',
    taxRate: 0.0825,
    currencySymbol: 'Rs. ',
    masterPin: 'e4f165a2',
    selectedReceiptPrinter: '',
    selectedReportPrinter: '',
    receiptPaperSize: '58mm',
    connectionType: 'usb',
    autoPrintReceipt: true,
    localAutosaveInterval: 15,
    cloudEndpoint: '',
    cloudBackupSchedule: 'manual',
    cloudBackupEnabled: false,
    emailDigestEnabled: false,
    recipientEmails: [],
    digestSchedule: 'daily_end',
    rolePermissions: {
      cashier: [],
      veterinarian: [],
      admin: [],
      owner: []
    }
  };
}

export async function fetchStaffUsers(): Promise<User[]> {
  return fetchStaffRegistry();
}

export async function upsertStaffUser(user: User, currentUser: User): Promise<void> {
  if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
    throw new Error('Unauthorized: Only administrators can modify staff records.');
  }
  const users = fetchStaffRegistry();
  const idx = users.findIndex(u => u.username === user.username || u.id === user.id);
  if (idx >= 0) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem('ceylon_users_v3', JSON.stringify(users));
}

export async function deleteStaffUser(userId: string, currentUser: User): Promise<void> {
  if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
    throw new Error('Unauthorized: Only administrators can delete staff records.');
  }
  let users = fetchStaffRegistry();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('ceylon_users_v3', JSON.stringify(users));
}

// Deprecated async wrapper - no longer needed since fetchSystemConfig provides synchronous immutable fallbacks

export async function upsertSystemConfig(config: SystemConfig, currentUser: User): Promise<void> {
  if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
    throw new Error('Unauthorized: Only administrators can update global configuration.');
  }
  localStorage.setItem('ceylon_system_config_v2', JSON.stringify(config));
}
