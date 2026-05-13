import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { requireAdmin } from '@/lib/auth';
import { writeJson } from '@/lib/blob';
import {
  TrainingRecord,
  loadTrainingIndex,
  saveTrainingIndex,
} from '@/lib/trainingData';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/** Case-insensitive, trimmed column lookup */
function col(row: Record<string, unknown>, ...candidates: string[]): string {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const lower = c.toLowerCase();
    const match = keys.find(k => k.trim().toLowerCase().startsWith(lower));
    if (match !== undefined) return String(row[match] ?? '').trim();
  }
  return '';
}

function parseNum(v: string): number {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

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

    const records: TrainingRecord[] = [];

    for (const row of rows) {
      const baName = col(row, 'ba name', 'rep name', 'first name', 'name');
      const storeName = col(row, 'store name', 'store');
      const storeCode = col(row, 'store code', 'store_code');
      const visitUUID = col(row, 'visit uuid', 'visituuid', 'uuid', 'visit id');
      const rawDate = col(row, 'date', 'visit date', 'check in date', 'timestamp');
      const rawComplete = col(row, 'did you complete', 'did complete', 'training complete', 'completed');

      // New fields from col Q onwards
      const fspsTrained = parseNum(col(row, 'how many fsps did you train', 'fsps trained', 'fsps'));
      const trainingDuration = parseNum(col(row, 'how long was the training', 'training duration', 'duration'));
      const productsTrained = col(row, 'which products did you train on', 'products trained', 'products');
      const trainingType = col(row, 'what type of training', 'training type', 'type of training');

      if (!baName && !storeName) continue;

      // Normalize date
      let date = rawDate;
      const ddmmyyyy = rawDate.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})$/);
      if (ddmmyyyy) {
        date = `${ddmmyyyy[3]}-${ddmmyyyy[2].padStart(2, '0')}-${ddmmyyyy[1].padStart(2, '0')}`;
      }

      // Parse completion
      const completeLower = rawComplete.toLowerCase();
      const didComplete = completeLower === 'yes' || completeLower === 'true' || completeLower === '1';

      records.push({
        id: `tr-${Date.now()}-${records.length}`,
        visitUUID: visitUUID || `gen-${Date.now()}-${records.length}`,
        baName,
        storeName,
        storeCode,
        date,
        didComplete,
        fspsTrained,
        trainingDuration,
        productsTrained,
        trainingType,
      });
    }

    // Store this upload as its own blob
    const uploadKey = `training/upload-${Date.now()}.json`;
    await writeJson(uploadKey, records);

    // Update index
    const index = await loadTrainingIndex();
    index.push({
      key: uploadKey,
      uploadedAt: new Date().toISOString(),
      count: records.length,
      fileName: file.name,
    });
    await saveTrainingIndex(index);

    return NextResponse.json({
      success: true,
      totalRecords: records.length,
      uploadKey,
    });
  } catch (err) {
    console.error('Training upload error:', err);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
