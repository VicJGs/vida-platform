# DB-4 · Domain Group #6 — Habits · Unit Spec

<!-- Forward spec for DB-4 group #6 (Habits). Per-domain schema authoring under the schema-foundation
     5-phase lifecycle (docs/roadmap/schema-foundation-build-flow.md §2). No-Guessing: every claim is
     [FACT: src] / [INTENT: src] / [UNKNOWN]. Authored 2026-08-19 (branch db-4-per-domain-schema). -->

- **Unit:** DB-4 group #6 — Habits (`habits` · `habit_completions` · `project_habits`)
- **Profile / scenario:** add-backend-component / Default (schema-foundation build)
- **Blocked by:** DB-3 substrate (`entity_tags`, `pages`, `contributions`) + group #5 Projects (`project_habits` refs `projects`)
- **Intent source:** ADR-002 §5.5 (FACT floor) + §5.20 Stream (ii) + the 5 `docs/features/habits/` aspects + ADR-011
- **Precedent:** group #4 Tasks (`measurement_kind`/`binding_mode` grain, net-new enum) · `entity_tags` (v2 junction shape)

---

## §0. Source model
Backend schema only; documented intent is the source of truth. The intent is closed by the docs (No-Decisions Gate);
Phase 3 is a straight authoring plan.

---

