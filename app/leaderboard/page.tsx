'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface Team { id: string; name: string; iconKey: string | null }
interface StoreRow { id: string; perigeeStoreCode: string; teamId: string; channelId: string }
interface ChannelRow { id: string; name: string; targetFrequency?: string }

const FREQ_RATE: Record<string, number> = { weekly: 4, monthly_3: 3, monthly_2: 2, monthly_1: 1, bimonthly: 0.5, quarterly: 0.333, biannual: 0.167, annual: 0.083 };

const COLUMNS = [
  { key: 'rank', label: 'Rank', defaultWidth: 70 },
  { key: 'team', label: 'Team', defaultWidth: 200 },
  { key: 'visits', label: 'Visits', defaultWidth: 100 },
  { key: 'targetPct', label: '% to Target', defaultWidth: 110 },
  { key: 'displayMaintenance', label: 'Display Maintenance', defaultWidth: 150 },
  { key: 'promo', label: 'Promo Compliance', defaultWidth: 150 },
  { key: 'total', label: 'Total', defaultWidth: 100 },
];

function getDefaultRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return { from, to };
}

function rankBadge(rank: number) {
  if (rank === 1) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-400 text-white text-xs font-bold">1</span>;
  if (rank === 2) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-300 text-white text-xs font-bold">2</span>;
  if (rank === 3) return <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-700 text-white text-xs font-bold">3</span>;
  return <span className="inline-flex items-center justify-center w-7 h-7 text-sm text-gray-500 font-medium">{rank}</span>;
}

