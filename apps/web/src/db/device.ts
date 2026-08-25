// ============================================================================
// Device identity — MOD-notes ② · B1 (LIF-131). The device-local `_sync_device_id`
// source (N2). Surfaced by the FIRST module service consumer: every repository
// write stamps `_sync_device_id` (repository.ts:299,426), but the app had no
// device-id source. Stored device-local in `app_state` (DB-7 key/value store;
// app-state.ts:7 names `device_id` as its home) — NOT a Notes-owned concept; a
// later module reuses this.
//
// Async/sync split mirrors db/boot's `ensureDbReady`/`getDbClient`: `ensureDeviceId`
// runs once at boot (after the DB is open); `getDeviceId` is the sync accessor the
// service singleton uses (so `getNotesService()` stays synchronous). I/O mirrors
// the shipped `onboarding/first-run-repo.ts` app_state pattern.
// ============================================================================

import { uuidv7 } from '@vida/core'
import { getDbClient } from './boot'

const DEVICE_ID_KEY = 'device_id'

let deviceId: string | null = null

/**
 * Resolve the device id once, at boot (call after `ensureDbReady`). Reads the
 * persisted `app_state` row; on a fresh device generates a UUIDv7 (the platform
 * PK convention) and persists it `INSERT OR REPLACE` (idempotent — a retry is safe).
 * Memoized: repeat callers get the same string without a re-read.
 */
export async function ensureDeviceId(): Promise<string> {
  if (deviceId) return deviceId
  const rows = await getDbClient().driver.query<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?',
    [DEVICE_ID_KEY],
  )
  let id = rows[0]?.value
  if (!id) {
    id = uuidv7()
    await getDbClient().driver.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [
      DEVICE_ID_KEY,
      id,
    ])
  }
  deviceId = id
  return id
}

/**
 * The resolved device id, synchronously. Throws if called before `ensureDeviceId`
 * (a boot-ordering bug) — the service singleton depends on this being ready.
 */
export function getDeviceId(): string {
  if (!deviceId) throw new Error('getDeviceId() called before ensureDeviceId() — boot ordering bug')
  return deviceId
}
