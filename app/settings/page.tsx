'use client';

import { useEffect, useState } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  const { session, loading, logout } = useAuth('admin');

  const [mappingEmails, setMappingEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState('');

  // Perigee API settings
  const [visitSource, setVisitSource] = useState<'manual' | 'api'>('manual');
  const [perigeeApiUrl, setPerigeeApiUrl] = useState('');
  const [perigeeApiKey, setPerigeeApiKey] = useState('');
  const [apiMsg, setApiMsg] = useState('');
  const [apiSaving, setApiSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    authFetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setMappingEmails(d.mappingEmails || []);
        setVisitSource(d.visitSource || 'manual');
        setPerigeeApiUrl(d.perigeeApiUrl || '');
        setPerigeeApiKey(d.perigeeApiKey || '');
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [session]);

  async function save(emails: string[]) {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingEmails: emails }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const d = await res.json();
      setMappingEmails(d.mappingEmails || []);
      setMsg('Saved');
      setTimeout(() => setMsg(''), 2000);
    } catch {
      setMsg('Error saving');
    } finally {
      setSaving(false);
    }
  }

  async function saveApiSettings() {
    setApiSaving(true);
    setApiMsg('');
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitSource, perigeeApiUrl, perigeeApiKey }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const d = await res.json();
      setVisitSource(d.visitSource || 'manual');
      setPerigeeApiUrl(d.perigeeApiUrl || '');
      setPerigeeApiKey(d.perigeeApiKey || '');
      setApiMsg('Saved');
      setTimeout(() => setApiMsg(''), 2000);
    } catch {
      setApiMsg('Error saving');
    } finally {
      setApiSaving(false);
    }
  }

  function handleAdd() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (mappingEmails.includes(email)) {
      setNewEmail('');
      return;
    }
    const updated = [...mappingEmails, email];
    setMappingEmails(updated);
    setNewEmail('');
    save(updated);
  }

  function handleRemove(email: string) {
    const updated = mappingEmails.filter(e => e !== email);
    setMappingEmails(updated);
    save(updated);
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Settings</h1>

        {/* Mapping Emails Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Mapping Email Recipients</h2>
          <p className="text-sm text-gray-500 mb-4">
            These email addresses are used when a user clicks &quot;Email Support&quot; on the Store Mapper page to request a store be added to Perigee.
          </p>

          {fetching ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              {/* Email list */}
              <div className="flex flex-col gap-2 mb-4">
                {mappingEmails.length === 0 && (
                  <div className="text-sm text-gray-400 italic">No email addresses configured</div>
                )}
                {mappingEmails.map(email => (
                  <div key={email} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => handleRemove(email)}
                      disabled={saving}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              {/* Add new */}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                  placeholder="Add email address..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
                />
                <button
                  onClick={handleAdd}
                  disabled={saving || !newEmail.trim()}
                  className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {msg && (
                <div className={`text-xs mt-2 font-medium ${msg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Perigee API Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl mt-6">
          <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Visit Data Source</h2>
          <p className="text-sm text-gray-500 mb-4">
            Choose how visit data is ingested. Manual upload uses drag-and-drop Excel files. API mode polls the Perigee API automatically.
          </p>

          {fetching ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setVisitSource('manual')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
                    visitSource === 'manual'
                      ? 'border-[var(--color-navy)] bg-[var(--color-navy)]/5 text-[var(--color-navy)]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Manual Upload
                </button>
                <button
                  onClick={() => setVisitSource('api')}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium border-2 transition-all ${
                    visitSource === 'api'
                      ? 'border-[var(--color-navy)] bg-[var(--color-navy)]/5 text-[var(--color-navy)]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  Perigee API
                </button>
              </div>

              {visitSource === 'api' && (
                <div className="flex flex-col gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">API URL</label>
                    <input
                      type="url"
                      value={perigeeApiUrl}
                      onChange={e => setPerigeeApiUrl(e.target.value)}
                      placeholder="https://api.perigeeapp.co.za/v1/visits"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">API Key</label>
                    <input
                      type="password"
                      value={perigeeApiKey}
                      onChange={e => setPerigeeApiKey(e.target.value)}
                      placeholder="Enter API key..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
                    />
                  </div>
                  <p className="text-[10px] text-amber-600 font-medium">
                    Perigee API integration is not yet active. Configure credentials now so it&apos;s ready to switch on when available.
                  </p>
                </div>
              )}

              <button
                onClick={saveApiSettings}
                disabled={apiSaving}
                className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
              >
                {apiSaving ? 'Saving...' : 'Save'}
              </button>

              {apiMsg && (
                <span className={`text-xs ml-3 font-medium ${apiMsg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
                  {apiMsg}
                </span>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
