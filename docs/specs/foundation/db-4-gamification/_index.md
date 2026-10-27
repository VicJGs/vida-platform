# DB-4 · Domain Group #21 — Gamification ("the System") · Unit Spec

**Task:** db-4-per-domain-schema (LIF-66) · **Group:** #21 of 21 active · **Profile:** Add Backend Component (5-phase schema-foundation)
**Migration slot:** `031_gamification` (v31) · **Schema file:** `schema/gamification.ts` · **Branch:** `db-4-per-domain-schema`
**Rerun:** NONE — no `part-1.2-reruns/gamification.md`. The 5 aspect docs + `docs/intake/gamification.md` (RESOLUTION **WHOLE**, Victor 2026-07-19) + **ADR-012** ("Points Economy & Consequence Engine", Accepted 2026-07-19) are the source.

> **The reframe is enormous ("the System" — ADR-012) but almost none of it is #21's schema.** The reframe tables
> (`currencies`·`consequence_ledger`·`store`·`rules`) are **already authored DB-3 substrate** (`foundation/economy.ts`) —
> **consumed, not authored**. The rule→consequence engine, typed effects, multi-currency derivation, storage boxes,
> achievement-engine-on-measurement, and level-derivation are all **service logic (M1.1+) / the ADR-004 effect catalogue**
> — "no new engine" (ADR-012 §3.1), NOT tables. So #21 authors the **3 surviving FACT-floor tables** (§5.15). Every shape
> is doc-determined; **zero build-decisions**, consistent with groups #1–#20.

## §0. Source model

Frontend/data source-of-truth = documented intent (`frontend-source-of-truth.md`). Ground truth for THIS unit:
`docs/features/gamification/{identity,business-rules,structure-data,contract,conventions}.md` (all 5 aspects) ·
`docs/intake/gamification.md` §RESOLUTION (**WHOLE**, Victor 2026-07-19) · **no rerun** ·
**ADR-012** (the capstone — esp. **§3.10** the `user_profile` split, §3.3 derived total/level) ·
`ADR-002 §5.15` (the 4-table DDL floor, L3361-3468) + `§5.20` (named-not-enumerated → this build IS the amendment) ·
`packages/types/src/entities/user.ts:13-97` (the **existing** enums + interfaces — the nullability oracle) ·
`packages/core/src/validators/user.ts:16-18` (the **existing** Zod) ·
`packages/core/src/db/schema/foundation/economy.ts:23-87` (the **already-authored** `currencies`/`consequence_ledger`/`store`/`rules` — CONSUMED) ·
`packages/core/src/db/schema/preferences.ts:84-88` + `check-ins.ts` (what the split moved out).

## §1. Identity — what this unit is

The OS's **behavioral incentive & consequence engine** ("the System") — the motivation/consequence plane, partner to
Purposes' meaning plane (ADR-012). But the v2 surface is **4 tables, 0 service logic**; the System model (rule→consequence ·
multi-currency economy · Storage boxes) is INTENDED and rides existing chassis (ADR-004 rail · ADR-011 bindings · ADR-010
capabilities · DB-3 `currencies`/`consequence_ledger`/`store`/`rules`). **This unit's schema footprint = the 3 floor tables
that survive the reframe.**

### Scope boundary — doc-cited (author vs already-DB-3 vs service vs retired)

**AUTHOR (the FACT floor §5.15, minus `xp_history`):**

- **`user_profile`** (singleton) — the GM-12 / ADR-012 §3.10 **post-split residual** (System-owned XP/level caches + PII +
  the fields no sibling took).
- **`achievements`** — app-defined **static seed** catalogue (not user-generated).
- **`user_achievements`** — the earned-join (id + achievement_id + earned_at + progress + sync, UNIQUE).

**OUT — already authored DB-3 substrate (CONSUMED, referenced not re-authored):**

