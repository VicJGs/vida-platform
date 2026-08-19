# Database Layer — Current Business Rules (durable · §XXIX promotion target)

> **Context:** `@vida/core` → `packages/core/src/db/`. **Seeded from documentation** (v1 code is being rebuilt
> from zero, so the docs are the anchor — per Victor 2026-07-21). Sources: ADR-001/002/003, `docs/core/conventions.md`,
> `docs/infrastructure/database-schema-reconciliation.md`, `storage-rebuild-strategy.md`.
> **No-Guessing:** each rule `[FACT: src]` or `[INTENT]` (documented, owed).

## Invariants every syncable table upholds
1. **[FACT]** PK = `id`, UUIDv7 TEXT, client-generated. `[ADR-002 §2.1; CLAUDE.md]`
2. **[FACT]** Timestamps (`created_at`, `updated_at`, `*_at`) = Unix-ms INTEGER (`Date.now()`). `[ADR-002 §2.2]`
3. **[FACT]** Booleans = INTEGER 0/1. Money = INTEGER cents. Calendar dates = `YYYY-MM-DD` TEXT. JSON = TEXT
   (stringified). `[ADR-002 §2.4/§2.6/§2.8/§2.5]`
4. **[FACT]** Enums = TEXT + SQL `CHECK` **authored in the hand-written migration** (ADR-002 §5) + the canonical
   **Zod** validator in `@vida/core` (DB-9). Drizzle's `enumText` supplies the TS union for query types only — DDL is
   not generated from Drizzle objects (no drizzle-kit). `[FACT: ADR-002 §2.3/§5; migrations/001_initial.ts]`
5. **[FACT]** Every syncable table carries the sync-metadata columns (`_sync_id · _sync_version · _sync_device_id ·
   _sync_lww_ts · _sync_status · _sync_hash`). `[ADR-002 §3; ADR-003]` **[INTENT]** `_sync_field_ts` is added to
   the set by **DB-2** (ADR-003 §17). `[roadmap DB-2]`
6. **[FACT]** Notes are never inline columns — all note bodies live in `pages` via the polymorphic
   `entity_type`/`entity_id` pattern. `[ADR-002 §2.7]`
7. **[FACT]** Soft delete = `deleted_at INTEGER` (NULL = live). `[CLAUDE.md]`
8. **[INTENT]** Polymorphic `entity_type` values derive from ONE registry (`ENTITY_TYPES` in `_registry.ts`) so
   cross-table references (pages · entity_links · entity_tags) stay consistent. The SQL migration authors its `CHECK`
   from that same const (DB-3/DB-4); DB-1 supplies the const + `EntityType`/`isEntityType`. `[reconciliation §A; ADR-006]`
9. **[FACT]** Three-layer encryption: L1 SQLCipher (DB at rest) · L2 field-level libsodium (`-- [E]` fields) · L3
   sync-blob (whole row for transit). `[ADR-002 §4]`

## Rules established/changed by DB-1 (IMPLEMENTED 2026-07-21 — `schema/_shared.ts` + `_registry.ts`)
- **[NEW]** Conventions #1–#4 are enforced on the **query/type side** by reusable typed primitives in
  `schema/_shared.ts`, not hand-repeated per table — closing the reconciliation's *hand-repeated-conventions* drift.
  (The systemic *zero-CHECK* gap is closed on the DDL side by the SQL-migration `CHECK` + Zod — DB-3/DB-4/DB-9 — not by
  a Drizzle helper.) `[reconciliation §E]`
- **[NEW]** The `schema/` directory is the v2 authoring surface; the v1 monolith `schema.ts` is **reference-only**
  and additive-safe (its `./db/schema` import path is preserved until consumers migrate at DB-6/7).
