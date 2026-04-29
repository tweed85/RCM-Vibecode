# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Meridian — a React 18 / TypeScript / Vite / Zustand SPA used as an internal project-management tool for A&M Healthcare RCM (Revenue Cycle Management) consulting engagements. Backend is Supabase (PostgREST + Auth + RLS).

## Commands

```bash
npm run dev      # Vite dev server on port 5173
npm run build    # tsc (typecheck) then vite build
npm run preview  # serve the built bundle
```

There is no test runner, linter, or formatter configured. `npm run build` is the only verification step — its `tsc` pass catches type errors.

## Environment

`.env.local` (gitignored) is required for any Supabase work:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Vite is configured to accept `.devtunnels.ms` hosts so the dev server works through VS Code dev tunnels (see `vite.config.ts`).

## Architecture

### Dual persistence: localStorage + Supabase

State lives in **two places simultaneously**:

1. **Zustand store** (`src/store/useProjectStore.ts`) — single god-object holding all CRUD actions. Auto-persisted to `localStorage` under key `meridian_state` via Zustand `persist` middleware.
2. **Supabase** (`src/hooks/useSupabaseSync.ts`) — normalized tables (projects, milestones, tasks, subtasks, raid_items, decisions, workstreams, roles, impact_items). Synced via a debounced (800ms) subscriber.

The store is authoritative in-memory; Supabase is the durable cross-device backup. On login, Supabase data overwrites localStorage via `setProjects()`.

### Parallel array invariant: `projects` and `supabaseIds`

`AppState.projects: Project[]` and `AppState.supabaseIds: string[]` are **index-aligned**. `supabaseIds[i]` is the Supabase UUID for `projects[i]`. A new unsaved project gets an empty string placeholder. **Any mutation that adds, removes, or reorders projects must update both arrays in lockstep** — `addProject`, `deleteProject`, and `setProjects` already do this.

### The Supabase sync loop (critical timing)

`useSupabaseSync.ts` does three things:

1. **Initial load** (on user sign-in): an async IIFE that sets `isHydrating.current = true` **before its first `await`**, queries Supabase, calls `setProjects()`, then defers the flag to false via `setTimeout(0)`. The flag must be set synchronously before any await so the subscriber can never see `isHydrating === false` during hydration. If you change this function, preserve that ordering.

2. **Save subscriber**: detects project mutations and writes to Supabase. Uses delete-and-reinsert for nested milestones/tasks/subtasks (cascades via DB foreign keys). Guarded by `savingSet` ref to prevent duplicate inserts when `supabaseIds[idx]` is still empty.

3. **Delete detection**: when `supabaseIds.length` shrinks, finds the removed UUID and issues a `DELETE` on `projects` (cascade handles children).

### Schema migrations

`src/utils/migration.ts` runs on every rehydrate from localStorage to upgrade older saved schemas in-place (e.g. singular `owner` → plural `owners: string[]`). For breaking changes, bump `LS_VERSION` in `src/constants/enums.ts` — the rehydrate hook in the store wipes localStorage when the schema tag mismatches.

### WBS numbering is positional

Milestones, tasks, and subtasks have **no stored sequence number**. WBS labels like `1.2.3` are computed from array index via `getWbs(mIdx, tIdx, sIdx)` in `src/utils/wbs.ts`. The order in the array IS the WBS order. `sort_order` columns in Supabase are populated from array index at save time and used to restore order on load.

### Owner field shape

Milestones, tasks, and subtasks use `owners: string[]` (multi-assignee). RAID items and decisions still use singular `owner: string`. Don't conflate the two when adding new features.

### Routing

All routes are declared in `src/App.tsx`. The auth gate is at the top of `App` — without a Supabase session, only `AuthScreen` renders. With a session, `useSupabaseSync(user)` is invoked and the routed app shell renders.

### Component layout

- `components/dashboard/` — milestone cards, metrics, impact summary
- `components/tasks/` — TasksView (grouped by milestone), TaskRow, SubtaskRow, TaskDetail
- `components/timeline/` — Gantt-style milestone timeline
- `components/raid/`, `components/decisions/` — RAID log, decision log
- `components/milestones/` — AddMilestone form + ProjectModal + ImportModal (XLSX import)
- `components/config/` — EngagementConfig (workstreams, roster, project metadata)
- `components/shared/` — small reusable bits (badges, ProgressBar, OwnerSelect, ConfirmButton)
- `components/layout/` — Topbar, Sidebar, Toast, SaveIndicator

Styling is CSS Modules (`*.module.css`) with shared design tokens in CSS custom properties (`var(--text)`, `var(--surface)`, etc.) defined globally.

### XLSX import (Smartsheet format)

`src/utils/importXlsx.ts` does a **two-pass parse**: first pass numbers every non-blank row to match Smartsheet row references; second pass resolves predecessor strings like `"3FS"` to task UUIDs via the row-to-UUID map built in pass one. If you change the import, preserve this two-pass structure.

## Conventions

- **No comments unless the why is non-obvious** — well-named identifiers carry the load
- **Prefer editing existing files** over creating new ones
- **Inline styles are common** for one-off layout tweaks; CSS modules are used for anything that needs reuse, hover/active states, or media queries
- **`uid()` from `src/utils/uid.ts`** generates IDs for new entities — never use `Math.random()` directly
- **No client-side validation of Supabase IDs** — trust the DB and rely on RLS
