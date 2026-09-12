import {
  APP_DATA_VERSION,
  isAppData,
  listAppSnapshots,
  replaceAppSnapshots,
  type AppData,
  type AppDataSnapshot,
} from './appDatabase';
import {
  getAllDocuments,
  replaceDocuments,
  upsertDocuments,
  type StoredDocument,
} from './documentStore';
import { mergeYearData } from './yearArchive';

const BACKUP_SCHEMA_VERSION = 2;
const MAX_BACKUP_SIZE = 250 * 1024 * 1024;

interface SerializedDocument extends Omit<StoredDocument, 'blob'> {
  dataUrl: string;
}

interface FullBackupFile {
  product: 'revisor-ai';
  schemaVersion: 1 | typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  appData: AppData;
  documents: SerializedDocument[];
  snapshots?: AppDataSnapshot[];
}

interface YearBackupFile {
  product: 'revisor-ai-year';
  schemaVersion: 1;
  exportedAt: string;
  yearId: string;
  year: number;
  appData: AppData;
  documents: SerializedDocument[];
}

interface UnknownBackupFile {
  product?: unknown;
  schemaVersion?: unknown;
  appData?: unknown;
  documents?: unknown;
  snapshots?: unknown;
  yearId?: unknown;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Et bilag kunne ikke eksporteres.'));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, encoded = ''] = dataUrl.split(',', 2);
  const type = /^data:([^;]+);base64$/.exec(header ?? '')?.[1] ?? 'application/octet-stream';
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  return new Blob([bytes], { type });
}

async function serializeDocuments(documents: StoredDocument[]): Promise<SerializedDocument[]> {
  return Promise.all(documents.map(async ({ blob, ...document }) => ({
    ...document,
    dataUrl: await blobToDataUrl(blob),
  })));
}

function deserializeDocuments(value: unknown): StoredDocument[] {
  if (!Array.isArray(value)) throw new Error('Backupfilens bilagsarkiv er ugyldigt.');
  return value.map((candidate): StoredDocument => {
    const document = candidate as Partial<SerializedDocument>;
    if (!document || typeof document.id !== 'string' || typeof document.name !== 'string'
      || typeof document.dataUrl !== 'string') {
      throw new Error('Et bilag i backupfilen er ugyldigt.');
    }
    return {
      id: document.id,
      name: document.name,
      type: document.type || 'application/octet-stream',
      createdAt: document.createdAt || new Date().toISOString(),
      blob: dataUrlToBlob(document.dataUrl),
    };
  });
}

function triggerDownload(contents: FullBackupFile | YearBackupFile, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(contents)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createYearData(appData: AppData, yearId: string): AppData {
  const year = appData.indkomstAarList.find((item) => item.id === yearId);
  if (!year) throw new Error('Indkomståret findes ikke.');
  return {
    activeAarId: yearId,
    indkomstAarList: [year],
    jobs: appData.jobs.filter((item) => item.indkomstAarId === yearId),
    fradragList: appData.fradragList.filter((item) => item.indkomstAarId === yearId),
    investeringer: appData.investeringer.filter((item) => item.indkomstAarId === yearId),
    opsparinger: appData.opsparinger[yearId] ? { [yearId]: appData.opsparinger[yearId] } : {},
  };
}

function referencedDocumentIds(appData: AppData): Set<string> {
  return new Set([
    ...appData.jobs.flatMap((item) => item.bilagIds ?? []),
    ...appData.fradragList.flatMap((item) => item.bilagIds ?? []),
    ...appData.investeringer.flatMap((item) => item.bilagIds ?? []),
  ]);
}

export async function downloadBackup(appData: AppData): Promise<void> {
  const [documents, snapshots] = await Promise.all([getAllDocuments(), listAppSnapshots()]);
  const exportedAt = new Date().toISOString();
  const backup: FullBackupFile = {
    product: 'revisor-ai',
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt,
    appData,
    documents: await serializeDocuments(documents),
    snapshots,
  };
  triggerDownload(backup, `revisor-ai-komplet-backup-${exportedAt.slice(0, 10)}.json`);
}

export async function downloadYearBackup(appData: AppData, yearId: string): Promise<void> {
  const yearData = createYearData(appData, yearId);
  const year = yearData.indkomstAarList[0]!;
  const ids = referencedDocumentIds(yearData);
  const documents = (await getAllDocuments()).filter((document) => ids.has(document.id));
  const exportedAt = new Date().toISOString();
  const backup: YearBackupFile = {
    product: 'revisor-ai-year',
    schemaVersion: 1,
    exportedAt,
    yearId,
    year: year.aar,
    appData: yearData,
    documents: await serializeDocuments(documents),
  };
  triggerDownload(backup, `revisor-ai-${year.aar}-${exportedAt.slice(0, 10)}.json`);
}

export async function readBackup(file: File, currentAppData: AppData): Promise<AppData> {
  if (file.size > MAX_BACKUP_SIZE) throw new Error('Backupfilen må højst være 250 MB.');
  const parsed: unknown = JSON.parse(await file.text());
  if (!parsed || typeof parsed !== 'object') throw new Error('Backupfilen er ugyldig.');
  const backup = parsed as UnknownBackupFile;

  if (backup.product === 'revisor-ai-year') {
    if (backup.schemaVersion !== 1 || typeof backup.yearId !== 'string' || !isAppData(backup.appData)) {
      throw new Error('Årsarkivets format eller version understøttes ikke.');
    }
    await upsertDocuments(deserializeDocuments(backup.documents));
    return mergeYearData(currentAppData, backup.appData, backup.yearId);
  }

  if (backup.product !== 'revisor-ai'
    || (backup.schemaVersion !== APP_DATA_VERSION && backup.schemaVersion !== BACKUP_SCHEMA_VERSION)
    || !isAppData(backup.appData)) {
    throw new Error('Backupfilens format eller version understøttes ikke.');
  }
  await replaceDocuments(deserializeDocuments(backup.documents));
  if (backup.schemaVersion === BACKUP_SCHEMA_VERSION && backup.snapshots !== undefined) {
    if (!Array.isArray(backup.snapshots)) throw new Error('Backupfilens versionshistorik er ugyldig.');
    await replaceAppSnapshots(backup.snapshots as AppDataSnapshot[]);
  } else {
    await replaceAppSnapshots([]);
  }
  return backup.appData;
}
