# Current Business Rules — routines   (level: module · tier: DEEP)
> Language: English.
> Coverage: 8/8 files read — **full** (same set as `current-spec.md`).
> Inherits: `docs/core/business-rules.md` + `docs/core/conventions.md` (constitution) → this module. Intent authority:
> `docs/features/routines/{identity,business-rules,contract,structure-data,conventions}.md` (RT-1…RT-19) + the GOVERNING
> `delivery/interpretation.md` (main's 9-slice set, Victor 2026-10-14; implicit rules cited as **interp §4.n**).
> Last refreshed: 2026-10-22 · **S5c promoted (§XXIX)** · S5 · S4 · S3 · S2c · earlier: entity-rescope **Step 0 BASELINE** (worktree @ `0456c32`). Source of truth = the code (§XXIX).

> **Baseline note.** This doc records what the CODE enforces. The `BR-RT-S1/S2/S3-n` IDs are kept stable from the
> as-built slices so existing cites keep resolving. They are **as-built labels**, not the governing slice numbers. Gaps
> against the governing docs are FLAGGED here (§3 "Findings") as reconciliation inputs for re-scope Step 4. They are not fixed here.

## 1. Invariants — what is ALWAYS / NEVER true

**Routine definition**
- **BR-RT-S1-1 · Enum validation before write.** `lifecycle`, `measurement_kind` and `binding_mode` are Zod-validated
  (`z.enum` over the `@vida/types` tuples); an off-tuple value rejects with no row written.
  `[FACT: validators/routine.ts; service.ts]`
- **BR-RT-S1-2 · Faithful create-echo (interp §4.8).** `serializeRoutine` backfills every NN default (`lifecycle:'active'`,
  `measurement_kind:'rate'`, `sort_order:0`) and coalesces every nullable to `null`, so the echoed row never lies. `[FACT: service.ts]`
- **BR-RT-S1-3 · No cached streak/progress (RT-14/RT-19, interp §4.3).** `progress` is the caller's value or `null`. It is never a
  service-maintained counter. Derivation is unbuilt. `[FACT: service.ts; db/schema/routines.ts:59]`
- **BR-RT-S1-4 · Partial update never blanks.** `updateRoutine` spreads only the keys Zod `.partial()` carried. `[FACT: service.ts]`
- **BR-RT-S1-5 · Archive = soft-delete, ledger preserved (RT-17).** `[FACT: service.ts]`
- **BR-RT-S1-6 · Explicit soft-delete filter on list, ordered (interp §4.7; S2c A8).** `listRoutines` prepends `isNull(deleted_at)`
  because `findWhere` bypasses it, then orders by `sort_order`, `created_at`, id (the tasks 3-key precedent). `[FACT: service.ts listRoutines]`
- **BR-RT-S1-7 · Local-first enqueue (RT-18).** Every write co-transactionally enqueues `sync_queue` (Repository). Verified by the
  persistence probe in the test file. `[FACT: __tests__/routines-service.test.ts S1 block]`

**Steps**
- **BR-RT-S2-1 · Polymorphic step, OPEN vocab (RT-3/RT-4, interp §4.5; S2c A10).** `step_type` is a plain string (no M1 registry, R2);
  `entity_type`/`entity_id` are nullable. A non-null `entity_type` must be registered in `TaggableTypeRegistry` (add + update), else
  `UnknownEntityType` with no write. Whether a registered type is *drivable* is S3's `EntityUnavailable` (R5). `[FACT: service.ts assertEntityType]`
- **BR-RT-S2-2 · No orphan step.** `addStep` throws `RoutineNotFoundError` for a missing/archived routine. `[FACT: service.ts]`
- **BR-RT-S2-3 · Faithful step echo + `skip_dates` JSON (interp §4.8/§4.9).** Plain TEXT, `JSON.stringify` on write and defensive
  `parseJsonArray` on read (malformed → `null`). `[FACT: service.ts]`
- **BR-RT-S2-4 · Partial step update never blanks**, and `skip_dates` set/clear is honored via `'skip_dates' in p`. `[FACT: service.ts]`
- **BR-RT-S2-5 · Archive cascades to live steps (RT-17, interp §4.6, partial).** routine soft-delete → each live step soft-deleted.
  The completion hard-delete leg is NOT built (see F3). `[FACT: service.ts]`
- **BR-RT-S2-6 · Reorder is ownership-scoped + contiguous (S2c A12: returns the live steps).** Owned ids get `step_order` 0..n in list
  position; foreign ids are ignored; omitted owned steps keep their prior order. Returns the routine's live steps in order. `[FACT: service.ts reorderSteps]`

**Completion ledger**
- **BR-RT-S3-1 · Upsert per (step, date) (UNIQUE).** `completeStep`/`skipStep` share `upsertCompletion` (find → update-or-create).
  The date defaults to `clock()` = today's UTC day. `[FACT: service.ts]`
- **BR-RT-S3-2 · Done clears skip; skip carries reason (RT-5/RT-8).** `[FACT: service.ts]`
- **BR-RT-S3-3 · Two skip mechanisms, distinct storage (RT-8).** Logged skip = completion row (`skipStep`). Pre-planned = merged,
  deduped, sorted `step.skip_dates` (`planSkipDates`), with no row and possibly a future date. `[FACT: service.ts]`
- **BR-RT-S3-4 · No orphan completion.** `loadStepOrThrow` runs before complete/skip/plan/edit. `CompletionNotFoundError` is thrown
  on edit/delete of an absent (step, date). `[FACT: service.ts]`
- **BR-RT-S3-5 · Ledger is hard-delete (RT-14/RT-17).** `completionsRepo` uses `softDelete:false`. `[FACT: service.ts]`
- **Note for derivation (g2 N2):** `editCompletion` may leave `skipped:false` + a stale `skip_reason`. Any derive MUST key on
  `skipped`. `[FACT: service.ts]`

**S2c — Floor conformance** (`delivery/PLAN-S2c-floor-conformance.md`)
- **BR-RT-S2c-1 · setLifecycle (ROU-17).** Zod-validated enum; missing/archived routine → `RoutineNotFoundError`, no write. Its effect
  on misses is the S5 acceptance-window procedure (BR-RT-S5a-3: paused/off neutralise only not-yet-real misses).
- **BR-RT-S2c-2 · Step append (A11).** An unordered `addStep` gets `step_order = max(live step_order) + 1` (soft-deleted steps don't
  count); an explicit `step_order` wins. Concurrent unordered adds may share a value; the 3-key sort keeps the order stable.
- **BR-RT-S2c-3 · Calendar-date shape (B1, rule 16).** Every date input (`completeStep`/`skipStep` `date`, `planSkipDates` dates,
  step `skip_dates`, the positional `date` of `editCompletion`/`deleteCompletion`) must match `YYYY-MM-DD`, else `ZodError`, no write.
  Shape only (not calendar validity), like tasks/projects/purposes.
- **BR-RT-S2c-4 · progress 0–100 (B2).** The override slot is an int 0–100 or null (projects parity; read as `/100` by `resolveProgress`
  consumers).
- *(⟲ tightened by BR-RT-S5a-1: the day-grain cadence allowlist)* **BR-RT-S2c-5 · RRULE validated at write (B3, [INTERP] approved).** A non-null `recurrence_rule` (incl. `''`) must parse with ical.js
  2.2.1 AND carry FREQ, else `InvalidRecurrenceRuleError`, no write. Parse + FREQ only, no semantic check. INTERVAL≤0 is coerced to 1 by
  the parser (accepted).
- **BR-RT-S2c-6 · Non-empty name/title (B16).** `.min(1)` on create and update.
- **Known edges (recorded at g2, not changed in S2c):**
  - `updateRoutine` still writes on an archived routine, including `lifecycle` (Repository `update` has no soft-delete guard; the
    ratified twin-repo behaviour, as `updateStep` g2 N1). `setLifecycle` is the guarded path.
  - `reorderSteps` updates every owned step in its own transaction (even unchanged ones), so it's not atomic and causes sync churn.
    This is as-built S2 behaviour; a candidate for a later slice.

**S3 — Run/drive** (`delivery/PLAN-S3-run-drive.md`)
- **BR-RT-S3d-1 · Drive first, stamp second (N7, rule 1).** No routine write precedes a successful entity call. The routine stamps its own
  occurrence row and never fires effects of its own (the habit/obligation fire theirs; `completeFocus` fires none, never `completeSession`, N9).
  Standard-task and session occurrences complete through the Sessions lifecycle (`stopTimer`/`completeSession`), which fires only the
  owner's declared effects (`work` declares none) (S5c, g2 B2).
- **BR-RT-S3d-2 · Targets (S5c, Q1/RT-4/D3).** Every step drives an entity. focus → `work` (task ref required) → a REGISTERED session sub-type
  (`exercise`→`workout`) → task ref → habit ref → check-off (no ref ⇒ a Task is created + linked) → `EntityUnavailableError`. An unregistered `step_type`
  falls through to the ref. Routines registers no sub-type (ADR-004 §3.1/§3.3; first-wins registry).
- **BR-RT-S3d-3 · Task step (S5c).** A **standard** task is the responsibility; each occurrence is a Tasks `work` session (Duties D3):
  - `runStep` starts it via `tasks.startTimer` (or adopts a timer started in Tasks) and attaches the step;
  - `completeStep` stops it via `tasks.stopTimer` (Tasks logs the time), or a **bare check** writes a completed `work` session (no time log);
  - the routine never completes the Task; a TERMINAL task or an unwired timer → `EntityUnavailableError`;
  - **one occurrence per day** (task and session steps): a done day creates no second session (re-complete re-stamps the row, BR-RT-S3-1;
    re-run returns `done`); a session the routine created is soft-deleted if linking/completing it then fails (g2 B1/NB3);
  - a half ref (only one of `entity_type`/`entity_id`) is not a check-off → `EntityUnavailableError` on drive.
  An **obligation** keeps `completeTask` (TK-7): `cancelled` → unavailable, `completed` → reflected (stamp only), `RecurrenceRegenError` ⇒
  stamped + `flag`. A **session step** completes per its owner's declared lifecycle and attaches its about-entity alongside the step.
- **BR-RT-S3d-4 · Habit step (HB-5, RT-3 reflects).** One native tick `logCompletion(habitId, {date})`. Done ⇔ `count >= target_count` ⇒ stamp;
  otherwise `'advanced'`, and any stale done stamp for the occurrence is removed. A repeat run is a patch (no +1). Absent `habits` dep or a
  missing/deleted habit → `EntityUnavailableError`; `BackfillWindowError` propagates with no stamp.
- **BR-RT-S3d-5 · Focus step.**
  - `runStep` starts `startFocus({})` + an instance attachment to the `routine_step`, or re-enters a running one.
  - `completeStep` completes via `completeFocus` and stamps `round(duration_seconds/60)`, which overrides a caller's duration.
  - After completion the attachment is **detached**, best-effort. This is the workaround for the spine staying `in_progress`, a Sessions gap
    owned by sessions-rescope #62.
  - A completed attached focus is stamped only for the UTC day it completed (the stamp-retry path).
  - A cancel is never a done.
  - A running focus belongs to the UTC day it **started**: completing it stamps that day (a session crossing UTC midnight, 21:00 in
    Brasília, keeps its work). It is treated as abandoned (cancelled, then detached; if the cancel fails nothing is detached) only when it started
    **before yesterday**, judged against now, never against a caller-supplied date.
  - A per-step in-flight lock serializes overlapping drives of the same step.
- **BR-RT-S3d-6 · Re-run.** A focus step with a done row returns it. Task/habit steps re-reflect their entity (no second effect: tasks fan out only
  on a fresh transition, habits dedup on `completed:<date>`). A logged skip flips to done on a successful drive (BR-RT-S3-2).

**S4 — Policy evaluation** (`delivery/PLAN-S4-policy-evaluation.md`)
- **BR-RT-S4e-1 · The policy is the user's.** Read via `prefs?.policyFor(routineId)`. Routines hardcodes no policy values (intake Q2/Q3; the shipped
  default = Spaces templates/presets, `intake/spaces.md:178-185`). No policy ⇒ `policy_source:'undefined'`: only all-done ⇒ `done` and none-done ⇒
  `not_started`; anything else `partial` (flagged).
