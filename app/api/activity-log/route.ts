import { NextResponse } from 'next/server';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';
import { loadLog, appendLogEntry } from '@/lib/activityLog';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (!(await requireAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const log = await loadLog();
  // Return newest first
  log.reverse();
  return NextResponse.json(log, { headers: noCacheHeaders() });
}

export async function POST(req: Request) {
  const user = await requireLogin(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { action, detail } = await req.json();
    if (!action) {
      return NextResponse.json({ error: 'Missing action' }, { status: 400 });
    }
    await appendLogEntry({
      action,
      userId: user.id,
      userName: `${user.name} ${user.surname}`.trim(),
      detail: detail || '',
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Failed to log' }, { status: 500 });
  }
}