- `currencies` (`economy.ts:23`) · `consequence_ledger` (`economy.ts:36`, the generalized `xp_history`) · `store`
  (`economy.ts:61`, Finance-owned) · `rules` (`economy.ts:87`, the headless-automation primitive). ADR-012's economy spine.

**OUT — service logic / ADR-004 catalogue (not schema tables):**

- The rule→consequence engine, the typed effects (`grant_currency`/`lock_currency`/`move_money`/`surface_notification` —
  ADR-004 §3.2.5 catalogue entries, not Gamification tables), multi-currency derivation (4 quantities DERIVE from
  `consequence_ledger`, GM-4), the achievement-evaluation engine (GM-13, on the ADR-011 seam), level-derivation (GM-14, pure
  fn over a curve — "no new table"). All 0-logic today; M1.1+.

**OUT — retired:**

- **`xp_history` RETIRED** → superseded by `consequence_ledger` (ADR-012 §3.1; DB-3-authored). Not authored; the `XpHistory`
  interface (`entities/user.ts:88`) → DB-11 retire.

### Boundary — what this unit is NOT (doc-cited)

NOT the consequence engine / effect catalogue (service + ADR-004) · NOT the multi-currency ledger (`consequence_ledger`, DB-3) ·
NOT the Storage layer (`store`, Finance/DB-3) · NOT rules (`rules`, DB-3) · NOT streaks (module-owned, GM-11) · NOT persona/
onboarding (Preferences, GM-16) · NOT PII's final home (stays ⚠ until an account entity, §3.10).

## §2. Business Rules (inherited invariants the shape honors)

