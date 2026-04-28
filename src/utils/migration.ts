import type { AppState } from '../store/types';

export function migrateState(state: AppState): AppState {
  for (const project of state.projects ?? []) {
    for (const r of project.raid ?? []) {
      r.linkedTasks ??= [];
    }
    for (const d of project.decisions ?? []) {
      d.linkedTasks ??= [];
    }
    if (!project.tasksFilterWs)     project.tasksFilterWs     = 'all';
    if (!project.tasksFilterStatus) project.tasksFilterStatus = 'all';
    if (!project.activeRaidTab)     project.activeRaidTab     = 'all';

    for (const m of project.milestones ?? []) {
      // owner → owners migration
      if ('owner' in m && !Array.isArray((m as unknown as Record<string, unknown>).owners)) {
        (m as unknown as Record<string, unknown>).owners = [(m as unknown as Record<string, unknown>).owner].filter(Boolean);
        delete (m as unknown as Record<string, unknown>).owner;
      }
      for (const t of m.tasks ?? []) {
        t.subtasks    ??= [];
        t.predecessors ??= [];
        if ('owner' in t && !Array.isArray((t as unknown as Record<string, unknown>).owners)) {
          (t as unknown as Record<string, unknown>).owners = [(t as unknown as Record<string, unknown>).owner].filter(Boolean);
          delete (t as unknown as Record<string, unknown>).owner;
        }
        for (const st of t.subtasks ?? []) {
          if ('owner' in st && !Array.isArray((st as unknown as Record<string, unknown>).owners)) {
            (st as unknown as Record<string, unknown>).owners = [(st as unknown as Record<string, unknown>).owner].filter(Boolean);
            delete (st as unknown as Record<string, unknown>).owner;
          }
        }
      }
      for (const imp of m.impact ?? []) {
        const impRec = imp as unknown as Record<string, string>;
        if ('value' in impRec && !('projected' in impRec)) {
          impRec['projected'] = impRec['value'];
          impRec['realized'] = impRec['realized'] ?? '';
          delete impRec['value'];
        }
      }
    }
  }
  return state;
}
