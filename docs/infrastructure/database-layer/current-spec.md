# Database Layer — Current Spec (durable · §XXIX promotion target)

> **Context:** `@vida/core` → `packages/core/src/db/`. **Seeded from documentation** (2026-07-21). Companion:
> `current-business-rules.md`. Baseline finding: `../database-schema-reconciliation.md`. Strategy:
> `../storage-rebuild-strategy.md`. **No-Guessing:** `[FACT: src]` / `[INTENT]` (documented direction, not yet built).

## What the DB layer is
A platform-agnostic, local-first SQLite layer: the schema (Drizzle ORM), a generic encrypting repository, a
per-platform adapter, and a migrations runner. `[FACT: db/ tree]` ADR-002 three-layer encryption; ADR-003 sync model.

## Topology (v2 target — DB-1 stands up the substrate)
```
packages/core/src/db/
├── schema/              # v2 authoring surface (DB-1+)
│   ├── _shared.ts       # primitives: baseColumns · syncColumns · typed column helpers · enumText (SQL CHECK lives in the migration)
│   ├── _registry.ts     # entity_type registry (single source for polymorphic FKs + CHECKs)
│   ├── index.ts         # barrel — primitives + the foundation/ substrate table modules
│   ├── foundation/      # [FACT] substrate tables authored by DB-6/7 + AR-5/6/7 (see inventory below)
│   │   ├── sync-queue.ts · app-state.ts   # DB-6 / DB-7 infra tables
│   │   ├── sessions.ts · spaces.ts · capability.ts · effects.ts · economy.ts  # AR-5/6/7 substrate
│   └── <domain>.ts      # [INTENT] one file per structure-data doc (DB-4)
├── schema.ts            # v1 monolith — reference-only; deleted at parity (DB-6/7)
├── repository.ts · adapter.ts · migrations/   # 001_sync_queue … 006_economy (007+ = DB-3)
```

## Current state (FACT)
- `schema.ts` = the **v1** monolith, 80 tables, imported by `index.ts:59` (`export * as schema`) and `adapter.ts:16`.
  `[FACT: schema.ts; index.ts:59; adapter.ts:16]`
- It is ~60% misaligned with the v2 target (retire ~22 · missing ~90-110 · divergent ~9 · carry-forward ~40) and
  carries 5 systemic gaps. `[FACT: ../database-schema-reconciliation.md]`
- The v2 rebuild is authored from-zero into `schema/`, per-table-gated. `[FACT: ../storage-rebuild-strategy.md]`

## Status (2026-07-21)
`schema/_shared.ts` · `_registry.ts` · `index.ts` **implemented + verified** — `tsc --noEmit` green on `@vida/core`,
`@vida/web`, `@vida/server`; additive, monolith and its consumers untouched (`./db/schema` still resolves to the
monolith, proven via `web-adapter.ts:36` `typeof schema`). `[FACT: DB-1 session verification]`

## Contract — the primitives DB-1 establishes (`schema/_shared.ts`)
- `baseColumns` = `{ id (uuidPk) · created_at · updated_at (Unix-ms INTEGER) · ...syncColumns }`.
- `syncColumns` = the **6** sync columns (identical to today; `_sync_field_ts` is DB-2's).
- Column helpers: `uuidPk(name?)` · `timestampMs(n)` · `money(n)` · `calendarDate(n)` · `boolInt(n)` · `json<T>(n)` ·
  `enumText(n, values)`.
- `_registry.ts`: `ENTITY_TYPES` (minimal foundation seed) · `EntityType` type · `isEntityType()` — extensible per domain.

## Enum enforcement model (architecture — three parts, NOT a Drizzle helper)
DDL is hand-written SQL migrations (ADR-002 §5 · `migrations/*`); Drizzle objects are the query mirror (no
drizzle-kit). So an enum is enforced by: **(1)** the `CHECK` constraint in the SQL migration (DB-3/DB-4), **(2)** the
canonical Zod validator (DB-9), **(3)** `enumText`'s TS union for query types (DB-1). DB-1 owns only part (3). A
Drizzle `check()` helper was removed — it emits no DDL in this pipeline. `[FACT: ADR-002 §2.3/§5; migrations/001_initial.ts]`

## AR-2 — DatabaseAdapter contract + web-adapter (IMPLEMENTED 2026-07-27 · LIF-73)
The adapter seam is **asynchronous** — wa-sqlite@1.0.0's Factory API is async-only (`step`/`prepare_v2`/`finalize`
are `async function` regardless of WASM build), so a sync driver is impossible. This matches the delivery plan's
"async Drizzle proxy" for AR-2. `[FACT: node_modules wa-sqlite/src/sqlite-api.js:742-750; delivery-plan §5]`
- **`SqliteDriver`** (`adapter.ts`) — all methods async: `exec/run/query/batch/close` return Promises; **added**
  `values(sql,params): Promise<unknown[][]>` (positional rows for the ORM path). `query` stays object-keyed for
  internal use (migrations, schema version). `[FACT: adapter.ts]`
- **`DrizzleDb = SqliteRemoteDatabase<typeof schema>`** (`'async'`), built by **`createDrizzleProxy(driver)`** via
  `drizzle-orm/sqlite-proxy` — the callback maps `run→{rows:[]}`, `all/values→{rows:positionalArrays}`,
  `get→{rows: firstRow}` (drizzle's `mapGetResult` treats the value as one flat row). `[FACT: adapter.ts; sqlite-proxy/session.js:143-162]`
- **`initializeConnection`** opens **plain** when `config.sqlCipher` is absent (M1.0); configures+verifies the cipher
  when present — the M3 seam, a config change not a code change. `[FACT: adapter.ts; ADR-017]`
- **Migration runner** (`runMigrations`, `getSchemaVersion`, `setSchemaVersion`) is async; each migration runs in a
  `BEGIN/COMMIT`, failure → `ROLLBACK` + version unchanged; empty registry ⇒ no-op v0. `[FACT: adapter.ts; runner.ts]`
- **Web impl** (`apps/web/src/db/`): a **Web Worker** (`worker.ts`) hosting the sync wa-sqlite build +
  `AccessHandlePoolVFS` (OPFS); `web-driver.ts` (async `SqliteDriver` on the `statements()` iterator); `web-adapter.ts`
  (`DatabaseAdapter` — open/migrate/createDrizzle/exists/destroy). `exists`/`destroy` are VFS-directory-scoped
  (the VFS uses opaque OPFS names) — per-name first-run is AR-4. `[FACT: apps/web/src/db/*]`
- **Consequence:** `repository.ts` + `runner.ts` are async-propagated (consume the async `DrizzleDb`). The repository
  encrypt/decrypt **seam** semantics remain **DB-6**. `[FACT: repository.ts; runner.ts]`

## DB-6 — IMPLEMENTED (2026-07-28 · LIF-68 · commit pending)
The repository now delivers its full charter. `[FACT: repository.ts; schema/foundation/sync-queue.ts; migrations/001_sync_queue.ts]`
- **`sync_queue` foundation table** — `schema/foundation/sync-queue.ts` (Drizzle mirror) + `migrations/001_sync_queue.ts`
  (hand-written DDL: `operation`/`status` CHECKs + `UNIQUE(table_name,row_id,operation)` + status index, per ADR-002
  §5.1). Registered in the runner (`ALL_MIGRATIONS=[migration001SyncQueue]`) → applied at schema v1. Device-local, not synced.
- **Co-transactional enqueue** — `create`/`update`/`delete` write the entity row + a `sync_queue` row inside one
  `db.transaction()` (async sqlite-proxy `transaction()`); both commit or both roll back. Enqueue is an **UPSERT** on
  `(table_name,row_id,operation)` → repeated pre-flush mutations coalesce to the latest snapshot (LWW-correct). Soft
  delete enqueues `operation='update'`; hard delete `'delete'`. Payload = the final persisted/re-read row.
- **M1.0 pass-through seam** — encrypt/decrypt runs over an empty `[E]` set (ADR-017:20); the vault key is fetched
  **lazily** (only when `encryptedFieldSet.size > 0`), so a locked vault (M1.0 default) never throws. Producer-only —
  the reader/flush is AR-9 (M4).
- **`createInTx(tx, data)`** *(added AR-7 inc-4, 2026-08-03)* — the co-transactional create body invocable within a
  **caller-supplied** tx; `create()` is now `db.transaction(tx => createInTx(tx, data))` (zero behavior change). Lets
  an **effect handler** co-write its output row inside the effect rail's tx (ADR-004 §3.2.5 single write path + §3.2.5-B
  "same transaction as the write"), rather than opening a nested transaction. First consumer: the economy
  `grant_currency`/`lock_currency` handlers writing `consequence_ledger`. `[FACT: repository.ts createInTx/create]`
