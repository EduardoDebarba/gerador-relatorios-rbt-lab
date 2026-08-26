import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { GeneratedReport, ReportRecord } from '../types.js';

const firebaseConfig = {
  apiKey: "AIzaSyCIT99xA8kegiZo2ba4Dyyy5IeIu6u5-ew",
  authDomain: "vaulted-kite-0vdqx.firebaseapp.com",
  projectId: "vaulted-kite-0vdqx",
  storageBucket: "vaulted-kite-0vdqx.firebasestorage.app",
  messagingSenderId: "434000611636",
  appId: "1:434000611636:web:6be380d9064ca581ca7d61"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app, "ai-studio-geradorderelatri-805ed590-ff3c-4c2d-941e-9cc7fade23f4");

const CHUNK_SIZE = 1000;

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {}, // No Auth configured in this applet
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function saveReportFirestore(report: GeneratedReport, records: ReportRecord[]): Promise<void> {
  const reportPath = `reports/${report.id}`;
  try {
    const reportRef = doc(db, 'reports', report.id);
    // Save the main report metadata and metrics
    await setDoc(reportRef, report);

    // Chunk the records and save them to subcollection 'records'
    const chunks: ReportRecord[][] = [];
    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
      chunks.push(records.slice(i, i + CHUNK_SIZE));
    }

    // Save each chunk
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkRef = doc(db, 'reports', report.id, 'records', `chunk_${idx}`);
      await setDoc(chunkRef, { data: chunks[idx] });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, reportPath);
  }
}

export async function getReportsFirestore(): Promise<GeneratedReport[]> {
  const path = 'reports';
  try {
    const reportsCol = collection(db, 'reports');
    const q = query(reportsCol, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    const reports: GeneratedReport[] = [];
    snapshot.forEach(doc => {
      reports.push(doc.data() as GeneratedReport);
    });
    return reports;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function getReportRecordsFirestore(reportId: string): Promise<ReportRecord[] | null> {
  const path = `reports/${reportId}/records`;
  try {
    const recordsCol = collection(db, 'reports', reportId, 'records');
    const snapshot = await getDocs(recordsCol);
    
    if (snapshot.empty) {
      return null;
    }

    // Read and combine all chunks
    const allRecords: ReportRecord[] = [];
    const docs = snapshot.docs;
    
    // Sort docs by their ID (chunk_0, chunk_1, ...) to guarantee original order
    docs.sort((a, b) => {
      const numA = parseInt(a.id.replace('chunk_', ''), 10);
      const numB = parseInt(b.id.replace('chunk_', ''), 10);
      return numA - numB;
    });

    docs.forEach(doc => {
      const chunkData = doc.data() as { data: ReportRecord[] };
      if (chunkData && Array.isArray(chunkData.data)) {
        allRecords.push(...chunkData.data);
      }
    });

    return allRecords;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function deleteReportFirestore(reportId: string): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    const reportRef = doc(db, 'reports', reportId);
    
    // Delete chunks inside subcollection
    const recordsCol = collection(db, 'reports', reportId, 'records');
    const snapshot = await getDocs(recordsCol);
    for (const chunkDoc of snapshot.docs) {
      await deleteDoc(chunkDoc.ref);
    }

    // Delete primary report document
    await deleteDoc(reportRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
