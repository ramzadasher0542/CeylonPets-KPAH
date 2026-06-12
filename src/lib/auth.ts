import { User } from '../types';
import { SystemConfig } from '../components/SystemSettings';

function getCachedUsers(): User[] {
  try {
    const raw = localStorage.getItem('ceylon_users_v3');
    if (raw) return JSON.parse(raw);
  } catch {}

  const initialStaffState: User[] = [
    { name: 'System Administrator', username: 'admin', role: 'admin', pin: '5692', id: 'usr-admin-master', avatarColor: 'bg-indigo-100' }
  ];
  localStorage.setItem('ceylon_users_v3', JSON.stringify(initialStaffState));
  return initialStaffState;
}

function getCachedSystemConfig(): SystemConfig | null {
  try {
    const raw = localStorage.getItem('ceylon_system_config_v2');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function fetchStaffUsers(): Promise<User[]> {
  return getCachedUsers();
}

export async function upsertStaffUser(user: User, currentUser: User): Promise<void> {
  if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
    throw new Error('Unauthorized: Only administrators can modify staff records.');
  }
  const users = getCachedUsers();
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
  let users = getCachedUsers();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem('ceylon_users_v3', JSON.stringify(users));
}

export async function fetchSystemConfig(): Promise<SystemConfig | null> {
  return getCachedSystemConfig();
}

export async function upsertSystemConfig(config: SystemConfig, currentUser: User): Promise<void> {
  if (currentUser.role !== 'admin' && currentUser.role !== 'owner') {
    throw new Error('Unauthorized: Only administrators can update global configuration.');
  }
  localStorage.setItem('ceylon_system_config_v2', JSON.stringify(config));
}
