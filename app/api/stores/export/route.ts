import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { loadStores } from '@/lib/storeData';
import { loadChannels } from '@/lib/channelData';
import { loadTeams } from '@/lib/teamData';
import { loadRegions } from '@/lib/regionData';
import { requireLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'current';

  if (type === 'template-matched') {
    // Empty template for the master match file
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Store (Bravo)', 'Area (Bravo)', 'Rep Sheet', 'Match Score', 'Channel (Perigee)', 'Store Code (Perigee)', 'Store Name (Perigee)'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Master Store Match');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Master Store Match - Template.xlsx"',
      },
    });
  }

  if (type === 'template-bravo') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Store Name', 'Area', 'Channel', 'Region', 'Team'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Stores');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Bravo Store List - Template.xlsx"',
      },
    });
  }

  if (type === 'current-matched') {
    const stores = await loadStores();
    const channels = await loadChannels();
    const channelMap = new Map(channels.map(c => [c.id, c.name]));

    const rows = stores.map(s => [
      s.name,
      s.area,
      '', // Rep Sheet — not stored
      '', // Match Score — not stored
      channelMap.get(s.channelId) || '',
      s.perigeeStoreCode,
      s.perigeeStoreName,
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Store (Bravo)', 'Area (Bravo)', 'Rep Sheet', 'Match Score', 'Channel (Perigee)', 'Store Code (Perigee)', 'Store Name (Perigee)'],
      ...rows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Master Store Match');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bravo Master Store Match - ${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  }

  if (type === 'current-bravo') {
    const stores = await loadStores();
    const channels = await loadChannels();
    const teams = await loadTeams();
    const regions = await loadRegions();
    const channelMap = new Map(channels.map(c => [c.id, c.name]));
    const teamMap = new Map(teams.map(t => [t.id, t.name]));
    const regionMap = new Map(regions.map(r => [r.id, r.name]));

    const rows = stores.map(s => [
      s.name,
      s.area,
      channelMap.get(s.channelId) || '',
      regionMap.get(s.regionId) || '',
      teamMap.get(s.teamId) || '',
      s.perigeeStoreCode,
      s.perigeeStoreName,
    ]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Store Name', 'Area', 'Channel', 'Region', 'Team', 'Perigee Code', 'Perigee Name'],
      ...rows,
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Stores');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="Bravo Store List - ${new Date().toISOString().split('T')[0]}.xlsx"`,
      },
    });
  }

  return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
}
