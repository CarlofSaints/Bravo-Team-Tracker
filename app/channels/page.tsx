'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface ChannelRow { id: string; name: string; targetFrequency?: string; createdAt: string }

const FREQ_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly_3', label: '3\u00d7 per Month' },
  { value: 'monthly_2', label: 'Twice a Month' },
  { value: 'monthly_1', label: 'Once a Month' },
  { value: 'bimonthly', label: 'Every 2nd Month' },
  { value: 'quarterly', label: 'Once a Quarter' },
  { value: 'biannual', label: 'Twice a Year' },
  { value: 'annual', label: 'Annual' },
];

function freqLabel(val?: string): string {
  if (!val) return '\u2014';
  return FREQ_OPTIONS.find(o => o.value === val)?.label || val;
}

const COLUMNS = [
  { key: 'name', label: 'Channel', defaultWidth: 250 },
  { key: 'frequency', label: 'Target Frequency', defaultWidth: 200 },
  { key: 'actions', label: 'Actions', defaultWidth: 90 },
];

export default function ChannelsPage() {
  const { session, loading, logout } = useAuth('admin');

  const [channels, setChannels] = useState<ChannelRow[]>([]);
  const [fetching, setFetching] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formFreq, setFormFreq] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Column widths
  const [colWidths, setColWidths] = useState<number[]>(COLUMNS.map(c => c.defaultWidth));
  const resizingRef = useRef<{ colIdx: number; startX: number; startW: number } | null>(null);

  useEffect(() => {
    if (!session) return;
    reload();
  }, [session]);

  function reload() {
    setFetching(true);
    authFetch('/api/channels', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        list.sort((a: ChannelRow, b: ChannelRow) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
        setChannels(list);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }

  function openCreate() {
    setEditId(null); setFormName(''); setFormFreq(''); setError(''); setShowForm(true);
  }

  function openEdit(ch: ChannelRow) {
    setEditId(ch.id); setFormName(ch.name); setFormFreq(ch.targetFrequency || ''); setError(''); setShowForm(true);
  }

  async function handleSave() {
    if (!formName.trim()) { setError('Name required'); return; }
    setSaving(true); setError('');
    try {
      const body = { name: formName.trim(), targetFrequency: formFreq || null };
      const url = editId ? `/api/channels/${editId}` : '/api/channels';
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
    if (!confirm('Delete this channel?')) return;
    await authFetch(`/api/channels/${id}`, { method: 'DELETE' });
    reload();
  }

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

  async function handleExport() {
    const XLSX = await import('xlsx');
    const rows = channels.map(ch => ({
      'Channel': ch.name,
      'Target Frequency': freqLabel(ch.targetFrequency),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Channels');
    XLSX.writeFile(wb, 'channels.xlsx');
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-[var(--color-navy)]">Channels</h1>
          <div className="flex gap-2">
            {channels.length > 0 && (
              <button onClick={handleExport} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
                Export Excel
              </button>
            )}
            <button onClick={openCreate} className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy-light)] transition-colors">
              + New Channel
            </button>
          </div>
        </div>

        {showForm && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-[var(--color-navy)] mb-4">{editId ? 'Edit Channel' : 'New Channel'}</h2>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel Name</label>
                  <input value={formName} onChange={e => setFormName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Visit Frequency</label>
                  <select
                    value={formFreq}
                    onChange={e => setFormFreq(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]"
                  >
                    {FREQ_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
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
          <div className="text-center text-gray-400 py-12">Loading channels...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="text-sm" style={{ tableLayout: 'fixed', width: colWidths.reduce((a, b) => a + b, 0) }}>
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    {COLUMNS.map((col, idx) => (
                      <th
                        key={col.key}
                        className="px-3 py-2 font-medium relative select-none"
                        style={{ width: colWidths[idx] }}
                      >
                        {col.label}
                        {idx < COLUMNS.length - 1 && (
                          <div
                            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-white/30"
                            onMouseDown={e => handleResizeStart(e, idx)}
                          />
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channels.length === 0 ? (
                    <tr><td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-gray-400">No channels yet</td></tr>
                  ) : (
                    channels.map(ch => (
                      <tr key={ch.id} className="border-t border-gray-100 hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium truncate" style={{ width: colWidths[0] }}>{ch.name}</td>
                        <td className="px-3 py-2 text-gray-600 truncate" style={{ width: colWidths[1] }}>{freqLabel(ch.targetFrequency)}</td>
                        <td className="px-3 py-2" style={{ width: colWidths[2] }}>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(ch)} className="p-1 text-gray-400 hover:text-[var(--color-navy)]">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                            </button>
                            <button onClick={() => handleDelete(ch.id)} className="p-1 text-gray-400 hover:text-red-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
