import { readJson, writeJson } from './blob';

export interface Settings {
  mappingEmails: string[]; // email recipients for "Email Support" on mapping page
  visitSource: 'manual' | 'api'; // 'manual' = Excel upload, 'api' = Perigee API polling (future)
  perigeeApiUrl: string;  // Perigee API endpoint (populated when API is available)
  perigeeApiKey: string;  // Perigee API key (populated when API is available)
}

const KEY = 'settings.json';

const DEFAULTS: Settings = {
  mappingEmails: ['support@perigeeapp.co.za'],
  visitSource: 'manual',
  perigeeApiUrl: '',
  perigeeApiKey: '',
};

export async function loadSettings(): Promise<Settings> {
  const data = await readJson<Settings>(KEY, DEFAULTS);
  // Ensure shape
  return {
    mappingEmails: Array.isArray(data.mappingEmails) ? data.mappingEmails : DEFAULTS.mappingEmails,
    visitSource: data.visitSource === 'api' ? 'api' : 'manual',
    perigeeApiUrl: typeof data.perigeeApiUrl === 'string' ? data.perigeeApiUrl : '',
    perigeeApiKey: typeof data.perigeeApiKey === 'string' ? data.perigeeApiKey : '',
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await writeJson(KEY, settings);
}
