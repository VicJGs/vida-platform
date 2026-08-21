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

## Rules established by DB-4 group #6 — Habits (IMPLEMENTED 2026-08-19 · `017_habits.ts` + `schema/habits.ts`)
- **[FACT] BR-HB6-1 — 3 tables, 7 `[E]`.** `habits` (name/description/unit/cue/reward + `success_criteria` `[E]`) ·
  `habit_completions` (`location` `[E]`) · `project_habits` (zero `[E]`, the kept junction). `habits`/`project_habits`
  full `...baseColumns` + `deleted_at`; `habit_completions` full baseColumns (+`updated_at`) but **no `deleted_at`**
  (ledger — hard-deletes with the habit, HB-11). `[FACT: 017_habits.ts; ADR-002 §5.5]`
- **[FACT] BR-HB6-2 — no cross-table FK (no-FK convention).** §5.5's `habit_completions.habit_id … CASCADE` +
  `project_habits`' two CASCADEs → plain TEXT; cascade is the app/sync layer's (HB-11). `[FACT: 017_habits.ts; BR-DB3-1]`
- **[FACT] BR-HB6-3 — the habit is a pursuable; measurement pair authored.** `measurement_kind` NOT NULL DEFAULT
  **`'rate'`** (HB-13 doc-licensed natural — occurrence frequency) + `binding_mode` **NULLABLE, no default** (NULL ⇒
  derive `event-trigger`, ADR-011 §3.2 override-slot grain — the same trap gate-2 struck at Tasks; NOT a manufactured
  default). **No stored `progress`/`nesting_weight`** on habits (the rate derives, the streak cache is derived-from-
  ledger; habits ladder UP via `contributions.contribution_percentage`). `[FACT: business-rules.md HB-13; ADR-011 §3.1/§3.2/§3.3]`
- **[FACT] BR-HB6-4 — streak cache is derived, never stored truth.** `current_streak`/`longest_streak`/
  `total_completions` (`INTEGER NOT NULL DEFAULT 0`) recompute from the `habit_completions` ledger; a cache (HB-2). `[FACT: §5.5; HB-2]`
- **[FACT] BR-HB6-5 — G8 restored v1 fields authored (build-phase INTENDED).** `habits.success_criteria`[E] +
  `habits.difficulty` (**net-new `HABIT_DIFFICULTY` tuple** {very_easy,easy,medium,hard,very_hard}, TASK_KIND
  precedent) + `habit_completions.location`[E] + `habit_completions.completion_time` (Unix-ms moment). `[FACT: structure-data.md:26-27; conventions.md:39]`
- **[FACT] BR-HB6-6 — `habit_completions` ledger shape.** `value` REAL (first REAL col in v2); `count` NN dflt 1;
  `mood_before`/`mood_after`/`ease_rating`/`satisfaction` INTEGER **range CHECK `BETWEEN 1 AND 5`** (002_sessions.ts
  precedent — NOT tuple-sourced, not parity rows); **UNIQUE(`habit_id`,`completed_date`)** (HB-3); `idx_habit_comp_date`. `[FACT: 017_habits.ts; §5.5]`