- **BR-RT-S4e-2 · As-of-date step set.** Steps created on/before D and not deleted on/before D, plus any step with a ledger row on D. No retroactive change.
- **BR-RT-S4e-3 · Done = the routine's occurrence row OR the driven entity done as of D.** Reflection (S5c): an **obligation** task
  completed with `utcDay(completed_at) <= D`; a habit's `CalendarDay.done` for D. A standard task's occurrences are recorded by the routine's
  own row (its `work` sessions), so the Task's own status never reflects. Reflection only adds; later entity changes never rewrite D. Done
  is checked before neutral.
- **BR-RT-S4e-4 · Neutral.** A planned skip (`skip_dates`), or a logged skip when the user's `miss.logged_skip === 'neutral'`, is excluded from `applicable`.
- **BR-RT-S4e-5 · Judgment (user policy).** `applicable = 0` ⇒ `not_started`. all_or_nothing: nothing undone. threshold: exact ratio
  `done·100 >= percent·applicable` (`percent` display-only; non-finite → `InvalidRoutinePolicyError`; the user's 0 honoured). required_node:
  every applicable required step done; none applicable ⇒ `'undefined'` + `no_required_steps` | `required_steps_all_neutral`. Unmet with 0 done ⇒
  `not_started`, else `partial`. An unknown kind → `InvalidRoutinePolicyError`.
- **BR-RT-S4e-6 · Read-only + RT-5.** No writes, no effects; lifecycle doesn't change the evaluation. Every done step is always listed. **Known
  limits:** habit done uses the current `target_count`; archived routines' past dates aren't served. **S5c limits (g2):** a running `work`
  occurrence is stamped on the day `completeStep` names, with no abandon rule (stopping/cancelling a stale timer is Tasks'); two steps sharing one
  Task can adopt the same running `work` session (RT-10 sharing).

**S5 — Progress + analytics** (`delivery/PLAN-S5-progress-analytics.md`)
- **BR-RT-S5a-1 · Minimal day-grain cadence allowlist (RT-11).** `recurrence_rule` must be one of:
  - `DAILY[;INTERVAL]`;
  - `WEEKLY[;INTERVAL][;BYDAY=weekdays]`;
  - `MONTHLY[;INTERVAL][;BYMONTHDAY=±1..31 | ;BYDAY=±1..5 ordinal weekdays]`;
  - `YEARLY[;INTERVAL][;BYMONTH=1..12[;BYMONTHDAY | ;BYDAY ordinal]]` (a possible month/day pair);
  - (+ COUNT/UNTIL/WKST).

  Each form was probed across 9 DTSTARTs with no hang/error. Anything else (sub-daily, BYSETPOS, BYYEARDAY, BYWEEKNO, DAILY BY-parts, 0 values, ordinals
  outside ±1..5, iterator-construction errors) → `InvalidRecurrenceRuleError` **at write and before every expansion**. ical.js 2.2.1 hangs on some valid
  RFC shapes, weekday-dependently. This tightens BR-RT-S2c-5. The every-yield filter also checks the nth-weekday ordinal.
- **BR-RT-S5a-2 · Occurrences.** Expanded with ical.js from DTSTART = the creation day. The rule's explicit BY-parts filter every yield (phantom start +
  library mis-yields); COUNT is rebuilt +1 after a phantom drop; dates come from the calendar fields; future dates are never judged. Editing the rule
  re-derives history.
- **BR-RT-S5a-3 · Occurrence status.** Each day is judged by S4's day judgment, then:
  - done → done; `applicable = 0` → neutral;
  - a **paused/off** routine → neutral unless already a real miss (RT-6 via the acceptance window);
  - **today** undone → pending;
  - no window/policy, or an S4 day S4 couldn't judge → **unjudged** (flagged; no window invented);
  - inside the window → pending; beyond it → **missed**, which is final (RT-6, business-rules.md:120).
- **BR-RT-S5a-4 · Streak (policy-derived, ROU-16).** `current`: newest→oldest, done +1, neutral/pending skipped, missed breaks, unjudged stops + flags.
  `longest`: missed/unjudged end a run. `total` = done count. `policy_source:'undefined'` iff no policy or any unjudged occurrence.
- **BR-RT-S5a-5 · Rate / ranking / comparison.** `rate = done/(done+missed)`, null when nothing was judged. Steps are ranked over judged days (rate desc,
  done desc, sequence). The comparison is the preceding equal-length range. Read-only, no cache; one ledger read per call.
- **BR-RT-S5a-6 · progress().** `resolveProgress(stored/100, all-time rate)`: the stored 0–100 override wins (ADR-011 M3); null when nothing is judged
  or unscheduled. A routine with no rule is `unscheduled` (no cadence invented).
- **Recorded limits:** the obligation-only reflection limit (a completed obligation reads done on later days until reopened) carries into streak/rate/progress; archived routines aren't served; the ical.js helpers + hang guard
  aren't shared with tasks (tasks' `nextOccurrence` is exposed: Victor).

