import { readJson, writeJson } from './blob';

export interface Region {
  id: string;
  name: string;
  teamIds: string[];
  createdAt: string;
}

const KEY = 'regions.json';

export async function loadRegions(): Promise<Region[]> {
  return readJson<Region[]>(KEY, []);
}

export async function saveRegions(regions: Region[]): Promise<void> {
  await writeJson(KEY, regions);
}
