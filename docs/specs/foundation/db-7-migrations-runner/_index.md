# Spec: component:db-7-migrations-runner

<!-- type ∈ component | feature | bug | hotfix | refactor | script | workflow -->

Status: implemented <!-- draft → approved → implemented -->
Source-repo: /Users/victor/Documents/CODE/vida-platform
No-Guessing: every claim below is labeled [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].
Sessions: list the session slug(s) that created/changed this spec in §7.

<!--
  FORWARD spec — written BEFORE the thing is built. §1–§4 = DESCRIPTION; §5 = executable PROMPT citing §1–§4.
  This is a STUB (home + §1 seed only). §2–§5 are written for real at the PLAN step (/documentation-component),
  built on the document-context BASELINE of `database-layer` (§XXVI.1a). Governed by the No-Guessing Principle.
-->

## 1. Identity

The **migrations runner** for the local SQLite store: forward-only migrations, a schema-version store,
and a dev-reset path, so the dogfood vault evolves its schema without data loss during Phase 1.
[FACT: .claude/tasks/db-7-migrations-runner.md Goal; docs/roadmap/m1.0-delivery-plan.md §5 row DB-7 / LIF-69]

- **Also authors** the `app_state` infra table — the key/value store holding `schema_version` (read/written by
  `getSchemaVersion`/`setSchemaVersion`). DDL = ADR-002 §5.0 `(key TEXT PRIMARY KEY, value TEXT NOT NULL)`;
  schema_version-in-app_state = ADR-002 §9.1. Carry the v1 shape; device-local/not synced. Home resolved in BR-7.
  [FACT: ADR-002 §5.0/§9.1; storage-build-plan.md:38; v1 shape at db/_legacy/001_initial.v1.ts:49-52]
- Migrations authored **per-feature**, hand-written SQL, Drizzle = query-only mirror (no drizzle-kit). [FACT: ADR-016 §3.2/§3.5; ADR-017 §1; ADR-018 §3.5 keeps the runner seam, repopulated per-feature]
- **What it is NOT:** not a schema author for domain tables (those stream in per-feature, DB-3/DB-4); not a
  sync component; not drizzle-kit. [FACT: ADR-016 §3.2]

## 2. Business Rules

- **BR-1 — `app_state` DDL carries the v1 shape.** `CREATE TABLE app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`.
  [FACT: ADR-002 §5.0; identical v1 shape at db/_legacy/001_initial.v1.ts:49-52]
- **BR-2 — `app_state` is device-local, NOT synced.** No `baseColumns`/`syncColumns` (mirrors `sync_queue`'s infra
  treatment). [FACT: ADR-002 §5.0 "Device-Local, Not Synced"; storage-build-plan.md:38]
- **BR-3 — schema_version lives in `app_state`.** Key `'schema_version'`, value = stringified integer; read by
  `getSchemaVersion`, written by `setSchemaVersion`. [FACT: ADR-002 §9.1; adapter.ts:210-234]
- **BR-4 — `app_state` is bootstrapped BEFORE the versioned migration loop, not as a versioned migration.** It is the
  version store itself, so it cannot be version-gated (the runner reads the version from it before applying anything).
  Creation is idempotent (`CREATE TABLE IF NOT EXISTS`). [INTERP: forced by ADR-002 §9.1 + the runMigrations
  read-version-first contract at adapter.ts:248] — this **bootstrap-vs-versioned asymmetry** with `sync_queue`
  (versioned migration 001) is mechanical/forced. (The directory _home_ is a separate, discretionary call — BR-7.)
- **BR-5 — this closes a real code-vs-doc gap (fail-loud at real boot).** `getSchemaVersion` swallows the missing table
  and returns 0 (adapter.ts:210-221, try/catch) — so the _read_ never throws. The failure is the first
  `setSchemaVersion` **INSIDE the migration loop**: after applying migration 001 it runs `INSERT OR REPLACE INTO
app_state` (adapter.ts:231) against a table nothing created → throws `no such table: app_state`. The real caller is
  `apps/web/src/db/worker.ts:23` (`migrate(driver)` at web boot; its "registry is empty → no-op" comment is stale — the
  registry now holds 001/002/003). Masked today only because **four** test files hand-create `app_state`.
  [FACT: adapter.ts:210-234; worker.ts:23; CREATE TABLE app_state grep → the 4 fixtures at
  `foundation/sessions/__tests__/registry.test.ts:31` · `foundation/spaces/__tests__/spaces.test.ts:31` ·
  `db/tests/repository.test.ts:33` (@vida/core) + **`apps/web/src/db/web-adapter.test.ts:135`** (@vida/web) + _legacy]
