'use client';

import { useEffect, useState } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface UserRow {
  id: string; username: string; name: string; surname: string; email: string;
  role: string; teamId: string | null; forcePasswordChange: boolean; profilePicKey: string | null;
}
interface TeamRow { id: string; name: string }

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'team_manager', label: 'Team Manager' },
  { value: 'ops_support', label: 'Ops Support' },
  { value: 'rep', label: 'Rep' },
];

export default function UsersPage() {
  const { session, loading, logout } = useAuth('admin');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Form fields
  const [fUsername, setFUsername] = useState('');
  const [fName, setFName] = useState('');
  const [fSurname, setFSurname] = useState('');
  const [fEmail, setFEmail] = useState('');
  const [fPassword, setFPassword] = useState('');
  const [fRole, setFRole] = useState('rep');
  const [fTeamId, setFTeamId] = useState('');
  const [fForceChange, setFForceChange] = useState(true);

  useEffect(() => {
    if (!session) return;
    reload();
  }, [session]);

  function reload() {
    setFetching(true);
    Promise.all([
      authFetch('/api/users', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([u, t]) => {
      setUsers(Array.isArray(u) ? u : []);
      setTeams(Array.isArray(t) ? t : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }

  function openCreate() {
    setEditId(null);
    setFUsername(''); setFName(''); setFSurname(''); setFEmail('');
    setFPassword(''); setFRole('rep'); setFTeamId(''); setFForceChange(true);
    setError('');
    setShowForm(true);
  }

  function openEdit(u: UserRow) {
    setEditId(u.id);
    setFUsername(u.username); setFName(u.name); setFSurname(u.surname); setFEmail(u.email);
    setFPassword(''); setFRole(u.role); setFTeamId(u.teamId || ''); setFForceChange(u.forcePasswordChange);
    setError('');
    setShowForm(true);
  }

  async function handleSave() {
    if (!fUsername.trim() || !fName.trim()) { setError('Username and name required'); return; }
    if (!editId && !fPassword) { setError('Password required for new user'); return; }
    setSaving(true); setError('');

    try {
      const body: Record<string, unknown> = {
        username: fUsername.trim(),
        name: fName.trim(),
        surname: fSurname.trim(),
        email: fEmail.trim(),
        role: fRole,
        teamId: fTeamId || null,
        forcePasswordChange: fForceChange,
      };
      if (fPassword) body.password = fPassword;

      const url = editId ? `/api/users/${editId}` : '/api/users';
      const method = editId ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); setSaving(false); return; }
      setShowForm(false);
      reload();
    } catch {
      setError('Connection error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this user?')) return;
    await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    reload();
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const teamName = (id: string | null) => teams.find(t => t.id === id)?.name || '—';

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Users</h1>
          <button onClick={openCreate} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors">
            + New User
          </button>
        </div>

        {/* Form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">{editId ? 'Edit User' : 'New User'}</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Username" value={fUsername} onChange={setFUsername} />
                <Field label="Name" value={fName} onChange={setFName} />
                <Field label="Surname" value={fSurname} onChange={setFSurname} />
                <Field label="Email" value={fEmail} onChange={setFEmail} type="email" />
                <Field label={editId ? 'New Password (blank = keep)' : 'Password'} value={fPassword} onChange={setFPassword} />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={fRole} onChange={e => setFRole(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]">
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                  <select value={fTeamId} onChange={e => setFTeamId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]">
                    <option value="">— None —</option>
                    {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <input type="checkbox" id="forceChange" checked={fForceChange} onChange={e => setFForceChange(e.target.checked)} className="rounded" />
                  <label htmlFor="forceChange" className="text-sm text-gray-700">Force password change on first login</label>
                </div>
              </div>
              {error && <div className="text-red-600 text-sm mt-3">{error}</div>}
              <div className="flex gap-2 justify-end mt-4">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        )}

        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading users...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    <th className="px-3 py-2 font-medium">Username</th>
                    <th className="px-3 py-2 font-medium">Name</th>
                    <th className="px-3 py-2 font-medium">Email</th>
                    <th className="px-3 py-2 font-medium">Role</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="px-3 py-2 font-medium w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{u.username}</td>
                      <td className="px-3 py-2">{u.name} {u.surname}</td>
                      <td className="px-3 py-2 text-gray-600">{u.email}</td>
                      <td className="px-3 py-2 capitalize">{u.role.replace('_', ' ')}</td>
                      <td className="px-3 py-2">{teamName(u.teamId)}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(u)} className="p-1 text-gray-400 hover:text-[var(--color-navy)]">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="p-1 text-gray-400 hover:text-red-600">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
    </div>
  );
}
