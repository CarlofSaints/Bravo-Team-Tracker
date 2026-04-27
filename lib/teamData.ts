import { readJson, writeJson } from './blob';

export interface Team {
  id: string;
  name: string;
  iconKey: string | null;
  members: string[];
  createdAt: string;
}

const KEY = 'teams.json';

export async function loadTeams(): Promise<Team[]> {
  return readJson<Team[]>(KEY, []);
}

export async function saveTeams(teams: Team[]): Promise<void> {
  await writeJson(KEY, teams);
}