- **[FACT — boundary]** DB-1 adds **no table** and does **not** add `_sync_field_ts` (DB-2's charter).

## Rules established/changed by AR-2 (IMPLEMENTED 2026-07-27 — `adapter.ts` + `apps/web/src/db/`)
- **[NEW] BR1 — open without encryption.** In M1.0 the DB opens with no passphrase: `config.sqlCipher` is optional,
  and `initializeConnection` skips all cipher PRAGMAs + key verification when it is absent. `[FACT: adapter.ts; ADR-017]`
- **[FACT] BR2 — the encryption seam survives.** When a `sqlCipher` config is supplied, `open()` configures + verifies
  the cipher first; M3 activation is a config change, not a code change. `[FACT: adapter.ts; ADR-002 §4]`
- **[NEW] BR7 — the driver is asynchronous.** wa-sqlite's Factory API is async-only, so `SqliteDriver` is async and
  `DrizzleDb` is `'async'` (`SqliteRemoteDatabase`, via `drizzle-orm/sqlite-proxy`). Consequently `repository.ts`
  consumes it with `await` at every call site. Invariant #9's L1 (SQLCipher) stays **deferred to M3** — the seam is
  present, not active. `[FACT: adapter.ts; sqlite-api.js:742-750]`
- **[FACT — boundary]** AR-2 authors **no migration** (DB-7), activates **no encryption** (M3), and does **not** touch
  the repository's encrypt/decrypt seam semantics (DB-6) — it only async-propagates the consumers to keep the build green.

## DB-6 — IMPLEMENTED (2026-07-28 · LIF-68)
Rules the repository ALREADY enforced (preserved, no regression — proven by `repository.test.ts`):
- **[FACT]** Managed fields are repository-owned — callers never supply `id/created_at/updated_at/_sync_*`; the
  factory generates UUIDv7 `id`, stamps timestamps, and bumps `_sync_version` on update. `[FACT: repository.ts:37-52,267,336]`
- **[FACT]** Soft delete is honored when `config.softDelete` + a `deleted_at` column exist; `findById/findAll` filter
  `isNull(deleted_at)`; `delete()` sets `deleted_at` else hard-deletes. `[FACT: repository.ts:258-263,387-393]`
- **[FACT]** `_sync_hash` = `hashContent` over all non-`_sync_` fields; `_sync_status` starts `'pending'`.
  `[FACT: repository.ts:151-160,244]`

Rules DB-6 ESTABLISHED (implemented + tested):
- **[FACT] BR-DB6-1 — co-transactional enqueue.** Every mutation writes a `sync_queue` row in the **same
  transaction** (`db.transaction()`) as the entity row; both commit or both roll back. Proven by the SQL-level
  atomicity test (a mid-tx queue-write fault rolls back the entity row). `[FACT: repository.ts create/update/hardDelete; repository.test.ts]`
- **[FACT] BR-DB6-1b — coalescing.** The enqueue UPSERTs on `UNIQUE(table_name,row_id,operation)`, so repeated
  pre-flush mutations of the same row+op collapse to one queue row carrying the latest snapshot (LWW-correct, ADR-003).
  `[FACT: repository.ts enqueue(); repository.test.ts coalescing]`
- **[FACT] BR-DB6-2 — `sync_queue` is a device-local foundation table** (`schema/foundation/sync-queue.ts` +
  `migrations/001_sync_queue.ts`): raw DDL with the ADR-002 §5.1 CHECKs + UNIQUE, no `baseColumns`/`syncColumns`,
  never enqueues itself. `[FACT: ADR-002 §5.1]`
- **[FACT] BR-DB6-3 — M1.0 pass-through = empty `[E]` set (ADR-017:20).** The seam runs over an empty encrypted-field
  set in M1.0; the vault key is fetched **lazily** (only when the `[E]` set is non-empty), so the locked-vault default
  never throws. Activates at M3 by populating `[E]` sets + unlocking. `[FACT: repository.ts key(); ADR-017:20]`
- **[FACT] BR-DB6-4 — two distinct enums.** Row `_sync_status` (pending|synced|conflict) ≠ queue `status`
  (pending|in_flight|failed) — different columns/tables; never conflated. `[FACT: types/sync.ts; ADR-002 §5.1]`
- **[FACT] BR-DB6-5 — tested to §XIX.** 10 repository cases; `@vida/core` 55/55. `[FACT: repository.test.ts]`
- **Soft delete enqueues `operation='update'`** (deleted_at set, row still syncs); hard delete `'delete'`.
  The reader/flush that consumes these is AR-9 (stubbed → M4). `[FACT: repository.ts del/hardDelete]`

## DB-7 — IMPLEMENTED (2026-07-29 · LIF-69)
- **[FACT] BR-DB7-1 — `app_state` is the device-local version store.** `(key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  ADR-002 §5.0 shape; holds `schema_version` (ADR-002 §9.1). NOT synced — no `baseColumns`/`syncColumns`.
  `[FACT: schema/foundation/app-state.ts; ADR-002 §5.0/§9.1]`
- **[FACT] BR-DB7-2 — `app_state` is bootstrapped BEFORE the versioned loop, not as a versioned migration.** It is the
  store the runner reads the version FROM, so it cannot be version-gated (chicken-and-egg). `migrate()` calls the
  idempotent `ensureInfra` (`CREATE TABLE IF NOT EXISTS`) ahead of `runMigrations`. Asymmetry with `sync_queue` (a
  versioned migration 001) is mechanical. `[FACT: runner.ts]`
- **[FACT] BR-DB7-3 — the migration engine is forward-only + atomic (preserved).** Only `version > current` applied,
  ascending, each in `BEGIN/COMMIT`; failure → `ROLLBACK` + version unchanged; up-to-date ⇒ `applied:0`. No `down()`
  (a knowing divergence from ADR-002 §9.2; rationale ADR-016:17 — local-first, rebuild-not-rollback). `[FACT: adapter.ts:244-273]`
- **[FACT] BR-DB7-4 — `resetDev` is dev-only.** `import.meta.env.DEV`-guarded (fails closed) + not re-exported from the
  `@vida/core` barrel, so it is unreachable from production flows. `[FACT: runner.ts resetDev; index.ts]`
- **[FACT] BR-DB7-5 — no hand-created `app_state` fixtures.** All 4 test-file fixtures retired; the real bootstrap
  creates the table, so tests exercise the production path. `[FACT: the 4 test files; migrations-runner.test.ts]`

## AR-5/6/7 substrate (boundary — 2026-08-18)
- **[FACT]** AR-5/6/7 authored 15 substrate tables into `schema/foundation/` (migrations 002–006); their per-table
  business rules live in `docs/core/{sessions,spaces,capability,effects,economy}/current-business-rules.md`, not here.
  `[FACT: schema/foundation/*.ts]`

## DB-3 — IMPLEMENTED (2026-08-18 · LIF-65)
- **[FACT] BR-DB3-1 — the 11 Stream (i) ADD tables are authored** (migrations 007–011), each a syncable table upholding
  invariants #1–#9 (cross-domain refs plain TEXT no FK, targets are DB-4). `[FACT: migrations/00{7..11}_*.ts]`
- **[FACT] BR-DB3-2 — OPEN-vocab columns carry NO CHECK.** `planned_blocks.sub_type` is plain TEXT (registry-validated
  at runtime, SS-5/BR-6), mirroring `sessions.sub_type` — a hard CHECK there would forbid spawning a user-registered
  custom sub_type. Only `planned_blocks.status` is a FIXED CHECK. `[FACT: 010_scheduling.ts; session.ts:13-15]`
- **[FACT] BR-DB3-3 — session sub-type extensions DEFERRED to DB-4** (ADR-004 §3.1 domain-ownership); column-level
  AMENDs owned elsewhere (DB-4 / DB-2-M4) — DB-3 authored 0 AMENDs directly. `[FACT: PLAN §C/§D]`
- **[FACT] BR-DB3-4 — RETIRE set verified absent** from the v2 surface (the lone `xp_history` string is a supersession
  comment). `ENTITY_TYPES` appended with the 11 new substrate types. `[FACT: _registry.ts]`
- **[FACT] BR-DB3-5 — enum CHECK↔tuple parity holds** for all 10 DB-3 CHECK columns (enum-parity.test.ts, 19 tests).
  `@vida/core` 193 tests green. `[FACT: enum-parity.test.ts]`

**Foundation-readiness (P5) — VERIFIED.** A representative downstream consumer finds every substrate table it needs:
the DB-4 **Purpose domain** requires `values` · `contributions` · `purpose_reviews` · `plan_steps` — all authored +
documented (this section + current-spec DB-3 table); the **Knowledge** review engine (`review_curves`/`method_bindings`/
`review_events`) and **Finance/economy** (`store`/`rules`) likewise. No gap. The M1.0 substrate foundation is complete →
DB-4 per-domain authoring begins.

## DB-4 group #1 — Notes & Pages (IN PROGRESS · 2026-08-18 · LIF-66)
The first Stream (ii) domain module — `pages` · `page_links` · `note_attachments` (`schema/notes.ts` +
`migrations/012_notes.ts`). `[FACT: those files]`
- **[FACT] BR-N4-1 — net-new = 3 tables.** Tagging (`tags`/`entity_tags`) + typed refs (`entity_links`) are AR-6
  substrate (migration 003); N&P is a consumer (ADR-006 §3.1). `pomodoro_sessions`→`focus_sessions` (group #3);
  `page_tags`→`entity_tags` (retired, verified absent). `[FACT: spaces.ts; ADR-004 §3.1]`
- **[FACT] BR-N4-2 — `pages.type` FIXED CHECK(6) from `PAGE_TYPE`; `pages.entity_type` OPEN (no CHECK).** The polymorphic
  attach target is registry-validated, mirroring `entity_links`/`entity_tags` (the retired 33-value `ENTITY_LINK_TARGET`
  tuple is NOT wired as a CHECK). Parity asserted `{pages,type,PAGE_TYPE}`. `[FACT: 012_notes.ts; enum-parity.test.ts; [[open-vocab-columns-take-no-sql-check]]]`
- **[FACT] BR-N4-3 — no cross-table FK, self-ref incl.** `parent_id`/`source_page_id`/`target_page_id`/`page_id` are
  plain TEXT; NP-9 cascade/orphan is app/sync-layer. Full `baseColumns`+`deleted_at` on all 3 (ADR-016 §3.4), superseding
  ADR-002 §5.2's stale `REFERENCES`/created_at-only shape. `[FACT: 012_notes.ts; ADR-002 §5.2:22 stale]`
- **[FACT] BR-N4-4 — this unit authors the Drizzle mirror only.** No `@vida/types` row-interface change (DB-3 precedent);
  `PageLink`/`NoteAttachment` stay `SyncMetadata`-based — the same divergence already shipped for `entity_links`/
  `EntityLink`; interface reconcile is DB-11. Compiles (no `$inferSelect↔interface` assertion). `[FACT: note.ts:127]`
- **[FACT] BR-N4-5 — enum parity + runner green.** `@vida/core` 193 tests; `LATEST_VERSION`=12. Foundation-readiness:
  MOD-notes (#31) finds every needed column — PASS. `[FACT: vitest run]`

## DB-4 group #2 — Preferences (2026-08-19 · LIF-66)
The second Stream (ii) domain module — `user_preferences` · `nav_preferences` · `command_bar_history`
(`schema/preferences.ts` + `migrations/013_preferences.ts`). `[FACT: those files]`
- **[FACT] BR-P4-1 — ALL plaintext, ZERO `[E]` (PR-1).** Preferences is structural config, not content; no field is
  field-level encrypted. The Repository registers an empty `[E]` set (M1.0 pass-through, BR-DB6-3). `[FACT: ADR-002 L1123-1127 "All P"]`
- **[FACT] BR-P4-2 — 5 FIXED enums → SQL CHECK, sourced from `@vida/types` tuples.** `theme`(THEME) · `time_format`(TIME_FORMAT)
  · `dock_position`(DOCK_POSITION) · `dock_size`(DOCK_SIZE) · `persona`(PERSONA). Parity asserted for all 5. `default_task_priority`
  = bare default no CHECK; `font_size`/`notification_frequency` = OPEN plain TEXT no CHECK (vocab undefined —
  `[[open-vocab-columns-take-no-sql-check]]`). `[FACT: 013_preferences.ts; enum-parity.test.ts]`
- **[FACT] BR-P4-3 — full `baseColumns` on all 3; NO `deleted_at`.** `command_bar_history` GAINS `created_at`/`updated_at`
  vs ADR-002 §5.17's omission (ADR-016 §3.4 locked pattern; interface `CommandBarHistory extends SyncMetadata` diverges →
  DB-11). Config has no soft-delete (invariant #7 opt-in). No cross-table FK. **§5.17 gap-fix:** `time_format` given
  `NOT NULL` (§5.17 omitted it while its sibling FIXED enums `theme`/`dock_position`/`dock_size` carry it, and the
  `UserPreferences.time_format` interface is non-null) — post-impl critique catch (a CHECK-only parity test is blind to
  nullability). `[FACT: 013_preferences.ts; ADR-002 §5.17 amendment]`
- **[FACT] BR-P4-4 — build-phase intent authored (DB-4 = the build phase).** The `⚠ INTENDED`/`[DEFERRED — build phase]`
  items are resolved here, not deferred: G4 six columns · PB-2 `module_visibility` (JSON) · E9 `user_profile` split
  (`persona`/`motivation_style`/`active_modules`/`onboarding_completed` — Preferences single-writer owner, ADR-012 §3.10).
  ADR-002 §5.17 amended + §5.20 E9 ledger fulfilled. `[FACT: ADR-002 §5.17 amendment 2026-08-19]`
- **[FACT] BR-P4-5 — three "module" concerns stay DISTINCT (PR-7).** `module_visibility` (nav show/hide) ≠ `active_modules`
  (E9 enabled set) ≠ `feature_gamification` (logic enable) — documented in the `preferences.ts` header. `[FACT: conventions.md:31]`
- **[FACT] BR-P4-6 — E9 cross-group constraint (for group ~#19 Gamification).** `user_profile`, when authored, OMITS the
  4 Preferences-routed fields + `check_in_streak*` (→ Check-ins); keeps PII (`[E]`) + `focus_areas[E]` + `life_stage` +
  `skipped_modules` + `timezone` + derived counters. No field ends with two writers. ⚠ `conventions.md:27` mislabels
  `life_stage`/`timezone`/`skipped_modules` as `[E]` — only `focus_areas` is `[E]` (§5.15 L3376); do not propagate. `[FACT: ADR-012 §3.10]`
- **[FACT] BR-P4-7 — parity + runner green.** `@vida/core` 198 tests (+5 parity rows); `LATEST_VERSION`=13; root typecheck
  11/11. Foundation-readiness: MOD-preferences (#32) contract finds every needed column — PASS. `[FACT: vitest run]`

## DB-4 group #3 — Sessions & Scheduling (+Pomodoro) (2026-08-19 · LIF-66)
The third Stream (ii) domain module — **6 tables** completing the Session framework on the AR-5/AR-7/DB-3 substrate:
`study_sessions` · `focus_sessions` (`schema/foundation/session-extensions.ts`) + `study_availability` ·
`availability_exceptions` · `study_plan_batches` · `session_templates` (`schema/foundation/scheduling.ts`), DDL in
`migrations/014_sessions_scheduling.ts`. `[FACT: those files]`
- **[FACT] BR-S4-1 — `focus_sessions` IS the `focus` timer runtime; `pomodoro_sessions` is RETIRED (not authored).**
  Doc-determined by the consuming-module reframe (`notes-and-pages/structure-data.md:30`, `contract.md:19`): the
  `/pomodoro` widget is a lens onto the `focus_sessions` extension keyed by `session_id`. The retired v2 Notes table's
  columns land on `focus_sessions` (`type`/`status`/`completed_count`/`duration_seconds` + v1 restores
  `paused_at`/`total_pause_seconds`/`was_interrupted`/`interruption_reason`); `entity_type`/`entity_id`/`page_id`
  dropped (PD-1/2). **Zero build-decisions** — three independent reviews + two Victor drift-catches confirmed it. `[FACT: notes-and-pages reframe; ADR-002 §5.20 AMEND]`
- **[FACT] BR-S4-2 — extensions are 1:1 keyed by `session_id`, own `id` PK (BR-DB-1).** `study_sessions` + `focus_sessions`
  use full `...baseColumns` (own UUIDv7 `id` PK — the Repository factory generates it) + `session_id TEXT NOT NULL UNIQUE`
  (the 1:1 key, plain TEXT no FK — ADR-004 §3.4). ADR-004 §3.1 "keyed by session_id" = a key column, not a PK override
  (preflight catch — a `session_id`-PK table can't persist via the standard Repository). `[FACT: current-business-rules.md:9 BR-DB-1; ADR-004 §3.1/§3.4]`
- **[FACT] BR-S4-3 — extensions never re-store a spine column (BR-S1/ADR-004 §3.1).** The spine
  (`focus_rating`/`energy_level`/`distraction_count`/`key_learnings`/`started_at`/`ended_at`/`status`) lives on
  `sessions` (AR-5); `focus_sessions` has NO `started_at`/`ended_at`; `study_sessions` holds only
  `resource_type`/`resource_id`/`pages_read`/`lessons_completed`. `[FACT: 014_sessions_scheduling.ts vs 002_sessions.ts]`
- **[FACT] BR-S4-4 — 5 FIXED enums → SQL CHECK from `@vida/types` tuples; OPEN vocab = plain TEXT no CHECK.**
  `study_sessions.resource_type`(STUDY_SESSION_RESOURCE_TYPE) · `focus_sessions.type`(POMODORO_TYPE)/`.status`(POMODORO_STATUS)
  · `study_availability.preset_block`(PRESET_BLOCK — **reused**, `knowledge.ts:30`) · `study_plan_batches.status`
  (STUDY_PLAN_BATCH_STATUS **+ `'failed'`**, `business-rules.md:89`). Parity asserted for all 5. `day_of_week`(0-6)/
  `preference_score`(1-5) are numeric BETWEEN checks (not tuple-sourced); `scope_type`/`sub_type` OPEN no CHECK. `[FACT: 014_*.ts; enum-parity.test.ts]`
- **[FACT] BR-S4-5 — 4 `[E]` fields (not "all-plaintext").** `study_plan_batches.name` · `session_templates.name` ·
  `session_templates.description` · `availability_exceptions.reason` are `[E]`; `study_sessions`/`study_availability`/
  `focus_sessions` are zero-`[E]` (timer state structural, `pomodoro/conventions.md:35`). SQL `-- [E]` ↔ mirror
  `/** @encrypted */` verified matched both directions. `[FACT: 014_*.ts; scheduling.ts]`
- **[FACT] BR-S4-6 — planner scope widened beyond course (G5).** `study_plan_batches` replaces the v2 `course_id`
  REFERENCES FK with polymorphic `scope_type`/`scope_id` (OPEN, no FK — no-FK convention). `[FACT: structure-data.md:56; 014_*.ts]`
- **[FACT] BR-S4-7 — mirror-only; interface reconcile → DB-11.** `PomodoroSession`/`StudyPlanBatch`/`StudySession`
  (`note.ts`/`knowledge.ts`/`learning.ts`) keep pre-reframe shapes — cited, not fixed here (group #1 precedent). `session_effects`
  is NOT a table (dim2 = `EFFECT_TYPE` enum + registry JSON + `applied_effects`, all built); `scheduled_study_sessions`
  DROPPED (→ `planned_blocks`). `[FACT: ADR-002 §5.20; ADR-016 DB-11]`
- **[FACT] BR-S4-8 — `ENTITY_TYPES += 'session'`.** The base session becomes a valid polymorphic link/attach target
  (AR-5 never appended it); sub-types addressed via the base `session_id`. `[FACT: _registry.ts:27]`
- **[FACT] BR-S4-9 — parity + introspection + runner green.** `@vida/core` **221 tests** (+5 enum-parity rows, +18→24
  DDL-introspection: column-set · nullability · PK · default × 6 tables — the mandatory Phase-5 bookend); `LATEST_VERSION`=14;
  root typecheck 11/11; lint 0-err. Gates: gate-1 REVISE→resolved · preflight BLOCKED(BR-DB-1)→PASSED · gate-2 REVISE→SHIP ·
  post-impl SHIP. Foundation-readiness: MOD-sessions (#139) / MOD-notes `/pomodoro` find every needed column — PASS. `[FACT: vitest run]`
- **[FACT] BR-S4-10 — cross-group flag → group #2 (Preferences).** PD-7 global config (`auto_start_breaks`/
  `auto_start_next_interval`/`show_notifications`/`play_sounds`) is Preferences-owned and **absent** from shipped
  `013_preferences.user_preferences` → a group #2 backfill (the runtime reads it, never re-stores). NOT this unit's table. `[FACT: pomodoro business-rules PD-7; 013_preferences.ts]`

## Rules established by DB-4 group #4 — Tasks (IMPLEMENTED 2026-08-19 · `015_tasks.ts` + `schema/tasks.ts`)
- **[FACT] BR-T4-1 — 2 tables, 2 `[E]`.** `tasks` (`title`/`description` `[E]`) + `task_time_logs` (zero `[E]`). Both full
  `...baseColumns`; `tasks` has `deleted_at` (soft delete), `task_time_logs` does **not** (ledger — hard-deletes with the
  task, §5.3 + TK-4). `[FACT: 015_tasks.ts; ADR-002 §5.3]`
- **[FACT] BR-T4-2 — no cross-table FK (no-FK convention).** §5.3's 5 parent refs (`project_id`/`milestone_id`/`course_id`/
  `contact_id` + self-ref `parent_task_id`) + `task_time_logs.task_id` are plain TEXT; the `ON DELETE SET NULL`/`CASCADE`
  semantics (TK-2/TK-4) are the app/sync layer's. `[FACT: 015_tasks.ts; BR-DB3-1]`
- **[FACT] BR-T4-3 — build-phase INTENDED authored, not deferred.** `completed_at` (G5) · `scheduled_date` (G6) · `kind`
  (`TASK_KIND` {standard,obligation}, G8) · `recurrence_rule` (RRULE, obligations-only, G8) · `measurement_kind`/
  `binding_mode` (ADR-011 M1/M2) · `nesting_weight` (ADR-011 §3.3 M4). The ⚠ INTENDED flags point TO this build phase.
  `[FACT: structure-data G5/G6/G8; ADR-011; [[build-phase-flags-mean-resolve-now-not-defer]]]`
- **[FACT] BR-T4-4 — `measurement_kind` NOT NULL DEFAULT 'milestone'; `binding_mode` NULLABLE no default.** measurement_kind
  has a doc-licensed natural ("natural = milestone", structure-data.md:20). binding_mode has **no** licensed universal
  default → nullable (NULL ⇒ derive-natural, ADR-011 §3.2 override-slot grain); a `NOT NULL DEFAULT 'event-trigger'` was a
  manufactured default, struck at gate-2. `[FACT: structure-data.md:20; ADR-011 §3.2; gate-2 finding #1]`
- **[FACT] BR-T4-5 — progress derives; only the per-child weight is stored.** No stored `progress` column on `tasks`
  (M3 derives on read); `nesting_weight` INTEGER nullable (NULL ⇒ equal-weight) is the ADR-011 §3.3 M4 per-child weight.
  `[FACT: business-rules TK-3/TK-11; ADR-011 §3.3 L54; conventions.md:32]`
- **[FACT] BR-T4-6 — shared-primitive boundary (not authored here).** Inline `tasks.tags` RETIRED → `entity_tags`
  (`ENTITY_TYPES += 'task'`, TK-8); `task_views` RETIRED → shared `views` (AR-6); a task's notes → `pages`
  (`entity_type='task'`); the timer → `focus_sessions` (group #3, the `log_time` S4 effect writes `task_time_logs`).
  `[FACT: 015_tasks.ts; conventions.md:14,16,29; _registry.ts]`
- **[FACT] BR-T4-7 — 6 FIXED CHECK cols parity-asserted.** `status`/`priority`/`difficulty`/`kind`/`measurement_kind`/
  `binding_mode` SQL CHECK ≡ the `@vida/types` tuples (STATUS/PRIORITY/TASK_DIFFICULTY/**TASK_KIND** [net-new]/
  MEASUREMENT_KIND/BINDING_MODE) — first live use of the 5 shared tuples; +6 enum-parity rows. `[FACT: enum-parity.test.ts; task.ts TASK_KIND]`
- **[FACT] BR-T4-8 — mirror-only; interface reconcile → DB-11.** `Task` (`task.ts`) keeps its pre-INTENDED shape + `tags`
  (gains 7 cols, drops `tags` at DB-11); `TaskTimeLog` gains `updated_at` at DB-11. Cited, not fixed here (group #1/#3
  precedent). `[FACT: task.ts:26-47; ADR-016 DB-11]`
- **[FACT] BR-T4-9 — parity + introspection + runner green.** `@vida/core` **240 tests** (+6 enum-parity rows, +8
  DDL-introspection: column-set·nullability·PK·default × 2 — the mandatory Phase-5 bookend); `LATEST_VERSION`=15; root
  typecheck 11/11; lint 0-err (1 pre-existing encryption-1MB timeout flake, passes isolated). Gates: gate-1 SHIP · preflight
  PASSED · gate-2 REVISE→SHIP · post-impl SHIP. Foundation-readiness: MOD-tasks finds every needed column — PASS. `[FACT: vitest run]`

## Rules established by DB-4 group #5 — Projects (IMPLEMENTED 2026-08-19 · `016_projects.ts` + `schema/projects.ts`)
- **[FACT] BR-PJ5-1 — 4 tables, 11 `[E]`.** `projects` (title/description/vision `[E]`) · `milestones` (title/description
  `[E]`) · `deliverables` (title/description `[E]`) · `project_documents` (name/encrypted_blob `[E]`). All full
  `...baseColumns`; projects/milestones/deliverables have `deleted_at` (soft delete); `project_documents` does **not**
  (faithful §5.4 — has `updated_at`, no `deleted_at`). `[FACT: 016_projects.ts; ADR-002 §5.4]`
- **[FACT] BR-PJ5-2 — no cross-table FK (no-FK convention).** §5.4's project→milestone/document `CASCADE` +
  milestone→sub-milestone/document `SET NULL` + `deliverables.milestone_id` are plain TEXT; cascade/reparent semantics
  (PJ-9) are the app/sync layer's. `[FACT: 016_projects.ts; BR-DB3-1]`
- **[FACT] BR-PJ5-3 — `deliverables` (the four-level hierarchy) authored now (build-phase INTENDED, G2).** The real level
  between milestones and tasks, an ADR-011 pursuable. The ⚠ INTENDED flag points TO this build phase. `[FACT: structure-data.md G2; [[build-phase-flags-mean-resolve-now-not-defer]]]`
- **[FACT] BR-PJ5-4 — `progress` is a NULLABLE override slot on projects/milestones/deliverables.** Was §5.4 `INTEGER NOT
  NULL DEFAULT 0`; reframed to nullable (NULL ⇒ derive via `progress()` on-read, ADR-011 §3.2/§3.4). Never a hand-set
  `NOT NULL DEFAULT 0`. `[FACT: ADR-002 §5.4 L1574/L1610; ADR-011 §3.2; PJ-3]`
- **[FACT] BR-PJ5-5 — measurement pair on `deliverables` ONLY.** `measurement_kind` NOT NULL DEFAULT 'milestone' (doc-
  licensed rollup natural) + `binding_mode` NULLABLE no default (NULL ⇒ derive, §3.2 override grain). Projects/milestones
  are **pure bottom-up rollups** (implicit 'milestone' kind) → no stored discriminator. The module doc (structure-data.md
  PJ-4) is the DB-4 roster; an ADR-011 §3.4 broad pursuable list / §5.20:3816 "Projects/Deliverables" grouping does NOT
  reopen it. `[FACT: structure-data.md:21,24-27; [[module-doc-is-db4-roster-not-adr-broad-list]]]`
- **[FACT] BR-PJ5-6 — `nesting_weight` on the rollup children only.** milestones + deliverables carry `nesting_weight`
  INTEGER nullable (NULL ⇒ equal-weight, ADR-011 §3.3 M4); projects do **not** (top-level — the UP ladder to purpose uses
  `contributions.contribution_percentage`). `[FACT: ADR-011 §3.3; PJ-3b]`
- **[FACT] BR-PJ5-7 — shared-primitive & partner-domain boundaries (not authored here).** Inline `projects.tags` RETIRED
  → `entity_tags` (`ENTITY_TYPES += 'project'/'milestone'/'deliverable'`, PJ-12); `project_contacts(role)` → Relationships;
  `project_habits` → Habits (kept junction); `contributions` (retired `purpose_projects`, M7) → Purpose/DB-3; project
  events / project↔account → integration seams; vision/mission → `pages`. `[FACT: 016_projects.ts; contract.md:30; habits/contract.md:47; _registry.ts]`
- **[FACT] BR-PJ5-8 — `deliverables` omits status/due_date by design.** milestones carry status+due_date (§5.4 FACT floor);
  a deliverable is framed purely by measurement (no aspect doc owes it status/due_date) — a recorded asymmetry, not a gap.
  `[FACT: no deliverable status/due_date in any projects aspect; ADR-011 §3.4]`
- **[FACT] BR-PJ5-9 — 7 FIXED CHECK cols parity-asserted.** projects.scope/complexity/status/priority · milestones.status ·
  deliverables.measurement_kind/binding_mode ≡ the `@vida/types` tuples (PROJECT_SCOPE/PROJECT_COMPLEXITY/STATUS/PRIORITY/
  MEASUREMENT_KIND/BINDING_MODE) — no net-new tuple; +7 enum-parity rows. `project_documents` has no CHECK col. `[FACT: enum-parity.test.ts]`
- **[FACT] BR-PJ5-10 — `project_documents` vault faithful to §5.4.** `encrypted_blob` NULLABLE BLOB (`blob(…,{mode:'buffer'})`);
  no `deleted_at`; no index; small files inline, large → R2 seam (not a column). `[FACT: 016_projects.ts; ADR-002 §5.4 L1632-1651]`
- **[FACT] BR-PJ5-11 — mirror-only; interface reconcile → DB-11.** `Project` (progress→nullable, drop `tags`), `Milestone`
  (+`nesting_weight`, progress→nullable), **new `Deliverable`** interface → DB-11 (compile-safe; no `$inferSelect`↔interface
  assertion). Cited, not fixed here (group #1/#3/#4 precedent). `[FACT: project.ts:64-113; ADR-016 DB-11]`
- **[FACT] BR-PJ5-12 — parity + introspection + runner green; ZERO build-decisions.** `@vida/core` **264 tests** (+7
  enum-parity rows, +16 DDL-introspection: column-set·nullability·PK·default × 4); `LATEST_VERSION`=16; typecheck clean;
  eslint 0-err. Gates: gate-1 REVISE→resolved · preflight PASSED (5 folds) · gate-2 SHIP · post-impl SHIP. A gate-1 critic
  escalated the measurement-scope to Victor — re-grounded as doc-determined (the module doc is the roster;
  [[module-doc-is-db4-roster-not-adr-broad-list]]). Foundation-readiness: MOD-projects finds every needed column — PASS. `[FACT: vitest run]`
