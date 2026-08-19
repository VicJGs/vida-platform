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

## DB-4 — IN PROGRESS (groups #1 Notes + #2 Preferences + #3 Sessions & Scheduling + #4 Tasks + #5 Projects + #6 Habits authored · 2026-08-19 · LIF-66)
The Stream (ii) per-domain modules authored so far (6 of 22). `[FACT: schema/{notes,preferences,tasks,projects,habits}.ts + foundation/{session-extensions,scheduling}.ts; migrations/012_notes.ts … 017_habits.ts]`

| Migration | Module | Tables |
|-----------|--------|--------|
| `012_notes.ts` | `schema/notes.ts` | `pages` · `page_links` · `note_attachments` (ADR-002 §5.2) |
| `013_preferences.ts` | `schema/preferences.ts` | `user_preferences` · `nav_preferences` · `command_bar_history` (ADR-002 §5.17) |
| `014_sessions_scheduling.ts` | `foundation/session-extensions.ts` + `foundation/scheduling.ts` | `study_sessions` · `focus_sessions` · `study_availability` · `availability_exceptions` · `study_plan_batches` · `session_templates` (ADR-004 §3.1 · §5.11) |
| `015_tasks.ts` | `schema/tasks.ts` | `tasks` · `task_time_logs` (ADR-002 §5.3) |
| `016_projects.ts` | `schema/projects.ts` | `projects` · `milestones` · `deliverables` · `project_documents` (ADR-002 §5.4) |
| `017_habits.ts` | `schema/habits.ts` | `habits` · `habit_completions` · `project_habits` (ADR-002 §5.5) |

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
- **Remaining DB-4 groups:** #7 Routines … #22 Notifications (16 more domain groups, per the task P0 slice).

## Downstream (INTENT — owned by later issues)
DB-2 sync cols/HLC · DB-4 per-domain tables (**groups #1 Notes + #2 Preferences + #3 Sessions + #4 Tasks + #5 Projects + #6 Habits ✅; 16 groups remain**) · DB-5 encryption wiring ·
monolith retirement · DB-8 FTS5 (`fts_pages`) · DB-11 reconcile ADR-002 §5/§7/§8 (+ the `@vida/types` row-interface
staleness). **DB-3 ✅ + DB-6 ✅ + DB-7 ✅ + the AR-5/6/7 substrate ✅ done → the M1.0 substrate foundation is complete;
DB-4 per-domain authoring is in progress.** DB-7 unblocks db-10 (seed) with db-6/db-9.
