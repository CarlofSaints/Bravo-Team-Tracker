import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { loadStores, saveStores, Store } from '@/lib/storeData';
import { loadChannels, saveChannels, Channel } from '@/lib/channelData';
import { loadTeams } from '@/lib/teamData';
import { loadRegions } from '@/lib/regionData';
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

    const channels = await loadChannels();
    const stores = await loadStores();
    const teams = await loadTeams();
    const regions = await loadRegions();

    let addedStores = 0;
    let addedChannels = 0;

    // Process each sheet as a rep/team's stores
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });
      if (rows.length === 0) continue;

      for (const row of rows) {
        // Try common column names
        const storeName = String(row['Store Name'] || row['Store'] || row['STORE NAME'] || row['store_name'] || '').trim();
        const area = String(row['Area'] || row['AREA'] || row['Town'] || row['TOWN'] || '').trim();
        const channelName = String(row['Channel'] || row['CHANNEL'] || row['Chain'] || row['CHAIN'] || '').trim();
        const regionName = String(row['Region'] || row['REGION'] || row['Province'] || '').trim();
        const teamName = String(row['Team'] || row['TEAM'] || '').trim();

        if (!storeName) continue;

        // Find or create channel
        let channel = channels.find(c => c.name.toLowerCase() === channelName.toLowerCase());
        if (!channel && channelName) {
          channel = {
            id: crypto.randomUUID(),
            name: channelName,
            createdAt: new Date().toISOString(),
          } as Channel;
          channels.push(channel);
          addedChannels++;
        }

        // Resolve team + region by name
        const team = teamName ? teams.find(t => t.name.toLowerCase() === teamName.toLowerCase()) : null;
        const region = regionName ? regions.find(r => r.name.toLowerCase() === regionName.toLowerCase()) : null;

        const newStore: Store = {
          id: crypto.randomUUID(),
          name: storeName,
          area,
          channelId: channel?.id || '',
          regionId: region?.id || '',
          teamId: team?.id || '',
          repUserId: null,
          perigeeStoreCode: 'Not Mapped',
          perigeeStoreName: '',
          createdAt: new Date().toISOString(),
        };
        stores.push(newStore);
        addedStores++;
      }
    }

    await saveChannels(channels);
    await saveStores(stores);

    return NextResponse.json({
      success: true,
      addedStores,
      addedChannels,
      totalStores: stores.length,
    });
  } catch (err) {
    console.error('Store upload error:', err);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
