'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Session {
  id: string;
  username: string;
  name: string;
  surname: string;
  email: string;
  role: 'admin' | 'team_manager' | 'ops_support' | 'rep';
  teamId: string | null;
  forcePasswordChange: boolean;
  profilePicKey: string | null;
}

const SESSION_KEY = 'bravo_session';

export function useAuth(requiredRole?: string | string[]) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      router.replace('/login');
      return;
    }
    try {
      const s: Session = JSON.parse(raw);
      if (s.forcePasswordChange) {
        router.replace('/account?change-password=1');
        setLoading(false);
        return;
      }
      if (requiredRole) {
        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        if (!roles.includes(s.role)) {
          router.replace('/');
          setLoading(false);
          return;
        }
      }
      setSession(s);
    } catch {
      localStorage.removeItem(SESSION_KEY);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  }, [router, requiredRole]);

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    router.push('/login');
  }

  return { session, loading, logout, setSession };
}

export function updateSession(patch: Partial<Session>): Session | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const current = JSON.parse(raw) as Session;
    const next = { ...current, ...patch };
    localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  let userId = '';
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const s = JSON.parse(raw) as Partial<Session>;
        userId = s?.id ?? '';
      }
    } catch { /* ignore */ }
  }

  const headers = new Headers(init.headers);
  if (userId) headers.set('x-user-id', userId);

  return fetch(input, { ...init, headers });
}

export function avatarSrcFor(userId: string, profilePicKey: string | null | undefined): string | undefined {
  if (!profilePicKey) return undefined;
  return `/api/users/${encodeURIComponent(userId)}/avatar?t=${encodeURIComponent(profilePicKey)}`;
}
