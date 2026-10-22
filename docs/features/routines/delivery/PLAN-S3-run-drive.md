<!-- Forward spec — Routines ① S3 · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- The keystone: the RT-3 composition core. Every drive leg rides a shipped substrate call, verified in code. -->

# PLAN S3 — Run/drive: the RT-3 composition core

> Slice-map S3 (approved re-scope 2026-10-21). ROU-07 (`runStep`), ROU-08 drive (`completeStep` drive leg), ROU-11, ROU-30a
> (`EntityUnavailable`) + ledger rows **A15, A16**, A24 (EntityUnavailable), B11, C4, C6. Grounded in `delivery/interpretation.md`
> (rules 1, 15, 17, 18, 22, 23 · N3, N7, N9 · R2, R5), the amended `delivery/seam-contract.md`, and the shipped substrates below.
> Closes with the live-store Verification Gate on **real** Tasks / Habits / Sessions services.

## 1a. Context docs
`docs/modules/routines/current-*` were promoted at S2c (`94dc798`) → **current**.

## Grounding — the shipped substrate calls (verified in code)
| Leg | Call | Behaviour that matters |
|---|---|---|
| Task | `tasks.getTask(id)` → `TaskRow \| null`; `tasks.completeTask(id)` | `completeTask` throws `TaskNotFoundError`; re-writes on every call, fans out only on a fresh transition; an obligation may throw `RecurrenceRegenError` **after** the completion is durable (TAS-23) `[FACT: services/tasks/service.ts:446-461]` |
| Habit | `habits.getHabit(id)` → `Habit \| null`; `habits.logCompletion(habitId, {date})` | UPSERT per (habit, date). Create = `count ?? 1`; update = **patch** (a repeat without `count` changes nothing) `[FACT: services/habits/service.ts:205,215-221,261-273]`. Done iff `count >= target_count` (HB-5); effects fan out only then. Future/out-of-window date → `BackfillWindowError` |
| Focus | `sessions.startFocus({})` → `FocusTimer` (focus row, has `session_id`); `sessions.attach(sessionId, 'routine_step', stepId, 'instance')`; `sessions.findOpenSessionForEntity('focus', 'routine_step', stepId)` → spine row \| null; `sessions.getSession(id)` → `{session, extension}`; `sessions.completeFocus(focusId)` | `startFocus({})` is the fresh path (`createSession` focus + timer row) `[FACT: services/sessions/service.ts:444-469]`. `startFocus({attach})` is **not** used: its `AttachInput` requires a `sessionId` that doesn't exist before creation, and no shipped caller uses it. `completeFocus` completes the timer row with **no effects** and leaves the spine `in_progress` `[FACT: :507-531]`. `findOpenSessionForEntity` matches spine `in_progress` only `[FACT: :425-430]`. **Never** `completeSession` (would throw `NoEffectHandler`: no `attach_pomodoro` handler) |
| Registry | `TaggableTypeRegistry` (S2c) | attach validates `'routine_step'` (seeded) |

**Pattern in use (§XXIV):** tasks' timer = a session sub-type driven through the public Sessions API (`startTimer`/`stopTimer`,
`services/tasks/service.ts:520-560`); habits' fan-out guard; the module's own typed guards. Cross-module calls go through public
service APIs only (constitution §6).

## Resolutions — interp rules 22 and 23 (both doc-derived; no Victor call)
- **Rule 23 — habit step.** RT-3 "the routine **reflects** the entity" + routines BR terminal table "entity advanced/completed; step
  reflects it" (business-rules.md:110) + HB-5 "done iff `count >= target_count`". A run = **one native tick**
  (`logCompletion(habitId, {date})`); the step is **done exactly when the habit is done for that date**, and only then is the occurrence
  row stamped. A partial habit returns `status:'advanced'` with no stamp. **Amends interp rule 23's "count +1":** habits' repeat-log is
  a *patch* (`services/habits/service.ts:215-221`), so a repeated run on a `target_count > 1` habit changes nothing and keeps returning
  `'advanced'`. Further reps go through the habit's own detailed logging, and the step reflects them (stated in the StepRunState contract).
