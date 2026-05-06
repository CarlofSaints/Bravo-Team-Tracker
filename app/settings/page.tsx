'use client';

import { useEffect, useState } from 'react';
import { useAuth, authFetch } from '@/lib/useAuth';
import Sidebar from '@/components/Sidebar';

interface PollSlot {
  id: string;
  time: string;
  type: 'short' | 'long';
  enabled: boolean;
}

interface PollSchedule {
  slots: PollSlot[];
  timezone: string;
}

interface PerigeeConfig {
  apiKey: string;
  endpoint: string;
  enabled: boolean;
  customer: string;
  lastPolledAt: string | null;
  requestBody?: string;
}

interface CronLogEntry {
  timestamp: string;
  matched: boolean;
  slotTime?: string;
  slotType?: string;
  result?: string;
  imported?: number;
  skipped?: number;
  error?: string;
}

interface TestResult {
  ok?: boolean;
  error?: string;
  detail?: string;
  totalRows?: number;
  responseKeys?: string[];
  sample?: Record<string, unknown>[];
  rawTopLevelKeys?: string[];
  meta?: Record<string, unknown>;
  sentBody?: Record<string, unknown>;
}

const DEFAULT_BODY = JSON.stringify({
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  channels: [],
  stores: [],
  provinces: [],
  users: [],
  tags: [],
  customers: [],
  userStatus: ['ACTIVE', 'INACTIVE'],
  userAccess: ['ENABLED', 'SUSPENDED'],
  includeDataUsage: 'YES',
  includeNotificationData: 'NO',
  includeTravelDistance: 'YES',
  includeRecessData: 'NO',
  earlyCheckoutTime: '16:50',
  lateCheckinTime: '09:10',
}, null, 2);