- **BR-6 — forward-only, transactional, atomic (PRESERVED).** `runMigrations` applies only `version > current`, sorted
  ascending, each inside `BEGIN/COMMIT`; failure → `ROLLBACK` + version unchanged; up-to-date ⇒ `applied:0` no-op.
  db-7 must not regress this. **Disclosed divergence:** ADR-002 §9.2 (line 4003) specifies each migration exports
  `up(db)` **and `down(db)`**; the live `Migration` type (adapter.ts:40-44) has **no `down`** — the runner is
  forward-only. db-7 preserves forward-only (rationale: ADR-016:17 — local-first, no deployed data → zero migration
  cost, rebuild-not-rollback). This is a pre-existing code-vs-ADR-002-§9.2 divergence db-7 inherits, not introduces;
  named here so it is not silent. [FACT: adapter.ts:40-44,244-273; ADR-002 §9.2; ADR-016:17]
- **BR-7 — dual-authoring + home (a decided doc-vs-code drift, not silent).** `app_state` is authored on two
  coordinated surfaces — a Drizzle query-mirror + hand-written SQL DDL, kept in parity; no drizzle-kit (ADR-016 §3.2).
  **Home = `schema/foundation/app-state.ts`**, matching the ENACTED live precedent: DB-6 built `sync_queue` at
  `schema/foundation/sync-queue.ts` (not the build-plan's `schema/infra.ts` — no `schema/infra.ts` exists in the tree).
  The build-plan ledger (storage-build-plan.md:38-39) still says `schema/infra.ts` for BOTH infra tables and is
  therefore stale; **db-7 amends those two ledger rows to `schema/foundation/`** (see §4) so the master plan stops
  lagging the code. [FACT: ADR-016 §3.2; current-spec.md:71 = sync_queue's foundation home; storage-build-plan.md:38-39]
- **BR-8 — dev-reset is dev-only, built on `destroy()`.** A reset path deletes the local DB **file** via the adapter's
  `destroy(dbName)` primitive (adapter.ts:128-131), then re-`open`s and re-`migrate`s from zero. On web this must
  round-trip the OPFS/VFS re-open path (`exists`/`destroy` are VFS-directory-scoped, current-spec.md:64; web impl at
  web-adapter.ts:85) — validated on the web adapter (the only M1.0 platform). Guarded: exported only for dev (not from
  the package barrel / gated behind `import.meta.env.DEV`), never reachable from a production flow.
  [FACT: adapter.ts:128-131 (interface); web-adapter.ts:85 (impl); current-spec.md:64; §1 Goal]
- **BR-9 — retire the fixtures (a constraint tightening, not a neutral delete).** Once the real bootstrap creates
  `app_state`, remove the hand-created `CREATE_APP_STATE` in ALL **four** test files (three in @vida/core + `@vida/web`
  web-adapter.test.ts:135); leaving any masks a regression of BR-4/BR-5. Note: the fixtures use `value TEXT`
  (nullable); the real DDL is `value TEXT NOT NULL` (BR-1) — retiring them runs those suites against the stricter
  column. Benign for `schema_version` (always a non-null string) but it IS a semantic tightening, flagged. [FACT: the 4 test files]

## 3. Contract

- **`schema/foundation/app-state.ts`** — Drizzle mirror: `appState = sqliteTable('app_state', { key: text('key').primaryKey(), value: text('value').notNull() })`. Not synced (BR-2). Re-export from `schema/index.ts` barrel, mirroring `sync-queue.ts`. [satisfies BR-1/BR-2/BR-7]
- **Infra bootstrap** — an idempotent `ensureInfra(driver)` exported from `runner.ts`, issuing `CREATE TABLE IF NOT
EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`, invoked at the **start of `migrate()`** before
  `runMigrations`. Sufficiency: the only write path to `app_state` is `setSchemaVersion`, which runs only inside
  `runMigrations` (after `ensureInfra`); bare `getSchemaVersion` reads are already missing-table-safe (returns 0), so no
  other entry point needs the bootstrap. [satisfies BR-4/BR-5; FACT: getSchemaVersion/setSchemaVersion callers = index.ts barrel + migrate() only]
- **`runner.ts`** — `migrate(driver)` becomes `ensureInfra(driver)` → `runMigrations(driver, ALL_MIGRATIONS)` (existing
  registry unchanged: 001 sync_queue · 002 sessions · 003 spaces). `currentVersion`/`needsMigration`/`LATEST_VERSION`/
  `listMigrations` unchanged. [satisfies BR-6]
- **Dev-reset** — `resetDev(adapter: DatabaseAdapter, config: DatabaseConfig): Promise<{ applied: number; currentVersion: number }>`
  (dev-only): `adapter.destroy(config.dbName)` → `adapter.open(config)` → `migrate(driver)`, returning the migrate result.
  Takes the full `DatabaseConfig` (not just `dbName`) because `open` requires it (adapter.ts:107). Guard = BOTH: not
  re-exported from the `@vida/core` barrel (`index.ts`) AND the body no-ops/throws unless `import.meta.env.DEV`. [satisfies BR-8]
- **Unchanged** — the `Migration` type, `getSchemaVersion`/`setSchemaVersion`, and the runner's transactional loop are
  NOT modified (they already target `app_state`; db-7 makes the table they assume real). [FACT: adapter.ts]
- **Error cases** — `ensureInfra` idempotent (no-op if table exists); migration failure throws `Error("Migration <v> (<name>) failed: …")` (existing, adapter.ts:264-268).

## 4. Acceptance

Testable Definition of Done — automated Node contract tests use a real driver and do **NOT** pre-create `app_state`:

- [ ] On a fresh DB, `migrate(driver)` creates `app_state` and persists `schema_version = LATEST_VERSION` — **without any fixture creating `app_state`** (proves BR-4/BR-5, the `worker.ts:23` boot path). [BR-4, BR-5]
- [ ] `getSchemaVersion` returns the persisted version across a close/reopen (version survives). [BR-3]
- [ ] Re-running `migrate()` when up-to-date is a no-op (`applied: 0`). [BR-6]
- [ ] A deliberately failing migration rolls back and leaves `schema_version` unchanged. [BR-6]
- [ ] `resetDev` drops + rebuilds to `LATEST_VERSION` with a clean schema, incl. the web OPFS/VFS re-open round-trip. [BR-8]
- [ ] All **four** `CREATE_APP_STATE` fixtures removed (3× @vida/core + web-adapter.test.ts:135); **both** `@vida/core` AND `@vida/web` suites still pass against the real bootstrap. [BR-9]
- [ ] `app_state` has no `baseColumns`/`syncColumns`. [BR-2]
- [ ] `pnpm typecheck` 10/10; `@vida/core` + `@vida/web` suites green.

Guard + review gates (not automatable — explicit reviewer checks, per [[gate-catches-aligned-by-omission]] don't-silently-skip):

- [ ] **Review:** `resetDev` is NOT exported from the package barrel (`index.ts`) and/or is gated behind `import.meta.env.DEV`. [BR-8]
- [ ] **Review:** `schema/foundation/app-state.ts` column set is byte-parity with the bootstrap DDL. [BR-7]

Doc-currency (ship WITH the code — §XXIX):

- [ ] Amend `storage-build-plan.md:38-39` — both infra rows `schema/infra.ts` → `schema/foundation/` (ledger stops lagging code). [BR-7]
- [ ] Refresh the stale line in `packages/core/src/db/CLAUDE.md` ("registry is empty until per-feature migrations") — registry now holds 001/002/003 + the app_state bootstrap. [§XXIX]
- [ ] Refresh `database-layer/current-{spec,business-rules}.md` for the app_state bootstrap + dev-reset. [§XXIX]

## 5. Implementation Prompt

Ordered build sequence. Each step cites the §2/§3 rule it satisfies; nothing invented here. Done-check = §4.

1. **`packages/core/src/db/schema/foundation/app-state.ts`** — author the Drizzle query-mirror:
   `export const appState = sqliteTable('app_state', { key: text('key').primaryKey(), value: text('value').notNull() })`.
   No `baseColumns`/`syncColumns`. Re-export it from `schema/index.ts` (mirror the `sync-queue.ts` export at
   `schema/index.ts:8`). [§3; BR-1, BR-2, BR-7]
2. **`packages/core/src/db/migrations/runner.ts`** — add and export
   `async function ensureInfra(driver: SqliteDriver): Promise<void>` issuing
   `CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`. [§3; BR-4, BR-5]
3. **`runner.ts` `migrate()`** — call `await ensureInfra(driver)` at the top, before `runMigrations(driver, ALL_MIGRATIONS)`.
   Do NOT touch `runMigrations`/`getSchemaVersion`/`setSchemaVersion`/the `Migration` type/`ALL_MIGRATIONS`. [§3; BR-4, BR-6]
4. **`runner.ts`** — add
   `async function resetDev(adapter: DatabaseAdapter, config: DatabaseConfig): Promise<{applied:number;currentVersion:number}>`:
   guard-first via the dev flag, then `await adapter.destroy(config.dbName)` → `const d = await adapter.open(config)` →
   `return migrate(d)`. Do NOT re-export `resetDev` from the `@vida/core` barrel (`index.ts`). [§3; BR-8]
   > **Impl note (§XXVIII, in-spirit refinement 2026-07-29):** the guard IS `import.meta.env.DEV`, but read type-safely —
   > `const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env; if (!env?.DEV) throw`. Reason: `@vida/core`'s
   > lib is `ES2022` only (no `vite/client`), so bare `import.meta.env` fails typecheck. Fails closed (absent env ⇒ non-dev ⇒ throw). Decision unchanged.
5. **Retire the 4 fixtures** — delete the `CREATE_APP_STATE` const + its exec in `foundation/sessions/__tests__/registry.test.ts:31`,
   `foundation/spaces/__tests__/spaces.test.ts:31`, `db/tests/repository.test.ts:33`, `apps/web/src/db/web-adapter.test.ts:135`.
   Each already calls `migrate()`/`runMigrations` after setup, so `ensureInfra` now creates the table. [BR-9]
6. **Contract tests** — `packages/core/src/db/tests/migrations-runner.test.ts` (real better-sqlite3 driver, NO fixture
   `app_state`): fresh-DB `migrate` → `app_state` exists + `schema_version = LATEST_VERSION`; version survives close/reopen;
   up-to-date re-run `applied:0`; failing migration rolls back + version unchanged; `resetDev` rebuilds clean. [§4 lines 91-97]
7. **Doc currency (ship in the same commit — §XXIX)** — amend `docs/infrastructure/storage-build-plan.md:38-39`
   (`schema/infra.ts` → `schema/foundation/`, both infra rows); refresh the stale "registry is empty" line in
   `packages/core/src/db/CLAUDE.md`; refresh `docs/infrastructure/database-layer/current-{spec,business-rules}.md`
   with the app_state bootstrap + dev-reset. [§4 lines 105-107; BR-7]
8. **Verify** — `pnpm typecheck` 10/10; `@vida/core` + `@vida/web` suites green; the two review-gate checks (§4 lines 102-103).
   Then run the post-impl independent `/critique` + `victor:quality-gate-engineering`. → §4 is the done-check.

## 6. Open UNKNOWNs / Decisions Needed

**None architectural — the mechanism is fully documented; db-7 implements it, it does not decide it.**
Baseline (Step 0) resolved every prior question against the docs + live floor:

- **Reconcile+extend, NOT from-zero** — runner + engine already exist (`runner.ts`; `runMigrations`/`getSchemaVersion`/
  `setSchemaVersion` in `adapter.ts`) with migrations 001/002/003 live. [FACT: runner.ts; adapter.ts:244]
- **`app_state` bootstrap is NOT an open call** — it is a documented ADR-002 §5.0 infra table; `storage-build-plan.md:38`
  fixes the home (`schema/infra.ts`, carry v1 shape). db-7 authors the documented table; no "option A/B" decision.
- **The real work = a code-vs-doc GAP:** `getSchemaVersion`/`setSchemaVersion` assume `app_state` (adapter.ts:213,231),
  but no PRODUCTION migration creates it — only test fixtures do (`spaces.test.ts:31`, `registry.test.ts:31`,
  `repository.test.ts:33`). So `migrate()` would throw at real boot on the first `setSchemaVersion`. db-7 closes this
  by authoring the documented `app_state` migration + retiring the fixtures. [FACT: adapter.ts:210-234; grep of CREATE TABLE app_state]
- **Resolved this gate (gate-1 critique, 2026-07-29):** (a) home drift `schema/infra.ts` → `schema/foundation/` decided
  - ledger amendment added (BR-7, §4); (b) the fixture set corrected 3→4 and the failure mechanism restated
    (setSchemaVersion INSIDE the loop, not a read — BR-5); (c) forward-only/no-`down()` divergence from ADR-002 §9.2
    disclosed (BR-6); (d) `resetDev` signature + web-VFS + guard specified (BR-8, §3). No numbered migration for
    `app_state` — it is the pre-loop infra bootstrap (BR-4), so "migration numbering" is not an open item.
- No open architectural decisions remain — the mechanism is documented; db-7 implements it.

## 7. Change Log

| Date       | Session                           | Change                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-07-29 | 2026-07-29-db-7-migrations-runner | initial stub — home + §1 identity seed                                                                                                                                                                                                                                                                                         |
| 2026-07-29 | 2026-07-29-db-7-migrations-runner | gate-1 PLAN drafted (§2–§4) — all rules doc-sourced + cited                                                                                                                                                                                                                                                                    |
| 2026-07-29 | 2026-07-29-db-7-migrations-runner | REVISE applied after independent critique: 4th fixture (web-adapter.test.ts:135), BR-5 mechanism, home-drift + ledger amend, forward-only/§9.2 divergence disclosed, resetDev fully specified, acceptance made testable, cites fixed                                                                                           |
| 2026-07-29 | 2026-07-29-db-7-migrations-runner | Approval 1 → preflight PASSED → 2nd critique SHIP → §5 written → Approval 2 → IMPLEMENTED (8 steps + §XXIX docs). §XXVIII in-spirit refinement: import.meta.env.DEV read type-safely. Post-impl critique SHIP (2 NITs fixed). Verify: typecheck 10/10, @vida/core 131/131, @vida/web 6/6. Eng gate PASS. Status → implemented. |