- **Rule 22 — task step.** The step drives and reflects **the task it references** (RT-3; G3 "completing via that mode drives the
  underlying entity"). A completed task reads as done on later occurrences until it is reopened. **Following an obligation to its next
  occurrence is NOT owed (doc-derived limitation):**
  - Tasks intake **G8** fixes the boundary: *behaviour* recurrence belongs to Habits/Routines and *deadline* recurrence to Tasks
    (`docs/intake/tasks.md:66`).
  - Duties **D3** says no Master→Instance engine (`docs/intake/duties.md`).
  - Shipped Tasks spawns obligation occurrences as new ids with no lineage (`services/tasks/service.ts:464-490`), and only `obligation`
    regenerates (`duty` does not, `:459`).
  - So a routine step that should repeat is a null-entity actionable step (gate A11) or a habit, not a pointer into a deadline chain.
  - Checked: tasks intake G8, duties D1–D3, tasks PLAN-S5, routines intake Q1, RT-4. None specifies lineage.

## Scope (in S3)
| # | Ledger | Change |
|---|---|---|
| 1 | A2 (S3 deps) | Factory gains **`tasks: TasksService`** (required, D1), **`sessions: SessionsService`** (required, seam), **`habits?: HabitsService`** (optional, seam: absent ⇒ a habit step is `EntityUnavailableError`) |
| 2 | A15 | **`runStep(stepId, input?: { date? }): Promise<StepRunState>`** (seam amended: `input` added) |
| 3 | A16 | **`completeStep`** gains the drive leg. Returns **`RoutineCompletion` for an actionable step** (as built) and **`StepRunState` for every driven step** (so the TAS-23 flag and the run status are never dropped) |
| 4 | A24 | **`EntityUnavailableError(stepId, reason)`**, thrown before any routine write (missing/soft-deleted entity · absent `habits` dep · unsupported target, R5). Class name follows the module's `*Error` convention; seam annotated |
| 5 | rule 17 | **Re-drive is the default.** Task and habit steps are always re-driven on re-complete (both are effect-idempotent: `completeTask` fans out only on a fresh transition `services/tasks/service.ts:452`; habits fan out on done + rail dedup `:153`), so a reopened task or a deleted habit completion is re-reflected (RT-3). **Only a focus step** with an existing done row for (step, date) returns that row without starting/completing again. Actionable steps keep the as-built upsert (`routines-service.test.ts` S3 upsert test stays green) |
| 6 | B11 | **Default `clock` = `() => utcDay(Date.now())`** imported from `../tasks` (public: `services/tasks/index.ts` `export * from './service'`; `service.ts:197`). *(A draft claim that `utcDay` was internal was wrong and is withdrawn.)* |
| 7 | N9 workaround | **Focus re-entry after completion:** after `completeFocus` + stamp, `sessions.detach(<the routine_step attachment>)`. `attach` is idempotent and returns the existing row (`services/sessions/service.ts:395-401`); `detach` hard-deletes (`:411`). Without it, the completed session's spine stays `in_progress` (no focus cancel/complete-spine path that doesn't throw) and `findOpenSessionForEntity` keeps returning it first, so re-entry breaks after one cycle. **Recorded as a workaround** for the Sessions spine-close gap (owner: sessions-rescope #62 "runtime legs"). The session ↔ step link is dropped after completion; the routine's ledger row holds the occurrence + duration |

**Target resolution: ordered precedence (first match wins; R2 pinned here):**
1. `step_type === 'focus'` → **focus**. A step `entity_type`/`entity_id`, if any, is **ignored in M1** (what the session is "about" stays
   open per R2; no second attachment is made, since an instance attachment would make it an effect target, ADR-004 §3.2.4).
2. `entity_type === 'task'` → **task** · `entity_type === 'habit'` → **habit** (an `entity_id` is required, else rule 3 of this list).
3. `entity_type == null && step_type == null` → **actionable**.
4. Anything else → **`EntityUnavailableError`** (rule 15): another session sub-type (`'workout'`, …), `step_type` `'habit'`/`'task'`
   without a ref, `entity_type` `'session'` or any other registered-but-undrivable type, an unknown `step_type`.

**Drive behaviour per target:**
| Target | runStep | completeStep |
|---|---|---|
| actionable | = completeStep | ledger done upsert (as built) → `RoutineCompletion` |
| task | `getTask` (null/soft-deleted → `EntityUnavailableError`) → `completeTask` → stamp → `{status:'done'}`. `RecurrenceRegenError` ⇒ completed: stamp + `flag:'recurrence_regen_failed'` | = runStep |
| habit | `habits` absent / `getHabit` null → `EntityUnavailableError` → `logCompletion(habitId, {date})` → `count >= target_count` ⇒ stamp + `'done'`, else `'advanced'`. `BackfillWindowError` rethrown, no stamp | = runStep |
| focus | done row for (step, date) ⇒ return it (`'done'`). Attached spine (`findOpenSessionForEntity`) whose extension (narrowed by `session.sub_type === 'focus'`) is `running`/`paused` ⇒ `{status:'in_progress', session_id, focus_id}` (re-entry). Attached focus already `completed`/`cancelled` and no done row ⇒ stamp from it + detach (stamp-retry path). Else `startFocus({})` → `attach(session_id,'routine_step',stepId,'instance')`; if `attach` throws, best-effort `cancelFocus(focus_id)` then rethrow (no orphan running focus) → `{status:'in_progress', session_id, focus_id}` | done row ⇒ return it. Running/paused attached focus → `completeFocus(focus_id)` → stamp (`actual_duration_minutes = round(duration_seconds/60)`; a caller-passed duration is **overridden** for focus, declared) → detach → `'done'`. Attached focus `completed` + no done row ⇒ stamp from it + detach (retry). No attached focus → `EntityUnavailableError('no running focus session')`. A focus started outside routines (not attached to the step) is invisible here → `EntityUnavailableError` (declared) |

## Types (net-new)
```ts
export type StepRunStatus = 'done' | 'advanced' | 'in_progress'
export interface StepRunState {
  step_id: string
  date: string                          // the occurrence date (YYYY-MM-DD)
  target: 'actionable' | 'task' | 'habit' | 'focus'
  status: StepRunStatus                 // 'advanced' = habit ticked but below target_count (a repeat run stays 'advanced')
  completion: RoutineCompletion | null  // the stamped ledger row when status === 'done'
  session_id?: string; focus_id?: string
  flag?: 'recurrence_regen_failed'      // TAS-23 complete-but-flag passthrough
}
export class EntityUnavailableError extends Error { constructor(public readonly stepId: string, public readonly reason: string) }
// RoutinesServiceDeps += tasks: TasksService; sessions: SessionsService; habits?: HabitsService
// RoutinesService += runStep(stepId, input?: { date?: string }): Promise<StepRunState>
// completeStep → Promise<RoutineCompletion | StepRunState>  (RoutineCompletion iff actionable)
```

## Operation flow + invariants
- **N7 — drive first, stamp second.** No routine write precedes the entity call. **Retry after a stamp failure is safe for every
  target:** task (re-drive is effect-idempotent), habit (patch upsert + rail dedup), and focus (the stamp-retry path above reads the
  completed focus row).
- **Rule 1.** The routine never fires an entity's effects (tasks/habits fire their own; `completeFocus` fires none; `completeSession`
  is never called).
