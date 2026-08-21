// ============================================================================
// MOD-notes ②a browser proof — the `values` seam over the REAL wa-sqlite/OPFS
// worker + persistence across reload. Follows the documented MOD-* pattern
// (e2e/CLAUDE.md "per-module persistence specs, reusing `db`"): a persistence
// spec via the single `db` fixture, on the DURABLE `app_state` table + a probe
// key (NOT a throwaway table, NOT `schema_version`) — the same discipline as
// db-persistence.spec.ts. Proves the coverage jsdom structurally cannot give
// (FileSystemSyncAccessHandle is worker-only): that the new `values` op returns
// POSITIONAL arrays over the real worker (DP-5), and that a Drizzle-path write
// survives an OPFS reopen.
//
// Run locus: the CI `e2e` job. Authored on a macOS-12 host that cannot download
// Chromium (e2e/CLAUDE.md) → CI-verified, not local.
//
// Scope note: this is the documented DATA-PLANE persistence proof. The full
// NotesService-through-the-rendered-UI round-trip is ②b's Visual Gate (the app
// boots the real path + renders a page) — NOT wired into the test-only harness
// (that would need a second worker on the same OPFS pool). DP-8 concurrency is
// proven deterministically at the jsdom tier (drizzle.test.ts).
// ============================================================================

import { test, expect } from './fixtures'

const PROBE_KEY = 'e2e:notes-data-plane:probe'

test.describe('MOD-notes ②a — the values seam + persistence over the real worker', () => {
  // The new `values` op returns POSITIONAL arrays (cells in column order), which
  // is what Drizzle's sqlite-proxy `mapResultRow` indexes by. An object-row result
  // here would silently mis-index every multi-column read (DP-5).
  test('values() returns positional-array rows from the real worker', async ({ db }) => {
    await db.open('vida') // opens + migrates → app_state exists (ensureInfra)
    await db.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, 'v1')", [PROBE_KEY])

    const rows = await db.values('SELECT key, value FROM app_state WHERE key = ?', [PROBE_KEY])

    expect(rows).toEqual([[PROBE_KEY, 'v1']]) // positional [key, value], NOT { key, value }
  })

  // A write persists on OPFS across a full worker teardown + reload, read back via
  // the `values` seam. Durable app_state + probe key (db-persistence.spec pattern).
  test('a written row survives reopen, read back through values()', async ({ db, page }) => {
    await db.open('vida')
    await db.run("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, 'persisted-v1')", [
      PROBE_KEY,
    ])

    await page.reload() // full worker teardown + reload; OPFS persists
    await db.open('vida') // reloaded worker's driver is null → reopen

    const rows = await db.values('SELECT value FROM app_state WHERE key = ?', [PROBE_KEY])
    expect(rows).toEqual([['persisted-v1']]) // survived on OPFS, via the values seam
  })
})
