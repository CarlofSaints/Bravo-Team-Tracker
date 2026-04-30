'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Session, avatarSrcFor } from '@/lib/useAuth';

const COLLAPSE_KEY = 'bravo_sidebar_collapsed';
const CC_EXPAND_KEY = 'bravo_cc_expanded';

interface SidebarProps {
  session: Session;
  onLogout: () => void;
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-[var(--color-accent)] text-[var(--color-navy)]'
          : 'text-gray-300 hover:bg-white/10 hover:text-white'
      }`}
    >
      {label}
    </Link>
  );
}

function ProLink({ label }: { label: string }) {
  return (
    <Link
      href="/pro"
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-gray-500 hover:bg-white/5 transition-colors"
    >
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
      <span className="truncate">{label}</span>
      <span className="ml-auto text-[10px] font-bold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded flex-shrink-0">PRO</span>
    </Link>
  );
}

export default function Sidebar({ session, onLogout }: SidebarProps) {
  const pathname = usePathname();
  const isAdmin = session.role === 'admin';
  const [collapsed, setCollapsed] = useState(false);
  const [ccExpanded, setCcExpanded] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === '1');
    setCcExpanded(localStorage.getItem(CC_EXPAND_KEY) !== '0');
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('sidebar-collapsed', collapsed);
    try { localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0'); } catch { /* empty */ }
  }, [collapsed]);

  useEffect(() => {
    try { localStorage.setItem(CC_EXPAND_KEY, ccExpanded ? '1' : '0'); } catch { /* empty */ }
  }, [ccExpanded]);

  return (
    <>
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Open menu"
          className="fixed top-3 left-3 z-50 w-9 h-9 rounded-md bg-white text-gray-600 border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      <aside
        className={`w-64 bg-[var(--color-navy)] min-h-screen flex flex-col fixed left-0 top-0 z-40 transition-transform duration-200 ${
          collapsed ? '-translate-x-full' : 'translate-x-0'
        }`}
      >
        {/* Logo + collapse */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Image src="/images/bravo-logo-white.png" alt="Bravo Brands" width={120} height={40} className="h-8 w-auto" />
          </div>
          <button
            onClick={() => setCollapsed(true)}
            aria-label="Collapse menu"
            className="text-gray-400 hover:text-white p-1.5 rounded hover:bg-white/10 transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* User info */}
        <Link
          href="/account"
          className={`px-5 py-3 border-b border-white/10 flex items-center gap-3 transition-colors ${
            pathname === '/account' ? 'bg-white/10' : 'hover:bg-white/5'
          }`}
        >
          {avatarSrcFor(session.id, session.profilePicKey) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarSrcFor(session.id, session.profilePicKey)!}
              alt={session.name}
              className="w-10 h-10 rounded-full object-cover border border-white/20 flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[var(--color-accent)] text-[var(--color-navy)] flex items-center justify-center font-bold text-sm flex-shrink-0">
              {`${(session.name?.[0] ?? '').toUpperCase()}${(session.surname?.[0] ?? '').toUpperCase()}` || '?'}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-medium truncate">{session.name} {session.surname}</div>
            <div className="text-gray-400 text-xs truncate capitalize">{session.role.replace('_', ' ')}</div>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          <NavLink href="/" label="Dashboard" active={pathname === '/'} />
          <NavLink href="/leaderboard" label="Leaderboard" active={pathname === '/leaderboard'} />

          {isAdmin && (
            <div className="mt-1">
              <button
                onClick={() => setCcExpanded(p => !p)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  ['/channels', '/teams', '/regions', '/stores'].includes(pathname)
                    ? 'bg-white/10 text-white'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Control Centre
                <svg
                  className={`w-3.5 h-3.5 transition-transform ${ccExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {ccExpanded && (
                <div className="ml-3 mt-0.5 flex flex-col gap-0.5 border-l border-white/10 pl-2">
                  <NavLink href="/channels" label="Channels" active={pathname === '/channels'} />
                  <NavLink href="/teams" label="Teams" active={pathname === '/teams'} />
                  <NavLink href="/regions" label="Regions" active={pathname === '/regions'} />
                  <NavLink href="/stores" label="Store Mapper" active={pathname === '/stores'} />
                </div>
              )}
            </div>
          )}

          {!isAdmin && <NavLink href="/stores" label="Store Mapper" active={pathname === '/stores'} />}
          {isAdmin && <NavLink href="/users" label="Users" active={pathname === '/users'} />}
          <NavLink href="/account" label="Account" active={pathname === '/account'} />

          {/* Pro upsell items */}
          <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-0.5">
            <ProLink label="Team Scores" />
            <ProLink label="Sales Data" />
            <ProLink label="Messaging" />
            <ProLink label="Incentives" />
            <ProLink label="Training" />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-white/10 flex flex-col gap-2">
          <button
            onClick={onLogout}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-white/10 hover:text-white transition-colors text-left"
          >
            Sign Out
          </button>
          <div className="px-4 text-[10px] text-gray-500">
            Powered by OuterJoin
          </div>
        </div>
      </aside>
    </>
  );
}