- **Date:** `input.date` (validated `YYYY-MM-DD`) or `clock()` (UTC day via `utcDay`). It is passed to `logCompletion`. Tasks has no
  date input (`completed_at` = now); the ledger row carries the occurrence date.
- **Planned skips:** running a step on a date in its `skip_dates` is allowed. The done row stands (RT-8 makes a planned skip neutral,
  not a lock).
- **Docs to annotate in this slice (§XXVIII-minor):** rule 18, R5, seam :56 and slice-map S3 say `startFocus({attach})` → now
  "`startFocus({})` + `attach` (the `AttachInput` requires a pre-existing `sessionId`)". Interp rule 23 "count +1" → patch semantics.
  Seam `runStep` gains `input?: {date?}`. The seam error name becomes `EntityUnavailableError`. The completeStep union is narrowed as in
  scope 3.

## Deps / impact
New required deps `tasks` + `sessions`. The only constructor call site is the routines test harness (impact scan, ledger), which is
upgraded to build **real** Tasks / Habits / Sessions services (the tasks `setupWithTimer` harness pattern:
`createSessionRegistry` + `createEffectRegistry`/`createEffectRail` + `createTaggableTypeRegistry`). No runtime consumer (N5).

## Verification Gate (blocking — live store, Node 24, real better-sqlite3 + `migrate()`, REAL tasks/habits/sessions services)
Harness: the tasks `setupWithTimer` pattern (`createSessionRegistry` + `createEffectRegistry`/`createEffectRail` + `createTaggableTypeRegistry`);
tasks built with `effects:{rail, registry}` and a registered spy `award_xp` handler for test 13; `vi.setSystemTime` for focus durations.
1. **Actionable:** `runStep`/`completeStep` on a null-entity step → ledger done; completeStep returns a `RoutineCompletion`.
2. **Task:** `runStep` → `tasks.getTask` is `completed`; ledger done; `StepRunState{target:'task', status:'done'}`.
3. **Task missing / soft-deleted:** → `EntityUnavailableError`; no routines ledger row; no routines `sync_queue` row.
4. **Task obligation regen failure** (`setRecurrence(id, 'FREQ=BOGUS')`, which Tasks doesn't validate, the tasks test precedent) → the task is
   completed, ledger stamped, `flag:'recurrence_regen_failed'` (also via `completeStep`).
5. **Habit target 1:** `runStep` → a habit completion for the date (count 1); ledger done.
6. **Habit target 3:** `runStep` → `'advanced'`, no ledger row; a repeat `runStep` → still `'advanced'`; after `habits.logCompletion({count:3})`,
   `runStep` → `'done'` + stamped.
7. **Habit absent dep / missing / soft-deleted habit** → `EntityUnavailableError`.
8. **Habit date:** `runStep(id, {date})` lands the habit completion on that date; a future date → `BackfillWindowError`, no stamp.
9. **Focus start + re-entry:** `runStep` → `in_progress` with `session_id`/`focus_id`; a second `runStep` returns the **same** ids (no second session).
10. **Focus cycle ×2 (the B2 fix):** run → complete (stamped, `actual_duration_minutes` = elapsed via `vi.setSystemTime`) → run (new session) →
    run (same new session) → complete (day 2) → a ledger row per date; no `EntityUnavailableError`.
11. **Focus stamp retry (B3):** simulate a stamp failure after `completeFocus` (spy the completions write to throw once) → retry `completeStep`
    → stamped from the completed focus row; the attachment is then detached.
12. **Focus edge cases:** `completeStep` with no attached running focus → `EntityUnavailableError`; a focus started outside routines →
    `EntityUnavailableError`; `attach` failure after `startFocus` → the focus is cancelled (no orphan running focus) and the error rethrown.
13. **Rule 1 + re-drive (rule 17):** completing a task step twice → the task's `award_xp` handler runs **exactly once** (the effect-idempotency
    guarantee), and no effect is keyed on the routine/step.
