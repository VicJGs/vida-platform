<!-- Forward spec — Routines ① S9 · Per-Step Build Gate (§XXVI) · the ① TRACK CLOSER · authored before implementation -->
<!-- dueIn / getDueReminders / summary + routines/journal.ts register helpers (shipped, not called — N5), + the S6-homed stale-block drop. -->

# PLAN S9 — Providers + Journal (the ① track closer)

> Slice-map S9: ROU-19 / ROU-20 / ROU-30c / ROU-32 · ledger A23 (`dueIn` · `getDueReminders` · `summary` + the register helpers) and
> A24 (`ProviderEmitFailed`). Inputs homed here: the S6 stale-block drop, the S6 G8 "no double-listing" note, and S7's providers.
> Base: S8 `50459db` (`current-*` → **current**).

## Grounding
- **Surface** — seam `## Provider seam + Journal wiring (S9)`:
  - `dueIn(range)` = scheduled occurrences (→ Global Calendar + Journal agenda);
  - `getDueReminders(range)` = "the `DueProvider.fetch` impl (SS-7 lane)";
  - `summary(date): Promise<SectionData>` = the Journal `/summary` contribution (PULL at render);
  - `registerRoutinesJournal(registry, svc)` and `registerRoutinesDueProvider(sessions, svc)`, mirroring `relationships/journal.ts`.
  RT-13 (`business-rules.md:65-68`): "registers as a provider … `dueIn()` … and a `summary(date)` … Aggregator pattern — no mirroring."
- **Shipped, not called** — N5 (`interpretation.md:76-78`): ① ships the `register*` helpers but does not call them. Composition-root
  wiring is the fe-routines entity close (`golive-replan/process.md §4`).
- **One due lane** (SS-7, "aggregator, never duplicator", `sessions-and-scheduling/business-rules.md:42-45`; the tasks precedent
  `tasks/journal.ts`): due work rides ONE registration, the sessions `DueProvider`. The Journal contribution is **summary-only**: no
  `JournalContribution.dueIn`, which would double-list routines once the agenda reads Sessions.
- **Summary content** — `cross-module-integration.md:26` ("Journals ← Routines: routine completions for a given date — Read — Journal daily
  summary render") and `:69` ("routine completions for the date: action title, completed/skipped, duration"; `routine_actions` = today's
  `routine_step`, D2). RT-5: the partial record is "never discarded and surfaced positively (→ Journal)" (`business-rules.md:30-34`).
- **`ProviderEmitFailed`** (`contract.md:58`; RT-13; BR `:122-123` [G8]): a `dueIn` / `summary` failure is isolated, and the routine and
  sibling providers are unaffected. The sessions aggregator already catches a throwing lane and skips it (SS-7 degrade,
  `sessions/service.ts dueIn`). The journals engine is checked at the step-5 critique.
- **Stale block drop** (homed from S6): "A `planned_block` whose target due-work vanished … resolves to **empty** and is auto-dropped/flagged,
  never a dangling row (SS-7 live-read makes this natural)" (`sessions-and-scheduling/business-rules.md:72-74`). Routines' live read is its
  due lane.

