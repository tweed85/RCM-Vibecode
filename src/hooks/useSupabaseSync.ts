import { useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useProjectStore } from '../store/useProjectStore';
import type { Project } from '../store/types';

const DEBOUNCE_MS = 800;

export function useSupabaseSync(user: User | null) {
  const store       = useProjectStore();
  const saveTimers  = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
  const initialized = useRef(false);

  // ── Load projects from Supabase on sign-in ───────────────────────────────
  useEffect(() => {
    if (!user || initialized.current) return;
    initialized.current = true;

    (async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, data, updated_at')
        .order('created_at', { ascending: true });

      if (error) { console.error('Supabase load error:', error); return; }

      if (data && data.length > 0) {
        // Supabase has projects — use them
        const projects = data.map(row => row.data as Project);
        const ids      = data.map(row => row.id as string);
        store.setProjects(projects, ids);
      } else {
        // No Supabase projects yet — push local projects up
        const localProjects = useProjectStore.getState().projects;
        const newIds: string[] = [];
        for (const proj of localProjects) {
          const { data: row, error: err } = await supabase
            .from('projects')
            .insert({ name: proj.config.clientName, data: proj })
            .select('id')
            .single();
          if (err) { console.error('Supabase insert error:', err); newIds.push(''); }
          else newIds.push(row.id);
        }
        newIds.forEach((id, i) => store.setSupabaseId(i, id));
      }
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
      state.projects.forEach((proj, idx) => {
        if (proj === prev.projects[idx]) return; // unchanged

        const sbId = state.supabaseIds[idx];
        clearTimeout(saveTimers.current[idx]);

        saveTimers.current[idx] = setTimeout(async () => {
          if (!sbId) {
            // New project — insert
            const { data, error } = await supabase
              .from('projects')
              .insert({ name: proj.config.clientName, data: proj })
              .select('id')
              .single();
            if (error) { console.error('Supabase insert error:', error); return; }
            useProjectStore.getState().setSupabaseId(idx, data.id);
          } else {
            // Existing project — update
            const { error } = await supabase
              .from('projects')
              .update({ name: proj.config.clientName, data: proj })
              .eq('id', sbId);
            if (error) console.error('Supabase save error:', error);
          }
        }, DEBOUNCE_MS);
      });
    });

    return () => {
      unsub();
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, [user]);

  // ── Real-time: receive changes from other users ──────────────────────────
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('projects-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'projects' },
        (payload) => {
          const state = useProjectStore.getState();
          const idx = state.supabaseIds.indexOf(payload.new.id as string);
          if (idx === -1) return; // not our project

          // Don't overwrite if we just saved (our own echo)
          if (saveTimers.current[idx]) return;

          state.replaceProject(idx, payload.new.data as Project);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);
}
