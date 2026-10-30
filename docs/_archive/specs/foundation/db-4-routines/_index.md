# DB-4 · Domain Group #7 — Routines · Unit Spec

<!-- Forward spec for DB-4 group #7 (Routines). Per-domain schema authoring under the schema-foundation
     5-phase lifecycle (docs/roadmap/schema-foundation-build-flow.md §2). No-Guessing: every claim is
     [FACT: src] / [INTENT: src] / [UNKNOWN]. Authored 2026-08-19 (branch db-4-per-domain-schema).
     This unit authors the ORCHESTRATION REFRAME (design landed docs/intake/routines.md §E 2026-07-14;
     DDL deferred "→ build phase" = now), NOT the flat 2-table v2 POC. -->

- **Unit:** DB-4 group #7 — Routines (`routines` · `routine_step` · `routine_completions`)
- **Profile / scenario:** add-backend-component / Default (schema-foundation build)
- **Blocked by:** DB-3 substrate + groups #4 Tasks / #6 Habits (steps drive tasks/habits, no-FK) + #5 Projects
- **Intent source:** the §E reframe (`docs/intake/routines.md` §E + `part-1.2-reruns/routines.md`) + the 5 `docs/features/routines/` aspects + ADR-002 §5.6 (FACT floor, superseded shape) + ADR-011
- **Precedent:** #4 Tasks (`recurrence_rule` RRULE, `measurement_kind`/`binding_mode` grain, net-new enum) · #6 Habits

---

## §0. Source model
Backend schema only. **The orchestration reframe design LANDED** (§E 2026-07-14, RT-1…RT-19); only the DDL was
deferred "→ build phase (ADR-016)" (`part-1.2-reruns/routines.md` §5) — which is THIS session. Routines is a
*shape-open* group (the `store`/`rules` pattern): intake the documented intent, resolve the DDL at Phase 3 grounded in
it. [[check-intake-and-reruns-before-triaging-a-design-pass-undone]]

---

## §1. Identity — what this unit is
The OS's cross-module **orchestration cockpit**: a named, ordered, recurring sequence of **steps**, each step *driving*
a real entity elsewhere (a Session sub-type, task, habit) — composes, never duplicates. `routines`/`routine_step`
supersede the flat POC `routine_actions`; `routine_completions` is retained (re-keyed to the step). `[FACT: identity.md; §E]`

### Scope boundary — doc-DECIDED (Routines composes; the foundations own the machinery)
- **Policies** (completion/miss/acceptance-window) → **Preferences/Spaces** settings, NOT on `routines` (conventions.md:11; structure-data.md:66).
- **Step-scoping / `routine_step_membership`** → design-pass, **non-blocking**, rides **Spaces** (intake.md:171; identity.md:37) — **not authored here**.
- **Scheduling/cadence engine** → the **Scheduler** (Sessions & Scheduling, RT-11). **User-extensible step/session types** → the Spaces/ADR-004 registry.
- **Progress/streak** derive from `routine_completions` (RT-14, no cached columns). **Tags**→`entity_tags`; **notes**→`pages`; **purpose**→`contributions`; **XP**→`consequence_ledger` (all cite-not-author).

### Boundary — what this unit is NOT (doc-cited)
| Not authored here | Home | Cite |
|---|---|---|
| `routine_step_membership` (step-scoping) | Spaces / design-pass (non-blocking) | intake.md:171; identity.md:37 |
| completion/miss/acceptance policy columns | Preferences/Spaces | conventions.md:11; structure-data.md:66 |
| `purpose_routines` (retired) → `contributions` | Purpose / DB-3 | §5.20 Stream (i); ADR-011 M7 |
| the Scheduler / provider (`dueIn`/`summary`) | Sessions & Scheduling / service | RT-11/RT-13 |

---

