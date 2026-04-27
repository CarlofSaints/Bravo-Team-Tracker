'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, authFetch, updateSession, avatarSrcFor, Session } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

export default function AccountPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>}>
      <AccountPage />
    </Suspense>
  );
}

function AccountPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceChange = searchParams.get('change-password') === '1';

  const { session, loading, logout, setSession } = useAuth();

  const [name, setName] = useState('');
  const [surname, setSurname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwSaving, setPwSaving] = useState(false);

  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!session) return;
    setName(session.name);
    setSurname(session.surname);
    setUsername(session.username);
    setEmail(session.email);
  }, [session]);

  async function handleSave() {
    setSaving(true); setMsg('');
    try {
      const res = await authFetch('/api/account', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, surname, username, email }),
      });
      const data = await res.json();
      if (!res.ok) { setMsg(data.error || 'Failed'); setSaving(false); return; }
      updateSession({ name, surname, username, email });
      setSession(prev => prev ? { ...prev, name, surname, username, email } : prev);
      setMsg('Saved');
    } catch { setMsg('Connection error'); }
    finally { setSaving(false); }
  }

  async function handlePasswordChange() {
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match'); return; }
    if (newPw.length < 6) { setPwMsg('Password must be at least 6 characters'); return; }
    setPwSaving(true); setPwMsg('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: session?.id, currentPassword: currentPw, newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) { setPwMsg(data.error || 'Failed'); setPwSaving(false); return; }
      localStorage.setItem('bravo_session', JSON.stringify(data));
      setSession(data as Session);
      setPwMsg('Password changed');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      if (forceChange) router.replace('/');
    } catch { setPwMsg('Connection error'); }
    finally { setPwSaving(false); }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await authFetch('/api/account/avatar', { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok && data.profilePicKey) {
        updateSession({ profilePicKey: data.profilePicKey });
        setSession(prev => prev ? { ...prev, profilePicKey: data.profilePicKey } : prev);
      }
    } catch { /* ignore */ }
    finally { setAvatarUploading(false); e.target.value = ''; }
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (forceChange || session.forcePasswordChange) {
    return (
      <div className="min-h-screen bg-[var(--color-navy)] flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-2xl p-8">
          <h1 className="text-xl font-bold text-[var(--color-navy)] text-center mb-2">Change Password</h1>
          <p className="text-sm text-gray-500 text-center mb-6">You must change your password before continuing.</p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
            </div>
            {pwMsg && <div className="text-red-600 text-sm">{pwMsg}</div>}
            <button onClick={handlePasswordChange} disabled={pwSaving} className="w-full py-2.5 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50">
              {pwSaving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Account Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Profile */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">Profile</h2>

            <div className="flex items-center gap-4 mb-6">
              {avatarSrcFor(session.id, session.profilePicKey) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarSrcFor(session.id, session.profilePicKey)!} alt={session.name} className="w-16 h-16 rounded-full object-cover border-2 border-gray-200" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-[var(--color-accent)] text-[var(--color-navy)] flex items-center justify-center font-bold text-lg">
                  {`${(session.name?.[0] ?? '').toUpperCase()}${(session.surname?.[0] ?? '').toUpperCase()}`}
                </div>
              )}
              <div>
                <label className="px-3 py-1.5 bg-[var(--color-navy)] text-white rounded text-xs font-medium cursor-pointer hover:bg-[var(--color-navy-light)]">
                  {avatarUploading ? 'Uploading...' : 'Upload Photo'}
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={avatarUploading} />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input value={username} onChange={e => setUsername(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                <input value={surname} onChange={e => setSurname(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
            </div>

            {msg && <div className={`text-sm mt-3 ${msg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>{msg}</div>}
            <button onClick={handleSave} disabled={saving} className="mt-4 px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Change password */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">Change Password</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
              </div>
              {pwMsg && <div className={`text-sm ${pwMsg === 'Password changed' ? 'text-green-600' : 'text-red-600'}`}>{pwMsg}</div>}
              <button onClick={handlePasswordChange} disabled={pwSaving} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50 self-start">
                {pwSaving ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
