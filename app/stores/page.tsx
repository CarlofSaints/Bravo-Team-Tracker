'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface StoreRow {
  id: string; name: string; area: string; channelId: string; regionId: string;
  teamId: string; repUserId: string | null; perigeeStoreCode: string; perigeeStoreName: string;
}
interface ChannelRow { id: string; name: string }
interface TeamRow { id: string; name: string }
interface RegionRow { id: string; name: string }
interface PerigeeResult { code: string; name: string; channel: string; province: string }

/* ───── Drop Zone ───── */
function DropZone({ title, description, accept, uploading, message, messageType, onFile }: {
  title: string; description: string; accept: string;
  uploading: boolean; message: string; messageType: 'success' | 'error' | '';
  onFile: (f: File) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFile(file);
    e.target.value = '';
  }

  return (
    <div
      className={`relative rounded-xl border-2 border-dashed p-5 transition-colors cursor-pointer ${
        dragging ? 'border-[var(--color-navy)] bg-blue-50/50' : 'border-gray-300 bg-white hover:border-gray-400'
      } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} onChange={handleChange} className="hidden" />
      <div className="flex flex-col items-center text-center gap-2">
        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
        <div className="text-sm font-semibold text-[var(--color-navy)]">{title}</div>
        <div className="text-xs text-gray-500">{description}</div>
        <div className="text-xs text-gray-400 mt-1">Drag & drop or click to browse</div>
        {uploading && <div className="text-xs text-blue-600 font-medium mt-1">Uploading...</div>}
        {message && (
          <div className={`text-xs mt-1 font-medium ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</div>
        )}
      </div>
    </div>
  );
}

