<!-- Forward spec — Tasks ① S3 · Per-Step Build Gate (§XXVI) · authored before implementation -->

# PLAN S3 — Completion + effect fan-out

> Slice-map S3. TAS-06,07,19,20,26. `completeTask`/`reopenTask` + the completion effect fan-out via the DENY-SAFE
> rail (producer-only; dormant without a handler). Precedent: `services/projects/service.ts:64-82` `fanOutCompletion`.
> Closes with the live-store Verification Gate (Node 24).

## Operations (added to the S1+S2 surface)

- `completeTask(id): TaskRow` — `status='completed'` + `completed_at = Date.now()`; on the not-completed→completed
  transition, fire the completion catalogue (below). Idempotent: completing an already-completed task re-stamps
  nothing new and the rail dedups any re-fire.
- `reopenTask(id): TaskRow` — clear `completed_at` (→ `null`) + `status` back to a non-terminal state; fires **no**
  effects (reopen is not a completion; the economy ledger is append-only and Gamification owns any reversal policy).

## Design decisions resolved from the docs (the gate-1 substance)

### D-S3-1 — The completion catalogue is the **keyed/additive** subset; the two projection effects are NOT pushed.

TAS-19 names the full fan-out `award_xp · contribute_purpose_metric · surface_journal · surface_calendar ·
emit_measurement_signal`. ADR-004 §3.2.5 **effect classes** (`foundation/effects/types.ts:20-33`) split this set by
_mechanism_, and the rail realizes each class differently (`service.ts:36` — "Projection effects write no row and
route to no handler, BR-6"):

| Effect                      | Class      | S3 treatment                   | Why                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------- | ---------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `award_xp`                  | additive   | **PUSH** (dormant)             | Tasks **is an economy feeder** — framework §4 L242 + E2 L170 list `Tasks` explicitly; TAS-20. (This is where Tasks diverges from Projects/Books/Education, which are **not** feeders and emit no `award_xp`, C-E2.)                                                                                                                                                                                  |
| `contribute_purpose_metric` | keyed      | **PUSH** (dormant)             | TAS-26 — Tasks is a `contributions` CONTRIBUTOR. Guard C2: no M7 purpose tables at M1 → no handler → no-op. Guard C1: Tasks advertises no M5 source.                                                                                                                                                                                                                                                 |
| `emit_measurement_signal`   | keyed      | **PUSH** (dormant)             | The genuine completion→measure-advance signal (`binding_mode='event-trigger'`, TAS-06/M2).                                                                                                                                                                                                                                                                                                           |
| `surface_journal`           | projection | **NOT pushed — PULL-realized** | Projection = rail no-op (BR-6), pull-aggregated at render. Journal "completed today" is delivered by the **S9 pull registry** (`summary(date)` over `completed_at`), exactly as `projects/service.ts:442 getDayProjectsDigest` + education S10. `[[event-fanout-pull-push-split-and-occurrence-grain]]` — "Journal = registry-PULL, not rail `surface_journal`; PUSH only keyed/additive consumers." |
| `surface_calendar`          | projection | **NOT an emitted effect (D1)** | Calendar is a read-seam over `due_date`/`scheduled_date`/`dueIn`. NB: `surface_calendar` **is** a valid `EffectType` (`types.ts:31`, class projection) — the slice-map's literal "not an effect type" is imprecise; the operative rule is **Tasks does not emit it**.                                                                                                                                |

→ `COMPLETION_EFFECTS: readonly EffectType[] = ['award_xp', 'contribute_purpose_metric', 'emit_measurement_signal']`.
This is a refinement of the slice-map S3 row (which listed all 4 non-calendar effects in the "catalogue"): the two
projections are realized by their class (pull / read-seam), not a push. Grounded in ADR-004 §3.2.5 BR-6 + the
projects/education precedent; **flag for /critique**.

### D-S3-2 — Dedup grain = `taskId ‖ 'task_completed'` (occurrence = the task row id).

`applyEffect` derives `effect_event_id = derive(subjectNaturalKey ‖ transition ‖ effectType)`. A standard task
completes once; reopen→re-complete re-fires the **same** key → `{applied:false}` → **no double-grant**. This
"complete→reopen→re-complete grants once, ever" is a deliberate **product decision** (the economy ledger is
append-once; a reopen is a correction, not a new achievement), not merely a mechanical consequence — it is the
intended behaviour and is stated so the Verification Gate asserts it. Recurring **obligations** (S5) spawn a _new task
row_ per occurrence → a fresh id → a distinct key → each occurrence grants. So the id grain is correct now and
composes with S5. `[[event-fanout-pull-push-split-and-occurrence-grain]]` (grain = occurrence id, never the bare
transition).

**Two distinct guards — do not conflate (R2).** (a) The `wasCompleted` guard in `completeTask` means a _plain_ second
`completeTask` (status already `'completed'`) **never calls** `fanOutCompletion` — the fan-out is skipped at source.
(b) The rail's `applied_effects` dedup is the backstop on the **reopen→re-complete** path, where `wasCompleted` is
`false` so fanOut _is_ called but the derived key is already in the ledger → `{applied:false}`. The gate must exercise
(b) via reopen, not a plain double-complete (which only proves (a)).

### D-S3-2b — `targetRef` per effect.

`targetRef = task id` for all three effects at M1 (matches `projects/service.ts:77`). Forward-note (N1): when the M7
purpose handler lands, `contribute_purpose_metric`'s target may need to be the purpose-metric id, not the task id —
the producer supplies `targetRef`, so this is a zero-signature change at the handler slice.

### D-S3-3 — Port shape + deny-safe dormancy (mirror projects exactly).

`effects?: { rail: EffectRail; registry: EffectRegistry }` (inline shape — the `EffectsPort` name collides at the
barrel; `projects/types.ts:39` precedent). `fanOutCompletion`: `if (!effects) return` (M1 default — no rail wired);
per effect `if (!effects.registry.resolve(type)) continue` (dormant guard — an unregistered handler would throw
`NoEffectHandler`); `try/catch` swallow — **post-commit, failure-isolated** (the completed task stands; a handler
throw is non-fatal). `transition = 'task_completed'`, `subjectNaturalKey = targetRef = task id`.

## Operation flow + invariants

> **Write path (R1 — critical).** Both methods write through the **repo primitive `tasksRepo.update(id, …)`**, NOT
> the service `updateTask`. The service `updateTask` has no `completed_at` in `UpdateTaskInput` and BR-TK-S1-5 forbids
> it from touching completion semantics — `completeTask`/`reopenTask` are `completed_at`'s sole writers (TK-6). Routing
> through `updateTask` would silently drop `completed_at`.

- **completeTask(id)** — `findById(id)` → `TaskNotFoundError`. Capture `wasCompleted = existing.status === 'completed'`.
  `tasksRepo.update(id, { status: 'completed', completed_at: Date.now() })`. **Post-commit**, `if (!wasCompleted)
await fanOutCompletion(id, 'task_completed')` — the `wasCompleted` guard means a plain re-complete skips the fan-out
  entirely (D-S3-2 guard (a)). Return the updated row.
- **reopenTask(id)** — `findById(id)` → `TaskNotFoundError`.
  - **Status target (R3 — decision):** reopen sets `status: 'not_started'` (the schema default for a non-completed
    task) + `completed_at: null`. Chosen over `'in_progress'` because reopen conveys no information about _how far_
    the work now stands — the user re-sets progress explicitly; `'not_started'` is the neutral, non-presumptive reset.
    (TAS-07 mandates only clearing `completed_at`; the status target is this slice's decision.)
  - **No-op guard:** if `existing.status !== 'completed'` **and** `existing.completed_at == null`, return `existing`
    without a write (mirrors BR-TK-S1-5's no-op-patch optimization — no wasted `updated_at`/`sync_queue` bump).
  - Fires **no** effects (reopen is not a completion; any economy reversal is Gamification's, not Tasks').
- **fanOutCompletion(entityId, transition)** — the `projects/service.ts:72-82` pattern verbatim, with
  `COMPLETION_EFFECTS` (D-S3-1) and the dormant/failure-isolated guards (D-S3-3).

## Composition (no re-implementation)

`import type { EffectType } from '@vida/types'`; `import type { EffectRail, EffectRegistry } from '../../foundation/effects'`.
The rail + registry are composed, never re-implemented. No new DB writes beyond the two column updates (the ledger is
the rail's own, written by `applyEffect` inside its tx).

## Types / validators

- `types.ts`: extend `TasksServiceDeps` with `effects?: { rail: EffectRail; registry: EffectRegistry }` (deny-safe).
  Extend `TasksService` with `completeTask(id): Promise<TaskRow>` + `reopenTask(id): Promise<TaskRow>`. No new input
  types (both take a bare id). No new typed error (reuse `TaskNotFoundError`).
- `validators`: none (no new input shape).
- No `@vida/types` change (DB-11 landed at S1; `completed_at`/`status` already present).

## Verification Gate (blocking — live store, Node 24, real better-sqlite3)

1. `completeTask` on a not-started task → `status='completed'`, `completed_at` set (≈now); `getTask` reflects it.
2. `reopenTask` on it → `status='not_started'`, `completed_at = null`.
3. **Dormant rail (no `effects` dep):** `completeTask` succeeds and mutates columns with **no throw** (deny-safe no-op fan-out).
4. **Dormant rail (effects present, no handler registered):** `completeTask` succeeds; `applied_effects` ledger stays
   empty (the `resolve(type)` guard skips — no `NoEffectHandler`).
5. **`wasCompleted` guard (D-S3-2 guard a):** register a spy for `emit_measurement_signal`; `completeTask` → spy runs
   **once**. A **second plain `completeTask`** → spy does **not** run again **because fanOut is not called** (status
   already `'completed'` → `wasCompleted` guard), and `applied_effects` has exactly **one** row (not two attempts).
6. **Rail dedup backstop (D-S3-2 guard b):** complete → **reopen** → complete again. The re-complete has
   `wasCompleted === false` so `fanOutCompletion` **is** called, but the spy still ran **exactly once total** — the
   derived key is already in `applied_effects` → `{applied:false}`. (This is the test that actually exercises the
   dedup; test 5 cannot.)
7. **Failure isolation:** a handler that throws → `completeTask` still returns the completed row (the column write
   committed pre-fan-out; the throw is swallowed).
8. `completeTask`/`reopenTask` on a missing id → `TaskNotFoundError`.
9. **Feeder legitimacy:** register a spy for `award_xp`; completion fires it (proves Tasks emits the economy effect a
   non-feeder module must not).
10. **reopen no-op guard (R3):** `reopenTask` on a never-completed task (`status='not_started'`, `completed_at=null`)
    returns the existing row with its `updated_at`/`_sync_version` **unchanged** (no write).

## Out of scope (downstream slices)

`log_time`/timer/`actual_minutes` (S4) · obligation recurrence regeneration on completion (S5) · the `measurement_kind`
× `binding_mode` axes exposure + contribution guard semantics (S6) · the S9 **pull** Journal registry
(`summary(date)` that realizes `surface_journal`'s outcome) + DueProvider (S9). S3 wires the **emit** side only.
