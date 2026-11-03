// @vitest-environment jsdom
// LIF-389 #5 — the /tasks surface's terminal states ("Task list" row: loading = skeleton · empty = "No tasks" + the
// create CTA · error = read error + Retry · success = the rendered list) and its failed writes (create, tick, delete
// each show an error and lose nothing), over the REAL tasks service: a live better-sqlite3 vault composed by the app's
// own `composeServices`, reached through a mocked `getServices()` (the task-checklist-block.test.tsx idiom).
//
// The surface's accessible contract (what tasks-route.spec.ts clicks too):
//   textbox "New task" (Enter creates) · one checkbox per task, named by its title · a button "Delete <title>" per row.
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Database from 'better-sqlite3'
import { UIProvider } from '@vida/ui'
import { createDrizzleProxy, initVault, migrate } from '@vida/core'
import { createBetterSqlite3Driver } from '../db/test-driver'
import { withTransactionLock, writeLock } from '../db/write-lock'
import { composeServices, type Services } from '../db/composition-root'
import { TasksSurface } from './tasks-surface'

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

function mountSurface() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrap = (ui: ReactNode) => (
    <QueryClientProvider client={qc}>
      <UIProvider>{ui}</UIProvider>
    </QueryClientProvider>
  )
  return render(wrap(<TasksSurface />))
}

const box = (name: string) => screen.findByRole('checkbox', { name }) as Promise<HTMLInputElement>

describe('LIF-389 #5 — loading, empty and error states follow the "Task list" terminal-states row; a failed create, tick or delete shows an error and loses nothing', () => {
  it('LIF-389 #5 loading — while listTasks is pending the skeleton shows and no checkbox', async () => {
    await services.tasks.createTask({ title: 'Hidden while loading' })
    vi.spyOn(services.tasks, 'listTasks').mockReturnValue(new Promise(() => {}))
    mountSurface()
    const skeleton = await screen.findByRole('status', { name: 'Loading tasks' })
    expect(skeleton.getAttribute('aria-busy')).toBe('true')
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('LIF-389 #5 empty — no tasks shows "No tasks" and the "New task" textbox (the create CTA)', async () => {
    mountSurface()
    expect(await screen.findByText('No tasks')).not.toBeNull()
    expect(screen.getByRole('textbox', { name: 'New task' })).not.toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()
  })

  it('LIF-389 #5 error — listTasks rejects → read error + Retry; Retry re-reads and the list renders', async () => {
    await services.tasks.createTask({ title: 'After retry' })
    const list = vi.spyOn(services.tasks, 'listTasks').mockRejectedValueOnce(new Error('read failed'))
    mountSurface()
    expect(await screen.findByText('Tasks could not be loaded.')).not.toBeNull()
    expect(screen.queryByRole('checkbox')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect((await box('After retry')).checked).toBe(false)
    expect(list).toHaveBeenCalledTimes(2)
    expect(screen.queryByText('Tasks could not be loaded.')).toBeNull()
  })

  it('LIF-389 #5 success — the stored tasks render as rows (one checkbox per task, a delete button each)', async () => {
    await services.tasks.createTask({ title: 'First errand' })
    const done = await services.tasks.createTask({ title: 'Second errand' })
    await services.tasks.completeTask(done.id)
    mountSurface()
    expect((await box('First errand')).checked).toBe(false)
    expect((await box('Second errand')).checked).toBe(true)
    expect(screen.getByRole('button', { name: 'Delete First errand' })).not.toBeNull()
    expect(screen.queryByText('No tasks')).toBeNull()
  })

  it('LIF-389 #5 failed create — createTask rejects → alert, the typed title stays in the input, no new row', async () => {
    vi.spyOn(services.tasks, 'createTask').mockRejectedValueOnce(new Error('write failed'))
    mountSurface()
    await screen.findByText('No tasks')
    const input = screen.getByRole('textbox', { name: 'New task' }) as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Call the bank' } })
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 })

    expect(await screen.findByRole('alert')).not.toBeNull()
    expect((screen.getByRole('textbox', { name: 'New task' }) as HTMLInputElement).value).toBe('Call the bank')
    expect(screen.queryByRole('checkbox')).toBeNull()
    expect(await services.tasks.listTasks()).toEqual([])
  })

  it('LIF-389 #5 failed tick — completeTask rejects → alert and the row stays as it was (unticked, not completed)', async () => {
    const task = await services.tasks.createTask({ title: 'Pay rent' })
    vi.spyOn(services.tasks, 'completeTask').mockRejectedValueOnce(new Error('write failed'))
    mountSurface()
    fireEvent.click(await box('Pay rent'))

    expect(await screen.findByRole('alert')).not.toBeNull()
    await waitFor(async () => expect((await box('Pay rent')).checked).toBe(false))
    expect((await services.tasks.getTask(task.id))?.status).not.toBe('completed')
  })

  it('LIF-389 #5 failed delete — softDeleteTask rejects → alert and the row stays listed (still live in the store)', async () => {
    const task = await services.tasks.createTask({ title: 'Renew passport' })
    vi.spyOn(services.tasks, 'softDeleteTask').mockRejectedValueOnce(new Error('write failed'))
    mountSurface()
    await box('Renew passport')
    fireEvent.click(screen.getByRole('button', { name: 'Delete Renew passport' }))

    expect(await screen.findByRole('alert')).not.toBeNull()
    expect((await box('Renew passport')).checked).toBe(false)
    expect((await services.tasks.listTasks()).map((t) => t.id)).toEqual([task.id])
  })
})
