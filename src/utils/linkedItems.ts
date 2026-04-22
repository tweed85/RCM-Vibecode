import type { Project, FlatTask } from '../store/types';
import { getWbs } from './wbs';

export function getAllTasksFlat(project: Project): FlatTask[] {
  const result: FlatTask[] = [];
  project.milestones.forEach((m, mIdx) => {
    m.tasks.forEach((t, tIdx) => {
      result.push({
        tid: t.id,
        mid: m.id,
        wbs: getWbs(mIdx, tIdx),
        text: t.text,
        milestoneTitle: m.title,
      });
    });
  });
  return result;
}
