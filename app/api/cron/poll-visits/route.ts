import { NextRequest, NextResponse } from 'next/server';
import { readJson, writeJson } from '@/lib/blob';
import { Visit, loadVisits, saveVisits } from '@/lib/visitData';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface PerigeeConfig {
  apiKey: string;
  endpoint: string;
  enabled: boolean;
  customer: string;
  lastPolledAt: string | null;
  requestBody: string;
}

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

const CONFIG_KEY = 'config/perigee-api.json';
const SCHEDULE_KEY = 'config/perigee-schedule.json';
const CRON_LOG_KEY = 'logs/cron-poll.json';

function mapPerigeeVisit(row: Record<string, unknown>): Visit {
  const str = (key: string) => String(row[key] ?? '').trim();

  const rawStore = str('store') || str('Store Full Name') || str('storeName') || str('place') || '';
  let storeCode = str('storeCode') || str('placeId') || '';
  if (!storeCode && rawStore.includes(' - ')) {
    storeCode = rawStore.substring(rawStore.lastIndexOf(' - ') + 3).trim();
  }

  let checkInDate = str('checkInDate') || '';
  const startDateFull = str('startDateFull');
  if (!checkInDate) {
    if (startDateFull && startDateFull.includes(' ')) {
      checkInDate = startDateFull.split(' ')[0];
    } else {
      checkInDate = str('date') || '';
    }
  }
  const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(checkInDate);
  if (dmyMatch) {
    checkInDate = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  const repEmail = str('email') || str('username') || str('Username') || str('representativeId') || '';
  const repName = str('repName') || str('displayName') || str('representativeName') || '';
  const status = str('status') || str('callStatus') || '';
  const visitDuration = str('visitDuration') || str('timeAtPlace') || '';

  return { storeCode, checkInDate, repEmail, repName, status, visitDuration };
}

export async function GET(req: NextRequest) {
  // Validate cron secret OR admin session
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronAuth = !cronSecret || authHeader === `Bearer ${cronSecret}`;
  const isAdminAuth = !!(await requireAdmin(req));
  if (!isCronAuth && !isAdminAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const logEntry: CronLogEntry = { timestamp: new Date().toISOString(), matched: false };
  const forceRun = req.nextUrl.searchParams.get('force') === 'true';

  try {
    const schedule = await readJson<PollSchedule>(SCHEDULE_KEY, { slots: [], timezone: 'Africa/Johannesburg' });

    if (schedule.slots.length === 0 && !forceRun) {
      logEntry.result = 'No slots configured';
      await appendCronLog(logEntry);
      return NextResponse.json({ ok: true, action: 'none', reason: 'No slots configured' });
    }

    const now = new Date();
    const sastTime = new Date(now.toLocaleString('en-US', { timeZone: schedule.timezone || 'Africa/Johannesburg' }));
    const currentHour = sastTime.getHours();
    const currentMin = sastTime.getMinutes();
    const currentMins = currentHour * 60 + currentMin;

    let matchedSlot: PollSlot | undefined;
    if (forceRun) {
      const firstEnabled = schedule.slots.find(s => s.enabled);
      matchedSlot = {
        id: 'manual',
        time: `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`,
        type: firstEnabled?.type || 'short',
        enabled: true,
      };
    } else {
      matchedSlot = schedule.slots.find(slot => {
        if (!slot.enabled) return false;
        const [slotH, slotM] = slot.time.split(':').map(Number);
        const slotMins = slotH * 60 + slotM;
        const diff = Math.abs(currentMins - slotMins);
        return diff <= 14;
      });
    }

    if (!matchedSlot) {
      logEntry.result = `No matching slot at ${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} SAST`;
      await appendCronLog(logEntry);
      return NextResponse.json({ ok: true, action: 'none', reason: logEntry.result });
    }

    logEntry.matched = true;
    logEntry.slotTime = matchedSlot.time;
    logEntry.slotType = matchedSlot.type;

    // Load Perigee config
    const config = await readJson<PerigeeConfig>(CONFIG_KEY, { apiKey: '', endpoint: '', enabled: false, customer: '', lastPolledAt: null, requestBody: '' });
    if (!config.endpoint || !config.apiKey) {
      logEntry.error = 'Perigee API not configured';
      await appendCronLog(logEntry);
      return NextResponse.json({ ok: false, error: 'Not configured' }, { status: 400 });
    }

    // Build request body
    const today = now.toISOString().slice(0, 10);
    let startDate: string;
    if (matchedSlot.type === 'long') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate = sevenDaysAgo.toISOString().slice(0, 10);
    } else {
      startDate = today;
    }

    let perigeeBody: Record<string, unknown> = {};
    if (config.requestBody) {
      try { perigeeBody = JSON.parse(config.requestBody); } catch { /* use empty */ }
    }
    perigeeBody.startDate = startDate;
    perigeeBody.endDate = today;

    // Add customer filter if configured
    if (config.customer && !perigeeBody.customers) {
      perigeeBody.customers = [config.customer];
    }

    // Call Perigee API
    const perigeeRes = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(perigeeBody),
    });

    if (!perigeeRes.ok) {
      const errText = await perigeeRes.text().catch(() => '');
      logEntry.error = `Perigee ${perigeeRes.status}: ${errText.slice(0, 200)}`;
      await appendCronLog(logEntry);
      return NextResponse.json({ ok: false, error: logEntry.error }, { status: 502 });
    }

    const perigeeData = await perigeeRes.json();
    await writeJson(CONFIG_KEY, { ...config, lastPolledAt: new Date().toISOString() });

    // Extract visits array
    let rawVisits: Record<string, unknown>[] = [];
    if (Array.isArray(perigeeData)) {
      rawVisits = perigeeData;
    } else if (perigeeData.visits && Array.isArray(perigeeData.visits.data)) {
      rawVisits = perigeeData.visits.data;
    } else if (Array.isArray(perigeeData.visits)) {
      rawVisits = perigeeData.visits;
    } else if (Array.isArray(perigeeData.data)) {
      rawVisits = perigeeData.data;
    }

    if (rawVisits.length === 0) {
      logEntry.result = 'No visits returned';
      logEntry.imported = 0;
      await appendCronLog(logEntry);
      return NextResponse.json({ ok: true, action: 'polled', imported: 0 });
    }

    // Map and deduplicate
    const mappedVisits: Visit[] = rawVisits.map(mapPerigeeVisit).filter(v => v.storeCode || v.repName);

    // Deduplicate within batch
    const batchSeen = new Set<string>();
    const visits: Visit[] = [];
    for (const v of mappedVisits) {
      const key = `${v.storeCode}|${v.checkInDate}|${v.repEmail}`;
      if (batchSeen.has(key)) continue;
      batchSeen.add(key);
      visits.push(v);
    }

    // Deduplicate against existing visits
    const existing = await loadVisits();
    const existingKeys = new Set(
      existing.map(v => `${v.storeCode}|${v.checkInDate}|${v.repEmail}`)
    );

    const newVisits = visits.filter(v => {
      const key = `${v.storeCode}|${v.checkInDate}|${v.repEmail}`;
      return !existingKeys.has(key);
    });
    const skipped = mappedVisits.length - newVisits.length;

    if (newVisits.length === 0) {
      logEntry.result = 'All duplicates';
      logEntry.imported = 0;
      logEntry.skipped = skipped;
      await appendCronLog(logEntry);
      return NextResponse.json({ ok: true, action: 'polled', imported: 0, skipped });
    }

    // Append new visits
    await saveVisits([...existing, ...newVisits]);

    logEntry.result = 'Success';
    logEntry.imported = newVisits.length;
    logEntry.skipped = skipped;
    await appendCronLog(logEntry);

    return NextResponse.json({
      ok: true,
      action: 'imported',
      imported: newVisits.length,
      skipped,
    });
  } catch (err) {
    logEntry.error = err instanceof Error ? err.message : 'Unknown error';
    await appendCronLog(logEntry).catch(() => {});
    console.error('Cron poll error:', err);
    return NextResponse.json({ ok: false, error: logEntry.error }, { status: 500 });
  }
}

async function appendCronLog(entry: CronLogEntry) {
  try {
    const logs = await readJson<CronLogEntry[]>(CRON_LOG_KEY, []);
    logs.unshift(entry);
    await writeJson(CRON_LOG_KEY, logs.slice(0, 100));
  } catch {
    // Non-blocking
  }
}
