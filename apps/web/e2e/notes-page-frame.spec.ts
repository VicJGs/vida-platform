// ============================================================================
// notes-rescope R1 — the page frame on the REAL wa-sqlite/OPFS worker (LIF-245 · PLAN-R1 §4 B10–B12).
// The CI copy of the local Brave live leg. Seeds `pages` rows through the harness BEFORE the app opens 'vida' (no app
// surface creates a `*_note` yet, and the harness is DB-level only), then drives the real app:
//   B10 — every `*_note` type opens on its Note tab with the editor (EC-15 / EC-4), is named "<Type> note" (E-3), shows
//         one "Saved on this device" chip, and an edit persists (read back on the harness); "Couldn't save" never shows.
//   B11 — an untitled freeform `note` is "Untitled note" in the collection and on its page.
//   B12 — the DEV `?readerror` flag forces the read error on /notes/$id, /notes and / → Retry recovers in place.
//
// Run: macOS 13+ or CI ubuntu; on macOS 12 point at Brave: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import { randomUUID } from 'node:crypto'
import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const h1 = (text: string) => ({ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text }] })

/** First-run gate + optional guided setup, from whatever URL the page is on (the R0 boot, path-aware). */
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

const NOTE_TYPES = [
  ['task_note', 'Task note', 'task'],
  ['task_group_note', 'Task group note', 'task_group'],
  ['milestone_note', 'Milestone note', 'milestone'],
  ['deliverable_note', 'Deliverable note', 'deliverable'],
] as const

test('notes-rescope R1 — every page type opens with its editor, named, one save chip, edits persist', async ({
  db,
  page,
}) => {
  test.setTimeout(240_000)
  const seeds = NOTE_TYPES.map(([type, label, entityType]) => ({
    id: randomUUID(),
    type,
    label,
    entityType,
    parent: `Parent of ${label}`,
  }))
  const untitled = { id: randomUUID() }

  await db.open('vida')
  await db.migrate()
  const t = Date.now()
  for (const s of seeds) {
    // The ensureEntityNote shape: title NULL, the parent's title as the body's H1 (NP-8), linked to its entity.
    await db.exec(
      'INSERT INTO pages (id, created_at, updated_at, _sync_id, _sync_device_id, _sync_lww_ts, type, title, content, entity_type, entity_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [
        s.id,
        t,
        t,
        randomUUID(),
        'e2e',
        t,
        s.type,
        null,
        JSON.stringify({ type: 'doc', content: [h1(s.parent), para('seed')] }),
        s.entityType,
        randomUUID(),
      ],
    )
  }
  await db.exec(
    'INSERT INTO pages (id, created_at, updated_at, _sync_id, _sync_device_id, _sync_lww_ts, type, title, content) VALUES (?,?,?,?,?,?,?,?,?)',
    [untitled.id, t, t, randomUUID(), 'e2e', t, 'note', null, null],
  )
  await db.close()

  await bootAt(page, '/')
  for (const s of seeds) {
    await go(page, `/notes/${s.id}`)
    await expect(page.getByRole('tab', { name: 'Note' })).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 })
    await expect(page.locator('.ProseMirror').first()).toBeVisible()
    await expect(page.getByText(s.label, { exact: true }).first()).toBeVisible() // the H1 (E-3)
    await expect(page.getByRole('textbox', { name: `${s.label} editor`, exact: true })).toHaveCount(1) // the editor accname
    await expect(page.getByText('Saved on this device')).toHaveCount(1) // one chip (EC-34)
    await typeAtEnd(page, ` R1-${s.type}`)
    await page.waitForTimeout(1500) // past the 500 ms debounce + the write
    await expect(page.getByText('Couldn’t save on this device')).toHaveCount(0)
    await expect(page.getByText('Saved on this device')).toHaveCount(1)
  }

  // B11 — the untitled freeform note.
  await go(page, '/notes')
  await expect(page.getByRole('button', { name: /^Untitled note, edited/ })).toHaveCount(1, { timeout: 15_000 })
  await go(page, `/notes/${untitled.id}`)
  await expect(page.getByText('Untitled note', { exact: true }).first()).toBeVisible({ timeout: 15_000 })

  // Read back on the harness (the app's worker is torn down by the navigation, as with reload()).
  await page.goto('/e2e/harness.html')
  await page.waitForFunction(() => typeof window.__vidaDb !== 'undefined')
  await db.open('vida')
  for (const s of seeds) {
    const row = (await db.query('SELECT content FROM pages WHERE id = ?', [s.id]))[0] as { content: string }
    expect(row.content).toContain(`R1-${s.type}`)
  }
})

test('notes-rescope R1 — ?readerror: the read error + Retry recovers in place (page, collection, Home)', async ({
  db,
  page,
}) => {
  test.setTimeout(180_000)
  const note = { id: randomUUID(), title: 'R1 retry note' }
  await db.open('vida')
  await db.migrate()
  const t = Date.now()
  await db.exec(
    'INSERT INTO pages (id, created_at, updated_at, _sync_id, _sync_device_id, _sync_lww_ts, type, title, content) VALUES (?,?,?,?,?,?,?,?,?)',
    [
      note.id,
      t,
      t,
      randomUUID(),
      'e2e',
      t,
      'note',
      note.title,
      JSON.stringify({ type: 'doc', content: [para('body')] }),
    ],
  )
  await db.close()

  // A fresh full load per surface — one Retry press disarms the flag for the rest of that document load.
  const cases = [
    [`/notes/${note.id}?readerror`, 'Couldn’t load this page.', () => page.locator('.ProseMirror').first()],
    ['/notes?readerror', 'Couldn’t load your notes.', () => page.getByText(note.title).first()],
    ['/?readerror', 'Couldn’t load today’s page.', () => page.locator('.ProseMirror').first()],
  ] as const
  for (const [path, message, content] of cases) {
    await bootAt(page, path)
    await expect(page.getByText(message)).toBeVisible({ timeout: 20_000 })
    await page.getByRole('button', { name: 'Retry' }).click()
    await expect(content()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(message)).toHaveCount(0)
  }
})
