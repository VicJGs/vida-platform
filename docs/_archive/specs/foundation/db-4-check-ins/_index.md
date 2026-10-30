# DB-4 · Domain Group #16 — Check-ins · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #16 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `026_check_ins` (v26) · **Schema file:** `schema/check-ins.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** check-ins ✅IMPLEMENTED (2026-07-24, LITE gate SHIP/0-blocking) — the ADR-realignment (E9 split · E2 feeder · SP1/SP4 tags-vs-links) is DONE; its payload is **cite-not-author**. The DDL + the intake's own fixes are THIS build's job.

> The **lightest DB-4 group** — **3 tables** (structured daily-reflection / template form-builder), the lone non-ingest
> unit. Every shape is doc-determined; **zero build-decisions**, consistent with groups #1–#14.

## §0. Source model

Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/check-ins/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects) ·
`docs/intake/check-ins.md` §Resolution (**WHOLE**, Victor 2026-06-28) · `part-1.2-reruns/check-ins.md` (implemented) ·
`ADR-002 §5.13` (exact 3-table DDL floor, L3236-3316) + §Check-ins P/E table (L998-1044, the [E] rationale) ·
`packages/types/src/entities/user.ts` (the **existing** check-in enums + interfaces) + `validators/user.ts` (the **existing** Zod).

## §1. Identity — what this unit is

A **structured daily-reflection** module: template-driven morning/afternoon/evening check-ins + weekly/monthly/yearly
reviews, all `[E]`, local-first. 3 owned tables: `daily_check_ins` (a check-in instance) · `check_in_templates`
(a reusable form) · `check_in_template_questions` (typed questions). A small **form-builder** — the built-in default-template
fields are real columns (CK-4); extra user-added questions' answers live in `custom_data` JSON. Wave-1 independent domain.

### Scope boundary — doc-DECIDED (build-phase fixes / cite-not-author split)

The rerun's driver payload is **entirely cite-not-author**; the intake §Resolution (WHOLE) carries the **build-phase fixes**
this unit authors ([[build-phase-flags-mean-resolve-now-not-defer]]).

**AUTHOR (settled → build-phase, intake §Resolution WHOLE):**

- **CK-2 (G2):** `daily_check_ins` uniqueness `UNIQUE(check_in_date)` → **`UNIQUE(check_in_date, check_in_type)`** (the bug
  fix — the single-column UNIQUE forbids morning+evening on the same day, contradicting CLAUDE.md §9).
- **CK-3 (G3):** `check_in_type` expands **3→6** (`+afternoon, monthly_review, yearly_review`) — **amend the EXISTING
  `CHECK_IN_TYPE` tuple** (`entities/user.ts:103`), not a new enum.
- **G10:** register `daily_check_in` in `_registry.ts` `ENTITY_TYPES` (a `pages`/`entity_links` target — the
  check-in↔Journal-day-page link, CK-7). **No tags** (SP1 opt-out; registration valid, tagging is a per-use choice).

