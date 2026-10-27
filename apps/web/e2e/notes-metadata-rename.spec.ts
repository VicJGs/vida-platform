// ============================================================================
// notes-rescope R3 — metadata + rename on the REAL wa-sqlite/OPFS worker (LIF-245 · PLAN-R3 §4 D).
// Favorite + Archive (the page stays open, IR-R7) + icon (book-open) + a URL cover + an inline rename + a ⋯ rename →
// reload → all persisted (read back on the harness); the renamed title shows in /notes. The cover image is served by
// Playwright's route from e2e/fixtures (IMPL R-3 — nothing ships in dist), kept registered across the reload.
// Run: macOS 13+ or CI ubuntu; on macOS 12: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const COVER_FILE = fileURLToPath(new URL('./fixtures/cover.png', import.meta.url))
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

test('notes-rescope R3 — metadata + both renames persist across a reload', async ({ db, page, baseURL }) => {
  test.setTimeout(240_000)
  await page.route('**/__e2e/cover.png', (route) => route.fulfill({ path: COVER_FILE, contentType: 'image/png' }))
  const note = { id: randomUUID(), title: 'R3 original' }
  const coverUrl = `${baseURL}/__e2e/cover.png`
  await db.open('vida')
  await db.migrate()
  const t = Date.now()
  await db.exec(
    'INSERT INTO pages (id, created_at, updated_at, _sync_id, _sync_device_id, _sync_lww_ts, type, title, content) VALUES (?,?,?,?,?,?,?,?,?)',
    [note.id, t, t, randomUUID(), 'e2e', t, 'note', note.title, JSON.stringify({ type: 'doc', content: [para('body')] })],
  )
  await db.close()

  await bootAt(page, '/')
  await go(page, `/notes/${note.id}`)
  await page.getByRole('button', { name: 'Merged' }).click() // the metadata controls sit in the merged header
  const favorite = page.getByRole('button', { name: 'Favorite' })
  await favorite.click()
  await expect(favorite).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
  const archive = page.getByRole('button', { name: 'Archive' })
  await archive.click()
  await expect(archive).toHaveAttribute('aria-pressed', 'true', { timeout: 10_000 })
  await expect(page.getByRole('button', { name: note.title })).toBeVisible() // IR-R7: still on the page

  await page.getByRole('button', { name: 'Add icon' }).click()
  await page.getByRole('radio', { name: 'Book open' }).click()
  await expect(page.getByRole('button', { name: 'Change icon' })).toBeVisible({ timeout: 10_000 })

  await page.getByRole('button', { name: 'Add cover' }).click()
  await page.getByRole('textbox', { name: 'Image link' }).fill(coverUrl)
  await page.getByRole('button', { name: 'Use link' }).click()
  await expect(page.locator(`img[src="${coverUrl}"]`).first()).toBeVisible({ timeout: 10_000 })

  // Inline rename
  await page.getByRole('button', { name: note.title }).click()
  const input = page.getByRole('textbox', { name: 'Page title' })
  await input.fill('R3 inline')
  await input.press('Enter')
  await expect(page.getByRole('button', { name: 'R3 inline' })).toBeVisible({ timeout: 10_000 })

  // ⋯ → Rename
  await page.getByRole('button', { name: 'Page actions' }).click()
  await page.getByRole('menuitem', { name: 'Rename' }).click()
  const dialog = page.getByRole('dialog', { name: 'Rename page' })
  await dialog.getByRole('textbox', { name: 'Page title' }).fill('R3 renamed')
  await dialog.getByRole('button', { name: 'Save' }).click()
  await expect(page.getByRole('button', { name: 'R3 renamed' })).toBeVisible({ timeout: 10_000 })

  // Reload → everything persisted
  await bootAt(page, `/notes/${note.id}`)
  await expect(page.getByRole('button', { name: 'R3 renamed' })).toBeVisible({ timeout: 15_000 })
  await go(page, '/notes')
  await expect(page.getByText('R3 renamed').first()).toBeVisible({ timeout: 15_000 })

  await page.goto('/e2e/harness.html')
  await page.waitForFunction(() => typeof window.__vidaDb !== 'undefined')
  await db.open('vida')
  const row = (await db.query('SELECT title, is_favorite, is_archived, icon, cover_image FROM pages WHERE id = ?', [note.id]))[0] as {
    title: string
    is_favorite: number
    is_archived: number
    icon: string
    cover_image: string
  }
  expect(row).toMatchObject({ title: 'R3 renamed', is_favorite: 1, is_archived: 1, icon: 'book-open', cover_image: coverUrl })
})
