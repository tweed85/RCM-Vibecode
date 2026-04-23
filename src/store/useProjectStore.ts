import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState, Project, ProjectConfig, Milestone, Task, Subtask,
  RaidItem, DecisionItem, RosterPerson,
} from './types';
import { DEFAULT_STATE } from '../constants/defaults';
import { LS_KEY, LS_VERSION } from '../constants/enums';
import { migrateState } from '../utils/migration';
import { uid } from '../utils/uid';

interface ProjectStore extends AppState {
  // Navigation
  setActiveProject: (idx: number) => void;

  // Project CRUD
  addProject: (proj: Project) => void;
  updateProjectConfig: (updates: Partial<ProjectConfig>) => void;
  deleteProject: (idx: number) => void;

  // Filters
  setActiveFilter: (wsId: string) => void;
  setTasksFilterWs: (wsId: string) => void;
  setTasksFilterStatus: (status: 'all' | 'done' | 'todo') => void;
  setActiveRaidTab: (tab: 'all' | 'risk' | 'action' | 'issue' | 'dependency') => void;

  // Milestone CRUD
  addMilestone: (ms: Omit<Milestone, 'id'>) => void;
  updateMilestone: (id: string, updates: Partial<Milestone>) => void;
  deleteMilestone: (id: string) => void;

  // Task operations
  addTask: (milestoneId: string, task: Omit<Task, 'id'>) => void;
  toggleTask: (milestoneId: string, taskId: string) => void;
  updateTask: (milestoneId: string, taskId: string, updates: Partial<Task>) => void;
  deleteTask: (milestoneId: string, taskId: string) => void;
  moveTask: (milestoneId: string, taskId: string, direction: -1 | 1) => void;
  moveTaskToMilestone: (fromMilestoneId: string, taskId: string, toMilestoneId: string) => void;
  addPredecessor: (milestoneId: string, taskId: string, predId: string) => void;
  removePredecessor: (milestoneId: string, taskId: string, predId: string) => void;

  // Subtask operations
  addSubtask: (milestoneId: string, taskId: string, subtask: Omit<Subtask, 'id'>) => void;
  toggleSubtask: (milestoneId: string, taskId: string, subtaskId: string) => void;
  updateSubtask: (milestoneId: string, taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (milestoneId: string, taskId: string, subtaskId: string) => void;

  // RAID
  addRaidItem: (item: Omit<RaidItem, 'id'>) => void;
  updateRaidItem: (id: string, updates: Partial<RaidItem>) => void;
  deleteRaidItem: (id: string) => void;

  // Decisions
  addDecision: (item: Omit<DecisionItem, 'id'>) => void;
  updateDecision: (id: string, updates: Partial<DecisionItem>) => void;
  deleteDecision: (id: string) => void;

  // Helpers
  currentProject: () => Project;
  resetToDefaults: () => void;
  appendMilestonesToProject: (projectIdx: number, milestones: Milestone[]) => void;

  // Roster
  setAmRoster: (people: RosterPerson[]) => void;
  addAmPerson: (person: RosterPerson) => void;
  removeAmPerson: (id: string) => void;

  // Supabase sync
  setSupabaseId: (idx: number, id: string) => void;
  setProjects: (projects: Project[], ids: string[]) => void;
}

function autoUpdateMilestoneStatus(m: Milestone) {
  const tasks = m.tasks ?? [];
  if (!tasks.length) return;
  const allDone = tasks.every(t => {
    const subs = t.subtasks ?? [];
    return subs.length > 0 ? subs.every(s => s.done) : t.done;
  });
  if (allDone && m.status !== 'complete') m.status = 'complete';
  else if (!allDone && m.status === 'complete') m.status = 'inprogress';
}

export const useProjectStore = create<ProjectStore>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      currentProject: () => get().projects[get().activeProject],

      setActiveProject: (idx) => set({ activeProject: idx }),

      addProject: (proj) =>
        set(s => ({
          projects: [...s.projects, proj],
          activeProject: s.projects.length,
        })),

      updateProjectConfig: (updates) =>
        set(s => {
          const projects = [...s.projects];
          projects[s.activeProject] = {
            ...projects[s.activeProject],
            config: { ...projects[s.activeProject].config, ...updates },
          };
          return { projects };
        }),