## §2. Business Rules (inherited invariants the intake honors)
- **RT-1 — Encrypted [E]:** `routines.name/description`, `routine_step.title/description`, `routine_completions.skip_reason`. `[FACT: §5.6 [E]; §E]`
- **RT-2/RT-3 — named ordered sequence of polymorphic steps.** `routines` (the sequence) → `routine_step` (`routine_id`, `step_order`, polymorphic `step_type`+entity ref). A step DRIVES its entity (single source of truth); never a parallel record. `[INTENT §E Q1; RT-2/RT-3]`
- **RT-8 — two skip mechanisms.** `routine_step.skip_dates` = pre-planned; `routine_completions.skipped`+`skip_reason` = logged on the day. `[FACT: §5.6 L1749-1750,L1775]`
- **RT-14 — analytics derive from the ledger (no cached counters).** No stored streak/`progress` columns; recompute from `routine_completions`. `[FACT: §5.6 has none; RT-14]`
- **RT-17/RT-18 — cascade (app-layer, no-FK) + soft-delete + LWW.** `routine_completions` hard-cascades with its step; `routines`/`routine_step` soft-delete. Ledger merges by (`routine_step_id`,`completed_date`). `[FACT: §5.6 CASCADE/UNIQUE; BR-DB3-1; ADR-003]`
- **RT-19 — a routine is a PURSUABLE.** Carries `measurement_kind` (natural **`rate`**) + `binding_mode` (natural `derived-pull`, but a nullable override-slot — NULL⇒derive, the Tasks/Habits grain). `progress()` derives on read; any stored `progress` is a nullable override. `[FACT: business-rules.md RT-19; ADR-011 M1/M2/M3]`

### Enum CHECK sets (schema-relevant, FIXED → SQL CHECK, tuple-sourced)
`routines.lifecycle` (**ROUTINE_LIFECYCLE** — NET-NEW 3) · `routines.measurement_kind` (MEASUREMENT_KIND 4) ·
`routines.binding_mode` (BINDING_MODE 3, nullable) · `routine_step.time_of_day` (ROUTINE_TIME_OF_DAY 3, nullable).
**`routine_step.step_type` is OPEN vocab** (user-extensible §E Q1 → registry-validated, **NO CHECK**, like session
`sub_type`) — not a parity row. `routine_completions` has no CHECK col.

---

## §3. Intended shape — the 3 tables (reframe, cited)

### §3a. `routines` — the named ordered sequence (pursuable) `[INTENT §E; ADR-011]`
`...baseColumns` · `name[E]` NN · `description[E]` · `recurrence_rule` TEXT (RRULE — the platform cadence canon;
"broad schedule" day/week/month/year, RT-11, consumed by the Scheduler — mirrors `tasks.recurrence_rule`) ·
`lifecycle` CHECK NN DEFAULT 'active' (ROUTINE_LIFECYCLE) · `measurement_kind` CHECK NN DEFAULT **`'rate'`**
(MEASUREMENT_KIND, RT-19 natural) · `binding_mode` CHECK **nullable, no default** (BINDING_MODE, NULL⇒derive) ·
`progress` INTEGER **nullable** (override slot, no counter) · `sort_order` NN dflt 0 · `deleted_at`. **No policy
columns** (Preferences/Spaces). Index `idx_routines_lifecycle` partial `WHERE deleted_at IS NULL` (SQL-migration-only).

### §3b. `routine_step` — the polymorphic step (replaces `routine_actions`) `[INTENT §E Q1; RT-3]`
`...baseColumns` · `routine_id` (no-FK) · `step_order` INTEGER NN dflt 0 · **`step_type` TEXT (OPEN vocab, no CHECK)** ·
`entity_type` TEXT + `entity_id` TEXT (polymorphic driven-entity ref, nullable — an actionable step may have none, RT-4) ·
`is_required` `boolInt` NN dflt 0 (required-node support, RT-5) · `title[E]` NN · `description[E]` ·
`time_of_day` CHECK **nullable** (ROUTINE_TIME_OF_DAY) · `skip_dates` TEXT (JSON, RT-8 planned skips) · `deleted_at`.
Index `idx_routine_step_routine` on `routine_id`.