- **GM-12 / ADR-012 §3.10 — `user_profile` splits by single-writer.** System keeps per-currency total + level (caches,
  GM-4); `check_in_streak*` → Check-ins (DERIVED, no column, #16); `persona`/`motivation_style`/`active_modules`/
  `onboarding_completed` → Preferences (#2, on disk `preferences.ts:85-88`); **PII (`display_name`/`avatar_url`/`birth_date`)
  STAYS** ⚠ (no account entity yet). No field with two writers. `[FACT: ADR-012 §3.10; preferences.ts:85-88]`
- **GM-4 — total_xp/current_level are CACHES, not truth** (balances DERIVE from `consequence_ledger`). The columns still
  exist per the §5.15 floor (the cache); the derivation is service logic. `[FACT: ADR-012 §3.3; GM-4]`
- **GM-18 — Encryption.** `[E]` on user free-text/PII: `user_profile.{focus_areas, display_name, avatar_url, birth_date}`.
  **`achievements` is app-content → all plaintext** (structural: key/category/tier/title/xp_reward/condition are P);
  `user_achievements.progress` = structural JSON, plaintext. `[FACT: GM-18; ADR-002 §5.15 achievements = P]`
- **Static-seed lifecycle (achievements).** `achievements` is app-defined static content — seeded, not user-synced → NO
  `_sync_*`, NO `updated_at`, NO `deleted_at` (the `Achievement` interface extends **neither** `SyncableEntity` nor
  `SyncMetadata`). `[FACT: entities/user.ts:67-79; §5.15 L3405-3423]`
- **LF-2 / ZK-LWW** on the two syncable tables (`user_profile` baseColumns, `user_achievements` syncColumns).

## §3. Intended shape — 3 tables (FACT floor §5.15 − xp_history; nullability = the `entities/user.ts` interface)

### §3a. `user_profile` (singleton) `[FACT: §5.15 L3370-3400; ADR-012 §3.10; interface entities/user.ts:43-64]`

`...baseColumns` (id · created*at · updated_at · 6 `\_sync*\*`—`UserProfile extends SyncableEntity`) + the residual:

| Column                 | Drizzle                         | Null     | Source                                                                                                                                                                                              |
| ---------------------- | ------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `life_stage`           | `text`                          | nullable | interface `string \| null` (L45); stays by elimination — not in the §3.10 move-set, no sibling claimed it (not PII/streak/persona/onboarding), Preferences did NOT take it (`preferences.ts:42-89`) |
| `focus_areas` **[E]**  | `text` NOT NULL DEFAULT `'[]'`  | NOT NULL | interface `string[]` (L47) — non-null JSON array                                                                                                                                                    |
| `display_name` **[E]** | `text`                          | nullable | interface `string \| null` (L50)                                                                                                                                                                    |
| `avatar_url` **[E]**   | `text`                          | nullable | interface `string \| null` (L52)                                                                                                                                                                    |
| `birth_date` **[E]**   | `text`                          | nullable | interface `string \| null` (L54), YYYY-MM-DD                                                                                                                                                        |
| `timezone`             | `text` NOT NULL DEFAULT `'UTC'` | NOT NULL | interface `string` (L55)                                                                                                                                                                            |
| `total_xp`             | `integer` NOT NULL DEFAULT `0`  | NOT NULL | interface `number` (L56); cache (GM-4)                                                                                                                                                              |
| `current_level`        | `integer` NOT NULL DEFAULT `1`  | NOT NULL | interface `number` (L57); cache (GM-4)                                                                                                                                                              |
| `skipped_modules`      | `text` NOT NULL DEFAULT `'[]'`  | NOT NULL | interface `string[]` (L62) — non-null JSON array                                                                                                                                                    |

- **DROPPED (→ owner):** `persona`·`motivation_style`·`active_modules`·`onboarding_completed` → Preferences (#2, on disk);
  `check_in_streak`·`longest_check_in_streak`·`last_check_in_date` → Check-ins (#16, DERIVED — no column).
- **No `deleted_at`** (§5.15 floor omits; singleton, hard lifecycle). **No enum CHECK** (persona — its only CHECK — left).
- **Nullability = the live interface** (the DB-11 oracle), not the stale §5.15 DDL body's bare-nullable `focus_areas`/
  `timezone` ([[stale-source-plus-live-convention-is-fact-not-a-decision]]).

### §3b. `achievements` (app-defined static seed) `[FACT: §5.15 L3405-3423; interface entities/user.ts:67-79]`

`id`(uuidPk) · `key`(text NOT NULL, **UNIQUE**) · `category`(CHECK `ACHIEVEMENT_CATEGORY`, NOT NULL) · `tier`(CHECK
`ACHIEVEMENT_TIER`, DEFAULT `'bronze'`) · `title`(text NOT NULL) · `description`(text, null) · `icon`(text, null) ·
`xp_reward`(integer NOT NULL DEFAULT 0) · `condition`(text JSON, null) · `is_secret`(boolInt NOT NULL DEFAULT false) ·
`created_at`(timestampMs NOT NULL).

- **NO `_sync_*`, NO `updated_at`, NO `deleted_at`** — the FIRST **non-syncable static-seed** table (the `Achievement`
  interface extends neither Syncable nor SyncMetadata; §5.15 has only `created_at`). Hand-composed `{ id: uuidPk(), …,
created_at: timestampMs('created_at').notNull() }`.
  - ⚠ **Forward-pointer (M1.1, not this unit):** the generic `Repository.create()` injects `_sync_*` unconditionally
    (`repository.ts:297-301`), so `achievements` must be **seeded via a dedicated path, NOT the sync Repository** — it is
    app-defined static content. DB-4 authors the schema; the seeding path is an M1.1 service concern.

### §3c. `user_achievements` `[FACT: §5.15 L3429-3443; interface entities/user.ts:81-86]`

`id`(uuidPk) · `achievement_id`(text NOT NULL, **plain TEXT no-FK** — CASCADE app-layer) · `earned_at`(timestampMs NOT NULL) ·
`progress`(text JSON, null) · `...syncColumns` · **`UNIQUE(achievement_id)`**.

- **NO `created_at`/`updated_at`** (`UserAchievement extends SyncMetadata` — the `xp_history`/`check_in_template_questions`
  precedent: `id` + syncColumns). **No `deleted_at`.**

### §3d. `ENTITY_TYPES` registry — append

`_registry.ts` `ENTITY_TYPES += 'achievement'` — a `pages`/`entity_links` target (already in `note.ts` ENTITY_LINK_TARGET:57;
absent from `_registry.ts`, grep-clean — the `daily_check_in` #16 precedent). **NOT** `user_profile` (singleton, not a
polymorphic target) / `user_achievement` (addressed via `achievement_id`).

### §3e. `@vida/types` — RECONCILE-AND-EXTEND (NOT net-new)

The 2 enums (`ACHIEVEMENT_CATEGORY`, `ACHIEVEMENT_TIER`, `entities/user.ts:23-37`) + 3 interfaces (`UserProfile`,
`Achievement`, `UserAchievement`, L43-86) **already exist**; the 3 Zod validators (`PersonaSchema`/`AchievementCategorySchema`/
`AchievementTierSchema`, `validators/user.ts:16-18`) exist. `PERSONA` is Preferences' now (used by `user_preferences.persona`,
enum-parity:250) — untouched here.

- **NO types-layer edit this build.** No new enum, no new validator, no new file.
- **UserProfile interface reconcile** (shed the 7 moved fields to match the split table) → **DB-11** (standing mirror-only
  boundary). **`XpHistory` interface retire** (xp_history table not authored) → **DB-11**.

## §4. Physical home & authoring model

- `packages/core/src/db/schema/gamification.ts` (NEW) — 3 Drizzle mirrors. `userProfile` = `...baseColumns` + §3a;
  `achievements` = hand-composed `{ id, …, created_at }` (**no sync**); `userAchievements` = `{ id, …, ...syncColumns }`
  (no created_at/updated_at) + `unique().on(achievement_id)`. No `deleted_at` on any.
- `packages/core/src/db/migrations/031_gamification.ts` (NEW) — hand-written SQL DDL (3 CREATE TABLE + `achievements.key`
  UNIQUE + `user_achievements` UNIQUE + 2 CHECK on achievements), `up()` only, no self-transaction. Registered in
  `migrations/runner.ts` `ALL_MIGRATIONS` (import + append).
- `schema/index.ts` barrel += `export * from './gamification'`.
- `schema/_registry.ts` `ENTITY_TYPES` += `'achievement'`.
- `validators/enum-parity.test.ts` — append `migration030Journals.up(driver)` **and** `migration031Gamification.up(driver)`
  to the `ddlFor` chain (currently ends at 029; 030 was omitted when journals shipped — add both to keep the chain
  gapless/sequential; 031 is self-contained but the complete chain is the correct form) + import
  `ACHIEVEMENT_CATEGORY`/`ACHIEVEMENT_TIER` + **2 parity rows** (`achievements.category` → `ACHIEVEMENT_CATEGORY`;
  `achievements.tier` → `ACHIEVEMENT_TIER` — the EXISTING tuples). `entity_type` takes NO parity row (OPEN, registry-validated).
- `db/tests/gamification-introspection.test.ts` (NEW) — apply 031 in-memory (PRAGMA), diff the 3 tables vs the mirrors on
  col-set/nullability/pk/defaults + guards (achievements no-sync/no-updated_at/no-deleted_at; user_achievements
  no-created_at/updated_at + UNIQUE(achievement_id); no deleted_at on any).

**NOT edited (doc-cited):** no new `@vida/types` enum/interface/validator (reconcile-and-extend; interface reconcile + XpHistory
retire → DB-11); no ADR-002 §5-body edit (named-not-enumerated §5.20; stale-source rule); `currencies`/`consequence_ledger`/
`store`/`rules` untouched (DB-3-owned, consumed).

## §5. Phase-1 completion checklist

- [x] all 5 aspects + intake §RESOLUTION (WHOLE) + ADR-012 (§3.1/§3.3/§3.10) read; roster = §5.15 floor − `xp_history`
- [x] reframe tables confirmed **already authored** (`economy.ts:23-87`) → consumed, not authored; the System = service logic
- [x] colocation confirmed & handled: enums + interfaces live in `entities/user.ts` → reconcile-and-extend, zero net-new types
- [x] `user_profile` split grounded in ADR-012 §3.10 + on-disk Preferences (`preferences.ts:85-88`) + Check-ins (#16 derived)
- [x] nullability = the **live interface** (`entities/user.ts`), not the stale §5.15 DDL body — a documented FACT
- [x] `achievements` non-syncable static-seed shape = interface + §5.15 floor (FACT); no-FK; 2 CHECK reuse existing tuples — **zero build-decisions**

### Shape resolutions — ALL doc-determined (ZERO decisions for Phase 3)

1. **3 tables = §5.15 floor − `xp_history`** (retired → `consequence_ledger`, DB-3). The reframe tables are DB-3-authored (consumed).
2. **`user_profile` residual = ADR-012 §3.10 split** — drops persona/motivation_style/active_modules/onboarding_completed
   (→ Preferences, on disk) + check_in_streak\* (→ Check-ins, derived); keeps PII + life_stage + focus_areas[E] + timezone +
   skipped_modules + total_xp/current_level. No deleted_at.
3. **Nullability = the `entities/user.ts` interface** (the $inferSelect oracle): `focus_areas`/`timezone`/`total_xp`/
   `current_level`/`skipped_modules` NOT NULL (with defaults `'[]'`/`'UTC'`/`0`/`1`/`'[]'`); `life_stage`/PII nullable. The
   stale §5.15 body's bare-nullable `focus_areas`/`timezone` is voided by the live interface.
4. **`achievements` non-syncable static-seed** — `id + fields + created_at` only, no `_sync_*`/`updated_at`/`deleted_at`
   (interface extends neither Syncable nor SyncMetadata; §5.15 floor). `key` UNIQUE; 2 CHECK (category/tier) reuse existing tuples.
5. **`user_achievements` = SyncMetadata** — `id + achievement_id(no-FK) + earned_at + progress + syncColumns`, UNIQUE(achievement_id),
   no created_at/updated_at/deleted_at.
6. **`ENTITY_TYPES += 'achievement'`** (note.ts has it; \_registry absent). **No new types/validators** (all exist);
   interface reconcile + XpHistory retire → DB-11. **No ADR-002 §5-body edit.**

## Phase 2 — Current-state read (reconcile-and-extend baseline)

### Already authored — DO NOT re-create / reference only

- `@vida/types`: `PERSONA`/`ACHIEVEMENT_CATEGORY`/`ACHIEVEMENT_TIER` + `UserProfile`/`Achievement`/`UserAchievement`/`XpHistory`
  (`entities/user.ts:13-97`); validators (`validators/user.ts:16-18`). `note.ts` ENTITY_LINK_TARGET has `'achievement'` (:35).
- DB-3 substrate: `currencies`/`consequence_ledger`/`store`/`rules` (`foundation/economy.ts:23-87`) — the reframe economy spine.
- Sibling split receivers: `user_preferences.{persona,motivation_style,active_modules,onboarding_completed}` (`preferences.ts:85-88`).

### To author — 3 tables + 1 registry append + 2 parity rows

`user_profile`/`achievements`/`user_achievements` (`schema/gamification.ts`) + `031_gamification.ts` (all absent, grep-clean);
`ENTITY_TYPES += 'achievement'`; enum-parity +2 rows. **No `@vida/types` edit** (reconcile-and-extend; DB-11 reconcile deferred).

### Baseline verdict

Reconcile-and-extend, **append-only at the types layer** (unlike #16 which amended a tuple): the enums/interfaces/validators
are used AS-IS; the `schema/`/migration/registry/parity layers are clean-add. Pattern = `check-ins.ts`/`026_check_ins.ts`/
`check-ins-introspection.test.ts`, with enums from the EXISTING `entities/user.ts` (colocated, the #16 lesson applied upfront).

## Phase 3 — Implementation Plan (gate-1 draft)

### §P3.1 — Exact DDL intent (`031_gamification.ts`)

3 CREATE TABLE per §3a–§3c. `user_profile` = baseColumns tail + §3a cols (NOT NULL/DEFAULT per the interface); no CHECK, no
UNIQUE (singleton), no deleted*at. `achievements` = `id + key UNIQUE + category CHECK + tier CHECK DEFAULT 'bronze' + title +
description + icon + xp_reward DEFAULT 0 + condition + is_secret DEFAULT 0 + created_at` — **no sync tail, no updated_at**.
`user_achievements` = `id + achievement_id(plain TEXT NOT NULL) + earned_at + progress + 6 \_sync*\* + UNIQUE(achievement_id)`.
Drizzle mirrors match 1:1 (`boolInt`defaults mirror as`false`, the finance precedent; `unique().on(...)`).

### §P3.2 — Registry & validators

`ENTITY_TYPES += 'achievement'`. **No new validator** (`PersonaSchema`/`AchievementCategorySchema`/`AchievementTierSchema`
exist). 2 parity rows import the existing `ACHIEVEMENT_CATEGORY`/`ACHIEVEMENT_TIER` tuples.

### §P3.3 — Files, migration, tests

`schema/gamification.ts` (NEW) · `migrations/031_gamification.ts` (NEW, +runner) · `index.ts` barrel · `_registry.ts` +1 ·
`enum-parity.test.ts` (apply-chain 30→31 + 2 rows) · `gamification-introspection.test.ts` (NEW; 3 tables ×4 + guards).
`pnpm typecheck` 0 · `@vida/core` green · eslint 0.

### §P3.4 — DB-11 deferrals (cited, not fixed here)

`UserProfile` interface reconcile (shed 7 moved fields) + `XpHistory` interface retire (table not authored) + any
`Achievement`/`UserAchievement` drift vs the mirror → **DB-11**. The introspection diffs SQL vs the Drizzle mirror (the mirror
is the oracle where the interface lags).

### §P3.5 — Plan checklist (pre-critique)

- [ ] 3 tables SQL + Drizzle mirror parity (col-set/nullability/pk/defaults) · [ ] 2 CHECK↔tuple parity rows green · [ ] introspection 3×4 + guards green
- [ ] `achievements` non-syncable (no _sync_/updated_at) · [ ] user_achievements SyncMetadata + UNIQUE · [ ] user_profile split (7 dropped, interface nullability) · [ ] ENTITY_TYPES += achievement · [ ] runner registers 031 (v31) · [ ] typecheck/lint 0 · [ ] §XXIX currency (BR-GM-\*)

## §4-Acceptance (Definition of Done)

- 3 tables exist with EXACTLY the §3a–§3c columns; nullability/pk/defaults match the Drizzle mirror (introspection green).
- `achievements` has NO `_sync_*`/`updated_at`/`deleted_at`; `user_achievements` has NO `created_at`/`updated_at`/`deleted_at`
  - UNIQUE(achievement_id); `user_profile` omits the 7 split-out columns + has no deleted_at.
- Migration 031 applies clean (runner v31); `LATEST_VERSION === 31`. 2 enum-parity rows green.
- No new `@vida/types` enum/interface/validator; no ADR-002 §5-body edit; `xp_history` not authored (retired).
- `pnpm typecheck` 0 · `@vida/core` full suite green · eslint 0.
- §XXIX: `database-layer` current-spec + current-business-rules promoted (BR-GM-1…n), commit-together.