/* ───── Perigee Search Modal ───── */
function PerigeeSearchModal({ storeName, onSelect, onClose, onEmailSupport }: {
  storeName: string;
  onSelect: (p: PerigeeResult) => void;
  onClose: () => void;
  onEmailSupport: (storeName: string) => void;
}) {
  const [query, setQuery] = useState(storeName);
  const [results, setResults] = useState<PerigeeResult[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setSearched(false); return; }
    setSearching(true);
    try {
      const res = await authFetch(`/api/perigee-stores?q=${encodeURIComponent(q.trim())}`, { cache: 'no-store' });
      const data = await res.json();
      setResults(data.stores || []);
      setTotal(data.total || 0);
      setSearched(true);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, doSearch]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Map to Perigee Store</h3>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="text-xs text-gray-500 mb-2">Mapping: <span className="font-medium text-gray-700">{storeName}</span></div>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Perigee stores by name or code..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
            autoFocus
          />
          {total > 0 && <div className="text-[10px] text-gray-400 mt-1">{total.toLocaleString()} Perigee stores loaded</div>}
        </div>

        <div className="flex-1 overflow-y-auto p-2 min-h-[200px]">
          {searching && <div className="text-center text-gray-400 text-sm py-8">Searching...</div>}
          {!searching && searched && results.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm mb-3">No matching Perigee stores found</div>
              <button
                onClick={() => onEmailSupport(storeName)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                Email Perigee Support
              </button>
            </div>
          )}
          {!searching && results.map(p => (
            <button
              key={p.code}
              onClick={() => onSelect(p)}
              className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-between gap-3 group"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-500">{p.channel}{p.province ? ` · ${p.province}` : ''}</div>
              </div>
              <div className="flex-shrink-0 text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded group-hover:bg-blue-100">
                {p.code}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───── Main Page ───── */
export default function StoresPage() {
  const { session, loading, logout } = useAuth();

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'mapped' | 'unmapped'>('');

  // Upload states for each zone
  const [matchUploading, setMatchUploading] = useState(false);
  const [matchMsg, setMatchMsg] = useState('');
  const [matchMsgType, setMatchMsgType] = useState<'success' | 'error' | ''>('');

  const [perigeeUploading, setPerigeeUploading] = useState(false);
  const [perigeeMsg, setPerigeeMsg] = useState('');
  const [perigeeMsgType, setPerigeeMsgType] = useState<'success' | 'error' | ''>('');

  const [bravoUploading, setBravoUploading] = useState(false);
  const [bravoMsg, setBravoMsg] = useState('');
  const [bravoMsgType, setBravoMsgType] = useState<'success' | 'error' | ''>('');

  // Mapping modal
  const [mappingStore, setMappingStore] = useState<StoreRow | null>(null);
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
  const unmapped = totalStores - mapped;
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
      if (filterStatus === 'mapped' && s.perigeeStoreCode === 'Not Mapped') return false;
      if (filterStatus === 'unmapped' && s.perigeeStoreCode !== 'Not Mapped') return false;
      if (search) {
        const q = search.toLowerCase();
        if (!s.name.toLowerCase().includes(q) && !s.perigeeStoreCode.toLowerCase().includes(q) &&
            !(nameMap[`ch:${s.channelId}`] || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [stores, filterChannel, filterStatus, search, nameMap]);

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

  // Upload handlers
  async function handleMatchUpload(file: File) {
    setMatchUploading(true); setMatchMsg(''); setMatchMsgType('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await authFetch('/api/stores/upload-matched', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setMatchMsg(data.error || 'Upload failed'); setMatchMsgType('error'); }
      else {
        setMatchMsg(`Added ${data.addedStores} stores (${data.skippedDuplicates} duplicates skipped, ${data.addedChannels} new channels)`);
        setMatchMsgType('success'); reload();
      }
    } catch { setMatchMsg('Connection error'); setMatchMsgType('error'); }
    finally { setMatchUploading(false); }
  }

  async function handlePerigeeUpload(file: File) {
    setPerigeeUploading(true); setPerigeeMsg(''); setPerigeeMsgType('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await authFetch('/api/perigee-stores/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setPerigeeMsg(data.error || 'Upload failed'); setPerigeeMsgType('error'); }
      else {
        setPerigeeMsg(`${data.totalStores.toLocaleString()} active Perigee stores loaded`);
        setPerigeeMsgType('success');
      }
    } catch { setPerigeeMsg('Connection error'); setPerigeeMsgType('error'); }
    finally { setPerigeeUploading(false); }
  }

  async function handleBravoUpload(file: File) {
    setBravoUploading(true); setBravoMsg(''); setBravoMsgType('');
    try {
      const fd = new FormData(); fd.append('file', file);
      const res = await authFetch('/api/stores/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) { setBravoMsg(data.error || 'Upload failed'); setBravoMsgType('error'); }
      else {
        setBravoMsg(`Added ${data.addedStores} stores, ${data.addedChannels} new channels`);
        setBravoMsgType('success'); reload();
      }
    } catch { setBravoMsg('Connection error'); setBravoMsgType('error'); }
    finally { setBravoUploading(false); }
  }

  // Mapping
  async function handleMapSelect(p: PerigeeResult) {
    if (!mappingStore) return;
    setSavingMatch(true);
    try {
      await authFetch(`/api/stores/${mappingStore.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perigeeStoreCode: p.code, perigeeStoreName: p.name }),
      });
      setStores(prev => prev.map(s => s.id === mappingStore.id ? {
        ...s, perigeeStoreCode: p.code, perigeeStoreName: p.name,
      } : s));
      setMappingStore(null);
    } catch { /* ignore */ }
    finally { setSavingMatch(false); }
  }

  function handleEmailSupport(storeName: string) {
    const subject = encodeURIComponent(`Store not found in Perigee: ${storeName}`);
    const body = encodeURIComponent(
      `Hi Perigee Support,\n\nWe are unable to find the following store in the Perigee system and would like to request that it be added:\n\nStore Name: ${storeName}\n\nPlease let us know once this has been done.\n\nThank you`
    );
    window.open(`mailto:support@perigeeapp.co.za?subject=${subject}&body=${body}`, '_blank');
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const isAdmin = session.role === 'admin';
  const scoreColor = pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Stores & Channels</h1>

        {/* Score + Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Score circle */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
            <div className="relative w-20 h-20 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-20 h-20 -rotate-90">
                <circle cx="50" cy="50" r="45" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                <circle cx="50" cy="50" r="45" fill="none" stroke={scoreColor} strokeWidth="8"
                  strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold" style={{ color: scoreColor }}>{pct}%</span>
              </div>
            </div>
            <div>
              <div className="text-sm font-bold text-[var(--color-navy)]">Perigee Match</div>
              <div className="text-xs text-gray-500">{mapped} / {totalStores} mapped</div>
            </div>
          </div>
          {/* Stat cards */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
            <div className="text-2xl font-bold text-[var(--color-navy)]">{totalStores.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total Stores</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
            <div className="text-2xl font-bold text-green-600">{mapped.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Mapped</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col justify-center">
            <div className="text-2xl font-bold text-red-500">{unmapped.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Unmapped</div>
          </div>
        </div>

        {/* Upload zones — admin only */}
        {isAdmin && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-[var(--color-navy)] mb-3">Data Uploads</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DropZone
                title="Initial Matched List"
                description="Upload the Bravo Master Store Match file with pre-matched Perigee codes"
                accept=".xlsx,.xls"
                uploading={matchUploading}
                message={matchMsg}
                messageType={matchMsgType}
                onFile={handleMatchUpload}
              />
              <DropZone
                title="Perigee Store Reference"
                description="Upload the Perigee store export — used as the lookup for manual mapping"
                accept=".xlsx,.xls"
                uploading={perigeeUploading}
                message={perigeeMsg}
                messageType={perigeeMsgType}
                onFile={handlePerigeeUpload}
              />
              <DropZone
                title="Bravo Store List"
                description="Upload new Bravo stores (unmapped — map them after upload)"
                accept=".xlsx,.xls,.csv"
                uploading={bravoUploading}
                message={bravoMsg}
                messageType={bravoMsgType}
                onFile={handleBravoUpload}
              />
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as typeof filterStatus)} className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white">
              <option value="">All</option>
              <option value="mapped">Mapped</option>
              <option value="unmapped">Unmapped</option>
            </select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Store name, code..." className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div className="text-xs text-gray-400 pb-1">{filtered.length} stores</div>
        </div>

        {/* Stores table */}
        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading stores...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    <th className="px-3 py-2.5 font-medium">Store Name</th>
                    <th className="px-3 py-2.5 font-medium">Area</th>
                    <th className="px-3 py-2.5 font-medium">Channel</th>
                    <th className="px-3 py-2.5 font-medium">Team</th>
                    <th className="px-3 py-2.5 font-medium">Perigee Code</th>
                    <th className="px-3 py-2.5 font-medium">Perigee Name</th>
                    <th className="px-3 py-2.5 font-medium w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-gray-400">No stores found</td></tr>
                  ) : (
                    filtered.slice(0, 300).map(s => {
                      const isUnmapped = s.perigeeStoreCode === 'Not Mapped';
                      return (
                        <tr key={s.id} className={`border-t border-gray-100 hover:bg-gray-50 ${isUnmapped ? 'bg-red-50/30' : ''}`}>
                          <td className="px-3 py-2 font-medium">{s.name}</td>
                          <td className="px-3 py-2 text-gray-600">{s.area}</td>
                          <td className="px-3 py-2">{nameMap[`ch:${s.channelId}`] || '—'}</td>
                          <td className="px-3 py-2">{nameMap[`tm:${s.teamId}`] || '—'}</td>
                          <td className={`px-3 py-2 ${isUnmapped ? 'text-red-500 font-medium' : 'font-mono text-xs'}`}>
                            {s.perigeeStoreCode}
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-xs">{s.perigeeStoreName || '—'}</td>
                          <td className="px-3 py-2">
                            {isUnmapped ? (
                              <button
                                onClick={() => setMappingStore(s)}
                                className="px-2.5 py-1 bg-[var(--color-navy)] text-white text-xs rounded-md font-medium hover:bg-[var(--color-navy-light)] transition-colors"
                              >
                                Map
                              </button>
                            ) : (
                              <button
                                onClick={() => setMappingStore(s)}
                                className="p-1 text-gray-400 hover:text-[var(--color-navy)]"
                                title="Re-map"
                              >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
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
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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

      {/* Mapping modal */}
      {mappingStore && (
        <PerigeeSearchModal
          storeName={mappingStore.name}
          onSelect={handleMapSelect}
          onClose={() => !savingMatch && setMappingStore(null)}
          onEmailSupport={handleEmailSupport}
        />
      )}
    </>
  );
}
