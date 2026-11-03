// ============================================================================
// LIF-389 — the live /tasks route, on the REAL app + wa-sqlite/OPFS worker:
//   1 — the Tasks nav item opens /tasks: ONE list of the 10 most recently created or edited top-level tasks, newest
//       first by updated_at.
//   3 — a title + Enter creates a task; it appears at the top labelled "new".
//   4 — tick completes / untick reopens (the task moves to the top, "edited <time>"), both survive a reload; delete
//       (softDeleteTask) removes it and it stays gone after a reload.
// Boot mirrors tasks-quick-add.spec.ts; service seeds/reads go through the app's own composition root (Vite dev).
// The "Tasks nav item" is the ⌘K navigation command "Tasks" (nav/module-map.ts `routePath: '/tasks'`, derived by
// command-bar/nav-commands.ts) — the Modules panel body is still a placeholder, so ⌘K is where the app shows it.
//
// The surface's accessible contract: list "Recent tasks" · one listitem per task holding a checkbox named by its title,
// its "new" / "edited <time>" label and a "Delete <title>" button · textbox "New task" (Enter creates).
//
// Run: macOS 13+ or CI ubuntu; on macOS 12 point at Brave: `PW_EXECUTABLE_PATH=".../Brave Browser" pnpm test:e2e`.
// ============================================================================

import type { Page } from '@playwright/test'
import { test, expect } from './fixtures'

const ROOT = '/src/db/composition-root.ts'
const EDITED = /edited \d{1,2}:\d{2}/

/** First-run gate + optional guided setup (the tasks-quick-add.spec.ts boot). */
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

/** Creates top-level tasks in order, a few ms apart so each gets a distinct created_at/updated_at; returns their ids. */
async function seedTasks(page: Page, titles: string[]): Promise<string[]> {
  return page.evaluate(
    async ([root, ts]) => {
      const { getServices } = await import(/* @vite-ignore */ root!)
      const s = await getServices()
      const ids: string[] = []
      for (const title of ts as string[]) {
        ids.push((await s.tasks.createTask({ title })).id)
        await new Promise((r) => setTimeout(r, 15))
      }
      return ids
    },
    [ROOT, titles] as const,
  )
}

async function storedTask(page: Page, title: string): Promise<{ status: string } | null> {
  return page.evaluate(
    async ([root, t]) => {
      const { getServices } = await import(/* @vite-ignore */ root!)
      const s = await getServices()
      const rows: { title: string; status: string }[] = await s.tasks.listTasks()
      const row = rows.find((r) => r.title === t)
      return row ? { status: row.status } : null
    },
    [ROOT, title] as const,
  )
}

const taskList = (page: Page) => page.getByRole('list', { name: 'Recent tasks' })
const row = (page: Page, title: string) =>
  taskList(page)
    .getByRole('listitem')
    .filter({ has: page.getByRole('checkbox', { name: title, exact: true }) })

/** The list's checkboxes, top to bottom, must be named exactly `titles`. */
async function expectOrder(page: Page, titles: string[]) {
  const boxes = taskList(page).getByRole('checkbox')
  await expect(boxes).toHaveCount(titles.length, { timeout: 15_000 })
  for (const [i, t] of titles.entries()) await expect(boxes.nth(i)).toHaveAccessibleName(t)
}