## Scope (v2, g1 folded)
| # | Ledger | Change |
|---|---|---|
| 1 | A23 | **`dueIn(range: TimeRange): Promise<DueItem[]>`** over **active** routines with a rule, for each occurrence D ∈ `[utcDay(range.start), utcDay(range.end)]`, using the **due predicate** below. Item: `{ source_module:'routines', ref_id: \`${routineId}\|${D}\`, label: routine.name, est_minutes: 0, urgency: 0, hard_deadline: UTC midnight of D }`. `hard_deadline` follows the platform date→ms convention (tasks `:777-791`, relationships `:143`, purposes `:891`); estimate and urgency are 0 (no algorithm in M1, as in sessions and relationships). Order is deterministic: (D, routine `sort_order`, id). Isolation is per routine: a routine whose policy or reads throw is skipped and the rest are listed (RT-13 "the routine + siblings unaffected") |
| 2 | A23 | **`getDueReminders(range)`** = `dueIn(range)` (the seam names both: the lane impl), plus the **read-time block drop** (B3), over active routines' live steps: one `listPlannedBlocksForTarget` per step (batched once per call, not per day; not range-scoped). A pending `routines:<D>` block goes to `skipped` iff its occurrence closed **by time**: the window has closed (`addDays(D, w) < today`) or D is done (incl. by reflection). **Never** when it has a running linked session (BR-RT-S6-5, ratified: reuse `runningMakeGood`), and never because of lifecycle (paused/off is reversible, so `classify` reads the current lifecycle). Best-effort; a failure never fails the lane. Idempotent: a second read writes nothing |
| 2b | — | **Write-time block cancel** (the S6 → S8 hand-off S8 never took, absorbed here): `removeStep` → the step's pending blocks `skipped`; `archiveRoutine` → every step's pending blocks `skipped`. Best-effort after the durable write (the BR-RT-S6-6 `cancelBlock` pattern) |
| 3 | A23 | **`summary(date): Promise<SectionData>`** — `sectionKey:'summary'`, `module:'routines'`, `dataPoints` = `[{ id:'completed_today', label:'Completed' }, { id:'skipped_today', label:'Skipped' }]` (§2 `:69` completed/skipped; JR-4 selection; the tasks DATA_POINTS precedent). One item per routine with ledger rows on `date`, **archived routines included** (RT-17 keeps the ledger): `{ routine_id, name, status, policy_source, steps: [{ step_id, title, skipped, skip_reason, duration_minutes }], not_done: RoutineStepRef[] }`. `status` is the S4 evaluation (`done` / `partial` / `not_started`) and `not_done` comes from it (RT-5: "what was done vs not", positively). `skip_reason` follows RT-8 (a logged skip carries a reason). `state` = `'success'` with items, `'empty'` with none. Writes nothing |
| 4 | A23 | **`routines/journal.ts`**: `createRoutinesJournalContribution(svc)` (summary-only, with DATA_POINTS), `registerRoutinesJournal(registry, svc)`, `registerRoutinesDueProvider(sessions, svc)` (`{ module:'routines', fetch: (r) => svc.getDueReminders(r) }`). Imports only the `../journals` and `../sessions` barrels + `./types`. **Not called** (N5) |
| 5 | A24 | **`ProviderEmitFailed` as built:** the journals engine degrades a throwing `summary` to `state:'error'` for that section only (`journals/dashboard.ts:66-74`), and Sessions' `dueIn` skips a throwing lane (SS-7). The `ProviderUnavailable(module)` *flag* (sessions contract `:63`, journals contract `:42`) is **Sessions/Journals-owned and not built**; it is cited, not built here |
| 6 | ROU-32 | **Empty `[E]` seam end-to-end** (slice-map S9 "Confirms the empty `[E]` seam end-to-end"): `name`, `title` and `skip_reason` are `[E]` columns (`schema/routines.ts`). A live-store gate asserts they round-trip as plaintext through `summary` and `dueIn` (M1.0 `encryptedFields: []`); real encryption is homed to M3/DB-5 |

## The due predicate (B1 — rebuilt from ratified S5/S6 logic)
A routine-day D (routine active, D an occurrence) is due iff some step in `stepsAsOf(D)`:
- **D < today:** is make-good-admissible (S6 BR-RT-S6-3: not done on D, not planned-skipped, and the window is undefined or
  `addDays(D, w) ≥ today`) **and** has no pending `routines:<D>` block (the block already lists it in Sessions — SS-7, the S6 G8 note,
  at step grain), **and** the routine is not done on D (`judgeDay`).
- **D = today:** is not done, not planned-skipped, and has no pending block, and the routine is not done today (S5 A2: today is pending).
- **D > today:** is not planned-skipped. There is no reflection judgment on future days: an obligation completed earlier would read
  "done" for every later day (`service.ts:1092-1095`; S5 `judgeOccurrences` caps judging at today for this reason).

So a neutral day (all planned-skipped or no steps), a beyond-window past day and a fully rescheduled day are all not due.