- **Tested** — `db/tests/repository.test.ts`: 10 cases incl. SQL-level atomic rollback + coalescing + locked-vault
  pass-through + seam-with-key. `@vida/core` suite 55/55; root typecheck 10/10. `[FACT: vitest run]`

<details><summary>DB-6 pre-build baseline (2026-07-28 · §XXVI.1a — the as-is floor, kept as the audit record)</summary>
`repository.ts` is **NOT a stub** — it is a full 432-line generic repository, present since `bc83a84` (Initial
commit, v1-era) and only **async-propagated** by AR-2 (`e55010f`), never rebuilt for the v2 DB-6 charter.
`[FACT: git log --follow repository.ts]` What is actually there today:
- **`createRepository<T>(db, table, config)`** factory → `Repository<T>` with `create/findById/findAll/update/
  delete/hardDelete/findWhere/count`, all async. `[FACT: repository.ts:218,175-199]`
- **Active field-level encryption** on every write/read: `encryptRow`/`decryptRow` call `getVaultKey()` per op
  (`encryptField`/`decryptField` from `../encryption/vault`; `getVaultKey` resolves at `key-management.ts:124`).
  `[FACT: repository.ts:19-20,113-149,231]`
- **Sync metadata is stamped on the row** (`_sync_id/_version/_device_id/_lww_ts/_status='pending'` + `_sync_hash`
  over non-sync fields). `[FACT: repository.ts:238-246,151-160,281]`
- **UUIDv7/UUIDv4 generators** + `packEncrypted`/`unpackEncrypted` + `buildEncryptionSchema` co-located here.
  `[FACT: repository.ts:62,81,98,103,421]`

