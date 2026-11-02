// ============================================================================
// LIF-339 — tasks quick add on Home, on the REAL app + wa-sqlite/OPFS worker, WITHOUT the DEV `?testblock` body:
//   1 — `/task` in today's journal inserts a live task block (not the placeholder, not the test renderer).
//   2 — a title + Enter creates a task through the tasks service; it appears in the block.
//   3 — ticking marks it complete; the tick survives a reload.
//   4 — a task soft-deleted through the service is not listed.
// Boot + `/task` insertion mirror home-journal-blocks.spec.ts; the service reads/writes mirror write-lock.spec.ts
// (the app's own composition root, through Vite dev's module graph).
//
// Run: macOS 13+ or CI ubuntu; on macOS 12 point at Brave: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const ROOT = '/src/db/composition-root.ts'

/** First-run gate + optional guided setup (the home-journal-blocks.spec.ts boot). */
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

function journalEditor(page: Page) {
  const journal = page.locator('.vida-editor-frame').first()
  return journal.locator('.ProseMirror')
}

/** 1 — `/task` + Enter in today's journal; returns the live block body. */
async function insertTaskBlock(page: Page) {
  const pm = journalEditor(page)
  await expect(pm).toBeVisible({ timeout: 30_000 })
  await pm.click()
  await page.keyboard.type('/task')
  const listbox = page.getByRole('listbox', { name: 'Slash commands' })
  await expect(listbox.locator('[role="option"][aria-selected="true"]')).toContainText('Task checklist')
  await page.keyboard.press('Enter')
  return pm.getByRole('group', { name: 'Task checklist' })
}

/** Today's journal body is saved with the task block in it (so a reload re-mounts the block). */
async function journalHasTaskBlock(page: Page): Promise<boolean> {
  return page.evaluate(async (root) => {
    const { getServices } = await import(/* @vite-ignore */ root)
    const s = await getServices()
    const d = new Date()
    const today = [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-')
    const p = await s.notes.getPageByJournalDate(today)
    return JSON.stringify(p?.content ?? '').includes('taskChecklist')
  }, ROOT)
}

async function taskStatus(page: Page, title: string): Promise<string | null> {
  return page.evaluate(
    async ([root, t]) => {
      const { getServices } = await import(/* @vite-ignore */ root!)
      const s = await getServices()
      const rows: { title: string; status: string }[] = await s.tasks.listTasks()
      return rows.find((r) => r.title === t)?.status ?? null
    },
    [ROOT, title] as const,
  )
}

test.describe('LIF-339 @entity:tasks — tasks quick add on Home', () => {
  test('LIF-339 #1–#3 @entity:tasks — /task inserts a live task block; title + Enter creates a task; ticking completes it and survives a reload', async ({
    db,
    page,
  }) => {
    void db // fixture OPFS reset → a fresh vault, a blank journal for today
    test.setTimeout(180_000)
    await bootAt(page, '/')

    // 1 — the live body mounts (no ?testblock): not the placeholder, not the test renderer.
    const block = await insertTaskBlock(page)
    await expect(block).toHaveCount(1)
    await expect(page.getByRole('group', { name: 'Task block (test renderer)' })).toHaveCount(0)

    // 2 — title + Enter creates the task through the service; it appears in the block, unticked.
    const input = block.getByRole('textbox', { name: 'New task' })
    await input.click()
    await page.keyboard.type('Buy oat milk')
    await page.keyboard.press('Enter')
    const tick = block.getByRole('checkbox', { name: 'Buy oat milk' })
    await expect(tick).toBeVisible()
    await expect(tick).not.toBeChecked()
    await expect.poll(() => taskStatus(page, 'Buy oat milk')).not.toBeNull()

    // 3 — tick → completed in the store; reload → the block is back and the task is still ticked.
    await tick.check()
    await expect(tick).toBeChecked()
    await expect.poll(() => taskStatus(page, 'Buy oat milk')).toBe('completed')
    await expect.poll(() => journalHasTaskBlock(page), { timeout: 15_000 }).toBe(true)

    await bootAt(page, '/')
    const after = journalEditor(page).getByRole('group', { name: 'Task checklist' })
    await expect(after).toHaveCount(1, { timeout: 30_000 })
    await expect(after.getByRole('checkbox', { name: 'Buy oat milk' })).toBeChecked()
  })

  test('LIF-339 #4 @entity:tasks — a task soft-deleted through the tasks service is not listed in the block', async ({
    db,
    page,
  }) => {
    void db
    test.setTimeout(180_000)
    await bootAt(page, '/')

    await page.evaluate(async (root) => {
      const { getServices } = await import(/* @vite-ignore */ root)
      const s = await getServices()
      await s.tasks.createTask({ title: 'Keep me' })
      const gone = await s.tasks.createTask({ title: 'Old errand' })
      await s.tasks.softDeleteTask(gone.id)
    }, ROOT)

    const block = await insertTaskBlock(page)
    await expect(block.getByRole('checkbox', { name: 'Keep me' })).toBeVisible({ timeout: 15_000 })
    await expect(block.getByRole('checkbox', { name: 'Old errand' })).toHaveCount(0)
    await expect(block.getByRole('checkbox')).toHaveCount(1)
  })
})
