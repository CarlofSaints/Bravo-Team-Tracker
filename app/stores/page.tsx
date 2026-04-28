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
function DropZone({ title, description, accept, uploading, message, messageType, statusLine, onFile, onExportTemplate, onExportCurrent, onClear, hasData, clearing }: {
  title: string; description: string; accept: string;
  uploading: boolean; message: string; messageType: 'success' | 'error' | '';
  statusLine?: string;
  onFile: (f: File) => void;
  onExportTemplate?: () => void;
  onExportCurrent?: () => void;
  onClear?: () => void;
  hasData?: boolean;
  clearing?: boolean;
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
    <div className="flex flex-col">
      <div
        className={`relative rounded-xl border-2 border-dashed p-5 transition-colors cursor-pointer flex-1 ${
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
          {statusLine && !uploading && !message && (
            <div className="text-[10px] text-green-600 mt-1 flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
              {statusLine}
            </div>
          )}
          {uploading && <div className="text-xs text-blue-600 font-medium mt-1">Uploading...</div>}
          {message && (
            <div className={`text-xs mt-1 font-medium ${messageType === 'error' ? 'text-red-600' : 'text-green-600'}`}>{message}</div>
          )}
        </div>
      </div>
      {(onExportTemplate || onExportCurrent || onClear) && (
        <div className="flex gap-2 mt-2">
          {onExportTemplate && (
            <button
              onClick={onExportTemplate}
              className="flex-1 text-[11px] text-gray-500 hover:text-[var(--color-navy)] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-1.5 px-2 transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Template
            </button>
          )}
          {onExportCurrent && hasData && (
            <button
              onClick={onExportCurrent}
              className="flex-1 text-[11px] text-gray-500 hover:text-[var(--color-navy)] bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg py-1.5 px-2 transition-colors flex items-center justify-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
              Export Current
            </button>
          )}
          {onClear && hasData && (
            <button
              onClick={onClear}
              disabled={clearing}
              className="text-[11px] text-red-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg py-1.5 px-2 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
              {clearing ? 'Clearing...' : 'Clear'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ───── Perigee Search Modal ───── */
function PerigeeSearchModal({ storeName, storeArea, onSelect, onClose, onEmailSupport }: {
  storeName: string;
  storeArea: string;
  onSelect: (p: PerigeeResult) => void;
  onClose: () => void;
  onEmailSupport: (storeName: string) => void;
}) {
  const [query, setQuery] = useState(storeName);
  const [channel, setChannel] = useState('');
  const [channels, setChannels] = useState<string[]>([]);
  const [results, setResults] = useState<PerigeeResult[]>([]);
  const [total, setTotal] = useState(0);
  const [matchCount, setMatchCount] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const mouseDownOnBackdrop = useRef(false);

  // Fetch channels on mount
  useEffect(() => {
    authFetch('/api/perigee-stores', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setChannels(d.channels || []);
        setTotal(d.total || 0);
      })
      .catch(() => {});
  }, []);

  const doSearch = useCallback(async (q: string, ch: string) => {
    if (!q.trim() && !ch) { setResults([]); setSearched(false); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (ch) params.set('channel', ch);
      const res = await authFetch(`/api/perigee-stores?${params}`, { cache: 'no-store' });
      const data = await res.json();
      setResults(data.stores || []);
      setTotal(data.total || 0);
      setMatchCount(data.matchCount || 0);
      setSearched(true);
    } catch { setResults([]); }
    finally { setSearching(false); }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => doSearch(query, channel), 300);
    return () => clearTimeout(t);
  }, [query, channel, doSearch]);

  // Only close on click if mousedown AND mouseup both happened on the backdrop
  function handleBackdropMouseDown(e: React.MouseEvent) {
    mouseDownOnBackdrop.current = e.target === e.currentTarget;
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget && mouseDownOnBackdrop.current) {
      onClose();
    }
    mouseDownOnBackdrop.current = false;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[var(--color-navy)]">Map to Perigee Store</h3>
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <div className="text-xs text-gray-500 mb-2">Mapping: <span className="font-medium text-gray-700">{storeName}</span>{storeArea && <span className="text-gray-400"> — {storeArea}</span>}</div>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or code..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
              autoFocus
            />
            <select
              value={channel}
              onChange={e => setChannel(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[140px]"
            >
              <option value="">All Channels</option>
              {channels.map(ch => <option key={ch} value={ch}>{ch}</option>)}
            </select>
          </div>
          <div className="flex items-center justify-between">
            {total > 0 && <div className="text-[10px] text-gray-400">{total.toLocaleString()} Perigee stores loaded</div>}
            {searched && matchCount > 50 && <div className="text-[10px] text-gray-400">{matchCount} matches — showing first 50</div>}
          </div>
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
            <div
              key={p.code}
              className="w-full px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800 truncate">{p.name}</div>
                <div className="text-xs text-gray-500">{p.channel}{p.province ? ` · ${p.province}` : ''}</div>
              </div>
              <div className="flex-shrink-0 text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                {p.code}
              </div>
              <button
                onClick={() => onSelect(p)}
                className="flex-shrink-0 px-3 py-1.5 bg-[var(--color-navy)] text-white text-xs rounded-md font-medium hover:opacity-90 transition-opacity"
              >
                Map
              </button>
            </div>
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

  const [clearingStores, setClearingStores] = useState(false);
  const [clearingPerigee, setClearingPerigee] = useState(false);

  // Perigee reference status
  const [perigeeRefCount, setPerigeeRefCount] = useState(0);

  // Mapping modal
  const [mappingStore, setMappingStore] = useState<StoreRow | null>(null);
  const [savingMatch, setSavingMatch] = useState(false);
  const [justMappedId, setJustMappedId] = useState<string | null>(null);
  const [justMappedName, setJustMappedName] = useState<string | null>(null);

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

  const fetchPerigeeCount = useCallback(() => {
    authFetch('/api/perigee-stores', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setPerigeeRefCount(d.total || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!session) return;
    reload();
    fetchPerigeeCount();
  }, [session, reload, fetchPerigeeCount]);

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
        const q = search.trim().toLowerCase();
        if (!q) return true;
        if (
          (s.name || '').toLowerCase().includes(q) ||
          (s.perigeeStoreCode || '').toLowerCase().includes(q) ||
          (s.perigeeStoreName || '').toLowerCase().includes(q) ||
          (s.area || '').toLowerCase().includes(q) ||
          (nameMap[`ch:${s.channelId}`] || '').toLowerCase().includes(q) ||
          (nameMap[`tm:${s.teamId}`] || '').toLowerCase().includes(q)
        ) {
          return true;
        }
        return false;
      }
      return true;
    });
  }, [stores, filterChannel, filterStatus, search, nameMap]);

  // Sort state for main table
  type StoresSortCol = 'name' | 'area' | 'channel' | 'team' | 'perigeeCode' | 'perigeeName';
  const [storesSortCol, setStoresSortCol] = useState<StoresSortCol>('name');
  const [storesSortDir, setStoresSortDir] = useState<'asc' | 'desc'>('asc');

  // Column widths for main stores table
  const STORE_COLS: { key: StoresSortCol; label: string; defaultWidth: number }[] = [
    { key: 'name', label: 'Store Name', defaultWidth: 200 },
    { key: 'area', label: 'Area', defaultWidth: 130 },
    { key: 'channel', label: 'Channel', defaultWidth: 130 },
    { key: 'team', label: 'Team', defaultWidth: 120 },
    { key: 'perigeeCode', label: 'Perigee Code', defaultWidth: 130 },
    { key: 'perigeeName', label: 'Perigee Name', defaultWidth: 180 },
  ];
  const [storeColWidths, setStoreColWidths] = useState(STORE_COLS.map(c => c.defaultWidth));
  const storeResizeRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  function handleStoreSort(col: StoresSortCol) {
    if (storesSortCol === col) setStoresSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setStoresSortCol(col); setStoresSortDir('asc'); }
  }

  function handleStoreResizeStart(e: React.MouseEvent, colIdx: number) {
    e.preventDefault(); e.stopPropagation();
    storeResizeRef.current = { colIdx, startX: e.clientX, startW: storeColWidths[colIdx] };
    function onMove(ev: MouseEvent) {
      if (!storeResizeRef.current) return;
      const diff = ev.clientX - storeResizeRef.current.startX;
      const newW = Math.max(60, storeResizeRef.current.startW + diff);
      setStoreColWidths(prev => { const next = [...prev]; next[storeResizeRef.current!.colIdx] = newW; return next; });
    }
    function onUp() { storeResizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Sort state for channel breakdown
  type BreakdownSortCol = 'name' | 'total' | 'matched' | 'pct';
  const [breakdownSortCol, setBreakdownSortCol] = useState<BreakdownSortCol>('name');
  const [breakdownSortDir, setBreakdownSortDir] = useState<'asc' | 'desc'>('asc');

  const BREAKDOWN_COLS: { key: BreakdownSortCol; label: string; defaultWidth: number; align?: string }[] = [
    { key: 'name', label: 'Channel', defaultWidth: 200 },
    { key: 'total', label: 'Total Stores', defaultWidth: 120, align: 'right' },
    { key: 'matched', label: 'Matched', defaultWidth: 100, align: 'right' },
    { key: 'pct', label: '% Match', defaultWidth: 100, align: 'right' },
  ];
  const [breakdownColWidths, setBreakdownColWidths] = useState(BREAKDOWN_COLS.map(c => c.defaultWidth));
  const breakdownResizeRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  function handleBreakdownSort(col: BreakdownSortCol) {
    if (breakdownSortCol === col) setBreakdownSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setBreakdownSortCol(col); setBreakdownSortDir('asc'); }
  }

  function handleBreakdownResizeStart(e: React.MouseEvent, colIdx: number) {
    e.preventDefault(); e.stopPropagation();
    breakdownResizeRef.current = { colIdx, startX: e.clientX, startW: breakdownColWidths[colIdx] };
    function onMove(ev: MouseEvent) {
      if (!breakdownResizeRef.current) return;
      const diff = ev.clientX - breakdownResizeRef.current.startX;
      const newW = Math.max(60, breakdownResizeRef.current.startW + diff);
      setBreakdownColWidths(prev => { const next = [...prev]; next[breakdownResizeRef.current!.colIdx] = newW; return next; });
    }
    function onUp() { breakdownResizeRef.current = null; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  // Sorted filtered stores
  const sortedStores = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let aVal = ''; let bVal = '';
      switch (storesSortCol) {
        case 'name': aVal = a.name; bVal = b.name; break;
        case 'area': aVal = a.area; bVal = b.area; break;
        case 'channel': aVal = nameMap[`ch:${a.channelId}`] || ''; bVal = nameMap[`ch:${b.channelId}`] || ''; break;
        case 'team': aVal = nameMap[`tm:${a.teamId}`] || ''; bVal = nameMap[`tm:${b.teamId}`] || ''; break;
        case 'perigeeCode': aVal = a.perigeeStoreCode; bVal = b.perigeeStoreCode; break;
        case 'perigeeName': aVal = a.perigeeStoreName || ''; bVal = b.perigeeStoreName || ''; break;
      }
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true, sensitivity: 'base' });
      return storesSortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, storesSortCol, storesSortDir, nameMap]);

  // Channel breakdown
  const channelBreakdown = useMemo(() => {
    const map: Record<string, { total: number; matched: number; name: string }> = {};
    for (const s of stores) {
      const key = s.channelId;
      if (!map[key]) map[key] = { total: 0, matched: 0, name: nameMap[`ch:${key}`] || 'Unknown' };
      map[key].total++;
      if (s.perigeeStoreCode !== 'Not Mapped') map[key].matched++;
    }
    return Object.values(map);
  }, [stores, nameMap]);

  const sortedBreakdown = useMemo(() => {
    const list = [...channelBreakdown];
    list.sort((a, b) => {
      switch (breakdownSortCol) {
        case 'name': { const cmp = a.name.localeCompare(b.name); return breakdownSortDir === 'asc' ? cmp : -cmp; }
        case 'total': return breakdownSortDir === 'asc' ? a.total - b.total : b.total - a.total;
        case 'matched': return breakdownSortDir === 'asc' ? a.matched - b.matched : b.matched - a.matched;
        case 'pct': {
          const ap = a.total > 0 ? a.matched / a.total : 0;
          const bp = b.total > 0 ? b.matched / b.total : 0;
          return breakdownSortDir === 'asc' ? ap - bp : bp - ap;
        }
      }
    });
    return list;
  }, [channelBreakdown, breakdownSortCol, breakdownSortDir]);

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
    setPerigeeUploading(true); setPerigeeMsg('Parsing file in browser...'); setPerigeeMsgType('');
    try {
      // Parse Excel client-side to avoid sending huge file to server
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      // Extract + filter
      const stores: { code: string; name: string; channel: string; province: string }[] = [];
      for (const row of rows) {
        const code = String(row['Store Code'] || row['store_code'] || '').trim();
        const name = String(row['Store Name'] || row['store_name'] || '').trim();
        const channel = String(row['Channel'] || row['channel'] || '').trim();
        const province = String(row['Province'] || row['province'] || '').trim();
        const active = String(row['Active'] || row['active'] || 'YES').trim().toUpperCase();
        if (!code || !name || active !== 'YES') continue;
        stores.push({ code, name, channel, province });
      }

      setPerigeeMsg(`Uploading ${stores.length.toLocaleString()} stores...`);

      // Gzip the JSON payload using Compression Streams API
      const json = JSON.stringify({ stores });
      const blob = new Blob([json]);
      const cs = new CompressionStream('gzip');
      const compressedStream = blob.stream().pipeThrough(cs);
      const compressedBlob = await new Response(compressedStream).blob();

      const res = await authFetch('/api/perigee-stores/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/gzip' },
        body: compressedBlob,
      });
      const data = await res.json();
      if (!res.ok) { setPerigeeMsg(data.error || 'Upload failed'); setPerigeeMsgType('error'); }
      else {
        setPerigeeMsg(`${data.totalStores.toLocaleString()} active Perigee stores loaded`);
        setPerigeeMsgType('success');
        setPerigeeRefCount(data.totalStores);
      }
    } catch (err) {
      console.error('Perigee upload error:', err);
      setPerigeeMsg('Failed to parse or upload file'); setPerigeeMsgType('error');
    }
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

  // Clear handlers
  async function handleClearStores() {
    if (!confirm('Clear all store data? This cannot be undone.')) return;
    setClearingStores(true);
    try {
      const res = await authFetch('/api/stores', { method: 'DELETE' });
      if (res.ok) {
        setMatchMsg('Store data cleared'); setMatchMsgType('success');
        setBravoMsg('Store data cleared'); setBravoMsgType('success');
        reload();
      }
    } catch { /* ignore */ }
    finally { setClearingStores(false); }
  }

  async function handleClearPerigee() {
    if (!confirm('Clear all Perigee reference data? This cannot be undone.')) return;
    setClearingPerigee(true);
    try {
      const res = await authFetch('/api/perigee-stores', { method: 'DELETE' });
      if (res.ok) {
        setPerigeeMsg('Perigee data cleared'); setPerigeeMsgType('success');
        setPerigeeRefCount(0);
      }
    } catch { /* ignore */ }
    finally { setClearingPerigee(false); }
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
      const mappedId = mappingStore.id;
      setStores(prev => prev.map(s => s.id === mappedId ? {
        ...s, perigeeStoreCode: p.code, perigeeStoreName: p.name,
      } : s));
      const mappedName = `${mappingStore.name} → ${p.code}`;
      setMappingStore(null);
      setJustMappedId(mappedId);
      setJustMappedName(mappedName);
      setTimeout(() => { setJustMappedId(null); setJustMappedName(null); }, 3000);
    } catch { /* ignore */ }
    finally { setSavingMatch(false); }
  }

  // Unmap a store
  async function handleUnmap(store: StoreRow) {
    if (!confirm(`Unmap "${store.name}" from Perigee code ${store.perigeeStoreCode}?`)) return;
    try {
      await authFetch(`/api/stores/${store.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perigeeStoreCode: 'Not Mapped', perigeeStoreName: '' }),
      });
      setStores(prev => prev.map(s => s.id === store.id ? {
        ...s, perigeeStoreCode: 'Not Mapped', perigeeStoreName: '',
      } : s));
    } catch { /* ignore */ }
  }

  // Export helpers — authFetch for header-based auth, then trigger download
  async function downloadFile(url: string) {
    const res = await authFetch(url, { cache: 'no-store' });
    if (!res.ok) return;
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match?.[1] || 'export.xlsx';
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
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
                title="Bravo + Perigee Store Matcher"
                description="Upload the master store match file with pre-matched Perigee codes"
                accept=".xlsx,.xls"
                uploading={matchUploading}
                message={matchMsg}
                messageType={matchMsgType}
                statusLine={totalStores > 0 ? `${totalStores.toLocaleString()} stores loaded` : undefined}
                onFile={handleMatchUpload}
                onExportTemplate={() => downloadFile('/api/stores/export?type=template-matched')}
                onExportCurrent={() => downloadFile('/api/stores/export?type=current-matched')}
                onClear={handleClearStores}
                hasData={totalStores > 0}
                clearing={clearingStores}
              />
              <DropZone
                title="Perigee Store Reference"
                description="Upload the Perigee store export — used as the lookup for manual mapping"
                accept=".xlsx,.xls"
                uploading={perigeeUploading}
                message={perigeeMsg}
                messageType={perigeeMsgType}
                statusLine={perigeeRefCount > 0 ? `${perigeeRefCount.toLocaleString()} stores loaded` : undefined}
                onFile={handlePerigeeUpload}
                onExportTemplate={() => downloadFile('/api/perigee-stores/export?type=template')}
                onExportCurrent={() => downloadFile('/api/perigee-stores/export?type=current')}
                onClear={handleClearPerigee}
                hasData={perigeeRefCount > 0}
                clearing={clearingPerigee}
              />
              <DropZone
                title="Bravo Store List"
                description="Upload new Bravo stores (unmapped — map them after upload)"
                accept=".xlsx,.xls,.csv"
                uploading={bravoUploading}
                message={bravoMsg}
                messageType={bravoMsgType}
                statusLine={totalStores > 0 ? `${totalStores.toLocaleString()} stores loaded` : undefined}
                onFile={handleBravoUpload}
                onExportTemplate={() => downloadFile('/api/stores/export?type=template-bravo')}
                onExportCurrent={() => downloadFile('/api/stores/export?type=current-bravo')}
                onClear={handleClearStores}
                hasData={totalStores > 0}
                clearing={clearingStores}
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

        {/* Mapped success toast */}
        {justMappedName && (
          <div className="mb-3 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-center gap-2 animate-pulse">
            <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
            <span className="text-sm font-medium text-green-700">Mapped: {justMappedName}</span>
          </div>
        )}

        {/* Stores table */}
        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading stores...</div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ tableLayout: 'fixed', width: storeColWidths.reduce((a, b) => a + b, 0) + 90 }}>
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    {STORE_COLS.map((col, idx) => (
                      <th
                        key={col.key}
                        className="px-3 py-2.5 font-medium relative select-none cursor-pointer hover:bg-white/10 transition-colors"
                        style={{ width: storeColWidths[idx] }}
                        onClick={() => handleStoreSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {storesSortCol === col.key && <span className="text-[10px]">{storesSortDir === 'asc' ? '▲' : '▼'}</span>}
                        </span>
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30" onMouseDown={e => handleStoreResizeStart(e, idx)} onClick={e => e.stopPropagation()} />
                      </th>
                    ))}
                    <th className="px-3 py-2.5 font-medium" style={{ width: 90 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStores.length === 0 ? (
                    <tr><td colSpan={STORE_COLS.length + 1} className="px-3 py-8 text-center text-gray-400">No stores found</td></tr>
                  ) : (
                    sortedStores.slice(0, 300).map(s => {
                      const isUnmapped = s.perigeeStoreCode === 'Not Mapped';
                      const isJustMapped = s.id === justMappedId;
                      return (
                        <tr key={s.id} className={`border-t border-gray-100 hover:bg-gray-50 transition-colors duration-500 ${isUnmapped ? 'bg-red-50/30' : ''} ${isJustMapped ? 'bg-green-100' : ''}`}>
                          <td className="px-3 py-2 font-medium truncate" style={{ width: storeColWidths[0] }}>{s.name}</td>
                          <td className="px-3 py-2 text-gray-600 truncate" style={{ width: storeColWidths[1] }}>{s.area}</td>
                          <td className="px-3 py-2 truncate" style={{ width: storeColWidths[2] }}>{nameMap[`ch:${s.channelId}`] || '—'}</td>
                          <td className="px-3 py-2 truncate" style={{ width: storeColWidths[3] }}>{nameMap[`tm:${s.teamId}`] || '—'}</td>
                          <td className={`px-3 py-2 truncate ${isUnmapped ? 'text-red-500 font-medium' : 'font-mono text-xs'}`} style={{ width: storeColWidths[4] }}>
                            {s.perigeeStoreCode}
                          </td>
                          <td className="px-3 py-2 text-gray-600 text-xs truncate" style={{ width: storeColWidths[5] }}>{s.perigeeStoreName || '—'}</td>
                          <td className="px-3 py-2" style={{ width: 90 }}>
                            <div className="flex items-center gap-1.5">
                              {isJustMapped ? (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500 text-white text-xs rounded-md font-bold animate-pulse">
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
                                  MAPPED
                                </span>
                              ) : isUnmapped ? (
                                <button
                                  onClick={() => setMappingStore(s)}
                                  className="px-2.5 py-1 bg-[var(--color-navy)] text-white text-xs rounded-md font-medium hover:bg-[var(--color-navy-light)] transition-colors"
                                >
                                  Map
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => setMappingStore(s)}
                                    className="p-1 text-gray-400 hover:text-[var(--color-navy)]"
                                    title="Re-map"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                                  </button>
                                  <button
                                    onClick={() => handleUnmap(s)}
                                    className="p-1 text-gray-400 hover:text-red-500"
                                    title="Unmap"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {sortedStores.length > 300 && (
              <div className="px-3 py-2 text-xs text-gray-400 border-t">Showing 300 of {sortedStores.length} stores</div>
            )}
          </div>
        )}

        {/* Channel breakdown */}
        {channelBreakdown.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-bold text-[var(--color-navy)]">Channel Breakdown</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ tableLayout: 'fixed', width: breakdownColWidths.reduce((a, b) => a + b, 0) }}>
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    {BREAKDOWN_COLS.map((col, idx) => (
                      <th
                        key={col.key}
                        className={`px-3 py-2 font-medium relative select-none cursor-pointer hover:bg-gray-100 transition-colors ${col.align === 'right' ? 'text-right' : ''}`}
                        style={{ width: breakdownColWidths[idx] }}
                        onClick={() => handleBreakdownSort(col.key)}
                      >
                        <span className={`inline-flex items-center gap-1 ${col.align === 'right' ? 'justify-end w-full' : ''}`}>
                          {col.label}
                          {breakdownSortCol === col.key && <span className="text-[10px]">{breakdownSortDir === 'asc' ? '▲' : '▼'}</span>}
                        </span>
                        <div className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-gray-300" onMouseDown={e => handleBreakdownResizeStart(e, idx)} onClick={e => e.stopPropagation()} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedBreakdown.map(cb => {
                    const p = cb.total > 0 ? Math.round((cb.matched / cb.total) * 100) : 0;
                    return (
                      <tr key={cb.name} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium truncate" style={{ width: breakdownColWidths[0] }}>{cb.name}</td>
                        <td className="px-3 py-2 text-right" style={{ width: breakdownColWidths[1] }}>{cb.total}</td>
                        <td className="px-3 py-2 text-right" style={{ width: breakdownColWidths[2] }}>{cb.matched}</td>
                        <td className="px-3 py-2 text-right" style={{ width: breakdownColWidths[3] }}>
                          <span className={`font-medium ${p >= 80 ? 'text-green-600' : p >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{p}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Mapping modal */}
      {mappingStore && (
        <PerigeeSearchModal
          storeName={mappingStore.name}
          storeArea={mappingStore.area}
          onSelect={handleMapSelect}
          onClose={() => !savingMatch && setMappingStore(null)}
          onEmailSupport={handleEmailSupport}
        />
      )}
    </>
  );
}