## Rules
- **P1 · Reads are pure, except the lane's drop.** `dueIn` and `summary` write nothing (cross-module-integration §2 `:61`, a read-only view).
  The one read-time write is the drop in `getDueReminders`: the owner's live read realizing "auto-dropped/flagged" (sessions BR `:72-74`).
- **P2 · Lifecycle.** Paused/off routines aren't due (RT-6, S5 A3). Archived routines are excluded from `dueIn` (soft-deleted) but included
  in `summary` (RT-17).
- **P3 · Grain.** A due item is a routine occurrence (a routine-day; seam / RT-13 "scheduled occurrences"). Steps surface in `summary`.
- **As-built lag (recorded):** Sessions' `dueIn` reads its own blocks before the provider lanes, so a block dropped inside the lane still
  shows in that same result and disappears from the next one (`sessions/service.ts:776-800`).
- **Drop status:** `skipped` can't be told apart from a user skip (the BR-RT-S6-6 precedent). Recorded.

## Verification Gate (live store, Node 24; `Date.now` pinned)
1. **dueIn shape + predicate:**
   - a DAILY routine over a 3-day range (past in-window, today, future) → 3 items, `ref_id`, `label`, `hard_deadline` = UTC midnight;
   - a done day → omitted;
   - a beyond-window past day → omitted;
   - a neutral day (all steps planned-skipped) → omitted;
   - `WEEKLY;BYDAY=MO` → Mondays only;
   - paused/off/archived/no-rule → none;
   - deterministic order;
   - a range bound at a UTC-day edge (e.g. 02:30Z = 23:30 BRT) maps by `utcDay`.
2. **Future obligation:** an obligation step completed today → tomorrow is still due.
3. **Rescheduled:** a 1-step routine whose D has a pending block → D omitted, and the block is in `sessions.dueIn`. A 2-step routine with one
   step rescheduled → D still listed.
4. **Drop:**
   - a pending block whose window closed → `skipped`;
   - a block whose D is done by reflection → `skipped`;
   - a block with a **running linked make-good** → untouched (BR-RT-S6-5);
   - a paused routine's block → untouched;
   - a valid block → untouched;
   - a second read writes nothing;
   - a failing drop write never fails the lane;
   - via `sessions.dueIn`: the dropped block is gone on the next call (the lag, as built).
5. **Write-time cancel:** `removeStep` → its pending block `skipped`; `archiveRoutine` → its steps' pending blocks `skipped`.
6. **Isolation:** one routine with a malformed policy → that routine is skipped, another routine is still listed.
7. **summary:**
   - one completed + one skipped step → one item with both steps, `status`, `policy_source` and `not_done`;
   - a skip-only day → `not_started`;
   - an archived routine with rows on the date → included;
   - an idle day → `state:'empty'`, no throw;
   - `[E]` fields round-trip as plaintext.
8. **journal.ts:**
   - `registerRoutinesJournal` → a summary-only contribution (`dueIn` undefined) with DATA_POINTS, and `summary` delegates;
   - a throwing `summary` → `buildDashboard` returns the routines section as `error` while a sibling stays fine;
   - `registerRoutinesDueProvider` → `sessions.dueIn` includes routines items, and a throwing routines lane is skipped;
   - structural: `journal.ts` imports only `../journals`, `../sessions` and `./types`.

Gates: tsc 0 · eslint 0 · routines suite · full `@vida/core` · g2 · /critique · §XXIX.

## ① Track close (B7, process §1/§4, ELC-1/ELC-8) — after S9 commits
1. **slice-map:**
   - S6–S9 → ✅ with commit SHAs, no gates owed;
   - ROU-19/20/30c/32 and A23/A24 closed;
   - Borrowed legs: + the **journals→Sessions agenda bridge** (journals-owned, `journals/contract.md:32`). Until it lands,
     `buildDashboard().agenda` carries no routines (`dashboard.ts:51-54`), as for tasks (`tasks PLAN-S9 :61-63`).
