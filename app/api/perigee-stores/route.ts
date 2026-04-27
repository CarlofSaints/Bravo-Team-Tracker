import { NextResponse } from 'next/server';
import { loadPerigeeStores } from '@/lib/perigeeStoreData';
import { requireLogin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const stores = await loadPerigeeStores();

  if (!q) {
    return NextResponse.json({ total: stores.length, stores: [] }, { headers: noCacheHeaders() });
  }

  const results = stores.filter(s =>
    s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
  ).slice(0, 50);

  return NextResponse.json({ total: stores.length, stores: results }, { headers: noCacheHeaders() });
}
