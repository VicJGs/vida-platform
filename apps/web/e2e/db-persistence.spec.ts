// ============================================================================
// AR-2 browser proof — QA-1 (LIF-103). First consumer of the E2E foundation.
//
// Proves AR-2's two deferred acceptance items on the REAL wa-sqlite/OPFS worker
// path — the coverage the Node/:memory: contract test structurally cannot give
// (FileSystemSyncAccessHandle is worker-only). Drives only shipped ops via the
// `db` backdoor fixture; touches no deferred seam; uses no throwaway table.
// ============================================================================

import { test, expect } from './fixtures'

test.describe('AR-2 OPFS browser proof', () => {
  // AR-2 §2 item 1: opens a fresh DB (first run) and reopens it across reload,
  // no passphrase. The `db` fixture wiped OPFS at setup → clean first run.
  test('opens a fresh DB and reopens it across reload (item 1)', async ({ db, page }) => {
    expect(await db.exists('vida')).toBe(false) // fresh: empty OPFS pool
    await db.open('vida')
    await page.reload() // fresh page + fresh worker; OPFS persists
    expect(await db.exists('vida')).toBe(true) // reopened existing DB
  })

  // AR-2 §2 item 2: a written row persists on OPFS across reopen. Proven against
  // the DURABLE app_state table (DB-7) via a probe row — NOT schema_version
  // (migrate() always restores that to LATEST, so it can't distinguish a
  // persisted DB from a re-migrated fresh one). No throwaway table.
  test('persists a written row across reopen (item 2)', async ({ db, page }) => {
    await db.open('vida') // migrate() bootstraps app_state (ensureInfra)
    await db.run(
      "INSERT OR REPLACE INTO app_state (key, value) VALUES ('e2e:probe', 'persisted-v1')",
    )
    await page.reload() // full worker teardown + reload
    await db.open('vida') // reloaded worker's driver is null → reopen
    const rows = await db.query("SELECT value FROM app_state WHERE key = 'e2e:probe'")
    expect(rows).toEqual([{ value: 'persisted-v1' }]) // survived on OPFS
  })
})
