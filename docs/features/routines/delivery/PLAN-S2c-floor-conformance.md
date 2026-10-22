<!-- Forward spec — Routines ① S2c · Per-Step Build Gate (§XXVI) · authored before implementation -->
<!-- Re-scope slice: fixes to the built S1/S2 floor, from the reconciliation ledger. Every item rides a shipped precedent
     or is labelled [INTERP] with its grounding. -->

# PLAN S2c — Floor conformance (fixes to the built S1/S2 scope)

> Slice-map S2c (approved at the Re-scope Gate, 2026-10-21). ROU-17 (`setLifecycle`), ROU-29 (validation) + ledger rows
> A6 · A8 · A10 · A11 · A12 · B1 · B2 · B3 · B16 · D2–D5 · D8. Grounded in `delivery/interpretation.md` (R2, rules 7/16, N3),
> `delivery/reconciliation.md`, the amended `delivery/seam-contract.md`, and the shipped precedents below. Closes with the
> live-store Verification Gate.

## 1a. Context docs (§XXVI.1a)
`docs/modules/routines/current-{spec,business-rules}.md` were refreshed at the Step-0 baseline (`58b1d1f`). **No code has changed
since** (Steps 1–5 were docs-only), so they are **current**. §XXIX re-promotes them after this slice.

## Grounding — patterns in use (§XXIV, 3+ implementations read)
- **Calendar-date validation:** `z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD')` in tasks `validators/task.ts:21-25`,
  projects `validators/project.ts:27-29`, purposes `validators/purpose.ts:38-40`, notes `validators/note.ts:21,32`. → rule 16, ADR-002 §2.8.
- **Progress override range:** projects `ProgressSchema = z.number().int().min(0).max(100).nullable().optional()`
  `validators/project.ts:25`. The 0–100 → [0,1] read happens at the consumer (`projects/service.ts:483`).
- **Non-empty title/name:** tasks `title: z.string().min(1)` `validators/task.ts:33`; projects `validators/project.ts:36,81,107`.
- **Entity-type validation:** sessions `if (!entityRegistry.isRegistered(entityType)) throw new UnknownEntityType(entityType)`
  `services/sessions/service.ts:393`. `UnknownEntityType` is the foundation error `foundation/spaces/types.ts:37-42`. Registry
  factory `createTaggableTypeRegistry()` `foundation/spaces/registry.ts:14`.
- **Ordering:** tasks sorts `sort_order`, then `created_at`, then `byCodepoint(id)` for a deterministic, platform-independent order
  `services/tasks/service.ts:237,768`.
- **Typed not-found before a write:** the module's own `loadRoutineOrThrow` → `RoutineNotFoundError` `services/routines/service.ts:85-89`.
- **RRULE parser:** canonical `ical.js@2.2.1` (ADR-001:137; BR-TK-S5-2). **Verified against ical.js 2.2.1 (2026-10-21, Node 24):**
  - `ICAL.Recur.fromString` **throws** on invalid part values: `'FREQ=BOGUS'`, `'FREQ=DAILY;COUNT=abc'`, `'FREQ=DAILY;BYDAY=XX'`,
    lowercase `'freq=daily'`.
  - It parses **silently with `freq = null`** when FREQ is missing: `''`, `'NOT A RULE'`, `'BYDAY=MO'`, and the prefixed
    `'RRULE:FREQ=DAILY'`. A later `iterator().next()` on such a rule throws a TypeError.
  - It **coerces** `INTERVAL=0` (or ≤0) to 1, and accepts it.
  - So the tasks comment (`services/tasks/service.ts:161`) is right for invalid values. The only gap is the missing-FREQ case.

## What is already built (the floor this slice corrects)
`createRoutinesService({db, deviceId, clock?})`, with S1 routine CRUD, S2 step CRUD + ordering, and the ledger (as-built S3),
over migration 018 (`services/routines/{service,types,index}.ts`, `validators/routine.ts`). 28/28 live-store tests green on Node 24.

