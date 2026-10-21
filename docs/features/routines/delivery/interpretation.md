<!-- Interpretation Layer — features/routines · Entity Delivery Flow ① · Step 1 -->
<!-- Makes the implicit explicit before decomposing. Every claim [FACT: path:line] or [INTERP]. -->
<!-- Sources: aspect corpus (business-rules/contract/structure-data/conventions/identity) · intake §E ·
     backend-intent/parts/routines.md (ROU-01…33) · schema/routines.ts · migrations/018_routines.ts ·
     @vida/types/routine.ts · validators/routine.ts · services/routines/CLAUDE.md -->

# Interpretation — Routines (① backend service)

> **Entity in one line:** a pure cross-module **orchestrator** — a named, ordered, recurring sequence of
> polymorphic steps, each of which *drives* a real entity elsewhere; the service mostly **composes + derives**,
> it writes almost nothing of its own. Schema is built (migration 018, 3 tables); service tier is 0 code.

---

## 1. DEPENDENCIES — what the service binds to (persistence + composed substrates)

### 1a. Persistence floor (BUILT — bind, don't author)
- **3 tables, migration 018, registered** `[FACT: migrations/018_routines.ts:1-80; runner.ts:77; schema/index.ts:43]`:
  - `routines` — pursuable: `measurement_kind` NN DEFAULT `'rate'`, `binding_mode` nullable (`NULL ⇒ derive derived-pull`),
    `progress` nullable **override slot** (no cached streak), `lifecycle` ∈ active/paused/off, `recurrence_rule` (RRULE).
    `[FACT: schema/routines.ts:47-67]`
  - `routine_step` — `routine_id` (plain TEXT, no FK), `step_order`, `step_type` (**OPEN vocab, NO CHECK**),
    `entity_type`+`entity_id` (nullable polymorphic driven-entity ref, RT-4), `is_required`, `title[E]`/`description[E]`,
    `time_of_day` (nullable), `skip_dates` (JSON-as-TEXT, **plain text, never `json<T>()`**). `[FACT: schema/routines.ts:70-89]`
  - `routine_completions` — per-step ledger, `routine_step_id` (no FK), `UNIQUE(routine_step_id, completed_date)`,
    `skip_reason[E]`, **NO `deleted_at`** (hard-deletes with the step, RT-17). `[FACT: schema/routines.ts:92-109]`
- **No hard cross-table FK** — `routine_id`/`routine_step_id`/`entity_id` are plain TEXT; **cascade is the app/sync layer's**
  (RT-17/BR-DB3-1). `[FACT: schema/routines.ts:18-19,74,96]` → the service owns delete-cascade explicitly (routine→steps→completions).
- **`routine_step` is a registered entity_type** `[FACT: _registry.ts:46]`.
- **Repository** = table-agnostic encrypt-on-write/decrypt-on-read; pass table + encrypted-field names + device id. `[FACT: db/CLAUDE.md "Pattern in use"]`

### 1b. Composed substrates (consume via contract — NEVER reach into their tables, constitution §6) `[FACT: conventions.md:44-46]`
Signatures **verified against the built code** (Step-0 substrate map). The factory convention: `db`+`deviceId` first,
required foundation services as typed ports, cross-module drivers + rail as **deny-safe optionals** (projects precedent).
- **Sessions — BUILT** (framework + service). `createSessionsService({db,deviceId,registry:SessionRegistry,rail:EffectRail,entityRegistry})`;
  `createSession(input)` (`sub_type` OPEN vocab) · `registerDueProvider(provider)` (the SS-7 due lane) · `dueIn(range):DueItem[]`.
  Sub-type registration: `SessionRegistry.register(def: SessionTypeDef)` — 4-dim contract, `effects[] ⊆ allowed_effects ⊆ shipped envelope`,
  throws `CapabilityEnvelopeExceeded`. `SHIPPED_SESSION_TYPES` ships only `focus`. `[FACT: foundation/sessions/registry.ts:44,72; services/sessions/service.ts:177,163,164]`