      deleteProject: (idx) =>
        set(s => {
          if (s.projects.length <= 1) return s;
          const projects = s.projects.filter((_, i) => i !== idx);
          return {
            projects,
            activeProject: Math.max(0, s.activeProject - 1),
          };
        }),

      setActiveFilter: (wsId) =>
        set(s => {
          const projects = [...s.projects];
          projects[s.activeProject] = { ...projects[s.activeProject], activeFilter: wsId };
          return { projects };
        }),

      setTasksFilterWs: (wsId) =>
        set(s => {
          const projects = [...s.projects];
          projects[s.activeProject] = { ...projects[s.activeProject], tasksFilterWs: wsId };
          return { projects };
        }),

      setTasksFilterStatus: (status) =>
        set(s => {
          const projects = [...s.projects];
          projects[s.activeProject] = { ...projects[s.activeProject], tasksFilterStatus: status };
          return { projects };
        }),

      setActiveRaidTab: (tab) =>
        set(s => {
          const projects = [...s.projects];
          projects[s.activeProject] = { ...projects[s.activeProject], activeRaidTab: tab };
          return { projects };
        }),

      addMilestone: (ms) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = [...proj.milestones, { ...ms, id: uid() }];
          projects[s.activeProject] = proj;
          return { projects };
        }),

      updateMilestone: (id, updates) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m =>
            m.id === id ? { ...m, ...updates } : m
          );
          projects[s.activeProject] = proj;
          return { projects };
        }),

      deleteMilestone: (id) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.filter(m => m.id !== id);
          projects[s.activeProject] = proj;
          return { projects };
        }),

      addTask: (milestoneId, task) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return { ...m, tasks: [...m.tasks, { ...task, id: uid() }] };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      toggleTask: (milestoneId, taskId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            const tasks = m.tasks.map(t => {
              if (t.id !== taskId) return t;
              const newDone = !t.done;
              const subtasks = (t.subtasks ?? []).map(st => ({ ...st, done: newDone }));
              return { ...t, done: newDone, subtasks };
            });
            const updated = { ...m, tasks };
            autoUpdateMilestoneStatus(updated);
            return updated;
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      updateTask: (milestoneId, taskId, updates) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return { ...m, tasks: m.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      deleteTask: (milestoneId, taskId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return { ...m, tasks: m.tasks.filter(t => t.id !== taskId) };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      moveTask: (milestoneId, taskId, direction) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            const tasks = [...m.tasks];
            const idx = tasks.findIndex(t => t.id === taskId);
            if (idx < 0) return m;
            const newIdx = idx + direction;
            if (newIdx < 0 || newIdx >= tasks.length) return m;
            [tasks[idx], tasks[newIdx]] = [tasks[newIdx], tasks[idx]];
            return { ...m, tasks };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      moveTaskToMilestone: (fromMilestoneId, taskId, toMilestoneId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          let task: Task | undefined;
          proj.milestones = proj.milestones.map(m => {
            if (m.id === fromMilestoneId) {
              task = m.tasks.find(t => t.id === taskId);
              return { ...m, tasks: m.tasks.filter(t => t.id !== taskId) };
            }
            return m;
          });
          if (task) {
            proj.milestones = proj.milestones.map(m => {
              if (m.id === toMilestoneId) return { ...m, tasks: [...m.tasks, task!] };
              return m;
            });
          }
          projects[s.activeProject] = proj;
          return { projects };
        }),

      addPredecessor: (milestoneId, taskId, predId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m, tasks: m.tasks.map(t => {
                if (t.id !== taskId) return t;
                const preds = t.predecessors ?? [];
                if (preds.includes(predId)) return t;
                return { ...t, predecessors: [...preds, predId] };
              }),
            };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      removePredecessor: (milestoneId, taskId, predId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m, tasks: m.tasks.map(t => {
                if (t.id !== taskId) return t;
                return { ...t, predecessors: (t.predecessors ?? []).filter(p => p !== predId) };
              }),
            };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      addSubtask: (milestoneId, taskId, subtask) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m, tasks: m.tasks.map(t => {
                if (t.id !== taskId) return t;
                return { ...t, subtasks: [...(t.subtasks ?? []), { ...subtask, id: uid() }] };
              }),
            };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      toggleSubtask: (milestoneId, taskId, subtaskId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            const tasks = m.tasks.map(t => {
              if (t.id !== taskId) return t;
              const subtasks = (t.subtasks ?? []).map(st =>
                st.id === subtaskId ? { ...st, done: !st.done } : st
              );
              const allSubsDone = subtasks.length > 0 && subtasks.every(st => st.done);
              return { ...t, subtasks, done: allSubsDone };
            });
            const updated = { ...m, tasks };
            autoUpdateMilestoneStatus(updated);
            return updated;
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      updateSubtask: (milestoneId, taskId, subtaskId, updates) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m, tasks: m.tasks.map(t => {
                if (t.id !== taskId) return t;
                return {
                  ...t,
                  subtasks: (t.subtasks ?? []).map(st =>
                    st.id === subtaskId ? { ...st, ...updates } : st
                  ),
                };
              }),
            };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      deleteSubtask: (milestoneId, taskId, subtaskId) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.milestones = proj.milestones.map(m => {
            if (m.id !== milestoneId) return m;
            return {
              ...m, tasks: m.tasks.map(t => {
                if (t.id !== taskId) return t;
                return { ...t, subtasks: (t.subtasks ?? []).filter(st => st.id !== subtaskId) };
              }),
            };
          });
          projects[s.activeProject] = proj;
          return { projects };
        }),

      addRaidItem: (item) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.raid = [...(proj.raid ?? []), { ...item, id: uid() }];
          projects[s.activeProject] = proj;
          return { projects };
        }),

      updateRaidItem: (id, updates) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.raid = (proj.raid ?? []).map(r => r.id === id ? { ...r, ...updates } : r);
          projects[s.activeProject] = proj;
          return { projects };
        }),

      deleteRaidItem: (id) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.raid = (proj.raid ?? []).filter(r => r.id !== id);
          projects[s.activeProject] = proj;
          return { projects };
        }),

      addDecision: (item) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.decisions = [...(proj.decisions ?? []), { ...item, id: uid() }];
          projects[s.activeProject] = proj;
          return { projects };
        }),

      updateDecision: (id, updates) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.decisions = (proj.decisions ?? []).map(d => d.id === id ? { ...d, ...updates } : d);
          projects[s.activeProject] = proj;
          return { projects };
        }),

      deleteDecision: (id) =>
        set(s => {
          const projects = [...s.projects];
          const proj = { ...projects[s.activeProject] };
          proj.decisions = (proj.decisions ?? []).filter(d => d.id !== id);
          projects[s.activeProject] = proj;
          return { projects };
        }),

      setAmRoster: (people) => set({ amRoster: people }),
      addAmPerson: (person) => set(s => ({ amRoster: [...s.amRoster, person] })),
      removeAmPerson: (id) => set(s => ({ amRoster: s.amRoster.filter(p => p.id !== id) })),

      appendMilestonesToProject: (projectIdx, milestones) =>
        set(s => {
          const projects = [...s.projects];
          projects[projectIdx] = {
            ...projects[projectIdx],
            milestones: [...projects[projectIdx].milestones, ...milestones],
          };
          return { projects };
        }),

      resetToDefaults: () => set({ ...DEFAULT_STATE }),

      setSupabaseId: (idx, id) => set(s => {
        const ids = [...s.supabaseIds];
        ids[idx] = id;
        return { supabaseIds: ids };
      }),

      setProjects: (projects, ids) => set({ projects, supabaseIds: ids, activeProject: 0 }),
    }),
    {
      name: LS_KEY,
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Version check against schema version tag stored separately
          const savedVersion = localStorage.getItem(LS_KEY + '_schema');
          if (savedVersion && savedVersion !== LS_VERSION) {
            // Schema changed — blow away saved state
            Object.assign(state, DEFAULT_STATE);
          } else {
            localStorage.setItem(LS_KEY + '_schema', LS_VERSION);
            migrateState(state);
          }
        }
      },
    }
  )
);

