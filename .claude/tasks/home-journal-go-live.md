# Task: home-journal-go-live
# Status: BUILT + VERIFIED LIVE (uncommitted in worktree; awaiting Victor's commit/PR call)
# Live gate (Brave, real OPFS, :5181 fresh origin): fresh journal opens with NO "Saved" (mount-echo swallowed) →
#   type → "Saved" → reload → persists → reopen no spurious write. Dashboard rail = honest stub (no providers).
# Drift fixed (Victor-directed doc+code check): BR-NEU-5 "mere open never writes" was violated for blank pages —
#   null baseline let the editor mount-echo (BR-E1-2) write an empty doc ("Saved" on an untouched new journal).
#   Pre-existing in shipped #150 useNoteContent (not my change). Fix = `needsBaseline` ref adopts the first emit as
#   the baseline when initialContent==null. TipTap mount verified healthy (immediatelyRender:false, created-once,
#   onChange-via-ref, emitUpdate:false resets) — echo is by-design, app owns dedupe (BR-E1-2). 3 hook tests updated
#   (real baseline) + 1 new blank-page conformance test.
# Green: @vida/core notes 33/33 · web home 31/31 + hook 5/5 · tsc 0 (core+web) · eslint 0 all changed files.
# Worktree: .claude/worktrees/home-journal-go-live (branch home-journal-go-live off main @ 6e882b7, Node 24)
# Gates: PLAN /critique REVISE→folded → Approval 1 ✓ · doc-check resolved create-timing (ensureJournal/NP-8) ·
#        IMPL-PLAN /critique REVISE→folded → Approval 2 ✓
# Build: @vida/core ensureJournal (33/33 core notes tests) · apps/web hook+region · home 31/31 · tsc 0 · eslint 0
# Dep: PR #150 admin-merged to main first (writePageContent/useNoteContent now on main)
# Created: 2026-10-20
# Profile: Add Frontend Component
# Scenario: Default (Entity Delivery Flow ②)
# Milestone: M1 — per-module usability (module-go-lives queue, item #1)
# Pattern: notes-entity-usability (PR #150) — the worked precedent

## Goal
Make the Home journal **entry** usable: land on `/`, write today's journal in a live editor,
persist to the local OPFS DB, reload → it's there. The first item of the approved go-live queue
(`.claude/tasks/module-go-lives.md`).

## Triage finding (Step 0 baseline — grounded, corrects the queue one-liner)
- The `journals` service is the **aggregation ENGINE** (builds a dashboard from registered module
  `summary`/`dueIn` providers) — `[FACT: services/journals/types.ts:JournalContribution]`. In
  `composition-root.ts` the `journalRegistry` has **zero providers registered** → `buildDashboard`
  returns empty. So the **Dashboard** (`useHomeWidgets`) can NOT light up now; it stays the honest stub.
- The editable journal **entry** rides **NotesService**, not journals — `[FACT: home/CLAUDE.md "the
  journal pages row + TipTap entry → Notes & Pages (owns them)"]`. NotesService already has the API:
  `getPageByJournalDate(date)`, `createPage({type:'journal', journal_date})` (+ `JournalPageExistsError`
  uniqueness), `writePageContent(id, doc)` — `[FACT: services/notes/types.ts:58-64]`. `PageType` ⊇ `'journal'`.
- ⇒ The go-live = **live journal entry via NotesService**, reusing the notes pattern. Dashboard + inline
  integration-block node-views stay fenced-out (future module go-lives / #31).

## Scope (doc-resolved cut)
- IN: today's journal `pages` row (get-or-create) + live `<VidaEditor>` + debounced persistence.
- OUT: Dashboard aggregation (no providers) · inline integration blocks (`/summary` node-views, #31) ·
  multi-device CRDT merge (M4) · `[E]` encryption (M3) · FTS5 search (DB-8).

## Dependencies
- Blocked by: none (data-plane-wiring PR #148 merged; composition-root live; notes pattern shipped).

## Open questions
- ~~Create-timing~~ — RESOLVED by convention (doc-check): idempotent get-or-create-on-access, placed IN-SERVICE
  as `NotesService.ensureJournal(date)` mirroring `ensureEntityNote` (NP-8) `[FACT: services/notes/service.ts:163-183]`.
  Not an A/B call. Journal-per-date with a valid blank state (journals/identity.md:54).
