import * as XLSX from 'xlsx';
import type { RosterPerson } from '../store/types';
import { uid } from './uid';

export interface RosterImportResult {
  people: RosterPerson[];
  warnings: string[];
}

export function parseRosterXlsx(file: File): Promise<RosterImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as Record<string, unknown>[];

        const people: RosterPerson[] = [];
        const warnings: string[] = [];

        for (const row of rows) {
          const nameKey = Object.keys(row).find(k => k.toLowerCase().includes('name'));
          const titleKey = Object.keys(row).find(k => k.toLowerCase().includes('title'));
          const emailKey = Object.keys(row).find(k => k.toLowerCase().includes('email'));

          if (!nameKey) continue;
          const name = String(row[nameKey] ?? '').trim();
          if (!name) continue;

          people.push({
            id: uid(),
            name,
            title: titleKey ? String(row[titleKey] ?? '').trim() || undefined : undefined,
            email: emailKey ? String(row[emailKey] ?? '').trim() || undefined : undefined,
          });
        }

        if (people.length === 0) {
          warnings.push('No names found — ensure the file has a column named "Name"');
        }

        resolve({ people, warnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function parseRosterCsv(text: string): RosterImportResult {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { people: [], warnings: ['CSV appears empty'] };

  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('name'));
  const titleIdx = headers.findIndex(h => h.toLowerCase().includes('title'));
  const emailIdx = headers.findIndex(h => h.toLowerCase().includes('email'));

  if (nameIdx === -1) return { people: [], warnings: ['No "Name" column found in CSV'] };

  const people: RosterPerson[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
    const name = cols[nameIdx] ?? '';
    if (!name) continue;
    people.push({
      id: uid(),
      name,
      title: titleIdx >= 0 ? cols[titleIdx] || undefined : undefined,
      email: emailIdx >= 0 ? cols[emailIdx] || undefined : undefined,
    });
  }

  return { people, warnings: people.length === 0 ? ['No names found in CSV'] : [] };
}