export default function SettingsPage() {
  const { session, loading, logout } = useAuth('admin');

  // Mapping emails
  const [mappingEmails, setMappingEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [msg, setMsg] = useState('');

  // Perigee API config
  const [config, setConfig] = useState<PerigeeConfig | null>(null);
  const [form, setForm] = useState({ apiKey: '', endpoint: '', enabled: false, customer: '' });
  const [requestBody, setRequestBody] = useState(DEFAULT_BODY);
  const [bodyError, setBodyError] = useState('');
  const [configSaving, setConfigSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [toast, setToast] = useState('');

  // Polling schedule
  const [schedule, setSchedule] = useState<PollSchedule>({ slots: [], timezone: 'Africa/Johannesburg' });
  const [savingSchedule, setSavingSchedule] = useState(false);

  // Cron logs
  const [cronLogs, setCronLogs] = useState<CronLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [testingCron, setTestingCron] = useState(false);

  useEffect(() => {
    if (!session) return;
    // Load mapping emails from old settings
    authFetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setMappingEmails(d.mappingEmails || []);
        setFetching(false);
      })
      .catch(() => setFetching(false));

    // Load perigee config
    authFetch('/api/config/perigee')
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setConfig(data);
          setForm({ apiKey: '', endpoint: data.endpoint || '', enabled: data.enabled || false, customer: data.customer || '' });
          if (data.requestBody) setRequestBody(data.requestBody);
        }
      })
      .catch(() => {});

    // Load schedule
    authFetch('/api/config/perigee-schedule')
      .then(r => r.json())
      .then(data => { if (data.slots) setSchedule(data); })
      .catch(() => {});

    loadCronLogs();
  }, [session]);

  function loadCronLogs() {
    setLoadingLogs(true);
    authFetch('/api/cron/logs')
      .then(r => r.json())
      .then(data => { if (data.logs) setCronLogs(data.logs); })
      .catch(() => {})
      .finally(() => setLoadingLogs(false));
  }

  async function testCronNow() {
    setTestingCron(true);
    try {
      const res = await authFetch('/api/cron/poll-visits?force=true');
      const data = await res.json();
      showToast(
        data.ok
          ? `Cron test: ${data.action} — imported: ${data.imported ?? 0}, skipped: ${data.skipped ?? 0}${data.reason ? ` (${data.reason})` : ''}`
          : `Cron error: ${data.error || 'Unknown'}`
      );
      loadCronLogs();
    } catch {
      showToast('Failed to trigger cron');
    } finally {
      setTestingCron(false);
    }
  }

  function showToast(m: string) {
    setToast(m);
    setTimeout(() => setToast(''), 3500);
  }

  // ── Mapping Emails ─────────────────────────────────────────────────────────
  async function saveEmails(emails: string[]) {
    setSaving(true);
    setMsg('');
    try {
      const res = await authFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingEmails: emails }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const d = await res.json();
      setMappingEmails(d.mappingEmails || []);
      setMsg('Saved');
      setTimeout(() => setMsg(''), 2000);
    } catch {
      setMsg('Error saving');
    } finally {
      setSaving(false);
    }
  }

  function handleAdd() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return;
    if (mappingEmails.includes(email)) { setNewEmail(''); return; }
    const updated = [...mappingEmails, email];
    setMappingEmails(updated);
    setNewEmail('');
    saveEmails(updated);
  }

  function handleRemove(email: string) {
    const updated = mappingEmails.filter(e => e !== email);
    setMappingEmails(updated);
    saveEmails(updated);
  }

  // ── Perigee Config ─────────────────────────────────────────────────────────
  function handleBodyChange(val: string) {
    setRequestBody(val);
    try { JSON.parse(val); setBodyError(''); }
    catch (e) { setBodyError(e instanceof Error ? e.message : 'Invalid JSON'); }
  }

  async function handleConfigSave() {
    setConfigSaving(true);
    try {
      try { JSON.parse(requestBody); } catch {
        showToast('Fix the JSON errors before saving');
        setConfigSaving(false);
        return;
      }
      const body: Record<string, unknown> = {
        endpoint: form.endpoint,
        enabled: form.enabled,
        customer: form.customer,
        requestBody,
      };
      if (form.apiKey) body.apiKey = form.apiKey;

      const res = await authFetch('/api/config/perigee', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast('Settings saved');
        setForm(f => ({ ...f, apiKey: '' }));
        const r2 = await authFetch('/api/config/perigee');
        setConfig(await r2.json());
      } else {
        showToast('Save failed');
      }
    } catch {
      showToast('Save failed');
    } finally {
      setConfigSaving(false);
    }
  }

  async function callPoll(mode: 'test' | 'import') {
    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(requestBody); }
    catch { showToast('Fix the JSON errors first'); return; }

    if (!parsed.startDate) { showToast('startDate is required in the request body'); return; }

    if (mode === 'test') { setTesting(true); setTestResult(null); }
    else {
      if (!confirm(`Import visits from ${parsed.startDate}? This will create new visit records.`)) return;
      setImporting(true);
    }

    try {
      const res = await authFetch('/api/visits/poll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...parsed, mode }),
      });
      const data = await res.json();

      if (mode === 'test') {
        setTestResult(data);
        showToast(data.ok ? `Test OK \u2014 ${data.totalRows} visits returned` : (data.error || 'Test failed'));
      } else {
        showToast(data.ok ? `Imported ${data.importedRows} visits (${data.skippedDuplicates ?? 0} duplicates skipped)` : (data.error || 'Import failed'));
      }
    } catch {
      showToast(`${mode === 'test' ? 'Connection' : 'Import'} failed`);
    } finally {
      setTesting(false);
      setImporting(false);
    }
  }

  // ── Polling Schedule ───────────────────────────────────────────────────────
  function addPollSlot() {
    setSchedule(s => ({
      ...s,
      slots: [...s.slots, { id: crypto.randomUUID(), time: '08:00', type: 'short', enabled: true }],
    }));
  }

  function updateSlot(id: string, field: keyof PollSlot, value: string | boolean) {
    setSchedule(s => ({
      ...s,
      slots: s.slots.map(sl => sl.id === id ? { ...sl, [field]: value } : sl),
    }));
  }

  function removeSlot(id: string) {
    setSchedule(s => ({ ...s, slots: s.slots.filter(sl => sl.id !== id) }));
  }

  async function saveScheduleHandler() {
    setSavingSchedule(true);
    try {
      const res = await authFetch('/api/config/perigee-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      showToast(res.ok ? 'Poll schedule saved' : 'Failed to save schedule');
    } catch {
      showToast('Failed to save schedule');
    } finally {
      setSavingSchedule(false);
    }
  }

  if (loading || !session) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>;
  }

  return (
    <>
      <Sidebar session={session} onLogout={logout} />
      <main className="ml-64 p-6">
        <h1 className="text-2xl font-bold text-[var(--color-navy)] mb-6">Settings</h1>

        {/* Mapping Emails Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl">
          <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Mapping Email Recipients</h2>
          <p className="text-sm text-gray-500 mb-4">
            These email addresses are used when a user clicks &quot;Email Support&quot; on the Store Mapper page to request a store be added to Perigee.
          </p>

          {fetching ? (
            <div className="text-sm text-gray-400">Loading...</div>
          ) : (
            <>
              <div className="flex flex-col gap-2 mb-4">
                {mappingEmails.length === 0 && (
                  <div className="text-sm text-gray-400 italic">No email addresses configured</div>
                )}
                {mappingEmails.map(email => (
                  <div key={email} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{email}</span>
                    <button
                      onClick={() => handleRemove(email)}
                      disabled={saving}
                      className="text-red-400 hover:text-red-600 p-1 transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } }}
                  placeholder="Add email address..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
                />
                <button
                  onClick={handleAdd}
                  disabled={saving || !newEmail.trim()}
                  className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
                >
                  Add
                </button>
              </div>

              {msg && (
                <div className={`text-xs mt-2 font-medium ${msg === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
                  {msg}
                </div>
              )}
            </>
          )}
        </div>

        {/* Perigee API Connection */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl mt-6">
          <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Perigee API Connection</h2>
          <p className="text-sm text-gray-500 mb-4">Endpoint and authentication for the Perigee visit data API</p>

          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">API Endpoint</label>
              <input
                type="url"
                value={form.endpoint}
                onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                placeholder="https://live.perigeeportal.co.za/api/visits"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Bearer Token {config?.apiKey && <span className="text-gray-400">(current: {config.apiKey})</span>}
              </label>
              <input
                type="password"
                value={form.apiKey}
                onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))}
                placeholder="Leave blank to keep current token"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Customer Filter</label>
              <input
                type="text"
                value={form.customer}
                onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
                placeholder="e.g. Bravo Sleep"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
              />
              <p className="text-[10px] text-gray-400 mt-1">Only visits for this customer will be imported from Perigee</p>
            </div>
            {config?.lastPolledAt && (
              <p className="text-xs text-gray-500">
                Last polled: {new Date(config.lastPolledAt).toLocaleString('en-ZA')}
              </p>
            )}
            <button
              onClick={handleConfigSave}
              disabled={configSaving}
              className="w-fit px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
            >
              {configSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Request Body + Test/Import */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl mt-6">
          <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Request Body</h2>
          <p className="text-sm text-gray-500 mb-4">JSON body sent to Perigee &mdash; edit filters, dates, and options below</p>

          <textarea
            value={requestBody}
            onChange={e => handleBodyChange(e.target.value)}
            rows={18}
            spellCheck={false}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/30"
            style={{ resize: 'vertical' }}
          />
          {bodyError && (
            <p className="text-red-600 text-xs mt-1">{bodyError}</p>
          )}

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => callPoll('test')}
              disabled={testing || !!bodyError}
              className="px-4 py-2 border border-[var(--color-navy)] text-[var(--color-navy)] rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/5 transition-colors disabled:opacity-50"
            >
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button
              onClick={() => callPoll('import')}
              disabled={importing || !!bodyError}
              className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import Visits'}
            </button>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className={`mt-4 p-4 rounded-lg text-sm border ${testResult.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {testResult.ok ? (
                <>
                  <p className="font-semibold text-green-800 mb-1">
                    Connection successful &mdash; {testResult.totalRows} visits returned
                  </p>
                  {testResult.responseKeys && testResult.responseKeys.length > 0 && (
                    <p className="text-gray-700 text-xs mb-2">
                      <strong>Fields:</strong> {testResult.responseKeys.join(', ')}
                    </p>
                  )}
                  {testResult.meta && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-gray-600 text-xs">Perigee response metadata</summary>
                      <pre className="mt-1 overflow-auto max-h-48 text-[11px] bg-gray-50 p-2 rounded">
                        {JSON.stringify(testResult.meta, null, 2)}
                      </pre>
                    </details>
                  )}
                  {testResult.sentBody && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-gray-600 text-xs">Request body sent</summary>
                      <pre className="mt-1 overflow-auto max-h-48 text-[11px] bg-gray-50 p-2 rounded">
                        {JSON.stringify(testResult.sentBody, null, 2)}
                      </pre>
                    </details>
                  )}
                  {testResult.sample && testResult.sample.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-gray-600 text-xs">Sample data ({testResult.sample.length} rows)</summary>
                      <pre className="mt-1 overflow-auto max-h-48 text-[11px] bg-gray-50 p-2 rounded">
                        {JSON.stringify(testResult.sample, null, 2)}
                      </pre>
                    </details>
                  )}
                </>
              ) : (
                <>
                  <p className="font-semibold text-red-800 mb-1">{testResult.error}</p>
                  {testResult.detail && (
                    <pre className="overflow-auto max-h-36 text-xs text-gray-600">{testResult.detail}</pre>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Polling Schedule */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl mt-6">
          <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Polling Schedule</h2>
          <p className="text-sm text-gray-500 mb-4">
            Configure automated polling times (SAST). Cron runs every 30 minutes and fires on matching slots.
          </p>

          {schedule.slots.length === 0 ? (
            <p className="text-gray-400 text-sm italic mb-3">No poll slots configured.</p>
          ) : (
            <div className="flex flex-col gap-2 mb-4">
              {schedule.slots.map(slot => (
                <div key={slot.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <input
                    type="time"
                    value={slot.time}
                    onChange={e => updateSlot(slot.id, 'time', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={slot.type}
                    onChange={e => updateSlot(slot.id, 'type', e.target.value)}
                    className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                  >
                    <option value="short">Short (today only)</option>
                    <option value="long">Long (last 7 days)</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slot.enabled}
                      onChange={e => updateSlot(slot.id, 'enabled', e.target.checked)}
                      className="w-4 h-4 accent-[var(--color-navy)]"
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => removeSlot(slot.id)}
                    className="ml-auto text-red-400 hover:text-red-600 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={addPollSlot}
              className="px-4 py-2 border border-[var(--color-navy)] text-[var(--color-navy)] rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/5 transition-colors"
            >
              + Add Poll Slot
            </button>
            <button
              onClick={saveScheduleHandler}
              disabled={savingSchedule}
              className="px-4 py-2 bg-[var(--color-navy)] text-white rounded-lg text-sm font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
            >
              {savingSchedule ? 'Saving...' : 'Save Schedule'}
            </button>
          </div>
        </div>
        {/* Cron Activity Log */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl mt-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-navy)] mb-1">Cron Activity Log</h2>
              <p className="text-sm text-gray-500">Recent automated polling attempts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={loadCronLogs}
                disabled={loadingLogs}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {loadingLogs ? 'Loading...' : 'Refresh'}
              </button>
              <button
                onClick={testCronNow}
                disabled={testingCron}
                className="px-3 py-1.5 bg-[var(--color-navy)] text-white rounded-lg text-xs font-medium hover:bg-[var(--color-navy)]/90 transition-colors disabled:opacity-50"
              >
                {testingCron ? 'Running...' : 'Test Cron Now'}
              </button>
            </div>
          </div>

          {cronLogs.length === 0 ? (
            <p className="text-gray-400 text-sm italic">
              {loadingLogs ? 'Loading logs...' : 'No cron activity recorded yet.'}
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-left">
                    <th className="py-1.5 px-2">Time (SAST)</th>
                    <th className="py-1.5 px-2">Matched</th>
                    <th className="py-1.5 px-2">Slot</th>
                    <th className="py-1.5 px-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {cronLogs.map((log, i) => (
                    <tr
                      key={i}
                      className={`border-b border-gray-50 ${log.error ? 'bg-red-50' : log.imported && log.imported > 0 ? 'bg-green-50' : ''}`}
                    >
                      <td className="py-1.5 px-2 whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-1.5 px-2">
                        <span className={`font-semibold ${log.matched ? 'text-green-600' : 'text-gray-400'}`}>
                          {log.matched ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="py-1.5 px-2">
                        {log.slotTime ? `${log.slotTime} (${log.slotType})` : '\u2014'}
                      </td>
                      <td className={`py-1.5 px-2 ${log.error ? 'text-red-600' : 'text-gray-700'}`}>
                        {log.error
                          ? log.error.slice(0, 60)
                          : log.imported !== undefined
                            ? `+${log.imported} imported, ${log.skipped ?? 0} skipped`
                            : log.result || '\u2014'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-gray-800 text-white text-sm px-4 py-3 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </>
  );
}
