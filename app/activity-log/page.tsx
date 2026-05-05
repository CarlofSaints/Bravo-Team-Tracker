'use client';

import { useEffect, useState } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface LogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  detail: string;
  createdAt: string;
}

const ACTION_LABELS: Record<string, string> = {
  'store_mapped': 'Store Mapped',
  'store_unmapped': 'Store Unmapped',
  'support_email_sent': 'Support Email Sent',
  'visits_uploaded': 'Visits Uploaded',
  'visits_cleared': 'Visits Cleared',
  'perigee_stores_uploaded': 'Perigee Stores Uploaded',
  'perigee_stores_cleared': 'Perigee Stores Cleared',
  'bravo_stores_uploaded': 'Bravo Stores Uploaded',
};

export default function ActivityLogPage() {
  const { session, loading, logout } = useAuth('admin');
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [fetching, setFetching] = useState(true);
  const [filterAction, setFilterAction] = useState('');

  useEffect(() => {
    if (!session) return;
    authFetch('/api/activity-log', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        setEntries(Array.isArray(data) ? data : []);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [session]);

  const filtered = filterAction
    ? entries.filter(e => e.action === filterAction)
    : entries;

  // Unique actions present in the log
  const actionKeys = [...new Set(entries.map(e => e.action))];

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Activity Log</h1>

        {/* Filter */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex items-end gap-4">
          <div className="min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Action Type</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
            >
              <option value="">All Actions</option>
              {actionKeys.map(key => (
                <option key={key} value={key}>{ACTION_LABELS[key] || key}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-400 pb-1">{filtered.length} entries</div>
        </div>

        {/* Table */}
        {fetching ? (
          <div className="text-center text-gray-400 py-12">Loading activity log...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
            No activity logged yet
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--color-navy)] text-white text-left">
                    <th className="px-4 py-2.5 font-medium w-[170px]">Date / Time</th>
                    <th className="px-4 py-2.5 font-medium w-[150px]">User</th>
                    <th className="px-4 py-2.5 font-medium w-[180px]">Action</th>
                    <th className="px-4 py-2.5 font-medium">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <tr key={entry.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-600 text-xs whitespace-nowrap">
                        {new Date(entry.createdAt).toLocaleString('en-ZA', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="px-4 py-2 font-medium truncate">{entry.userName}</td>
                      <td className="px-4 py-2">
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {ACTION_LABELS[entry.action] || entry.action}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-gray-600 text-xs">{entry.detail || '—'}</td>
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