## 2. Rule taxonomy
| Category | Rules | Enforced by | Default when absent | Who changes it | Reset / delete semantics |
|---|---|---|---|---|---|
| Shape validation | S1-1, S2-1, S2c-3/4/5/6 | Zod at the service boundary (+ RRULE parse, registry check) | NN defaults backfilled (S1-2, S2-3) | code (tuples ≡ CHECK, DB-9) | — |
| Referential integrity (app-layer, no FK) | S2-2, S2-5, S3-4 | `load*OrThrow` guards + explicit cascade | fail loud | code | soft (routine/step) · hard (ledger) |
| Ledger semantics | S3-1, S3-2, S3-3, S3-5 | `upsertCompletion`, skip split | date = UTC today | user (per occurrence) | row flips in place; delete = hard |
| Derive-not-cache | S1-3 | absence of counters | `progress` NULL ⇒ derive (unbuilt) | — | n/a |
| Policy (completion / miss) | S5a-1…S5a-6 | cadence allowlist · occurrences · occurrence status · streak · rate/ranking/comparison · progress | EXPLICIT (RT-6/7/11/14/19, Q3/Q4, ROU-13/15/16/18, ADR-011 M3) + INTERP (ranking, comparison, DTSTART) | PLAN-S5 | ✅ |
| S4e-1…S4e-6 | `evaluateRoutine` over the user's policy (prefs port) | **no routines-side default**: none ⇒ `policy_source:'undefined'` (the shipped default = Spaces templates/presets, SP5) | the user (Spaces personalization) | derived on read, never stored |
| Fan-out (effects / provider / contributions) | — **not enforced** | — | emit-only, isolated (interp §4.2/§4.13) | — | — |

