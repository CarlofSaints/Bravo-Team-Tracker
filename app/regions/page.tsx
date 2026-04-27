'use client';

import { useEffect, useState } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface RegionRow { id: string; name: string; teamIds: string[] }
interface TeamRow { id: string; name: string }

export default function RegionsPage() {
  const { session, loading, logout } = useAuth('admin');

  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formTeamIds, setFormTeamIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!session) return;
    reload();
  }, [session]);

  function reload() {
    setFetching(true);
    Promise.all([
      authFetch('/api/regions', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([r, t]) => {
      setRegions(Array.isArray(r) ? r : []);
      setTeams(Array.isArray(t) ? t : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }

  function openCreate() {
    setEditId(null); setFormName(''); setFormTeamIds([]); setError(''); setShowForm(true);
  }

  function openEdit(r: RegionRow) {
    setEditId(r.id); setFormName(r.name); setFormTeamIds([...r.teamIds]); setError(''); setShowForm(true);
  }

  function toggleTeam(id: string) {
    setFormTeamIds(prev => prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]);
  }

  async function handleSave() {
    if (!formName.trim()) { setError('Name required'); return; }
    setSaving(true); setError('');
    try {
      const body = { name: formName.trim(), teamIds: formTeamIds };
      const url = editId ? `/api/regions/${editId}` : '/api/regions';
      const method = editId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
      setShowForm(false);
      reload();
    } catch { setError('Connection error'); } finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this region?')) return;
    await authFetch(`/api/regions/${id}`, { method: 'DELETE' });
    reload();
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const teamName = (id: string) => teams.find(t => t.id === id)?.name || id;

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Regions</h1>
          <button onClick={openCreate} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors">
            + New Region
          </button>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">{editId ? 'Edit Region' : 'New Region'}</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Region Name</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Teams</label>
                  <div className="flex flex-wrap gap-2">
                    {teams.map(t => (
                      <button
                        key={t.id}
                        onClick={() => toggleTeam(t.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                          formTeamIds.includes(t.id)
                            ? 'bg-[var(--color-navy)] text-white border-[var(--color-navy)]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[var(--color-navy)]'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
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
          <div className="text-center text-gray-400 py-12">Loading regions...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--color-navy)] text-white text-left">
                  <th className="px-3 py-2 font-medium">Region</th>
                  <th className="px-3 py-2 font-medium">Teams</th>
                  <th className="px-3 py-2 font-medium w-20">Actions</th>
                </tr>
              </thead>
              <tbody>
                {regions.map(r => (
                  <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.teamIds.map(tid => (
                          <span key={tid} className="px-2 py-0.5 bg-[var(--color-accent)] text-[var(--color-navy)] rounded text-xs font-medium">
                            {teamName(tid)}
                          </span>
                        ))}
                        {r.teamIds.length === 0 && <span className="text-gray-400">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(r)} className="p-1 text-gray-400 hover:text-[var(--color-navy)]">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1 text-gray-400 hover:text-red-600">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
