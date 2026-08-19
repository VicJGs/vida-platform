// ============================================================================
// Migration Runner — Vida Platform
// Collects all migration files and provides a single entry point.
//
// Usage (in platform adapters):
//   import { migrate } from '@vida/core'
//   const result = await migrate(driver)
// ============================================================================

import type { SqliteDriver, Migration, DatabaseAdapter, DatabaseConfig } from '../adapter'
import { runMigrations, getSchemaVersion } from '../adapter'
import { migration001SyncQueue } from './001_sync_queue'
import { migration002Sessions } from './002_sessions'
import { migration003Spaces } from './003_spaces'
import { migration004Effects } from './004_effects'
import { migration005Capability } from './005_capability'
import { migration006Economy } from './006_economy'
import { migration007Purpose } from './007_purpose'
import { migration008KnowledgeReview } from './008_knowledge_review'
import { migration009EconomyStoreRules } from './009_economy_store_rules'
import { migration010Scheduling } from './010_scheduling'
import { migration011Templates } from './011_templates'
import { migration012Notes } from './012_notes'
import { migration013Preferences } from './013_preferences'
import { migration014SessionsScheduling } from './014_sessions_scheduling'
import { migration015Tasks } from './015_tasks'

// ---------------------------------------------------------------------------
// Migration registry — import every migration file here in order.
// Each new migration adds one line.
// ---------------------------------------------------------------------------

// Migrations are authored per-feature at build phase (ADR-016 §3.5 / ADR-017 §1).
// The v1 monolith migration (001_initial) was quarantined to db/_legacy/ in Part 2 (ADR-018).
// DB-6 authors + registers the first real migration: the sync_queue foundation table.
// DB-3 (007-011) authors the Stream (i) substrate remainder: Purpose · review engine · store/rules · planned_blocks · templates.
// DB-4 (012+) authors the Stream (ii) per-domain tables: notes (012) · preferences (013) ·
// sessions & scheduling (014) · tasks (015).
const ALL_MIGRATIONS: Migration[] = [
  migration001SyncQueue,
  migration002Sessions,
  migration003Spaces,
  migration004Effects,
  migration005Capability,
  migration006Economy,
  migration007Purpose,
  migration008KnowledgeReview,
  migration009EconomyStoreRules,
  migration010Scheduling,
  migration011Templates,
  migration012Notes,
  migration013Preferences,
  migration014SessionsScheduling,
  migration015Tasks,
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Bootstrap the device-local `app_state` infra table (ADR-002 §5.0) if absent.
 *
 * `app_state` holds `schema_version` (ADR-002 §9.1), so it is the version store
 * the runner reads BEFORE the versioned loop — it therefore cannot itself be a
 * versioned migration (chicken-and-egg). It is created here, idempotently, at the
 * start of `migrate()`, ahead of `runMigrations`. Without this, the first
 * `setSchemaVersion` INSERT throws `no such table: app_state` at real boot
 * (adapter.ts:231) — masked until DB-7 only by test fixtures. (DB-7 · BR-4/BR-5)
 */
export async function ensureInfra(driver: SqliteDriver): Promise<void> {
  await driver.run(
    `CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  )
}

/**
 * Run all pending migrations against the given driver.
 *
 * Safe to call on every app startup — only applies migrations
 * whose version is greater than the stored schema_version.
 * Bootstraps `app_state` first so the version store exists before any write.
 *
 * @returns Number of migrations applied and the resulting version.
 */
export async function migrate(
  driver: SqliteDriver,
): Promise<{ applied: number; currentVersion: number }> {
  await ensureInfra(driver)
  return runMigrations(driver, ALL_MIGRATIONS)
}

/** Get the current schema version without running anything. */
export async function currentVersion(driver: SqliteDriver): Promise<number> {
  return getSchemaVersion(driver)
}

/** The latest migration version available in the codebase. */
export const LATEST_VERSION = ALL_MIGRATIONS.length > 0
  ? ALL_MIGRATIONS[ALL_MIGRATIONS.length - 1].version
  : 0

/** Check if the database needs migrations. */
export async function needsMigration(driver: SqliteDriver): Promise<boolean> {
  return (await currentVersion(driver)) < LATEST_VERSION
}

/** List all registered migrations (for debugging / admin UI). */
export function listMigrations(): ReadonlyArray<{ version: number; name: string }> {
  return ALL_MIGRATIONS.map((m) => ({ version: m.version, name: m.name }))
}

/**
 * DEV-ONLY: destroy the local database and rebuild it from zero.
 *
 * Deletes the DB (file on native; VFS directory on web — adapter.destroy),
 * re-opens, and re-runs every migration. NOT re-exported from the `@vida/core`
 * barrel and guarded behind the dev flag, so it is unreachable from production
 * flows. (DB-7 · BR-8)
 */
export async function resetDev(
  adapter: DatabaseAdapter,
  config: DatabaseConfig,
): Promise<{ applied: number; currentVersion: number }> {
  // `import.meta.env` is a bundler (Vite) augmentation not present in @vida/core's
  // lib types; cast through `unknown` to read `.DEV` type-safely. Fails CLOSED —
  // if `env` is absent (non-bundler runtime), the guard treats it as non-dev.
  const env = (import.meta as unknown as { env?: { DEV?: boolean } }).env
  if (!env?.DEV) {
    throw new Error('resetDev() is a development-only helper and must not run in production')
  }
  await adapter.destroy(config.dbName)
  const driver = await adapter.open(config)
  return migrate(driver)
}
