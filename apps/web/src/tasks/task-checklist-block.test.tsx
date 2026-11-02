// @vitest-environment jsdom
// LIF-339 — the task block's live body (`taskChecklist`, registered in notes/block-renderers.tsx) over the REAL tasks
// service: a live better-sqlite3 vault composed by the app's own `composeServices`, reached through a mocked
// `getServices()` (the use-calendar.test.tsx idiom). Spies on the live service prove the body writes THROUGH it.
//
// The body's accessible contract (what the e2e clicks too):
//   group "Task checklist" · textbox "New task" (Enter creates) · one checkbox per task, named by its title.
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Database from 'better-sqlite3'
import { UIProvider } from '@vida/ui'
import { createDrizzleProxy, initVault, migrate } from '@vida/core'
import type { IntegrationBlockRendererProps } from '@vida/editor'
import { createBetterSqlite3Driver } from '../db/test-driver'
import { withTransactionLock, writeLock } from '../db/write-lock'
import { composeServices, type Services } from '../db/composition-root'
import { TaskChecklistBlock } from './task-checklist-block'

const svc = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('../db/composition-root', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../db/composition-root')>()
  return { ...actual, getServices: () => Promise.resolve(svc.current) }
})

let services: Services

beforeEach(async () => {
  const driver = createBetterSqlite3Driver(new Database(':memory:'))
  await migrate(driver)
  await initVault()
  services = composeServices(withTransactionLock(createDrizzleProxy(driver), writeLock), 'device-test')
  svc.current = services
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** The block's default attrs (TaskChecklistBlockAttrs, all null). */
const DEFAULT_ATTRS = { project_id: null, milestone_id: null, due_before: null }

function mountBlock(attrs: Record<string, unknown> = DEFAULT_ATTRS, editable = true) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const props: IntegrationBlockRendererProps = {
    blockType: 'taskChecklist',
    attrs,
    updateAttributes: vi.fn(),
    editable,
    selected: false,
  }
  const wrap = (ui: ReactNode) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{ui}</UIProvider>
    </QueryClientProvider>
  )
  return render(wrap(<TaskChecklistBlock {...props} />))
}

const box = (name: string) => screen.findByRole('checkbox', { name }) as Promise<HTMLInputElement>

