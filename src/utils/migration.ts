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
      for (const t of m.tasks ?? []) {
        t.subtasks    ??= [];
        t.predecessors ??= [];
      }
      for (const imp of m.impact ?? []) {
        if ('value' in imp && !('projected' in imp)) {
          (imp as unknown as Record<string, string>)['projected'] = (imp as unknown as Record<string, string>)['value'];
          imp.realized = imp.realized ?? '';
          delete (imp as unknown as Record<string, string>)['value'];
        }
      }
    }
  }
  return state;
}