## §1. Identity — what this unit is
The Habits domain schema in the v2 surface: an **independent Wave-1 domain** — habit definitions + a per-date
completion ledger + a denormalized streak cache, plus the **kept `project_habits` junction** (deferred here from group
#5). `habits`/`habit_completions` are the ADR-002 §5.5 FACT floor; measurability (HB-13), the restored v1 fields (G8),
and the shared-tag migration are build-phase INTENDED ([[build-phase-flags-mean-resolve-now-not-defer]]).

### Scope boundary — doc-FIXED (substrate owns the shared primitives)
- **Tags** → `entity_tags` (`entity_type='habit'`; inline `habits.tags` RETIRED, ADR-006 SP1).
- **Notes** → `pages` (`entity_type='habit'`). **Purpose rollup** → `contributions` (retired `purpose_habits`, M7).
- **Progress/rate derivation, streak, M5 measure seam** are SERVICES (the streak cache is derived-from-ledger, HB-2).

### Boundary — what this unit is NOT (doc-cited)
| Not authored here | Home | Cite |
|---|---|---|
| `purpose_habits` (retired) → `contributions` | **Purpose / DB-3** | §5.20 Stream (i); ADR-011 M7 |
| HB-8 `contribute_purpose_metric` · HB-9 `award_xp`→`grant_currency`→`consequence_ledger` | **ADR-004 / ADR-012 services** | conventions.md:52-54 |
| HB-10 backfill window (`habit_backfill_window_days`) | **Preferences** | structure-data.md:32 |
| `streak(habit)` M5 measure read seam | **service (R7)** | conventions.md:32 |

---

## §2. Business Rules (inherited invariants the intake honors)
- **HB-1 — Encrypted [E]:** `habits.name/description/unit/cue/reward` (+ INTENDED `success_criteria`);
  `habit_completions` INTENDED `location`. Config (type/frequency/domain/counts/streak cache) plaintext. `[FACT: §5.5 [E]]`
- **HB-2 — Streak cache is derived, never stored truth.** `current_streak`/`longest_streak`/`total_completions`
  recompute from the `habit_completions` ledger; the columns are a cache. `[FACT: §5.5; INTENT G2]`
- **HB-3 — One completion per (`habit_id`,`completed_date`)** — UNIQUE, upsert. `[FACT: §5.5 UNIQUE]`
- **HB-11 — Cascade delete (app-layer, no-FK).** Deleting a habit deletes its completions; §5.5's `habit_id … ON
  DELETE CASCADE` → plain TEXT (BR-DB3-1; cascade is the app/sync layer's). Soft-delete hides the habit. `[FACT: §5.5; BR-DB3-1]`
- **HB-13 — The habit is a pursuable (measurable).** Carries `measurement_kind` (natural **`rate`**) + `binding_mode`
  (a completion is the derived-natural `event-trigger`). Its rate **derives** on read — **no stored `progress` slot**,
  **no `nesting_weight`** (habits ladder UP to purpose via `contributions.contribution_percentage`, not a nesting).
  `[FACT: business-rules.md HB-13; ADR-011 M1/M2/M3]`
- **HB-12 — Local-first, LWW; ledger merges by (`habit_id`,`completed_date`).** `[FACT: ADR-003]`

### Enum CHECK sets (schema-relevant, all FIXED → SQL CHECK, tuple-sourced)
`habits.habit_type` (HABIT_TYPE 2) · `frequency` (HABIT_FREQUENCY 5) · `time_of_day` (HABIT_TIME_OF_DAY 5) ·
`domain` (LIFE_DOMAIN 8) · `measurement_kind` (MEASUREMENT_KIND 4) · `binding_mode` (BINDING_MODE 3, nullable) ·
**`difficulty` (HABIT_DIFFICULTY — NET-NEW 5)**. The `mood_*`/`ease_rating`/`satisfaction` are **numeric range CHECKs**
(`BETWEEN 1 AND 5`, 002_sessions.ts precedent), **not** tuple-sourced → not enum-parity rows.

---

## §3. Intended shape — the 3 tables (FACT floor + INTENDED, cited)

### §3a. `habits` — the habit definition + streak cache `[FACT: ADR-002 §5.5 L1658-1697]`
`...baseColumns` · `name[E]` NN · `description[E]` · `habit_type` CHECK NN dflt 'build' · `frequency` CHECK NN dflt
'daily' · `days_of_week` TEXT (JSON `[0-6]`, plain `text()` — the "NEVER json<T>()" convention) · `target_count`
INTEGER NN dflt 1 · `unit[E]` · `time_of_day` CHECK dflt 'anytime' · `times_of_day` TEXT (JSON) · `cue[E]` · `reward[E]`
· `domain` CHECK (LIFE_DOMAIN, nullable) · `current_streak`/`longest_streak`/`total_completions` INTEGER NN dflt 0
(cache) · `is_active` `boolInt` NN dflt 1 · `sort_order` INTEGER NN dflt 0 · `deleted_at`. **Inline `tags` RETIRED**
→ `entity_tags`. Index `idx_habits_active` partial `WHERE deleted_at IS NULL` (SQL-migration-only).
**INTENDED (build-phase→now):** `measurement_kind` CHECK NN DEFAULT **`'rate'`** (HB-13 doc-licensed natural) ·
`binding_mode` CHECK **nullable, no default** (override-slot; NULL⇒derive `event-trigger` — the Tasks-gate-2 grain) ·
`success_criteria` **[E]** (G8) · `difficulty` CHECK **HABIT_DIFFICULTY** nullable (G8).

### §3b. `habit_completions` — per-date ledger `[FACT: ADR-002 §5.5 L1703-1726]`
`...baseColumns` (adds `updated_at` — the task_time_logs precedent) · `habit_id` (no-FK) · `completed_date`
(YYYY-MM-DD) · `count` INTEGER NN dflt 1 · `value` **REAL** (drizzle `real`) · `mood_before`/`mood_after`/`ease_rating`/
`satisfaction` INTEGER (range CHECK 1–5) · **NO `deleted_at`** (ledger — hard-deletes with the habit) · **UNIQUE
(`habit_id`,`completed_date`)** · index `idx_habit_comp_date` on `completed_date`.
**INTENDED:** `location` **[E]** (G8) · `completion_time` `timestampMs` INTEGER (G8 — a full completion *moment*
(pairs with `location` = "where & when I did it"), **not** a `calendarDate`/time-of-day string; Unix-ms per the
platform timestamp convention. Docs name the field, not the type).

### §3c. `project_habits` — kept Projects↔Habits junction (deferred here from #5) `[FACT: ADR-002 §5.5 L2006-2018; conventions.md:55]`
v2 reconcile to the **`entity_tags` junction convention**: `...baseColumns` (synthetic UUIDv7 `id` PK, NOT the §5.5
composite PK) · `project_id` (no-FK) · `habit_id` (no-FK) · `deleted_at` · **UNIQUE(`project_id`,`habit_id`)** (preserves
the composite-PK pair-uniqueness) · index on `project_id`. **KEPT, never retired** (C1 guard). Not a polymorphic target
→ not registered.

### §3d. `ENTITY_TYPES` registry — reconcile append
`+= 'habit'` (valid `pages`/`entity_links`/`entity_tags` target — notes + shared tags). `habit_completions` +
`project_habits` addressed via their refs → **not** registered. `[FACT: ADR-006 §3.2; conventions.md:23,31]`

### §3e. `@vida/types` — net-new enum authored now; interfaces → DB-11
- **NET-NEW tuple `HABIT_DIFFICULTY = ['very_easy','easy','medium','hard','very_hard']`** in `habit.ts` — needed for
  the CHECK (the TASK_KIND precedent; distinct from the 4-value `TOPIC_DIFFICULTY`). `[FACT: conventions.md:39]`
- Interface reconcile (`Habit` +`measurement_kind`/`binding_mode`/`success_criteria`/`difficulty`, −`tags`;
  `HabitCompletion` +`updated_at`/`location`/`completion_time`; **new `ProjectHabit`**) → **DB-11** (mirror-only;
  no `$inferSelect`↔interface assertion → compiles).

---

## §4. Physical home & authoring model
- **CREATE** `schema/habits.ts` (3-table Drizzle mirror) + `migrations/017_habits.ts` (hand-written SQL, v17).
- **MODIFY** `@vida/types/habit.ts` (+`HABIT_DIFFICULTY`), `schema/index.ts` (export), `schema/_registry.ts`
  (`+= 'habit'`), `migrations/runner.ts` (register `migration017Habits`; `LATEST_VERSION`=17).
- Tests: enum-parity FIXTURE (7 rows: habit_type/frequency/time_of_day/domain/measurement_kind/binding_mode/difficulty)
  + splice migration017 into `ddlFor`; new `db/tests/habits-introspection.test.ts` (3 tables).
- **Encryption (BR-DB6-3):** `[E]` fields are the M3 target; Repository registers an EMPTY `[E]` set in M1.0.

---

## §5. Phase-1 completion checklist
- [x] All 5 aspects of `docs/features/habits/` + ADR-002 §5.5/§5.20 + ADR-011 §3.1/§3.2/§3.4 read.
- [x] Concept grep (measurement_kind/binding_mode/difficulty/project_habits/junction-shape).
- [x] FACT floor (2 §5.5 tables + kept `project_habits`) + INTENDED (measurability + G8) separated, each cited.
- [x] Boundaries scoped OUT with citations; no manufactured DEFAULT (`binding_mode` nullable, per Tasks gate-2).

### Shape resolutions — ALL doc/convention-determined (ZERO decisions for Phase 3)
1. **3 tables** (`habits` + `habit_completions` §5.5 FACT floor + `project_habits` kept junction, deferred from #5). `[FACT: §5.5; conventions.md:55]`
2. **`measurement_kind` NN DEFAULT 'rate'; `binding_mode` nullable no-default** (override-slot grain, Tasks precedent). `[FACT: HB-13; ADR-011 §3.2]`
3. **No `progress`/`nesting_weight` on habits** (rate derives; ladders via `contributions`). `[FACT: HB-13]`
4. **G8 restored fields authored** (`success_criteria`[E], `difficulty`, `location`[E], `completion_time`). `[INTENT G8; build-phase]`
5. **`project_habits` → `entity_tags` v2 junction shape** (synthetic id + UNIQUE, no-FK). `[FACT: spaces.ts entityTags; BR-DB3-1]`
6. **Inline `tags` RETIRED → `entity_tags`; `ENTITY_TYPES += 'habit'`.** `[INTENT ADR-006 SP1]`
7. **`HABIT_DIFFICULTY` net-new tuple** authored now; interfaces → DB-11. `[FACT: conventions.md:39; TASK_KIND precedent]`
8. **`habit_completions` full `baseColumns` (adds `updated_at`), no `deleted_at`** (ledger). `[FACT: task_time_logs precedent]`

_String-check (self-analysis): clean — no decision / lean / TBD / open-point / either-or._

---

## Phase 2 — Current-state read (reconcile-and-extend baseline)
### Already authored — DO NOT re-create
`entity_tags` · `pages` · `contributions` (substrate) · `projects` (group #5 — `project_habits` refs it, no-FK) ·
`_shared.ts` helpers (`baseColumns`/`enumText`/`boolInt`/`calendarDate`/`timestampMs`). `LIFE_DOMAIN` in `common.ts`.

### To author — 3 confirmed ABSENT (net-new in v2)
`habits` · `habit_completions` · `project_habits` — no `schema/habits.ts`; v1 forms in `_legacy/` only.

### `ENTITY_TYPES` diff · Migration slot · `@vida/types`
Append `'habit'`. Highest migration = `016_projects` (v16) → new `017_habits` (v17). Net-new enum `HABIT_DIFFICULTY`.

### Baseline verdict
Net-new authoring (mirror group #4/#5). `real` is the first REAL column in v2 (import `real` from drizzle-orm/sqlite-core).

---

## Phase 3 — Implementation Plan (gate-1 draft)
### §P3.0 — Grounding recap
1. Measurability on `habits` (build-phase INTENDED); `measurement_kind` NN DEFAULT 'rate', `binding_mode` nullable.
2. `project_habits` authored here (kept junction, deferred from #5), reconciled to the entity_tags v2 shape.
3. G8 restored fields authored; `HABIT_DIFFICULTY` net-new enum; interfaces → DB-11.
4. No `progress`/`nesting_weight` on habits (HB-13). `mood_*` = range CHECK, not enum-parity rows.

### §P3.1 — Exact DDL intent
Per §3a-§3c. All full `...baseColumns` except `project_habits`/`habits` add `deleted_at` and `habit_completions`
omits it. No-FK on every ref. FIXED enums → SQL CHECK from the `@vida/types` tuple. `measurement_kind` NN DEFAULT
'rate'; `binding_mode` nullable no-default; `difficulty` nullable. `value` = REAL. Range CHECK `BETWEEN 1 AND 5` on
the 4 rating cols. UNIQUE(`habit_id`,`completed_date`) + UNIQUE(`project_id`,`habit_id`).

### §P3.2 — Registry & validators
`_registry.ts += 'habit'`. `@vida/types/habit.ts += HABIT_DIFFICULTY`. Zod (DB-9) reuses tuples — no change owed.

### §P3.3 — Files, migration, tests
CREATE `schema/habits.ts`, `migrations/017_habits.ts`, `db/tests/habits-introspection.test.ts`; MODIFY `habit.ts`,
`schema/index.ts`, `_registry.ts`, `runner.ts`, `enum-parity.test.ts` (7 rows + splice).

### §P3.4 — DB-11 deferrals (cited, not fixed here)
`Habit` (+4 −`tags`) · `HabitCompletion` (+`updated_at`/`location`/`completion_time`) · new `ProjectHabit`.

### §P3.5 — Plan checklist (pre-critique)
- [x] DDL intent complete + cited · [x] no-FK · [x] no manufactured default · [x] net-new enum scoped · [x] registry
- [x] migration slot · [x] files/tests named · [x] boundaries scoped with citations

### §P3.6 — Gate-1 critique verdict (independent) → SHIP
Independent critic, 2026-08-19. Verdict **SHIP** — no blocker/material. Verified correct: FACT floor · `binding_mode`
nullable-no-default (the group-#4 trap correctly avoided) · `measurement_kind` NN DEFAULT 'rate' doc-licensed ·
`project_habits` homed here + reconciled to the entityTags junction shape (synthetic id + UNIQUE + deleted_at) ·
no progress/nesting_weight on habits (HB-13) · `HABIT_DIFFICULTY` genuinely net-new · `habit_completions` ledger
(baseColumns +updated_at, no deleted_at). 4 MINOR (confirmatory/polish): MINOR-1 `completion_time` type justification
FIXED (§3b clause added); MINOR-2/3/4 no-action (DB-11 deferral real; `_sync_field_ts` is a platform-wide deferral
consistent across all DB-4 groups; 7 parity rows correct).

### §P3.7 — Approval 1 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → preflight
### §P3.8 — Preflight → PASSED (6 folds)
1. **`real`** — first REAL column in v2; `import { real } from 'drizzle-orm/sqlite-core'`; `real('value')` (nullable). `[FACT: no existing real( in schema/]`
2. **`boolInt('is_active').notNull().default(true)`** → SQL `INTEGER NOT NULL DEFAULT 1` (capability.ts precedent; introspection normalizes `true`→`'1'`).
3. **JSON cols** `days_of_week`/`times_of_day` → plain `text()` (the "NEVER json<T>()" convention, capability.ts:7).
4. **`domain`** = `enumText('domain', LIFE_DOMAIN)` **nullable** (§5.5: CHECK, no NOT NULL, no default). `LIFE_DOMAIN` exists (common.ts:54).
5. **Rating cols** `mood_before`/`mood_after`/`ease_rating`/`satisfaction` = `integer()` + SQL `CHECK (… BETWEEN 1 AND 5)` (002_sessions.ts:32 precedent) — **not** enum-parity rows.
6. **Composite UNIQUE in the mirror** = `unique('name').on(t.a, t.b)` (economy.ts:52, sync-queue.ts:40 precedent) + SQL `UNIQUE(a,b)`; `import { unique }`. For `habit_completions`(habit_id,completed_date) + `project_habits`(project_id,habit_id).

### §P3.9 — Gate-2 critique (independent, post-preflight) → SHIP
Independent critic, 2026-08-19. Verdict **SHIP** — zero blocker/material; 10 implementation-readiness points traced
against 001–016 precedents (default-normalizer passes for boolInt/measurement_kind/nullable cols · habit_completions
updated_at-present/no-deleted_at · project_habits synthetic-id PK + composite UNIQUE · domain nullable · range CHECK ·
all tuples exist / HABIT_DIFFICULTY net-new · 7 parity rows · ddlFor splice). 3 MINOR (wording/confirmatory): `LATEST_VERSION`
is derived not assigned (append to `ALL_MIGRATIONS`); introspection test drives migration017 alone; DB-11 deferral consistent.

### §P3.10 — Approval 2 ✅ (2026-08-19, self-cleared — zero-decision, doc-determined) → Phase 4 (implement)

## Phase 4 — Implement (DONE)
- MODIFY `@vida/types/habit.ts` (+`HABIT_DIFFICULTY` net-new tuple; rebuilt `@vida/types` dist so `@vida/core` sees it).
- CREATE `schema/habits.ts` (3-table mirror) + `migrations/017_habits.ts` (hand-written SQL, v17).
- MODIFY `schema/index.ts` (export), `schema/_registry.ts` (`+= 'habit'`), `migrations/runner.ts` (register `migration017Habits`).
- Tests: 7 enum-parity FIXTURE rows + splice migration017 into `ddlFor`; new `db/tests/habits-introspection.test.ts`.

## Phase 5 — Foundation-soundness verify (DONE)
- **DDL-introspection parity** (`habits-introspection.test.ts`, 12 cases: column-set · nullability · PK · default × 3) — GREEN.
- `@vida/core` **283 tests** green (was 264 → +12 introspection + 7 enum-parity); typecheck clean; eslint 0-err; `LATEST_VERSION`=17.
- Independent post-impl `/critique` → **SHIP** (30+ points: SQL↔mirror faithful, `binding_mode` trap avoided, no-FK universal,
  7 CHECK sets match tuples, 7 `[E]` dual-marked, `HABIT_DIFFICULTY` net-new, ledger/junction shapes correct, FACT-floor complete).
- **§XXIX Currency promote:** `database-layer/current-spec.md` (roster + group #6 narrative + count 6/22) +
  `current-business-rules.md` (BR-HB6-*) updated — ship in the same commit.
- **Foundation-readiness:** MOD-habits finds every promised §5.5 column + the INTENDED measurability/G8 fields — PASS.

### Deferred / cross-group (tracked, not this unit)
- **DB-11 interface reconcile:** `Habit` (+`measurement_kind`/`binding_mode`/`success_criteria`/`difficulty`, −`tags`) ·
  `HabitCompletion` (+`updated_at`/`location`/`completion_time`) · new `ProjectHabit`.
- HB-8 `contribute_purpose_metric` · HB-9 `award_xp`→`grant_currency` (ADR-004/012 services) · HB-10 backfill window (Preferences) · streak M5 seam (R7).