describe('TaskChecklistBlock (LIF-339)', () => {
  it('LIF-339 #2 — typing a title and pressing Enter creates a task through the tasks service, and it appears in the block', async () => {
    const create = vi.spyOn(services.tasks, 'createTask')
    mountBlock()
    await screen.findByRole('group', { name: 'Task checklist' })

    const input = await screen.findByRole('textbox', { name: 'New task' })
    fireEvent.change(input, { target: { value: 'Buy oat milk' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create.mock.calls[0]![0]).toMatchObject({ title: 'Buy oat milk' })
    // it is in the store, and the block lists it (unticked)
    expect((await services.tasks.listTasks()).map((t) => t.title)).toEqual(['Buy oat milk'])
    expect((await box('Buy oat milk')).checked).toBe(false)
  })

  it('LIF-339 #3 — ticking a task marks it complete (completeTask), unticking reopens it (reopenTask), and it persists across a remount', async () => {
    const task = await services.tasks.createTask({ title: 'Water plants' })
    const complete = vi.spyOn(services.tasks, 'completeTask')
    const reopen = vi.spyOn(services.tasks, 'reopenTask')
    mountBlock()

    const tick = await box('Water plants')
    expect(tick.checked).toBe(false)
    fireEvent.click(tick)
    await waitFor(() => expect(complete).toHaveBeenCalledWith(task.id))
    await waitFor(async () => expect((await services.tasks.getTask(task.id))?.status).toBe('completed'))
    await waitFor(async () => expect((await box('Water plants')).checked).toBe(true))

    // a fresh mount (fresh query cache) reads the completion back from the store
    cleanup()
    mountBlock()
    expect((await box('Water plants')).checked).toBe(true)

    fireEvent.click(await box('Water plants'))
    await waitFor(() => expect(reopen).toHaveBeenCalledWith(task.id))
    await waitFor(async () => expect((await services.tasks.getTask(task.id))?.status).not.toBe('completed'))
    await waitFor(async () => expect((await box('Water plants')).checked).toBe(false))
  })

  it('LIF-339 #4 — the block lists only tasks that are not deleted (standalone top-level under default attrs; completed stay, ticked)', async () => {
    const live = await services.tasks.createTask({ title: 'Live task' })
    const gone = await services.tasks.createTask({ title: 'Deleted task' })
    await services.tasks.softDeleteTask(gone.id)
    await services.tasks.createTask({ title: 'Project task', project_id: 'project-1' })
    await services.tasks.addSubtask(live.id, { title: 'Sub task' })
    const done = await services.tasks.createTask({ title: 'Done task' })
    await services.tasks.completeTask(done.id)

    mountBlock()
    expect((await box('Live task')).checked).toBe(false)
    expect((await box('Done task')).checked).toBe(true)
    expect(screen.queryByRole('checkbox', { name: 'Deleted task' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Project task' })).toBeNull()
    expect(screen.queryByRole('checkbox', { name: 'Sub task' })).toBeNull()
    expect(screen.getAllByRole('checkbox')).toHaveLength(2)
  })
})

describe('TaskChecklistBlock terminal states (LIF-339)', () => {
  it('LIF-339 terminal states — loading: while listTasks is pending the skeleton shows and no checkbox', async () => {
    await services.tasks.createTask({ title: 'Hidden while loading' })
    vi.spyOn(services.tasks, 'listTasks').mockReturnValue(new Promise(() => {}))
    mountBlock()
    const skeleton = await screen.findByRole('status', { name: 'Loading tasks' })
    expect(skeleton.getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('LIF-339 terminal states — empty: no tasks shows "No tasks" and the "New task" textbox (the create CTA)', async () => {
    mountBlock()
    expect(await screen.findByText('No tasks')).not.toBeNull()
    expect(screen.getByRole('textbox', { name: 'New task' })).not.toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('LIF-339 terminal states — read error: listTasks rejects → message + Retry; Retry re-reads and the list renders', async () => {
    await services.tasks.createTask({ title: 'After retry' })
    const list = vi.spyOn(services.tasks, 'listTasks').mockRejectedValueOnce(new Error('read failed'))
    mountBlock()
    expect(await screen.findByText('Tasks could not be loaded.')).not.toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect((await box('After retry')).checked).toBe(false)
    expect(list).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Tasks could not be loaded.')).toBeNull()
  })

  it('LIF-339 terminal states — failed create: createTask rejects → alert, the typed title stays in the input, no new checkbox', async () => {
    vi.spyOn(services.tasks, 'createTask').mockRejectedValueOnce(new Error('write failed'))
    mountBlock()
    await screen.findByText('No tasks')
    const input = screen.getByRole('textbox', { name: 'New task' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Call the bank' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })

    expect(await screen.findByRole('alert')).not.toBeNull()
    expect((screen.getByRole('textbox', { name: 'New task' }) as HTMLInputElement).value).toBe('Call the bank')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(await services.tasks.listTasks()).toEqual([])
  })

  it('LIF-339 terminal states — failed tick: completeTask rejects → alert and the checkbox reverts to unticked (the stored value)', async () => {
    const task = await services.tasks.createTask({ title: 'Pay rent' })
    vi.spyOn(services.tasks, 'completeTask').mockRejectedValueOnce(new Error('write failed'))
    mountBlock()
    fireEvent.click(await box('Pay rent'))

    expect(await screen.findByRole('alert')).not.toBeNull()
    await waitFor(async () => expect((await box('Pay rent')).checked).toBe(false))
    expect((await services.tasks.getTask(task.id))?.status).not.toBe('completed')
  })

  it('LIF-339 terminal states — readonly: editable=false hides the "New task" textbox and disables the checkboxes', async () => {
    await services.tasks.createTask({ title: 'Read only task' })
    mountBlock(DEFAULT_ATTRS, false)
    expect((await box('Read only task')).disabled).toBe(true)
    expect(screen.queryByRole('textbox', { name: 'New task' })).toBeNull()
  })
})
