import { NextResponse } from 'next/server';
import { loadPerigeeStores, savePerigeeStores } from '@/lib/perigeeStoreData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().toLowerCase();
  const channel = (url.searchParams.get('channel') || '').trim();
  const stores = await loadPerigeeStores();

  // Build unique channel list
  const channelSet = new Set<string>();
  for (const s of stores) {
    if (s.channel) channelSet.add(s.channel);
  }
  const channels = [...channelSet].sort();

  if (!q && !channel) {
    return NextResponse.json({ total: stores.length, channels, stores: [] }, { headers: noCacheHeaders() });
  }

  let filtered = stores;

  // Filter by channel first
  if (channel) {
    filtered = filtered.filter(s => s.channel === channel);
  }

  // Then by search query
  if (q) {
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }

  return NextResponse.json({
    total: stores.length,
    channels,
    stores: filtered.slice(0, 50),
    matchCount: filtered.length,
  }, { headers: noCacheHeaders() });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await savePerigeeStores([]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear perigee stores error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