- **Habits — BUILT (#49).** `createHabitsService(deps)`; `logCompletion(habitId, input?)` is the native-tick seam a habit-step drives;
  `getStreak`/`getCompletionRate`; `getDayCompletionDigest(date)` is the Journal-summary feeder. A habit completion already fires its OWN
  effects (`complete_habit_occurrence`,`contribute_purpose_metric`,`award_xp`) — **routines must NOT re-fire them** (that's the RT-3 double-count). `[FACT: services/habits/service.ts:127,143; types.ts:135,152,175]`
- **⚠ Tasks — NOT BUILT (#65).** `services/tasks/` is a CLAUDE.md stub; no `createTaskService` exists. The `task`-type step (ROU-04),
  the actionable-step-as-recurrent-Task (ROU-11/RT-4), and `completeStep`-delegate-to-task (ROU-08) therefore compose a **deny-safe optional
  `TasksPort`** (Projects' `TasksProjectsPort` precedent) — absent ⇒ a task-step surfaces `EntityUnavailable`/degraded, never a crash. `[FACT: services/tasks/CLAUDE.md; services/projects/types.ts:33]` → **gate decision, §5.**
- **Health** — the `exercise` step drives a `workout` Session (Health composes Sessions, same `createSession` seam). `[FACT: contract.md:35; ROU-07]`
- **Measurement — BUILT, pure.** `resolveProgress(stored, derive)` IS the override-slot fn routines' `progress()` calls (`stored` non-null = override, `NULL ⇒ derive()`).
  `rollup()` is the weighted fractal (NOT routines' down-rollup — that's `completion_policy`). Routines advertises **NO** source (guard, outside M5 applies-to). `[FACT: foundation/measurement/engine.ts:56,38; source-registry.ts:21; ROU-13,14; rerun C5]`
- **Effect-rail — BUILT.** `createEffectRail(db, registry)`; `applyEffect(event)` idempotent by `effect_event_id = (subjectNaturalKey, transition, effectType)`.
  A routine-level completion emits `award_xp` (additive) + `contribute_purpose_metric` (keyed) via the rail; **Routines never writes XP/ledger** — the registered handler does, co-writing through the passed tx. Registry ships empty; routines registers no handler (it's a producer). `[FACT: foundation/effects/service.ts:29; types.ts:20,37; ROU-21; conventions.md:35-38]`
- **Spaces — BUILT.** `createSpacesService(db, deviceId, registry)` (**positional** args); `tagEntity(tagId, entityType, entityId)` · `createLink(pageId, entityType, entityId, context?)`.
  Routines must `register('routine'/'routine_step')` into the `TaggableTypeRegistry` at wire-up (no SQL CHECK edit). `[FACT: foundation/spaces/service.ts:63,44,47; registry.ts:15]`
- **Purpose (ADR-011 M7)** — routine→purpose contribution rides the weighted `contributions` primitive (retires As-is `purpose_routines`); mapping is Purpose-owned; routines emits `contribute_purpose_metric` + guards (no apex/rollup tables). `[FACT: contract.md:38-40; ROU-22]`
- **Notes — BUILT.** `createNotesService(deps)`; `ensureEntityNote(pageType, entityType, entityId, seed)` is the polymorphic routine/step note seam (validates entity_type against the registry). `[FACT: services/notes/service.ts:72; types.ts:68]`
- **Journals — BUILT.** Two-lane register pattern (`services/relationships/journal.ts` canonical): a `createRoutinesJournalContribution(svc)` + `registerRoutinesJournal(registry, svc)` (`JournalContribution {module, sectionKey:'summary', dataPoints, summary(date)}`, PULL at render) **and** `registerRoutinesDueProvider(sessions, svc)` → `sessions.registerDueProvider({module:'routines', fetch:(range)=>svc.getDueReminders(range)})`. Routines exposes `getDueReminders(range):DueItem[]`. `[FACT: services/relationships/journal.ts:58; services/journals/registry.ts:15; services/sessions/types.ts:235]`
- **Preferences/Spaces** — **home of the completion/miss/acceptance-window policy config** — the service *reads* it, never hardcodes. `[FACT: conventions.md:10-12; ROU-24]`

### 1c. Type/validator reconcile owed (DB-11 pattern — the first S1 concern)
- `@vida/types/routine.ts` still ships the **POC**: `RoutineAction`, `RoutineCompletion` keyed on `routine_action_id`,
  and `ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY`. `[FACT: @vida/types/routine.ts:13-20,32-63]`
- `validators/routine.ts` imports the **retired** enums → compiles today only because the old types still exist. `[FACT: validators/routine.ts:3-5]`
- Reconcile = add `Routine` + `RoutineStep` interfaces (mirroring the schema), re-key `RoutineCompletion` → `routine_step_id`
  (+`updated_at` via base), retire the two POC enums, fix the validators. Mirror-only (DB-11 precedent, groups #1/#3/#4/#5/#6). `[FACT: schema/routines.ts:35-37]`
- ⚠ **Rebuild `@vida/types` dist before `@vida/core` typecheck** after any src edit, or phantom TS2305/TS2339 appear on other modules. [[editing-vida-types-needs-dist-rebuild-before-core-typecheck]]

---

## 2. NEEDS — what the service must provide (the ROU surface, grouped)
- **Routine CRUD + lifecycle** — createRoutine/updateRoutine/archiveRoutine (soft-delete, preserve ledger) + setLifecycle(active|paused|off). `[FACT: ROU-01,02,03,17]`
- **Step CRUD** — addStep (polymorphic) / reorderSteps / removeStep. `[FACT: ROU-04,05,06]`
- **Run/complete/skip/reschedule** — runStep (drive entity, no parallel write) · completeStep (delegate) · skipStep (planned `skip_dates` vs logged `skipped`+`skip_reason`) · rescheduleStep (ask Scheduler; `OutsideAcceptanceWindow` typed error). `[FACT: ROU-07,08,09,10,11]`
- **Derivations (the heart)** — evaluateRoutine(date)→{done|partial, percent, done[], not_done[]} by **completion_policy**; progress() derived-on-read; streak/rate/ranking/time-comparison recompute from the ledger; miss/acceptance-window computation. **No cache, ever.** `[FACT: ROU-12,13,15,16,18; conventions.md:13-16]`
- **Provider seam** — dueIn(range) + summary(date) + emit completion event. `[FACT: ROU-19,20,21]`
- **Cross-cutting consume/guard** — contributions emit (Purpose-owned), entity_tags consume (Spaces), pages/links (Notes), measurability axes validate, policy config read. `[FACT: ROU-22,23,24,25,26]`
- **Typed errors (fail loud)** — `EntityUnavailable` · `OutsideAcceptanceWindow` · `PolicyUndefined` (→ shipped default, flagged) · `ProviderEmitFailed` (isolated). `[FACT: ROU-30; contract.md:50-54]`

---

## 3. ORGANIZATION — how the service tier is shaped `[INTERP, grounded in sibling pattern]`
- `createRoutinesService(deps)` factory (sibling precedent: projects/relationships). Deps + exact factory shape → §5 (agent map).
- Repositories over the 3 tables (`routines`, `routine_step`, `routine_completions`) via the generic Repository, `encryptedFields:[]`
  in M1.0 (dormant seam — even for `[E]` cols). [[m10-repos-use-empty-encryptedfields-seam]] `[FACT: schema/routines.ts:39]`
- The service is **thin on writes, thick on composition + derivation**: a `routine-progress`/`evaluate` pure module (policy over ledger),
  a provider module (`dueIn`/`summary`), and delegation shims to Sessions/Tasks/Habits/Health for `runStep`.
- **Slice shape (preview for Step 2 Decomposition Gate):** likely S1 routine+step CRUD + DB-11 reconcile · S2 completions ledger + skip · S3 run/complete (drive-entity composition) · S4 evaluate/policy derivation · S5 progress/analytics derivation · S6 reschedule/alarm (Scheduler) · S7 provider (dueIn/summary) + effect emission · S8 contributions/tags/pages cross-cutting · S9 Journal summary + DueProvider lane. **Exact slicing is the Step-2 gate, not decided here.**

---

## 4. IMPLICIT RULES — the backend traps the gate must catch (why Step 1 exists)
1. **Never write a parallel completion for a step** — completing a step *is* completing the driven entity; a routine-local
   record would double-count. `routine_completions` is the **step ledger for alarm-like/actionable steps**, NOT a mirror of driven-entity completions. `[FACT: conventions.md:33-34 (RT-3)]` ← the single most load-bearing invariant.
2. **Never write XP** — emit the `grant_currency` feeder; Gamification owns `consequence_ledger`, idempotent via `effect_event_id`. `[FACT: conventions.md:35-38; ROU-21]`
3. **Derive, never cache** — `progress()`/streak/analytics recompute from the ledger; `progress` column is a **nullable override** (`NULL ⇒ derive`), never a `NOT NULL DEFAULT 0` counter. `[FACT: conventions.md:13-16; schema/routines.ts:59]`
4. **Policy is configuration, not code** — completion/miss/acceptance-window are read from Preferences/Spaces; ship a default, never hardcode. `PolicyUndefined` falls back to the shipped default + flags. `[FACT: conventions.md:10-12,41; ROU-24,30]`
5. **`step_type` is an OPEN vocab (NO SQL CHECK)** — validate against the **registry**, not an enum; a user-extensible type rides Spaces. Don't synthesize a closed enum. `[FACT: schema/routines.ts:76; ROU-04]` [[open-vocab-columns-take-no-sql-check]]
6. **App-layer cascade** — no FK; deleting a routine must explicitly delete its steps + their completions (soft-delete the routine/steps, **hard-delete the completions ledger** — it has no `deleted_at`). `[FACT: schema/routines.ts:103 (RT-17)]`
7. **`findWhere` skips the soft-delete filter** — the generic repo applies `isNull(deleted_at)` only on findAll/findById/count; a `routine_step` query via `findWhere` must filter `deleted_at` explicitly. (completions table has no `deleted_at` — N/A there.) [[repository-findwhere-skips-softdelete-filter]]
8. **`Repository.create()` returns the INPUT row, not DB defaults** — omitted NN-default cols (e.g. `lifecycle`, `measurement_kind`, `sort_order`, `is_required`) come back `undefined`; backfill in the create input. [[repository-create-returns-input-row-not-db-defaults]]
9. **`skip_dates` is plain-text JSON** — the service JSON.stringify on write / JSON.parse on read (schema uses plain `text()`, not `json<T>()`, to dodge the $type lie). `[FACT: schema/routines.ts:85]` [[json-t-columns-need-service-serialize-in-m10]]
10. **M1.0 `[E]` seam is empty** — `encryptedFields:[]` even for `[E]`-marked `name`/`description`/`title`/`skip_reason`; getVaultKey throws vault-locked, so a non-empty set would break live. `[E]` wiring is homed M3/DB-5. `[FACT: schema/routines.ts:39; ROU-32]`
11. **Drizzle Row ≠ `@vida/types` interface** — `$inferSelect` rows aren't assignable to the `Routine`/`RoutineStep` interfaces (`_sync_status` string vs union); raw list readers return Row types, merged/constructed returns use a view type. [[drizzle-row-not-assignable-to-vida-types-interface]]
12. **Advertise NO M5 measure source** — a guard: the routine is outside the ADR-011 M5 applies-to set; it exposes its streak as a **READ seam** Gamification pulls, not an `advertise()` registration. `[FACT: ROU-14; rerun C5]` [[measurement-source-registry-is-sync-scalar-per-subject-uses-a-method]]
13. **Provider errors are isolated** — a `dueIn`/`summary` failure (`ProviderEmitFailed`) must not fail the routine or sibling providers; a contribution/emit failure flags, never drops. `[FACT: business-rules.md:118-120; ROU-30]`
14. ⚠ **Notes entity_type naming drift — SURFACE, don't silently pick.** The aspect docs reserve `entity_type='routine_action'` for pages/links `[FACT: conventions.md:28-30; business-rules.md:70]`, but the reframe retired `routine_actions`→`routine_step` and `_registry.ts:46` registers `'routine_step'`. **Decision for the gate:** the go-forward pages/links target is `'routine_step'` (and/or a `'routine'` group-level type for RT-15 routine-group notes). Flagged as an explicit Decomposition-Gate decision, not an assumption. `[FACT: _registry.ts:46 vs conventions.md:28]`

---

## 5. Decisions for the Decomposition Gate (Victor — Approval 1)
- **✅ Substrate seam signatures — RESOLVED** (§1b, verified against built code). All composed substrates are built
  **except Tasks (#65)**.
- **D1 — RESOLVED (Victor, 2026-10-14): build Tasks (#65 / LIF-142) FIRST, then resume routines.** Rejected the deny-safe
  `TasksPort` workaround in favour of a real dependency. On resume, routines takes `tasks: TasksService` as a **required**
  dep (not optional); S3 run/drive + RT-4 recurrent-task no longer degrade to `EntityUnavailable` for missing-port — only for
  genuinely missing/deleted entities. **⏸ Routines is PAUSED pending mod-tasks.** Exact `TasksService` signatures reconcile
  on resume against the shipped service (No-Guessing — not yet built). `[DECISION: Victor 2026-10-14]`
- **D2 — Notes/pages entity_type = `routine_step` (+ a `routine` group-level type).** The docs' reserved `routine_action`
  is pre-reframe; `_registry.ts:46` already registers `routine_step`. Register `'routine'` + `'routine_step'` into the
  TaggableTypeRegistry at wire-up; retire the `routine_action` token. `[FACT: _registry.ts:46 vs conventions.md:28]` → **recommend: approve.**
- **D3 — The two-seam completion wiring** (ROU-16 read vs ROU-21 emit, flagged `[DEFERRED — build]` in rerun N1): a routine
  **step** completion drives the entity (which fires ITS own effects); the routine **-level** policy-`done` is what emits the
  routine's `award_xp` + `contribute_purpose_metric`. Routines exposes the policy-derived streak as a READ seam (no advertise).
  → resolve concretely in the effect-emission slice.
- **Slice count + ①/② split** — my §3 preview (S1–S9) is the proposal; the gate ratifies. The today-list chrome, per-step
  live render, standalone-page analytics, drag-reorder, alarm surface are **② UI (P6)** per ADR-020 — out of this ① scope. `[FACT: backend-intent routines.md:5]`
- **CHECK defaults** for the pursuable axes are already in the schema (`rate` × nullable `binding_mode`) — **verify-only**, no decision. `[FACT: ROU-14 UNKNOWNs]`
