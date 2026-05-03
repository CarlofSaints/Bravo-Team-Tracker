'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

export default function DataImportPage() {
  const { session, loading, logout } = useAuth('admin');

  // Visits upload
  const [visitUploading, setVisitUploading] = useState(false);
  const [visitMsg, setVisitMsg] = useState('');
  const [visitMsgType, setVisitMsgType] = useState<'success' | 'error' | ''>('');
  const [clearingVisits, setClearingVisits] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [visitTotal, setVisitTotal] = useState(0);
  const visitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!session) return;
    authFetch('/api/visits', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setVisitTotal(d.total || 0))
      .catch(() => {});
  }, [session]);

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
        setVisitTotal(data.totalVisits);
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
        setVisitTotal(0);
      }
    } catch { /* ignore */ }
    finally { setClearingVisits(false); }
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Data Import</h1>

        {/* Visits upload section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--color-navy)]">Perigee Visits</h2>
                <p className="text-xs text-gray-500">Import visit data exported from Perigee</p>
              </div>
            </div>
            {visitTotal > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">{visitTotal.toLocaleString()} visits stored</span>
                <button
                  onClick={handleClearVisits}
                  disabled={clearingVisits}
                  className="text-xs text-red-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 border border-gray-200 hover:border-red-200 rounded-lg py-1.5 px-3 transition-colors disabled:opacity-50"
                >
                  {clearingVisits ? 'Clearing...' : 'Clear All'}
                </button>
              </div>
            )}
          </div>

          <input ref={visitInputRef} type="file" accept=".xlsx,.xls" onChange={e => { const f = e.target.files?.[0]; if (f) handleVisitUpload(f); e.target.value = ''; }} className="hidden" />
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
                handleVisitUpload(file);
              } else {
                setVisitMsg('Please drop an .xlsx or .xls file');
                setVisitMsgType('error');
              }
            }}
            onClick={() => !visitUploading && visitInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
              dragOver
                ? 'border-[var(--color-navy)] bg-blue-50'
                : visitUploading
                  ? 'border-gray-200 bg-gray-50 cursor-wait'
                  : 'border-gray-300 hover:border-[var(--color-navy)] hover:bg-gray-50'
            }`}
          >
            {visitUploading ? (
              <div className="flex flex-col items-center gap-2">
                <svg className="w-8 h-8 text-[var(--color-navy)] animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-sm font-medium text-[var(--color-navy)]">{visitMsg || 'Processing...'}</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <svg className={`w-10 h-10 ${dragOver ? 'text-[var(--color-navy)]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <div>
                  <span className="text-sm font-medium text-[var(--color-navy)]">Drop Perigee visits file here</span>
                  <span className="text-sm text-gray-400"> or </span>
                  <span className="text-sm font-medium text-[var(--color-navy)] underline">browse</span>
                </div>
                <span className="text-xs text-gray-400">.xlsx or .xls</span>
              </div>
            )}
          </div>
          {visitMsg && !visitUploading && (
            <div className={`mt-3 text-sm font-medium text-center ${visitMsgType === 'error' ? 'text-red-600' : visitMsgType === 'success' ? 'text-green-600' : 'text-blue-600'}`}>
              {visitMsg}
            </div>
          )}
        </div>

        {/* Sync emails from visit data */}
        <SyncEmailsSection />

        {/* Placeholder for future form imports */}
        <div className="bg-white rounded-xl border border-gray-200 border-dashed p-6 max-w-2xl mt-6 text-center">
          <div className="text-gray-400">
            <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            <p className="text-sm font-medium">Form Imports</p>
            <p className="text-xs mt-1">Coming soon</p>
          </div>
        </div>
      </main>
    </>
  );
}

interface SyncResult { email: string; userName: string; status: string }

function SyncEmailsSection() {
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<{ updated: number; alreadySet: number; noMatch: number; results: SyncResult[] } | null>(null);
  const [error, setError] = useState('');

  async function handleSync() {
    setSyncing(true); setError(''); setResults(null);
    try {
      const res = await authFetch('/api/users/bulk-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      if (!res.ok) { setError('Failed to sync emails'); return; }
      const data = await res.json();
      setResults(data);
    } catch { setError('Network error'); }
    finally { setSyncing(false); }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl mt-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-navy)]">Sync User Emails</h2>
          <p className="text-xs text-gray-500">Match visit rep emails to users by name</p>
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Reads emails from visit data and matches them to existing users by first + last name. Only updates users who don&apos;t already have an email set.
      </p>
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {syncing ? 'Syncing...' : 'Sync Emails from Visits'}
      </button>
      {error && <div className="mt-3 text-sm text-red-600 font-medium">{error}</div>}
      {results && (
        <div className="mt-4">
          <div className="flex gap-4 text-sm mb-3">
            <span className="text-green-600 font-medium">{results.updated} updated</span>
            <span className="text-gray-500">{results.alreadySet} already set</span>
            <span className="text-amber-600">{results.noMatch} no match</span>
          </div>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-gray-500 sticky top-0">
                  <th className="px-3 py-2 text-left font-medium">Email</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-3 py-1.5 font-mono">{r.email}</td>
                    <td className="px-3 py-1.5">{r.userName}</td>
                    <td className="px-3 py-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'updated' ? 'bg-green-100 text-green-700' :
                        r.status === 'already_set' ? 'bg-gray-100 text-gray-500' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {r.status === 'updated' ? 'UPDATED' : r.status === 'already_set' ? 'ALREADY SET' : 'NO MATCH'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
