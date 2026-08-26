import fs from 'fs/promises';
import path from 'path';
import { GeneratedReport, ReportRecord } from '../src/types.js';

const DB_FILE = path.join(process.cwd(), 'reports_db.json');

interface DatabaseSchema {
  reports: GeneratedReport[];
  records: { [reportId: string]: ReportRecord[] };
}

async function initDB(): Promise<DatabaseSchema> {
  try {
    const data = await fs.readFile(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    const defaultDB: DatabaseSchema = { reports: [], records: {} };
    await fs.writeFile(DB_FILE, JSON.stringify(defaultDB, null, 2), 'utf-8');
    return defaultDB;
  }
}

export async function saveReport(report: GeneratedReport, records: ReportRecord[]): Promise<void> {
  const db = await initDB();
  db.reports.unshift(report); // Add to the beginning of the list
  db.records[report.id] = records;
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

export async function getReports(): Promise<GeneratedReport[]> {
  const db = await initDB();
  return db.reports;
}

export async function getReportRecords(reportId: string): Promise<ReportRecord[] | null> {
  const db = await initDB();
  return db.records[reportId] || null;
}

export async function deleteReport(reportId: string): Promise<boolean> {
  const db = await initDB();
  const index = db.reports.findIndex(r => r.id === reportId);
  if (index !== -1) {
    db.reports.splice(index, 1);
    delete db.records[reportId];
    await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
    return true;
  }
  return false;
}