**Gaps vs the DB-6 charter (what DB-6 must actually deliver — this is the true unit of work):**
1. **[GAP] No `sync_queue` producer.** The repository only stamps `_sync_status:'pending'` on the row; there is
   **no co-transactional `sync_queue` enqueue** (DB-6's central charter, ADR-004 §3.4). `[FACT: no `sync_queue` ref
   in repository.ts]`
2. **[GAP] No transaction wrapper.** `create/update/delete` issue bare `.run()` calls (`db.insert(table).values().run()`)
   — a co-transactional row+queue write needs a single `BEGIN/COMMIT`, which the current code does not open.
   `[FACT: repository.ts:284,369,397]`
3. **[GAP] No `sync_queue` foundation fragment.** `schema/index.ts` exports only `_shared`+`_registry`; no
   `schema/foundation/` and no `sync_queue` Drizzle object exist. DB-6 authors it (raw DDL, NOT synced, no
   `baseColumns`/`syncColumns` — ADR-002 §5.1). `[FACT: schema/index.ts; find schema/ → no foundation dir]`
4. **[GAP] Untested.** `db/tests/repository.test.ts` is a 0-line placeholder — no coverage on any business logic
   (§XIX requires 100% on logic). `[FACT: wc -l repository.test.ts = 0]`

**⚠ STRUCTURAL TENSION for the PLAN gate (not resolvable at baseline).** The existing repository **actively
encrypts** via `getVaultKey()`, but M1.0 has **no vault unlock** (that is M3 / UX-5b) and the delivery plan +
ADR-017 mandate DB-6 as a **pass-through seam** (encryption flips at M3). So the as-is repository's per-op
`getVaultKey()` cannot run against real data in M1.0. Reconciling "keep the encrypting seam dormant" vs "make it a
true pass-through until M3" is a Step-2/Step-3 (`/api-contract` + `/adr-check`) decision — flagged here, decided in
the plan. `[FACT: repository.ts:231; ADR-017; delivery-plan §5 DB-6 "encryption deferred M3"]`
</details>

## DB-7 — IMPLEMENTED (2026-07-29 · LIF-69)
The runner now bootstraps its own version store and offers a dev-reset. `[FACT: migrations/runner.ts; schema/foundation/app-state.ts]`
- **`app_state` infra table** — `schema/foundation/app-state.ts` (Drizzle mirror: `key TEXT PK · value TEXT NOT NULL`,
  carry-v1-shape per ADR-002 §5.0) + re-exported from `schema/index.ts`. Device-local, NOT synced (no
  `baseColumns`/`syncColumns`). It is the `schema_version` store (ADR-002 §9.1). `[FACT: schema/foundation/app-state.ts]`
- **`ensureInfra(driver)` bootstrap** — `migrate()` runs `CREATE TABLE IF NOT EXISTS app_state …` **before**
  `runMigrations`. `app_state` is the version store, so it can't be a versioned migration (chicken-and-egg); it is
  bootstrapped pre-loop. This closed a latent gap: `setSchemaVersion` INSERTs into `app_state` (adapter.ts:231) but no
  production migration created it, so `migrate()` threw `no such table: app_state` at real boot (`worker.ts:23`) —
  previously masked only by test fixtures. `[FACT: runner.ts; adapter.ts:231]`
- **`resetDev(adapter, config)`** — dev-only (`import.meta.env.DEV`-guarded, not barrel-exported): `destroy` → `open` →
  `migrate` from zero. Web OPFS/VFS round-trip is a Playwright follow-up (jsdom can't host the VFS, cf. LIF-103).
- **Runner engine UNCHANGED** — `runMigrations`/`getSchemaVersion`/`setSchemaVersion`/`Migration` type untouched;
  forward-only (no `down()`, diverges from ADR-002 §9.2 — inherited, rationale ADR-016:17). `[FACT: adapter.ts]`
- **Fixtures retired** — the 4 hand-created `app_state` fixtures removed; the real bootstrap now covers them.
- **Tested** — `db/tests/migrations-runner.test.ts` (6 cases: fresh bootstrap, idempotent ensureInfra, no-op re-run,
  failing-migration rollback, close/reopen persistence, resetDev rebuild). `@vida/core` 131/131 · `@vida/web` 6/6 · typecheck 10/10. `[FACT: vitest run]`

## AR-5/6/7 — substrate tables authored (topology fact · 2026-07-28…08-03)
The substrate framework sessions authored **15 substrate tables** into `schema/foundation/` (migrations 002–006). The
per-table SEMANTICS live in each substrate's own context (`docs/core/{sessions,spaces,capability,effects,economy}/current-*`);
recorded here only as the DB-layer topology fact so the schema-authoring baseline is accurate. `[FACT: schema/foundation/*.ts; migrations/00{2..6}_*.ts]`

| Module file | Tables | Migration | Source |
|-------------|--------|-----------|--------|
| `foundation/sessions.ts` | `sessions` · `session_type_registry` · `session_attachments` | 002 | AR-5 (ADR-004) |
| `foundation/spaces.ts` | `tags` · `entity_tags` · `entity_links` · `spaces` · `space_enabled_blocks` · `views` | 003 | AR-6 (ADR-006/007) |
| `foundation/effects.ts` | `applied_effects` | 004 | AR-7 (ADR-004 F1) |
| `foundation/capability.ts` | `capability_definitions` · `block_instances` · `capability_grants` | 005 | AR-7 (ADR-008/010) |
| `foundation/economy.ts` | `currencies` · `consequence_ledger` | 006 | AR-7 (ADR-012) |

Mapped to ADR-002 §5.20 Stream (i) ADD, **11 line-items are done** (the 4 satellites — `session_type_registry`,
`session_attachments`, `tags`, `entity_links` — are not distinct §5.20 rows). **DB-3 authors the 11 remaining ADD
tables** (`planned_blocks` · `templates` · `review_curves` · `method_bindings` · `review_events` · `values` ·
`contributions` · `purpose_reviews` · `plan_steps` · `store` · `rules`) + session sub-type extensions (decide author/defer)
+ column-level AMENDs (classify) + the RETIRE reconcile. `[FACT: docs/roadmap/schema-foundation-build-flow.md §3; ADR-002 §5.20]`

## DB-3 — IMPLEMENTED (2026-08-18 · LIF-65 · the Stream (i) substrate remainder)
The M1.0 schema foundation is complete: the 11 remaining ADR-002 §5.20 Stream (i) ADD tables are authored (migrations
007–011), so DB-4 (per-domain) and every M1.1+ module now build on a finished substrate. `[FACT: schema/foundation/{purpose,knowledge-review,scheduling,templates}.ts + economy.ts; migrations/00{7..11}_*.ts]`

| Migration | Module | Tables |
|-----------|--------|--------|
| `007_purpose.ts` | `foundation/purpose.ts` | `values` (quoted keyword) · `contributions` · `purpose_reviews` · `plan_steps` (ADR-011) |
| `008_knowledge_review.ts` | `foundation/knowledge-review.ts` | `review_curves` · `method_bindings` · `review_events` (ADR-005 generic review engine) |
| `009_economy_store_rules.ts` | `foundation/economy.ts` | `store` · `rules` (ADR-012 §3.5/§3.9) |
| `010_scheduling.ts` | `foundation/scheduling.ts` | `planned_blocks` (ADR-004 §3.1) |
| `011_templates.ts` | `foundation/templates.ts` | `templates` (ADR-009) |

- **All 11 syncable** (`...baseColumns`), all `[E]`-marked fields inert in M1.0 (pass-through, BR-DB6-3). Cross-domain
  refs are **plain TEXT, no FK** (target domains are DB-4) — the `entity_links.page_id` precedent.
- **Session sub-type extensions DEFERRED to DB-4** (ADR-004 §3.1 domain-ownership) — none authored here.
- **Column-level AMENDs owned elsewhere** (per-domain → DB-4; sync cols/HLC → DB-2/M4) — DB-3 owns 0 directly.
- **RETIRE set verified absent.** **`ENTITY_TYPES`** appended with the 11 new substrate types.
- Green: `@vida/core` **193 tests** (enum-parity 19 · runner applies all 11 migrations) · root typecheck 11/11.
- ⚠ **Post-impl fix:** `planned_blocks.sub_type` shipped with a hard CHECK, corrected to OPEN TEXT (SS-5/BR-6, mirrors
  `sessions.sub_type`) after the post-impl critique. `[FACT: db-3 P5]`

## DB-4 — IN PROGRESS (groups #1 Notes … #16 Check-ins + #17 Health: Core authored · 2026-08-20 · LIF-66)
The Stream (ii) per-domain modules authored so far (16 of 21 active; #13 Languages dissolved → Spaces, ADR-006). `[FACT: schema/{notes,preferences,tasks,projects,habits,routines,purposes,finance,skills,knowledge,books,learning,relationships,check-ins,health-core}.ts + foundation/{session-extensions,scheduling}.ts; migrations/012_notes.ts … 027_health_core.ts]`

| Migration | Module | Tables |
|-----------|--------|--------|
| `012_notes.ts` | `schema/notes.ts` | `pages` · `page_links` · `note_attachments` (ADR-002 §5.2) |
| `013_preferences.ts` | `schema/preferences.ts` | `user_preferences` · `nav_preferences` · `command_bar_history` (ADR-002 §5.17) |
| `014_sessions_scheduling.ts` | `foundation/session-extensions.ts` + `foundation/scheduling.ts` | `study_sessions` · `focus_sessions` · `study_availability` · `availability_exceptions` · `study_plan_batches` · `session_templates` (ADR-004 §3.1 · §5.11) |
| `015_tasks.ts` | `schema/tasks.ts` | `tasks` · `task_time_logs` (ADR-002 §5.3) |
| `016_projects.ts` | `schema/projects.ts` | `projects` · `milestones` · `deliverables` · `project_documents` (ADR-002 §5.4) |
| `017_habits.ts` | `schema/habits.ts` | `habits` · `habit_completions` · `project_habits` (ADR-002 §5.5) |
| `018_routines.ts` | `schema/routines.ts` | `routines` · `routine_step` · `routine_completions` (the REFRAME — supersedes the §5.6 POC) |
| `019_purposes.ts` | `schema/purposes.ts` | `purposes` · `targets` · `purpose_metrics` · `purpose_metric_values` · `target_reviews` · `dreams` (§5.7; DB-3 substrate excluded) |
| `020_finance.ts` | `schema/finance.ts` | `accounts` · `transactions` · `assets` · `liabilities` · `investments` · `income_streams` (§5.8) + `fiscal_residencies` · `legal_entities` · `fiscal_obligations` (§5.20 L3828) |
| `021_skills.ts` | `schema/skills.ts` | `skills` · `skill_levels` · `skill_activities` · `skill_actions` (Sessions `practice` sub-type) · `skill_dev_logs` · `skill_dependencies` · `skill_definitions` (§5.9 reshaped roster) |
| `022_knowledge.ts` | `schema/knowledge.ts` | `knowledge_objects` · `object_kinds` · `knowledge_containers` · `references` · `compound_sets` · `knowledge_lab_entries` · `flashcards` (§5.10 reshaped roster; `references` = quoted SQL keyword) |
| `023_books.ts` | `schema/books.ts` | `books` · `book_chapters` · `book_assets` · `book_bookmarks` · `book_highlights` · `book_quotes` · `reading_sessions` (Sessions `reading` sub-type) · `reading_plans` · `reading_plan_books` · `book_subjects` (§Books reshaped roster) |
| `024_learning_education.ts` | `schema/learning.ts` | `subjects` (=courses) · `ics_feed_configs` · `ics_synced_events` · `institutions` · `self_taught` · `programs` · `curricula` · `terms` · `class_sessions` (Sessions `class` sub-type) · `subject_schedules` · `grading_systems` · `grading_components` · `assessments` · `subject_documents` · `education_measurements` (§5.10/§5.18 reshaped + INTENDED hierarchy) |
| `025_relationships.ts` | `schema/relationships.ts` | `contacts` · `contact_events` · `interactions` · `contact_reminders` · `reminder_groups` · `reminder_group_contacts` (§5.9 reshaped) + `network_groups` · `network_group_contacts` (net-new networks, G2) |
| `026_check_ins.ts` | `schema/check-ins.ts` | `daily_check_ins` · `check_in_templates` · `check_in_template_questions` (§5.13; CK-2 composite UNIQUE + CK-3 type 3→6) |

- **Net-new = 3 tables only.** Tagging (`tags`/`entity_tags`) + typed refs (`entity_links`) were already authored by the
  AR-6 substrate (migration 003); N&P is a **consumer** (ADR-006 §3.1). `pomodoro_sessions` re-homed → `focus_sessions`
  (Sessions group #3); `page_tags` retired → `entity_tags`. `[FACT: spaces.ts; ADR-004 §3.1]`
- **All 3 syncable** (full `baseColumns` + `deleted_at`, N-R2/ADR-016 §3.4), `[E]` fields inert in M1.0 (pass-through).
  **No cross-table FK** (self-ref `parent_id` incl.) — the `entity_links.page_id` precedent (N-R1).
- `pages.type` FIXED CHECK (6, from `PAGE_TYPE`) — parity asserted (`enum-parity.test.ts`, `{pages,type,PAGE_TYPE}`);
  `pages.entity_type` OPEN, no CHECK (registry-validated, BR-N2). Partial UNIQUE `idx_pages_journal_unique` (NP-2).
- **`ENTITY_TYPES` unchanged** — `page`/`note`/`journal` already seeded; the module types pages reference arrive with
  their own DB-4 groups. **`@vida/types` row interfaces unchanged** (DB-4 authors the Drizzle mirror only — the DB-3
  precedent; `PageLink`/`NoteAttachment` stay `SyncMetadata`-based, the same divergence as `entity_links`/`EntityLink`,
  reconciled at DB-11). `[FACT: _registry.ts; note.ts:127]`
- Green: `@vida/core` **193 tests** (parity picks up `pages.type`; runner rebuilds to `LATEST_VERSION`=12) · root
  typecheck 11/11. **Foundation-readiness:** MOD-notes (#31) contract finds every needed column — PASS.
- **Group #2 Preferences (2026-08-19):** 3 tables, ALL plaintext (ZERO `[E]`, PR-1). 5 FIXED CHECK cols (theme/time_format/
  dock_position/dock_size/persona — parity asserted, +5 rows); `default_task_priority`/`font_size`/`notification_frequency`
  OPEN no-CHECK. **Build-phase intent authored, not deferred** (G4 6 cols · PB-2 `module_visibility` · E9 `user_profile`
  split → ADR-002 §5.17 amended + §5.20 ledger fulfilled). `command_bar_history` gains `created_at`/`updated_at` (P-R2);
  no `deleted_at`. `@vida/types` interfaces unchanged (DB-11 reconcile). E9 cross-group: Gamification's `user_profile`
  must omit the 4 routed fields + `check_in_streak*`. `[FACT: 013_preferences.ts; ADR-002 §5.17]`
- **Group #3 Sessions & Scheduling +Pomodoro (2026-08-19):** **6 tables** completing the Session framework on the
  AR-5/AR-7/DB-3 substrate. `focus_sessions` IS the `focus` timer runtime — `pomodoro_sessions` **RETIRED** into it
  (notes-and-pages reframe); `scheduled_study_sessions` DROPPED (→ `planned_blocks`); `session_effects` is not a table.
  Extensions (`study_sessions`/`focus_sessions`): own `id` PK + `session_id UNIQUE` (BR-DB-1; ADR-004 §3.1 "keyed by" =
  key col, not PK — preflight catch), spine never re-stored. **4 `[E]` fields** (batch/template `name`, template
  `description`, exception `reason`). 5 FIXED CHECK cols parity-asserted (+5 rows); `PRESET_BLOCK` reused (no `@vida/types`
  change), `STUDY_PLAN_BATCH_STATUS += 'failed'`. `ENTITY_TYPES += 'session'`. **Phase-5 DDL-introspection** test
  (`sessions-scheduling-introspection.test.ts`, 24 cases: column-set·nullability·PK·default × 6). `@vida/core` **221 tests**;
  `LATEST_VERSION`=14; typecheck 11/11. Cross-group: PD-7 global config → group #2 backfill. Interface reconcile
  (`PomodoroSession`/`StudyPlanBatch`/`StudySession`) → DB-11. **Foundation-readiness:** MOD-sessions (#139) finds every
  needed column — PASS. `[FACT: 014_sessions_scheduling.ts; docs/specs/foundation/db-4-sessions-and-scheduling/]`
- **Group #4 Tasks (2026-08-19):** **2 tables** (`tasks` · `task_time_logs`), the OS-wide task primitive + aggregator.
  2 `[E]` fields (`tasks.title`/`description`). **No-FK reconciliation:** §5.3's 5 parent FKs (`project_id`/`milestone_id`/
  `course_id`/`contact_id` + self-ref `parent_task_id`) + `task_time_logs.task_id` CASCADE → plain TEXT (cascade/set-null
  = app/sync layer, TK-4). **Build-phase INTENDED authored** (not deferred): `completed_at` (G5) · `scheduled_date` (G6) ·
  `kind` (**`TASK_KIND` net-new tuple** {standard,obligation}, G8) · `recurrence_rule` (RRULE, obligations, G8) ·
  `measurement_kind` NOT NULL DEFAULT 'milestone' + `binding_mode` **nullable, no default** (ADR-011 M1/M2 — gate-2 caught a
  manufactured `event-trigger` default; NULL ⇒ derive-natural, §3.2 override-slot) · `nesting_weight` INTEGER nullable
  (ADR-011 §3.3 M4, NULL ⇒ equal). **Boundary (substrate, not authored):** inline `tasks.tags` RETIRED → `entity_tags`
  (`entity_type='task'`); `task_views` RETIRED → shared `views` (AR-6); notes → `pages`; timer → `focus_sessions` (#3).
  **No stored progress column** (M3 derives). 6 FIXED CHECK cols parity-asserted (+6 rows: status/priority/difficulty/kind/
  measurement_kind/binding_mode — first live use of the 5 shared tuples). `task_time_logs` zero-`[E]`, no `deleted_at`
  (ledger). `ENTITY_TYPES += 'task'`. **Phase-5 DDL-introspection** (`tasks-introspection.test.ts`, 8 cases: column-set·
  nullability·PK·default × 2). `@vida/core` **240 tests** green (1 pre-existing encryption-1MB timeout flake, passes
  isolated); `LATEST_VERSION`=15; typecheck 11/11; lint 0-err. Interface reconcile (`Task` +7 cols −`tags`; `TaskTimeLog`
  +`updated_at`) → DB-11. **Foundation-readiness:** MOD-tasks finds every needed column — PASS. `[FACT: 015_tasks.ts;
  schema/tasks.ts; docs/specs/foundation/db-4-tasks/]`
- **Group #5 Projects (2026-08-19):** **4 tables** — `projects` · `milestones` · `deliverables` · `project_documents`,
  the four-level hierarchy (Project > Milestone > Deliverable > Task) + document vault. **11 `[E]` fields** (title/
  description/vision on projects; title/description on milestones + deliverables; name/encrypted_blob on
  project_documents). **No-FK reconciliation:** §5.4's project→milestone/document CASCADE + milestone SET-NULL +
  self-ref `parent_milestone_id` → plain TEXT (app/sync layer, PJ-9). **Build-phase INTENDED authored** (not deferred):
  the **`deliverables` table** (G2) — the ADR-011 pursuable carrying `measurement_kind` NOT NULL DEFAULT 'milestone' +
  `binding_mode` **nullable, no default** (M1/M2) + `nesting_weight` nullable (§3.3 M4). **`progress` reframed to a
  NULLABLE override slot** on projects/milestones/deliverables (was §5.4 `NOT NULL DEFAULT 0`; ADR-011 §3.2 — NULL ⇒
  derive via `progress()`). **Measurement pair scoped to `deliverables` ONLY** (its measure varies; projects/milestones
  are pure rollups with implicit 'milestone' — structure-data.md PJ-4 is the DB-4 roster, not the ADR-011 §3.4 broad
  list). **Boundary (partner-domain-owned, not authored here):** inline `projects.tags` RETIRED → `entity_tags`
  (`entity_type='project'`, PJ-12); `project_contacts` → Relationships; `project_habits` → Habits; `contributions`
  (retired `purpose_projects`) → Purpose/DB-3; project events / project↔account → integration seams. `project_documents`
  has `updated_at` but **no `deleted_at`** + `encrypted_blob` **nullable** BLOB + **no index** (faithful §5.4). 7 FIXED
  CHECK cols parity-asserted (+7 rows: projects.scope/complexity/status/priority · milestones.status ·
  deliverables.measurement_kind/binding_mode). `ENTITY_TYPES += 'project'/'milestone'/'deliverable'`. **Phase-5
  DDL-introspection** (`projects-introspection.test.ts`, 16 cases: column-set·nullability·PK·default × 4). `@vida/core`
  **264 tests** green; `LATEST_VERSION`=16; typecheck clean; eslint 0-err. **Zero build-decisions** (a gate-1 critic
  escalated the measurement-scope to Victor; re-grounded as doc-determined — the module doc is the roster). Interface
  reconcile (`Project` progress→nullable −`tags`; `Milestone` +`nesting_weight` progress→nullable; **new `Deliverable`**)
  → DB-11. **Foundation-readiness:** MOD-projects finds every needed column — PASS. `[FACT: 016_projects.ts;
  schema/projects.ts; docs/specs/foundation/db-4-projects/]`
- **Group #6 Habits (2026-08-19):** **3 tables** — `habits` · `habit_completions` · `project_habits` (the kept
  Projects↔Habits junction, deferred here from #5). **7 `[E]` fields** (habits name/description/unit/cue/reward +
  `success_criteria`; habit_completions `location`). **No-FK reconciliation:** §5.5's `habit_id` CASCADE +
  project_habits' 2 CASCADEs → plain TEXT (app/sync layer, HB-11). **Build-phase INTENDED authored:** measurability
  (HB-13) — `measurement_kind` NOT NULL DEFAULT **`'rate'`** (doc-licensed natural) + `binding_mode` **nullable, no
  default** (NULL⇒derive `event-trigger` — the Tasks-gate-2 override-slot grain, NOT a manufactured default); G8
  restored v1 fields — `success_criteria`[E]/`difficulty` on habits, `location`[E]/`completion_time` on completions.
  **No stored `progress`/`nesting_weight`** on habits (rate derives; ladders UP via `contributions`, HB-13).
  **`HABIT_DIFFICULTY` net-new tuple** {very_easy…very_hard} authored in `@vida/types` (TASK_KIND precedent). Streak
  cache (current/longest/total) = derived cache (HB-2). **Boundary:** inline `habits.tags` RETIRED → `entity_tags`
  (`ENTITY_TYPES += 'habit'`); `purpose_habits` retired → `contributions` (Purpose/DB-3); HB-8/HB-9 (contribute/XP) →
  ADR-004/012 services; HB-10 backfill window → Preferences. `habit_completions`: full baseColumns (+`updated_at`), NO
  `deleted_at` (ledger), `value` REAL (first REAL col in v2), ratings 1–5 range CHECK (not enum-parity), UNIQUE(habit_id,
  completed_date). `project_habits`: reconciled to the `entity_tags` junction shape — synthetic `id` PK (NOT §5.5's
  composite PK) + UNIQUE(project_id, habit_id). 7 FIXED CHECK cols parity-asserted (habit_type/frequency/time_of_day/
  domain/measurement_kind/binding_mode/difficulty). **Phase-5 DDL-introspection** (`habits-introspection.test.ts`, 12
  cases × 3 tables). `@vida/core` **283 tests** green; `LATEST_VERSION`=17; typecheck clean; eslint 0-err. **Zero
  build-decisions.** Interface reconcile (`Habit` +4 −`tags`; `HabitCompletion` +3; new `ProjectHabit`) → DB-11.
  **Foundation-readiness:** MOD-habits finds every needed column — PASS. `[FACT: 017_habits.ts; schema/habits.ts;
  docs/specs/foundation/db-4-habits/]`
- **Group #7 Routines (2026-08-19):** **3 tables** — the ORCHESTRATION REFRAME (`routines` · `routine_step` ·
  `routine_completions`), superseding the flat 2-table §5.6 POC (`routine_actions` retired → `routine_step`). The
  reframe **design landed** (`docs/intake/routines.md` §E 2026-07-14, RT-1…RT-19); only the DDL was deferred "→ build
  phase" = this session (shape-open, the store/rules pattern; [[check-intake-and-reruns-before-triaging-a-design-pass-undone]]).
  **6 `[E]`** (routines name/description; routine_step title/description; completion skip_reason). **No-FK:** routine_id/
  routine_step_id/entity_id plain TEXT (app-layer cascade, RT-17). `routines` (pursuable, RT-19): `measurement_kind` NN
  DEFAULT **`'rate'`** + `binding_mode` **nullable no-default** (NULL⇒derive derived-pull); `lifecycle` CHECK
  **ROUTINE_LIFECYCLE**{active,paused,off} (net-new); cadence = **`recurrence_rule` RRULE** (platform canon, RT-11
  Scheduler-consumed); `progress` nullable override slot, **no cached streak** (RT-14). `routine_step`: **`step_type`
  OPEN vocab (no CHECK** — user-extensible §E Q1, session sub_type precedent); polymorphic `entity_type`+`entity_id`
  (nullable, RT-4); `is_required`; `time_of_day` (ROUTINE_TIME_OF_DAY, nullable); `skip_dates` JSON. `routine_completions`:
  ledger (baseColumns +`updated_at`, no `deleted_at`), re-keyed to `routine_step_id`, UNIQUE(routine_step_id,
  completed_date). **Doc-decided BOUNDARIES (not authored):** completion/miss/acceptance policy → Preferences/Spaces;
  `routine_step_membership`/step-scoping → Spaces (design-pass, non-blocking); Scheduler; tags→`entity_tags`;
  purpose→`contributions`; XP→`consequence_ledger`. 4 FIXED CHECK cols parity-asserted (routines.lifecycle/measurement_kind/
  binding_mode + routine_step.time_of_day). `ENTITY_TYPES += 'routine'/'routine_step'`. **Phase-5 DDL-introspection**
  (`routines-introspection.test.ts`, 12 cases × 3). `@vida/core` **299 tests** green; `LATEST_VERSION`=18; typecheck
  clean; eslint 0-err. **Zero build-decisions** (⚠ two Victor corrections re-grounded the read: the reframe design landed,
  DDL is the build job — not an undone design-pass; the three "open" points were doc-closed). Interface reconcile → DB-11.
  **Foundation-readiness:** MOD-routines finds the sequence/step/ledger — PASS. `[FACT: 018_routines.ts; schema/routines.ts;
  docs/specs/foundation/db-4-routines/]`
- **Group #8 Purpose & Goals (2026-08-19):** **6 tables** — the CAPSTONE meaning-spine (`purposes` · `targets` ·
  `purpose_metrics` · `purpose_metric_values` · `target_reviews` · `dreams`); the §5.7 floor MINUS the 4 DB-3 substrate
  tables (`values`/`contributions`/`purpose_reviews`/`plan_steps`, consumed no-FK). **~19 `[E]`**. **No-FK:** all spine
  joints plain TEXT + **nullable** (SR-003 relaxed → standalone Values/Purposes/Targets/Dreams, PG-9). **ADR-011
  amendments:** `progress`/`current_value`/`progress_percentage` → **nullable** override slots (PG-4, no counters);
  `targets.target_type` → **`measurement_kind`** (NN DEFAULT 'quantitative') + `binding_mode` (nullable — the measurement
  pair on **`targets` ONLY**, [[module-doc-is-db4-roster-not-adr-broad-list]]: dreams/metrics/purposes lists omit it);
  restored fields (targets `success_criteria`[E]/`measurement_method`; metrics `is_higher_better`/`baseline_value`;
  metric_values `source`{manual,auto}+`context_notes`[E], PG-15); `purposes.value_id` (→ DB-3 `values`, PG-9). **`dreams`
  ABSORBS `bucket_list_items`** (PG-16 — category/status/priority/imagery/steps/project_id/location/completed_date;
  inline tags → `entity_tags`; `bucket_list_items` retired). **Ledgers** (`purpose_metric_values`/`target_reviews`) +
  `purpose_metrics` have no `deleted_at` (floor). 13 FIXED CHECK cols parity-asserted; **`METRIC_VALUE_SOURCE` net-new**,
  `FREQUENCY` reused for `review_frequency` (gate-1 F2). `ENTITY_TYPES += purpose/target/dream/purpose_metric_value`
  (`value` already present, DB-3). **Phase-5 DDL-introspection** (`purposes-introspection.test.ts`, 24 cases × 6).
  `@vida/core` **336 tests** green; `LATEST_VERSION`=19; typecheck clean; eslint 0-err. **Zero build-decisions.**
  Interface reconcile → DB-11. **Foundation-readiness:** MOD-purpose finds the spine + Dreams — PASS. `[FACT:
  019_purposes.ts; schema/purposes.ts; docs/specs/foundation/db-4-purposes-and-goals/]`
- **Group #9 Finance (+Fiscal & Legal) (2026-08-20):** **9 tables** — the 6 §5.8 finance entities (`accounts` ·
  `transactions` · `assets` · `liabilities` · `investments` · `income_streams`, authored fresh — they lived in the
  pre-rebuild monolith) + the 3 net-new Fiscal & Legal tables (`fiscal_residencies` · `legal_entities` ·
  `fiscal_obligations`, §5.20 L3828). Largest group so far. **No-FK:** within-domain refs (`transactions.account_id`
  CASCADE, `transfer_to`/`investments.account_id` SET NULL) + cross-domain (`legal_entities.project_id`,
  `fiscal_obligations.linked_task_id`, `owner_id`) → plain TEXT + indexes; §5.8 `REFERENCES` superseded (ADR-016 §3.4);
  cascade/orphan app-layer (FN-11). **Build-phase intent authored:** `accounts.opening_balance` (FN-3);
  `transactions.category_bidx` + `idx_transactions_category_bidx` (F7 P-side blind-index column; keyed-PRF derivation
  service-deferred); liabilities G9 ×4 (`payment_frequency`/`next_payment_date`/`interest_type`/`payoff_date`);
  `income_streams.next_payment_date`; `jurisdiction_code` on the 5 finance entities (FL-9). **Inline `transactions.tags`
  RETIRED** → `entity_tags` (FN-10/SP1 — no tags column). **13 FIXED CHECK cols** parity-asserted; **`INTEREST_TYPE` +
  `FISCAL_OWNER_TYPE` net-new** (`@vida/types` + Zod), `FREQUENCY` reused ×3 (`recurring_frequency`/`payment_frequency`/
  income `frequency`). **OPEN-vocab no-CHECK:** `currency`, all `jurisdiction_code`, `category_bidx`, and the fiscal
  `residency_type`/`entity_type`/`obligation_type`/`status` (per-jurisdiction, rule-pack-defined — conventions.md:32).
  Fiscal nullability = the `structure-data.md` roster `?`-notation (nullable = `fiscal_residencies.end_date`,
  `legal_entities.project_id`, `fiscal_obligations.linked_task_id`; all else NOT NULL). **OUT** (documented boundary):
  `import_staging`/`connection_config` (undecided ingestion ADR), `ai_connections` (ADR-015), budgeting/`liability_payments`/
  FX (design pass), `measurement_kind`/`binding_mode` (Finance is a Purpose feeder, C6), `store`/`rules` (DB-3),
  `move_money` (handler). `ENTITY_TYPES += account/transaction/asset/investment/liability` (income_stream + fiscal
  entities excluded — G12/conventions.md:26). **Phase-5 DDL-introspection** (`finance-introspection.test.ts`, 36 cases ×
  4). `@vida/core` **385 tests** green; `LATEST_VERSION`=20; typecheck 11/11; eslint 0-err. **Zero build-decisions.**
  Interface reconcile → DB-11 (Finance +opening_balance/category_bidx/jurisdiction_code/G9; new `FiscalResidency`/
  `LegalEntity`/`FiscalObligation`). **Foundation-readiness:** MOD-finance finds the 6 entities + net worth over the
  DB-3 `store` tree + fiscal spine — PASS. `[FACT: 020_finance.ts; schema/finance.ts; docs/specs/foundation/db-4-finance-and-fiscal-legal/]`
- **Group Skills (2026-08-20):** **7 tables** authored fresh (only `db/_legacy` had the old 2-table floor) — the
  reshaped `skills` capability + `skill_levels` · `skill_activities` · `skill_actions` · `skill_dev_logs` ·
  `skill_dependencies` · `skill_definitions`. The `structure-data.md` roster is authoritative; **ADR-002 §5.9 DDL is
  STALE** (`mastery_level NOT NULL DEFAULT 'novice'`, `practice_hours`, `proficiency_test_score`, `skill_resources`
  CHECK) — superseded. **Mastery DERIVED (BR-SK-1):** `current_level`/`progress` nullable derived slots +
  `mastery_override` nullable (M3); the §5.9 default anti-signal resolved out. **`skill_actions` = the Sessions
  `practice` sub-type (BR-SK-2):** own `id` PK + `session_id` UNIQUE (1:1, no FK; the group-#3 extension pattern);
  `SESSION_SUB_TYPE` already carries `'practice'`. **No FK anywhere** (self-ref + all parent/definition refs plain
  TEXT, BR-SK-3). **No stored `measurement_kind`** — Composer `measurement_config` is `[E]` JSON as plain `text()`
  (opaque blob, P-2); the pursuable's M1/M2 is Purpose-owned (BR-SK-4/C-M1). `components_tracked` = plain `json<T>`.
  **14 FIXED CHECK cols / 11 tuples** parity-asserted; **7 net-new enums** (`SKILL_LEVEL_STATUS`/`SKILL_ACTIVITY_TYPE`/
  `SKILL_FILL_SOURCE`/`SKILL_DEPENDENCY_TYPE`/`SKILL_DEPENDENCY_SCOPE`/`SKILL_DEFINITION_SOURCE`/`SKILL_SETUP_MODE` →
  `@vida/types/skill.ts` + Zod), reused `LIFE_DOMAIN`/`PRIORITY`/`FREQUENCY`/`MASTERY_LEVEL`. **OPEN no-CHECK:**
  `skills.status`/`ladder_template`, `skill_activities.difficulty`, `skill_levels.duration_target`,
  `skill_actions.best_time`, `skill_definitions.locale_variant`; rating INTs plain. **RETIRE `skill_resources`** →
  `entity_links` (AR-6 substrate, not authored). **`ENTITY_TYPES += skill/skill_level/skill_activity/skill_dev_log/
  skill_dependency/skill_definition`** — `skill_action` EXCLUDED (session sub-type → via base `session`, ADR-004 §3.1);
  the roster's stale "`skill` already reserved" corrected (skill was absent). **OUT** (documented boundary): the X*/AI*
  ingestion layer, `external_in_ok`/`external_out_ok` (ADR-010 grant fields), `ai_connections` (ADR-015),
  `import_staging` (ADR-014), `grant_currency` (Gamification), Purpose-target measurability. **Phase-5 introspection**
  (`skills-introspection.test.ts`, 28 cases × 4). `@vida/core` **426 tests** green; `LATEST_VERSION`=21; typecheck
  11/11; eslint 0-err. **Zero build-decisions.** Interface reconcile → DB-11 (new `Skill`/`SkillLevel`/`SkillActivity`/
  `SkillAction`/`SkillDevLog`/`SkillDependency`/`SkillDefinition`; the stale learning.ts `Skill` retired).
  `[FACT: 021_skills.ts; schema/skills.ts; docs/specs/foundation/db-4-skills/]`
- **Group #10 Knowledge (+flashcards) (2026-08-20):** **7 tables** — the largest, most-reframed group (the "Knowledge
  Universe"). `knowledge_objects` (generalizes `study_topics`; `parent_object_id` self-ref IS the Subject›Unit›Topic +
  user-kinds hierarchy, BR-KN-1) · `object_kinds` (user-extensible kind registry) · `knowledge_containers` (Module⊃Area⊃
  Subject) · `references` (first-class, replaces `resource_urls`; quoted SQL keyword) · `compound_sets` · `knowledge_lab_entries`
  · `flashcards` (content-only, ADR-005). **ADR-002 §5.10 DDL STALE** — `study_topics`/`topic_reviews`/`knowledge_notes`/
  `flashcard_decks`/`flashcard_reviews` superseded. **Mastery DERIVED** (`mastery_level` nullable, §5.10 `NOT NULL DEFAULT 0`
  resolved out, BR-KN-2); **SM-2 cols RETIRED** → the DB-3 review engine (`review_curves`/`method_bindings`/`review_events`,
  CONSUMED not re-authored, BR-KN-3); cross-module via `entity_links`, tags via `entity_tags`, notes via `pages` (BR-KN-4).
  **No-FK.** `knowledge_objects` carries the Knowledge-intrinsic `study_topics` survivors; **Education-plan/Books-context cols
  EXCLUDED** (`due_date`/`estimated_study`/`study_time`/`class_date`/`reading_pages` — KN-2 "Education plans, Knowledge holds",
  BR-KN-6). `flashcards` content-only (no `deck_id`/SM-2/`is_mastered`, BR-KN-7). `references.url` = **`[E]`** (ZK: replaces
  `resource_urls[E]`, KN-1). **4 FIXED CHECK cols = 4 tuples**: reused `STUDY_TOPIC_STATUS`/`TOPIC_DIFFICULTY`, net-new
  `KNOWLEDGE_CONTAINER_TYPE`/`CARD_TYPE`. OPEN no-CHECK: `object_kinds.name`/`learning_realm` (user-extensible KN-4),
  `references.type`, `compound_sets.consumer_module`. `ENTITY_TYPES += knowledge_object/knowledge_container/reference/flashcard`
  (object_kind/compound_set/knowledge_lab_entry excluded — non-targets). **OUT** (documented boundary): `study_methods` (ADR-008
  registry, not a table), `fts_knowledge` (DB-8), knowledge notes (`pages`), Education rollup/syllabus-as-calendar (KN-10), the
  compound-set AI-assist + OS automation surface ("not designed anywhere", business-rules L78-80). `compound_sets`/
  `knowledge_lab_entries` = base tables only. **Phase-5 introspection** (`knowledge-introspection.test.ts`, 28 cases × 4).
  `@vida/core` green; `LATEST_VERSION`=22; typecheck 11/11; eslint 0-err. **Zero build-decisions** (gate-1 REVISE→resolved:
  `references.url` [E], the sole ZK-regression catch). Interface reconcile → DB-11. `[FACT: 022_knowledge.ts; schema/knowledge.ts; docs/specs/foundation/db-4-knowledge/]`
