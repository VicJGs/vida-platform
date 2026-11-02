// @vitest-environment jsdom
// LIF-339 — `useTasks`: the task block's read (React Query over `getServices().tasks.listTasks`), over a live
// better-sqlite3 vault composed by the app's own `composeServices` (the use-calendar.test.tsx mocking idiom).
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Database from 'better-sqlite3'
import { createDrizzleProxy, initVault, migrate } from '@vida/core'
import { createBetterSqlite3Driver } from '../db/test-driver'
import { withTransactionLock, writeLock } from '../db/write-lock'
import { composeServices, type Services } from '../db/composition-root'
import { useTasks } from './use-tasks'

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

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('useTasks (LIF-339)', () => {
  it('LIF-339 #4 — useTasks with the block’s default attrs returns live standalone top-level tasks only (no deleted, project-linked or sub-tasks)', async () => {
    const live = await services.tasks.createTask({ title: 'Live task' })
    const gone = await services.tasks.createTask({ title: 'Deleted task' })
    await services.tasks.softDeleteTask(gone.id)
    await services.tasks.createTask({ title: 'Project task', project_id: 'project-1' })
    await services.tasks.addSubtask(live.id, { title: 'Sub task' })
    const list = vi.spyOn(services.tasks, 'listTasks')

    const { result } = renderHook(() => useTasks({ project_id: null, milestone_id: null, due_before: null }), {
      wrapper,
    })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(list).toHaveBeenCalled()
    expect(list.mock.calls[0]![0]).toMatchObject({ project_id: null, parent_task_id: null })
    expect(result.current.data?.map((t) => t.title)).toEqual(['Live task'])
  })
})
