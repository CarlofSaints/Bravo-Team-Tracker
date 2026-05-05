import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, noCacheHeaders } from '@/lib/auth';
import { readJson, writeJson } from '@/lib/blob';
import { saveVisits, loadVisits, Visit } from '@/lib/visitData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

interface PerigeeConfig {
  apiKey: string;
  endpoint: string;
  enabled: boolean;
  customer: string;
  lastPolledAt: string | null;
  requestBody: string;
}

const CONFIG_KEY = 'config/perigee-api.json';

function mapPerigeeVisit(row: Record<string, unknown>): Visit {
  const str = (key: string) => String(row[key] ?? '').trim();

  // Store code
  const rawStore = str('store') || str('Store Full Name') || str('storeName') || str('place') || '';
  let storeCode = str('storeCode') || str('placeId') || '';
  if (!storeCode && rawStore.includes(' - ')) {
    storeCode = rawStore.substring(rawStore.lastIndexOf(' - ') + 3).trim();
  }

  // Check-in date
  let checkInDate = str('checkInDate') || '';
  const startDateFull = str('startDateFull');
  if (!checkInDate) {
    if (startDateFull && startDateFull.includes(' ')) {
      checkInDate = startDateFull.split(' ')[0];
    } else {
      checkInDate = str('date') || '';
    }
  }
  // Convert DD/MM/YYYY → YYYY-MM-DD if needed
  const dmyMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(checkInDate);
  if (dmyMatch) {
    checkInDate = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  // Rep email
  const repEmail = str('email') || str('username') || str('Username') || str('representativeId') || '';

  // Rep name
  const repName = str('repName') || str('displayName') || str('representativeName') || '';

  // Status
  const status = str('status') || str('callStatus') || '';

  // Duration
  const visitDuration = str('visitDuration') || str('timeAtPlace') || '';

  return {
    storeCode,
    checkInDate,
    repEmail,
    repName,
    status,
    visitDuration,
  };
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await readJson<PerigeeConfig>(CONFIG_KEY, { apiKey: '', endpoint: '', enabled: false, customer: '', lastPolledAt: null, requestBody: '' });

  if (!config.endpoint || !config.apiKey) {
    return NextResponse.json(
      { error: 'Perigee API not configured. Set endpoint and token in Settings.' },
      { status: 400, headers: noCacheHeaders() }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode = (body as Record<string, string>).mode || 'test';

    // Strip 'mode' before forwarding to Perigee
    const perigeeBody = { ...(body as Record<string, unknown>) };
    delete perigeeBody.mode;

    if (!perigeeBody.startDate) {
      return NextResponse.json(
        { error: 'startDate is required in the request body' },
        { status: 400, headers: noCacheHeaders() }
      );
    }

    // If customer filter is configured, add it to the body
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
      return NextResponse.json(
        { error: `Perigee API returned ${perigeeRes.status}`, detail: errText.slice(0, 500) },
        { status: 502, headers: noCacheHeaders() }
      );
    }

    const perigeeData = await perigeeRes.json();

    // Update lastPolledAt
    await writeJson(CONFIG_KEY, { ...config, lastPolledAt: new Date().toISOString() });

    // Determine the visits array from the response
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

    if (mode === 'test') {
      const sample = rawVisits.slice(0, 3);
      const responseKeys = rawVisits.length > 0 ? Object.keys(rawVisits[0]) : [];
      const meta: Record<string, unknown> = {};
      for (const k of Object.keys(perigeeData)) {
        if (k === 'visits' && typeof perigeeData[k] === 'object' && !Array.isArray(perigeeData[k])) {
          const { data: _d, ...visitsMeta } = perigeeData[k] as Record<string, unknown>;
          meta['visits'] = visitsMeta;
        } else if (k !== 'visits') {
          meta[k] = perigeeData[k];
        }
      }
      return NextResponse.json({
        ok: true,
        mode: 'test',
        totalRows: rawVisits.length,
        responseKeys,
        sample,
        rawTopLevelKeys: Object.keys(perigeeData),
        meta,
        sentBody: perigeeBody,
      }, { headers: noCacheHeaders() });
    }

    // mode === 'import' — map, deduplicate, and save
    if (rawVisits.length === 0) {
      return NextResponse.json(
        { ok: true, mode: 'import', message: 'No visits returned for this date range', totalRows: 0, importedRows: 0 },
        { headers: noCacheHeaders() }
      );
    }

    const mappedVisits: Visit[] = rawVisits
      .map(mapPerigeeVisit)
      .filter(v => v.storeCode || v.repName);

    // Deduplicate against existing visits (by storeCode + checkInDate + repEmail)
    const existing = await loadVisits();
    const existingKeys = new Set(
      existing.map(v => `${v.storeCode}|${v.checkInDate}|${v.repEmail}`)
    );

    const newVisits = mappedVisits.filter(v => {
      const key = `${v.storeCode}|${v.checkInDate}|${v.repEmail}`;
      return !existingKeys.has(key);
    });

    const skippedDuplicates = mappedVisits.length - newVisits.length;

    if (newVisits.length === 0) {
      return NextResponse.json({
        ok: true,
        mode: 'import',
        message: 'All visits already imported (duplicates skipped)',
        totalRows: rawVisits.length,
        importedRows: 0,
        skippedDuplicates,
      }, { headers: noCacheHeaders() });
    }

    // Append new visits to existing
    await saveVisits([...existing, ...newVisits]);

    return NextResponse.json({
      ok: true,
      mode: 'import',
      totalRows: rawVisits.length,
      importedRows: newVisits.length,
      skippedDuplicates,
    }, { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Perigee poll error:', err);
    return NextResponse.json(
      { error: 'Failed to call Perigee API: ' + (err instanceof Error ? err.message : 'Unknown') },
      { status: 500, headers: noCacheHeaders() }
    );
  }
}
