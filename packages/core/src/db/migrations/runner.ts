// ============================================================================
// Migration Runner — Vida Platform
// Collects all migration files and provides a single entry point.
//
// Usage (in platform adapters):
//   import { migrate } from '@vida/core'
//   const result = await migrate(driver)
// ============================================================================

import type { SqliteDriver, Migration } from '../adapter'
import { runMigrations, getSchemaVersion } from '../adapter'

// ---------------------------------------------------------------------------
// Migration registry — import every migration file here in order.
// Each new migration adds one line.
// ---------------------------------------------------------------------------

import m001 from './001_initial'

const ALL_MIGRATIONS: Migration[] = [
  m001,
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run all pending migrations against the given driver.
 *
 * Safe to call on every app startup — only applies migrations
 * whose version is greater than the stored schema_version.
 *
 * @returns Number of migrations applied and the resulting version.
 */
export async function migrate(
  driver: SqliteDriver,
): Promise<{ applied: number; currentVersion: number }> {
  return runMigrations(driver, ALL_MIGRATIONS)
}

/** Get the current schema version without running anything. */
export function currentVersion(driver: SqliteDriver): number {
  return getSchemaVersion(driver)
}

/** The latest migration version available in the codebase. */
export const LATEST_VERSION = ALL_MIGRATIONS.length > 0
  ? ALL_MIGRATIONS[ALL_MIGRATIONS.length - 1].version
  : 0

/** Check if the database needs migrations. */
export function needsMigration(driver: SqliteDriver): boolean {
  return currentVersion(driver) < LATEST_VERSION
}

/** List all registered migrations (for debugging / admin UI). */
export function listMigrations(): ReadonlyArray<{ version: number; name: string }> {
  return ALL_MIGRATIONS.map((m) => ({ version: m.version, name: m.name }))
}
