// Shared frequency constants & helpers

/** Frequency key → monthly visit rate */
export const FREQ_RATE: Record<string, number> = {
  weekly: 4,
  monthly_3: 3,
  monthly_2: 2,
  monthly_1: 1,
  bimonthly: 0.5,
  quarterly: 0.333,
  biannual: 0.167,
  annual: 0.083,
};

/** Frequency key → display label */
export const FREQ_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  monthly_3: '3\u00d7/Month',
  monthly_2: '2\u00d7/Month',
  monthly_1: 'Monthly',
  bimonthly: 'Bimonthly',
  quarterly: 'Quarterly',
  biannual: 'Biannual',
  annual: 'Annual',
};

/** Frequencies that expect at least 1 visit per month */
export const MONTHLY_FREQS = new Set(['weekly', 'monthly_3', 'monthly_2', 'monthly_1']);

/** Channel frequency dropdown options (used in channel create/edit) */
export const CHANNEL_FREQ_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly_3', label: '3\u00d7 per Month' },
  { value: 'monthly_2', label: 'Twice a Month' },
  { value: 'monthly_1', label: 'Once a Month' },
  { value: 'bimonthly', label: 'Every 2nd Month' },
  { value: 'quarterly', label: 'Once a Quarter' },
  { value: 'biannual', label: 'Twice a Year' },
  { value: 'annual', label: 'Annual' },
];

// ─── Call Cycle Index (A–R) ───

export interface CallCycleEntry {
  index: string;
  description: string;
  frequencyKey: string;
  monthlyRate: number;
}

export const CALL_CYCLE_KEY: CallCycleEntry[] = [
  { index: 'A', description: 'Twice a Month',  frequencyKey: 'monthly_2',  monthlyRate: 2 },
  { index: 'B', description: 'Once a Month',   frequencyKey: 'monthly_1',  monthlyRate: 1 },
  { index: 'C', description: 'Every 2nd Month', frequencyKey: 'bimonthly',  monthlyRate: 0.5 },
  { index: 'D', description: 'Once a Quarter',  frequencyKey: 'quarterly',  monthlyRate: 0.333 },
  { index: 'E', description: 'Every 6 Months',  frequencyKey: 'biannual',   monthlyRate: 0.167 },
  { index: 'F', description: 'Once a Year',     frequencyKey: 'annual',     monthlyRate: 0.083 },
  { index: 'G', description: 'Telephonic',      frequencyKey: 'telephonic', monthlyRate: 0 },
  { index: 'R', description: 'Red Zone',        frequencyKey: 'red_zone',   monthlyRate: 0 },
];

/** Valid call cycle index letters */
export const VALID_INDEXES = new Set(CALL_CYCLE_KEY.map(e => e.index));

/** Index letter → frequency key (e.g. 'A' → 'monthly_2') */
export const INDEX_TO_FREQUENCY: Record<string, string> = Object.fromEntries(
  CALL_CYCLE_KEY.map(e => [e.index, e.frequencyKey])
);

/** Index letter → human description (e.g. 'A' → 'Twice a Month') */
export const INDEX_TO_DESCRIPTION: Record<string, string> = Object.fromEntries(
  CALL_CYCLE_KEY.map(e => [e.index, e.description])
);

/** Index letter → monthly rate */
export const INDEX_TO_RATE: Record<string, number> = Object.fromEntries(
  CALL_CYCLE_KEY.map(e => [e.index, e.monthlyRate])
);

/**
 * Resolve the effective frequency key for a store.
 * Uses the store's callCycleIndex if set, otherwise falls back to the channel frequency.
 */
export function resolveStoreFrequency(
  storeIndex: string | undefined,
  channelFreq: string | undefined
): string | undefined {
  if (storeIndex && INDEX_TO_FREQUENCY[storeIndex]) {
    return INDEX_TO_FREQUENCY[storeIndex];
  }
  return channelFreq;
}

/**
 * Resolve the monthly rate for a store.
 * Returns the rate from the store's call cycle index, or from the channel frequency, or undefined.
 */
export function resolveStoreRate(
  storeIndex: string | undefined,
  channelFreq: string | undefined
): number | undefined {
  if (storeIndex && INDEX_TO_RATE[storeIndex] !== undefined) {
    return INDEX_TO_RATE[storeIndex];
  }
  if (channelFreq && FREQ_RATE[channelFreq] !== undefined) {
    return FREQ_RATE[channelFreq];
  }
  return undefined;
}
