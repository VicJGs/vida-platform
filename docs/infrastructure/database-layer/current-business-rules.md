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
