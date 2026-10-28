// ============================================================================
// preferences-rescope R1 (LIF-247) — BR-RT-LOCK on the REAL OPFS worker.
//
// Drives the APP page (not harness.html, which doesn't load the app): a burst of
// concurrent service writes through the app's own composition root must all
// succeed (no "cannot start a transaction within a transaction") and persist
// across reload. The services are reached via Vite dev's module graph (the URL the
// app imports). A second DB worker could not open OPFS (exclusive handles) and
// would fail loudly, so a passing burst ran on the app's own worker.
//
// Run: macOS 13+ or CI ubuntu (macOS 12 can't fetch Chromium — e2e/CLAUDE.md).
// ============================================================================

import { test, expect } from './fixtures'

const ROOT = '/src/db/composition-root.ts'

async function waitForAppBoot(page: import('@playwright/test').Page) {
  // A concrete landmark: the first-run Onboarding (or the shell) renders an <h1> only after DB-ready + first-run
  // resolve (App.tsx boot gate). `getServices()` itself also awaits ensureDbReady.
  await page.locator('h1').first().waitFor({ timeout: 30_000 })
}

test.describe('BR-RT-LOCK — concurrent service writes on the real OPFS worker', () => {
  // Requesting `db` resets OPFS on the never-opened harness page (fixtures.ts); then load the app.
  test('a burst of concurrent writes all succeed and persist across reload', async ({ db: _reset, page }) => {
    await page.goto('/')
    await waitForAppBoot(page)

    const created = await page.evaluate(async (root) => {
      const { getServices } = await import(/* @vite-ignore */ root)
      const s = await getServices()
      // Local calendar day — matches the app's `todayLocalYmd` (home/use-journal-entry.ts), never UTC.
      const d = new Date()
      const today = [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-')
      // ensureJournal is read-then-create (not this lock's job — R1-BR-7): create today's once, so the burst's
      // ensureJournal calls are idempotent reads interleaved with the createPage writes.
      await s.notes.ensureJournal(today)
      const writes = Array.from({ length: 10 }, (_, i) => [
        s.notes.createPage({ type: 'note', title: `lock-${i}` }),
        s.notes.ensureJournal(today),
      ]).flat()
      const results = await Promise.allSettled(writes)
      return {
        rejected: results
          .filter((r) => r.status === 'rejected')
          .map((r) => String((r as PromiseRejectedResult).reason)),
        notes: (await s.notes.listPages()).filter((p: { title: string | null }) => p.title?.startsWith('lock-')).length,
      }
    }, ROOT)
    expect(created.rejected).toEqual([])
    expect(created.notes).toBe(10)

    await page.reload()
    await waitForAppBoot(page)
    const afterReload = await page.evaluate(async (root) => {
      const { getServices } = await import(/* @vite-ignore */ root)
      const s = await getServices()
      return (await s.notes.listPages()).filter((p: { title: string | null }) => p.title?.startsWith('lock-')).length
    }, ROOT)
    expect(afterReload).toBe(10)
  })
})
