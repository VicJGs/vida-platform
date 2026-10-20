// ============================================================================
// E2E fixtures — QA-1 (LIF-103). THE shared browser-E2E foundation.
//
// `db`: a backdoor over the real wa-sqlite/OPFS worker (via window.__vidaDb on
// the harness page), plus a per-test OPFS reset for a deterministic clean start.
// Every downstream browser test (UI-3 CRUD, MOD-* persistence, DB-10 seed, UX-6)
// imports `test`/`expect` from here and reuses `db` — it is not one-off scaffolding.
//
// OPFS reset runs at fixture setup, on a freshly-loaded harness page BEFORE any
// open/exists — so no VFS sync-access-handles are held and removeEntry can't throw
// "in use" (the harness deliberately does not auto-open). Playwright does NOT reset
// OPFS between contexts (microsoft/playwright#29901), so this explicit wipe — not
// context isolation — is what makes a clean first-run deterministic.
// ============================================================================

import { test as base, expect } from '@playwright/test'
import type { VidaDbBackdoor } from './harness'

export const test = base.extend<{ db: VidaDbBackdoor }>({
  db: async ({ page }, use) => {
    await page.goto('/e2e/harness.html')
    // Vite dev does a one-time dep-optimization full reload on the first page
    // load of a run, which would destroy an in-flight evaluate. waitForFunction
    // polls across that navigation and settles on the post-reload context, so
    // every subsequent evaluate runs against a stable page + a live backdoor.
    await page.waitForFunction(() => typeof window.__vidaDb !== 'undefined')

    // Clean OPFS pool (VFS dir '/vida' — mirrors web-adapter.ts destroy()).
    await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory()
      try {
        await root.removeEntry('vida', { recursive: true })
      } catch {
        // Directory absent — nothing to clear.
      }
    })

    // Args cross page.evaluate as a serializable tuple (distinct names — no
    // param-shadow). Returns must be JSON-serializable (see harness.ts ceiling).
    const db: VidaDbBackdoor = {
      open: (dbName) => page.evaluate((n) => window.__vidaDb.open(n), dbName),
      exists: (dbName) => page.evaluate((n) => window.__vidaDb.exists(n), dbName),
      migrate: () => page.evaluate(() => window.__vidaDb.migrate()),
      run: (sql, params) =>
        page.evaluate((a) => window.__vidaDb.run(a[0], a[1]), [sql, params] as [
          string,
          unknown[] | undefined,
        ]),
      query: (sql, params) =>
        page.evaluate((a) => window.__vidaDb.query(a[0], a[1]), [sql, params] as [
          string,
          unknown[] | undefined,
        ]),
      values: (sql, params) =>
        page.evaluate((a) => window.__vidaDb.values(a[0], a[1]), [sql, params] as [
          string,
          unknown[] | undefined,
        ]),
      exec: (sql, params) =>
        page.evaluate((a) => window.__vidaDb.exec(a[0], a[1]), [sql, params] as [
          string,
          unknown[] | undefined,
        ]),
      batch: (statements) =>
        page.evaluate((s) => window.__vidaDb.batch(s), statements),
      close: () => page.evaluate(() => window.__vidaDb.close()),
    }

    // SEED EXTENSION POINT (foundation): DB-10's seedVault(db) will layer a
    // `seededDb` fixture on top of this one; MOD-* extend it per module. Not
    // built now — no dead code (No-Guessing).
    await use(db)
  },
})

export { expect }
