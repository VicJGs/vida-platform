// ============================================================================
// notes-rescope R0 — data safety on the REAL wa-sqlite/OPFS worker (LIF-245 · PLAN-R0 §4 D).
// The CI copy of the local Brave live leg (run 2026-10-26: 18/18). Seeds `pages` rows through the harness BEFORE the
// app opens 'vida', then drives the real app: unreadable bodies never edited or written (EC-33 / BR-R0-1), the
// editor-valid normalizations open without a write (G4/G16), B-53 warm (DEV-R0-1 seed-point handover) and the
// tab-away/back remount.
//
// Run: macOS 13+ or CI ubuntu (macOS 12 can't fetch Chromium — e2e/CLAUDE.md); locally `playwright test --list`.
// ============================================================================

import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const NOTICE = 'This page can’t be opened for editing'

function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface Seed {
  id: string
  type: 'note' | 'journal'
  title: string
  content: string
  journalDate: string | null
}

const seed = (type: Seed['type'], title: string, content: string, journalDate: string | null = null): Seed => ({
  id: randomUUID(),
  type,
  title,
  content,
  journalDate,
})

async function boot(page: Page) {
  await page.goto('/')
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
  const skip = page.getByRole('button', { name: 'Skip for now' }) // fe-onboarding's optional guided setup
  if (await skip.count()) await skip.first().click()
}

// A hard navigation re-runs the first-run gate; navigate client-side (TanStack Router picks up popstate).
async function go(page: Page, path: string) {
  await page.evaluate((p) => {
    history.pushState({}, '', p)
    dispatchEvent(new PopStateEvent('popstate'))
  }, path)
}

async function typeAtEnd(page: Page, text: string) {
  const pm = page.locator('.ProseMirror').first()
  await pm.click()
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.type(text)
}

test('notes-rescope R0 — unreadable bodies are never written; B-53 + tab remount keep the unsaved edit', async ({
  db,
  page,
}) => {
  test.setTimeout(180_000)
  const unknownNode = seed('note', 'R0 unknown node', JSON.stringify({ type: 'doc', content: [para('keep'), { type: 'futureBlock' }] }))
  const notJson = seed('note', 'R0 not json', '{not json')
  const emptyText = seed(
    'note',
    'R0 empty text',
    JSON.stringify({ type: 'doc', content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '' }] }, para('body')] }),
  )
  const tabPage = seed('note', 'R0 tab switch', JSON.stringify({ type: 'doc', content: [para('base')] }))
  const today = localToday()
  const journal = seed('journal', today, JSON.stringify({ type: 'doc', content: [para('OLD')] }), today)
  const all = [unknownNode, notJson, emptyText, tabPage, journal]

  await db.open('vida')
  await db.migrate()
  const t = Date.now()
  for (const s of all) {
    await db.exec(
      'INSERT INTO pages (id, created_at, updated_at, _sync_id, _sync_device_id, _sync_lww_ts, type, title, content, journal_date) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [s.id, t, t, randomUUID(), 'e2e', t, s.type, s.title, s.content, s.journalDate],
    )
  }
  await db.close()

  await boot(page)
  for (const s of [unknownNode, notJson]) {
    await go(page, `/notes/${s.id}`)
    await expect(page.getByText(NOTICE).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.ProseMirror')).toHaveCount(0)
  }
  await go(page, `/notes/${emptyText.id}`)
  await expect(page.locator('.ProseMirror').first()).toBeVisible({ timeout: 15_000 })
  await page.waitForTimeout(1500)

  // B-53 warm: Home primed → edit on the note page → straight back to Home (inside the 500 ms debounce).
  await go(page, '/')
  await expect(page.getByText('OLD').first()).toBeVisible({ timeout: 15_000 })
  await go(page, `/notes/${journal.id}`)
  await typeAtEnd(page, ' NEW')
  await go(page, '/')
  await expect(page.locator('.ProseMirror').first()).toContainText('NEW', { timeout: 5_000 })
  await typeAtEnd(page, ' HOME')
  await page.waitForTimeout(1500)

  // Tab away and back inside the debounce: the remounted editor keeps the unsaved edit.
  await go(page, `/notes/${tabPage.id}`)
  await typeAtEnd(page, ' TAB')
  await page.getByRole('tab', { name: 'Overview' }).click()
  await page.getByRole('tab', { name: 'Note' }).click()
  await expect(page.locator('.ProseMirror').first()).toContainText('TAB')
  await page.waitForTimeout(1500)

  // Read back on the harness (the app's worker is torn down by the navigation, as with reload()).
  await page.goto('/e2e/harness.html')
  await page.waitForFunction(() => typeof window.__vidaDb !== 'undefined')
  await db.open('vida')
  const content = async (id: string) =>
    ((await db.query('SELECT content FROM pages WHERE id = ?', [id]))[0] as { content: string }).content
  expect(await content(unknownNode.id)).toBe(unknownNode.content) // byte-identical
  expect(await content(notJson.id)).toBe(notJson.content)
  expect(await content(emptyText.id)).toBe(emptyText.content) // mere open never writes
  expect(await content(journal.id)).toMatch(/OLD NEW HOME/)
  expect(await content(tabPage.id)).toMatch(/base TAB/)
})
