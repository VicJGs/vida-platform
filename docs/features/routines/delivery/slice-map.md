<!-- Slice Map — features/routines · Entity Delivery Flow ① · Step 2 Decomposition Gate -->
<!-- Each slice tagged backend|frontend|shared. ① = backend (this task). ② UI = P6 (separate). -->
<!-- Ratifies the interpretation.md §3 preview against ROU-01…33 coverage. -->

# Slice Map — Routines (① backend)

> **▶ RE-SCOPED (entity-rescope, 2026-10-21) — APPROVED by Victor at the Re-scope Gate (2026-10-21).** The 2026-10-14 decomposition (S1–S9,
> D1–D3) stands. This revision folds in the reconciliation ledger (`delivery/reconciliation.md`): the as-built work (2026-10-13,
> superseded 8-slice plan) covers governing **S1 + S2**, and the ❌/📄/🕳 rows become a conformance slice (**S2c**) plus amendments
> to S3–S9. *Original pause banner:* paused 2026-10-14 pending `mod-tasks`. That condition was met when mod-tasks merged
> (PR #145, 2026-10-20).

> **Scope:** the `@vida/core` RoutineService tier over the BUILT schema (migration 018, 3 tables). **As-built S1–S3 exist**
> (`services/routines/*`). **Out of scope (② UI / P6, ADR-020):** today-list grouping chrome, per-step live-entity render,
> standalone-page analytics render, drag-reorder chrome, the alarm/timeframe surface, **and composition-root registration**
> (the routines ENTITY closes with fe-routines #104, golive process §4). `[FACT: backend-intent/parts/routines.md:5]`
> **Envision Gate:** N/A (pure backend; stated in interpretation §6).

## Gate decisions (carried from interpretation.md §5 — Victor approves)
- **D1** — RESOLVED (Victor, 2026-10-14): **build Tasks (#65) first**, then resume routines with a **required** `tasks: TasksService`
  dep (not a deny-safe port). Routines paused; see banner above. `[DECISION: Victor 2026-10-14]`
- **D2** — register `'routine'` + `'routine_step'` into the TaggableTypeRegistry; notes/pages/links target = `routine_step`
  (+ `routine` group-level); retire the pre-reframe `routine_action` token. `[FACT: _registry.ts:46]`
- **D3** — two-seam completion: a **step** completion drives the entity (fires ITS effects); the **routine-level** policy-`done`
  emits the routine's `award_xp` + `contribute_purpose_metric`; streak exposed as a READ seam (no advertise).

## Factory (re-scoped; reconciled at Step 4, interpretation N3)
`createRoutinesService(deps): RoutinesService`. `deps = { db, deviceId, clock?, tasks: TasksService, registry: TaggableTypeRegistry,
sessions: SessionsService, spaces: SpacesService, notes: NotesService, habits?: HabitsService, effects?: { rail, registry },
prefs?: RoutinesPrefsPort }`.
- **Required** (as approved 2026-10-14): `spaces`, `notes`, `registry`, `sessions`, plus **`tasks` (D1)**. `registry` validates
  `entity_type` (R2); registration itself is already seeded.
- **Optional:** `habits`, `effects` (producer guard, N8), `prefs` (the user's policy; absent ⇒ `policy_source:'undefined'`, S4).
- **Dropped:** `measurementSources` (rule 12) and the `TasksPort` (D1).
- Each dep lands in the slice that first consumes it.

## Slices (all `backend`; each runs the full §XXVI gate and closes with the per-slice live-store Verification Gate)

| # | Slice | Status | ROU · ledger rows | Scope |
|---|-------|--------|-------------------|-------|
| **S1** | Foundation: routine + step CRUD, DB-11 reconcile, registration | ✅ **built** (as-built S1+S2, `cb9ee27`/`c768132`) | 01–06,14,29,33 · A1,A3–A5,A7,A9,A13,A14,B4–B7,B10 | gated under the 2026-10-13 plan; yardstick unchanged → no re-gate (ledger E1). `setLifecycle` (ROU-17) moved to S2c |
| **S2** | Completion ledger + skip mechanics | ✅ **built** (as-built S3, `2b26e2a`) | 08(ledger),09,31 · A17,A18,B8,B9,B14 | skip split + edit/delete/list completions = the grounded §XXVIII deviation → seam back-filled (D7) |
| **S2c** | **Floor conformance (fixes to S1/S2 scope)** | ✅ built (`94dc798`) | 17,29 · A6,A8,A10,A11,A12,B1,B2,B3,B16,D2–D5,D8 | `setLifecycle` (A6) · `entity_type` validated via `registry` (A10; adds the dep) · YYYY-MM-DD date validation for `date`/`skip_dates` (B1, projects `CalendarDateSchema` precedent) · `progress` int 0–100 (B2) · RRULE parse-validated at write via `ical.js` (B3) · non-empty `name`/`title` (B16) · `listRoutines` sorted by `sort_order` (A8) · `addStep` appends (max+1) (A11) · `reorderSteps` returns the steps (A12) · back-fill stale comments, test titles, layer `CLAUDE.md`, introspection note (D2–D5, D8) |
| **S3** | **Run/drive: the RT-3 composition core** (keystone) | ✅ built (S3) | 07,08(drive),11,30a · **A15, A16**, A24(EntityUnavailable), B11, C4, C6 | `runStep` + `completeStep` drive-then-stamp (N7). Drives `tasks.completeTask` (**required dep, D1**), `habits.logCompletion(date)`, focus via `startFocus({})` + attach / `completeFocus` + detach (N9, never `completeSession`; S3-amended). Drive-error map (interp §1b). `EntityUnavailable` for missing entity / unshipped sub-type (R5). Reuse `utcDay` (B11). **PLAN must pin interp rules 22 (task step in a recurring routine) + 23 (habit tick vs done); a Victor call only if the docs don't settle them** |
| **S4** | Policy evaluation | ✅ built (S4) | 12,24,30b · A20 | `evaluateRoutine(id, {date?})`: derive-on-read over the as-of-date step set; done = the routine's occurrence row OR the driven entity done as of D (reflection only adds); planned skip neutral; the USER's policy via `prefs?: RoutinesPrefsPort` (no routines-side default: the shipped default = Spaces templates/presets SP5, `docs/intake/spaces.md:183-185`); no policy ⇒ only all-done/none-done judged, `policy_source:'undefined'` flagged; partial always returned |
| **S5** | Progress + analytics | ✅ built (S5) | 13,15,16,18 · A21,A22 | `progress()` via `resolveProgress` (0–100 → [0,1], projects precedent) · streak (policy-derived READ seam, D3) · rate / ranking / time-comparison · miss + acceptance-window computation, cadence expanded from `recurrence_rule` via `ical.js` (R3) · **from S4:** `applicable = 0` is a **neutral** day, never a miss; the acceptance window's encoding is defined here (first consumer) |
| **S5c** | **Correction: Q1/RT-4/D3 (every step drives an entity; occurrences are Sessions)** | ✅ built | A11 reversal · R5 | check-off step = a Task (created/linked); standard task occurrence = Tasks `work` session (startTimer/stopTimer, adopt, bare check = completed work session); obligation keeps completeTask; any REGISTERED session sub-type, lifecycle-aware + about-entity attach; routines registers none; S4 reflection = obligations only. Spec `PLAN-S5c-q1-d3-correction.md` |
| **S6** | Reschedule (routine-owned legs) | 🔨 | 10,28 · A19 | **Amended (R3; v3 SS-8, Victor 2026-10-22):** `rescheduleStep(stepId, {date, slot})` writes an SS-8 intent block for a missed occurrence in a caller-given slot; the make-good creates the session carrying `planned_block_id` and fulfils it. The acceptance-window write guard covers make-good/skip/reschedule → `OutsideAcceptanceWindowError`. Sessions block write/read surface lands here (R1). The **auto-slot** leg (Scheduler G5 placement) is a borrowed leg, see §Borrowed legs |
| **S7** | Effect emission + Purpose contribution | 🔨 | 21,22 · A26, C7 | D3 routine-level `award_xp` + `contribute_purpose_metric` on the write that reaches policy-done (rule 21; key `routine.id` + `completed:<date>`), producer guard `registry.resolve` (N8); additive XP never retracted · **from S4 (E7):** emit only for `status === 'done'` (either `policy_source`; all-done is policy-independent); `partial`+`'undefined'` never emits; a later policy change never emits for past dates; a reflection-only done (no routine write) emits nothing (rule 21) · **As-built (S7, 2026-10-26):** transition gate (not-done → done of the written date, before/after inside the per-step lock), occurrence-gated, reflection-only done emits nothing (rule 21), failures flagged (`effect_emit_failed`) + re-drivable `contributeToPurposeMetrics`; `updateStep{skip_dates}` gets the S6 window guard |
| **S8** | Tags + notes + links | 🔨 | 23,25,26 · A27 | `spaces.tagEntity`/`createLink` + tag reads; `notes.ensureEntityNote('note', 'routine'\|'routine_step', id, seed)` (rule 19); saved views cited-as-consumed (007) · **As-built (S8, 2026-10-26):** `tagRoutine`/`untagRoutine`/`getRoutineTags` + step twins (live-tag reads, `TagNotFound` guard), `getRoutineNote`/`getStepNote`, `linkPage`/`unlinkPage`; `spaces`/`notes` required deps |
| **S9** | Providers + Journal: the ① **track** closer | 🔨 | 19,20,30c,32 · A23, A24(ProviderEmitFailed) | `dueIn`/`getDueReminders`/`summary` (occurrences via `ical.js`) + `routines/journal.ts` (`createRoutinesJournalContribution`, `registerRoutinesJournal`, `registerRoutinesDueProvider`). **Shipped, not called** (N5: composition-root wiring = fe-routines entity close). Confirms the empty `[E]` seam end-to-end |

**Coverage check:** ROU-01…33 all homed (ledger §F). ROU-25 → 007/SP5 pass; ROU-27 → Spaces design-pass; 32 held across every slice. ✓
**Ledger check:** every ❌ / 🕳 / 📄 row is in a slice above or in D7 (seam/slice-map amendments, written now). ✓

## Borrowed legs (golive process §3 — each needs a named home with real edges)
| Leg | Owner | Named home | Status |
|---|---|---|---|
| `exercise` step → Health `workout` session (R5) | Health training | **MOD-health-training (#69)** `[FACT: delivery-structure-reconstruction/reconstructed-structure.md:164]` | ✅ named; until then `EntityUnavailable` (S5c: routines registers NO sub-type; first-wins registry) |
| Auto-slot placement for `rescheduleStep` (R3) | Scheduler G5 placement algorithm | **`⚠ INTENDED-later` → M1.2** (study-planner design-pass), a documented milestone home `[FACT: docs/roadmap/m1.1-delivery-plan.md:247; sessions-and-scheduling/delivery/interpretation.md:79]`. This is legitimate per the golive task organization: debt-plan §3 "homed by milestone, not a debt unit" + gap2 R2 (the tail position is the deferral) | ✅ homed. S6 ships caller-date reschedule |
| Session-spine close after `completeFocus` (spine stays `in_progress`, N9) | Sessions | **sessions-rescope (#62)** "HUD + runtime legs" `[FACT: reconstructed-structure.md:150]` | informational. Routines works around it (reads focus-row status); not a routines dependency |

## Sequencing rationale
- **Dependency order:** S1 → S2 (built) → **S2c** (conformance; lands the `registry` dep + validations every later slice relies
  on) → S3 (drive; lands `tasks`/`habits`/`sessions`) → S4–S5 derive over the ledger + driven occurrences → S6 → S7 emits on
  S4's done → S8 cross-cuts → S9 registers providers over everything (track close).
- **Each slice is independently live-store verifiable** — a real SQLite write path exercises the encrypt/persist seam a
  mock hides (the per-slice Verification Gate is blocking; no owed gates). `[FACT: scenario Step 9]`
- **Worktree-isolated build** — a peer session was active this session; isolate into `.claude/worktrees/mod-routines`
  before S1 implementation. [[parallel-session-shared-tree-collision-use-worktree]]
