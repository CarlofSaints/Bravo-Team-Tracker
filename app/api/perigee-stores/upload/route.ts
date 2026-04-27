import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { savePerigeeStores, PerigeeStore } from '@/lib/perigeeStoreData';
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

    const stores: PerigeeStore[] = [];
    for (const row of rows) {
      const code = String(row['Store Code'] || row['store_code'] || '').trim();
      const name = String(row['Store Name'] || row['store_name'] || '').trim();
      const channel = String(row['Channel'] || row['channel'] || '').trim();
      const province = String(row['Province'] || row['province'] || '').trim();
      const active = String(row['Active'] || row['active'] || 'YES').trim().toUpperCase();

      if (!code || !name) continue;
      if (active !== 'YES') continue;

      stores.push({ code, name, channel, province });
    }

    await savePerigeeStores(stores);

    return NextResponse.json({
      success: true,
      totalStores: stores.length,
    });
  } catch (err) {
    console.error('Perigee store upload error:', err);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
