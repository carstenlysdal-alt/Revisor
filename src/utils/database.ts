export const DATABASE_NAME = 'revisor-ai-documents';
export const DOCUMENT_STORE_NAME = 'documents';
export const APP_STATE_STORE_NAME = 'app-state';
export const SNAPSHOT_STORE_NAME = 'snapshots';
export const DATABASE_VERSION = 3;

export function openRevisorDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(DOCUMENT_STORE_NAME)) {
        database.createObjectStore(DOCUMENT_STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(APP_STATE_STORE_NAME)) {
        database.createObjectStore(APP_STATE_STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(SNAPSHOT_STORE_NAME)) {
        const snapshotStore = database.createObjectStore(SNAPSHOT_STORE_NAME, { keyPath: 'id' });
        snapshotStore.createIndex('createdAt', 'createdAt');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Den lokale database kunne ikke åbnes.'));
  });
}
