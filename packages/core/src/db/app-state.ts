// ============================================================================
// app_state — the device-local key/value accessor (notes-rescope R2, A-42).
// ADR-002 §5.0: `app_state` is device-local and NOT synced. The getSchemaVersion/setSchemaVersion idiom
// (adapter.ts) generalised: every read/write takes the platform `SqliteDriver`, so main-thread (worker RPC) and
// test drivers work alike.
//
// Keys owned so far: `schema_version` (runner) · `first_run:completed` (apps/web onboarding) · `device_id`
// (apps/web composition root) · `entity_mode:<entityType>:<entityId>` — the per-instance merged/tabbed facet memory
// (ADR-006 §3.6). Each entity's hard-delete owner removes its own `entity_mode` key (R5: inside the purge transaction).
// ============================================================================
import type { SqliteDriver } from './adapter'

/** The prefix of every per-instance facet-mode key. */
export const ENTITY_MODE_PREFIX = 'entity_mode:'

/** `entity_mode:<entityType>:<entityId>` — the stored key for one entity's merged/tabbed choice. */
export function entityModeKey(entityType: string, entityId: string): string {
  return `${ENTITY_MODE_PREFIX}${entityType}:${entityId}`
}

/** One value, or `null` when the key is absent. */
export async function readAppState(driver: SqliteDriver, key: string): Promise<string | null> {
  const rows = await driver.query<{ value: string }>('SELECT value FROM app_state WHERE key = ?', [key])
  return rows[0]?.value ?? null
}

/**
 * Every row whose key STARTS with `prefix`. Not LIKE: `_`/`%` are LIKE wildcards (and `entity_mode` contains `_`),
 * SQLite has no default escape, and LIKE is ASCII case-insensitive. `substr` is 1-based over characters — the prefix
 * is bound twice (`length(?)` and the comparison).
 */
export async function readAppStatePrefix(
  driver: SqliteDriver,
  prefix: string,
): Promise<Array<{ key: string; value: string }>> {
  return driver.query<{ key: string; value: string }>(
    'SELECT key, value FROM app_state WHERE substr(key, 1, length(?)) = ?',
    [prefix, prefix],
  )
}

/** Upsert (`INSERT OR REPLACE` — idempotent, so a retry is always safe). */
export async function writeAppState(driver: SqliteDriver, key: string, value: string): Promise<void> {
  await driver.run('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [key, value])
}

/** Driver-level delete. NOT for a hard-delete purge: R5's `deletePageForever` removes `entity_mode` rows inside its
 *  transaction through the Drizzle `appState` mirror (a driver call can't join it — ADR-006 §3.6). */
export async function deleteAppState(driver: SqliteDriver, key: string): Promise<void> {
  await driver.run('DELETE FROM app_state WHERE key = ?', [key])
}
