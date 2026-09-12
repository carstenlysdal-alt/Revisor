import type { Fradrag, IndkomstAar, Investering, Job, OpsparingsTracker } from '../types';
import { APP_STATE_STORE_NAME, openRevisorDatabase, SNAPSHOT_STORE_NAME } from './database';

const STATE_ID = 'current';
export const APP_DATA_VERSION = 1;

export interface AppData {
  activeAarId: string;
  indkomstAarList: IndkomstAar[];
  jobs: Job[];
  fradragList: Fradrag[];
  investeringer: Investering[];
  opsparinger: Record<string, OpsparingsTracker>;
}

export interface StoredAppData extends AppData {
  id: typeof STATE_ID;
  schemaVersion: typeof APP_DATA_VERSION;
  updatedAt: string;
  fingerprint?: string;
}

export interface AppDataSnapshot {
  id: string;
  createdAt: string;
  appData: AppData;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isYear(value: unknown): value is IndkomstAar {
  if (!isRecord(value)) return false;
  return isString(value.id) && (value.aar === 2025 || value.aar === 2026)
    && isString(value.hjemmeadresse) && isString(value.kommune)
    && isNumber(value.kommuneSkatteprocent) && isNumber(value.kirkeskatteprocent)
    && isNumber(value.forventetAIndkomst) && isNumber(value.forventetPensionSUDagpenge)
    && isNumber(value.forventedeFradragAIndkomst) && typeof value.medlemFolkekirken === 'boolean'
    && typeof value.enligForsoerger === 'boolean' && typeof value.laast === 'boolean';
}

function isJob(value: unknown): value is Job {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.indkomstAarId) && isString(value.hvervgiver)
    && isNumber(value.honorar) && isString(value.startDato) && isString(value.slutDato)
    && isString(value.betalingsDato) && ['NONE', 'OWN_CAR_MC', 'OWN_BIKE', 'PASSENGER'].includes(String(value.transportmiddel))
    && isNumber(value.antalKm) && isNumber(value.antalTure) && isNumber(value.koerselsFradrag)
    && typeof value.amBidragFritaget === 'boolean';
}

function isFradrag(value: unknown): value is Fradrag {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.indkomstAarId) && isString(value.beskrivelse)
    && isString(value.typeKategori) && isString(value.fakturaDato) && isNumber(value.fakturaBeloeb)
    && isNumber(value.fradragsProcent) && value.fradragsProcent >= 0 && value.fradragsProcent <= 100
    && isNumber(value.fradragIDKK);
}

function isInvestering(value: unknown): value is Investering {
  if (!isRecord(value)) return false;
  return isString(value.id) && isString(value.indkomstAarId) && isString(value.titel)
    && isNumber(value.beloeb) && isString(value.fakturaDato);
}

export function isAppData(value: unknown): value is AppData {
  if (!isRecord(value) || !isString(value.activeAarId)
    || !Array.isArray(value.indkomstAarList) || !value.indkomstAarList.every(isYear)
    || !Array.isArray(value.jobs) || !value.jobs.every(isJob)
    || !Array.isArray(value.fradragList) || !value.fradragList.every(isFradrag)
    || !Array.isArray(value.investeringer) || !value.investeringer.every(isInvestering)
    || !isRecord(value.opsparinger)) return false;
  const years = value.indkomstAarList as IndkomstAar[];
  if (!years.length || !years.some((year) => year.id === value.activeAarId)) return false;
  return Object.values(value.opsparinger).every((tracker) => isRecord(tracker)
    && isNumber(tracker.indbetaltTilSkat) && isNumber(tracker.opsparetPrivat));
}

function isStoredAppData(value: unknown): value is StoredAppData {
  return isAppData(value)
    && (value as Partial<StoredAppData>).id === STATE_ID
    && (value as Partial<StoredAppData>).schemaVersion === APP_DATA_VERSION;
}

export async function loadAppData(): Promise<StoredAppData | undefined> {
  const database = await openRevisorDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(APP_STATE_STORE_NAME, 'readonly')
        .objectStore(APP_STATE_STORE_NAME)
        .get(STATE_ID);
      request.onsuccess = () => resolve(isStoredAppData(request.result) ? request.result : undefined);
      request.onerror = () => reject(request.error ?? new Error('Appdata kunne ikke læses.'));
    });
  } finally {
    database.close();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  const database = await openRevisorDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction([APP_STATE_STORE_NAME, SNAPSHOT_STORE_NAME], 'readwrite');
      const stateStore = transaction.objectStore(APP_STATE_STORE_NAME);
      const snapshotStore = transaction.objectStore(SNAPSHOT_STORE_NAME);
      const fingerprint = JSON.stringify(data);
      const now = new Date().toISOString();
      const readCurrent = stateStore.get(STATE_ID);
      readCurrent.onsuccess = () => {
        const current = isStoredAppData(readCurrent.result) ? readCurrent.result : undefined;
        stateStore.put({
          ...data,
          id: STATE_ID,
          schemaVersion: APP_DATA_VERSION,
          updatedAt: now,
          fingerprint,
        } satisfies StoredAppData);
        if (current?.fingerprint !== fingerprint) {
          snapshotStore.put({
            id: crypto.randomUUID(),
            createdAt: now,
            appData: data,
          } satisfies AppDataSnapshot);
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Appdata kunne ikke gemmes.'));
    });
  } finally {
    database.close();
  }
}

function isAppDataSnapshot(value: unknown): value is AppDataSnapshot {
  return isRecord(value) && isString(value.id) && isString(value.createdAt) && isAppData(value.appData);
}

export async function listAppSnapshots(yearId?: string): Promise<AppDataSnapshot[]> {
  const database = await openRevisorDatabase();
  try {
    const snapshots = await new Promise<AppDataSnapshot[]>((resolve, reject) => {
      const request = database.transaction(SNAPSHOT_STORE_NAME, 'readonly')
        .objectStore(SNAPSHOT_STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve((request.result as unknown[]).filter(isAppDataSnapshot));
      request.onerror = () => reject(request.error ?? new Error('Versionshistorikken kunne ikke læses.'));
    });
    const sorted = snapshots.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    if (!yearId) return sorted;
    const fingerprints = new Set<string>();
    return sorted.filter((snapshot) => {
      const year = snapshot.appData.indkomstAarList.find((item) => item.id === yearId);
      if (!year) return false;
      const fingerprint = JSON.stringify({
        year,
        jobs: snapshot.appData.jobs.filter((item) => item.indkomstAarId === yearId),
        fradragList: snapshot.appData.fradragList.filter((item) => item.indkomstAarId === yearId),
        investeringer: snapshot.appData.investeringer.filter((item) => item.indkomstAarId === yearId),
        opsparing: snapshot.appData.opsparinger[yearId],
      });
      if (fingerprints.has(fingerprint)) return false;
      fingerprints.add(fingerprint);
      return true;
    });
  } finally {
    database.close();
  }
}

export async function replaceAppSnapshots(snapshots: AppDataSnapshot[]): Promise<void> {
  const database = await openRevisorDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(SNAPSHOT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(SNAPSHOT_STORE_NAME);
      store.clear();
      snapshots.filter(isAppDataSnapshot).forEach((snapshot) => store.put(snapshot));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Versionshistorikken kunne ikke gendannes.'));
    });
  } finally {
    database.close();
  }
}
