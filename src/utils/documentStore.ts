import { DOCUMENT_STORE_NAME, openRevisorDatabase } from './database';

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  createdAt: string;
  blob: Blob;
}

export async function saveDocument(file: File): Promise<string> {
  const database = await openRevisorDatabase();
  const document: StoredDocument = {
    id: crypto.randomUUID(), name: file.name, type: file.type,
    createdAt: new Date().toISOString(), blob: file,
  };
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(DOCUMENT_STORE_NAME, 'readwrite');
    transaction.objectStore(DOCUMENT_STORE_NAME).put(document);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Bilaget kunne ikke gemmes.'));
  });
  database.close();
  return document.id;
}

export async function downloadDocument(id: string): Promise<void> {
  const database = await openRevisorDatabase();
  const document = await new Promise<StoredDocument | undefined>((resolve, reject) => {
    const request = database.transaction(DOCUMENT_STORE_NAME, 'readonly').objectStore(DOCUMENT_STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result as StoredDocument | undefined);
    request.onerror = () => reject(request.error ?? new Error('Bilaget kunne ikke læses.'));
  });
  database.close();
  if (!document) throw new Error('Bilaget findes ikke længere i denne browser.');
  const url = URL.createObjectURL(document.blob);
  const link = window.document.createElement('a');
  link.href = url; link.download = document.name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export async function getAllDocuments(): Promise<StoredDocument[]> {
  const database = await openRevisorDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(DOCUMENT_STORE_NAME, 'readonly')
        .objectStore(DOCUMENT_STORE_NAME)
        .getAll();
      request.onsuccess = () => resolve(request.result as StoredDocument[]);
      request.onerror = () => reject(request.error ?? new Error('Bilagene kunne ikke læses.'));
    });
  } finally {
    database.close();
  }
}

export async function replaceDocuments(documents: StoredDocument[]): Promise<void> {
  const database = await openRevisorDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);
      store.clear();
      documents.forEach((document) => store.put(document));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Bilagene kunne ikke gendannes.'));
    });
  } finally {
    database.close();
  }
}

export async function upsertDocuments(documents: StoredDocument[]): Promise<void> {
  if (!documents.length) return;
  const database = await openRevisorDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(DOCUMENT_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(DOCUMENT_STORE_NAME);
      documents.forEach((document) => store.put(document));
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('Bilagene kunne ikke importeres.'));
    });
  } finally {
    database.close();
  }
}
