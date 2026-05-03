import { NextResponse } from 'next/server';
import { loadSettings, saveSettings } from '@/lib/settingsData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await requireLogin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const settings = await loadSettings();
  return NextResponse.json(settings, { headers: noCacheHeaders() });
}

export async function PUT(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await req.json();
  const settings = await loadSettings();

  if (Array.isArray(body.mappingEmails)) {
    settings.mappingEmails = body.mappingEmails
      .map((e: string) => e.trim().toLowerCase())
      .filter((e: string) => e.length > 0);
  }

  if (body.visitSource === 'manual' || body.visitSource === 'api') {
    settings.visitSource = body.visitSource;
  }
  if (typeof body.perigeeApiUrl === 'string') {
    settings.perigeeApiUrl = body.perigeeApiUrl.trim();
  }
  if (typeof body.perigeeApiKey === 'string') {
    settings.perigeeApiKey = body.perigeeApiKey.trim();
  }

  await saveSettings(settings);
  return NextResponse.json(settings);
}
