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

// Migrations are authored per-feature at build phase (ADR-016 §3.5 / ADR-017 §1).
// The v1 monolith migration (001_initial) was quarantined to db/_legacy/ in Part 2 (ADR-018);
// this registry is intentionally empty until the first per-feature migration is authored.
const ALL_MIGRATIONS: Migration[] = []

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
