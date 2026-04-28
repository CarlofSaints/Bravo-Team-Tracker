import { NextResponse } from 'next/server';
import zlib from 'zlib';
import * as XLSX from 'xlsx';
import { saveVisits, Visit } from '@/lib/visitData';
import { requireAdmin } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const contentType = req.headers.get('content-type') || '';

    let visits: Visit[];

    if (contentType.includes('application/gzip') || contentType.includes('application/json')) {
      // Client-side parsed data (gzipped or plain JSON)
      let body: { visits: Visit[] };

      if (contentType.includes('application/gzip')) {
        const compressed = Buffer.from(await req.arrayBuffer());
        const decompressed = zlib.gunzipSync(compressed);
        body = JSON.parse(decompressed.toString());
      } else {
        body = await req.json();
      }

      if (!Array.isArray(body.visits)) {
        return NextResponse.json({ error: 'Invalid payload: missing visits array' }, { status: 400 });
      }

      visits = body.visits;
    } else {
      // Legacy: FormData with Excel file
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

      visits = [];
      for (const row of rows) {
        const storeCode = String(row['Store Code'] || row['store_code'] || row['Store code'] || '').trim();
        const rawDate = String(row['Check in date'] || row['Check In Date'] || row['check_in_date'] || '').trim();
        const firstName = String(row['First Name'] || row['First name'] || row['first_name'] || '').trim();
        const lastName = String(row['Last Name'] || row['Last name'] || row['last_name'] || '').trim();
        const email = String(row['Email'] || row['email'] || '').trim();
        const status = String(row['Status'] || row['status'] || '').trim();
        const duration = String(row['Visit Duration'] || row['Visit duration'] || row['visit_duration'] || '').trim();

        if (!storeCode || !rawDate) continue;

        // Normalize DD/MM/YYYY to YYYY-MM-DD
        let checkInDate = rawDate;
        const ddmmyyyy = rawDate.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (ddmmyyyy) {
          const dd = ddmmyyyy[1].padStart(2, '0');
          const mm = ddmmyyyy[2].padStart(2, '0');
          const yyyy = ddmmyyyy[3];
          checkInDate = `${yyyy}-${mm}-${dd}`;
        }

        visits.push({
          storeCode,
          checkInDate,
          repEmail: email,
          repName: `${firstName} ${lastName}`.trim(),
          status,
          visitDuration: duration,
        });
      }
    }

    await saveVisits(visits);

    return NextResponse.json({
      success: true,
      totalVisits: visits.length,
    });
  } catch (err) {
    console.error('Visits upload error:', err);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
