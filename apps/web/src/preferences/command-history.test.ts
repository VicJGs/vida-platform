import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import type { PreferencesService } from '@vida/core'
import { createCommandHistory, toHistoryEntry } from './command-history'
import { COMMANDS_KEY } from './preferences-keys'
import { fakePreferencesService } from '../test/preferences-test-utils'

// preferences-rescope R5 (PLAN-R5 R5-BR-6, IMPL-PLAN §B) — ⌘K history writes: best-effort, on ONE serial chain.

const cmd = (id: string, label = id) => ({ id, label, category: 'navigation' as const })

function setup() {
  const fake = fakePreferencesService()
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const log = vi.fn()
  const history = createCommandHistory({ getService: async () => fake.svc, queryClient, log })
  return { fake, queryClient, log, history }
}

let clients: QueryClient[] = []
afterEach(() => {
  for (const c of clients) c.clear()
  clients = []
})

describe('toHistoryEntry', () => {
  it('maps the service row to the palette contract (is_pinned boolean → 0|1)', () => {
    const row = {
      command_key: 'k',
      command_label: 'K',
      command_category: null,
      use_count: 2,
      last_used_at: 5,
      is_pinned: true,
    }
    expect(toHistoryEntry(row as never)).toEqual({ ...row, is_pinned: 1 })
    expect(toHistoryEntry({ ...row, is_pinned: false } as never).is_pinned).toBe(0)
  })
})

describe('createCommandHistory', () => {
  it('the guard: two overlapping first records on the raw service DO collide (UNIQUE)', async () => {
    const { fake } = setup()
    const results = await Promise.allSettled([
      fake.svc.recordCommand('nav:/tasks', 'Tasks'),
      fake.svc.recordCommand('nav:/tasks', 'Tasks'),
    ])
    expect(results.some((r) => r.status === 'rejected')).toBe(true)
  })

  it('two back-to-back records of a new command → one row, use_count 2 (the chain serializes)', async () => {
    const { fake, history, log } = setup()
    history.record(cmd('nav:/tasks', 'Tasks'))
    history.record(cmd('nav:/tasks', 'Tasks'))
    await history.idle()
    expect(fake.state.history).toHaveLength(1)
    expect(fake.state.history[0]).toMatchObject({ command_key: 'nav:/tasks', use_count: 2 })
    expect(log).not.toHaveBeenCalled()
  })

  it('a pin right after the first record of a new command lands pinned (same chain)', async () => {
    const { fake, history } = setup()
    history.record(cmd('nav:/finance', 'Finance'))
    expect(await history.pin(cmd('nav:/finance', 'Finance'), true)).toBe(true)
    expect(fake.state.history[0]).toMatchObject({ use_count: 1, is_pinned: true })
    expect(fake.state.historyCalls).toEqual(['record:nav:/finance', 'pin:nav:/finance:true'])
  })

  it('pins a never-run command with its label (A1)', async () => {
    const { fake, history } = setup()
    expect(await history.pin(cmd('nav:/finance', 'Finance'), true)).toBe(true)
    expect(fake.state.history[0]).toMatchObject({ command_label: 'Finance', use_count: 0, is_pinned: true })
  })

  it('a failed op is logged, never rejects (record → void, pin → false), and the next op still runs', async () => {
    const { fake, history, log } = setup()
    fake.state.failHistory = 'write'
    expect(history.record(cmd('a'))).toBeUndefined()
    expect(await history.pin(cmd('b'), true)).toBe(false)
    fake.state.failHistory = 'none'
    history.record(cmd('c'))
    await history.idle()
    expect(log).toHaveBeenCalledTimes(2)
    expect(fake.state.history.map((r) => r.command_key)).toEqual(['c'])
  })

  it('invalidates the history key after each op settles', async () => {
    const { history, queryClient } = setup()
    const spy = vi.spyOn(queryClient, 'invalidateQueries')
    history.record(cmd('a'))
    await history.pin(cmd('a'), true)
    await history.idle()
    expect(spy).toHaveBeenCalledTimes(2)
    expect(spy).toHaveBeenCalledWith({ queryKey: COMMANDS_KEY, exact: true })
  })

  it('never waits on the refetch: a pin after a record settles while the history read hangs', async () => {
    const { history, queryClient } = setup()
    clients.push(queryClient)
    const hung = new QueryObserver(queryClient, { queryKey: COMMANDS_KEY, queryFn: () => new Promise<never>(() => {}) })
    const unsubscribe = hung.subscribe(() => {}) // an ACTIVE observer → invalidate would refetch it
    history.record(cmd('a'))
    const settled = await Promise.race([
      history.pin(cmd('a'), true),
      new Promise<'stalled'>((r) => setTimeout(() => r('stalled'), 500)),
    ])
    expect(settled).toBe(true)
    unsubscribe()
  })

  it('record runs the service with the live label + category', async () => {
    const svc = { recordCommand: vi.fn().mockResolvedValue(undefined) } as unknown as PreferencesService
    const queryClient = new QueryClient()
    const history = createCommandHistory({ getService: async () => svc, queryClient, log: vi.fn() })
    history.record({ id: 'nav:/habits', label: 'Rituals', category: 'navigation' })
    await history.idle()
    expect(svc.recordCommand).toHaveBeenCalledWith('nav:/habits', 'Rituals', 'navigation')
  })
})
