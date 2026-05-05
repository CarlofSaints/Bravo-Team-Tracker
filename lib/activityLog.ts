import { readJson, writeJson } from './blob';

const BLOB_KEY = 'activity-log.json';

export interface ActivityLogEntry {
  id: string;
  action: string;
  userId: string;
  userName: string;
  detail: string;
  createdAt: string;
}

export async function loadLog(): Promise<ActivityLogEntry[]> {
  return readJson<ActivityLogEntry[]>(BLOB_KEY, []);
}

export async function appendLogEntry(entry: Omit<ActivityLogEntry, 'id' | 'createdAt'>): Promise<void> {
  const log = await loadLog();
  log.push({
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  });
  await writeJson(BLOB_KEY, log);
}
