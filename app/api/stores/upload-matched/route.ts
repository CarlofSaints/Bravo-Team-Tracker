import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { loadStores, saveStores, Store } from '@/lib/storeData';
import { loadChannels, saveChannels, Channel } from '@/lib/channelData';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

    const channels = await loadChannels();
    const stores = await loadStores();

    // Build a set of existing store name+area keys (lowercase) to avoid duplicates
    const storeKey = (name: string, area: string) => `${name.toLowerCase()}|||${area.toLowerCase()}`;
    const existingKeys = new Set(stores.map(s => storeKey(s.name, s.area)));

    let addedStores = 0;
    let addedChannels = 0;
    let skippedDuplicates = 0;

    for (const row of rows) {
      const storeName = String(row['Store (Bravo)'] || '').trim();
      const area = String(row['Area (Bravo)'] || '').trim();
      const perigeeChannel = String(row['Channel (Perigee)'] || '').trim();
      const perigeeCode = String(row['Store Code (Perigee)'] || '').trim();
      const perigeeName = String(row['Store Name (Perigee)'] || '').trim();

      if (!storeName) continue;

      if (existingKeys.has(storeKey(storeName, area))) {
        skippedDuplicates++;
        continue;
      }

      // Find or create channel from the Perigee channel
      let channel = channels.find(c => c.name.toLowerCase() === perigeeChannel.toLowerCase());
      if (!channel && perigeeChannel) {
        channel = {
          id: crypto.randomUUID(),
          name: perigeeChannel,
          createdAt: new Date().toISOString(),
        } as Channel;
        channels.push(channel);
        addedChannels++;
      }

      const isMapped = perigeeCode && perigeeCode !== 'NOT FOUND' && perigeeCode !== 'Not Mapped';

      const newStore: Store = {
        id: crypto.randomUUID(),
        name: storeName,
        area,
        channelId: channel?.id || '',
        regionId: '',
        teamId: '',
        repUserId: null,
        perigeeStoreCode: isMapped ? perigeeCode : 'Not Mapped',
        perigeeStoreName: perigeeName,
        createdAt: new Date().toISOString(),
      };
      stores.push(newStore);
      existingKeys.add(storeKey(storeName, area));
      addedStores++;
    }

    await saveChannels(channels);
    await saveStores(stores);

    return NextResponse.json({
      success: true,
      addedStores,
      addedChannels,
      skippedDuplicates,
      totalStores: stores.length,
    });
  } catch (err) {
    console.error('Matched store upload error:', err);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
