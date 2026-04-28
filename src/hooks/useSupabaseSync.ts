import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useProjectStore } from '../store/useProjectStore';
import type { Project, Milestone, Task, Subtask, RaidItem, DecisionItem } from '../store/types';

const DEBOUNCE_MS = 800;

// ── Reconstruct a Project from a Supabase row with nested relations ──────────
function rowToProject(row: Record<string, unknown>): Project {
  const milestones: Milestone[] = ((row.milestones as Record<string, unknown>[]) ?? [])
    .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
    .map(m => ({
      id:          m.id as string,
      title:       m.title as string,
      workstream:  m.workstream as string,
      status:      m.status as Milestone['status'],
      owners:      (m.owners as string[]) ?? [],
      dueDate:     m.due_date as string,
      note:        m.note as string,
      noteExport:  m.note_export as boolean,
      tasks: ((m.tasks as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map(t => ({
          id:           t.id as string,
          text:         t.text as string,
          done:         t.done as boolean,
          startDate:    t.start_date as string,
          endDate:      t.end_date as string,
          note:         t.note as string,
          owners:       (t.owners as string[]) ?? [],
          predecessors: (t.predecessors as string[]) ?? [],
          subtasks: ((t.subtasks as Record<string, unknown>[]) ?? [])
            .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
            .map(st => ({
              id:        st.id as string,
              text:      st.text as string,
              done:      st.done as boolean,
              owners:    (st.owners as string[]) ?? [],
              startDate: st.start_date as string,
              endDate:   st.end_date as string,
            } as Subtask)),
        } as Task)),
      impact: ((m.impact_items as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map(i => ({
          type:      i.type as string,
          projected: i.projected as string,
          realized:  i.realized as string,
        })),
    }));

  return {
    config: {
      clientName:       row.client_name as string,
      ehr:              row.ehr as Project['config']['ehr'],
      ehrCustom:        row.ehr_custom as string,
      engagementType:   row.engagement_type as Project['config']['engagementType'],
      projectStatus:    row.project_status as Project['config']['projectStatus'],
      startDate:        row.start_date as string,
      managingDirector: row.managing_director as string,
      lead:             row.lead as string,
      payers:           (row.payers as string[]) ?? [],
      denials:          (row.denials as string[]) ?? [],
      clientRoster:     (row.client_roster as Record<string, unknown>[]) ?? [],
      roles: ((row.roles as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map(r => ({ key: r.role_key as string, clientRole: r.client_role as string })),
      workstreams: ((row.workstreams as Record<string, unknown>[]) ?? [])
        .sort((a, b) => (a.sort_order as number) - (b.sort_order as number))
        .map(ws => ({
          id:         ws.ws_key as string,
          label:      ws.label as string,
          color:      ws.color as Project['config']['workstreams'][0]['color'],
          amOwner:    ws.am_owner as string,
          note:       ws.note as string,
          noteExport: ws.note_export as boolean,
        })),
    },
    milestones,
    activeFilter:       (row.active_filter as string) || 'all',
    activeRaidTab:      (row.active_raid_tab as Project['activeRaidTab']) || 'all',
    tasksFilterWs:      (row.tasks_filter_ws as string) || 'all',
    tasksFilterStatus:  (row.tasks_filter_status as Project['tasksFilterStatus']) || 'all',
    raid: ((row.raid_items as Record<string, unknown>[]) ?? []).map(r => ({
      id:          r.id as string,
      type:        r.type as RaidItem['type'],
      priority:    r.priority as RaidItem['priority'],
      title:       r.title as string,
      description: r.description as string,
      mitigation:  r.mitigation as string,
      owner:       r.owner as string,
      dueDate:     r.due_date as string,
      status:      r.status as RaidItem['status'],
      linkedTasks: (r.linked_tasks as string[]) ?? [],
    })),
    decisions: ((row.decisions as Record<string, unknown>[]) ?? []).map(d => ({
      id:           d.id as string,
      title:        d.title as string,
      description:  d.description as string,
      rationale:    d.rationale as string,
      alternatives: d.alternatives as string,
      owner:        d.owner as string,
      date:         d.date as string,
      status:       d.status as DecisionItem['status'],
      linkedTasks:  (d.linked_tasks as string[]) ?? [],
    })),
  };
}

// ── Save one project to all normalized tables ────────────────────────────────
async function saveProject(proj: Project, sbId: string | undefined, idx: number) {
  const cfg = proj.config;

  // 1. Upsert project row
  let projectId = sbId;
  if (!projectId) {
    const { data, error } = await supabase
      .from('projects')
      .insert({
        name: cfg.clientName,
        client_name: cfg.clientName,
        ehr: cfg.ehr,
        ehr_custom: cfg.ehrCustom,
        engagement_type: cfg.engagementType,
        project_status: cfg.projectStatus,
        start_date: cfg.startDate,
        managing_director: cfg.managingDirector,
        lead: cfg.lead,
        payers: cfg.payers,
        denials: cfg.denials,
        client_roster: cfg.clientRoster ?? [],
        active_filter: proj.activeFilter,
        active_raid_tab: proj.activeRaidTab,
        tasks_filter_ws: proj.tasksFilterWs,
        tasks_filter_status: proj.tasksFilterStatus,
      })
      .select('id')
      .single();
    if (error) { console.error('Project insert error:', error); return; }
    projectId = data.id as string;
    useProjectStore.getState().setSupabaseId(idx, projectId);
  } else {
    const { error } = await supabase
      .from('projects')
      .update({
        name: cfg.clientName,
        client_name: cfg.clientName,
        ehr: cfg.ehr,
        ehr_custom: cfg.ehrCustom,
        engagement_type: cfg.engagementType,
        project_status: cfg.projectStatus,
        start_date: cfg.startDate,
        managing_director: cfg.managingDirector,
        lead: cfg.lead,
        payers: cfg.payers,
        denials: cfg.denials,
        client_roster: cfg.clientRoster ?? [],
        active_filter: proj.activeFilter,
        active_raid_tab: proj.activeRaidTab,
        tasks_filter_ws: proj.tasksFilterWs,
        tasks_filter_status: proj.tasksFilterStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId);
    if (error) { console.error('Project update error:', error); return; }
  }

  // 2. Delete existing children — milestones cascade to tasks/subtasks/impact_items
  await Promise.all([
    supabase.from('milestones').delete().eq('project_id', projectId),
    supabase.from('raid_items').delete().eq('project_id', projectId),
    supabase.from('decisions').delete().eq('project_id', projectId),
    supabase.from('workstreams').delete().eq('project_id', projectId),
    supabase.from('roles').delete().eq('project_id', projectId),
  ]);

  // 3. Insert workstreams and roles
  const inserts: Promise<unknown>[] = [];

  if (cfg.workstreams.length > 0) {
    inserts.push(supabase.from('workstreams').insert(
      cfg.workstreams.map((ws, i) => ({
        project_id:  projectId,
        ws_key:      ws.id,
        label:       ws.label,
        color:       ws.color,
        am_owner:    ws.amOwner,
        note:        ws.note ?? '',
        note_export: ws.noteExport ?? false,
        sort_order:  i,
      }))
    ));
  }

  if (cfg.roles.length > 0) {
    inserts.push(supabase.from('roles').insert(
      cfg.roles.map((r, i) => ({
        project_id:  projectId,
        role_key:    r.key,
        client_role: r.clientRole,
        sort_order:  i,
      }))
    ));
  }

  await Promise.all(inserts);

  // 4. Insert milestones, then tasks/subtasks/impact in sequence
  if (proj.milestones.length > 0) {
    const { error: msErr } = await supabase.from('milestones').insert(
      proj.milestones.map((m, i) => ({
        id:          m.id,
        project_id:  projectId,
        workstream:  m.workstream,
        title:       m.title,
        status:      m.status,
        owners:      m.owners ?? [],
        due_date:    m.dueDate,
        note:        m.note,
        note_export: m.noteExport,
        sort_order:  i,
      }))
    );
    if (msErr) { console.error('Milestones insert error:', msErr); return; }

    const allTasks = proj.milestones.flatMap((m) =>
      m.tasks.map((t, ti) => ({
        id:           t.id,
        project_id:   projectId,
        milestone_id: m.id,
        text:         t.text,
        done:         t.done,
        start_date:   t.startDate,
        end_date:     t.endDate,
        note:         t.note,
        owners:       t.owners ?? [],
        predecessors: t.predecessors ?? [],
        sort_order:   ti,
      }))
    );
    if (allTasks.length > 0) {
      const { error: tErr } = await supabase.from('tasks').insert(allTasks);
      if (tErr) { console.error('Tasks insert error:', tErr); return; }
    }

    const allSubtasks = proj.milestones.flatMap(m =>
      m.tasks.flatMap(t =>
        (t.subtasks ?? []).map((st, si) => ({
          id:         st.id,
          project_id: projectId,
          task_id:    t.id,
          text:       st.text,
          done:       st.done,
          owners:     st.owners ?? [],
          start_date: st.startDate,
          end_date:   st.endDate,
          sort_order: si,
        }))
      )
    );
    if (allSubtasks.length > 0) {
      const { error: stErr } = await supabase.from('subtasks').insert(allSubtasks);
      if (stErr) console.error('Subtasks insert error:', stErr);
    }

    const allImpact = proj.milestones.flatMap(m =>
      (m.impact ?? []).map((imp, i) => ({
        project_id:   projectId,
        milestone_id: m.id,
        type:         imp.type,
        projected:    imp.projected,
        realized:     imp.realized,
        sort_order:   i,
      }))
    );
    if (allImpact.length > 0) {
      const { error: impErr } = await supabase.from('impact_items').insert(allImpact);
      if (impErr) console.error('Impact items insert error:', impErr);
    }
  }

  // 5. Insert RAID items and decisions
  const tail: Promise<unknown>[] = [];

  if (proj.raid.length > 0) {
    tail.push(supabase.from('raid_items').insert(
      proj.raid.map(r => ({
        id:           r.id,
        project_id:   projectId,
        type:         r.type,
        priority:     r.priority,
        title:        r.title,
        description:  r.description,
        mitigation:   r.mitigation,
        owner:        r.owner,
        due_date:     r.dueDate,
        status:       r.status,
        linked_tasks: r.linkedTasks ?? [],
      }))
    ));
  }

  if (proj.decisions.length > 0) {
    tail.push(supabase.from('decisions').insert(
      proj.decisions.map(d => ({
        id:           d.id,
        project_id:   projectId,
        title:        d.title,
        description:  d.description,
        rationale:    d.rationale,
        alternatives: d.alternatives,
        owner:        d.owner,
        date:         d.date,
        status:       d.status,
        linked_tasks: d.linkedTasks ?? [],
      }))
    ));
  }

  await Promise.all(tail);
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useSupabaseSync(user: User | null) {
  const store       = useProjectStore();
  const saveTimers  = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const savingSet   = useRef<Set<number>>(new Set());
  const isHydrating = useRef(false);
  const initialized = useRef(false);

  // ── Load all projects with nested data on sign-in ────────────────────────
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    (async () => {
      isHydrating.current = true;

      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          workstreams(*),
          roles(*),
          milestones(*, tasks(*, subtasks(*)), impact_items(*)),
          raid_items(*),
          decisions(*)
        `)
        .order('created_at', { ascending: true });

      if (error) { console.error('Supabase load error:', error); isHydrating.current = false; return; }

      if (data && data.length > 0) {
        const projects = (data as Record<string, unknown>[]).map(rowToProject);
        const ids      = (data as Record<string, unknown>[]).map(r => r.id as string);
        store.setProjects(projects, ids);
      } else {
        // First login — migrate local projects to Supabase.
        // Keep isHydrating = true for the entire migration loop so the save
        // subscriber cannot race-write stale data when setSupabaseId fires.
        const localProjects = useProjectStore.getState().projects;
        for (let i = 0; i < localProjects.length; i++) {
          await saveProject(localProjects[i], undefined, i);
        }
        isHydrating.current = false;
        return;
      }

      setTimeout(() => { isHydrating.current = false; }, 0);
    })();
  }, [user]);

  // ── Reset on sign-out ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) initialized.current = false;
  }, [user]);

  // ── Debounced save on store changes ──────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const unsub = useProjectStore.subscribe(async (state, prev) => {
      if (isHydrating.current) return;

      // Detect deleted projects — supabaseIds shrinks when deleteProject runs
      if (state.supabaseIds.length < prev.supabaseIds.length) {
        const removedId = prev.supabaseIds.filter(Boolean).find(id => !state.supabaseIds.includes(id));
        if (removedId) {
          supabase.from('projects').delete().eq('id', removedId).then(({ error }) => {
            if (error) console.error('Project delete error:', error);
          });
        }
        return;
      }

      state.projects.forEach((proj, idx) => {
        if (proj === prev.projects[idx]) return;

        // Capture the project's stable identity so we can detect if it was
        // deleted or index-shifted before the debounce timer fires.
        const capturedProjectId = proj.config.clientName + '_' + idx;
        const capturedSupabaseId = state.supabaseIds[idx];

        clearTimeout(saveTimers.current[idx]);
        saveTimers.current[idx] = setTimeout(async () => {
          // Re-read live state — the captured closure is stale by DEBOUNCE_MS.
          const live = useProjectStore.getState();

          // Bail if the project at this index was deleted or replaced since capture.
          // A shorter projects array or a different supabaseId means the index shifted.
          if (live.projects.length <= idx) return;
          const liveSupabaseId = live.supabaseIds[idx];
          // If capturedSupabaseId was non-empty and now points to a different UUID,
          // the slot was reused — do not overwrite the new project with stale data.
          if (capturedSupabaseId && liveSupabaseId && liveSupabaseId !== capturedSupabaseId) return;

          // Skip if a save for this index is already in flight — prevents
          // duplicate inserts when supabaseIds[idx] hasn't been set yet
          if (savingSet.current.has(idx)) return;
          savingSet.current.add(idx);
          try {
            // Always use live state for the actual save to avoid stale data writes.
            await saveProject(live.projects[idx], liveSupabaseId, idx);
          } finally {
            savingSet.current.delete(idx);
          }
        }, DEBOUNCE_MS);
      });
    });

    return () => {
      unsub();
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, [user]);
}
