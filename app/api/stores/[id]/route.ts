import { NextResponse } from 'next/server';
import { loadStores, saveStores } from '@/lib/storeData';
import { requireLogin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  try {
    const body = await req.json();
    const stores = await loadStores();
    const idx = stores.findIndex(s => s.id === id);
    if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (body.name !== undefined) stores[idx].name = body.name;
    if (body.area !== undefined) stores[idx].area = body.area;
    if (body.channelId !== undefined) stores[idx].channelId = body.channelId;
    if (body.regionId !== undefined) stores[idx].regionId = body.regionId;
    if (body.teamId !== undefined) stores[idx].teamId = body.teamId;
    if (body.repUserId !== undefined) stores[idx].repUserId = body.repUserId;
    if (body.perigeeStoreCode !== undefined) stores[idx].perigeeStoreCode = body.perigeeStoreCode;
    if (body.perigeeStoreName !== undefined) stores[idx].perigeeStoreName = body.perigeeStoreName;
    if (body.supportEmailSent !== undefined) stores[idx].supportEmailSent = body.supportEmailSent;

    await saveStores(stores);
    return NextResponse.json(stores[idx], { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Update store error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