### §3c. `routine_completions` — per-step ledger (retained, re-keyed) `[FACT: §5.6 L1770-1789, re-keyed to step]`
`...baseColumns` (adds `updated_at` — task_time_logs precedent) · `routine_step_id` (no-FK; was `routine_action_id`) ·
`completed_date` (YYYY-MM-DD) NN · `completed_at` `timestampMs` NN · `skipped` `boolInt` NN dflt 0 · `skip_reason[E]` ·
`actual_duration_minutes` INTEGER · **NO `deleted_at`** (ledger). **UNIQUE(`routine_step_id`,`completed_date`)** (RT-3/RT-18) ·
index `idx_routine_comp_date` on `completed_date`.

### §3d. `ENTITY_TYPES` registry — reconcile append
`+= 'routine', 'routine_step'` (pages/entity_links/entity_tags targets — notes at routine-group + step level RT-15;
tags RT-16). `routine_completions` addressed via `routine_step_id` → not registered. *(The docs' pre-reframe
`entity_type='routine_action'` is superseded by the reframe `'routine'`/`'routine_step'`.)* `[FACT: RT-15/RT-16]`

### §3e. `@vida/types` — net-new enum now; interfaces → DB-11
- **NET-NEW `ROUTINE_LIFECYCLE = ['active','paused','off']`** in `routine.ts` (needed for the CHECK; TASK_KIND precedent).
- Interface reconcile (new `Routine`/`RoutineStep`; `RoutineCompletion` re-keyed to `routine_step_id` +`updated_at`;
  retire `RoutineAction`/`ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY`) → **DB-11** (mirror-only; compiles).

---

## §4. Physical home & authoring model
- **CREATE** `schema/routines.ts` (3-table mirror) + `migrations/018_routines.ts` (hand-written SQL, v18).
- **MODIFY** `@vida/types/routine.ts` (+`ROUTINE_LIFECYCLE`; rebuild dist), `schema/index.ts`, `schema/_registry.ts`, `migrations/runner.ts`.
- Tests: enum-parity FIXTURE (4 rows: lifecycle/measurement_kind/binding_mode/time_of_day) + splice migration018;
  new `db/tests/routines-introspection.test.ts` (3 tables).
- **Encryption (BR-DB6-3):** `[E]` fields are the M3 target; Repository registers an EMPTY `[E]` set in M1.0.

---

## §5. Phase-1 completion checklist
- [x] All 5 aspects + the §E reframe (`intake/routines.md` §D/§E + `part-1.2-reruns/routines.md`) + ADR-002 §5.6/§5.20 + ADR-011 read.
- [x] Reframe (not POC) confirmed as the target; DDL deferred "→ build phase" = now (shape-open, store/rules pattern).
- [x] Doc-decided boundaries scoped OUT (policy→Prefs/Spaces; membership→Spaces/design-pass non-blocking; scheduler; contributions).
- [x] No manufactured DEFAULT (`binding_mode`/`progress` nullable); `step_type` OPEN (no CHECK).

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)
1. **3 tables** (`routines`+`routine_step`+`routine_completions`); `routine_actions` retired → `routine_step`. `[FACT: §E; structure-data.md:29]`
2. **No policy columns on `routines`** (Preferences/Spaces). `[FACT: conventions.md:11; structure-data.md:66]`
3. **`routine_step_membership` NOT authored** (design-pass, non-blocking, Spaces). `[FACT: intake.md:171]`
4. **cadence = `recurrence_rule` RRULE** (platform canon; RT-11 Scheduler-consumed). `[FACT: tasks precedent; RT-11]`
5. **`step_type` OPEN vocab, no CHECK** (user-extensible). `[FACT: §E Q1; session sub_type precedent]`
6. **`measurement_kind` NN DEFAULT 'rate'; `binding_mode` nullable no-default.** `[FACT: RT-19; ADR-011 §3.2]`
7. **`ROUTINE_LIFECYCLE` net-new; interfaces → DB-11.** `[FACT: §E; TASK_KIND precedent]`
8. **`routine_completions` re-keyed to `routine_step_id`, ledger (baseColumns +updated_at, no deleted_at).** `[FACT: §5.6; task_time_logs precedent]`

_String-check (self-analysis): clean — no decision / lean / TBD / open-point / either-or._

