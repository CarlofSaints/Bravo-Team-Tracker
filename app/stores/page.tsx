'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface StoreRow {
  id: string; name: string; area: string; channelId: string; regionId: string;
  teamId: string; repUserId: string | null; perigeeStoreCode: string; perigeeStoreName: string;
}
interface ChannelRow { id: string; name: string }
interface TeamRow { id: string; name: string }
interface RegionRow { id: string; name: string }

export default function StoresPage() {
  const { session, loading, logout } = useAuth();

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editPName, setEditPName] = useState('');
  const [savingMatch, setSavingMatch] = useState(false);

  const reload = useCallback(() => {
    setFetching(true);
    Promise.all([
      authFetch('/api/stores', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/channels', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/regions', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([s, c, t, r]) => {
      setStores(Array.isArray(s) ? s : []);
      setChannels(Array.isArray(c) ? c : []);
      setTeams(Array.isArray(t) ? t : []);
      setRegions(Array.isArray(r) ? r : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, []);

  useEffect(() => {
    if (!session) return;
    reload();
  }, [session, reload]);

  // Score
  const totalStores = stores.length;
  const mapped = stores.filter(s => s.perigeeStoreCode !== 'Not Mapped').length;
  const pct = totalStores > 0 ? Math.round((mapped / totalStores) * 100) : 0;

  // Lookup maps
  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    channels.forEach(c => { m[`ch:${c.id}`] = c.name; });
    teams.forEach(t => { m[`tm:${t.id}`] = t.name; });
    regions.forEach(r => { m[`rg:${r.id}`] = r.name; });
    return m;
  }, [channels, teams, regions]);

  // Filtered
  const filtered = useMemo(() => {
    return stores.filter(s => {
      if (filterChannel && s.channelId !== filterChannel) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.perigeeStoreCode.toLowerCase().includes(q) &&
            !(nameMap[`ch:${s.channelId}`] || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stores, filterChannel, search, nameMap]);

  // Channel breakdown
  const channelBreakdown = useMemo(() => {
    const map: Record<string, { total: number; matched: number; name: string }> = {};
    for (const s of stores) {
      const key = s.channelId;
      if (!map[key]) map[key] = { total: 0, matched: 0, name: nameMap[`ch:${key}`] || 'Unknown' };
      map[key].total++;
      if (s.perigeeStoreCode !== 'Not Mapped') map[key].matched++;
    }
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [stores, nameMap]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setUploadMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await authFetch('/api/stores/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setUploadMsg(data.error || 'Upload failed'); }
      else { setUploadMsg(`Added ${data.addedStores} stores, ${data.addedChannels} new channels`); reload(); }
    } catch { setUploadMsg('Connection error'); }
    finally { setUploading(false); e.target.value = ''; }
  }

  function startEdit(s: StoreRow) {
    setEditingId(s.id);
    setEditCode(s.perigeeStoreCode === 'Not Mapped' ? '' : s.perigeeStoreCode);
    setEditPName(s.perigeeStoreName);
  }

  async function saveEdit(storeId: string) {
    setSavingMatch(true);
    try {
      await authFetch(`/api/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          perigeeStoreCode: editCode.trim() || 'Not Mapped',
          perigeeStoreName: editPName.trim(),
        }),
      });
      // Update local state
      setStores(prev => prev.map(s => s.id === storeId ? {
        ...s,
        perigeeStoreCode: editCode.trim() || 'Not Mapped',
        perigeeStoreName: editPName.trim(),
      } : s));
      setEditingId(null);
    } catch { /* ignore */ }
    finally { setSavingMatch(false); }
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  // Score circle color
  const scoreColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Stores & Channels</h1>

        {/* Score circle + upload */}
        <div className="flex flex-wrap gap-6 items-center mb-6">
          {/* Score circle */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-5">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 100 100" className="w-24 h-24 -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold" style={{ color: scoreColor }}>{pct}%</span>
              </div>
            </div>
            <div>
              <div className="text-lg font-bold text-[var(--color-navy)]">Perigee Match</div>
              <div className="text-sm text-gray-500">{mapped} / {totalStores} stores mapped</div>
            </div>
          </div>

          {/* Upload */}
          {session.role === 'admin' && (
            <div className="bg-white rounded-lg border border-gray-200 p-5 flex-1 min-w-[250px]">
              <div className="text-sm font-medium text-gray-700 mb-2">Upload Stores Excel</div>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} disabled={uploading} className="text-sm" />
              {uploading && <div className="text-xs text-gray-400 mt-1">Uploading...</div>}
              {uploadMsg && <div className="text-xs text-green-600 mt-1">{uploadMsg}</div>}
            </div>
          )}
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white">
              <option value="">All</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Store name, code..." className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm" />
          </div>
        </div>

        {/* Stores grid */}
        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading stores...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    <th className="px-3 py-2 font-medium">Store Name</th>
                    <th className="px-3 py-2 font-medium">Area</th>
                    <th className="px-3 py-2 font-medium">Channel</th>
                    <th className="px-3 py-2 font-medium">Team</th>
                    <th className="px-3 py-2 font-medium">Perigee Code</th>
                    <th className="px-3 py-2 font-medium">Perigee Name</th>
                    <th className="px-3 py-2 font-medium w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No stores found</td></tr>
                  ) : (
                    filtered.slice(0, 300).map(s => (
                      <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium">{s.name}</td>
                        <td className="px-3 py-2 text-gray-600">{s.area}</td>
                        <td className="px-3 py-2">{nameMap[`ch:${s.channelId}`] || '—'}</td>
                        <td className="px-3 py-2">{nameMap[`tm:${s.teamId}`] || '—'}</td>
                        {editingId === s.id ? (
                          <>
                            <td className="px-2 py-1">
                              <input value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Store code" />
                            </td>
                            <td className="px-2 py-1">
                              <input value={editPName} onChange={e => setEditPName(e.target.value)} className="w-full px-2 py-1 border border-gray-300 rounded text-sm" placeholder="Store name" />
                            </td>
                            <td className="px-2 py-1">
                              <div className="flex gap-1">
                                <button onClick={() => saveEdit(s.id)} disabled={savingMatch} className="p-1 text-green-600 hover:text-green-800">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                </button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className={`px-3 py-2 ${s.perigeeStoreCode === 'Not Mapped' ? 'text-red-500 font-medium' : ''}`}>
                              {s.perigeeStoreCode}
                            </td>
                            <td className="px-3 py-2 text-gray-600">{s.perigeeStoreName || '—'}</td>
                            <td className="px-3 py-2">
                              <button onClick={() => startEdit(s)} className="p-1 text-gray-400 hover:text-[var(--color-navy)]">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {filtered.length > 300 && (
              <div className="px-3 py-2 text-xs text-gray-400 border-t">Showing 300 of {filtered.length} stores</div>
            )}
          </div>
        )}

        {/* Channel breakdown */}
        {channelBreakdown.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-bold text-[var(--color-navy)]">Channel Breakdown</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="px-3 py-2 font-medium">Channel</th>
                  <th className="px-3 py-2 font-medium text-right">Total Stores</th>
                  <th className="px-3 py-2 font-medium text-right">Matched</th>
                  <th className="px-3 py-2 font-medium text-right">% Match</th>
                </tr>
              </thead>
              <tbody>
                {channelBreakdown.map(cb => {
                  const p = cb.total > 0 ? Math.round((cb.matched / cb.total) * 100) : 0;
                  return (
                    <tr key={cb.name} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{cb.name}</td>
                      <td className="px-3 py-2 text-right">{cb.total}</td>
                      <td className="px-3 py-2 text-right">{cb.matched}</td>
                      <td className="px-3 py-2 text-right">
                        <span className={`font-medium ${p >= 80 ? 'text-green-600' : p >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p}%</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}
