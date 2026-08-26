import { GeneratedReport, ReportRecord } from '../types.js';

const DB_NAME = 'RBT_Reports_DB';
const DB_VERSION = 1;
const REPORTS_STORE = 'reports';
const RECORDS_STORE = 'records';

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(REPORTS_STORE)) {
        db.createObjectStore(REPORTS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        db.createObjectStore(RECORDS_STORE); // key will be reportId
      }
    };
  });
}

export async function saveReportLocal(report: GeneratedReport, records: ReportRecord[]): Promise<void> {
  const db = await initIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([REPORTS_STORE, RECORDS_STORE], 'readwrite');
    const reportsStore = transaction.objectStore(REPORTS_STORE);
    const recordsStore = transaction.objectStore(RECORDS_STORE);

    reportsStore.put(report);
    recordsStore.put(records, report.id);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function getReportsLocal(): Promise<GeneratedReport[]> {
  const db = await initIndexedDB();
  return new Promise<GeneratedReport[]>((resolve, reject) => {
    const transaction = db.transaction([REPORTS_STORE], 'readonly');
    const store = transaction.objectStore(REPORTS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      const reports = request.result as GeneratedReport[];
      // Sort reports by createdAt descending
      reports.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(reports);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getReportRecordsLocal(reportId: string): Promise<ReportRecord[] | null> {
  const db = await initIndexedDB();
  return new Promise<ReportRecord[] | null>((resolve, reject) => {
    const transaction = db.transaction([RECORDS_STORE], 'readonly');
    const store = transaction.objectStore(RECORDS_STORE);
    const request = store.get(reportId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteReportLocal(reportId: string): Promise<void> {
  const db = await initIndexedDB();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction([REPORTS_STORE, RECORDS_STORE], 'readwrite');
    const reportsStore = transaction.objectStore(REPORTS_STORE);
    const recordsStore = transaction.objectStore(RECORDS_STORE);

    reportsStore.delete(reportId);
    recordsStore.delete(reportId);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}
