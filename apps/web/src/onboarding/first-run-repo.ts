// UI-4 · S4 (LIF-89) — first-run marker DB access. Isolates the `app_state` read/write for the onboarding
// completion gate so `useFirstRun` + tests never hand-write SQL (the `lib/platform.ts` precedent). Mirrors
// @vida/core's `getSchemaVersion`/`setSchemaVersion` (adapter.ts:210-232) — the canonical device-local KV idiom.
import { getDbClient } from '../db/boot'
import { writeLock } from '../db/write-lock'
import { FIRST_RUN_COMPLETE_KEY, FIRST_RUN_COMPLETE_VALUE, isFirstRun } from './first-run'

/**
 * Has this device finished first-run? Reads the device-local `app_state` marker (S4-BR-b: the marker, NOT
 * `exists()` — they disagree on first launch by design).
 */
export async function readFirstRunComplete(): Promise<boolean> {
  const rows = await getDbClient().driver.query<{ value: string }>(
    'SELECT value FROM app_state WHERE key = ?',
    [FIRST_RUN_COMPLETE_KEY],
  )
  // Defensive `?.`: the row is absent on a fresh device. (getSchemaVersion uses a bare `rows[0].value`, which
  // compiles only without noUncheckedIndexedAccess — the `?.` is correct regardless of that parked flip.)
  return !isFirstRun(rows[0]?.value)
}

/**
 * Mark first-run complete. Idempotent (`INSERT OR REPLACE` — adapter.ts:230-232), so a retry is always safe.
 * Runs under the app-wide write lock (BR-RT-LOCK, R1-BR-5): a raw write that landed inside another service's open
 * transaction would roll back with it — after `markComplete` already resolved — and onboarding would re-show on reload.
 */
export async function writeFirstRunComplete(): Promise<void> {
  await writeLock.runExclusive(() =>
    getDbClient().driver.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [
      FIRST_RUN_COMPLETE_KEY,
      FIRST_RUN_COMPLETE_VALUE,
    ]),
  )
}
