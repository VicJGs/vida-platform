// ============================================================================
// LIF-375 — EC-1 (re-pinned 2026-10-26) on the real app: `/notes` offers List · Gallery · Neural and no Calendar
// (journal views are the Journals module's, JR-1; docs/features/notes-and-pages/structure-data.md). The user opens
// /notes and switches through every offered layout from the view-mode toolbar.
// Run: macOS 13+ or CI ubuntu; on macOS 12: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

async function bootAt(page: Page, path: string) {
  await page.goto(path)
  for (let i = 0; i < 60; i++) {
    if (await page.locator('[data-region="topStrip"]').count()) break
    const start = page.getByRole('button', { name: 'Get started' })
    if (await start.count()) {
      await start.click()
      for (const label of ['Continue', 'Continue', 'Enter Vida']) {
        await page.getByRole('button', { name: label }).first().click()
      }
      await page.waitForSelector('[data-region="topStrip"]', { timeout: 30_000 })
      break
    }
    await page.waitForTimeout(500)
  }
  await page.waitForTimeout(1000)
  const skip = page.getByRole('button', { name: 'Skip for now' })
  if (await skip.count()) await skip.first().click()
}

async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

test('LIF-375 EC-1 — /notes switches List · Gallery · Graph and offers no Calendar', async ({ page }) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 1280, height: 800 }) // tablet+ → the toolbar switcher, not the condensed menu
  await bootAt(page, '/')
  await go(page, '/notes')

  const modes = page.getByRole('toolbar', { name: 'View mode' })
  await expect(modes.getByRole('button')).toHaveText(['List', 'Gallery', 'Graph'], { timeout: 15_000 })
  await expect(modes.getByRole('button', { name: 'Calendar' })).toHaveCount(0)
  await expect(modes.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')

  for (const label of ['Gallery', 'Graph', 'List']) {
    await modes.getByRole('button', { name: label }).click()
    await expect(modes.getByRole('button', { name: label })).toHaveAttribute('aria-pressed', 'true')
  }
})