2. **§XXIX `current-*`:** the stale lines (current-spec "NOT a provider yet"; current-BR's "not yet representable" list, where
   `OutsideAcceptanceWindow` was built in S6 and `ProviderEmitFailed` = the as-built isolation).
3. **N5 edge into `.claude/tasks/fe-routines.md` (LIF-197):** the composition-root wiring
   (`createRoutinesService` deps + `registerRoutinesJournal` / `registerRoutinesDueProvider` + `effects`) is that unit's (process §3, "a named
   issue with real edges").
4. **Merge + tracker — outward-facing, so they need Victor's explicit go:** branch `mod-routines` → PR → merge (ELC-1 "① service merged";
   the per-issue branch → PR → merge workflow); then LIF-138 status via `tracker_sync` **from the main checkout**, after the merge
   (tracker_sync from a worktree is unsafe).

## Out of scope (homed)
Calling the register helpers (fe-routines composition root, N5) · `JournalContribution.dueIn` (SS-7, one lane) · the journals→Sessions agenda
bridge (journals) · the `ProviderUnavailable` flag (Sessions/Journals) · urgency/estimate algorithms (M1.2 Scheduler) · notifications (ADR-013).

## g1 critique (folded): REVISE
**7 blocking:**
- B1 due predicate rebuilt from S5/S6;
- B2 a running make-good block is never dropped;
- B3 write-time cancel absorbed + read-time time-based drop + the lag recorded;
- B4 DATA_POINTS;
- B5 `hard_deadline` = UTC midnight;
- B6 `[E]` seam gate;
- B7 track-close obligations.

**Non-blocking, folded:** N1 summary shape · N2 ProviderEmitFailed as built · N3 per-routine isolation · N4 no lifecycle drop · N5 order · N6 gates ·
N7 batching · N8 `skipped` noted.

## Approval 1 — Victor 2026-10-26 ("Approved", v2)

## /preflight — PASSED
- **Frontend:** none (register helpers shipped, not called — N5).
- **Backend:** new service methods `dueIn(range: TimeRange): Promise<DueItem[]>` · `getDueReminders(range)` · `summary(date): Promise<SectionData>`
  (`TimeRange` / `DueItem` from `../sessions`; `SectionData` / `DataPoint` from `../journals`). New module `routines/journal.ts`. Errors: no new
  class (A24 = as-built isolation); `ZodError` for a malformed `summary` date (the module convention).
- **Database:** no schema change.
  - Reads: `routines`, `routine_step`, `routine_completions`; blocks via `sessions.listPlannedBlocksForTarget`.
  - Writes: block status via `sessions.updatePlannedBlock` (read-time drop, write-time cancel).
- **Integration:**
  - routines → sessions (`listPlannedBlocksForTarget`, `updatePlannedBlock`, `findOpenSessionForEntity` via `runningMakeGood`);
  - `journal.ts` → `journals.register` and `sessions.registerDueProvider`.
- **Ground truth:** routines current-* (S8). No conflict.
- **Assumptions (grounded):**
  1. `TimeRange` is Unix ms (`sessions/types.ts:236`); days via `utcDay` (the module `clock()` convention).
  2. The routine order key is `sort_order` (S2c `listRoutines` ordering: sort_order → created_at → id).
  3. `RoutineStepRef` is reused from S4 for `not_done`.

## Implementation plan (§5)
1. **Tests first (red):** VG 1–8 (+ the `[E]` round-trip, the TZ-edge range bound, the journals degrade through `buildDashboard`).
2. **Types/index (green after step 3):**
   - `RoutineDaySummaryItem`;
   - the `dueIn` / `getDueReminders` / `summary` interface members;
   - barrel names checked against `export *` (`createRoutinesJournalContribution` / `registerRoutinesJournal` /
     `registerRoutinesDueProvider` exported from the routines barrel, as tasks does).
