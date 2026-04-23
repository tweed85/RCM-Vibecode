import * as XLSX from 'xlsx';
import { uid } from './uid';
import type { Project, Milestone, Task, Subtask } from '../store/types';
import { DEFAULT_STATE } from '../constants/defaults';

interface ParseResult {
  milestones: Milestone[];
  warnings: string[];
}

function parseDate(raw: unknown): string {
  if (!raw) return '';
  // Excel serial number
  if (typeof raw === 'number') {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return '';
    const mm = String(d.m).padStart(2, '0');
    const dd = String(d.d).padStart(2, '0');
    return `${d.y}-${mm}-${dd}`;
  }
  const s = String(raw).trim();
  if (!s) return '';
  // MM/DD/YY or MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    const year = y.length === 2 ? (Number(y) < 50 ? `20${y}` : `19${y}`) : y;
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

function parseStatus(raw: unknown, pct: unknown): Milestone['status'] {
  const s = String(raw ?? '').toLowerCase().trim();
  const p = parseFloat(String(pct ?? '0').replace('%', ''));
  if (s.includes('complete') || p === 100) return 'complete';
  if (s.includes('at risk'))               return 'atrisk';
  if (s.includes('in progress') || (p > 0 && p < 100)) return 'inprogress';
  return 'notstarted';
}

function parseTaskStatus(raw: unknown, pct: unknown): boolean {
  const s = String(raw ?? '').toLowerCase().trim();
  const p = parseFloat(String(pct ?? '0').replace('%', ''));
  return s.includes('complete') || p === 100;
}

export function parseSmartsheetXlsx(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb   = XLSX.read(data, { type: 'array', cellDates: false });
        const ws   = wb.Sheets[wb.SheetNames[0]];

        // Read as array of arrays so we can handle merged/blank cells
        const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          defval: '',
          blankrows: false,
        });

        if (rows.length < 2) {
          return resolve({ milestones: [], warnings: ['Sheet appears empty'] });
        }

        // Find header row — look for a row containing "tasks" or "milestone"
        let headerIdx = 0;
        for (let i = 0; i < Math.min(rows.length, 5); i++) {
          const lower = rows[i].map(c => String(c).toLowerCase());
          if (lower.some(c => c.includes('task') || c.includes('milestone'))) {
            headerIdx = i;
            break;
          }
        }

        const headers = rows[headerIdx].map(c => String(c).toLowerCase().trim());
        const col = (name: string) => headers.findIndex(h => h.includes(name));

        // "Milestone" column is a boolean flag (TRUE = this row is a milestone)
        // The row title comes from the task/name column in both cases
        const iMilestoneFlag = col('milestone');
        const iTask          = col('task') !== -1 ? col('task') : col('name');
        const iAssigned    = col('assign');
        const iStartDate   = col('start');
        const iEndDate     = col('end');
        const iStatus      = col('status');
        const iPct         = col('%') !== -1 ? col('%') : col('complete');
        const iComments    = col('comment');
        const iPredecessor = col('predecessor');

        const milestones: Milestone[] = [];
        const warnings: string[] = [];
        let   currentMilestone: Milestone | null = null;
        let   currentTask: Task | null = null;

        // rowPos tracks the 1-indexed sequential position of every non-blank row
        // after the header — matching Smartsheet's internal row numbering used in
        // the predecessor column. Only task rows (not milestones/subtasks) are
        // mapped so we can resolve predecessor numbers to task UUIDs in a second pass.
        let rowPos = 0;
        const rowToTaskId = new Map<number, string>();
        // Store raw predecessor strings keyed by task id for second-pass resolution
        const rawPredecessors = new Map<string, string>();

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          const get = (idx: number) => idx >= 0 ? String(row[idx] ?? '').trim() : '';
          // Raw (un-trimmed) name cell — leading whitespace signals a subtask in SmartSheets exports
          const rawName = iTask >= 0 ? String(row[iTask] ?? '') : '';

          // Milestone column is a boolean flag; the title is always in the name column
          const isMilestone   = iMilestoneFlag >= 0 &&
            String(row[iMilestoneFlag] ?? '').trim().toLowerCase() === 'true';
          const rowTitle      = rawName.trim();
          const assigned      = get(iAssigned);
          const startDate     = parseDate(iStartDate >= 0 ? row[iStartDate] : '');
          const endDate       = parseDate(iEndDate   >= 0 ? row[iEndDate]   : '');
          const statusRaw     = get(iStatus);
          const pctRaw        = get(iPct);
          const note          = iComments >= 0 ? get(iComments) : '';

          // Skip completely blank rows
          if (!rowTitle) continue;

          rowPos++;

          if (isMilestone) {
            // ── Milestone row (blue header, Milestone flag = TRUE) ─────────
            currentTask = null;
            currentMilestone = {
              id:         uid(),
              title:      rowTitle,
              workstream: 'imported',
              status:     parseStatus(statusRaw, pctRaw),
              owners:     assigned ? [assigned] : [],
              dueDate:    endDate,
              tasks:      [],
              impact:     [],
              note,
              noteExport: false,
            };
            milestones.push(currentMilestone);

          } else {
            // Indented cell = subtask; flush-left cell = task
            const isIndented = rawName.length > rowTitle.length;

            if (isIndented && currentTask) {
              // ── Subtask row ──────────────────────────────────────────────
              const subtask: Subtask = {
                id:        uid(),
                text:      rowTitle,
                done:      parseTaskStatus(statusRaw, pctRaw),
                owners:    assigned ? [assigned] : [],
                startDate,
                endDate,
              };
              currentTask.subtasks.push(subtask);

            } else {
              // ── Task row ─────────────────────────────────────────────────
              if (!currentMilestone) {
                currentMilestone = {
                  id: uid(), title: 'Imported Tasks', workstream: 'imported',
                  status: 'notstarted', owners: [], dueDate: '', tasks: [], impact: [], note: '', noteExport: false,
                };
                milestones.push(currentMilestone);
                warnings.push('Some tasks had no parent milestone — grouped under "Imported Tasks"');
              }

              const predecessorRaw = iPredecessor >= 0 ? get(iPredecessor) : '';
              const taskId = uid();
              rowToTaskId.set(rowPos, taskId);
              if (predecessorRaw) rawPredecessors.set(taskId, predecessorRaw);

              currentTask = {
                id:           taskId,
                text:         rowTitle,
                done:         parseTaskStatus(statusRaw, pctRaw),
                startDate,
                endDate,
                note,
                owners:       assigned ? [assigned] : [],
                subtasks:     [],
                predecessors: [],
              };
              currentMilestone.tasks.push(currentTask);
            }
          }
        }

        // ── Second pass: resolve Smartsheet row numbers to task UUIDs ────────
        // Predecessor format: "3" | "3FS" | "2,3" | "2SS,3FS" (strip non-numeric
        // suffix per segment, split on comma, look up rowToTaskId)
        for (const m of milestones) {
          for (const t of m.tasks) {
            const raw = rawPredecessors.get(t.id);
            if (!raw) continue;
            const resolved = raw.split(',').flatMap(seg => {
              const num = parseInt(seg.replace(/[^0-9]/g, ''), 10);
              if (isNaN(num)) return [];
              const predId = rowToTaskId.get(num);
              return predId ? [predId] : [];
            });
            t.predecessors = resolved;
          }
        }

        if (milestones.length === 0) {
          warnings.push('No milestones or tasks were detected — check that the file matches the expected SmartSheets format');
        }

        resolve({ milestones, warnings });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

export function buildImportedProject(
  name: string,
  milestones: Milestone[],
): Project {
  const base = DEFAULT_STATE.projects[0];
  return {
    ...base,
    config: {
      ...base.config,
      clientName: name,
      workstreams: [
        { id: 'imported', label: 'Imported', color: 'blue', amOwner: '' },
      ],
      roles: [],
      payers: [],
      denials: [],
    },
    milestones,
    raid: [],
    decisions: [],
  };
}
