import { NextResponse } from 'next/server';
import { loadSettings } from '@/lib/settingsData';
import { saveVisits, Visit } from '@/lib/visitData';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/visits/poll
 * Perigee API poll stub — when visitSource is 'api' and credentials are set,
 * this fetches visits from the Perigee API and saves them.
 * For now it returns a "not configured" response until the API is available.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const settings = await loadSettings();

  if (settings.visitSource !== 'api') {
    return NextResponse.json({ error: 'Visit source is set to manual upload. Switch to API mode in settings.' }, { status: 400 });
  }

  if (!settings.perigeeApiUrl || !settings.perigeeApiKey) {
    return NextResponse.json({ error: 'Perigee API not configured. Set URL and API key in settings.' }, { status: 400 });
  }

  // TODO: When Perigee API is available, implement:
  // 1. Fetch visits from settings.perigeeApiUrl with settings.perigeeApiKey
  // 2. Parse response into Visit[] (normalize DD/MM/YYYY → YYYY-MM-DD)
  // 3. Save via saveVisits(visits)
  // 4. Return count
  //
  // Example structure (uncomment when API is ready):
  // const res = await fetch(settings.perigeeApiUrl, {
  //   headers: { 'Authorization': `Bearer ${settings.perigeeApiKey}` },
  // });
  // if (!res.ok) return NextResponse.json({ error: `Perigee API error: ${res.status}` }, { status: 502 });
  // const data = await res.json();
  // const visits: Visit[] = data.map(...);
  // await saveVisits(visits);
  // return NextResponse.json({ success: true, totalVisits: visits.length });

  return NextResponse.json({
    error: 'Perigee API integration not yet implemented. Endpoint configured and ready for activation.',
    configured: true,
    apiUrl: settings.perigeeApiUrl,
  }, { status: 501 });
}
