<!-- Forward spec — Tasks ① S5 · Per-Step Build Gate (§XXVI) · authored before implementation -->

# PLAN S5 — Obligations + recurrence

> Slice-map S5. TAS-21,22,23. The routines-critical RT-4 seam (routines' recurrent task-step consumes
> `createTask(+recurrence)`/`completeTask`). Closes with the live-store Verification Gate.

## Library — dictated by the canonical-choice procedure (not a decision)
The stored format is **RRULE standard format** (ADR-002:1160). ADR-001 locks the canonical libraries and forbids
alternatives without a new ADR (ADR-001:15): **`ical.js`** is the canonical iCal/**RRULE parser** (ADR-001:137). So the
next-occurrence computation **reuses `ical.js`** (parse the RRULE → iterate from the current `due_date` → the next
instance), converting the result to the `YYYY-MM-DD` `calendarDate`. Introducing `rrule` would be a forbidden
alternative; a hand-rolled subset re-implements the canonical parser — both rejected. `ical.js` is not yet installed →
add it to `@vida/core` deps (installing an ADR-001-canonical lib, pure-JS, runs on every target). **`/verify` the
`ical.js` RRULE/iterator API against its current docs before coding** (CLAUDE.md library-API rule).

## Scope (what's in ① vs deferred)
- **In:** `setRecurrence` (obligation-only) + the `completeTask` regeneration hook + `RecurrenceRegenError`, over the
  **built** `kind ∈ {standard, obligation}` enum + the `recurrence_rule` column (migration 015).
- **Deferred (grounded):** **TAS-24** — widening `kind` to a user-extensible `type` registry (`duty`/open vocab) is an
  explicit **ADR-002-amendment** carry-forward (intake `ADDENDUM`; needs the enum/schema change) → out of ① scope.
  `duty`'s "composes Scheduler `dueIn`/recurrence" is likewise deferred (no scheduler-recurrence primitive exists).

## Operations (added to the S1–S4 surface)
- `setRecurrence(taskId, rule: string | null): Task` — `TaskNotFoundError` if absent; the task must be
  `kind='obligation'` else `RecurrenceNotAllowedError` (TK-7 — standard tasks never recur, TAS-21). Writes
  `recurrence_rule` (null clears it; an obligation with no rule behaves standard until set). Returns the row.
- **`completeTask` (extend S3):** after the existing complete + effect fan-out, if the task is an **obligation with a
  non-null `recurrence_rule`**, regenerate the next occurrence (below). A standard task, or an obligation with no rule,
  completes exactly as S3 (no regen).

## Operation flow + invariants
- **Regeneration (TAS-22):** compute the next `due_date` from `recurrence_rule` via `ical.js`, anchored at the task's
  current `due_date` (null `due_date` ⇒ anchor at today; guard it). Then **spawn a new task** via the S1 `createTask`
  path (NN-backfill + ≤1-parent guard). Three outcomes (R1 — do NOT conflate):
  1. **Valid rule, next instance exists** ⇒ spawn one `not_started` occurrence with `due_date = next`.
  2. **Valid rule, NO future instance** (bounded `COUNT`/`UNTIL` exhausted) ⇒ **the recurrence has legitimately ended**:
     complete, **no spawn, NO error** (not a failure — the obligation simply stops recurring).
  3. **Invalid/unparseable rule** ⇒ complete, **no spawn**, throw `RecurrenceRegenError` (the loud flag, TAS-23).
- **Carry-over table (R2 — exhaustive; every `tasks` column is carry or reset):**
  | carried (same obligation) | reset (fresh occurrence) |
  |---|---|
  | `title` · `description` · the one parent-module FK (`project_id`/`milestone_id`/`course_id`/`contact_id`) · `priority` · `difficulty` · `kind:'obligation'` · `recurrence_rule` (so the chain self-sustains) · `estimated_minutes` · `measurement_kind` · `binding_mode` · `nesting_weight` · `sort_order` | `due_date:=next` · `status:'not_started'` · `completed_at:null` · `scheduled_date:null` (only the deadline recurs, TAS-22) · `actual_minutes:null` · new `id` |
  - **`parent_task_id` is NOT carried — recurrence is top-level only (decision):** a recurring *sub-task* is out of
    scope (obligations are standalone/parent-linked deadlines, not sub-tasks); if `parent_task_id` is set, the spawned
    occurrence drops it (becomes top-level). State so no implementer silently re-parents.
  - The new row is a distinct occurrence (own id) → the S3 completion effects fire anew when IT completes (each
    occurrence grants — correct).
- **Complete-but-flag ordering (TAS-23):** S3 completion (status + `completed_at` + fan-out) commits FIRST; regen runs
  after. So the completion + its effects are durable regardless of regen outcome. `completeTask` returns the completed
  task on outcomes 1 & 2; throws `RecurrenceRegenError` (carrying the completed task id + reason) only on outcome 3.
- **Single recurrence exception (conventions:13/25):** only `due_date` deadline recurrence; NO habit/routine
  behavior-recurrence (`frequency`+`days`); the spawn copies forward, no Master→Instance engine (TAS-24 `duty`, deferred).

## Invariant enforcement + caller contract (N1/N2)
- **N1 — `recurrence_rule` ⇒ `kind='obligation'`, enforced at EVERY write path** (consistent with the ≤1-parent
  guard): `createTask`/`updateTask`/`setRecurrence` reject a non-null `recurrence_rule` on a non-obligation task
  (`RecurrenceNotAllowedError`). No stray inert rule on a standard task. (Clearing to null is always allowed.)
- **N2 — caller contract:** `RecurrenceRegenError` means the task **IS completed** (durably) but its next occurrence
  wasn't regenerated — it is NOT a completion failure. Callers must **not** retry `completeTask` on it (a retry
  re-throws: the task is already completed, the rule still invalid). Recorded in `BR-TK-S5-*`.
- **ical.js pre-code `/verify` (hard gate):** confirm the RRULE iterate-from-anchor API against current ical.js docs;
  if a bare RRULE needs a `DTSTART`, synthesize it from the anchor `due_date`. No code before this verifies.

## Types / validators
- `types.ts`: `RecurrenceNotAllowedError` (non-obligation rule), `RecurrenceRegenError` (invalid rule — carries
  `taskId` + `reason`); extend `TasksService` with `setRecurrence(taskId, rule): Promise<TaskRow>`. `completeTask`
  signature unchanged; its failure mode gains the thrown `RecurrenceRegenError` (outcome 3 only).
- `validators`: `recurrence_rule` already `z.string().nullable().optional()` (validators/task.ts:47) — the
  obligation-only + parseability rules are service-enforced, not Zod-shape.
- No `@vida/types` change (kind/recurrence_rule columns exist). A recurrence helper (`nextOccurrence(rule, fromYmd):
  string | null`) lives in the tasks service (module-local, TAS-22) — a small pure wrapper over `ical.js`; `null` ⇒ no
  future instance (outcome 2); a throw ⇒ invalid rule (outcome 3).

## Verification Gate (blocking — live store, Node 24, real better-sqlite3 + real ical.js)
1. `setRecurrence` on an obligation → `recurrence_rule` stored; on a `standard` task → `RecurrenceNotAllowedError`.
2. `setRecurrence(id, null)` clears the rule; the obligation then completes without regen (behaves standard).
3. **(outcome 1)** `completeTask` on an obligation with `FREQ=MONTHLY` + `due_date` → completes AND spawns one new
   `not_started` obligation with `due_date` = next month, same `recurrence_rule`/`title`/parent; original stays `completed`.
4. the spawned occurrence is a distinct row (new id); completing IT spawns the next (chain self-sustains).
5. **(outcome 3)** `completeTask` on an obligation with an **invalid** rule (e.g. `FREQ=BOGUS`) → the task is
   `completed` (S3 effects fired) AND `RecurrenceRegenError` thrown; NO new occurrence row.
6. **(outcome 2)** `completeTask` on an obligation whose rule is valid but **exhausted** (`FREQ=DAILY;COUNT=1`, or
   `UNTIL=` in the past relative to the anchor) → completes, **NO spawn, NO error** (recurrence legitimately ended).
7. `completeTask` on a standard task, and on an obligation with **no** rule → completes, NO spawn, NO error (S3 parity).
8. `FREQ=YEARLY` (annual, e.g. taxes) + `FREQ=WEEKLY;INTERVAL=2` → correct next `due_date` (via ical.js).
9. the spawned occurrence carries `kind='obligation'` + the rule + `estimated_minutes`, resets `completed_at`/
   `actual_minutes`/`scheduled_date`, and (if the source had a `parent_task_id`) drops it (top-level recurrence).
10. **(N1)** `createTask`/`updateTask` with a non-null `recurrence_rule` on a non-obligation (`kind='standard'`) →
    `RecurrenceNotAllowedError` (the invariant holds at every write path, not just `setRecurrence`).

## Out of scope
TAS-24 type-registry widening (ADR-002 amendment) · `duty` type + scheduler cycle-gen · measurability (S6) ·
aggregation (S7) · tags/notes/views (S8).
