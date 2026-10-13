<!-- Interpretation Layer — features/routines · Entity Delivery Flow ① Step 1 · mod-routines (LIF-138, M1.1.2)
     Makes the implicit explicit before decomposition. Every claim carries [FACT: path:line] or [INTENT]/[INTERP]. -->

# Interpretation — Routines (①)  (mod-routines · LIF-138 · M1.1.2 Feature Modules · Backend)

> Entity Delivery Flow ① over the shipped DB-4 reframe schema. Routines is the OS's **cross-module
> orchestration cockpit** — a named ordered recurring sequence of polymorphic steps, each *driving* a
> real entity elsewhere. It **composes, never duplicates** (RT-3). This service is an aggregator; it
> re-implements no scheduler, session engine, policy store, or tag store.

---

## 0. The scope-defining finding (As-is vs INTENDED is RESOLVED by the schema)

The aspect corpus (`identity/business-rules/contract/structure-data`) flags the whole sequence/step/policy/
provider/pursuable model as `⚠ INTENDED`, gated behind "an ADR-002 amendment + a Routines design-pass." **That
prose is stale lag. The amendment already executed at DB-4 — the reframe tables physically exist.**

- **The 3 reframe tables are shipped.** `routines` + `routine_step` + `routine_completions` are created by
  migration 018. `[FACT: packages/core/src/db/migrations/018_routines.ts:40-119]` The schema mirror confirms:
  "The reframe design LANDED … only the DDL was deferred '→ build phase' = this session. Supersedes the flat
  2-table POC (`routine_actions` retired → `routine_step`)." `[FACT: packages/core/src/db/schema/routines.ts:8-10]`