- **Group #11 Books (2026-08-20):** **10 tables** — the 2nd-largest reframe (the reading Universe). `books`/`book_chapters`
  reshaped from the 2-table FACT floor + 8 net-new (`book_assets`, 3 annotations [`book_bookmarks`/`book_highlights`/
  `book_quotes`], `reading_sessions`, `reading_plans`, `reading_plan_books`, `book_subjects`). **ADR-002 §Books STALE.**
  **book = the WORK**, copies = `book_assets` (0..n, per-format `native_position`, BK-2). Unified progress DERIVED
  (`books.progress` nullable override, §Books `NOT NULL DEFAULT 0` resolved out, BR-BK-2); `current_page`→asset,
  `format`→asset, `genre`/`tags`→`entity_tags`. **`reading_sessions` = a `sessions` `reading` sub-type 1:1 extension**
  (own id PK + `session_id` UNIQUE, no FK; BK-10, S1 — `reading` ≠ `study`). **3 annotation natures** (BK-6: bookmarks+quotes
  take notes/links, highlights deliberately light). No-FK; the ONE doc-fixed UNIQUE = `book_chapters(book_id, chapter_number)`.
  **`deleted_at` on 8 of 10** — `book_chapters` (FACT floor omits + "no soft delete" + child) and `reading_sessions`
  (session extension — base `sessions` owns lifecycle) carry NONE (F1). **No `measurement_kind`/`binding_mode` on
  `reading_plans`** — the plan goal is a Purpose target (C-M1, the Skills pattern). **4 FIXED CHECK = 4 tuples**: reused
  `BOOK_STATUS` + net-new `BOOK_ASSET_FORMAT`/`READING_PLAN_ARRANGEMENT`/`READING_PLAN_GOAL_TYPE`; `books.rating` numeric
  BETWEEN. `BOOK_FORMAT` now stale → DB-11. `ENTITY_TYPES += book/book_chapter/book_bookmark/book_quote` (book_highlight
  excluded BK-6, reading_session excluded sub-type). **OUT**: cross-format mapping (BK-4 design pass), conflict state (BK-8
  Preferences+derived), ISBN/OCR/TTS X*/AI* service, Education pacing, quote-embed block, photos (note_attachments). **Phase-5
  introspection** (`books-introspection.test.ts`, 40 cases × 4). `@vida/core` **503 tests** green; `LATEST_VERSION`=23;
  typecheck 11/11; eslint 0. **Zero build-decisions** (gate-1 REVISE→resolved: the `deleted_at`-on-extension audit — see below).
  Interface reconcile → DB-11. `[FACT: 023_books.ts; schema/books.ts; docs/specs/foundation/db-4-books/]`
