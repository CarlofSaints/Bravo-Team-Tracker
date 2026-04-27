import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { loadPerigeeStores } from '@/lib/perigeeStoreData';
import { requireLogin } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const type = url.searchParams.get('type') || 'current';

  if (type === 'template') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['Country', 'Province', 'Channel', 'Store Name', 'Store Code', 'Active', 'Longitude', 'Latitude', 'Location Status', 'Ignore Location Data', 'Created by', 'Updated by'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Stores');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Perigee Store Reference - Template.xlsx"',
      },
    });
  }

  // Export current
  const stores = await loadPerigeeStores();
  if (stores.length === 0) {
    return NextResponse.json({ error: 'No Perigee stores loaded' }, { status: 404 });
  }

  const rows = stores.map(s => [s.code, s.name, s.channel, s.province]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ['Store Code', 'Store Name', 'Channel', 'Province'],
    ...rows,
  ]);
  XLSX.utils.book_append_sheet(wb, ws, 'Perigee Stores');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return new NextResponse(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="Perigee Store Reference - ${new Date().toISOString().split('T')[0]}.xlsx"`,
    },
  });
}