## Scope (in S2c)
| # | Ledger | Change | Grounding |
|---|---|---|---|
| 1 | A6 | **`setLifecycle(id, lifecycle): Promise<Routine>`**: Zod-validate the enum, `loadRoutineOrThrow` (archived/missing → `RoutineNotFoundError`), update, return the faithful row. No behavioural effect yet (miss suppression = S5) | seam :38 · ROU-17 · module's typed-guard pattern |
| 2 | A10 | **`entity_type` validated against `TaggableTypeRegistry`** on `addStep` and `updateStep` whenever a non-null `entity_type` is passed. Unregistered → `UnknownEntityType` (foundation error), no write. Adds the **required** `registry: TaggableTypeRegistry` dep (seam Factory) | R2 · N3 · sessions `:393` precedent |
| 3 | B1 | **Calendar-date format** (shape only, `YYYY-MM-DD`, precedent parity: not a calendar-validity check) on `CompleteStepSchema.date`, `SkipStepSchema.date`, `PlanSkipDatesSchema.dates[]`, `RoutineStepFields.skip_dates[]`. Also the `date` **argument** of `editCompletion`/`deleteCompletion` (a positional string today) | rule 16 · 4 shipped precedents |
| 4 | B2 | **`progress`** = `z.number().int().min(0).max(100).nullable()` | projects `ProgressSchema` |
| 5 | B3 | **`recurrence_rule` parse-validated at write** (create/update) via `ICAL.Recur.fromString`. Invalid → `InvalidRecurrenceRuleError(rule)` (new typed error), no write. `null` always allowed | **[INTERP]** constitution §5 fail-loud + ADR-002:1160 RFC-5545 + canonical parser. Tasks defers detection to regen (TAS-23), but routines reads its rule on every `dueIn`/`summary`/evaluate (S5/S9), so a bad rule would break providers silently. Approved as ledger row B3 |
| 6 | B16 | **Non-empty `name` / `title`** (`.min(1)`) on create and update. Put it on **both** the base fields **and** the `.extend({name|title})` overrides in `CreateRoutineSchema`/`AddStepSchema` (`validators/routine.ts:35-37,56-58`), because the override would bypass a base-only `.min(1)` | tasks/projects convention |
| 7 | A8 | **`listRoutines` sorted** `sort_order`, then `created_at`, then `byCodepoint(id)` | tasks `:237,768` precedent |
| 8 | A11 | **`addStep` appends**: when `step_order` is not given, `step_order = (max(live step_order) ?? -1) + 1` over the routine's live steps (the explicit `isNull(deleted_at)` read, rule 7). `listSteps` sorts `step_order`, then `created_at`, then `byCodepoint(id)` | approved seam `seam-contract.md:50` + slice-map S2c. *(A draft §XXVIII deviation ("default 0 + created_at tie-break") was withdrawn at g1: after `reorderSteps` compacts orders to 0..n-1, a default-0 add would land 2nd, not last; and same-ms inserts tie on `created_at` with a random-within-ms UUIDv7, `db/repository.ts:66-80`)* |
| 9 | A12 | **`reorderSteps` returns `Promise<RoutineStep[]>`** (the routine's live steps after reorder, via the `listSteps` read) | seam :46 |
| 10 | D2–D5, D8 + seam | **Back-fills:** the seam `setLifecycle` annotation "paused/off generate no misses (S2c)" → "(miss suppression lands with S5's miss derivation; vacuous until then)" so the seam and this PLAN agree; `services/routines/CLAUDE.md` (stale "no code" → as-built status + pattern), `types.ts` header (superseded 8-slice numbering → governing S-numbers), test titles' retired `IR-n` labels → interp §4.n / RT-n, `db/tests/routines-introspection.test.ts:13-15` note (DB-11 done), `archiveRoutine` comment (`service.ts:180-182`) | ledger D2–D5, D8 |

**Considered, not added (no doc grounding):** rejecting a half polymorphic ref (`entity_type` without `entity_id` or vice versa).
No routines doc or shipped precedent states it, so it is not invented here.

## Operations (net-new / changed signatures)
```ts
// types.ts — RoutinesServiceDeps
registry: TaggableTypeRegistry            // NEW, required (seam Factory). Validation only; types are pre-seeded
// RoutinesService
setLifecycle(id: string, lifecycle: RoutineLifecycle): Promise<Routine>        // NEW (A6)
reorderSteps(routineId: string, orderedStepIds: string[]): Promise<RoutineStep[]>  // CHANGED: void → RoutineStep[] (A12)
// errors
export class InvalidRecurrenceRuleError extends Error { constructor(public readonly rule: string) }   // NEW (B3)
// UnknownEntityType is re-used from foundation/spaces (not redefined, so no barrel collision)
```
`validators/routine.ts`: a module-local `CalendarDate = z.string().regex(YMD, 'expected YYYY-MM-DD')` (the tasks/projects
per-validator-file pattern; no shared export is introduced). `ProgressField` 0–100. `.min(1)` on `name`/`title`. A
`SetLifecycleSchema = z.object({ lifecycle: RoutineLifecycleSchema })`.

## Operation flow + invariants
- **setLifecycle:** parse → `loadRoutineOrThrow(id)` → `routinesRepo.update(id, {lifecycle})` → `toRoutine`. A same-value set is a
  harmless update (it re-stamps the sync version; the twin `update` behaviour).
- **Entity-type guard:** runs **after** Zod parse and **before** any repo write, and only when `entity_type != null`. On
  `updateStep` it runs only if the patch carries `entity_type`.
- **RRULE guard:** a helper `assertValidRrule(rule)`: parse with `ICAL.Recur.fromString(rule)`. A **throw OR `freq == null`** (RFC 5545
  makes FREQ required) → `InvalidRecurrenceRuleError(rule)`. The `freq == null` leg is required by the verified parser behaviour above.
  called in `createRoutine`/`updateRoutine` when `recurrence_rule` is a non-null string. *(The `ical.js` import is the first one in
  routines; it is already a `@vida/core` dep.)*
- **Sorting** is done in memory after the explicit `isNull(deleted_at)` read (rule 7 preserved).
- **Unchanged:** every S1/S2 invariant in `current-business-rules.md` (faithful echo, partial update never blanks, upsert per
  (step,date), soft-delete preserves the ledger, …).

## Deps / validators
- New required dep `registry`. **Impact (ledger impact scan):** the only constructor call sites are the module's own test
  file (`createRoutinesService(...)` in `routines-service.test.ts`), updated to pass `createTaggableTypeRegistry()`. No runtime
  consumer exists (N5).
- `setLifecycle` and the return-type change are additive or narrowing for the own tests only; no external caller.

## Verification Gate (blocking — live store, Node 24, real better-sqlite3 + `migrate()`, real `TaggableTypeRegistry`)
New tests (the existing 28 must stay green, with retitled `IR-n` labels):
1. `setLifecycle` → `paused`, then `off`, then `active`. Each returns the faithful row; `getRoutine` reflects it.
2. `setLifecycle` on an archived / missing routine → `RoutineNotFoundError`, no write: `_sync_version`/`updated_at` and the `sync_queue`
   count are unchanged before vs after.
3. `setLifecycle` with an off-tuple value → `ZodError`, no write.
4. `addStep` with a registered `entity_type` (`'habit'`) → ok. With an unregistered one (`'not_a_type'`) → `UnknownEntityType`, **no
   step row and no `sync_queue` row** (counts unchanged). `entity_type` null → ok (actionable step).
5. `updateStep` setting an unregistered `entity_type` → `UnknownEntityType`, step unchanged, no `sync_queue` row.
6. Dates (shape only): `completeStep(id, {date:'2026-1-5'})`, `skipStep(... {date:'yesterday'})`, `planSkipDates(id, ['2026/10/01'])`,
   `addStep({skip_dates:['bad']})`, `updateStep({skip_dates:['bad']})`, `editCompletion(id, 'bad', …)`, `deleteCompletion(id, 'bad')` →
   each rejects, no write. Valid `YYYY-MM-DD` passes.
7. `progress: 101` / `-1` / `1.5` → reject. `0`, `100`, `null` → ok.
8. `recurrence_rule: 'FREQ=DAILY'`, `'FREQ=WEEKLY;BYDAY=MO,WE'`, `'FREQ=DAILY;INTERVAL=0'` (coerced, accepted) → ok. Missing FREQ
   (`'NOT A RULE'`, `'BYDAY=MO'`, `''`, `'RRULE:FREQ=DAILY'`) and parser throws (`'FREQ=BOGUS'`, `'FREQ=DAILY;COUNT=abc'`,
   `'FREQ=DAILY;BYDAY=XX'`) → `InvalidRecurrenceRuleError`, no row, no `sync_queue` row. `null` → ok. `updateRoutine` with a bad
   rule → rejects, the stored rule unchanged.
9. `name: ''` / `title: ''` → `ZodError` on create and update.
10. `listRoutines` returns rows ordered by `sort_order`, then `created_at` (C sort 1, A sort 0, B sort 0 created with distinct
    `created_at` via `vi.spyOn(Date,'now')` → A, B, C). Plus a forced same-`created_at` pair orders by id codepoint.
11. `addStep` append: three unordered adds → `step_order` 0, 1, 2 in insertion order; an explicit `step_order` still wins.
    **Reorder then add:** reorder [C,A,B], then an unordered `addStep` D → `listSteps` = C, A, B, D.
12. `reorderSteps` returns the live steps in the new order, deep-equal to a fresh `listSteps`.
13. **Persistence probe:** `setLifecycle` enqueues a `sync_queue` row (local-first, RT-18).
Gates: `@vida/core` tsc 0 · eslint 0 · routines suite green · full `@vida/core` suite run sequentially (no regression; the DB-11
enum parity test untouched) · g2 code review · /critique SHIP · §XXIX promotion (`current-*` + layer `CLAUDE.md`).

## g1 critique (folded): REVISE → 1 blocking (A11 deviation withdrawn → max+1) + 6 non-blocking (byCodepoint tie-break,
ical.js grounding corrected, B1 gate gaps, B16 `.extend` trap, stale seam cites + seam annotation, no-write assertions)

## Out of scope (homed)
`utcDay` reuse (B11) → S3 (needs the `tasks` dep) · the drive leg (A15/A16) → S3 · lifecycle's miss-suppression semantics → S5 ·
every remaining 🕳 → S3–S9 per the approved slice map.
