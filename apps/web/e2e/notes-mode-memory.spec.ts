// ============================================================================
// notes-rescope R2 — mode memory on the REAL wa-sqlite/OPFS worker (LIF-245 · PLAN-R2 §4 C).
// A note switched to Merged is still Merged after a reload (app_state `entity_mode:note:<id>`); a second note opens in
// its type's default (Tabbed). "Seeded per-type default while loading" — the page may show the default first, then it
// settles in the remembered mode (polling assertions).
// Run: macOS 13+ or CI ubuntu; on macOS 12: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })

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

const mergedButton = (page: Page) => page.getByRole('button', { name: 'Merged' })
const tabbedButton = (page: Page) => page.getByRole('button', { name: 'Tabbed' })
// The facet tablist carries no accessible name in the a11y tree (a pre-existing @vida/ui Tabs labelling gap, recorded
// separately), so the mode is asserted through the Merged/Tabbed toggle's aria-pressed + the tablist's presence.
const facetTabs = (page: Page) => page.getByRole('main').getByRole('tablist')

test('notes-rescope R2 — merged ⇄ tabbed is remembered per page across a reload', async ({ db, page }) => {
  test.setTimeout(180_000)
  const one = { id: randomUUID(), title: 'R2 remembered' }
  const two = { id: randomUUID(), title: 'R2 default' }
  await db.open('vida')
  await db.migrate()
  const t = Date.now()
  for (const n of [one, two]) {
    await db.exec(
      'INSERT INTO pages (id, created_at, updated_at, _sync_id, _sync_device_id, _sync_lww_ts, type, title, content) VALUES (?,?,?,?,?,?,?,?,?)',
      [n.id, t, t, randomUUID(), 'e2e', t, 'note', n.title, JSON.stringify({ type: 'doc', content: [para('body')] })],
    )
  }
  await db.close()

  await bootAt(page, '/')
  await go(page, `/notes/${one.id}`)
  await expect(tabbedButton(page)).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 }) // the note default
  await mergedButton(page).click()
  await expect(mergedButton(page)).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(1000) // the app_state write lands

  // Reload (a hard navigation re-runs the first-run gate): the page settles in Merged.
  await bootAt(page, `/notes/${one.id}`)
  await expect(mergedButton(page)).toHaveAttribute('aria-pressed', 'true', { timeout: 15_000 })
  await expect(facetTabs(page)).toHaveCount(0)

  // Another note keeps its type's default.
  await go(page, `/notes/${two.id}`)
  await expect(page.getByText(two.title).first()).toBeVisible({ timeout: 15_000 })
  await expect(tabbedButton(page)).toHaveAttribute('aria-pressed', 'true')
  await expect(facetTabs(page)).toHaveCount(1)

  // Read back on the harness.
  await page.goto('/e2e/harness.html')
  await page.waitForFunction(() => typeof window.__vidaDb !== 'undefined')
  await db.open('vida')
  const rows = (await db.query('SELECT value FROM app_state WHERE key = ?', [`entity_mode:note:${one.id}`])) as Array<{
    value: string
  }>
  expect(rows[0]?.value).toBe('merged')
  const none = await db.query('SELECT value FROM app_state WHERE key = ?', [`entity_mode:note:${two.id}`])
  expect(none).toHaveLength(0) // a mere open never writes
})
