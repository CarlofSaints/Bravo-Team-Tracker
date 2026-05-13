import { readJson, writeJson } from './blob';

export interface TrainingRecord {
  id: string;
  visitUUID: string;
  baName: string;
  storeName: string;
  storeCode: string;
  date: string;            // YYYY-MM-DD
  didComplete: boolean;
  fspsTrained: number;     // "HOW MANY FSPs DID YOU TRAIN? (1-30)"
  trainingDuration: number; // "HOW LONG WAS THE TRAINING (IN MINUTES)"
  productsTrained: string; // "WHICH PRODUCTS DID YOU TRAIN ON?"
  trainingType: string;    // "WHAT TYPE OF TRAINING?"
}

export interface TrainingUploadEntry {
  key: string;        // blob key for the upload file
  uploadedAt: string; // ISO date
  count: number;      // records in this upload
  fileName: string;   // original file name
}

const INDEX_KEY = 'training/index.json';

export async function loadTrainingIndex(): Promise<TrainingUploadEntry[]> {
  return readJson<TrainingUploadEntry[]>(INDEX_KEY, []);
}

export async function saveTrainingIndex(entries: TrainingUploadEntry[]): Promise<void> {
  await writeJson(INDEX_KEY, entries);
}

export async function loadAllTrainingRecords(): Promise<TrainingRecord[]> {
  const index = await loadTrainingIndex();
  const results = await Promise.all(
    index.map(entry => readJson<TrainingRecord[]>(entry.key, []))
  );
  return results.flat();
}
