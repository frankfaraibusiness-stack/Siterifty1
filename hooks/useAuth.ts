'use client';
// hooks/useAuth.ts
//
// No real Firebase session here on purpose — this app uses Admin SDK on
// the server for signup only (createUser + Firestore profile), so the
// service-account key never reaches the browser. The client just keeps a
// local record of who signed up most recently, for attaching demo events
// to a stable uid. This is NOT an authenticated session: anyone can clear
// localStorage or edit it directly. Fine for a test app generating data;
// do not reuse this pattern anywhere real auth/authorization matters.
import { useEffect, useState } from 'react';

export type LocalUser = { uid: string; name: string; email: string };

const STORAGE_KEY = 'testSaasUser';

function readStoredUser(): LocalUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.uid === 'string') return parsed as LocalUser;
    return null;
  } catch {
    return null;
  }
}

export function useAuth() {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setUser(readStoredUser());
    setLoading(false);
  }, []);

  async function signUp(name: string, email: string, password: string, visitorId?: string) {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, visitorId }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || 'Could not create your account.');
    const stored: LocalUser = { uid: data.uid, name: data.name, email: data.email };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    setUser(stored);
    return stored.uid;
  }

  function logOut() {
    localStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return { user, loading, signUp, logOut };
}
