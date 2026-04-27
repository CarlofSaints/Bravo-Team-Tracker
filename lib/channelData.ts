import { readJson, writeJson } from './blob';

export interface Channel {
  id: string;
  name: string;
  createdAt: string;
}

const KEY = 'channels.json';

export async function loadChannels(): Promise<Channel[]> {
  return readJson<Channel[]>(KEY, []);
}

export async function saveChannels(channels: Channel[]): Promise<void> {
  await writeJson(KEY, channels);
}