test.describe('LIF-389 @entity:tasks — the live /tasks route', () => {
  test('LIF-389 #1 @entity:tasks — the Tasks nav item opens /tasks: one list of the 10 most recently created or edited top-level tasks, newest first by updated_at', async ({
    db,
    page,
  }) => {
    void db // fixture OPFS reset → a fresh vault
    test.setTimeout(240_000)
    await bootAt(page, '/')

    // 11 top-level tasks T01…T11 (T11 newest), a sub-task under T11, then an edit to T02 → T02 is the most recent.
    const titles = Array.from({ length: 11 }, (_, i) => `Errand T${String(i + 1).padStart(2, '0')}`)
    const ids = await seedTasks(page, titles)
    await page.evaluate(
      async ([root, parentId, editId]) => {
        const { getServices } = await import(/* @vite-ignore */ root!)
        const s = await getServices()
        await s.tasks.addSubtask(parentId, { title: 'Sub step' })
        await new Promise((r) => setTimeout(r, 15))
        await s.tasks.updateTask(editId, { title: 'Errand T02 edited' })
      },
      [ROOT, ids[10]!, ids[1]!] as const,
    )

    // The Tasks nav item (⌘K → "Tasks") opens /tasks.
    await page.keyboard.press('Control+k')
    await page.getByRole('option', { name: 'Tasks', exact: true }).click()
    await expect(page).toHaveURL(/\/tasks$/)

    // ONE list; the 10 most recent top-level tasks, newest first: T02 (edited last), then T11…T03. Only T01 falls off
    // the 10; the sub-task is not listed.
    await expect(taskList(page)).toHaveCount(1, { timeout: 30_000 })
    await expectOrder(page, ['Errand T02 edited', ...titles.slice(2).reverse()])
    await expect(page.getByRole('checkbox', { name: 'Errand T01', exact: true })).toHaveCount(0)
    await expect(page.getByRole('checkbox', { name: 'Sub step', exact: true })).toHaveCount(0)
  })

  test('LIF-389 #3 @entity:tasks — on /tasks, a title + Enter creates a task and it appears at the top labelled "new"', async ({
    db,
    page,
  }) => {
    void db
    test.setTimeout(180_000)
    await bootAt(page, '/')
    await seedTasks(page, ['Older errand', 'Later errand'])
    await bootAt(page, '/tasks')
    await expectOrder(page, ['Later errand', 'Older errand'])

    const input = page.getByRole('textbox', { name: 'New task' })
    await input.click()
    await page.keyboard.type('Buy oat milk')
    await page.keyboard.press('Enter')

    await expectOrder(page, ['Buy oat milk', 'Later errand', 'Older errand'])
    await expect(row(page, 'Buy oat milk')).toContainText('new')
    await expect(row(page, 'Buy oat milk')).not.toContainText('edited')
    await expect(page.getByRole('checkbox', { name: 'Buy oat milk', exact: true })).not.toBeChecked()
    await expect.poll(() => storedTask(page, 'Buy oat milk')).not.toBeNull()
  })

  test('LIF-389 #4 @entity:tasks — tick completes and untick reopens (moves to the top, "edited <time>"), both survive a reload; delete removes it and it stays gone after a reload', async ({
    db,
    page,
  }) => {
    void db
    test.setTimeout(240_000)
    await bootAt(page, '/')
    await seedTasks(page, ['Older errand', 'Water plants', 'Later errand'])
    await bootAt(page, '/tasks')
    await expectOrder(page, ['Later errand', 'Water plants', 'Older errand'])
    await expect(row(page, 'Water plants')).toContainText('new')

    // tick → completed; moves to the top, labelled "edited <time>"; survives a reload
    await page.getByRole('checkbox', { name: 'Water plants', exact: true }).check()
    await expect.poll(() => storedTask(page, 'Water plants').then((t) => t?.status)).toBe('completed')
    await expectOrder(page, ['Water plants', 'Later errand', 'Older errand'])
    await expect(row(page, 'Water plants')).toContainText(EDITED)
    await bootAt(page, '/tasks')
    await expectOrder(page, ['Water plants', 'Later errand', 'Older errand'])
    await expect(page.getByRole('checkbox', { name: 'Water plants', exact: true })).toBeChecked()
    await expect(row(page, 'Water plants')).toContainText(EDITED)

    // untick (after editing another task, so the move to the top is observable) → reopened; top; survives a reload
    await page.getByRole('checkbox', { name: 'Older errand', exact: true }).check()
    await expectOrder(page, ['Older errand', 'Water plants', 'Later errand'])
    await page.getByRole('checkbox', { name: 'Water plants', exact: true }).uncheck()
    await expect.poll(() => storedTask(page, 'Water plants').then((t) => t?.status)).not.toBe('completed')
    await expectOrder(page, ['Water plants', 'Older errand', 'Later errand'])
    await expect(row(page, 'Water plants')).toContainText(EDITED)
    await bootAt(page, '/tasks')
    await expectOrder(page, ['Water plants', 'Older errand', 'Later errand'])
    await expect(page.getByRole('checkbox', { name: 'Water plants', exact: true })).not.toBeChecked()

    // delete → gone from the list and from the live store (soft delete); still gone after a reload
    await row(page, 'Later errand').getByRole('button', { name: 'Delete Later errand' }).click()
    await expectOrder(page, ['Water plants', 'Older errand'])
    await expect.poll(() => storedTask(page, 'Later errand')).toBeNull()
    await bootAt(page, '/tasks')
    await expectOrder(page, ['Water plants', 'Older errand'])
    await expect(page.getByRole('checkbox', { name: 'Later errand', exact: true })).toHaveCount(0)
  })
})