- **The flat POC is retired.** `routine_actions`, `RoutineAction`, `ROUTINE_ACTION_TYPE`,
  `ROUTINE_RECURRENCE_FREQUENCY` survive only in `_legacy/` (deleted at parity, MIG-1) and in the stale
  `@vida/types/routine.ts` interface (to be retired at this build's DB-11 reconcile).
  `[FACT: packages/types/src/routine.ts:13,19,32; packages/core/src/db/schema/routines.ts:36]`
- **Consequence:** ① scope = build `createRoutinesService` over the shipped 3-table schema, mirroring the twin
  modules (habits/projects/purposes/relationships). This is **not** an AskUserQuestion — it is mechanically
  doc-resolved (schema is the oracle over prose; the BASELINE step exists to catch exactly this drift).
  `[[envision-gate-firing-is-a-doc-test-not-a-human-decision]]`

---

## 1. DEPENDENCIES — what this build consumes (all built; documented contracts only, no direct table access, §6)

| # | Dependency | What routines consumes | Status | Citation |
|---|---|---|---|---|
| D1 | **DB-6 Repository** | encrypt-on-write / decrypt-on-read CRUD; `encryptedFields:[]` M1.0 pass-through; `softDelete` per table | built | `[FACT: packages/core/src/services/habits/service.ts:18,135-137]` |
| D2 | **Sessions & Scheduling (ADR-004)** | `SessionRegistry.createSession` for a step's runtime; `registerDueProvider(DueProvider)` + `dueIn(range)`; the Scheduler's availability/reschedule | built | `[FACT: packages/core/src/services/sessions/types.ts:234-238,216-232]` |
| D3 | **Effect rail (xs-effect-rail, AR-7)** | emit-only fan-out: `effects.rail.applyEffect({subjectNaturalKey,transition,effectType,targetRef})`, guarded by `effects.registry.resolve(effectType)` | built | `[FACT: packages/core/src/services/habits/service.ts:143-151]` |
| D4 | **Measurement (xs-measurement, ADR-011)** | routine is a pursuable: `measurement_kind='rate'` × `binding_mode` derived-pull; `progress()` derive-on-read | built | `[FACT: packages/core/src/db/schema/routines.ts:57-59; capability-framework.md:240]` |
| D5 | **Spaces (xs-spaces-tags-links, ADR-006)** | `entity_tags` (SP1) reads via `associations.resolveAssociations`; tag/link WRITES via the Spaces service port | built | `[FACT: packages/core/src/services/habits/service.ts:410-414; projects/service.ts associations]` |
| D6 | **Notes & Pages (mod-notes-and-pages)** | notes via `pages` (`entity_type='routine'`/`'routine_step'`); `entity_links` | built | `[FACT: docs/features/routines/business-rules.md:69-71; ADR-002 L1344]` |
| D7 | **Journals (mod-journals)** | register a `JournalContribution` (`sectionKey:'summary'`, `summary(date):SectionData`) | built | `[FACT: packages/core/src/services/journals/types.ts:58-62; habits/journal.ts]` |
| D8 | **Purpose (mod-purposes)** | contribute via the polymorphic weighted `contributions` primitive (ADR-011 M7); emit `contribute_purpose_metric` | built | `[FACT: docs/features/routines/business-rules.md:56-61; session.ts:90]` |
| D9 | **Tasks / Habits / Health / Knowledge** | a step DRIVES one of these via its native completion or Session sub-type (RT-3/RT-4) | built | `[FACT: docs/features/routines/contract.md:28-36]` |

**Deferred dependencies — build a DENY-SAFE / default port now, swap zero-signature later (NOT built here):**

| # | Deferred port | M1 behavior | Homed to | Citation |
|---|---|---|---|---|
| X1 | **Preferences — completion/miss/acceptance-window POLICY** | ship a sensible DEFAULT policy; optional `prefs?` port, absent ⇒ default | Preferences/Spaces | `[FACT: schema/routines.ts:30-33,62; business-rules.md:127]` |
| X2 | **`routine_step_membership` — step-scoping (RT-10)** | single-routine ownership only; no membership table authored | Spaces design-pass (non-blocking) | `[FACT: schema/routines.ts:30-33; structure-data.md:33-34]` |
| X3 | **Scheduler internals (reschedule-to-open-slot)** | compose `dueIn`/availability where present; `rescheduleStep` degrades to a typed "unavailable" when the Scheduler port is absent | Sessions (already exposes `dueIn`) | `[FACT: contract.md:17,29-31]` |
| X4 | **Gamification XP application** | routines EMITS `grant_currency`/`award_xp` (feeder); Gamification applies → `consequence_ledger` (dormant until a handler resolves) | Gamification (built; handler-gated) | `[FACT: business-rules.md:39-42; session.ts:91,96]` |

---

## 2. NEEDS — what the service must provide (the exposed surface, from contract.md)

The `RoutinesService` factory (mirrors `createHabitsService(deps)`): `[FACT: contract.md:8-26]`
- **Routine lifecycle:** `createRoutine / updateRoutine / archiveRoutine`; `setLifecycle(active|paused|off)`.
- **Steps:** `addStep / reorderSteps / removeStep` — polymorphic `{step_type, entity_type, entity_id, step_order, is_required}`.
- **Run/complete:** `runStep` (drive the entity — `SessionRegistry.createSession` or native completion, never a parallel record); `completeStep / skipStep({planned|logged, reason?}) / rescheduleStep`.
- **Evaluate (derived):** `evaluateRoutine(routine, date): {done|partial, percent, done[], not_done[]}` — applies the completion policy; `progress()` derives-on-read from the ledger, no stored counter.
- **Provider:** `dueIn(range):DueItem[]` (→ Calendar/Journal agenda) + `summary(date)` (→ Journal dashboard); emits completion events.
- **Associations:** tags (`entity_tags`), notes (`pages`), links (`entity_links`).

## 3. ORGANIZATION — where the code lands (twin layout, ADR-017/018 per-feature authoring)

- `packages/core/src/services/routines/` — currently a directory home only (`CLAUDE.md` scaffold, no code). `[FACT: packages/core/src/services/routines/CLAUDE.md]`
  - `service.ts` — `createRoutinesService(deps)` factory-object, hoisted closures, no `this.` (habits/finance/checkins precedent).
  - `types.ts` — `RoutinesService` interface + input shapes + typed errors (`EntityUnavailable`, `OutsideAcceptanceWindow`, `PolicyUndefined`, `ProviderEmitFailed` — `[FACT: contract.md:50-54]`).
  - `journal.ts` — `createRoutinesJournalContribution(svc)` + `registerRoutinesJournal(registry, svc)`.
  - `index.ts` — barrel (factory + types + journal + the `DueProvider`).
  - `__tests__/` — live-store Vitest.
- `packages/types/src/routine.ts` — **DB-11 reconcile** (S1): author `Routine`, `RoutineStep`, re-key `RoutineCompletion` → `routine_step_id` (+ `updated_at` via `baseColumns`); retire `RoutineAction` / `ROUTINE_ACTION_TYPE` / `ROUTINE_RECURRENCE_FREQUENCY`; `ROUTINE_LIFECYCLE` already present. `[FACT: packages/types/src/routine.ts:22-26; schema/routines.ts:35-37]`
- `packages/core/src/validators/routine.ts` — currently exports the retiring `RoutineActionTypeSchema` et al; S1 reconciles to the new shape. `[FACT: packages/core/src/validators/routine.ts:8]`
- `packages/core/src/db/schema/_registry.ts` — register `entity_type` `'routine'` / `'routine_step'` as taggable/linkable/page targets (S7).

## 4. IMPLICIT RULES — the backend preconditions a mock hides (surfaced now, caught by the live-store gate)

- **IR-1 — No cached counters; derive-on-read is mandatory (RT-14/RT-19).** Unlike habits (which caches
  `current_streak`), `routines.progress` is a *nullable override slot* and there are **no** streak columns. Routine
  "done"/streak/rate must recompute from `routine_completions` every read. `[FACT: schema/routines.ts:22-23,59; migrations/018:50-51]`
- **IR-2 — Completion lives on the DRIVEN entity; the step NEVER writes a parallel completion for a driven step
  (RT-3).** `routine_completions` is the ledger for the *step's own* occurrence (the alarm-like actionable step,
  RT-4) and for reflecting a driven completion — but a driven step must not double-count. The service resolves the
  entity and launches/ticks it; the ledger row records the routine-side occurrence, keyed `UNIQUE(routine_step_id,
  completed_date)`. `[FACT: schema/routines.ts:106; business-rules.md:18-22,49-50]` **(This boundary is the sharpest
  design question for S3/S4 — see Open Questions.)**
