import { NextResponse } from 'next/server';
import { loadStores, saveStores, Store } from '@/lib/storeData';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const stores = await loadStores();
  return NextResponse.json(stores, { headers: noCacheHeaders() });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    await saveStores([]);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear stores error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await req.json();
    const { name, area, channelId, regionId, teamId } = body;
    if (!name || !channelId) {
      return NextResponse.json({ error: 'Name and channel required' }, { status: 400 });
    }

    const stores = await loadStores();
    const newStore: Store = {
      id: crypto.randomUUID(),
      name,
      area: area || '',
      channelId,
      regionId: regionId || '',
      teamId: teamId || '',
      repUserId: body.repUserId || null,
      perigeeStoreCode: 'Not Mapped',
      perigeeStoreName: '',
      createdAt: new Date().toISOString(),
    };
    stores.push(newStore);
    await saveStores(stores);

    return NextResponse.json(newStore, { status: 201 });
  } catch (err) {
    console.error('Create store error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
