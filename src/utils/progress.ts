import type { Milestone } from '../store/types';

export function calcProgress(milestone: Milestone): number {
  let total = 0, done = 0;
  for (const task of milestone.tasks) {
    const subs = task.subtasks;
    if (subs.length > 0) {
      total += subs.length;
      done  += subs.filter(s => s.done).length;
    } else {
      total += 1;
      done  += task.done ? 1 : 0;
    }
  }
  return total ? Math.round((done / total) * 100) : 0;
}

export function isOverdue(dueDate: string, status: string): boolean {
  return status !== 'complete' && new Date(dueDate) < new Date();
}