- **IR-3 — No cross-table FK; cascade is the app layer's (RT-17, BR-DB3-1).** `routine_id`, `routine_step_id`,
  `entity_id` are plain TEXT. Deleting a routine must app-cascade to its steps; deleting a step must hard-delete its
  completions. No DB `ON DELETE CASCADE` guards this. `[FACT: migrations/018:74,102; schema/routines.ts:74,96]`
- **IR-4 — `step_type` is OPEN vocab (no CHECK) — registry-validated, not enum-validated (RT-3).** A step type is
  user-extensible via Spaces; the service must not hardcode a closed set. `entity_type`/`entity_id` are nullable (an
  actionable alarm step has no driven entity, RT-4). `[FACT: migrations/018:76-78; schema/routines.ts:76-77]`
- **IR-5 — Policy is configuration, not code (RT-5/RT-6).** The schema has **no** policy columns. The service ships a
  DEFAULT completion policy (all-or-nothing / required-node via `is_required` / threshold) and a default miss/
  acceptance-window; the real settings home is Preferences (deferred X1). Evaluate must never hardcode-and-hide a
  policy. `[FACT: schema/routines.ts:62; migrations/018:27; business-rules.md:27-35]`
- **IR-6 — `skip_dates` is plain-text JSON (never `json<T>()`); the service serializes/parses it.** Two skip
  mechanisms with distinct meaning: `routine_step.skip_dates` = pre-planned; `routine_completions.skipped` +
  `skip_reason` = logged (RT-8). `[FACT: schema/routines.ts:85; business-rules.md:43-46]`
  `[[json-t-columns-need-service-serialize-in-m10]]`