- **⚠ Cross-group fix (2026-08-20 `deleted_at` audit):** `skill_actions` (Skills group) wrongly carried `deleted_at` — a
  session sub-type extension must not (base `sessions` owns lifecycle; the `study_sessions`/`focus_sessions` precedent).
  REMOVED from `skills.ts` + `021_skills.ts`. Audit of all authored groups found this the sole instance; no table violates
  an explicit "no soft delete" doc signal. `[FACT: skills.ts skillActions; 021_skills.ts]`
- **Group #12 Learning/Education (+ICS) (2026-08-20):** **15 tables** — THE Learning hub, the heaviest group. 3 FACT-floor
  reshaped (`subjects` [=`courses`], `ics_feed_configs`, `ics_synced_events`) + 12 net-new INTENDED (the 8-level academic
  hierarchy + grading builder + measurement). **ADR-002 §5.10/§5.18 STALE**; net-new domain (nothing was on disk). Two R6
  reframes: inline `courses.tags`→`entity_tags` (SP1); `courses.progress NOT NULL DEFAULT 0`→nullable override (M3). Hierarchy
  (ED-2/H2): `institutions` + `self_taught` (SEPARATE) → `programs` (parent_type+id) → `curricula` (`forked_from_id` lineage,
  ED-11) → `terms` (hierarchical `level`+`parent_term_id`, ED-12) → `subjects` (+`curriculum_id`/`term_id`/`degree_tier`, ED-3/A1).
  **`class_sessions` = a `sessions` `class` sub-type 1:1 extension** (own id PK + `session_id` UNIQUE, no FK, **no `deleted_at`**;
  the study/focus/reading/practice precedent). `subject_schedules` = one per subject (`UNIQUE(subject_id)`, ED-5); `class_sessions`
  ARE the schedule content. **Grading builder** (ED-7): `grading_systems` (scope+scale) + `grading_components` (weighted template
  {type,weight,points}) + `assessments` (type/date/weight/modality/score + `source` AI6). **`education_measurements`** =
  Education-forged measure entity (ED-10, separate storage from Projects): `measurement_kind` (M1, **notNull no-default** —
  dedicated entity, caller-supplied, deliberately diverges from `deliverables`' 'milestone' default) × `binding_mode` (M2,
  nullable no-default ⇒ derive) × `progress` (M3 nullable override). `subject_documents` = the per-subject vault (ED-13, the
  `project_documents`/PJ-8 pattern — baseColumns only, **no `deleted_at`**, nullable BLOB + R2 ref). **No-FK** everywhere.
  **`deleted_at` on 11 of 15** — `ics_feed_configs`/`ics_synced_events` (FACT interfaces omit; X8 add-only "never delete" /
  X9 revoke=`is_active`), `class_sessions` (session extension), `subject_documents` (PJ-8) omit it. **15 FIXED CHECK cols**:
  reused `COURSE_TYPE`/`COURSE_STATUS`/`MEASUREMENT_KIND`/`BINDING_MODE` + **11 net-new tuples** (`DEGREE_TIER`·`TERM_LEVEL`·
  `PROGRAM_PARENT_TYPE`·`SCHEDULE_SOURCE`·`GRADING_SCOPE`·`GRADING_SCALE_TYPE`·`GRADING_COMPONENT_TYPE`·`ASSESSMENT_TYPE`·
  `ASSESSMENT_MODALITY`·`MEASUREMENT_REF_TYPE`·`RECORD_SOURCE`). OPEN no-CHECK: `subject_documents.doc_type`; `subjects.rating`
  numeric BETWEEN. `ENTITY_TYPES += subject/institution/program/curriculum/term/assessment/subject_document` (7; `class_session`
  excluded — sub-type via base `session`). **OUT** (owned elsewhere / undesigned): homework = **Tasks-owned** (C-HW, no local
  table); AI document-extraction pipeline (`source=ai` col authored, the service is ADR-014/015); grade/GPA/measurement
  *computation* = runtime service (M1.1+); base `sessions` spine (ADR-004); entity_tags/links (AR-6); E2/grant (C-E2); AI4
  agent (C-AI4); M5 seam (C-M5); My-Week/cross-subject/GPA-report views. **Phase-5 introspection**
  (`learning-education-introspection.test.ts`, 60 cases × 4). `@vida/core` **578 tests** green; `LATEST_VERSION`=24; typecheck
  11/11; eslint 0. **Zero build-decisions** — the `(design pass)` labels are build-phase forward-pointers, resolved WHOLE by
  the intake §Resolution (a Victor drift-catch corrected an author-vs-defer framing at P1). Interface reconcile (Course→Subject,
  `default_course_id`→`default_subject_id`, stale COURSE progress/tags) → DB-11.
  `[FACT: 024_learning_education.ts; schema/learning.ts; docs/specs/foundation/db-4-learning-education/]`
