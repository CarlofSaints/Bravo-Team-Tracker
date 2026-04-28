import { readJson, writeJson } from './blob';

export interface Visit {
  storeCode: string;      // matches perigeeStoreCode on stores
  checkInDate: string;    // YYYY-MM-DD (normalized from DD/MM/YYYY for sorting)
  repEmail: string;
  repName: string;        // "First Last"
  status: string;         // CHECKED_OUT, OPEN, AUTO_CHECK_OUT
  visitDuration: string;  // "00:13" etc
}

const KEY = 'visits.json';

export async function loadVisits(): Promise<Visit[]> {
  return readJson<Visit[]>(KEY, []);
}

export async function saveVisits(visits: Visit[]): Promise<void> {
  await writeJson(KEY, visits);
}
