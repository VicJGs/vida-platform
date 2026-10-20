// ============================================================================
// data-plane-wiring CRUD proof (M1.1.3) — the UI-3 extension point QA-1 reserved.
//
// Proves the LANDED Drizzle-proxy seam (`exec`/`values`/`batch`) round-trips real
// rows on the REAL wa-sqlite/OPFS worker — the coverage the Node contract test
// structurally can't give. `values()` is the positional-array shape Drizzle's
// sqlite-proxy consumes, so this is the end-to-end proof the composition root's
// `createDrizzleProxy(client.driver)` works live. Uses the durable `app_state`
// table + probe keys (no throwaway table) — mirrors db-persistence.spec.ts.
//
// Run: macOS 13+ or CI ubuntu (macOS 12 can't fetch Chromium — e2e/CLAUDE.md).
// ============================================================================

import { test, expect } from './fixtures'

test.describe('data-plane-wiring — Drizzle seam CRUD on the real OPFS worker', () => {
  test('exec writes + values reads positional rows (the Drizzle read path)', async ({ db }) => {
    await db.open('vida')
    const r = await db.exec(
      "INSERT INTO app_state (key, value) VALUES ('dp:probe', 'v1') " +
        "ON CONFLICT(key) DO UPDATE SET value = 'v1'",
    )
    expect(r.changes).toBe(1)
    // values() → positional arrays (exactly what Drizzle's sqlite-proxy consumes).
    const rows = await db.values("SELECT key, value FROM app_state WHERE key = 'dp:probe'")
    expect(rows).toEqual([['dp:probe', 'v1']])
  })

  test('batch runs multiple statements; the writes persist across reload', async ({ db, page }) => {
    await db.open('vida')
    await db.batch([
      { sql: "INSERT OR REPLACE INTO app_state (key, value) VALUES ('dp:a', 'A')" },
      { sql: "INSERT OR REPLACE INTO app_state (key, value) VALUES ('dp:b', 'B')" },
    ])
    await page.reload() // full worker teardown + reload; OPFS persists
    await db.open('vida') // reloaded worker's driver is null → reopen
    const rows = await db.values(
      "SELECT value FROM app_state WHERE key IN ('dp:a', 'dp:b') ORDER BY key",
    )
    expect(rows).toEqual([['A'], ['B']]) // both survived on OPFS via the seam
  })
})