- **IR-7 — `_sync_status` is `string` on the Row but a union on the interface (whole-repo).** Row→interface mappers
  (`toRoutine`/`toRoutineStep`/`toRoutineCompletion`) cast it; `encryptedFields:[]` in M1.0 even for `[E]`-marked
  `name`/`description`/`skip_reason` (dormant seam → M3/DB-5). `[FACT: habits/service.ts:61-75,133;
  [[drizzle-row-not-assignable-to-vida-types-interface]]; [[m10-repos-use-empty-encryptedfields-seam]]]`
- **IR-8 — `create()` echoes the input row, not a DB re-read.** `serialize*()` must backfill every notNull-default
  column (lifecycle `'active'`, measurement_kind `'rate'`, sort_order `0`, is_required `false`) or the returned row
  lies. `[FACT: habits/service.ts:10-13,164-187; [[repository-create-returns-input-row-not-db-defaults]]]`
- **IR-9 — Fan-out is emit-only, post-commit, failure-isolated, idempotent (RT-7/RT-12/RT-13).** A routine
  completion fires feeder effects (`grant_currency`/`award_xp`, `contribute_purpose_metric`,
  `emit_measurement_signal`) via the rail, each guarded by `registry.resolve` (dormant with no handler); a throw
  is non-fatal (the completion stands). Routines NEVER writes XP or a contribution row itself. `[FACT:
  habits/service.ts:140-161; session.ts:85-100; business-rules.md:119-120]`
- **IR-10 — `findWhere` skips the soft-delete filter.** List readers must add `isNull(deleted_at)` explicitly;
  `routine_completions` has no `deleted_at` (ledger). `[FACT: habits/service.ts:300; [[repository-findwhere-skips-softdelete-filter]]]`

## 5. OPEN QUESTIONS (doc-resolvable — I will ground each in the decomposition, none are AskUserQuestion by default)

- **OQ-1 — The driven-step vs ledger boundary (IR-2).** When a step drives a Habit/Session, does completing the
  step write a `routine_completions` row (to anchor the routine-level occurrence + skip + per-routine analytics),
  or purely reflect the driven entity's state? → **Resolve in the S3/S4 forward spec from RT-3 + the "single
  source of truth" rule**: the ledger records the *routine occurrence* (so the routine can evaluate/skip/reschedule
  independently) but never a *second behavioral count* — the driven entity stays authoritative for its own metric.
  Grounded, not guessed.
- **OQ-2 — Default completion policy shape (IR-5/X1).** Which default ships? → all-or-nothing is the conservative
  default; `is_required` steps form the required-node set; threshold is a param. Confirm against `business-rules.md:27-35`
  in the S5 spec. If the docs under-determine the *numeric* threshold default, that single value is the one
  legitimately-small Victor call (surface it in the S5 spec, don't block).
- **OQ-3 — Effect token set for a routine completion.** habits emits `['complete_habit_occurrence',
  'contribute_purpose_metric','award_xp']`; routines has no `complete_routine_occurrence` token in `EFFECT_TYPE`
  `[FACT: session.ts:85-100]`. → Resolve in S8: use the generic `emit_measurement_signal` (the purposes precedent,
  C-E2) + `grant_currency`/`award_xp` (RT-7 feeder) + `contribute_purpose_metric` (RT-12) — all existing tokens;
  do NOT invent a new token.

## 6. Envision Gate (Step 1.5) — N/A, stated not skipped

Pure-backend entity; it renders no surface a user forms a mental model of (`entity-delivery-flow.md §3.75`). Any
frontend slice is out of this ① (homed to `fe-routines`, P6). `[FACT: scenarios/default.md Step 1.5]`

## Completion checklist
- [x] dependencies (built + deny-safe deferred) each cited · [x] needs = exposed surface · [x] organization = twin layout
- [x] implicit backend rules (persistence/cascade/crypto/derive/fan-out) surfaced with [FACT] · [x] open questions doc-homed · [x] Envision N/A stated
