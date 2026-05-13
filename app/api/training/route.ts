import { NextResponse } from 'next/server';
import { requireLogin, requireAdmin, noCacheHeaders } from '@/lib/auth';
import {
  loadTrainingIndex,
  saveTrainingIndex,
  loadAllTrainingRecords,
} from '@/lib/trainingData';
import { writeJson } from '@/lib/blob';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const user = await requireLogin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const wantData = url.searchParams.get('data') === '1';
  const monthFilter = url.searchParams.get('month') || ''; // YYYY-MM

  if (!wantData) {
    // Return index only
    const index = await loadTrainingIndex();
    return NextResponse.json(index, { headers: noCacheHeaders() });
  }

  // Return all training records, optionally filtered by month
  let records = await loadAllTrainingRecords();

  if (monthFilter) {
    records = records.filter(r => r.date.startsWith(monthFilter));
  }

  return NextResponse.json(records, { headers: noCacheHeaders() });
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    // Clear index (individual upload blobs become orphaned but harmless)
    await saveTrainingIndex([]);
    // Also write an empty default in case anyone reads the old keys
    await writeJson('training/index.json', []);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Clear training error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
