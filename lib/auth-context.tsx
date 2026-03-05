'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface StaffUser {
  id: string;
  name: string;
  pin: string;
  role: 'owner' | 'manager' | 'staff';
  location: string;
  active: boolean;
  createdAt: string;
}

interface AuthContextType {
  currentUser: StaffUser | null;
  isAuthenticated: boolean;
  login: (pin: string) => { success: boolean; error?: string };
  logout: () => void;
  users: StaffUser[];
  addUser: (user: Omit<StaffUser, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateUser: (id: string, updates: Partial<StaffUser>) => { success: boolean; error?: string };
  removeUser: (id: string) => { success: boolean; error?: string };
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'nola_park_users';
const SESSION_KEY = 'nola_park_session';

const DEFAULT_OWNER: StaffUser = {
  id: 'owner-001',
  name: 'Liffort Hobley',
  pin: '2445',
  role: 'owner',
  location: 'All Locations',
  active: true,
  createdAt: new Date().toISOString(),
};

function generateId(): string {
  return 'user-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<StaffUser[]>([DEFAULT_OWNER]);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);

  // Load users and session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as StaffUser[];
        // Ensure owner always exists with correct PIN
        const hasOwner = parsed.some((u) => u.id === 'owner-001');
        if (hasOwner) {
          // Update owner PIN to always be 2445
          const updated = parsed.map((u) =>
            u.id === 'owner-001' ? { ...u, pin: '2445', name: 'Liffort Hobley', role: 'owner' as const, active: true } : u
          );
          setUsers(updated);
        } else {
          setUsers([DEFAULT_OWNER, ...parsed]);
        }
      }

      const session = localStorage.getItem(SESSION_KEY);
      if (session) {
        const sessionUser = JSON.parse(session) as StaffUser;
        // Verify user still exists and is active
        const stored2 = localStorage.getItem(STORAGE_KEY);
        const allUsers = stored2 ? (JSON.parse(stored2) as StaffUser[]) : [DEFAULT_OWNER];
        const found = allUsers.find((u) => u.id === sessionUser.id && u.active);
        if (found) {
          setCurrentUser(found);
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      // If parsing fails, reset
      setUsers([DEFAULT_OWNER]);
    }
  }, []);

  // Persist users to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch {
      // Storage full or unavailable
    }
  }, [users]);

  const login = useCallback(
    (pin: string): { success: boolean; error?: string } => {
      const user = users.find((u) => u.pin === pin && u.active);
      if (!user) {
        return { success: false, error: 'Invalid PIN or account inactive' };
      }
      setCurrentUser(user);
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      } catch {
        // Ignore storage errors
      }
      return { success: true };
    },
    [users]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      // Ignore
    }
  }, []);

  const addUser = useCallback(
    (userData: Omit<StaffUser, 'id' | 'createdAt'>): { success: boolean; error?: string } => {
      // Check PIN uniqueness
      if (users.some((u) => u.pin === userData.pin)) {
        return { success: false, error: 'PIN already assigned to another user' };
      }
      // Validate PIN is 4 digits
      if (!/^\d{4}$/.test(userData.pin)) {
        return { success: false, error: 'PIN must be exactly 4 digits' };
      }
      // Don't allow creating another owner
      if (userData.role === 'owner') {
        return { success: false, error: 'Only one owner account is allowed' };
      }
      const newUser: StaffUser = {
        ...userData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setUsers((prev) => [...prev, newUser]);
      return { success: true };
    },
    [users]
  );

  const updateUser = useCallback(
    (id: string, updates: Partial<StaffUser>): { success: boolean; error?: string } => {
      // Cannot change owner's role or deactivate owner
      if (id === 'owner-001' && (updates.role || updates.active === false)) {
        return { success: false, error: 'Cannot modify owner role or deactivate owner account' };
      }
      // Check PIN uniqueness if PIN is being changed
      if (updates.pin) {
        if (!/^\d{4}$/.test(updates.pin)) {
          return { success: false, error: 'PIN must be exactly 4 digits' };
        }
        const pinConflict = users.some((u) => u.pin === updates.pin && u.id !== id);
        if (pinConflict) {
          return { success: false, error: 'PIN already assigned to another user' };
        }
      }
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...updates } : u)));
      return { success: true };
    },
    [users]
  );

  const removeUser = useCallback(
    (id: string): { success: boolean; error?: string } => {
      if (id === 'owner-001') {
        return { success: false, error: 'Cannot remove owner account' };
      }
      setUsers((prev) => prev.filter((u) => u.id !== id));
      return { success: true };
    },
    []
  );

  const isOwner = currentUser?.role === 'owner';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        login,
        logout,
        users,
        addUser,
        updateUser,
        removeUser,
        isOwner,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