---

## Phase 2 — Current-state read (reconcile-and-extend baseline)
### Already authored — DO NOT re-create
`entity_tags`/`pages`/`contributions` (substrate) · `tasks`/`habits` (steps drive them, no-FK) · `_shared.ts` helpers.
`ROUTINE_TIME_OF_DAY` exists in `routine.ts`.

### To author — 3 confirmed ABSENT (net-new in v2)
`routines` · `routine_step` · `routine_completions`. No `schema/routines.ts`; v1/v2-POC forms only in `_legacy`/§5.6.

### `ENTITY_TYPES` diff · Migration slot · `@vida/types`
Append `'routine','routine_step'`. Highest migration = `017_habits` (v17) → new `018_routines` (v18). Net-new `ROUTINE_LIFECYCLE`.

### Baseline verdict
Net-new authoring of the REFRAME (supersedes the §5.6 POC). `recurrence_rule` reuses the tasks pattern; `step_type` OPEN
mirrors session `sub_type`; polymorphic `entity_type`+`entity_id` mirrors `entity_links`.

---

## Phase 3 — Implementation Plan (gate-1 draft)
### §P3.0 — Grounding recap
1. Author the reframe (design landed §E; DDL = build-phase = now), NOT the flat POC.
2. Policies/membership/scheduler/types are doc-decided boundaries (Prefs/Spaces/Scheduler) — not authored.
3. `binding_mode`/`progress` nullable (override-slot, not manufactured default); `step_type` OPEN (no CHECK).
4. Interfaces + retired enums → DB-11.

### §P3.1 — Exact DDL intent
Per §3a-§3c. All full `...baseColumns`; `routines`/`routine_step` add `deleted_at`, `routine_completions` omits it.
No-FK on every ref. FIXED enums → SQL CHECK from the tuple. `measurement_kind` NN DEFAULT 'rate'; `binding_mode`/
`progress`/`time_of_day` nullable no-default. `step_type` plain TEXT no CHECK. UNIQUE(`routine_step_id`,`completed_date`).

### §P3.2 — Registry & validators
`_registry.ts += 'routine','routine_step'`. `routine.ts += ROUTINE_LIFECYCLE`. Zod (DB-9) reuses tuples.

### §P3.3 — Files, migration, tests
CREATE `schema/routines.ts`, `migrations/018_routines.ts`, `db/tests/routines-introspection.test.ts`; MODIFY
`routine.ts`, `schema/index.ts`, `_registry.ts`, `runner.ts`, `enum-parity.test.ts` (4 rows + splice).

### §P3.4 — DB-11 deferrals (cited, not fixed here)
new `Routine`/`RoutineStep`; `RoutineCompletion` re-key +`updated_at`; retire `RoutineAction`/`ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY`.

### §P3.5 — Plan checklist (pre-critique)
- [x] DDL intent complete + cited · [x] no-FK · [x] no manufactured default · [x] OPEN step_type · [x] net-new enum scoped
- [x] registry · [x] migration slot · [x] files/tests named · [x] boundaries scoped with citations

