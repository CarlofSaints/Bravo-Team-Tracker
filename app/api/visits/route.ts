import { NextResponse } from 'next/server';
import { loadVisits, saveVisits } from '@/lib/visitData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';

  const visits = await loadVisits();

  // Filter by date range
  const filtered = visits.filter(v => {
    if (from && v.checkInDate < from) return false;
    if (to && v.checkInDate > to) return false;
    return true;
  });

  // Aggregate by store code
  const byStoreCode: Record<string, number> = {};
  for (const v of filtered) {
    byStoreCode[v.storeCode] = (byStoreCode[v.storeCode] || 0) + 1;
  }

  return NextResponse.json({
    total: visits.length,
    filteredTotal: filtered.length,
    byStoreCode,
  }, { headers: noCacheHeaders() });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await saveVisits([]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear visits error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
