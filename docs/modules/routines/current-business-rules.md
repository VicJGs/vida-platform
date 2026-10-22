# Current Business Rules — routines   (level: module · tier: DEEP)
> Language: English.
> Coverage: 8/8 files read — **full** (same set as `current-spec.md`).
> Inherits: `docs/core/business-rules.md` + `docs/core/conventions.md` (constitution) → this module. Intent authority:
> `docs/features/routines/{identity,business-rules,contract,structure-data,conventions}.md` (RT-1…RT-19) + the GOVERNING
> `delivery/interpretation.md` (main's 9-slice set, Victor 2026-10-14; implicit rules cited as **interp §4.n**).
> Last refreshed: 2026-10-21 · entity-rescope **Step 0 BASELINE** (worktree @ `0456c32`). Source of truth = the code (§XXIX).

> **Baseline note.** This doc records what the CODE enforces. The `BR-RT-S1/S2/S3-n` IDs are kept stable from the
> as-built slices so existing cites keep resolving. They are **as-built labels**, not the governing slice numbers. Gaps
> against the governing docs are FLAGGED here (§3 "Findings") as reconciliation inputs for re-scope Step 4. They are not fixed here.

## 1. Invariants — what is ALWAYS / NEVER true

**Routine definition**
- **BR-RT-S1-1 · Enum validation before write.** `lifecycle`, `measurement_kind` and `binding_mode` are Zod-validated
  (`z.enum` over the `@vida/types` tuples); an off-tuple value rejects with no row written.
  `[FACT: validators/routine.ts:19,22,29-31; service.ts:169-177]`
- **BR-RT-S1-2 · Faithful create-echo (interp §4.8).** `serializeRoutine` backfills every NN default (`lifecycle:'active'`,
  `measurement_kind:'rate'`, `sort_order:0`) and coalesces every nullable to `null`, so the echoed row never lies. `[FACT: service.ts:131-141]`
- **BR-RT-S1-3 · No cached streak/progress (RT-14/RT-19, interp §4.3).** `progress` is the caller's value or `null`. It is never a
  service-maintained counter. Derivation is unbuilt. `[FACT: service.ts:138; db/schema/routines.ts:59]`
- **BR-RT-S1-4 · Partial update never blanks.** `updateRoutine` spreads only the keys Zod `.partial()` carried. `[FACT: service.ts:143,174-177]`
- **BR-RT-S1-5 · Archive = soft-delete, ledger preserved (RT-17).** `[FACT: service.ts:179-187]`
- **BR-RT-S1-6 · Explicit soft-delete filter on list (interp §4.7).** `listRoutines` prepends `isNull(deleted_at)` because
  `findWhere` bypasses it. `[FACT: service.ts:194-199]`
- **BR-RT-S1-7 · Local-first enqueue (RT-18).** Every write co-transactionally enqueues `sync_queue` (Repository). Verified by the
  persistence probe in the test file. `[FACT: __tests__/routines-service.test.ts S1 block]`

**Steps**
- **BR-RT-S2-1 · Polymorphic step, OPEN vocab (RT-3/RT-4, interp §4.5).** `step_type` is a plain string (no enum, no registry check
  yet); `entity_type`/`entity_id` are nullable. `[FACT: validators/routine.ts:45-49; service.ts:146-158]`
- **BR-RT-S2-2 · No orphan step.** `addStep` throws `RoutineNotFoundError` for a missing/archived routine. `[FACT: service.ts:85-89,202-206]`
- **BR-RT-S2-3 · Faithful step echo + `skip_dates` JSON (interp §4.8/§4.9).** Plain TEXT, `JSON.stringify` on write and defensive
  `parseJsonArray` on read (malformed → `null`). `[FACT: service.ts:52-59,66-70,146-158]`
- **BR-RT-S2-4 · Partial step update never blanks**, and `skip_dates` set/clear is honored via `'skip_dates' in p`. `[FACT: service.ts:160-165]`
- **BR-RT-S2-5 · Archive cascades to live steps (RT-17, interp §4.6, partial).** routine soft-delete → each live step soft-deleted.
  The completion hard-delete leg is NOT built (see F3). `[FACT: service.ts:179-187]`
- **BR-RT-S2-6 · Reorder is ownership-scoped + contiguous.** Owned ids get `step_order` 0..n in list position; foreign ids are
  ignored; omitted owned steps keep their prior order. `[FACT: service.ts:217-229]`

**Completion ledger**
- **BR-RT-S3-1 · Upsert per (step, date) (UNIQUE).** `completeStep`/`skipStep` share `upsertCompletion` (find → update-or-create).
  The date defaults to `clock()` = today's UTC day. `[FACT: service.ts:78,97-128]`
- **BR-RT-S3-2 · Done clears skip; skip carries reason (RT-5/RT-8).** `[FACT: service.ts:239-257]`
- **BR-RT-S3-3 · Two skip mechanisms, distinct storage (RT-8).** Logged skip = completion row (`skipStep`). Pre-planned = merged,
  deduped, sorted `step.skip_dates` (`planSkipDates`), with no row and possibly a future date. `[FACT: service.ts:249-266]`
- **BR-RT-S3-4 · No orphan completion.** `loadStepOrThrow` runs before complete/skip/plan/edit. `CompletionNotFoundError` is thrown
  on edit/delete of an absent (step, date). `[FACT: service.ts:91-95,268-284]`
- **BR-RT-S3-5 · Ledger is hard-delete (RT-14/RT-17).** `completionsRepo` uses `softDelete:false`. `[FACT: service.ts:83,280-284]`
- **Note for derivation (g2 N2):** `editCompletion` may leave `skipped:false` + a stale `skip_reason`. Any derive MUST key on
  `skipped`. `[FACT: service.ts:268-278]`

## 2. Rule taxonomy
| Category | Rules | Enforced by | Default when absent | Who changes it | Reset / delete semantics |
|---|---|---|---|---|---|
| Shape validation | S1-1, S2-1 | Zod at the service boundary | NN defaults backfilled (S1-2, S2-3) | code (tuples ≡ CHECK, DB-9) | — |
| Referential integrity (app-layer, no FK) | S2-2, S2-5, S3-4 | `load*OrThrow` guards + explicit cascade | fail loud | code | soft (routine/step) · hard (ledger) |
| Ledger semantics | S3-1, S3-2, S3-3, S3-5 | `upsertCompletion`, skip split | date = UTC today | user (per occurrence) | row flips in place; delete = hard |
| Derive-not-cache | S1-3 | absence of counters | `progress` NULL ⇒ derive (unbuilt) | — | n/a |
| Policy (completion / miss / acceptance) | — **not enforced** | — | governing docs: shipped default + Preferences config (interp §4.4) | user via Preferences | — |
| Fan-out (effects / provider / contributions) | — **not enforced** | — | emit-only, isolated (interp §4.2/§4.13) | — | — |

## 3. Rule inventory — explicit · implicit · invented · findings

| ID | Rule | Type | Source | Implemented? |
|---|---|---|---|---|
| S1-1…S1-7 | routine CRUD rules above | EXPLICIT | RT-2/14/17/18/19 · interp §4.3/4.7/4.8 | ✅ |
| S2-1…S2-6 | step rules above | EXPLICIT (S2-6 ordering semantics = IMPLICIT, ratified g2) | RT-2/3/4/17 · interp §4.5/4.6/4.9 | ✅ (S2-5 partial) |
| S3-1…S3-5 | ledger rules above | EXPLICIT | RT-5/8/14/17/18 | ✅ |
| RT-3 / ADR-004 §3.2.4 | a driven step completes its entity once, via the entity's API; no second entity occurrence/effect | EXPLICIT | business-rules.md RT-3; ADR-004 §3.2.4 | ⚠ drive leg not built (F1) |
| RT-6 | paused/off generate no misses · acceptance window | EXPLICIT | RT-6 | ❌ not built (lifecycle is inert data) |
| RT-5/7 | policy-derived done / streak | EXPLICIT | RT-5, RT-7 | ❌ not built |
| RT-15/16 | notes via pages, tags via entity_tags (`routine` / `routine_step`, D2) | EXPLICIT | RT-15/16 · interp §5 D2 | ❌ not built (registry tokens exist: `_registry.ts:45-46`) |
| RT-12/13 | purpose contribution · provider registration | EXPLICIT | RT-12/13 | ❌ not built |
| D1 | `tasks: TasksService` is a **required** dep | EXPLICIT (decision) | interp §5 D1 | ❌ not in deps (F5) |

**Findings (reconciliation inputs; none fixed at baseline):**
- **F1 · Drive leg missing (RT-3), re-classified per Documentation Gate U1.** A ledger row for a driven step is aligned:
  it is the routine's own occurrence record, and ADR-004 §3.2.4 scopes "no double-count" to one XP / one habit-occurrence per
  event. The gap is that `completeStep` writes the row **without driving the entity** (no delegate to the habit/task/session
  API). The run/drive slice owes that leg, and the routine side must never fire the entity's effects.
- **F2 · Date format unchecked.** `CalendarDate = z.string()` accepts any string as `date` / `skip_dates` entries
  `[FACT: validators/routine.ts:65]`. ADR-002 §2.8 fixes `YYYY-MM-DD`, and mod-tasks conformed its date validity to it (the
  shipped convention). → likely ❌.
- **F3 · Ledger kept on soft-delete — RE-CLASSIFIED ✅ aligned (Documentation Gate A10).** `removeStep`/`archiveRoutine`
  leave the step's completion rows in place. That is correct: archive/soft-delete preserves the ledger (RT-17; ROU-03). Completions
  hard-delete only with a hard PURGE of their step (`routines.ts:103`), and that purge path is the only owed piece.
- **F4 · No `setLifecycle` (ROU-17).** Lifecycle changes only through `updateRoutine`. The governing S1 lists ROU-17.
- **F5 · Factory deps short of the governing shape.** No `tasks` (required, D1), `spaces`, `notes`, `registry`, `sessions`, or
  deny-safe optionals `[FACT: types.ts:25-30]`.
- **F6 · Duplicated day helper.** `clock` inlines `toISOString().slice(0,10)` while `services/tasks` exports `utcDay`, the
  documented cross-module "day of a timestamp" convention `[FACT: services/tasks/service.ts:178-199]`. Same semantics (UTC);
  INVENTED duplication, minor.
- **F7 · Stale aspect prose (flag, interp §4.14).** The aspect docs still name `routine_actions` / `routine_action` (e.g.
  business-rules.md RT-1/RT-8/RT-16/RT-17). The code and `_registry.ts` use the reframe names (`routine_step`, plus `routine`).
  The code is right; the prose lags.
- **F8 · Stale layer CLAUDE.md.** `services/routines/CLAUDE.md` claims no code lives there `[FACT: :15-16]`.
- **INVENTED (codified without a requirement):** S2-6's "omitted owned steps keep their prior order" (g2-ratified, documented) ·
  `deleteCompletion` not checking step existence (asymmetric with `editCompletion`; harmless since it only finds by (step, date)).

## 4. Validation & edge cases
- Missing `name` (routine) / `title` (step) → `ZodError`, no write. Off-tuple enum → `ZodError`.
- `addStep` on an archived routine → `RoutineNotFoundError` (findById excludes soft-deleted).
- complete/skip/plan on a soft-deleted step → `StepNotFoundError`. `updateStep` on a soft-deleted step **succeeds** (re-stamps, g2 N1).
- Complete then skip on the same (step, date) → one row flipped to skipped (and back). Never a duplicate (UNIQUE + upsert).
- `planSkipDates` with duplicates or an existing date → merged set, deduped, lexically sorted (correct for valid YYYY-MM-DD only, see F2).
- Malformed `skip_dates` JSON in the DB → read as `null` (no throw).
- `reorderSteps` with a foreign id → ignored. With a partial list → omitted owned steps keep their order (possible ties).
- Default date = **UTC** day. Near midnight in BRT (UTC-3) a completion lands on the next calendar day. This is consistent with
  the platform UTC-day convention, but date code needs TZ-forced tests (the gate is timezone-blind).

## 5. Terminal states
- **Success:** a typed entity returned (`Routine` / `RoutineStep` / `RoutineCompletion`) or `void` (archive/remove/reorder/delete).
- **Empty:** `[]` from list readers; `null` from `getRoutine`.
- **Validation error:** `ZodError`.
- **Not found:** `RoutineNotFoundError` · `StepNotFoundError` · `CompletionNotFoundError` · generic `Error('Row not found: <id>')`
  from `updateRoutine`/`updateStep` (Repository).
- **Not yet representable:** `EntityUnavailable`, `OutsideAcceptanceWindow`, `PolicyUndefined`, `ProviderEmitFailed` (governing
  contract; unbuilt).

## 6. Failure behavior (fail loud)
Typed errors are thrown before any write for missing parents (routine → step → completion). There are no swallowing catches;
the only `catch` is `parseJsonArray`'s malformed-JSON → `null`, a documented degrade at a read boundary `[FACT: service.ts:52-59]`.
Two failure modes are not yet loud: the RT-3 double-count (F1) and invalid date strings (F2). Both are findings, not accepted behavior.

## Completion checklist
- [x] §1 invariants with [FACT] · [x] §4 validation/edge · [x] §6 fail-loud
- [x] §3 inventory (explicit / implicit / INVENTED classified) + findings · [x] §5 terminal states enumerated
- [x] (DEEP) §2 taxonomy · layer-map expected-vs-real = current-spec §4 · adherence = §3 table
- [x] inherits docs/core; no child rule contradicts a parent · no load-bearing UNKNOWN (open items are reconciliation inputs)
