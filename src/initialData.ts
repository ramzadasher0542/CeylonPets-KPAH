/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from './types';

export const DEFAULT_USERS: User[] = [
  {
    id: 'usr-1',
    name: 'Dr. Kandy Cruz, DVM',
    username: 'drkandy',
    role: 'owner',
    avatarColor: 'bg-emerald-100 text-emerald-800 border-emerald-300'
  },
  {
    id: 'usr-2',
    name: 'Dr. Dave Assistant, DVM',
    username: 'drdave',
    role: 'veterinarian',
    avatarColor: 'bg-blue-100 text-blue-800 border-blue-300'
  },
  {
    id: 'usr-3',
    name: 'Samantha Pierce (Reception)',
    username: 'samantha',
    role: 'cashier',
    avatarColor: 'bg-amber-100 text-amber-800 border-amber-300'
  }
];
