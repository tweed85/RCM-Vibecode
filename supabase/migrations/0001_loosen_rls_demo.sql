-- Demo-mode RLS: every authenticated user can read and write every row.
-- Run in the Supabase SQL Editor.
-- Re-tighten before this is used for real client engagements (replace with
-- a project_members membership model — see useSupabaseSync.ts comments).

DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'projects',
    'milestones',
    'tasks',
    'subtasks',
    'raid_items',
    'decisions',
    'workstreams',
    'roles',
    'impact_items'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Ensure RLS is on (it should already be, but be explicit)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Drop every existing policy on this table so we don't stack a new
    -- permissive policy on top of the old per-user ones.
    FOR p IN
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;

    -- One blanket policy: any signed-in user can do anything.
    EXECUTE format(
      'CREATE POLICY "demo_authenticated_full_access" ON public.%I '
      'FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;
