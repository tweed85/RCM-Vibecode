---
description: Run the Meridian four-perspective review team (UI, UX, Technical, Devil's Advocate) in parallel worktrees and aggregate findings.
argument-hint: [optional scope, e.g. "tasks view" or "import flow" — defaults to whole app]
---

You are orchestrating the Meridian review team. Scope for this run: **$ARGUMENTS** (if empty, review the whole app).

## Step 1 — Launch all four agents in parallel

In a **single assistant message**, make four `Agent` tool calls (one block, four invocations) so they run concurrently. Each agent must run with `isolation: "worktree"` so the four cannot collide on the same files.

Substitute the actual scope into each prompt where it says `<scope>`. If `$ARGUMENTS` is empty, replace `<scope>` with `whole app`.

1. `meridian-ui-reviewer`, `isolation: "worktree"`
   prompt: "Review the UI of <scope>. Follow your agent instructions: produce the structured findings report first, then apply fixes for [critical] and [high] only inside this worktree. Run `npm run build` after edits and revert any change that breaks tsc."

2. `meridian-ux-reviewer`, `isolation: "worktree"`
   prompt: "Review the UX and accessibility of <scope>. Follow your agent instructions: report first, then fixes for [critical] and [high] only. Run `npm run build` after edits."

3. `meridian-technical-reviewer`, `isolation: "worktree"`
   prompt: "Review the technical correctness of <scope>. Follow your agent instructions: quote source lines in findings, fix [critical] and [high] only. Run `npm run build` after each edit and a final clean build at the end."

4. `meridian-devils-advocate`, `isolation: "worktree"`
   prompt: "Adversarially review <scope>. Follow your agent instructions: every finding needs a reproduction sequence; apply defensive fixes for [critical] and [high] only. Run `npm run build` after edits."

Do not run them sequentially. Do not skip the `isolation: "worktree"` parameter on any of them.

## Step 2 — Aggregate

After all four reports return, produce a consolidated findings document with these sections:

### Executive summary
3–5 sentences. Lead with the highest-severity finding across all four reports.

### Cross-cutting themes
Findings that appear in two or more reports (e.g. the modal-width problem may surface in both UI and UX; the dual-array invariant may surface in both Technical and Devil's Advocate). These are the highest-leverage fixes. List each theme once with the contributing reviewer perspectives.

### Findings by severity
Single merged list across all reviewers, sorted: critical → high → medium → low → nit. Each entry: `[severity] [reviewer] file:line — description`. Deduplicate items that are clearly the same issue noted by multiple reviewers; keep the most specific `file:line` and note the additional perspectives in parentheses.

### Findings by reviewer
The four full reports, verbatim, under H3 headings: `### UI`, `### UX`, `### Technical`, `### Devil's Advocate`. Preserve them so the user can read each perspective independently.

### Fixes applied (worktrees)
Table:

| Reviewer | Worktree path | Branch | Files touched | Severity addressed |
|---|---|---|---|---|

Pull the worktree path/branch from each agent's tool result. List "(none)" for any reviewer whose findings stayed at medium/below.

**Do not merge any worktree.** The user reviews each one individually and merges (or discards) per worktree.

### Suggested triage order
A short numbered list of the top 5–7 items to address first, ordered by severity then by leverage (cross-cutting findings outrank single-perspective findings of the same severity).

### Next steps for the user

For each worktree the user wants to keep:
```bash
git diff main..<branch>            # review changes
git -C <worktree-path> npm run build  # confirm clean build
git merge <branch>                 # merge into main if approved
```

For worktrees the user wants to discard:
```bash
git worktree remove <worktree-path>
git branch -D <branch>
```

## Constraints

- Do **not** apply any fix yourself outside of what the agents do in their worktrees. The orchestrator only aggregates.
- Do **not** edit any files in the main worktree.
- Do **not** merge any agent worktree automatically.
- If any subagent fails or returns nothing, note it in the executive summary and continue with the others.