## 3. Rule inventory — explicit · implicit · invented · findings

| ID | Rule | Type | Source | Implemented? |
|---|---|---|---|---|
| S1-1…S1-7 | routine CRUD rules above | EXPLICIT | RT-2/14/17/18/19 · interp §4.3/4.7/4.8 | ✅ |
| S2-1…S2-6 | step rules above | EXPLICIT (S2-6 ordering semantics = IMPLICIT, ratified g2) | RT-2/3/4/17 · interp §4.5/4.6/4.9 | ✅ (S2-5 partial) |
| S3-1…S3-5 | ledger rules above | EXPLICIT | RT-5/8/14/17/18 | ✅ |
| RT-3 / ADR-004 §3.2.4 | a driven step completes its entity once, via the entity's API; no second entity occurrence/effect | EXPLICIT | business-rules.md RT-3; ADR-004 §3.2.4 | ✅ S3 (BR-RT-S3d-1) |
| S5a-1…S5a-6 | cadence allowlist · occurrences · occurrence status · streak · rate/ranking/comparison · progress | EXPLICIT (RT-6/7/11/14/19, Q3/Q4, ROU-13/15/16/18, ADR-011 M3) + INTERP (ranking, comparison, DTSTART) | PLAN-S5 | ✅ |
| S4e-1…S4e-6 | user policy · as-of set · done = row OR entity-as-of · neutral · judgment · read-only | EXPLICIT (intake Q2/Q3, RT-5/8/14, U1) + INTERP-minimal (`miss.logged_skip`) | PLAN-S4 | ✅ |
| S3d-1…S3d-6 | drive-then-stamp · target precedence · task TERMINAL · habit HB-5 reflect · focus lifecycle + detach · re-run | EXPLICIT (RT-3, ADR-004 §3.2.1/§3.2.4, HB-5, TAS-23, TERMINAL convention) | PLAN-S3 | ✅ |
| S2c-1…S2c-6 | setLifecycle · step append · date shape · progress 0–100 · RRULE parse+FREQ · non-empty names | EXPLICIT (S2c-5 [INTERP] approved) | PLAN-S2c; rule 16; ROU-17/29 | ✅ |
| RT-6 | paused/off generate no misses · acceptance window | EXPLICIT | RT-6 | ✅ S5 (acceptance-window procedure) |
| RT-5/7 | policy-derived done / streak | EXPLICIT | RT-5, RT-7 | ✅ S4 done + S5 streak |
| RT-15/16 | notes via pages, tags via entity_tags (`routine` / `routine_step`, D2) | EXPLICIT | RT-15/16 · interp §5 D2 | ❌ not built (registry tokens exist: `_registry.ts:45-46`) |
| RT-12/13 | purpose contribution · provider registration | EXPLICIT | RT-12/13 | ❌ not built |
| D1 | `tasks: TasksService` is a **required** dep | EXPLICIT (decision) | interp §5 D1 | ✅ S3 |

