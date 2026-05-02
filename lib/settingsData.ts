import { readJson, writeJson } from './blob';

export interface Settings {
  mappingEmails: string[]; // email recipients for "Email Support" on mapping page
}

const KEY = 'settings.json';

const DEFAULTS: Settings = {
  mappingEmails: ['support@perigeeapp.co.za'],
};

export async function loadSettings(): Promise<Settings> {
  const data = await readJson<Settings>(KEY, DEFAULTS);
  // Ensure shape
  return {
    mappingEmails: Array.isArray(data.mappingEmails) ? data.mappingEmails : DEFAULTS.mappingEmails,
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(KEY, settings);
}
