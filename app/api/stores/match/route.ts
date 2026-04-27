import { NextResponse } from 'next/server';
import { loadStores, saveStores } from '@/lib/storeData';
import { requireLogin, noCacheHeaders } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    // Expect an array of { storeId, perigeeStoreCode, perigeeStoreName }
    const mappings: Array<{ storeId: string; perigeeStoreCode: string; perigeeStoreName: string }> = await req.json();

    if (!Array.isArray(mappings)) {
      return NextResponse.json({ error: 'Expected array of mappings' }, { status: 400 });
    }

    const stores = await loadStores();
    let updated = 0;

    for (const m of mappings) {
      const idx = stores.findIndex(s => s.id === m.storeId);
      if (idx !== -1) {
        stores[idx].perigeeStoreCode = m.perigeeStoreCode || 'Not Mapped';
        stores[idx].perigeeStoreName = m.perigeeStoreName || '';
        updated++;
      }
    }

    await saveStores(stores);
    return NextResponse.json({ success: true, updated }, { headers: noCacheHeaders() });
  } catch (err) {
    console.error('Store match error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