14. **Unsupported targets:** `step_type:'workout'`; `step_type:'habit'` with no ref; `entity_type:'session'` → `EntityUnavailableError`, no
    session created.
15. **Persistence probe:** a driven `completeStep` enqueues the ledger row's `sync_queue` entry.
Gates: tsc 0 · eslint 0 · routines suite green (41 + new) · full `@vida/core` sequential · g2 · /critique · §XXIX.

## g1 critique (folded): REVISE → 5 blocking fixed
B1 `utcDay` is public, so it's reused (draft claim withdrawn). B2 focus re-entry after cycle 1 → detach-after-complete workaround. B3 focus
stamp-retry path. B4 re-drive default (early-return only for focus done rows). B5 ordered target precedence. Non-blocking N1–N7 folded:
union narrowed, rule 22 de-escalated to doc-derived (G8, D3), rule-23 patch semantics stated, `startFocus({})`+attach annotated + cancel on
attach failure, seam drift annotated, gate tests added.

## Out of scope (homed)
Evaluate/policy (S4) · progress/analytics (S5) · reschedule (S6) · routine-level effects (S7) · tags/notes (S8) · providers (S9) ·
obligation chain-following (doc-derived limitation, G8/D3) · Sessions spine-close (sessions-rescope #62) · workout/other session sub-types (#69 / owners).