- **Group #14 Relationships (CRM) (2026-08-20):** **8 tables** — the PII-heaviest module (personal CRM). 6 §5.9 tables
  authored fresh (absent from the new `schema/`; lived in the pre-rebuild monolith) + **2 net-new networks** (`network_groups`
  + `network_group_contacts`, G2/RL-4 — a contact in MANY networks). **Build-phase INTENDED authored** (intake §Resolution
  WHOLE): inline `contacts.tags` RETIRED → `entity_tags` (G10/SP1); `contacts.how_we_met`[E] + `closeness_tier` (G4, OPEN
  no-CHECK — Preferences-defined vocab, `contact.md:31`); `interactions.energy_given`/`energy_received` (INT plaintext, the
  `sentiment`/`duration` precedent) + `key_takeaways`[E] (G8); `contact_reminders.is_snoozed`/`snoozed_until`/`priority`
  (reuse `PRIORITY`, G8); `reminder_groups.anchor_type`/`anchor_days_before` (event-anchored mode, G11 — net-new
  `REMINDER_GROUP_ANCHOR` = `{schedule,birthday}`). `social_links` KEPT as typed JSON (C4). **`deleted_at` on `contacts`
  ONLY** — the §5.9 floor + the `habit_completions`/`routine_completions` ledger precedent (children/ledgers/groups cascade
  or use `is_active`; `interactions` = the ledger, RL-3). **Junctions reshaped to the entity_tags-v2 shape** (synthetic `id`
  PK + `baseColumns` + `UNIQUE(pair)` + reverse index — `project_habits`:29-30, NOT §5.9's composite PK; a preflight catch
  F1). **No-FK** everywhere (contact_id ×5 / reminder_group_id / network_group_id plain TEXT; cascade = app-layer RL-2). **9
  FIXED CHECK cols** (`RELATIONSHIP_TYPE`·`FREQUENCY`×3·`CONTACT_EVENT_TYPE`·`INTERACTION_TYPE`·`SENTIMENT`·`PRIORITY`·net-new
  `REMINDER_GROUP_ANCHOR`); `closeness_tier` OPEN no-CHECK. `ENTITY_TYPES += contact/network` (2; child/junction tables
  excluded — the `habit_completions` precedent). **No M\*** (C1 — health is a derived, closeness-weighted analytic, contacts
  are ADR-011-excluded reference data); **no E2/grant** (C2, Gamification streak stays `[INTENT]`). **OUT** (cite-not-author):
  notification delivery (N1/N2, Notifications-owned — no delivery cols); device import (X1/X8, ADR-014 service — no
  `import_staging`); health-compute/closeness-banding; Sigma.js graph. **Phase-5 introspection**
  (`relationships-introspection.test.ts`, 32 cases × 4). `@vida/core` **619 tests** green (1 pre-existing vault-1MB perf flake,
  passes standalone); `LATEST_VERSION`=25; typecheck 11/11; eslint 0. **Zero build-decisions.** Interface reconcile (Contact
  +how_we_met/closeness_tier −tags · Interaction +energy/key_takeaways · ContactReminder +snooze/priority · ReminderGroup
  +anchor · new NetworkGroup/NetworkGroupContact) → DB-11.
  `[FACT: 025_relationships.ts; schema/relationships.ts; docs/specs/foundation/db-4-relationships/]`