**Findings (reconciliation inputs; none fixed at baseline):**
- **F1 · Drive leg — RESOLVED in S3 (BR-RT-S3d-1…6).** *(was:)* **Drive leg missing (RT-3), re-classified per Documentation Gate U1.** A ledger row for a driven step is aligned:
  it is the routine's own occurrence record, and ADR-004 §3.2.4 scopes "no double-count" to one XP / one habit-occurrence per
  event. The gap is that `completeStep` writes the row **without driving the entity** (no delegate to the habit/task/session
  API). The run/drive slice owes that leg, and the routine side must never fire the entity's effects.
- **F2 · Date format — RESOLVED in S2c (BR-RT-S2c-3).** *(was: unchecked)* Every date input now matches `YYYY-MM-DD` (shape only, the shipped convention).
- **F3 · Ledger kept on soft-delete — RE-CLASSIFIED ✅ aligned (Documentation Gate A10).** `removeStep`/`archiveRoutine`
  leave the step's completion rows in place. That is correct: archive/soft-delete preserves the ledger (RT-17; ROU-03). Completions
  hard-delete only with a hard PURGE of their step (`routines.ts:103`), and that purge path is the only owed piece.
- **F4 · `setLifecycle` — RESOLVED in S2c (BR-RT-S2c-1).** *(was: absent)* Lifecycle changes only through `updateRoutine`. The governing S1 lists ROU-17.
- **F5 · Factory deps — mostly RESOLVED.** `registry` (S2c), `tasks`/`sessions`/`habits?` (S3), `prefs?` (S4) landed; `spaces`/`notes`/`effects?` land in S7–S8.
- **F6 · Day helper — RESOLVED in S3** (default clock = tasks' public `utcDay`).
- **F7 · Stale aspect prose (flag, interp §4.14).** The aspect docs still name `routine_actions` / `routine_action` (e.g.
  business-rules.md RT-1/RT-8/RT-16/RT-17). The code and `_registry.ts` use the reframe names (`routine_step`, plus `routine`).
  The code is right; the prose lags.
- **F8 · Layer CLAUDE.md — RESOLVED in S2c.** *(was: stale)* `services/routines/CLAUDE.md` claims no code lives there.
- **INVENTED (codified without a requirement):** S2-6's "omitted owned steps keep their prior order" (g2-ratified, documented) ·
  `deleteCompletion` not checking step existence (asymmetric with `editCompletion`; harmless since it only finds by (step, date)).

## 4. Validation & edge cases
- Missing `name` (routine) / `title` (step) → `ZodError`, no write. Off-tuple enum → `ZodError`.
- `addStep` on an archived routine → `RoutineNotFoundError` (findById excludes soft-deleted).
- complete/skip/plan on a soft-deleted step → `StepNotFoundError`. `updateStep` on a soft-deleted step **succeeds** (re-stamps, g2 N1).
- Complete then skip on the same (step, date) → one row flipped to skipped (and back). Never a duplicate (UNIQUE + upsert).
- `planSkipDates` with duplicates or an existing date → merged set, deduped, lexically sorted (lexical order is correct because dates are YYYY-MM-DD-shaped, S2c-3).
- Malformed `skip_dates` JSON in the DB → read as `null` (no throw).
- `reorderSteps` with a foreign id → ignored. With a partial list → omitted owned steps keep their order (possible ties).
- Default date = **UTC** day. Near midnight in BRT (UTC-3) a completion lands on the next calendar day. This is consistent with
  the platform UTC-day convention, but date code needs TZ-forced tests (the gate is timezone-blind).

## 5. Terminal states
- **Success:** a typed entity returned (`Routine` / `RoutineStep` / `RoutineCompletion`) `RoutineStep[]` (reorder, S2c), or `void` (archive/remove/delete).
- **Empty:** `[]` from list readers; `null` from `getRoutine`.
- **Validation error:** `ZodError` · `InvalidRecurrenceRuleError` (S2c) · `UnknownEntityType` (S2c).
- **Undrivable target:** `EntityUnavailableError` (S3). **Run states:** `done` · `advanced` (habit below target) · `in_progress` (focus running).
- **Invalid policy:** `InvalidRoutinePolicyError` (S4: unknown completion kind / non-finite threshold).
- **Not found:** `RoutineNotFoundError` · `StepNotFoundError` · `CompletionNotFoundError` · generic `Error('Row not found: <id>')`
  from `updateRoutine`/`updateStep` (Repository).
- **Not yet representable:** `OutsideAcceptanceWindow`, `ProviderEmitFailed` (governing
  contract; unbuilt).

## 6. Failure behavior (fail loud)
Typed errors are thrown before any write for missing parents (routine → step → completion). There are no swallowing catches;
the catches are `parseJsonArray`'s malformed-JSON → `null` (a documented degrade at a read boundary) and `assertValidRrule`, which
catches the parser's throw only to rethrow the typed `InvalidRecurrenceRuleError` `[FACT: service.ts]`. Driven-target failures are loud (`EntityUnavailableError`, typed, before any routine write; BR-RT-S3d-2). The swallowed errors are documented: the best-effort
detach/cancel after a durable write (BR-RT-S3d-5), and the S4 reflection's `Habit not found` → no reflection (the ledger row still counts;
any other error rethrows, BR-RT-S4e-3).

## Completion checklist
- [x] §1 invariants with [FACT] · [x] §4 validation/edge · [x] §6 fail-loud
- [x] §3 inventory (explicit / implicit / INVENTED classified) + findings · [x] §5 terminal states enumerated
- [x] (DEEP) §2 taxonomy · layer-map expected-vs-real = current-spec §4 · adherence = §3 table
- [x] inherits docs/core; no child rule contradicts a parent · no load-bearing UNKNOWN (open items are reconciliation inputs)
