import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { loadStores, saveStores } from '@/lib/storeData';
import { requireAdmin } from '@/lib/auth';
import { VALID_INDEXES } from '@/lib/frequency';

export const dynamic = 'force-dynamic';

/** Normalize a string for fuzzy matching: lowercase, collapse whitespace, strip punctuation */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** Column name patterns for header detection */
const STORE_PATTERNS = ['store', 'store name', 'storename'];
const AREA_PATTERNS = ['area', 'town', 'suburb'];
const INDEX_PATTERNS = ['call cycle index', 'cycle index', 'call cycle', 'priority', 'index', 'idx'];

function matchesAny(header: string, patterns: string[]): boolean {
  const h = normalize(header);
  return patterns.some(p => h === p || h.includes(p));
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

    const stores = await loadStores();

    // Build a lookup map: normalized "name|||area" → array of store indices
    const storeIndex = new Map<string, number[]>();
    stores.forEach((s, i) => {
      const key = `${normalize(s.name)}|||${normalize(s.area)}`;
      const arr = storeIndex.get(key) || [];
      arr.push(i);
      storeIndex.set(key, arr);
    });

    let matched = 0;
    const unmatchedNames: string[] = [];
    let sheetsProcessed = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

      if (!rawRows || rawRows.length === 0) continue;

      // Scan first 5 rows to find header row
      let headerRowIdx = -1;
      let storeCol = -1;
      let areaCol = -1;
      let indexCol = -1;

      for (let r = 0; r < Math.min(5, rawRows.length); r++) {
        const row = rawRows[r] as unknown[];
        if (!row || !Array.isArray(row)) continue;

        let foundStore = -1;
        let foundArea = -1;
        let foundIndex = -1;

        for (let c = 0; c < row.length; c++) {
          const cell = String(row[c] || '').trim();
          if (!cell) continue;
          if (matchesAny(cell, STORE_PATTERNS) && foundStore === -1) foundStore = c;
          if (matchesAny(cell, AREA_PATTERNS) && foundArea === -1) foundArea = c;
          if (matchesAny(cell, INDEX_PATTERNS) && foundIndex === -1) foundIndex = c;
        }

        if (foundArea !== -1 && areaCol === -1) areaCol = foundArea;

        if (foundStore !== -1 && foundIndex !== -1) {
          headerRowIdx = r;
          storeCol = foundStore;
          indexCol = foundIndex;
          break;
        }

        // Fallback: if we found area + index but no store column header,
        // assume the column before area (or col 0) is the store column
        if (foundStore === -1 && foundIndex !== -1 && foundArea !== -1) {
          headerRowIdx = r;
          storeCol = foundArea > 0 ? foundArea - 1 : 0;
          if (storeCol === foundIndex) storeCol = 0; // avoid collision
          indexCol = foundIndex;
          areaCol = foundArea;
          break;
        }
      }

      // Fallback: if we found store + area columns but no index column header,
      // sniff data rows for a column where most values are single A-R letters
      if (headerRowIdx !== -1 && storeCol !== -1 && indexCol === -1) {
        const usedCols = new Set([storeCol, areaCol]);
        const totalCols = (rawRows[headerRowIdx] as unknown[])?.length || 0;
        let bestCol = -1;
        let bestHits = 0;

        for (let c = 0; c < totalCols; c++) {
          if (usedCols.has(c)) continue;
          let hits = 0;
          let nonEmpty = 0;
          for (let r = headerRowIdx + 1; r < Math.min(headerRowIdx + 20, rawRows.length); r++) {
            const row = rawRows[r] as unknown[];
            if (!row) continue;
            const val = String(row[c] || '').trim().toUpperCase();
            if (!val) continue;
            nonEmpty++;
            if (val.length === 1 && VALID_INDEXES.has(val)) hits++;
          }
          if (nonEmpty >= 3 && hits / nonEmpty >= 0.5 && hits > bestHits) {
            bestCol = c;
            bestHits = hits;
          }
        }

        if (bestCol !== -1) indexCol = bestCol;
      }

      if (headerRowIdx === -1 || storeCol === -1 || indexCol === -1) continue;

      sheetsProcessed++;

      // Process data rows below the header
      for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
        const row = rawRows[r] as unknown[];
        if (!row || !Array.isArray(row)) continue;

        const storeName = String(row[storeCol] || '').trim();
        if (!storeName) continue;

        const area = areaCol >= 0 ? String(row[areaCol] || '').trim() : '';
        const rawIndex = String(row[indexCol] || '').trim().toUpperCase();

        if (!VALID_INDEXES.has(rawIndex)) continue;

        // Match by normalized name+area
        const key = `${normalize(storeName)}|||${normalize(area)}`;
        const indices = storeIndex.get(key);

        if (indices && indices.length > 0) {
          for (const idx of indices) {
            stores[idx].callCycleIndex = rawIndex;
          }
          matched += indices.length;
        } else {
          // Try matching by name only (ignore area)
          let foundByNameOnly = false;
          for (const [existingKey, existingIndices] of storeIndex) {
            const existingName = existingKey.split('|||')[0];
            if (existingName === normalize(storeName)) {
              for (const idx of existingIndices) {
                stores[idx].callCycleIndex = rawIndex;
              }
              matched += existingIndices.length;
              foundByNameOnly = true;
              break;
            }
          }
          if (!foundByNameOnly) {
            const label = area ? `${storeName} (${area})` : storeName;
            if (!unmatchedNames.includes(label)) unmatchedNames.push(label);
          }
        }
      }
    }

    await saveStores(stores);

    return NextResponse.json({
      matched,
      unmatched: unmatchedNames.length,
      unmatchedNames: unmatchedNames.slice(0, 100), // limit to prevent huge responses
      sheetsProcessed,
    });
  } catch (err) {
    console.error('Call cycle upload error:', err);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