export default function LeaderboardPage() {
  const { session, loading, logout } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [visitMap, setVisitMap] = useState<Record<string, number>>({});
  const [fetching, setFetching] = useState(true);

  // Filters
  const { from: defaultFrom, to: defaultTo } = getDefaultRange();
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);
  const [filterChannel, setFilterChannel] = useState('');

  // Column widths
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.defaultWidth));
  const resizingRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      authFetch('/api/teams', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/stores', { cache: 'no-store' }).then(r => r.json()),
      authFetch('/api/channels', { cache: 'no-store' }).then(r => r.json()),
    ]).then(([t, s, c]) => {
      setTeams(Array.isArray(t) ? t : []);
      setStores(Array.isArray(s) ? s : []);
      setChannels(Array.isArray(c) ? c : []);
      setFetching(false);
    }).catch(() => setFetching(false));
  }, [session]);

  // Fetch visits when dates change
  const fetchVisits = useCallback(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    authFetch(`/api/visits?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setVisitMap(data.byStoreCode || {}))
      .catch(() => {});
  }, [dateFrom, dateTo]);

  useEffect(() => {
    if (!session) return;
    fetchVisits();
  }, [session, fetchVisits]);

  // How many months does the date range span?
  const monthsInRange = useMemo(() => {
    if (!dateFrom || !dateTo) return 1;
    const f = new Date(dateFrom);
    const t = new Date(dateTo);
    const months = (t.getFullYear() - f.getFullYear()) * 12 + (t.getMonth() - f.getMonth()) + 1;
    return Math.max(1, months);
  }, [dateFrom, dateTo]);

  // Channel frequency lookup
  const channelFreqMap = useMemo(() => {
    const m: Record<string, string> = {};
    channels.forEach(c => { if (c.targetFrequency) m[c.id] = c.targetFrequency; });
    return m;
  }, [channels]);

  // Aggregate visits by team
  const rows = useMemo(() => {
    const mappedStores = stores.filter(s => s.perigeeStoreCode !== 'Not Mapped');

    return teams.map(t => {
      const teamStores = mappedStores.filter(s => {
        if (s.teamId !== t.id) return false;
        if (filterChannel && s.channelId !== filterChannel) return false;
        return true;
      });
      const visits = teamStores.reduce((sum, s) => sum + (visitMap[s.perigeeStoreCode] || 0), 0);

      // Calculate target % for this team
      let targetTotal = 0;
      let targetedVisits = 0;
      let hasTarget = false;
      channels.forEach(ch => {
        const freq = ch.targetFrequency;
        if (!freq) return;
        const rate = FREQ_RATE[freq];
        if (rate === undefined) return;
        const teamChStores = teamStores.filter(s => s.channelId === ch.id);
        if (teamChStores.length > 0) {
          targetTotal += teamChStores.length * rate * monthsInRange;
          targetedVisits += teamChStores.reduce((sum, s) => sum + (visitMap[s.perigeeStoreCode] || 0), 0);
          hasTarget = true;
        }
      });
      const targetPct = hasTarget && targetTotal > 0 ? Math.round((targetedVisits / targetTotal) * 100) : undefined;

      return { team: t, visits, targetPct, displayMaintenance: 0, promo: 0, total: visits };
    })
    .filter(r => r.total > 0 || stores.some(s => s.teamId === r.team.id))
    .sort((a, b) => b.total - a.total)
    .map((row, i) => ({ ...row, rank: i + 1 }));
  }, [teams, stores, channels, visitMap, filterChannel, monthsInRange]);

  // Totals row
  const totals = useMemo(() => {
    const visits = rows.reduce((sum, r) => sum + r.visits, 0);
    const displayMaintenance = rows.reduce((sum, r) => sum + r.displayMaintenance, 0);
    const promo = rows.reduce((sum, r) => sum + r.promo, 0);
    const total = rows.reduce((sum, r) => sum + r.total, 0);

    // Overall target %
    const mappedStores = stores.filter(s => s.perigeeStoreCode !== 'Not Mapped');
    let targetTotal = 0;
    let targetedVisits = 0;
    let hasTarget = false;
    channels.forEach(ch => {
      const freq = ch.targetFrequency;
      if (!freq) return;
      const rate = FREQ_RATE[freq];
      if (rate === undefined) return;
      const chStores = mappedStores.filter(s => {
        if (filterChannel && s.channelId !== filterChannel) return false;
        return s.channelId === ch.id;
      });
      if (chStores.length > 0) {
        targetTotal += chStores.length * rate * monthsInRange;
        targetedVisits += chStores.reduce((sum, s) => sum + (visitMap[s.perigeeStoreCode] || 0), 0);
        hasTarget = true;
      }
    });
    const targetPct = hasTarget && targetTotal > 0 ? Math.round((targetedVisits / targetTotal) * 100) : undefined;

    return { visits, targetPct, displayMaintenance, promo, total };
  }, [rows, stores, channels, visitMap, filterChannel, monthsInRange]);

  // Resize handlers
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

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Team Leaderboard</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-[150px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Channel</label>
            <select value={filterChannel} onChange={e => setFilterChannel(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]">
              <option value="">All</option>
              {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]" />
          </div>
          <div className="min-w-[130px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {fetching ? (
            <div className="text-center text-gray-400 py-12">Loading teams...</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No teams found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}>
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    {COLUMNS.map((col, idx) => (
                      <th
                        key={col.key}
                        className={`px-4 py-3 font-semibold relative select-none ${idx > 1 ? 'text-right' : ''}`}
                        style={{ width: colWidths[idx] }}
                      >
                        {col.label}
                        <div
                          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
                          onMouseDown={e => handleResizeStart(e, idx)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.team.id} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3" style={{ width: colWidths[0] }}>{rankBadge(row.rank)}</td>
                      <td className="px-4 py-3" style={{ width: colWidths[1] }}>
                        <div className="flex items-center gap-3">
                          {row.team.iconKey ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={`/api/teams/${row.team.id}/icon`} alt={row.team.name} className="w-8 h-8 rounded-lg object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)] text-[var(--color-navy)] flex items-center justify-center font-bold text-xs">
                              {row.team.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-medium text-[var(--color-navy)]">{row.team.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-700" style={{ width: colWidths[2] }}>{row.visits.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right" style={{ width: colWidths[3] }}>
                        {row.targetPct !== undefined ? (
                          <span className={`inline-block min-w-[48px] text-center px-2 py-0.5 rounded text-xs font-bold ${row.targetPct >= 100 ? 'bg-green-100 text-green-700' : row.targetPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {row.targetPct}%
                          </span>
                        ) : (
                          <span className="text-gray-400">{'\u2014'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400" style={{ width: colWidths[4] }}>{row.displayMaintenance || '\u2014'}</td>
                      <td className="px-4 py-3 text-right text-gray-400" style={{ width: colWidths[5] }}>{row.promo || '\u2014'}</td>
                      <td className="px-4 py-3 text-right font-bold text-[var(--color-navy)]" style={{ width: colWidths[6] }}>{row.total.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-[var(--color-navy)] bg-gray-50 font-bold">
                    <td className="px-4 py-3" style={{ width: colWidths[0] }}></td>
                    <td className="px-4 py-3 text-[var(--color-navy)]" style={{ width: colWidths[1] }}>Total</td>
                    <td className="px-4 py-3 text-right text-gray-700" style={{ width: colWidths[2] }}>{totals.visits.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right" style={{ width: colWidths[3] }}>
                      {totals.targetPct !== undefined ? (
                        <span className={`inline-block min-w-[48px] text-center px-2 py-0.5 rounded text-xs font-bold ${totals.targetPct >= 100 ? 'bg-green-100 text-green-700' : totals.targetPct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {totals.targetPct}%
                        </span>
                      ) : (
                        <span className="text-gray-400">{'\u2014'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400" style={{ width: colWidths[4] }}>{totals.displayMaintenance || '\u2014'}</td>
                    <td className="px-4 py-3 text-right text-gray-400" style={{ width: colWidths[5] }}>{totals.promo || '\u2014'}</td>
                    <td className="px-4 py-3 text-right text-[var(--color-navy)]" style={{ width: colWidths[6] }}>{totals.total.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