3. **Service:**
   - **a. `dueDays(routine, from, to, today, ctx)`** implements the due predicate:
     - reads: steps once (incl. soft-deleted, for `stepsAsOf`); ledger rows over `[from, min(to, today)]` once; blocks once per step;
     - occurrences via `occurrences()`;
     - judgments: `judgeDay` only for D ≤ today; admissibility per S6; future = any step not planned-skipped.
   - **b. `dueIn`:** active, non-archived routines with a rule, in (`sort_order`, `created_at`, id) order. Each routine runs in its own
     try/catch (skipped on a throw). Items are sorted by (D, routine order).
   - **c. `getDueReminders`:** first the drop pass, over active routines' live steps; a block is dropped iff its window closed or D is done, and
     not when `runningMakeGood`; best-effort. Then `dueIn`.
   - **d. Write-time cancel:** `removeStep` and `archiveRoutine` → pending blocks `skipped`, best-effort after the durable delete.
   - **e. `summary(date)`:**
     - parse the date;
     - the ledger rows on `date` (all steps incl. soft-deleted) → their routines (incl. archived, via an unfiltered read);
     - per routine: `judgeDay` (policy read; a throw ⇒ `status` omitted for that routine, never a throw for the section) + the step rows;
     - `state` = `success` / `empty`.

   Gate point: the routines suite green.
4. **`routines/journal.ts`:** contribution (summary-only, DATA_POINTS) + the two register helpers.
5. **Docs:**
   - seam S9 block as-built (+ ProviderEmitFailed as-built);
   - slice-map S9 ✅;
   - `current-*` (§XXIX incl. the stale lines);
   - routines `CLAUDE.md`.
6. **Gates:** tsc · eslint · routines suite · full core · g2 · /critique · §XXIX.
7. **① Track close (B7):**
   - slice-map S6–S9 ✅ with SHAs + borrowed legs;
   - the fe-routines N5 edge;
   - task file close-out;
   - **then ask Victor** for the PR / merge and the tracker update.

## Step-5 critique (folded): REVISE → §5 amendments
**Blocking (3):**
1. **Step order:** `journal.ts` is created in step 3, alongside the service, so step 1's VG8 import resolves; the "routines suite green" gate
   point moves to after step 4.
2. **`ROUTINES_DATA_POINTS`** is declared once in `routines/types.ts` (kept out of the explicit barrel) and imported by both `service.ts`
   (`summary`) and `journal.ts`.
3. **The TZ-edge test is forced** with the tasks `withTz('America/Sao_Paulo', …)` helper. It asserts the zone took effect
   (`new Date(02:30Z).getDate()` is the previous local day), then that the bound maps by `utcDay`.

**Folded into the build:**
- **Drop pass:**
  - its try/catch runs per routine (VG4 + 1 case);
  - per-step block lists are loaded once and passed to `dueDays`, with the in-memory status updated after a drop;
  - the running check uses the loaded block (`b.sub_type` + `findOpenSessionForEntity(...).planned_block_id === b.id`, the BR-RT-S6-5 logic);
  - "D is done" = step-level `isDoneOn` (the `settleBlock` grain).
- **Summary:**
  - its try/catch covers all of `judgeDay`, so `status` / `policy_source` / `not_done` are optional (VG7 + `policyFor` throws → still
    `success`);
  - ordered by (`sort_order`, `created_at`, id) with steps by `bySequence`;
  - rows with a null `routine_id` or a missing routine row are skipped.
- **VG6** uses a policy port keyed by routine id: a malformed policy, a throwing `policyFor`, and a raw-invalidated rule are each isolated.
- **Range guard:** a non-finite bound or `start > end` ⇒ `[]`. The cost is linear in `to − created_at` (recorded; nothing calls it in M1, N5).
- **Logged skip:** a step with a logged skip stays due (BR-RT-S6-3); pinned by a test.
- **Write-time cancel:** filters `isPending(b) && blockDate(b.source) != null`; `archiveRoutine` reuses its `steps` list. `removeStep`
  isn't under the per-step lock, so a racing reschedule could slip a block in (negligible; recorded).
- **D < today block check** uses the **as-of** step set (incl. steps deleted after D).
- **Barrel:** explicit additions (`type RoutineDaySummaryItem` + the three journal helpers). `hard_deadline` =
  `Date.parse(\`${D}T00:00:00Z\`)` inline.
