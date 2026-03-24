import type { SalesOrderDraft } from '../types';

export interface SavedInvoice extends SalesOrderDraft {
  id: string;
  savedAt: string;
  savedAtMs: number;
}

export interface SaveInvoiceResult {
  invoice: SavedInvoice;
  isUpdate: boolean;
}

const DB_NAME = 'PosSalesDB';
const STORE_NAME = 'invoices';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

const getDb = async (): Promise<IDBDatabase> => {
  if (dbInstance) {
    return dbInstance;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('savedAtMs', 'savedAtMs', { unique: false });
      }
    };
  });
};

export const saveInvoice = async (draft: SalesOrderDraft, existingInvoiceId?: string): Promise<SaveInvoiceResult> => {
  const db = await getDb();
  const savedAtMs = Date.now();
  const isUpdate = Boolean(existingInvoiceId);

  const invoice: SavedInvoice = {
    ...draft,
    id: existingInvoiceId ?? `INV-${savedAtMs}-${Math.random().toString(36).substring(2, 9)}`,
    savedAt: new Date(savedAtMs).toISOString(),
    savedAtMs,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(invoice);

    request.onerror = () => reject(request.error);
    request.onsuccess = () =>
      resolve({
        invoice,
        isUpdate,
      });
  });
};

export const getAllInvoices = async (): Promise<SavedInvoice[]> => {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('savedAtMs');
    const request = index.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const invoices = request.result as SavedInvoice[];
      invoices.sort((a, b) => b.savedAtMs - a.savedAtMs);
      resolve(invoices);
    };
  });
};

export const searchInvoices = async (query: string): Promise<SavedInvoice[]> => {
  const allInvoices = await getAllInvoices();

  if (!query.trim()) {
    return allInvoices;
  }

  const lowerQuery = query.trim().toLowerCase();

  return allInvoices.filter(
    (invoice) =>
      invoice.id.toLowerCase().includes(lowerQuery) ||
      invoice.orderNumber?.toLowerCase().includes(lowerQuery) ||
      invoice.orderDate?.includes(lowerQuery),
  );
};

export const getInvoiceById = async (id: string): Promise<SavedInvoice | null> => {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
};

export const deleteInvoice = async (id: string): Promise<void> => {
  const db = await getDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
};

