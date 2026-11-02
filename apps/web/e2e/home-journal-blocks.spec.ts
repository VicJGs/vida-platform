// ============================================================================
// LIF-354 — today's journal on Home is ready for module blocks, on the REAL app + wa-sqlite/OPFS worker.
// The pilot's own path (LIF-339), proven before the pilot starts, with the DEV `?testblock` test body for the task
// block (`taskChecklist`):
//   1 — a blank journal shows "Type / for commands".
//   2 — the test body mounts in today's journal through `/task` and through the toolbar's Insert menu.
//   3 — `/task` puts the task block first; ↑/↓ keep the selection in view; each category header appears once.
//   4 — the toolbar stays in view on a long page; Insert offers the module blocks.
//   5 — Insert offers info/success/danger callouts.
// Ends with a screenshot of the journal (attached to the run; under test-results/).
//
// Run: macOS 13+ or CI ubuntu; on macOS 12 point at Brave: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import type { Locator, Page } from '@playwright/test'
import { test, expect } from './fixtures'

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

/** The selected slash option must sit inside the listbox's visible box. */
async function selectedInView(listbox: Locator) {
  const box = await listbox.boundingBox()
  const sel = await listbox.locator('[role="option"][aria-selected="true"]').boundingBox()
  expect(box && sel).toBeTruthy()
  expect(sel!.y).toBeGreaterThanOrEqual(box!.y - 1)
  expect(sel!.y + sel!.height).toBeLessThanOrEqual(box!.y + box!.height + 1)
}

test('LIF-354 — Home journal: hint, /task + toolbar reach the task block, sticky toolbar, callout variants', async ({
  db,
  page,
}) => {
  void db // the fixture's OPFS reset gives a fresh vault → a blank journal for today
  test.setTimeout(180_000)
  await bootAt(page, '/')
  // A full load with the DEV flag (the renderer set is read once per document load).
  await bootAt(page, '/?testblock')

  const journal = page.locator('.vida-editor-frame').first()
  const pm = journal.locator('.ProseMirror')
  await expect(pm).toBeVisible({ timeout: 30_000 })

  // 1 — the blank journal's hint.
  await expect(pm.locator('p.is-editor-empty').first()).toHaveAttribute('data-placeholder', 'Type / for commands')

  // 3 — the full menu: each header once; ↓ past the fold keeps the selection in view.
  await pm.click()
  await page.keyboard.type('/')
  const listbox = page.getByRole('listbox', { name: 'Slash commands' })
  await expect(listbox).toBeVisible()
  for (const header of ['Basic', 'Media', 'Platform blocks', 'Embeds']) {
    await expect(listbox.getByText(header, { exact: true })).toHaveCount(1)
  }
  for (let i = 0; i < 14; i++) await page.keyboard.press('ArrowDown')
  await selectedInView(listbox)
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowUp')
  await selectedInView(listbox)

  // 3 + 2 — `/task` puts the task block first; Enter mounts the test body through `/`.
  await page.keyboard.type('task')
  await expect(listbox.locator('[role="option"]').first()).toContainText('Task checklist')
  await expect(listbox.locator('[role="option"][aria-selected="true"]')).toContainText('Task checklist')
  await page.keyboard.press('Enter')
  const bodies = pm.getByRole('group', { name: 'Task block (test renderer)' })
  await expect(bodies).toHaveCount(1)

  // 2 + 4 — the toolbar's Insert menu offers the same task block; it mounts a second test body.
  const toolbar = journal.getByRole('toolbar')
  const lastLine = pm.locator(':scope > p').last()
  await lastLine.click()
  await toolbar.getByRole('button', { name: 'Insert block' }).click()
  // The long Insert menu scrolls inside its panel without closing (the @vida/ui Menu fix).
  const insertMenu = page.getByRole('menu')
  await insertMenu.hover()
  await page.mouse.wheel(0, 200)
  await expect(insertMenu).toBeVisible()
  await page.getByRole('menuitem', { name: 'Task checklist' }).click()
  await expect(bodies).toHaveCount(2)

  // 5 — Insert offers every callout variant; success inserts a success callout.
  await lastLine.click()
  await toolbar.getByRole('button', { name: 'Insert block' }).click()
  for (const name of ['Info callout', 'Success callout', 'Danger callout']) {
    await expect(page.getByRole('menuitem', { name })).toBeVisible()
  }
  await page.getByRole('menuitem', { name: 'Success callout' }).click()
  await expect(pm.locator('.vida-callout[data-variant="success"]')).toHaveCount(1)

  // Screenshot while the page is still short: both test bodies + the callout in today's journal.
  await page.keyboard.type('Inserted from the toolbar.')
  await journal.screenshot({ path: test.info().outputPath('home-journal-blocks.png') })

  // 4 — a long journal: the toolbar stays in view after the page scrolls.
  await lastLine.click()
  for (let i = 0; i < 60; i++) await page.keyboard.press('Enter')
  await page.keyboard.type('end of a long day')
  await pm.getByText('end of a long day').scrollIntoViewIfNeeded()
  const tb = await toolbar.boundingBox()
  const vp = page.viewportSize()!
  expect(tb).toBeTruthy()
  expect(tb!.y).toBeGreaterThanOrEqual(0)
  expect(tb!.y + tb!.height).toBeLessThanOrEqual(vp.height)
  // …and nothing covers it: the topmost element at its centre belongs to the toolbar.
  const onTop = await page.evaluate(
    ([x, y]) => !!document.elementFromPoint(x!, y!)?.closest('[role="toolbar"]'),
    [tb!.x + tb!.width / 2, tb!.y + tb!.height / 2],
  )
  expect(onTop).toBe(true)
  await page.screenshot({ path: test.info().outputPath('home-journal-sticky-toolbar.png') })
})
