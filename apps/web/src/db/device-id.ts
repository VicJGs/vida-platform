// ============================================================================
// Device id — MOD-notes ②a (LIF-131). A stable, device-local UUIDv7 that stamps
// `_sync_device_id` on every repository write (repository.ts:299). The app had
// none; this creates + persists it ONCE in the device-local `app_state` KV store.
//
// Mirrors the `onboarding/first-run-repo.ts` app-layer sibling (SELECT / INSERT).
// NEVER synced, NEVER re-generated: `app_state (key TEXT PK, value TEXT NOT NULL)`
// has no `_sync_*` columns and is not repository-managed, so a write here CANNOT
// enter `sync_queue` (only createRepository writes enqueue) — the never-synced
// guarantee is structural, not disciplinary. Resolved inside `ensureDbReady()`
// so `getDeviceId()` is synchronous for every post-boot consumer (DP-3/DP-4).
// ============================================================================

import { uuidv7 } from '@vida/core'
import type { SqliteDriver } from '@vida/core'

const DEVICE_ID_KEY = 'device_id'

let cachedDeviceId: string | null = null

/**
 * Read the device id from `app_state`, or create + persist one on first run.
 * Idempotent: an existing id is never overwritten (`INSERT OR IGNORE` guards a
 * theoretical race; a re-read returns the persisted winner). Called once by
 * `ensureDbReady()` and cached.
 */
export async function getOrCreateDeviceId(driver: SqliteDriver): Promise<string> {
  const existing = await readDeviceId(driver)
  if (existing) {
    cachedDeviceId = existing
    return existing
  }
  const created = uuidv7()
  await driver.run('INSERT OR IGNORE INTO app_state (key, value) VALUES (?, ?)', [
    DEVICE_ID_KEY,
    created,
  ])
  // Re-read so a racing writer's id (if any) wins deterministically; `created`
  // is the fallback when the driver returns no row (impossible after the insert).
  const winner = (await readDeviceId(driver)) ?? created
  cachedDeviceId = winner
  return winner
}

async function readDeviceId(driver: SqliteDriver): Promise<string | undefined> {
  const rows = await driver.query<{ value: string }>('SELECT value FROM app_state WHERE key = ?', [
    DEVICE_ID_KEY,
  ])
  return rows[0]?.value
}

/**
 * The cached device id. Throws if boot has not resolved it (fail-loud, never a
 * silent empty id that would poison `_sync_device_id`).
 */
export function getDeviceId(): string {
  if (cachedDeviceId === null) {
    throw new Error('Device id not resolved — await ensureDbReady() before getDeviceId().')
  }
  return cachedDeviceId
}

/** Test-only reset of the cached id. */
export function resetDeviceIdForTest(): void {
  cachedDeviceId = null
}