- **[FACT] BR-HB6-7 — `project_habits` reconciled to the entity_tags junction shape.** Synthetic `id` UUIDv7 PK (NOT
  §5.5's `PRIMARY KEY(project_id,habit_id)`) + **UNIQUE(`project_id`,`habit_id`)** (preserves pair-uniqueness) + `idx`
  on `habit_id`. KEPT, never retired (C1 guard). `[FACT: spaces.ts entityTags; conventions.md:55]`
- **[FACT] BR-HB6-8 — shared-primitive & partner boundaries (not authored here).** Inline `habits.tags` RETIRED →
  `entity_tags` (`ENTITY_TYPES += 'habit'`, ADR-006 SP1); notes → `pages`; `purpose_habits` retired → `contributions`
  (Purpose/DB-3, M7); HB-8 `contribute_purpose_metric` + HB-9 `award_xp`→`grant_currency`→`consequence_ledger` →
  ADR-004/012 services; HB-10 backfill window → Preferences; streak M5 seam → service (R7). `[FACT: 017_habits.ts; conventions.md:23-31,52-57]`
- **[FACT] BR-HB6-9 — 7 FIXED CHECK cols parity-asserted.** `habit_type`/`frequency`/`time_of_day`/`domain`/
  `measurement_kind`/`binding_mode`/`difficulty` SQL CHECK ≡ the `@vida/types` tuples (HABIT_TYPE/HABIT_FREQUENCY/
  HABIT_TIME_OF_DAY/LIFE_DOMAIN/MEASUREMENT_KIND/BINDING_MODE/**HABIT_DIFFICULTY** [net-new]); +7 enum-parity rows. `[FACT: enum-parity.test.ts]`
- **[FACT] BR-HB6-10 — mirror-only; interface reconcile → DB-11.** `Habit` (+`measurement_kind`/`binding_mode`/
  `success_criteria`/`difficulty`, −`tags`) · `HabitCompletion` (+`updated_at`/`location`/`completion_time`) · new
  `ProjectHabit` → DB-11 (compile-safe; no `$inferSelect`↔interface assertion). `[FACT: habit.ts; ADR-016 DB-11]`
- **[FACT] BR-HB6-11 — parity + introspection + runner green; ZERO build-decisions.** `@vida/core` **283 tests** (+7
  enum-parity, +12 DDL-introspection × 3 tables); `LATEST_VERSION`=17; typecheck clean; eslint 0-err. Gates: gate-1
  SHIP · preflight PASSED (6 folds) · gate-2 SHIP · post-impl SHIP. Foundation-readiness: MOD-habits finds every needed
  column — PASS. `[FACT: vitest run]`

## Rules established by DB-4 group #7 — Routines (IMPLEMENTED 2026-08-19 · `018_routines.ts` + `schema/routines.ts`)
- **[FACT] BR-RT7-1 — the REFRAME, not the POC.** Authors 3 tables — `routines` (sequence) · `routine_step`
  (polymorphic step, **replaces** the flat `routine_actions`) · `routine_completions` (per-step ledger). The
  orchestration reframe DESIGN landed (`docs/intake/routines.md` §E, RT-1…RT-19); only the DDL was deferred "→ build
  phase" = DB-4 (shape-open, store/rules pattern). ⚠ Two Victor corrections re-grounded this: (a) "there is a docs for
  that, investigate deeper" (the design landed, not an undone design-pass — [[check-intake-and-reruns-before-triaging-a-design-pass-undone]]);
  (b) "already solved inside the documentation" (the three "open" points were doc-closed). `[FACT: 018_routines.ts; §E; part-1.2-reruns/routines.md]`
- **[FACT] BR-RT7-2 — no cross-table FK (no-FK convention).** `routine_id` / `routine_step_id` / `entity_id` are
  plain TEXT; cascade (RT-17) is the app/sync layer's. `[FACT: 018_routines.ts; BR-DB3-1]`
- **[FACT] BR-RT7-3 — a routine is a pursuable (RT-19).** `routines.measurement_kind` NOT NULL DEFAULT **`'rate'`**
  (doc-licensed natural) + `binding_mode` **NULLABLE, no default** (NULL ⇒ derive `derived-pull`, ADR-011 §3.2 override
  slot — the Tasks/Habits trap avoided). `progress` is a NULLABLE override slot; **no cached streak columns** (RT-14,
  analytics derive from `routine_completions`). `[FACT: business-rules.md RT-19; ADR-011 §3.1/§3.2]`
- **[FACT] BR-RT7-4 — `step_type` is an OPEN vocab → plain TEXT, NO CHECK.** User-extensible (§E Q1, session `sub_type`
  precedent, [[open-vocab-columns-take-no-sql-check]]); the driven entity is a polymorphic `entity_type`+`entity_id`
  ref (nullable — an actionable step may have none, RT-4). `[FACT: 018_routines.ts; §E Q1]`
- **[FACT] BR-RT7-5 — cadence = `recurrence_rule` (RRULE).** The "broad schedule" (day/week/month/year, RT-11) is the
  platform recurrence canon (tasks precedent), consumed by the Scheduler (Sessions & Scheduling) — no bespoke Routines
  scheduler. `[FACT: RT-11; tasks precedent]`
- **[FACT] BR-RT7-6 — doc-decided BOUNDARIES (not authored here).** Completion/miss/acceptance **policy** →
  Preferences/Spaces (conventions.md:11, structure-data.md:66, NOT on `routines`); `routine_step_membership`/
  step-scoping → Spaces (design-pass, **non-blocking**, intake.md:171); the Scheduler + provider (`dueIn`/`summary`) →
  services; tags→`entity_tags`; notes→`pages`; `purpose_routines` retired → `contributions` (Purpose/DB-3, M7);
  XP→`consequence_ledger` (Gamification). `[FACT: conventions.md:11; intake.md:171; ADR-011 M7]`
- **[FACT] BR-RT7-7 — `routine_completions` ledger, re-keyed.** `routine_step_id` (was `routine_action_id`); full
  baseColumns (+`updated_at`, task_time_logs precedent), **no `deleted_at`** (ledger, RT-17); `completed_at`/
  `completed_date` NN; UNIQUE(`routine_step_id`,`completed_date`) (RT-3/RT-18). `[FACT: 018_routines.ts; §5.6]`
- **[FACT] BR-RT7-8 — 4 FIXED CHECK cols parity-asserted; 1 net-new tuple.** `routines.lifecycle`
  (**ROUTINE_LIFECYCLE** {active,paused,off} — net-new) / `.measurement_kind` (MEASUREMENT_KIND) / `.binding_mode`
  (BINDING_MODE) + `routine_step.time_of_day` (ROUTINE_TIME_OF_DAY); +4 enum-parity rows. `step_type` OPEN (no row).
  `ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY` superseded (retired at DB-11). `[FACT: enum-parity.test.ts; routine.ts]`
- **[FACT] BR-RT7-9 — mirror-only; interface reconcile → DB-11.** new `Routine`/`RoutineStep`; `RoutineCompletion`
  re-key +`updated_at`; retire `RoutineAction`/`ROUTINE_ACTION_TYPE`/`ROUTINE_RECURRENCE_FREQUENCY`; aspect docs'
  `entity_type='routine_action'` → `routine`/`routine_step` (doc-sweep). `[FACT: routine.ts; ADR-016 DB-11]`
- **[FACT] BR-RT7-10 — parity + introspection + runner green; ZERO build-decisions.** `@vida/core` **299 tests** (+4
  enum-parity, +12 DDL-introspection × 3); `LATEST_VERSION`=18; typecheck clean; eslint 0-err. Gates: gate-1 SHIP ·
  preflight PASSED (6 folds) · gate-2 SHIP · post-impl SHIP. Foundation-readiness: MOD-routines finds the sequence/
  step/ledger — PASS. `[FACT: vitest run]`

## Rules established by DB-4 group #8 — Purpose & Goals (IMPLEMENTED 2026-08-19 · `019_purposes.ts` + `schema/purposes.ts`)
- **[FACT] BR-PG8-1 — the capstone: 6 tables, DB-3 substrate excluded.** Authors `purposes`·`targets`·`purpose_metrics`·
  `purpose_metric_values`·`target_reviews`·`dreams` (the §5.7 floor MINUS the DB-3 `values`/`contributions`/
  `purpose_reviews`/`plan_steps`, consumed no-FK). `schema/purposes.ts` (plural) ≠ `foundation/purpose.ts` (DB-3).
  `[FACT: 019_purposes.ts; foundation/purpose.ts]`
- **[FACT] BR-PG8-2 — no cross-table FK; spine joints OPTIONAL (SR-003 relaxed).** All refs (purpose_id/value_id/
  metric_id/target_id/project_id) plain TEXT + **nullable** → standalone Values/Purposes/Targets/Dreams (PG-9);
  delete-parent = app-layer SET NULL (PG-19). `[FACT: 019_purposes.ts; BR-DB3-1; PG-9]`
- **[FACT] BR-PG8-3 — progress DERIVES; override slots.** `purposes.progress` / `targets.current_value` /
  `dreams.progress_percentage` are **nullable** override slots (NULL⇒derive, PG-4), never `NOT NULL DEFAULT 0` counters.
  `[FACT: ADR-011 §3.2; PG-4/PG-17]`
- **[FACT] BR-PG8-4 — measurement pair on `targets` ONLY.** `targets.target_type` → `measurement_kind` (MEASUREMENT_KIND,
  NN DEFAULT 'quantitative' — the floor target_type default) + `binding_mode` (nullable no-default). purposes (rollup
  apex), dreams, and metrics do NOT carry the pair (structure-data.md:47 assigns it to targets; the dreams-widen +
  metric amendment lists omit it — the module doc is the roster over the ADR-011 broad list;
  [[module-doc-is-db4-roster-not-adr-broad-list]]). `[FACT: structure-data.md:47; ADR-011 §3.1/§3.2]`
- **[FACT] BR-PG8-5 — PG-15 restored fields.** targets `success_criteria`[E]/`measurement_method`; purpose_metrics
  `is_higher_better`(bool)/`baseline_value`(REAL); purpose_metric_values `source`{manual,auto} (NN DEFAULT 'manual' —
  natural for a hand-recorded point) + `context_notes`[E]. `source` (provenance) is a distinct axis from `binding_mode`.
  `[FACT: structure-data.md:54-56; PG-15]`
- **[FACT] BR-PG8-6 — `dreams` absorbs `bucket_list_items` (PG-16).** dreams widens with category (BUCKET_LIST_CATEGORY)
  / status (BUCKET_LIST_STATUS) / priority / target_date / completed_date / location[E] / image_url[E] /
  cover_image_url[E] / inspiration_url[E] / progress_percentage(nullable) / steps[E] JSON / project_id (no-FK). Keeps
  BOTH `domain` (LifeDomain, floor) + `category` (bucket vocab). Inline `tags` RETIRED → `entity_tags`. `bucket_list_items`
  RETIRED (collapsed — no orphan table). No `measurement_kind` (widen list omits it). `[FACT: §5.14 L3324; PG-16]`
- **[FACT] BR-PG8-7 — ledgers/floor: no `deleted_at`.** `purpose_metrics` (floor), `purpose_metric_values` +
  `target_reviews` (ledgers) omit `deleted_at`; the two ledgers add `created_at`+`updated_at` via baseColumns
  (task_time_logs precedent). `target_reviews.progress_rating` = range CHECK 1–10 (not tuple → not a parity row).
  `[FACT: §5.7; task_time_logs precedent]`
- **[FACT] BR-PG8-8 — 13 FIXED CHECK cols parity-asserted; 1 net-new tuple, 1 reuse.** purposes(domain/status) ·
  targets(measurement_kind/binding_mode/status/priority/review_frequency) · purpose_metrics(calculation_method) ·
  purpose_metric_values(source) · dreams(domain/category/status/priority). **`METRIC_VALUE_SOURCE` net-new**;
  **`FREQUENCY` reused** for `review_frequency` (gate-1 F2 — byte-identical to a would-be net-new REVIEW_FREQUENCY +
  the floor `Target` interface already uses `Frequency`); `TARGET_TYPE` retired → DB-11. `[FACT: enum-parity.test.ts; purpose.ts]`
- **[FACT] BR-PG8-9 — registry += 4.** `ENTITY_TYPES += 'purpose'/'target'/'dream'/'purpose_metric_value'` (PG-18;
  `'value'` already present from DB-3). `purpose_metrics`/`target_reviews` addressed via their refs → not registered.
  `[FACT: _registry.ts; PG-18]`
- **[FACT] BR-PG8-10 — mirror-only; interface reconcile → DB-11.** `Purpose` +value_id/progress→null; new `Target`/
  `PurposeMetric`/`PurposeMetricValue`/`TargetReview`/`Dream`; retire `TARGET_TYPE`; `BucketListItem`→`Dream`.
  `[FACT: project.ts; ADR-016 DB-11]`
- **[FACT] BR-PG8-11 — parity + introspection + runner green; ZERO build-decisions.** `@vida/core` **336 tests** (+13
  enum-parity, +24 DDL-introspection × 6); `LATEST_VERSION`=19; typecheck clean; eslint 0-err. Gates: gate-1 SHIP ·
  preflight PASSED (6 folds) · gate-2 SHIP · post-impl SHIP. Foundation-readiness: MOD-purpose finds the spine + Dreams
  — PASS. `[FACT: vitest run]`

## Rules established by DB-4 group #9 — Finance (+Fiscal & Legal) (IMPLEMENTED 2026-08-20 · `020_finance.ts` + `schema/finance.ts`)
- **[FACT] BR-FN9-1 — 9 tables: 6 finance entities (fresh) + 3 net-new Fiscal & Legal.** Authors the §5.8 `accounts`·
  `transactions`·`assets`·`liabilities`·`investments`·`income_streams` (absent from the new `schema/` — they lived in the
  pre-rebuild monolith) + `fiscal_residencies`·`legal_entities`·`fiscal_obligations` (§5.20 L3828). The DB-3 `store`/`rules`
  (E6, `foundation/economy.ts`) are CONSUMED, not re-authored. `[FACT: 020_finance.ts; foundation/economy.ts]`
- **[FACT] BR-FN9-2 — no FK (within + cross-domain).** `transactions.account_id`/`transfer_to_account_id`,
  `investments.account_id` (§5.8 CASCADE/SET NULL) + `legal_entities.project_id`, `fiscal_obligations.linked_task_id`,
  `owner_id` → plain TEXT + indexes; §5.8 `REFERENCES` superseded (ADR-016 §3.4); cascade/orphan is app-layer (FN-11).
  `[FACT: 020_finance.ts; current-spec.md:176-177]`
- **[FACT] BR-FN9-3 — build-phase intent authored, not deferred.** `accounts.opening_balance` (FN-3 ledger-derived);
  `transactions.category_bidx` + `idx_transactions_category_bidx` (F7 — a P-side equality blind-index column; the
  keyed-BLAKE2b derivation is service-layer, deferred); liabilities G9 ×4 (`payment_frequency`/`next_payment_date`/
  `interest_type`/`payoff_date`); `income_streams.next_payment_date`; `jurisdiction_code` on the 5 finance entities
  (FL-9). All additive/nullable. `[FACT: 020_finance.ts; §5.20 L3814/3828; FN-3/G9/FL-9]`
- **[FACT] BR-FN9-4 — inline `transactions.tags` RETIRED → `entity_tags`.** No `tags` column; Finance is a tag consumer
  (`entity_type='transaction'` + account/asset/investment/liability). `[FACT: 020_finance.ts; FN-10/SP1]`
- **[FACT] BR-FN9-5 — FIXED vs OPEN enums.** 13 FIXED CHECK cols parity-asserted; `INTEREST_TYPE`+`FISCAL_OWNER_TYPE`
  net-new (`@vida/types` + Zod), `FREQUENCY` reused ×3 (`recurring_frequency`/`payment_frequency`/income `frequency`).
  OPEN no-CHECK: `currency`, all `jurisdiction_code`, `category_bidx`, and the fiscal `residency_type`/`entity_type`/
  `obligation_type`/`status` (per-jurisdiction, rule-pack-defined — conventions.md:32; [[open-vocab-columns-take-no-sql-check]]).
  `[FACT: 020_finance.ts; enum-parity.test.ts]`
- **[FACT] BR-FN9-6 — fiscal nullability = the roster `?`-notation** (the sole source for net-new tables, no ADR-002 SQL).
  Nullable = `fiscal_residencies.end_date`, `legal_entities.project_id`, `fiscal_obligations.linked_task_id`; every other
  fiscal column NOT NULL. Finance-6 nullability/defaults per §5.8 exactly. `[FACT: fiscal-legal/structure-data.md:12-22; §5.8]`
- **[FACT] BR-FN9-7 — no M\*; scope boundary.** No `measurement_kind`/`binding_mode` on any finance table (Finance is a
  Purpose feeder, not a pursuable — C6). OUT (documented boundary): `import_staging`/`connection_config` (undecided
  ingestion ADR), `ai_connections` (ADR-015), budgeting/`liability_payments`/FX (design pass), `move_money` (handler).
  `ENTITY_TYPES += account/transaction/asset/investment/liability` (income_stream + fiscal entities excluded, G12).
  `[FACT: _registry.ts; docs/specs/foundation/db-4-finance-and-fiscal-legal/]`
- **[FACT] BR-FN9-8 — parity + introspection + runner green.** `@vida/core` 385 tests (+13 enum-parity rows, +36
  DDL-introspection × 9); `LATEST_VERSION`=20; typecheck 11/11; eslint 0-err. Gates: gate-1 SHIP · preflight PASSED ·
  gate-2 REVISE→resolved (fiscal nullability = roster, not FL-11 inference) · post-impl SHIP. Foundation-readiness:
  MOD-finance finds the 6 entities + net worth over the DB-3 `store` tree + the fiscal spine — PASS. `[FACT: vitest run]`

## Rules established by DB-4 group Skills (IMPLEMENTED 2026-08-20 · `021_skills.ts` + `schema/skills.ts`)
- **[FACT] BR-SK-1 — mastery is DERIVED, never a stored default.** `skills.current_level` + `progress` are nullable
  derived slots (service-written); `mastery_override` is the nullable manual override (M3). The ADR-002 §5.9
  `mastery_level NOT NULL DEFAULT 'novice'` anti-signal is resolved OUT — §5.9's whole DDL is STALE, superseded by the
  `structure-data.md` roster. `[FACT: 021_skills.ts:44-52; structure-data.md:11-12]`
- **[FACT] BR-SK-2 — `skill_actions` IS the Sessions `practice` sub-type**, not a standalone table: own `id` UUIDv7 PK +
  `session_id TEXT NOT NULL UNIQUE` (1:1 key, no FK); spine (timer/scheduling) lives on `sessions`, never re-stored. The
  group-#3 `study_sessions`/`focus_sessions` pattern. `SESSION_SUB_TYPE` already carries `'practice'` (OPEN). `[FACT:
  021_skills.ts:141-160; session-extensions.ts; session.ts:24]`
- **[FACT] BR-SK-3 — no FK anywhere.** Self-ref `parent_skill_id`, all parent refs (`skill_id`/`level_id`/`activity_id`),
  `definition_id`, `session_id`, and the graph edges (`from_/to_skill_id`) are plain TEXT; cascade = app/sync-layer
  (ADR-016 §3.4; §5.9 `REFERENCES` superseded). `[FACT: 021_skills.ts]`
- **[FACT] BR-SK-4 — no stored `measurement_kind`.** The Composer `measurement_config` is `[E]` JSON stored as plain
  `text()` (opaque blob at rest, P-2), referencing the ADR-011 taxonomy at the service layer — NOT a typed CHECK column.
  The pursuable Target-Mastery's M1/M2 is Purpose-owned (C-M1). `components_tracked` (plain) = `json<T>`. `[FACT:
  skills.ts:81-83]`
- **[FACT] BR-SK-5 — tags/notes/links ride the AR-6 substrate.** No inline tags column; tags via `entity_tags`, notes via
  `pages`, links via `entity_links`. `ENTITY_TYPES += skill/skill_level/skill_activity/skill_dev_log/skill_dependency/
  skill_definition`; **`skill_action` EXCLUDED** (session sub-type → base `session`, ADR-004 §3.1); the roster's stale
  "`skill` already reserved" corrected (skill was absent). `skill_resources` RETIRED → `entity_links` (not authored).
  `[FACT: _registry.ts; structure-data.md:44,47-48]`
- **[FACT] BR-SK-6 — FIXED vs OPEN enums.** 14 FIXED CHECK cols / 11 tuples parity-asserted; 7 net-new enums
  (`SKILL_LEVEL_STATUS`/`SKILL_ACTIVITY_TYPE`/`SKILL_FILL_SOURCE`/`SKILL_DEPENDENCY_TYPE`/`SKILL_DEPENDENCY_SCOPE`/
  `SKILL_DEFINITION_SOURCE`/`SKILL_SETUP_MODE`) + Zod; reused `LIFE_DOMAIN`/`PRIORITY`/`FREQUENCY`/`MASTERY_LEVEL`.
  OPEN no-CHECK (un-enumerated in every aspect doc): `skills.status`/`ladder_template`, `skill_activities.difficulty`,
  `skill_levels.duration_target`, `skill_actions.best_time`, `skill_definitions.locale_variant`; rating INTs plain.
  `[FACT: enum-parity.test.ts; skill.ts]`
- **[FACT] BR-SK-7 — parity + introspection + runner green.** `@vida/core` 426 tests (+14 enum-parity rows, +28
  DDL-introspection × 7); `LATEST_VERSION`=21; typecheck 11/11; eslint 0-err. Gates: gate-1 SHIP · preflight PASSED (6
  folds) · gate-2 SHIP · post-impl SHIP. **Zero build-decisions.** Interface reconcile → DB-11. `[FACT: vitest run]`

## Rules established by DB-4 group #10 Knowledge (+flashcards) (IMPLEMENTED 2026-08-20 · `022_knowledge.ts` + `schema/knowledge.ts`)
- **[FACT] BR-KN-1 — the recursive spine.** `knowledge_objects.parent_object_id` (self-ref, no FK) IS the
  `Subject›Unit›Topic` + user-kinds hierarchy (KN-3); every object has `kind_id` → `object_kinds`. `knowledge_objects`
  generalizes the retired `study_topics`. `[FACT: 022_knowledge.ts:35-40; structure-data.md:35]`
- **[FACT] BR-KN-2 — mastery DERIVED, never hand-set.** `knowledge_objects.mastery_level` is nullable (service-computed
  at the leaf, rolls up the spine, KN-9); the §5.10 `NOT NULL DEFAULT 0` anti-signal resolved out. `[FACT: 022:47]`
- **[FACT] BR-KN-3 — SM-2 cols RETIRED to the DB-3 engine.** No `easiness_factor`/`repetition_number`/`interval_days`/
  `next_review_date`/`last_reviewed_at` on `knowledge_objects` OR `flashcards`; scheduling state is DB-3
  `review_curves`/`method_bindings`/`review_events` (CONSUMED, `foundation/knowledge-review.ts`; KN-8, ADR-005). `[FACT]`
- **[FACT] BR-KN-4 — cross-module via `entity_links`, tags via `entity_tags`, notes via `pages`.** No `course_id`/
  `linked_book_id`/`reading_chapter_id` FK (→ `entity_links`, KN-6); no inline tags (containers + tags via `entity_tags`,
  KN-7); no `resource_type` CHECK; knowledge notes = `pages` rows (KN-5, not a table). `[FACT: KN-5/6/7]`
- **[FACT] BR-KN-5 — no FK anywhere.** `kind_id`/`parent_object_id`/`default_method_id`/`object_id`/`promoted_object_id`
  plain TEXT; §5.10 REFERENCES superseded (ADR-016 §3.4). `references` is a SQL keyword → quoted in the DDL. `[FACT: 022_knowledge.ts]`
- **[FACT] BR-KN-6 — Education plans, Knowledge holds (KN-2).** `knowledge_objects` carries the Knowledge-intrinsic
  `study_topics` survivors (`title`/`description`/`key_concepts`/`status`/`difficulty`/`is_exam_topic`/`sort_order`);
  the Education-plan/Books-context cols (`due_date`/`estimated_study_minutes`/`study_time_minutes`/`class_date`/
  `reading_start/end_page`) are NOT carried — reached via `entity_links`. `[FACT: KN-2; §5.10:2590-2621]`
- **[FACT] BR-KN-7 — flashcards content-only + FIXED/OPEN enums + ZK.** `flashcards` = `front/back/hint/explanation[E]`,
  `card_type`, `media`, `is_suspended`, `sort_order` — NO `deck_id`/SM-2/`is_mastered` (ADR-005). `references.url` = `[E]`
  (replaces `resource_urls[E]`, KN-1 — the gate-1 catch). **4 FIXED CHECK cols = 4 tuples**: reused `STUDY_TOPIC_STATUS`/
  `TOPIC_DIFFICULTY` + net-new `KNOWLEDGE_CONTAINER_TYPE`/`CARD_TYPE`. OPEN no-CHECK: `object_kinds.name`/`learning_realm`
  (user-extensible, KN-4), `references.type`, `compound_sets.consumer_module`. `ENTITY_TYPES += knowledge_object/
  knowledge_container/reference/flashcard`. `compound_sets`/`knowledge_lab_entries` = base tables only (AI-assist +
  automation surface undesigned, deferred). **Phase-5 introspection** (28 × 4). `@vida/core` green; `LATEST_VERSION`=22;
  typecheck 11/11; eslint 0. Gates: gate-1 REVISE→resolved (`references.url` [E]) · preflight PASSED (8 folds) · gate-2 SHIP ·
  post-impl SHIP (reconciled `data_refs` → plain per spec). **Zero build-decisions.** Interface reconcile → DB-11. `[FACT: vitest run]`

## Rules established by DB-4 group #11 Books (IMPLEMENTED 2026-08-20 · `023_books.ts` + `schema/books.ts`)
- **[FACT] BR-BK-1 — book = the WORK, copies = assets (BK-2).** `books` holds work-level identity; `book_assets` (0..n,
  no FK) each carry `format` + one `native_position`. A 0-asset book (TOC-only) is first-class. `[FACT: BK-2; 023_books.ts]`
- **[FACT] BR-BK-2 — unified progress DERIVED (BK-3/M3).** `books.progress` nullable override (`NULL⇒derive`); the §Books
  `NOT NULL DEFAULT 0` anti-signal resolved out. `books.current_page` RETIRED → per-asset `native_position`. `[FACT: BK-3]`
- **[FACT] BR-BK-3 — classification via `entity_tags`, prose via `pages` (BK-16).** Inline `books.genre`/`tags` RETIRED →
  `entity_tags`; `books.format` RETIRED → `book_assets`; notes on bookmarks/quotes via `pages`. `[FACT: BK-16]`
- **[FACT] BR-BK-4 — `reading_sessions` = a `reading` Session sub-type (BK-10, S1).** Own `id` PK + `session_id` UNIQUE
  (1:1, no FK); the base `sessions` owns timer/scheduling AND lifecycle → `reading_sessions` carries **NO `deleted_at`**
  (the `study_sessions`/`focus_sessions` precedent). `reading` ≠ `study`. `SESSION_SUB_TYPE` carries `'reading'`. `[FACT: BK-10]`
- **[FACT] BR-BK-5 — 3 annotation natures (BK-6).** `book_bookmarks` + `book_quotes` take notes (`pages`) + inter-links
  (`entity_links`); `book_highlights` are deliberately light (no notes/links → excluded from ENTITY_TYPES). `[FACT: BK-6]`
- **[FACT] BR-BK-6 — no FK; one doc-fixed UNIQUE.** All refs plain TEXT (§Books REFERENCES/CASCADE superseded); the only
  UNIQUE = `book_chapters(book_id, chapter_number)` (§Books L2501). **`deleted_at` on 8 of 10** — `book_chapters` omits it
  (FACT floor + structure-data:10 "no soft delete" + child, conventions:41 "on parents") and `reading_sessions` omits it
  (session extension). `[FACT: 023_books.ts]`
- **[FACT] BR-BK-7 — no measurement axes on `reading_plans` (C-M1) + FIXED/OPEN enums.** The plan goal's `measurement_kind`/
  `binding_mode` is a Purpose target (Purpose-owned; Books absent from the M1 pursuable set — the Skills pattern);
  `reading_plans` holds only plan mechanics. **4 FIXED CHECK = 4 tuples**: reused `BOOK_STATUS` + net-new `BOOK_ASSET_FORMAT`/
  `READING_PLAN_ARRANGEMENT`/`READING_PLAN_GOAL_TYPE`; `books.rating` numeric BETWEEN. `ENTITY_TYPES += book/book_chapter/
  book_bookmark/book_quote`. `BOOK_FORMAT` now stale → DB-11. **Phase-5 introspection** (40 × 4). `@vida/core` **503 tests**
  green; `LATEST_VERSION`=23; typecheck 11/11; eslint 0. Gates: gate-1 REVISE→resolved (deleted_at-on-extension audit — see
  BR-DB-AUDIT) · preflight PASSED (7 folds) · gate-2 SHIP · post-impl SHIP. **Zero build-decisions.** `[FACT: vitest run]`
- **[FACT] BR-DB-AUDIT (2026-08-20) — session extensions carry NO `deleted_at`.** A session sub-type extension
  (`session_id` UNIQUE 1:1 → base `sessions`) is soft-deleted via its base (`sessions.ts:41` has `deleted_at`), so the
  extension must not. Audit fixed `skill_actions` (Skills group — wrongly had it) → REMOVED from `skills.ts` + `021_skills.ts`;
  `study_sessions`/`focus_sessions` already correct. No other authored table violates an explicit "no soft delete" signal.
  `[FACT: session-extensions.ts; skills.ts; 021_skills.ts]`

## Rules established by DB-4 group #12 Learning/Education (+ICS) (IMPLEMENTED 2026-08-20 · `024_learning_education.ts` + `schema/learning.ts`)
- **[FACT] BR-ED-1 — SP1: no inline tags.** `subjects` (= `courses` reshaped) does NOT carry an inline `tags` column;
  classification is `entity_tags` (`entity_type='subject'`, ADR-006 SP1). Registered in `ENTITY_TYPES`.
- **[FACT] BR-ED-2 — M3: progress DERIVED, never a counter.** `subjects.progress` + `education_measurements.progress` are
  nullable override slots (`NULL⇒derive`); the §5.10 `NOT NULL DEFAULT 0` anti-signal is resolved out. `[FACT: 024:48,375]`
- **[FACT] BR-ED-3 — M1/M2: Education-forged measure entity.** `education_measurements` carries `measurement_kind` (reused
  MEASUREMENT_KIND, **notNull no-default** — a dedicated measure entity, caller-supplies; deliberately diverges from
  `deliverables`' `'milestone'` default) × `binding_mode` (reused BINDING_MODE, nullable no-default ⇒ derive). **Separate
  storage from Projects** (ED-10 — never mixed). `[FACT: 024:375-377]`
- **[FACT] BR-ED-4 — X8: ICS is an add-only feed.** `ics_synced_events` has `UNIQUE(feed_id, uid)` + `is_ignored` and **no
  `deleted_at`** (never delete); `ics_feed_configs` also omits `deleted_at` (revoke = `is_active`, X9). Both match the FACT
  interfaces. `[FACT: 024:122; schema/learning.ts]`
- **[FACT] BR-ED-5 — no FK anywhere.** Every ref (`curriculum_id`/`term_id`/`parent_id`/`parent_term_id`/`program_id`/
  `subject_id`/`grading_system_id`/`grading_component_id`/`scope_id`/`ref_id`/`session_id`/`schedule_id`/`source_event_id`/
  `matched_subject_id`/`default_subject_id`/`forked_from_id`) is plain TEXT (§5.10 REFERENCES superseded, ADR-016 §3.4).
- **[FACT] BR-ED-6 — the 8-level hierarchy (ED-2/H2).** `institutions` + `self_taught` (SEPARATE tables) → `programs`
  (`parent_type` ∈ institution|self_taught) → `curricula` (`forked_from_id` lineage) → `terms` (hierarchical `level`
  ∈ year|semester|term + `parent_term_id`) → `subjects` (routed via `curriculum_id`/`term_id`/`degree_tier`, nullable per A1).
- **[FACT] BR-ED-7 — `class_sessions` = a `class` Session sub-type (ED-4).** Own `id` PK + `session_id` UNIQUE (1:1 → base
  `sessions`, no FK), **no `deleted_at`** (base owns lifecycle). Spine fields (start/end/status) live on `sessions`, never
  re-stored. Excluded from `ENTITY_TYPES` (addressed via base `session`). `[FACT: 024:230-248]`
- **[FACT] BR-ED-8 — grade builder + assessments (ED-7/ED-8).** `grading_systems` (scope+scale_type) + `grading_components`
  (weighted template {component_type, weight, max_points}) + `assessments` (type/date/weight/modality/score). Grade/GPA
  **COMPUTATION** = runtime service (M1.1+), never a stored authority. `assessments.source` ∈ RECORD_SOURCE (`manual|ai|import`,
  AI6 provenance). `[FACT: 024:280-338]`
- **[FACT] BR-ED-9 — subject vault (ED-13, PJ-8).** `subject_documents` = the `project_documents` pattern: `baseColumns` only
  (**no `deleted_at`**), nullable `encrypted_blob` BLOB (inline) + `storage_ref` (R2); `doc_type` OPEN no-CHECK. `[FACT: 024:348-367]`
- **[FACT] BR-ED-10 — boundaries held.** Homework = **Tasks-owned** (C-HW — no local table); AI document-extraction pipeline =
  ADR-014/015 service (only the `source=ai` column authored); `entity_tags`/`entity_links` = AR-6 (not redefined); no E2/grant
  (C-E2), no AI4 agent (C-AI4), no M5 seam (C-M5). **15 FIXED CHECK cols** (11 net-new + 4 reused tuples); `subjects.rating`
  numeric BETWEEN; `subject_documents.doc_type` OPEN. **Phase-5 introspection** (60 × 4). `@vida/core` **578 tests** green;
  `LATEST_VERSION`=24; typecheck 11/11; eslint 0. Gates: gate-1 SHIP · preflight PASSED (6 folds) · gate-2 SHIP · post-impl SHIP.
  **Zero build-decisions** (⚠ Victor drift-catch at P1: an author-vs-defer framing of the grading `(design pass)` label — the
  intake §Resolution had resolved it WHOLE; corrected → author now, [[build-phase-flags-mean-resolve-now-not-defer]]).
  Interface reconcile (Course→Subject, `default_course_id`→`default_subject_id`) → DB-11. `[FACT: vitest run]`

## Rules established by DB-4 group #14 Relationships (CRM) (IMPLEMENTED 2026-08-20 · `025_relationships.ts` + `schema/relationships.ts`)
- **[FACT] BR-RL-1 — PII is [E]; health is DERIVED, never a measurable (C1).** All identifying contact fields + free text are
  `[E]` (RL-1; empty [E] set in M1.0, pass-through). Relationship health carries **NO `measurement_kind`/`binding_mode`** —
  contacts are ADR-011-excluded reference data; health is a derived, closeness-weighted analytic, never stored. `[FACT: 025:*]`
- **[FACT] BR-RL-2 — SP1: no inline tags; `social_links` KEPT (C4).** Inline `contacts.tags` RETIRED → `entity_tags`
  (`entity_type='contact'`, G10/SP1); `social_links` stays a typed-JSON column (structured, not a tag concern). `[FACT: 025 contacts]`
- **[FACT] BR-RL-3 — networks authored now (G2, build-phase).** `network_groups` + `network_group_contacts` (M:N, RL-4 — a
  contact in many networks) are net-new; the rerun's schema-0 `[INTENT]` guard was the doc-realignment pass's, superseded by
  DB-4 ([[build-phase-flags-mean-resolve-now-not-defer]]). Description → `pages` (`entity_type='network'`); health derived.
- **[FACT] BR-RL-4 — `deleted_at` on `contacts` ONLY.** The §5.9 floor gives it to `contacts` alone; children/ledgers/groups/
  junctions omit it (RL-2 cascade = app-layer; `interactions` = the ledger, RL-3, hard-deletes — the `habit_completions`/
  `routine_completions` precedent, HB-11/RT-17; `reminder_groups`/`network_groups` use `is_active`). `[FACT: 025; schema/relationships.ts]`
- **[FACT] BR-RL-5 — junctions = entity_tags-v2 shape, NOT §5.9 composite PK.** `reminder_group_contacts` +
  `network_group_contacts` carry a synthetic `id` PK + `baseColumns` + `UNIQUE(pair)` + reverse index on `contact_id`
  (the `project_habits`:29-30 convention; §5.9's composite-PK/`SyncMetadata` shape is the stale source — a preflight catch F1).
- **[FACT] BR-RL-6 — no FK anywhere.** `contact_id` (×5), `reminder_group_id`, `network_group_id` are plain TEXT (§5.9
  REFERENCES/CASCADE/SET NULL superseded, ADR-016 §3.4); cascade/orphan/SET-NULL = app-layer (RL-2). `[FACT: 025 no REFERENCES]`
- **[FACT] BR-RL-7 — build-phase G8/G11 fields authored.** `contacts.how_we_met`[E] + `closeness_tier` (G4, OPEN no-CHECK —
  Preferences-defined vocab, `contact.md:31`); `interactions.energy_given`/`energy_received` (INT plaintext — the
  `sentiment`/`duration` precedent) + `key_takeaways`[E]; `contact_reminders.is_snoozed`/`snoozed_until`/`priority` (reuse
  `PRIORITY`); `reminder_groups.anchor_type`(NN DEFAULT 'schedule')/`anchor_days_before` (event-anchored, G11). `[FACT: 025]`
- **[FACT] BR-RL-8 — 9 FIXED CHECK cols; 1 net-new enum; registry +2; boundaries held.** FIXED: `RELATIONSHIP_TYPE`·
  `FREQUENCY`×3·`CONTACT_EVENT_TYPE`·`INTERACTION_TYPE`·`SENTIMENT`·`PRIORITY`·net-new `REMINDER_GROUP_ANCHOR` (`{schedule,
  birthday}`); `closeness_tier` OPEN no-CHECK. `ENTITY_TYPES += contact/network` (child/junction excluded — `habit_completions`
  precedent). **OUT** (cite-not-author): notification delivery (N1/N2, Notifications-owned — no delivery cols); device import
  (X1/X8, ADR-014 service — no `import_staging`); health-compute/closeness-banding; Sigma.js graph; Gamification streak
  (C2, `[INTENT]`, no E2). **Phase-5 introspection** (32 × 4). `@vida/core` **619 tests** green (1 pre-existing vault-1MB perf
  flake, passes standalone); `LATEST_VERSION`=25; typecheck 11/11; eslint 0. Gates: gate-1 SHIP · preflight PASSED (1
  shape-correcting fold F1 + 4 mechanical) · gate-2 SHIP · post-impl SHIP. **Zero build-decisions.** Interface reconcile
  (Contact/Interaction/ContactReminder/ReminderGroup + new NetworkGroup/NetworkGroupContact) → DB-11. `[FACT: vitest run]`

## Rules established by DB-4 group #16 Check-ins (IMPLEMENTED 2026-08-20 · `026_check_ins.ts` + `schema/check-ins.ts`)
- **[FACT] BR-CK-1 — enums RECONCILE, not net-new (gate-1 catch).** The 4 check-in tuples (`CHECK_IN_TYPE`/
  `CHECK_IN_SCHEDULE_TYPE`/`CHECK_IN_PREFERRED_TIME`/`CHECK_IN_QUESTION_FIELD_TYPE`) + the 3 interfaces + the 4 Zod schemas
  **already exist** in `@vida/types/entities/user.ts` + `validators/user.ts` (colocated because `check_in_streak*` historically
  sat on `user_profile`). DB-4 amends in place — a new `check-in.ts` would double-export. `[FACT: user.ts:103; validators/user.ts:19]`
- **[FACT] BR-CK-2 — CK-3: `check_in_type` 3→6.** Amended the EXISTING tuple `+afternoon/monthly_review/yearly_review`
  (intake G3); `CheckInTypeSchema`/`DailyCheckIn.check_in_type` auto-inherit (tuple-sourced). `[FACT: user.ts:104-111]`
- **[FACT] BR-CK-3 — CK-2: composite UNIQUE (the bug fix).** `daily_check_ins` uniqueness `UNIQUE(check_in_date)` →
  **`UNIQUE(check_in_date, check_in_type)`** so morning+afternoon+evening+reviews coexist per day; the old single-col UNIQUE is
  GONE. `check_in_template_questions` keeps `UNIQUE(template_id, field_key)`. `[FACT: 026:57,106]`
- **[FACT] BR-CK-4 — `deleted_at` = NONE on all 3 (documented FACT).** §5.13 DDL + the §Check-ins P/E table omit it on all 3
  (while every neighboring domain lists `created_at, updated_at, deleted_at`); CK-10 documents the hard-delete lifecycle
  (`template_id` SET NULL / questions CASCADE — app-layer under no-FK). `[FACT: ADR-002 §5.13; business-rules CK-10]`
- **[FACT] BR-CK-5 — `check_in_template_questions` = `id` + `syncColumns` (NO `created_at`/`updated_at`).** The §5.13 floor
  omits them + the interface `extends SyncMetadata` + explicit `id`. Not `baseColumns`. `pk == ['id']` holds. `[FACT: 026:87-107; user.ts:159]`
- **[FACT] BR-CK-6 — no FK; `mood`/`energy` numeric BETWEEN.** `template_id` ×2 plain TEXT (SET-NULL/CASCADE app-layer, CK-10).
  `mood_score`/`energy_level` = plaintext INT `BETWEEN 1 AND 10` (trend charts; not tuple-sourced → not parity rows). 4 FIXED
  CHECK cols parity-asserted. `[FACT: 026:40-41; enum-parity 4 rows]`
- **[FACT] BR-CK-7 — cite-not-author boundaries + registry.** E9 `check_in_streak*` = DERIVED from `daily_check_ins` (no
  column; the `user_profile` removal is Gamification #21's edit) · E2 `grant_currency(XP)` = Gamification-owned (no economy
  col) · SP1 no tags (opt-out) · G7 review aggregation = integration + optional `entity_links` (no column) · reminders =
  Preferences/Notifications. **No M\*** (C-M — not pursuable). `ENTITY_TYPES += daily_check_in` (pages/entity_links target,
  G10; already in `note.ts` `ENTITY_LINK_TARGET`; templates/questions excluded). **Phase-5 introspection** (12 × 4).
  `@vida/core` **635 green**; `LATEST_VERSION`=26; typecheck 11/11; eslint 0. Gates: gate-1 REVISE→resolved · preflight PASSED
  · gate-2 SHIP · post-impl SHIP. **Zero build-decisions.** Interface reconcile → DB-11. `[FACT: vitest run]`

## Rules established by DB-4 group #17 Health: Core (IMPLEMENTED 2026-08-20 · `027_health_core.ts` + `schema/health-core.ts`)
- **[FACT] BR-HC-1 — recovered domain, 12 net-new tables, the documented floor governs.** Health has NO v2 schema/code,
  but the `structure-data.md` roster (from the AUTHORITATIVE 18-DB Notion design) IS the per-table floor. "No v2 *code*"
  ≠ "no *documented* floor" (a gate-1 critic's "no floor → blanket baseline" premise was FALSE, Victor corrected it). 12
  tables authored per the floor: `health_metrics`·`health_metric_values`·`health_domains`·`health_factors`·`health_exams`·
  `assigned_exams`·`health_goals`·`physical_roles`·`health_experiments`·`health_responses`·`medical_profile_entries`·
  `safety_flags`. `[FACT: structure-data.md §Entities; 027_health_core.ts]`
- **[FACT] BR-HC-2 — `deleted_at` on `health_goals` ONLY (the floor, L45).** Every other table's tail-notation
  ("timestamps"/"_sync_*") omits it; header L7 lists soft-delete as the deletion *mechanism*, not a per-table mandate.
  Entities manage lifecycle via `status`/`end_date`/`phase`; the 4 ledgers (`health_metric_values`/`assigned_exams`/
  `health_responses`/`safety_flags`) append. Selective, NOT blanket. `[FACT: structure-data L45; introspection deleted_at-floor test]`
- **[FACT] BR-HC-3 — goal `type` DECOMPOSED (ADR-011 M1/M2), never authored.** `health_goals` carries `measurement_kind`
  (REUSE `MEASUREMENT_KIND`, notNull) × `binding_mode` (REUSE `BINDING_MODE`, **NULLABLE no-default** — the tasks gate-2
  ruling) × the `metric_id`/`role_id` subject. The bespoke metric-target/physical-role/body-comp/event-prep enum is gone.
  `[FACT: health-core.ts:160-161; rerun G-M1/G-M2]`
- **[FACT] BR-HC-4 — `progress`/`mastery` = nullable REAL override slots (M3), no DEFAULT.** `health_goals.progress` +
  `physical_roles.mastery` are `NULL ⇒ derive`; `progress()`/`deriveMastery()` are service-layer (not authored). `[FACT: health-core.ts:174,193; rerun G-M3]`
- **[FACT] BR-HC-5 — C1/C2/C3 guards held.** `physical_roles.type` = OPEN modality (no CHECK, NOT the measurement axis, C1);
  `health_metrics.kind` = FIXED data-taxonomy (`HEALTH_METRIC_KIND`, NOT `measurement_kind`, C2); no economy/XP columns —
  Health feeds XP via the Sessions S4 effect (C3). `[FACT: health-core.ts:71,66; rerun C1/C2/C3]`
- **[FACT] BR-HC-6 — X*/AI*/M4/M5 = cite-not-author.** No integration/ingestion/AI table; the only DDL trace is provenance
  columns (`health_metric_values.source` incl. **`ai`** [AI6], `physical_roles.authoring_source`, `medical_profile_entries.source`,
  `health_experiments.source`). The M5 read-seam + `deriveMastery()`/`progress()` derivers + wearable/medical egress (X4) are
  service-phase (M1.1+). `[FACT: rerun §5; health.ts:37 (`ai`)]`
- **[FACT] BR-HC-7 — 18 FIXED CHECK + OPEN-vocab split; no-FK; [E] via @encrypted.** 14 net-new FIXED tuples (`health.ts`) +
  4 reused (MEASUREMENT_KIND/BINDING_MODE/STATUS/FREQUENCY on `health_goals`) = 18 CHECK columns, parity-asserted. OPEN vocabs
  (modality/experiment-type/exam-kind/category/body_part/response-scales/severity/medical-status/winner) = plain TEXT no CHECK
  ([[open-vocab-columns-take-no-sql-check]]). No cross-table FK (plain TEXT ids, ADR-016 §3.4). `photo_blob` = `blob(buffer)`
  [E] (note_attachments precedent). `[FACT: enum-parity +18 rows; 027_health_core.ts]`
- **[FACT] BR-HC-8 — registry +11; Core-only; DB-11 deferred.** `ENTITY_TYPES += 11` (OPEN SP2 registry; pillar types
  workout_session/exercise/meal/nutrition_plan are Nutrition #18 / Training #19's). **Phase-5 introspection** (12 × 4 + the
  deleted_at-floor guard = 49). `@vida/core` **702 green**; `LATEST_VERSION`=27; typecheck 11/11; eslint 0. Gates: gate-1
  REVISE→resolved (deleted_at floor — Victor drift-catch) · preflight PASSED (10 folds) · gate-2 SHIP (3 folds) · post-impl
  SHIP. **Zero build-decisions** (the deleted_at drift was a critique's false premise, not a manufactured decision). 12 row
  interfaces + 14 enums → DB-11 interface reconcile. `[FACT: vitest run]`

## Rules established by DB-4 group #18 Health: Nutrition (IMPLEMENTED 2026-08-20 · `028_health_nutrition.ts` + `schema/health-nutrition.ts`)
- **[FACT] BR-NT-1 — 6 net-new tables; the fuel pillar composes the Core spine (#17).** `nutrition_ingredients`·
  `nutrition_dishes`·`nutritional_plans`·`daily_meal_plans`·`meals`·`shopping_items`. Net-new (recovered domain); the
  `structure-data.md` roster IS the documented per-table floor. Nutrition owns only food-specific entities; Nutrition Goals →
  Core `health_goals` (C1/HN-4), Experiments/Responses → Core Adaptation (HN-5), cost → Finance, tags → Spaces. `[FACT: structure-data §Entities]`
- **[FACT] BR-NT-2 — `deleted_at` on `nutritional_plans` ONLY (the floor, L22).** The soft-deletable strategy entity; the other
  5 omit it (libraries = reference data; daily_plans/meals/shopping = instances/logs). The #17 ruling applied cleanly (follow
  the documented per-table floor). `[FACT: structure-data L22; introspection deleted_at-floor test]`
- **[FACT] BR-NT-3 — OPEN-vocab-heavy: only 3 FIXED CHECK.** `meals.source` (`MEAL_SOURCE`=manual|ai|import, AI6 triad, net-new)
  + `daily_meal_plans.generation_method` (`MEAL_GENERATION_METHOD`, net-new) + `nutritional_plans.review_frequency` (reused
  `FREQUENCY`). **Everything else OPEN** (no CHECK): caloric_strategy/dietary_framework/philosophy/meal_type = modality
  (conventions L17); `functional_area`/`whole_food_type` = editable STARTERS (C5/HN-12/HN-13 — never hard-code as truth); all
  `status` columns = bare "status P" in the floor (terminal-states prose is ambiguous UI-state, not a stored-enum contract).
  `[FACT: floor inline-enumeration + conventions L17 + C5; [[open-vocab-columns-take-no-sql-check]]]`
- **[FACT] BR-NT-4 — SP1 forward-reframe: NO inline `meals.tags`.** Dropped → `entity_tags` (a forward `[INTENT]` correction,
  no live floor → no R6); the 6 `entity_type`s register in the OPEN SP2 registry. `ENTITY_TYPES += 6` (incl. `nutritional_plan`,
  NOT `nutrition_plan`). `[FACT: rerun G-SP1/F1; _registry.ts]`
- **[FACT] BR-NT-5 — C1–C8 guards held.** No `measurement_kind`/`binding_mode` (C1 — composes Core goals; `goal_id` no-FK
  nullable); no economy (C2); a meal is a LOGGED entity, NOT a session (C3 — `scheduled_at`+`status`+`dueIn()`, no sub-type);
  no AI4 agentic envelope (C4 — only `source`/`generation_method`/`ai_meal_generation` provenance); `cooking_skill_id` opt-in
  nullable (C6); no `import_staging` (C8, Finance-owned). X*/AI* wiring = cite-not-author. `[FACT: rerun C1–C8]`
- **[FACT] BR-NT-6 — money[E] + blob[E]; no-FK.** `meals.cost` + `shopping_items.estimated_cost` = `money()` INTEGER cents +
  `@encrypted` (finance precedent); `meals.photo_blob` = `blob(buffer)` [E]. No cross-table FK (goal_id/plan_id/daily_plan_id/
  recipe_page_id/cooking_skill_id/meal_ref plain TEXT). **Phase-5 introspection** (6 × 4 + deleted_at guard = 25). `@vida/core`
  **730 green**; `LATEST_VERSION`=28; typecheck 11/11; eslint 0. Gates: gate-1 SHIP (2 NITs) · preflight (9 folds) · gate-2 SHIP
  (2 NITs) · post-impl SHIP. **Zero build-decisions.** 6 row interfaces + 2 enums → DB-11. `[FACT: vitest run]`