### §P3.6 — Gate-1 critique verdict (independent) → SHIP
Independent critic, 2026-08-19. Verdict **SHIP** — no blocker/material; 13 points verified doc-grounded: reframe-not-POC
(no doc says author the POC), all 3 boundaries (policies→Prefs/Spaces · membership→Spaces/non-blocking · scheduler),
`measurement_kind` NN DEFAULT 'rate' + `binding_mode` nullable-no-default (trap avoided, tasks precedent), `step_type`
OPEN no-CHECK (sessions `sub_type` precedent), polymorphic `entity_type`+`entity_id` nullable (RT-4), completions
re-keyed to `routine_step_id`, no cached progress (RT-14), `ROUTINE_LIFECYCLE` genuinely net-new, RRULE cadence
(supersedes the POC pair, no info loss). 3 MINOR (non-blocking): **F1** aspect docs still say `entity_type='routine_action'`
(reframe supersedes → `routine`/`routine_step`; flag for DB-11/doc-sweep, spec's supersession is correct); **F2** watch
at impl — the introspection test oracle is the mirror (baseColumns +updated_at), NOT the §5.6 floor snapshot; **F3** RRULE
collapse is deliberate supersession, not narrowing.

### §P3.7 — Approval 1 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → preflight

### §P3.8 — Preflight → PASSED (6 folds)
1. **`recurrence_rule` plain `text()`** (RRULE, tasks.ts:66 precedent) — no CHECK, not a parity row.
2. **`step_type` plain `text()`, no CHECK** (OPEN vocab, sessions.ts `sub_type` precedent) — not a parity row.
3. **`entity_type`+`entity_id` plain `text()`, nullable, no-FK** (entity_links precedent).
4. **`is_required`/`skipped` = `boolInt` NN dflt false** → SQL `INTEGER NOT NULL DEFAULT 0`.
5. **`routine_completions`** — `...baseColumns` (created_at+updated_at present), NO `deleted_at`; introspection oracle = the mirror (F2); UNIQUE(`routine_step_id`,`completed_date`) via `unique().on(...)`.
6. **4 enum-parity rows** — routines.lifecycle (ROUTINE_LIFECYCLE), routines.measurement_kind (MEASUREMENT_KIND), routines.binding_mode (BINDING_MODE), routine_step.time_of_day (ROUTINE_TIME_OF_DAY); `step_type` OPEN → not a row.

### §P3.9 — Gate-2 critique (independent, post-preflight) → SHIP
Independent critic, 2026-08-19. Verdict **SHIP** — zero blocker/material; 10 readiness points traced against 001–017
(default-normalizer passes for lifecycle/measurement_kind NN-default + boolInt + all nullable cols · completions ledger
shape · step_type OPEN no-CHECK · ROUTINE_LIFECYCLE net-new · migration slot 018 · 4 parity rows · registry append ·
recurrence_rule plain text). 3 MINOR (mechanical): **M1** add `ROUTINE_LIFECYCLE`+`ROUTINE_TIME_OF_DAY` to the
enum-parity import block (else ReferenceError); **M2** introspection oracle = the mirror + migration018; **M3** `skip_dates`
plain `text()` not `json<T>()` (days_of_week precedent).

### §P3.10 — Approval 2 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → Phase 4 (implement)

## Phase 4 — Implement (DONE)
- MODIFY `@vida/types/routine.ts` (+`ROUTINE_LIFECYCLE`; rebuilt dist). CREATE `schema/routines.ts` + `migrations/018_routines.ts` (v18).
- MODIFY `schema/index.ts`, `_registry.ts` (`+= routine/routine_step`), `runner.ts`. Tests: 4 enum-parity rows + splice; new `routines-introspection.test.ts`.

## Phase 5 — Foundation-soundness verify (DONE)
- **DDL-introspection** (`routines-introspection.test.ts`, 12 cases × 3 tables) — GREEN.
- `@vida/core` **299 tests** green (was 283 → +12 introspection + 4 enum-parity); typecheck clean; eslint 0-err; `LATEST_VERSION`=18.
- Independent post-impl `/critique` → **SHIP** (SQL↔mirror faithful, no-FK, `step_type` OPEN no-CHECK, `binding_mode` trap avoided, no policy columns, completions re-keyed, 4 CHECK sets match tuples, [E] dual-marked). 2 MINOR = pre-cited DB-11 deferrals.
- **§XXIX Currency promote:** `database-layer/current-spec.md` + `current-business-rules.md` (BR-RT7-*) updated.
- **Foundation-readiness:** MOD-routines finds the sequence/step/ledger + measurability — PASS.

### Deferred / cross-group (tracked, not this unit)
- **DB-11:** new `Routine`/`RoutineStep`; `RoutineCompletion` re-key +`updated_at`; retire `RoutineAction`/`ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY`; aspect docs' `entity_type='routine_action'` → `routine`/`routine_step` (doc-sweep).
- `routine_step_membership`/step-scoping (Spaces design-pass, non-blocking) · policy (Preferences/Spaces) · Scheduler · provider `dueIn`/`summary` (service).