**OUT (owned elsewhere / cite-not-author — the rerun's whole payload):**

- **E9 `check_in_streak*` (ADR-012)** — check-ins _owns_ the streak but it is **DERIVED from `daily_check_ins`** → **no
  stored column here**. Cross-group note only: Gamification (#21) `user_profile` must omit `check_in_streak`/
  `longest_check_in_streak`/`last_check_in_date` (they currently sit on `entities/user.ts:58-60`, removed in #21; already
  flagged in the group #2 E9 note). Nothing to author on the 3 tables.
- **E2 `grant_currency(XP)` (ADR-012)** — completion/streak _emits_ a feeder event; Gamification applies the grant →
  `consequence_ledger`. **No economy column** here.
- **SP1/SP4 tags-vs-links (ADR-006)** — the "no tags" stance is SP1-consistent (deliberate opt-out from `entity_tags`);
  links ride `entity_links` (SP4). **No `tags` column.**
- **Review aggregation (G7/CK-6)** — review check-ins read Purpose/Projects/Tasks via integration + optional `entity_links`
  rows; **no new column** (a cross-module service contract, finalized with those modules).
- **Reminders/scheduling (G8/CK-8)** — Preferences + Notifications-owned; the template already carries
  `schedule_type`/`preferred_time`/`schedule_days`. No new column.

### Boundary — what this unit is NOT (doc-cited)

NOT the streak/XP engine (E9 derived, E2 Gamification-owned) · NOT the reminder/notification dispatcher · NOT the review
aggregation service · NOT tagged (SP1 opt-out) · NOT measurable (C-M) · NOT ingest/AI/session (C-XAI).

## §2. Business Rules (inherited invariants the intake honors)

- **CK [E] set** (ZK-1): `mood_score`/`energy_level` **plaintext** (trend charts, L1005); user-generated lists
  (`top_intentions`/`wins`/`gratitude`/`challenges`/`tomorrow_focus`), `reflection`, `custom_data`, template
  `name`/`description`, question `label`/`placeholder` are `[E]` (L1006-1042). (M1.0 = empty `[E]` set, pass-through —
  BR-DB6-3; marked via `@encrypted` JSDoc.)
- **CK-2** — a check-in is keyed by (`check_in_date`, `check_in_type`) — one per slot per day (the composite UNIQUE).
- **CK-4** — default-template fields = the materialized columns; extra answers = `custom_data` JSON (no duplication).
- **CK-10 referential integrity — app/sync-layer under no-FK.** `daily_check_ins.template_id` **SET NULL** on template
  delete (entry survives); `check_in_template_questions` **CASCADE** on template delete. Under no-FK the DDL carries
  plain-TEXT refs, **no `REFERENCES`**; SET-NULL/CASCADE is app-layer. **Hard-delete lifecycle → no `deleted_at`.**
- **CK-9** — no tags (SP1 opt-out); links via `entity_links` (SP4).

### Enum CHECK sets — reuse the EXISTING `@vida/types` tuples (4 parity rows)

All four check-in enums **already exist** in `entities/user.ts` (colocated with the historical `user_profile`). One is amended
(CK-3); the rest are used as-is. **No new enum file, no new validator** (`validators/user.ts:19-22` already wraps all four).
| Table.column | Tuple (`@vida/types`, existing) | Members |
|---|---|---|
| `daily_check_ins.check_in_type` | `CHECK_IN_TYPE` (`user.ts:103`) | **AMEND 3→6** `+afternoon/monthly_review/yearly_review` (CK-3); DEFAULT `'morning'` |
| `check_in_templates.schedule_type` | `CHECK_IN_SCHEDULE_TYPE` (`user.ts:105`) | `daily, weekly, custom` (3, nullable) |
| `check_in_templates.preferred_time` | `CHECK_IN_PREFERRED_TIME` (`user.ts:107`) | `morning, afternoon, evening, anytime` (4, nullable) |
| `check_in_template_questions.field_type` | `CHECK_IN_QUESTION_FIELD_TYPE` (`user.ts:110`) | `mood_scale, energy_scale, text_list, text_area, rating, boolean` (6, NOT NULL) |

**Numeric-BETWEEN CHECKs (SQL, NOT tuple-sourced → NOT parity rows — the habits mood-rating precedent):**
`daily_check_ins.mood_score` `BETWEEN 1 AND 10` · `energy_level` `BETWEEN 1 AND 10` (both nullable, plaintext).

## §3. Intended shape — 3 tables (floor + CK-2/CK-3 fixes, cited)

- `daily_check_ins` + `check_in_templates`: `...baseColumns` (id · created*at · updated_at · 6 `\_sync*\*`) — the
`SyncableEntity` interfaces (`user.ts:120/145`).
- `check_in_template_questions`: **`id` (uuidPk) + `...syncColumns` — NO `created_at`/`updated_at`** (the §5.13 floor omits
  them; the interface `extends SyncMetadata` + explicit `id`, `user.ts:159-160; sync.ts:18`). A documented FACT, not a choice.
- **No `deleted_at` on any** (§3 shape-resolution 2). No cross-table FK (`template_id` ×2 plain TEXT; SET-NULL/CASCADE
  app-layer — CK-10). FIXED enums → SQL CHECK from the tuple.

### §3a. `daily_check_ins` `[FACT: §5.13 L3236-3261; AMEND CK-2 composite UNIQUE, CK-3 type expansion]`

`...baseColumns` · `template_id`(plain TEXT, no-FK, nullable — was SET NULL) · `check_in_date`(NOT NULL, YYYY-MM-DD — the
inline `UNIQUE` REMOVED, now part of the composite) · `check_in_type`(CHECK `CHECK_IN_TYPE` 6, NOT NULL DEFAULT 'morning') ·
`mood_score`(INT, `CHECK BETWEEN 1 AND 10`, nullable) · `energy_level`(INT, `CHECK BETWEEN 1 AND 10`, nullable) ·
`top_intentions[E]` · `wins[E]` · `gratitude[E]` · `challenges[E]` · `tomorrow_focus[E]` (JSON arrays) · `reflection[E]` ·
`custom_data[E]`(JSON). **`UNIQUE(check_in_date, check_in_type)`** (CK-2 fix). No `deleted_at`.

### §3b. `check_in_templates` `[FACT: §5.13 L3267-3288]`

`...baseColumns` · `name[E]`(NOT NULL) · `description[E]` · `icon`(DEFAULT 'clipboard-check') · `is_default`(NOT NULL DEFAULT 0) · `is_active`(NOT NULL DEFAULT 1) · `schedule_type`(CHECK `CHECK_IN_SCHEDULE_TYPE` 3, nullable) · `schedule_days`(JSON
[0-6]) · `preferred_time`(CHECK `CHECK_IN_PREFERRED_TIME` 4, nullable) · `sort_order`(NOT NULL DEFAULT 0). No `deleted_at`
(`is_active` governs lifecycle; CK-10 hard-delete).

### §3c. `check_in_template_questions` `[FACT: §5.13 L3294-3316; interface SyncMetadata]`

**`id`(uuidPk) + `...syncColumns`** (NO `created_at`/`updated_at` — floor + `SyncMetadata`) · `template_id`(plain TEXT,
no-FK, NOT NULL — was CASCADE) · `field_key`(NOT NULL) · `label[E]`(NOT NULL) · `field_type`(CHECK
`CHECK_IN_QUESTION_FIELD_TYPE` 6, NOT NULL) · `placeholder[E]` · `is_required`(NOT NULL DEFAULT 0) · `min_value`(INT) ·
`max_value`(INT) · `sort_order`(NOT NULL DEFAULT 0). **`UNIQUE(template_id, field_key)`** (doc-fixed). No `deleted_at`.

### §3d. `ENTITY_TYPES` registry — append

`_registry.ts` `ENTITY_TYPES += 'daily_check_in'` — a `pages`/`entity_links` target (the check-in↔Journal-day-page link,
G10/CK-7). **Already in the separate `note.ts` `ENTITY_LINK_TARGET` list (`:56`)** — that list needs no edit; the
`_registry.ts` append is the DB-4 registry (pages coverage), absent today (grep 0). **No tags** (SP1 opt-out).
`check_in_template`/`check_in_template_question` NOT registered (config/child — the `habit_completions` precedent).

### §3e. `@vida/types` — RECONCILE-AND-EXTEND the existing types (NOT net-new)

The 4 enums + 3 interfaces **already exist** (`entities/user.ts:103-170`); the 4 Zod validators exist (`validators/user.ts:19-22`).

- **ONLY edit:** amend `CHECK_IN_TYPE` (`user.ts:103`) `['morning','evening','weekly_review']` → 6 members (CK-3). The
  `CheckInTypeSchema` (`z.enum(CHECK_IN_TYPE)`) and `DailyCheckIn.check_in_type: CheckInType` **auto-inherit** the expansion
  (tuple-sourced) — no validator/interface edit needed.
- **Do NOT create** `packages/types/src/check-in.ts` or `validators/check-in.ts` (would double-export `CHECK_IN_TYPE` etc. →
  barrel collision). The enums stay in `entities/user.ts` (a pre-existing colocation; relocating them is a refactor out of scope).
- Interface reconcile (any residual `DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion` drift vs the mirror) → **DB-11**.

## §4. Physical home & authoring model

- `packages/core/src/db/schema/check-ins.ts` (NEW) — 3 Drizzle mirrors (query-type only). `daily_check_ins`/`check_in_templates`
  = `...baseColumns`; `check_in_template_questions` = `{ id: uuidPk(), …, ...syncColumns }`. No `deleted_at` on any.
- `packages/core/src/db/migrations/026_check_ins.ts` (NEW) — hand-written SQL DDL (3 CREATE TABLE + 2 UNIQUE + 2
  numeric-BETWEEN CHECKs), `up()` only, no self-transaction. Registered in `migrations/runner.ts` `ALL_MIGRATIONS`.
- `schema/index.ts` barrel += `export * from './check-ins'`.
- `schema/_registry.ts` `ENTITY_TYPES` += `'daily_check_in'`.
- `packages/types/src/entities/user.ts` — **amend `CHECK_IN_TYPE` 3→6** (the sole types-layer edit).
- `validators/enum-parity.test.ts` += migration-026 import + the `ddlFor` apply-chain (25→26) + 4 FIXED parity rows
  (importing the EXISTING `CHECK_IN_TYPE`/`CHECK_IN_SCHEDULE_TYPE`/`CHECK_IN_PREFERRED_TIME`/`CHECK_IN_QUESTION_FIELD_TYPE`).
- `db/tests/check-ins-introspection.test.ts` (NEW) — mirror #16; PRAGMA vs the 3 Drizzle mirrors (col-set/nullability/pk/defaults).
- **No new validator file** (`validators/user.ts` already wraps the 4 tuples).

## §5. Phase-1 completion checklist

- [x] intake §Resolution (WHOLE) + rerun (implemented) + all 5 aspects read; roster = `structure-data.md` authoritative
- [x] §5.13 exact DDL read (L3236-3316) + the §Check-ins P/E table (L998-1044); [E] set + enum vocabs grounded
- [x] **current-state read CORRECTED** (gate-1 catch): the 4 enums + 3 interfaces live in `entities/user.ts`, validators in
      `validators/user.ts` → reconcile-and-extend (amend `CHECK_IN_TYPE` 3→6), NOT net-new. `schema/`/migration/registry are clean-add.
- [x] `deleted_at`=NONE + `check_in_template_questions` no-timestamps are **documented FACTs** (§5.13 + P/E table + interfaces). NOT flagged calls.
- [x] no-FK (CK-10); no M\* (C-M); no tags (SP1); no economy col (E2 cite); E9 derived (no col); zero build-decisions

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)

1. **no-FK** — `template_id` ×2 plain TEXT, no `REFERENCES`; SET-NULL/CASCADE app-layer (CK-10; ADR-016 §3.4 + 15 prior groups).
2. **`deleted_at` = NONE (documented FACT).** §5.13 DDL (L3236-3316) omits it on all 3; the §Check-ins P/E table (L998-1044)
   omits it while **every neighboring domain's P/E table lists `created_at, updated_at, deleted_at`** (`contacts` L609,
   `bucket_list_items` L1066); CK-10 documents the hard-delete lifecycle. Per-module-floor governs (the #14 principle).
3. **`check_in_template_questions` no `created_at`/`updated_at` (documented FACT).** §5.13 omits them (L3294-3316); the P/E
   table omits the Timestamps row for questions (L1044); the interface `extends SyncMetadata` + explicit `id` (`user.ts:159`).
   → `id` + `syncColumns`, not `baseColumns`.
4. **CK-2 composite UNIQUE** — `UNIQUE(check_in_date, check_in_type)` replaces `UNIQUE(check_in_date)` (intake G2).
5. **CK-3 type expansion** — amend the existing `CHECK_IN_TYPE` tuple 3→6 (intake G3); validator/interface auto-inherit.
6. **Enums exist — reconcile, don't create** (gate-1 B1/B2/B3); `field_type` tuple is named `CHECK_IN_QUESTION_FIELD_TYPE`;
   `mood_score`/`energy_level` = numeric BETWEEN (not parity rows); no reuse issue (all four are the module's own tuples).
7. **`ENTITY_TYPES += daily_check_in`** (`_registry.ts`; `note.ts` `ENTITY_LINK_TARGET` already has it); no tags (SP1).

## Phase 2 — Current-state read (reconcile-and-extend baseline)

### Already authored — DO NOT re-create

- `@vida/types`: `CHECK_IN_TYPE`/`CHECK_IN_SCHEDULE_TYPE`/`CHECK_IN_PREFERRED_TIME`/`CHECK_IN_QUESTION_FIELD_TYPE` +
  `DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion` (`entities/user.ts:103-170`). Validators (`validators/user.ts:19-22`).
- `note.ts` `ENTITY_LINK_TARGET` already lists `'daily_check_in'` (`:56`).
- `pages`/`entity_links` substrate (AR-6/N&P); `consequence_ledger`/`currencies` (DB-3/AR-7 — the E2 feeder target, cited).

### To author — 3 tables + 1 tuple amend + 1 registry append

3 `schema/` mirrors + `026_check_ins.ts` (all absent — grep-clean); amend `CHECK_IN_TYPE` 3→6; `ENTITY_TYPES += daily_check_in`.

### Baseline verdict

Reconcile-and-extend: **the `@vida/types` layer is EDITED** (`CHECK_IN_TYPE` 3→6), not append-only; the `schema/`/migration/
registry layer is clean-add. Pattern = `relationships.ts`/`025_relationships.ts`/`relationships-introspection.test.ts`, but
enums come from the EXISTING `entities/user.ts` (not a new domain file).

## Phase 3 — Implementation Plan (gate-1 draft, revised post-critique)

### §P3.1 — Exact DDL intent

3 CREATE TABLEs per §3a–§3c (baseColumns on the two entities; `id`+syncColumns on questions; no `deleted_at`; FIXED→CHECK;
numeric→BETWEEN; no REFERENCES) + 2 table-level UNIQUE (`daily_check_ins(check_in_date, check_in_type)`,
`check_in_template_questions(template_id, field_key)`). Drizzle mirrors match 1:1 (`unique().on(...)` for both).

**Nullability (§5.13 floor):**

- **NOT NULL:** `daily_check_ins.{check_in_date, check_in_type DEFAULT 'morning'}` + baseColumns · `check_in_templates.{name,
is_default DEFAULT 0, is_active DEFAULT 1, sort_order DEFAULT 0}` + baseColumns · `check_in_template_questions.{template_id,
field_key, label, field_type, is_required DEFAULT 0, sort_order DEFAULT 0}` + `id` + `_sync_*`.
- **Nullable:** `daily_check_ins.{template_id, mood_score, energy_level, top_intentions, wins, gratitude, challenges,
tomorrow_focus, reflection, custom_data}` · `check_in_templates.{description, icon DEFAULT 'clipboard-check', schedule_type,
schedule_days, preferred_time}` · `check_in_template_questions.{placeholder, min_value, max_value}`.

### §P3.2 — Registry & validators

`ENTITY_TYPES += 'daily_check_in'`. Amend `CHECK_IN_TYPE` 3→6 in `entities/user.ts`. NO new validator file (existing
`validators/user.ts` auto-covers). 4 parity rows import the existing tuples.

### §P3.3 — Files, migration, tests

`schema/check-ins.ts` (NEW) · `migrations/026_check_ins.ts` (NEW, +runner) · `index.ts` barrel · `_registry.ts` +1 ·
`entities/user.ts` (`CHECK_IN_TYPE` 3→6) · `enum-parity.test.ts` (import + apply-chain + 4 rows) ·
`check-ins-introspection.test.ts` (NEW; 3 tables ×4). `boolInt` mirror defaults as `true`/`false` (`finance.ts` precedent).

### §P3.4 — DB-11 deferrals (cited, not fixed here)

`@vida/types` `DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion` reconcile vs the mirror (the `CHECK_IN_TYPE`
expansion flows through automatically). Interface reconcile = DB-11.

### §P3.5 — Plan checklist (pre-critique)

- [ ] 3 tables authored SQL + Drizzle mirror parity · [ ] 4 CHECK↔tuple parity rows green (incl. `CHECK_IN_TYPE` now 6) · [ ] introspection 3×4 green
- [ ] `CHECK_IN_TYPE` 3→6 amended (validator/interface auto-inherit) · [ ] 2 UNIQUE + 2 BETWEEN CHECKs · [ ] ENTITY_TYPES +1 · [ ] runner registers 026 · [ ] typecheck/lint 0 · [ ] §XXIX currency
