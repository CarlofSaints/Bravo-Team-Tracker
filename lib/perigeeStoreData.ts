import { readJson, writeJson } from './blob';

export interface PerigeeStore {
  code: string;
  name: string;
  channel: string;
  province: string;
}

const KEY = 'perigee-stores.json';

export async function loadPerigeeStores(): Promise<PerigeeStore[]> {
  return readJson<PerigeeStore[]>(KEY, []);
}

export async function savePerigeeStores(stores: PerigeeStore[]): Promise<void> {
  await writeJson(KEY, stores);
}
