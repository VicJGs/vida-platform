// @vitest-environment jsdom
// fe-calendar S7 — the query set per range (pure) + useCalendar's honest per-lane states over mocked services.
process.env.TZ = 'America/Sao_Paulo'
import type { ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { DueItem } from '@vida/core'
import { calendarQueries, LANES_BY_RANGE, useCalendar, type CalendarServices } from './use-calendar'

const svc = vi.hoisted(() => ({ current: null as unknown }))
vi.mock('../../db/composition-root', () => ({ getServices: () => Promise.resolve(svc.current) }))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const utc = (k: string) => Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1, Number(k.slice(8, 10)))
const NOW = new Date(2026, 9, 8, 10, 0) // Thu 8 Oct 2026, 10:00 local
function fake(over: Record<string, unknown> = {}) {
  const dueIn = vi.fn(
    async (r: { start: number }): Promise<DueItem[]> =>
      r.start === utc('2026-10-05') || r.start === utc('2026-09-28')
        ? [
            {
              source_module: 'purposes',
              ref_id: 'p1',
              label: 'Quarterly review',
              est_minutes: 15,
              urgency: 0,
              hard_deadline: utc('2026-10-06'),
            },
          ]
        : [],
  )
  return {
    sessions: {
      dueIn,
      listAvailability: vi.fn(async () => []),
      listAvailabilityExceptions: vi.fn(async () => []),
      getSessionAnalytics: vi.fn(async () => ({ totalFocusSeconds: 0 })),
    },
    tasks: { listTasks: vi.fn(async () => []) },
    habits: { getCompletionGrid: vi.fn(async () => []) },
    purposes: { listPurposes: vi.fn(async () => []) },
    notes: { getPageByJournalDate: vi.fn(async (_date: string) => null) },
    ...over,
  }
}
function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

describe('calendarQueries (pure)', () => {
  it('each range reads only its lanes; the open-tasks join rides every range with due work', () => {
    for (const range of Object.keys(LANES_BY_RANGE) as Array<keyof typeof LANES_BY_RANGE>) {
      const qs = calendarQueries(
        range,
        '2026-10-08',
        1,
        '2026-10-08',
        async () => fake() as unknown as CalendarServices,
      )
      expect(qs.map((q) => q.lane)).toEqual(LANES_BY_RANGE[range])
      expect(qs.map((q) => q.lane)).toContain('openTasks')
    }
  })

  it('the two due windows: pure-UTC date-lane bounds + the local-midnight instant bounds', async () => {
    const f = fake()
    const qs = calendarQueries('week', '2026-10-08', 1, '2026-10-08', async () => f as unknown as CalendarServices)
    await qs.find((q) => q.lane === 'dueDate')?.queryFn()
    await qs.find((q) => q.lane === 'dueLocal')?.queryFn()
    expect(f.sessions.dueIn.mock.calls[0][0]).toEqual({ start: utc('2026-10-05'), end: utc('2026-10-11') + 86_399_999 })
    expect(new Date(f.sessions.dueIn.mock.calls[1][0].start).getHours()).toBe(0)
  })

  it('journal + focus read only PAST days, through the non-creating journal read', async () => {
    const f = fake()
    const qs = calendarQueries('living', '2026-10-08', 1, '2026-10-08', async () => f as unknown as CalendarServices)
    await qs.find((q) => q.lane === 'journal')?.queryFn()
    await qs.find((q) => q.lane === 'focus')?.queryFn()
    expect(f.notes.getPageByJournalDate.mock.calls.map((c) => c[0])).toEqual(['2026-10-05', '2026-10-06', '2026-10-07'])
    expect(f.sessions.getSessionAnalytics).toHaveBeenCalledTimes(3)
  })
})

describe('useCalendar', () => {
  it('month: live chips from the due lane', async () => {
    svc.current = fake()
    const { result } = renderHook(() => useCalendar('month', '2026-10-08', 1, { now: NOW }), { wrapper })
    expect(result.current.state).toBe('loading')
    await waitFor(() => expect(result.current.state).toBe('success'))
    expect(result.current.month).toEqual([{ id: 'p1:2026-10-06', title: 'Quarterly review', date: '2026-10-06' }])
  })

  it('a whole-dueIn rejection → the region errors (no fabricated empty)', async () => {
    const f = fake()
    f.sessions.dueIn = vi.fn(async () => {
      throw new Error('db')
    })
    svc.current = f
    const { result } = renderHook(() => useCalendar('agenda', '2026-10-08', 1, { now: NOW }), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('error'))
  })

  it('a failed habits lane degrades only that lane (Living threads "unavailable"; the days still render)', async () => {
    svc.current = fake({ habits: { getCompletionGrid: vi.fn(async () => Promise.reject(new Error('x'))) } })
    const { result } = renderHook(() => useCalendar('living', '2026-10-08', 1, { now: NOW }), { wrapper })
    await waitFor(() => expect(result.current.living).toBeDefined())
    expect(result.current.living?.threads).toBeUndefined()
    expect(result.current.living?.budget).toEqual([])
    expect(result.current.living?.days).toHaveLength(7)
  })

  it('Week/Agenda never report "empty" while the habits lane is still pending (BR-3 — g2 review #2)', async () => {
    let release: (v: unknown[]) => void = () => {}
    const slow = new Promise<unknown[]>((r) => (release = r))
    svc.current = fake({ habits: { getCompletionGrid: vi.fn(() => slow) } })
    const { result } = renderHook(() => useCalendar('agenda', '2026-10-15', 1, { now: NOW }), { wrapper })
    await new Promise((r) => setTimeout(r, 30)) // due lanes resolved (nothing in that week)
    expect(result.current.state).toBe('loading')
    release([])
    await waitFor(() => expect(result.current.state).toBe('empty'))
  })

  it('empty states: Year / Week / Agenda with nothing → "empty" (Month keeps its designed grid → success)', async () => {
    svc.current = fake()
    for (const [range, expected] of [['year', 'empty'], ['week', 'empty'], ['agenda', 'empty'], ['month', 'success']] as const) {
      const { result, unmount } = renderHook(() => useCalendar(range, '2026-06-10', 1, { now: NOW }), { wrapper })
      await waitFor(() => expect(result.current.state).toBe(expected))
      unmount()
    }
  })

  it('Living: one fast lane ERROR never hides a lane still LOADING (g2 review #4)', async () => {
    let release: (v: unknown[]) => void = () => {}
    const slow = new Promise<unknown[]>((r) => (release = r))
    svc.current = fake({
      purposes: { listPurposes: vi.fn(async () => Promise.reject(new Error('x'))) },
      habits: { getCompletionGrid: vi.fn(() => slow) },
    })
    const { result } = renderHook(() => useCalendar('living', '2026-10-08', 1, { now: NOW }), { wrapper })
    await new Promise((r) => setTimeout(r, 30))
    expect(result.current.state).toBe('loading') // NOT a premature "threads unavailable"
    release([])
    await waitFor(() => expect(result.current.living).toBeDefined())
    expect(result.current.living?.budget).toBeUndefined() // the errored lane degrades
    expect(result.current.living?.threads).toEqual([])
  })

  it('enabled:false (DEV ?sample) runs no read at all', async () => {
    const f = fake()
    svc.current = f
    const { result } = renderHook(() => useCalendar('living', '2026-10-08', 1, { now: NOW, enabled: false }), {
      wrapper,
    })
    await new Promise((r) => setTimeout(r, 20))
    expect(f.sessions.dueIn).not.toHaveBeenCalled()
    expect(result.current.state).toBe('loading')
  })
})
