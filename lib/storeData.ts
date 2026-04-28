import { readJson, writeJson } from './blob';

export interface Store {
  id: string;
  name: string;
  area: string;
  channelId: string;
  regionId: string;
  teamId: string;
  repUserId: string | null;
  perigeeStoreCode: string;
  perigeeStoreName: string;
  supportEmailSent?: boolean;
  createdAt: string;
}

const KEY = 'stores.json';

export async function loadStores(): Promise<Store[]> {
  return readJson<Store[]>(KEY, []);
}

export async function saveStores(stores: Store[]): Promise<void> {
  await writeJson(KEY, stores);
}
