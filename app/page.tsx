'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth, authFetch, Session } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface StoreRow {
  id: string;
  name: string;
  area: string;
  channelId: string;
  regionId: string;
  teamId: string;
  repUserId: string | null;
  perigeeStoreCode: string;
  perigeeStoreName: string;
}

interface TeamRow { id: string; name: string }
interface RegionRow { id: string; name: string }
interface ChannelRow { id: string; name: string }
interface UserRow { id: string; name: string; surname: string; teamId: string | null }

type SortCol = 'name' | 'area' | 'channel' | 'team' | 'region' | 'perigeeCode' | 'rep' | 'visits' | 'lastVisit';
type SortDir = 'asc' | 'desc';

const COLUMNS: { key: SortCol; label: string; defaultWidth: number }[] = [
  { key: 'name', label: 'Store Name', defaultWidth: 200 },
  { key: 'area', label: 'Area', defaultWidth: 130 },
  { key: 'channel', label: 'Channel', defaultWidth: 130 },
  { key: 'team', label: 'Team', defaultWidth: 130 },
  { key: 'region', label: 'Region', defaultWidth: 120 },
  { key: 'perigeeCode', label: 'Perigee Code', defaultWidth: 120 },
  { key: 'rep', label: 'Rep', defaultWidth: 150 },
  { key: 'visits', label: 'Visits', defaultWidth: 80 },
  { key: 'lastVisit', label: 'Last Visit', defaultWidth: 110 },
];

function getMonthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { from, to };
}

function formatDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export default function DashboardPage() {
  const { session, loading, logout } = useAuth();

  const [stores, setStores] = useState<StoreRow[]>([]);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [regions, setRegions] = useState<RegionRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [fetching, setFetching] = useState(true);

  // Visits
  const [visitMap, setVisitMap] = useState<Record<string, number>>({});
  const [lastVisitMap, setLastVisitMap] = useState<Record<string, string>>({});
  const [visitTotal, setVisitTotal] = useState(0);
  const [visitFilteredTotal, setVisitFilteredTotal] = useState(0);

  // Date filters
  const { from: defaultFrom, to: defaultTo } = getMonthRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  // Visits upload (admin only)
  const [visitUploading, setVisitUploading] = useState(false);
  const [visitMsg, setVisitMsg] = useState('');
  const [visitMsgType, setVisitMsgType] = useState<'success' | 'error' | ''>('');
  const [clearingVisits, setClearingVisits] = useState(false);
  const visitInputRef = useRef<HTMLInputElement>(null);

  // Pagination
  const PAGE_SIZE = 400;
  const [page, setPage] = useState(0);

  // Filters
  const [filterChannel, setFilterChannel] = useState('');
  const [filterTeam, setFilterTeam] = useState('');
  const [filterRegion, setFilterRegion] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [search, setSearch] = useState('');

  // Sorting
  const [sortCol, setSortCol] = useState<SortCol>('name');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Column widths
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.defaultWidth));
  const resizingRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  // Fetch visits
  const fetchVisits = useCallback(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    authFetch(`/api/visits?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setVisitMap(data.byStoreCode || {});
        setLastVisitMap(data.lastVisitByStoreCode || {});
        setVisitTotal(data.total || 0);
        setVisitFilteredTotal(data.filteredTotal || 0);
      })
      .catch(() => {});
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      authFetch('/api/stores', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/regions', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/channels', { cache: 'no-store' }).then(r => r.json()),
      session.role === 'admin'
        ? authFetch('/api/users', { cache: 'no-store' }).then(r => r.json())
        : Promise.resolve([]),
    ]).then(([s, t, r, c, u]) => {
      setStores(Array.isArray(s) ? s : []);
      setTeams(Array.isArray(t) ? t : []);
      setRegions(Array.isArray(r) ? r : []);
      setChannels(Array.isArray(c) ? c : []);
      setUsers(Array.isArray(u) ? u : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [session]);

  useEffect(() => {
    if (!session) return;
    fetchVisits();
  }, [session, fetchVisits]);

  const nameMap = useMemo(() => {
    const m: Record<string, string> = {};
    teams.forEach(t => { m[`team:${t.id}`] = t.name; });
    regions.forEach(r => { m[`region:${r.id}`] = r.name; });
    channels.forEach(c => { m[`channel:${c.id}`] = c.name; });
    users.forEach(u => { m[`user:${u.id}`] = `${u.name} ${u.surname}`.trim(); });
    return m;
  }, [teams, regions, channels, users]);

  // Build display name: Channel + Area
  function storeName(s: StoreRow): string {
    const ch = nameMap[`channel:${s.channelId}`] || '';
    const area = s.area || '';
    if (ch && area) return `${ch} ${area}`;
    return ch || area || s.name;
  }

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [filterChannel, filterTeam, filterRegion, filterUser, search, sortCol, sortDir]);

  const filtered = useMemo(() => {
    return stores.filter(s => {
      if (filterChannel && s.channelId !== filterChannel) return false;
      if (filterTeam && s.teamId !== filterTeam) return false;
      if (filterRegion && s.regionId !== filterRegion) return false;
      if (filterUser && s.repUserId !== filterUser) return false;
      if (search) {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        const displayName = storeName(s).toLowerCase();
        const cName = (nameMap[`channel:${s.channelId}`] || '').toLowerCase();
        const tName = (nameMap[`team:${s.teamId}`] || '').toLowerCase();
        if (
          displayName.includes(q) ||
          (s.area || '').toLowerCase().includes(q) ||
          cName.includes(q) ||
          tName.includes(q) ||
          s.perigeeStoreCode.toLowerCase().includes(q)
        ) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [stores, filterChannel, filterTeam, filterRegion, filterUser, search, nameMap]);

  // Sort the filtered list
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let aVal = '';
      let bVal = '';
      switch (sortCol) {
        case 'name': aVal = storeName(a); bVal = storeName(b); break;
        case 'area': aVal = a.area; bVal = b.area; break;
        case 'channel': aVal = nameMap[`channel:${a.channelId}`] || ''; bVal = nameMap[`channel:${b.channelId}`] || ''; break;
        case 'team': aVal = nameMap[`team:${a.teamId}`] || ''; bVal = nameMap[`team:${b.teamId}`] || ''; break;
        case 'region': aVal = nameMap[`region:${a.regionId}`] || ''; bVal = nameMap[`region:${b.regionId}`] || ''; break;
        case 'perigeeCode': aVal = a.perigeeStoreCode; bVal = b.perigeeStoreCode; break;
        case 'rep': aVal = a.repUserId ? (nameMap[`user:${a.repUserId}`] || '') : ''; bVal = b.repUserId ? (nameMap[`user:${b.repUserId}`] || '') : ''; break;
        case 'visits': {
          const aCount = a.perigeeStoreCode !== 'Not Mapped' ? (visitMap[a.perigeeStoreCode] || 0) : -1;
          const bCount = b.perigeeStoreCode !== 'Not Mapped' ? (visitMap[b.perigeeStoreCode] || 0) : -1;
          return sortDir === 'asc' ? aCount - bCount : bCount - aCount;
        }
        case 'lastVisit': {
          const aDate = a.perigeeStoreCode !== 'Not Mapped' ? (lastVisitMap[a.perigeeStoreCode] || '') : '';
          const bDate = b.perigeeStoreCode !== 'Not Mapped' ? (lastVisitMap[b.perigeeStoreCode] || '') : '';
          const cmp = aDate.localeCompare(bDate);
          return sortDir === 'asc' ? cmp : -cmp;
        }
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortCol, sortDir, nameMap, visitMap, lastVisitMap]);

  const mapped = stores.filter(s => s.perigeeStoreCode !== 'Not Mapped').length;

  // Sort handler
  function handleSort(col: SortCol) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
  }

  // Column resize handlers
  function handleResizeStart(e: React.MouseEvent, colIdx: number) {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = { colIdx, startX: e.clientX, startW: colWidths[colIdx] };

    function onMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const diff = ev.clientX - resizingRef.current.startX;
      const newW = Math.max(60, resizingRef.current.startW + diff);
      setColWidths(prev => {
        const next = [...prev];
        next[resizingRef.current!.colIdx] = newW;
        return next;
      });
    }

    function onUp() {
      resizingRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Visits upload handler
  async function handleVisitUpload(file: File) {
    setVisitUploading(true); setVisitMsg('Parsing file...'); setVisitMsgType('');
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      const visits: { storeCode: string; checkInDate: string; repEmail: string; repName: string; status: string; visitDuration: string }[] = [];
      for (const row of rows) {
        const storeCode = String(row['Store Code'] || row['store_code'] || row['Store code'] || '').trim();
        const rawDate = String(row['Check in date'] || row['Check In Date'] || row['check_in_date'] || '').trim();
        const firstName = String(row['First Name'] || row['First name'] || row['first_name'] || '').trim();
        const lastName = String(row['Last Name'] || row['Last name'] || row['last_name'] || '').trim();
        const email = String(row['Email'] || row['email'] || '').trim();
        const status = String(row['Status'] || row['status'] || '').trim();
        const duration = String(row['Visit Duration'] || row['Visit duration'] || row['visit_duration'] || '').trim();

        if (!storeCode || !rawDate) continue;

        let checkInDate = rawDate;
        const ddmmyyyy = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
          const dd = ddmmyyyy[1].padStart(2, '0');
          const mm = ddmmyyyy[2].padStart(2, '0');
          const yyyy = ddmmyyyy[3];
          checkInDate = `${yyyy}-${mm}-${dd}`;
        }

        visits.push({ storeCode, checkInDate, repEmail: email, repName: `${firstName} ${lastName}`.trim(), status, visitDuration: duration });
      }

      setVisitMsg(`Uploading ${visits.length.toLocaleString()} visits...`);

      const json = JSON.stringify({ visits });
      const blob = new Blob([json]);
      const cs = new CompressionStream('gzip');
      const compressedStream = blob.stream().pipeThrough(cs);
      const compressedBlob = await new Response(compressedStream).blob();

      const res = await authFetch('/api/visits/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/gzip' },
        body: compressedBlob,
      });
      const data = await res.json();
      if (!res.ok) { setVisitMsg(data.error || 'Upload failed'); setVisitMsgType('error'); }
      else {
        setVisitMsg(`${data.totalVisits.toLocaleString()} visits imported`);
        setVisitMsgType('success');
        fetchVisits();
      }
    } catch (err) {
      console.error('Visits upload error:', err);
      setVisitMsg('Failed to parse or upload file'); setVisitMsgType('error');
    }
    finally { setVisitUploading(false); }
  }

  async function handleClearVisits() {
    if (!confirm('Clear all visit data? This cannot be undone.')) return;
    setClearingVisits(true);
    try {
      const res = await authFetch('/api/visits', { method: 'DELETE' });
      if (res.ok) {
        setVisitMsg('Visit data cleared'); setVisitMsgType('success');
        setVisitMap({});
        setLastVisitMap({});
        setVisitTotal(0);
        setVisitFilteredTotal(0);
      }
    } catch { /* ignore */ }
    finally { setClearingVisits(false); }
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  const isAdmin = session.role === 'admin';

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Dashboard</h1>

        {/* Top cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card label="Total Stores" value={stores.length} icon="store" />
          <Card label="Mapped Stores" value={mapped} icon="check" color={mapped === stores.length ? 'green' : 'amber'} />
          <Card label="Unmapped" value={stores.length - mapped} icon="alert" color="red" />
          <Card label="Total Visits" value={visitFilteredTotal} icon="visit" subtitle={dateFrom && dateTo ? `${dateFrom} to ${dateTo}` : undefined} />
        </div>

        {/* Admin visit upload section */}
        {isAdmin && (
          <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-[var(--color-navy)]">Import Visits (Perigee Export)</h2>
              <div className="flex gap-2">
                {visitTotal > 0 && (
                  <button
                    onClick={handleClearVisits}
                    disabled={clearingVisits}
                    className="text-xs text-red-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg py-1.5 px-3 transition-colors disabled:opacity-50"
                  >
                    {clearingVisits ? 'Clearing...' : 'Clear All Visits'}
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <input ref={visitInputRef} type="file" accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleVisitUpload(f); e.target.value = ''; }} className="hidden" />
              <button
                onClick={() => visitInputRef.current?.click()}
                disabled={visitUploading}
                className="px-4 py-2 bg-[var(--color-navy)] text-white text-sm rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {visitUploading ? 'Uploading...' : 'Upload Visits Excel'}
              </button>
              {visitMsg && (
                <span className={`text-xs font-medium ${visitMsgType === 'error' ? 'text-red-600' : visitMsgType === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
                  {visitMsg}
                </span>
              )}
              {visitTotal > 0 && !visitMsg && (
                <span className="text-xs text-gray-400">{visitTotal.toLocaleString()} visits stored</span>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <FilterSelect label="Channel" value={filterChannel} onChange={setFilterChannel} options={channels.map(c => ({ value: c.id, label: c.name }))} />
          <FilterSelect label="Team" value={filterTeam} onChange={setFilterTeam} options={teams.map(t => ({ value: t.id, label: t.name }))} />
          <FilterSelect label="Region" value={filterRegion} onChange={setFilterRegion} options={regions.map(r => ({ value: r.id, label: r.name }))} />
          {users.length > 0 && (
            <FilterSelect label="Rep" value={filterUser} onChange={setFilterUser} options={users.filter(u => u.teamId).map(u => ({ value: u.id, label: `${u.name} ${u.surname}` }))} />
          )}
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]" />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]" />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Store name, code..." className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]" />
          </div>
        </div>

        {/* Grid */}
        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading stores...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}>
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    {COLUMNS.map((col, idx) => (
                      <th
                        key={col.key}
                        className="px-3 py-2 font-medium relative select-none cursor-pointer hover:bg-white/10 transition-colors"
                        style={{ width: colWidths[idx] }}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortCol === col.key && (
                            <span className="text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                          )}
                        </span>
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
                          onMouseDown={e => handleResizeStart(e, idx)}
                          onClick={e => e.stopPropagation()}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 ? (
                    <tr><td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-gray-400">No stores found</td></tr>
                  ) : (
                    sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map(s => {
                      const isMapped = s.perigeeStoreCode !== 'Not Mapped';
                      const visitCount = isMapped ? (visitMap[s.perigeeStoreCode] || 0) : null;
                      const lastVisit = isMapped ? (lastVisitMap[s.perigeeStoreCode] || '') : '';
                      return (
                        <tr key={s.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium truncate" style={{ width: colWidths[0] }}>{storeName(s)}</td>
                          <td className="px-3 py-2 text-gray-600 truncate" style={{ width: colWidths[1] }}>{s.area}</td>
                          <td className="px-3 py-2 truncate" style={{ width: colWidths[2] }}>{nameMap[`channel:${s.channelId}`] || '—'}</td>
                          <td className="px-3 py-2 truncate" style={{ width: colWidths[3] }}>{nameMap[`team:${s.teamId}`] || '—'}</td>
                          <td className="px-3 py-2 truncate" style={{ width: colWidths[4] }}>{nameMap[`region:${s.regionId}`] || '—'}</td>
                          <td className={`px-3 py-2 truncate ${!isMapped ? 'text-red-500 font-medium' : ''}`} style={{ width: colWidths[5] }}>
                            {s.perigeeStoreCode}
                          </td>
                          <td className="px-3 py-2 text-gray-600 truncate" style={{ width: colWidths[6] }}>{s.repUserId ? (nameMap[`user:${s.repUserId}`] || '—') : '—'}</td>
                          <td className="px-3 py-2 text-center" style={{ width: colWidths[7] }}>
                            {visitCount === null ? (
                              <span className="text-gray-300">—</span>
                            ) : visitCount > 0 ? (
                              <span className="inline-flex items-center justify-center min-w-[24px] px-1.5 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">{visitCount}</span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-500 truncate" style={{ width: colWidths[8] }}>
                            {lastVisit ? formatDate(lastVisit) : (isMapped ? <span className="text-gray-300">—</span> : <span className="text-gray-300">—</span>)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {sorted.length > PAGE_SIZE && (() => {
              const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
              const from = page * PAGE_SIZE + 1;
              const to = Math.min((page + 1) * PAGE_SIZE, sorted.length);
              return (
                <div className="px-3 py-2 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-xs text-gray-400">Showing {from}–{to} of {sorted.length.toLocaleString()} stores</div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-gray-500">Page {page + 1} of {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      className="px-2.5 py-1 text-xs font-medium rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </>
  );
}

function Card({ label, value, icon, color, subtitle }: { label: string; value: number; icon: string; color?: string; subtitle?: string }) {
  const bg = color === 'green' ? 'bg-green-50 text-green-700' : color === 'red' ? 'bg-red-50 text-red-700' : color === 'amber' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700';
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${bg}`}>
        {icon === 'store' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.15c0 .415.336.75.75.75z" /></svg>}
        {icon === 'check' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        {icon === 'alert' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
        {icon === 'visit' && <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
        <div className="text-xs text-gray-500">{label}</div>
        {subtitle && <div className="text-[10px] text-gray-400 mt-0.5">{subtitle}</div>}
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="min-w-[150px]">
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
      >
        <option value="">All</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
