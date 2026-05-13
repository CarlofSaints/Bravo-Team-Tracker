'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface TrainingRow {
  id: string;
  visitUUID: string;
  baName: string;
  storeName: string;
  storeCode: string;
  date: string;
  didComplete: boolean;
  fspsTrained: number;
  trainingDuration: number;
  productsTrained: string;
  trainingType: string;
}

const COLUMNS = [
  { key: 'baName', label: 'BA Name', defaultWidth: 160 },
  { key: 'storeName', label: 'Store Name', defaultWidth: 180 },
  { key: 'date', label: 'Date', defaultWidth: 110 },
  { key: 'didComplete', label: 'Did Complete', defaultWidth: 110 },
  { key: 'fspsTrained', label: 'FSPs Trained', defaultWidth: 110 },
  { key: 'trainingDuration', label: 'Duration (mins)', defaultWidth: 130 },
  { key: 'productsTrained', label: 'Products Trained', defaultWidth: 200 },
  { key: 'trainingType', label: 'Training Type', defaultWidth: 160 },
];

function getDefaultMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export default function TrainingPage() {
  const { session, loading, logout } = useAuth();
  const [records, setRecords] = useState<TrainingRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [month, setMonth] = useState(getDefaultMonth);

  // Sort state
  const [sortKey, setSortKey] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Column widths
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.defaultWidth));
  const resizingRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    const params = new URLSearchParams({ data: '1' });
    if (month) params.set('month', month);
    authFetch(`/api/training?${params}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => setRecords(Array.isArray(data) ? data : []))
      .catch(() => setRecords([]))
      .finally(() => setFetching(false));
  }, [session, month]);

  // KPI calculations
  const kpis = useMemo(() => {
    const completed = records.filter(r => r.didComplete);

    // Most Trained: BA with most completed sessions
    const baCounts: Record<string, number> = {};
    for (const r of completed) {
      if (r.baName) baCounts[r.baName] = (baCounts[r.baName] || 0) + 1;
    }
    let mostTrained = '';
    let mostCount = 0;
    for (const [name, c] of Object.entries(baCounts)) {
      if (c > mostCount) { mostTrained = name; mostCount = c; }
    }

    // Best Trainer: BA with highest average fspsTrained
    const baFsps: Record<string, { total: number; count: number }> = {};
    for (const r of completed) {
      if (r.baName && r.fspsTrained > 0) {
        if (!baFsps[r.baName]) baFsps[r.baName] = { total: 0, count: 0 };
        baFsps[r.baName].total += r.fspsTrained;
        baFsps[r.baName].count += 1;
      }
    }
    let bestTrainer = '';
    let bestAvg = 0;
    for (const [name, stats] of Object.entries(baFsps)) {
      const avg = stats.total / stats.count;
      if (avg > bestAvg) { bestTrainer = name; bestAvg = avg; }
    }

    // Avg Training Duration
    const durations = completed.filter(r => r.trainingDuration > 0).map(r => r.trainingDuration);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Total FSPs Trained
    const totalFsps = completed.reduce((sum, r) => sum + r.fspsTrained, 0);

    return { bestTrainer, mostTrained, mostCount, avgDuration, totalFsps };
  }, [records]);

  // Sorted data
  const sortedRecords = useMemo(() => {
    const sorted = [...records].sort((a, b) => {
      const key = sortKey as keyof TrainingRow;
      const av = a[key];
      const bv = b[key];
      if (typeof av === 'number' && typeof bv === 'number') {
        return sortDir === 'asc' ? av - bv : bv - av;
      }
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return sortDir === 'asc' ? (av === bv ? 0 : av ? 1 : -1) : (av === bv ? 0 : av ? -1 : 1);
      }
      const as = String(av ?? '');
      const bs = String(bv ?? '');
      return sortDir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return sorted;
  }, [records, sortKey, sortDir]);

  function handleSort(key: string) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

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
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Training Analytics</h1>

        {/* Month Filter */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="min-w-[160px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
            />
          </div>
          <div className="text-xs text-gray-400">
            {records.length} record{records.length !== 1 ? 's' : ''} found
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Best Trainer</div>
            <div className="mt-1 text-lg font-bold text-[var(--color-navy)] truncate">
              {kpis.bestTrainer || '\u2014'}
            </div>
            {kpis.bestTrainer && (
              <div className="mt-0.5 text-xs text-gray-400">Highest avg FSPs per session</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Most Trained</div>
            <div className="mt-1 text-lg font-bold text-[var(--color-navy)] truncate">
              {kpis.mostTrained || '\u2014'}
            </div>
            {kpis.mostTrained && (
              <div className="mt-0.5 text-xs text-gray-400">{kpis.mostCount} session{kpis.mostCount !== 1 ? 's' : ''}</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg Training Duration</div>
            <div className="mt-1 text-2xl font-bold text-[var(--color-navy)]">
              {kpis.avgDuration > 0 ? `${kpis.avgDuration} min` : '\u2014'}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">FSPs Trained</div>
            <div className="mt-1 text-2xl font-bold text-[var(--color-navy)]">
              {kpis.totalFsps > 0 ? kpis.totalFsps.toLocaleString() : '\u2014'}
            </div>
          </div>
        </div>

        {/* Data Grid */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {fetching ? (
            <div className="text-center text-gray-400 py-12">Loading training data...</div>
          ) : sortedRecords.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No training records for this month</div>
          ) : (
            <div style={{ maxHeight: 600, overflowY: 'auto', overflowX: 'auto' }}>
              <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}>
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    {COLUMNS.map((col, idx) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 font-semibold relative select-none cursor-pointer hover:bg-white/10"
                        style={{ width: colWidths[idx], position: 'sticky', top: 0, zIndex: 10, background: 'var(--color-navy)' }}
                        onClick={() => handleSort(col.key)}
                      >
                        <span className="flex items-center gap-1">
                          {col.label}
                          {sortKey === col.key && (
                            <span className="text-xs">{sortDir === 'asc' ? '\u25B2' : '\u25BC'}</span>
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
                  {sortedRecords.map((row, i) => (
                    <tr key={row.id || i} className="border-t border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 truncate" style={{ width: colWidths[0] }}>{row.baName}</td>
                      <td className="px-4 py-2.5 truncate" style={{ width: colWidths[1] }}>{row.storeName}</td>
                      <td className="px-4 py-2.5 text-gray-600" style={{ width: colWidths[2] }}>{row.date}</td>
                      <td className="px-4 py-2.5" style={{ width: colWidths[3] }}>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          row.didComplete ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {row.didComplete ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700" style={{ width: colWidths[4] }}>{row.fspsTrained || '\u2014'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700" style={{ width: colWidths[5] }}>{row.trainingDuration || '\u2014'}</td>
                      <td className="px-4 py-2.5 truncate text-gray-600" style={{ width: colWidths[6] }}>{row.productsTrained || '\u2014'}</td>
                      <td className="px-4 py-2.5 truncate text-gray-600" style={{ width: colWidths[7] }}>{row.trainingType || '\u2014'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
