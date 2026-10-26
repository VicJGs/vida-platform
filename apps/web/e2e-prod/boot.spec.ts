// ============================================================================
// Production-build boot smoke — LIF-250 (fix-data-plane-boot-open).
//
// Drives the REAL app boot on a production build (`playwright.prod.config.ts`): a clean-origin first run (every
// migration applies inside the worker `open`) must reach the app — never the "Failed to open the local database"
// screen — and a reload must boot again on the persisted DB. Root cause this guards: a fixed 15 s client RPC timer
// failed a first-run `open` that was alive and still migrating (docs/specs/fixes/data-plane-boot-open/ § Triage).
// ============================================================================

import { test, expect, type Page } from '@playwright/test'

const BOOT_ERROR = 'Failed to open the local database'
const RESET_PATH = '/__e2e-opfs-reset'

/**
 * Wipe this origin's OPFS pool (VFS dir `/vida`, mirrors web-adapter.ts destroy()) from a route-served blank page on
 * the SAME origin, so the app never boots and holds no sync-access handles while we remove it. Playwright does not
 * reset OPFS between contexts (microsoft/playwright#29901) — the e2e/fixtures.ts rule, without the dev-only harness.
 */
async function resetOpfs(page: Page): Promise<void> {
  await page.route(`**${RESET_PATH}`, (route) =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>reset</title>' }),
  )
  await page.goto(RESET_PATH)
  await page.evaluate(async () => {
    const root = await navigator.storage.getDirectory()
    try {
      await root.removeEntry('vida', { recursive: true })
    } catch {
      // Directory absent — nothing to clear.
    }
  })
  await page.unroute(`**${RESET_PATH}`)
}

/** Booted = the DB opened and the app (onboarding or shell) rendered: neither the Loading gate nor the error screen. */
async function expectBooted(page: Page): Promise<void> {
  await expect(page.getByText('Loading…')).toHaveCount(0, { timeout: 90_000 })
  await expect(page.getByText(BOOT_ERROR)).toHaveCount(0)
  await expect(page.locator('body')).not.toBeEmpty()
}

test('a production build boots on a clean origin, then again after a reload', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`)
  })
  // index.html declares no icon, so the browser's implicit /favicon.ico request 404s on `vite preview` (dev answers it
  // with the SPA fallback). The docs classify it as noise, "not product issues" (fe-notes-and-pages
  // envision.md:21,99), so it is answered here instead of loosening the console-clean check for everything else.
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204 }))

  await resetOpfs(page)
  await page.goto('/')
  await expectBooted(page) // first run: every migration applies inside the worker `open`

  await page.reload()
  await expectBooted(page) // the persisted DB reopens

  expect(errors).toEqual([])
})
