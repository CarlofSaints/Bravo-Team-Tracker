'use client';

import { useEffect, useState } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface Team {
  id: string;
  name: string;
  iconKey: string | null;
  members: string[];
  createdAt: string;
}

interface UserRow { id: string; name: string; surname: string; teamId: string | null }

export default function TeamsPage() {
  const { session, loading, logout } = useAuth('admin');

  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    reload();
  }, [session]);

  function reload() {
    setFetching(true);
    Promise.all([
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/users', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([t, u]) => {
      setTeams(Array.isArray(t) ? t : []);
      setUsers(Array.isArray(u) ? u : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }

  function openCreate() {
    setEditId(null);
    setFormName('');
    setIconFile(null);
    setError('');
    setShowForm(true);
  }

  function openEdit(team: Team) {
    setEditId(team.id);
    setFormName(team.name);
    setIconFile(null);
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim()) { setError('Name required'); return; }
    setSaving(true);
    setError('');

    try {
      if (editId) {
        const fd = new FormData();
        fd.append('name', formName.trim());
        if (iconFile) fd.append('icon', iconFile);

        const res = await authFetch(`/api/teams/${editId}`, { method: 'PUT', body: fd });
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
      } else {
        const res = await authFetch('/api/teams', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim() }),
        });
        if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
      }
      setShowForm(false);
      reload();
    } catch {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this team?')) return;
    await authFetch(`/api/teams/${id}`, { method: 'DELETE' });
    reload();
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Teams</h1>
          <button onClick={openCreate} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors">
            + New Team
          </button>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">{editId ? 'Edit Team' : 'New Team'}</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
                </div>
                {editId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team Icon</label>
                    <input type="file" accept="image/*" onChange={e => setIconFile(e.target.files?.[0] ?? null)} className="text-sm" />
                  </div>
                )}
                {error && <div className="text-red-600 text-sm">{error}</div>}
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading teams...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map(team => {
              const memberUsers = users.filter(u => u.teamId === team.id);
              return (
                <div key={team.id} className="bg-white rounded-lg border border-gray-200 p-5">
                  <div className="flex items-center gap-3 mb-3">
                    {team.iconKey ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/teams/${team.id}/icon`} alt={team.name} className="w-10 h-10 rounded-lg object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-[var(--color-accent)] text-[var(--color-navy)] flex items-center justify-center font-bold text-sm">
                        {team.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-[var(--color-navy)]">{team.name}</div>
                      <div className="text-xs text-gray-500">{memberUsers.length} member{memberUsers.length !== 1 ? 's' : ''}</div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(team)} className="p-1.5 text-gray-400 hover:text-[var(--color-navy)] rounded hover:bg-gray-100">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                      </button>
                      <button onClick={() => handleDelete(team.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      </button>
                    </div>
                  </div>
                  {memberUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {memberUsers.map(u => (
                        <span key={u.id} className="px-2 py-0.5 bg-[var(--color-accent)] text-[var(--color-navy)] rounded text-xs font-medium">
                          {u.name} {u.surname}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