- **Group #16 Check-ins (2026-08-20):** **3 tables** — the lightest group (structured daily-reflection + a template
  form-builder), the lone non-ingest unit. `daily_check_ins` + `check_in_templates` (baseColumns) + `check_in_template_questions`
  (**`id` + `syncColumns`, NO `created_at`/`updated_at`** — the §5.13 floor omits them + the interface `extends SyncMetadata`).
  **No `deleted_at` on ANY** — a documented FACT (§5.13 DDL + the P/E table omit it on all 3 while every neighbor lists it;
  CK-10 = hard-delete lifecycle). Build-phase fixes (intake §Resolution WHOLE): **CK-2** `daily_check_ins` uniqueness
  `UNIQUE(check_in_date)` → **`UNIQUE(check_in_date, check_in_type)`** (the bug fix); **CK-3** `check_in_type` **3→6**
  (`+afternoon/monthly_review/yearly_review` — amended the EXISTING `CHECK_IN_TYPE` tuple in `@vida/types/entities/user.ts`,
  the sole types-layer edit). No-FK (`template_id` ×2 plain TEXT, SET-NULL/CASCADE app-layer). **4 FIXED CHECK cols** — all
  the module's OWN existing tuples (`CHECK_IN_TYPE`/`CHECK_IN_SCHEDULE_TYPE`/`CHECK_IN_PREFERRED_TIME`/`CHECK_IN_QUESTION_FIELD_TYPE`,
  colocated in `entities/user.ts` since `check_in_streak*` historically lived on `user_profile`) — a **gate-1 catch**: the
  enums + interfaces + validators already existed → **reconcile-and-extend, NOT net-new** (a new `check-in.ts` would have
  double-exported). `mood_score`/`energy_level` = numeric `BETWEEN 1 AND 10` (not tuple-sourced). `ENTITY_TYPES += daily_check_in`
  (pages/entity_links target, G10; already in `note.ts` `ENTITY_LINK_TARGET`; **no tags** — SP1 opt-out). **OUT** (cite-not-author):
  E9 `check_in_streak*` = DERIVED from `daily_check_ins` (no column; the `user_profile` removal is Gamification #21's edit) ·
  E2 `grant_currency(XP)` = Gamification-owned (no economy col) · G7 review aggregation = integration + optional `entity_links`
  (no column) · reminders = Preferences/Notifications. No M\* (C-M). **Phase-5 introspection**
  (`check-ins-introspection.test.ts`, 12 cases × 4). `@vida/core` **635 tests** green; `LATEST_VERSION`=26; typecheck 11/11;
  eslint 0. Gates: gate-1 **REVISE**→resolved (the net-new-types miss) · preflight PASSED · gate-2 SHIP · post-impl SHIP.
  **Zero build-decisions.** Interface reconcile (`DailyCheckIn`/`CheckInTemplate`/`CheckInTemplateQuestion` vs the mirror; the
  `CHECK_IN_TYPE` expansion flows through automatically) → DB-11. `[FACT: 026_check_ins.ts; schema/check-ins.ts; docs/specs/foundation/db-4-check-ins/]`
- **Group #17 Health: Core (2026-08-20):** **12 tables** — the shared Health spine (Metrics + Monitoring · Goals ·
  Adaptation · Physical Roles · Safety & Medical). Recovered domain, **no v2 schema** → all net-new ADR-002 additions, but
  the `structure-data.md` roster (from the AUTHORITATIVE 18-DB Notion design) IS the documented per-table floor. `health_metrics`·
  `health_metric_values`·`health_domains`·`health_factors`·`health_exams`·`assigned_exams`·`health_goals`·`physical_roles`·
  `health_experiments`·`health_responses`·`medical_profile_entries`·`safety_flags`. **`deleted_at` on `health_goals` ONLY** (the
  floor L45; the other 11 omit it — entities via `status`/`end_date`/`phase`, 4 ledgers append). Goal `type` **DECOMPOSED** →
  `measurement_kind` (REUSE `MEASUREMENT_KIND`) × `binding_mode` (REUSE `BINDING_MODE`, nullable no-default) × subject FK (ADR-011
  M1/M2); `progress`/`mastery` = nullable REAL `NULL⇒derive` slots (M3). **18 FIXED CHECK** (14 net-new `health.ts` tuples + 4
  reused) + OPEN vocabs no-CHECK (modality/experiment-type/exam-kind/category/body_part/response-scales/severity/medical-status/
  winner). No-FK; `photo_blob` = `blob(buffer)` [E]; `source` incl. `ai` (AI6). **C1/C2/C3 guards** held (modality/taxonomy kept;
  no economy). X*/AI*/M4/M5 = cite-not-author (only provenance columns). `ENTITY_TYPES += 11` (OPEN SP2; pillar types are #18/#19's).
  **Phase-5 introspection** (`health-core-introspection.test.ts`, 12 × 4 + deleted_at-floor guard = 49). `@vida/core` **702 tests**
  green; `LATEST_VERSION`=27; typecheck 11/11; eslint 0. Gates: gate-1 **REVISE**→resolved (deleted_at floor — Victor drift-catch
  on a critique's false "no floor" premise) · preflight PASSED (10 folds) · gate-2 SHIP (3 folds) · post-impl SHIP. **Zero
  build-decisions.** Interface reconcile (12 Health row interfaces + 14 enums) → DB-11. Nutrition #18 / Training #19 = separate
  groups. `[FACT: 027_health_core.ts; schema/health-core.ts; packages/types/src/health.ts; docs/specs/foundation/db-4-health-core/]`
- **Remaining DB-4 groups:** #18 Nutrition · #19 Training · #20 · #21 · #22 (5 more; #13 Languages dissolved → Spaces, ADR-006; #15 Finance done at v20).

## Downstream (INTENT — owned by later issues)
DB-2 sync cols/HLC · DB-4 per-domain tables (**groups #1–#12 + #14 + #16 + #17 ✅ (16 of 21 active); 5 groups remain**) · DB-5 encryption wiring ·
monolith retirement · DB-8 FTS5 (`fts_pages`) · DB-11 reconcile ADR-002 §5/§7/§8 (+ the `@vida/types` row-interface
staleness). **DB-3 ✅ + DB-6 ✅ + DB-7 ✅ + the AR-5/6/7 substrate ✅ done → the M1.0 substrate foundation is complete;
DB-4 per-domain authoring is in progress.** DB-7 unblocks db-10 (seed) with db-6/db-9.
