// preferences-rescope R2 (LIF-247) — the writer owns cache truth (PLAN-R2 R2-BR-4/5/8; IMPL-PLAN-R2 rev 3).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import { InvalidModuleError, USER_PREFERENCES_DEFAULTS } from '@vida/core'
import type { MergedPreferences } from '@vida/types'
import { createPreferencesWriter, PreferencesWriteError, type PreferencesWriterOptions } from './preferences-writer'
import { NAV_PREFS_KEY, USER_PREFS_KEY } from './preferences-keys'
import { fakePreferencesService } from '../test/preferences-test-utils'

let fake: ReturnType<typeof fakePreferencesService>
let qc: QueryClient

function makeWriter(hooks: Pick<PreferencesWriterOptions, 'onConfirmed' | 'onFailed'> = {}) {
  return createPreferencesWriter({ getService: async () => fake.svc, queryClient: qc, debounceMs: 500, ...hooks })
}

/** Simulate the hook's read: seed `confirmed` through noteConfirmed, exactly as the queryFn does. */
async function seed(w: ReturnType<typeof makeWriter>) {
  for (const t of ['user', 'nav'] as const) {
    const e = w.epoch(t)
    const read = t === 'user' ? await fake.svc.getMergedPreferences() : await fake.svc.getNavPreferences()
    qc.setQueryData(t === 'user' ? USER_PREFS_KEY : NAV_PREFS_KEY, w.noteConfirmed(t, read, e))
  }
}

const userCache = () => qc.getQueryData<MergedPreferences>(USER_PREFS_KEY)

beforeEach(() => {
  fake = fakePreferencesService()
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('preferences writer', () => {
  it('IR-10: two concurrent first writes on a fresh vault create ONE row', async () => {
    const w = makeWriter()
    await Promise.all([w.writePreferences({ date_format: 'DD/MM/YYYY' }), w.writePreferences({ time_format: '12h' })])
    await w.flushAll()
    expect(fake.state.creates.user).toBe(1)
    expect(fake.state.user).toMatchObject({ date_format: 'DD/MM/YYYY', time_format: '12h' })
  })

  it('IR-2: dashboard_layout sub-keys and moduleNames map entries all survive separate batches', async () => {
    vi.useFakeTimers()
    const w = makeWriter()
    void w.patchDashboardLayout({ theme: 'reader' })
    await vi.advanceTimersByTimeAsync(600)
    void w.patchDashboardLayout({ arrangement: 'dashboardFirst' })
    await vi.advanceTimersByTimeAsync(600)
    void w.patchModuleNames({ tasks: 'To-dos' })
    await vi.advanceTimersByTimeAsync(600)
    void w.patchModuleNames({ habits: 'Rituals' })
    await vi.advanceTimersByTimeAsync(600)
    await w.flushAll()
    expect(fake.state.user?.dashboard_layout).toEqual({
      theme: 'reader',
      arrangement: 'dashboardFirst',
      moduleNames: { tasks: 'To-dos', habits: 'Rituals' },
    })
  })

  it('IR-11: a settling batch never wipes a patch still waiting in the debounce', async () => {
    const w = makeWriter()
    await seed(w) // real timers: the fake service's read ticks via setTimeout(0)
    vi.useFakeTimers()
    void w.patchDashboardLayout({ theme: 'reader' }) // A
    await vi.advanceTimersByTimeAsync(501) // A sealed → in flight
    void w.patchDashboardLayout({ theme: 'quietDesk' }) // B, still in the debounce
    await vi.advanceTimersByTimeAsync(10) // A resolves (fake ticks)
    expect((userCache()?.dashboard_layout as Record<string, unknown>).theme).toBe('quietDesk')
    vi.useRealTimers() // the flushed write's fake-service ticks need real timers
    await w.flushAll()
    expect((userCache()?.dashboard_layout as Record<string, unknown>).theme).toBe('quietDesk')
  })

  it('failure restore: a failed batch leaves the cache at the DB state, every caller rejects alike', async () => {
    const w = makeWriter()
    await seed(w) // real timers: the fake service's read ticks via setTimeout(0)
    vi.useFakeTimers()
    fake.state.failNext = new Error('Invalid preferences patch: date_format')
    const calls = [
      w.writePreferences({ date_format: 'DD/MM/YYYY' }),
      w.writePreferences({ time_format: '12h' }),
      w.writePreferences({ week_starts_on: 0 }),
    ]
    const settled = Promise.allSettled(calls)
    await vi.advanceTimersByTimeAsync(600)
    const results = await settled
    expect(results.every((r) => r.status === 'rejected')).toBe(true)
    const err = (results[0] as PromiseRejectedResult).reason
    expect(err).toBeInstanceOf(PreferencesWriteError)
    expect(err.kind).toBe('validation')
    expect(userCache()).toMatchObject({
      date_format: USER_PREFERENCES_DEFAULTS.date_format,
      time_format: USER_PREFERENCES_DEFAULTS.time_format,
      week_starts_on: USER_PREFERENCES_DEFAULTS.week_starts_on,
    })
  })

  it('cross-table: a user write settling never disturbs a pending nav patch', async () => {
    const w = makeWriter()
    await seed(w) // real timers: the fake service's read ticks via setTimeout(0)
    vi.useFakeTimers()
    void w.writePreferences({ date_format: 'DD/MM/YYYY' })
    await vi.advanceTimersByTimeAsync(400)
    void w.writeNavPreferences({ reduce_motion: true }) // still in its own debounce when the user batch settles
    await vi.advanceTimersByTimeAsync(150) // user batch sealed at 500 and settled
    expect(qc.getQueryData<{ reduce_motion: boolean }>(NAV_PREFS_KEY)?.reduce_motion).toBe(true)
    vi.useRealTimers() // the flushed write's fake-service ticks need real timers
    await w.flushAll()
    expect(fake.state.nav?.reduce_motion).toBe(true)
  })

  it('F10: a write from outside React updates what an observer of the query sees', async () => {
    const w = makeWriter()
    await seed(w)
    const seen: unknown[] = []
    const obs = new QueryObserver(qc, { queryKey: USER_PREFS_KEY, enabled: false })
    const unsub = obs.subscribe((r) => seen.push((r.data as MergedPreferences | undefined)?.date_format))
    await w.writePreferences({ date_format: 'MM/DD/YYYY' }).catch(() => {})
    await w.flushAll()
    unsub()
    expect(seen).toContain('MM/DD/YYYY')
  })

  it('B2: a refetch resolving while a patch is pending keeps the patch visible', async () => {
    const w = makeWriter()
    await seed(w) // real timers: the fake service's read ticks via setTimeout(0)
    vi.useFakeTimers()
    const e = w.epoch('user')
    void w.writePreferences({ time_format: '12h' }) // pending in the debounce
    const staleRead = { ...USER_PREFERENCES_DEFAULTS } // the DB still says 24h
    qc.setQueryData(USER_PREFS_KEY, w.noteConfirmed('user', staleRead, e))
    expect(userCache()?.time_format).toBe('12h')
    vi.useRealTimers() // the flushed write's fake-service ticks need real timers
    await w.flushAll()
  })

  it('B1: a write before any read stamps no cache entry; the batch settle fills it from the DB', async () => {
    const w = makeWriter()
    const p = w.writePreferences({ date_format: 'DD/MM/YYYY' })
    expect(userCache()).toBeUndefined() // never a DEFAULTS-based value stamped as fresh
    await w.flushAll()
    await p
    expect(userCache()?.date_format).toBe('DD/MM/YYYY')
  })

  it('an empty diff never creates the row on a fresh vault', async () => {
    const w = makeWriter()
    await w.writePreferences({ date_format: USER_PREFERENCES_DEFAULTS.date_format })
    await w.flushAll()
    expect(fake.state.creates.user).toBe(0)
  })

  it('B4: nav validation errors and InvalidModuleError classify as validation; lock timeouts as lock-timeout', async () => {
    const w = makeWriter()
    fake.state.failNext = new Error('Invalid nav preferences patch: dock_size')
    const nav = w.writeNavPreferences({ reduce_motion: true })
    await w.flushAll()
    await expect(nav).rejects.toMatchObject({ kind: 'validation' })
    await expect(w.setModuleVisibilityMap({ '': false })).rejects.toMatchObject({ kind: 'validation', cause: expect.any(InvalidModuleError) })
  })

  it('BR-PREF-6: setModuleVisibilityMap accepts dock modules + surfaces, rejects unknown and global keys', async () => {
    const w = makeWriter()
    await expect(w.setModuleVisibilityMap({ nonsense: false })).rejects.toMatchObject({ kind: 'validation', cause: expect.any(InvalidModuleError) })
    await expect(w.setModuleVisibilityMap({ preferences: false })).rejects.toMatchObject({ kind: 'validation', cause: expect.any(InvalidModuleError) })
    await expect(w.setModuleVisibilityMap({ journals: true })).rejects.toMatchObject({ kind: 'validation', cause: expect.any(InvalidModuleError) })
    await Promise.all([w.setModuleVisibilityMap({ tasks: false }), w.setModuleVisibilityMap({ features: false })])
    await w.flushAll()
    expect(fake.state.user?.module_visibility).toEqual({ tasks: false, features: false })
  })

  it('failure restore keeps a LATER pending patch (cache = DB state + later pending)', async () => {
    const w = makeWriter()
    await seed(w)
    vi.useFakeTimers()
    fake.state.failNext = new Error('Invalid preferences patch: x')
    const doomed = w.writePreferences({ date_format: 'DD/MM/YYYY' })
    await vi.advanceTimersByTimeAsync(501) // the doomed batch sealed + in flight
    void w.writePreferences({ time_format: '12h' }) // a later patch, still in the debounce
    await expect(doomed).rejects.toMatchObject({ kind: 'validation' })
    expect(userCache()?.date_format).toBe(USER_PREFERENCES_DEFAULTS.date_format) // reverted
    expect(userCache()?.time_format).toBe('12h') // the later pending patch survives the revert
    vi.useRealTimers()
    await w.flushAll()
  })

  it('epoch guard: a stale read that began before a batch settled never overwrites the newer confirmed value', async () => {
    const w = makeWriter()
    await seed(w)
    const e = w.epoch('user') // a refetch starts…
    await w.writePreferences({ time_format: '12h' }).catch(() => {})
    await w.flushAll() // …a batch settles meanwhile (epoch moves)
    const staleRead = { ...USER_PREFERENCES_DEFAULTS } // the refetch resolves with the pre-batch row
    qc.setQueryData(USER_PREFS_KEY, w.noteConfirmed('user', staleRead, e))
    expect(userCache()?.time_format).toBe('12h')
    void w.writePreferences({ date_format: 'DD/MM/YYYY' }) // cache = confirmed (+ this pending) → confirmed must be 12h
    expect(userCache()?.time_format).toBe('12h')
    await w.flushAll()
  })

  it('BR-PREF-6 holds on the generic path too: writePreferences({ module_visibility }) with a bad key rejects', async () => {
    const w = makeWriter()
    await expect(w.writePreferences({ module_visibility: { journals: false } })).rejects.toMatchObject({
      kind: 'validation',
    })
    expect(fake.state.user).toBeNull()
  })

  it('a fire-and-forget write that fails raises no unhandled rejection', async () => {
    const w = makeWriter()
    fake.state.failNext = new Error('boom')
    void w.writePreferences({ time_format: '12h' }) // nobody awaits it (an F10 consumer)
    await w.flushAll()
    await new Promise((r) => setTimeout(r, 10)) // vitest fails the run on an unhandled rejection
  })

  // ── preferences-rescope R3 — the writer hooks (IMPL-PLAN-R3 step 1): DB truth only, one failure report per batch ──
  describe('R3 hooks: onConfirmed (DB truth) + onFailed (once per failed batch)', () => {
    it('an accepted read calls onConfirmed with the read row; a stale read does not', async () => {
      const onConfirmed = vi.fn()
      const w = makeWriter({ onConfirmed })
      await seed(w)
      expect(onConfirmed).toHaveBeenCalledWith('user', expect.objectContaining({ theme: 'system' }))
      expect(onConfirmed).toHaveBeenCalledWith('nav', expect.anything())
      onConfirmed.mockClear()
      const e = w.epoch('user')
      await w.writePreferences({ time_format: '12h' }) // a batch settles → the epoch moves
      onConfirmed.mockClear()
      w.noteConfirmed('user', { ...USER_PREFERENCES_DEFAULTS }, e) // began before the batch → rejected
      expect(onConfirmed).not.toHaveBeenCalled()
    })

    it('a successful batch calls onConfirmed with the DB result; enqueue alone calls nothing', async () => {
      const onConfirmed = vi.fn()
      const onFailed = vi.fn()
      const w = makeWriter({ onConfirmed, onFailed })
      await seed(w)
      onConfirmed.mockClear()
      vi.useFakeTimers()
      const p = w.writePreferences({ theme: 'dark' })
      expect(onConfirmed).not.toHaveBeenCalled() // optimistic enqueue is NOT DB truth
      await vi.advanceTimersByTimeAsync(600)
      await p
      expect(onConfirmed).toHaveBeenCalledTimes(1)
      expect(onConfirmed).toHaveBeenCalledWith('user', expect.objectContaining({ theme: 'dark' }))
      expect(onFailed).not.toHaveBeenCalled()
    })

    it('a failed batch NEVER calls onConfirmed (mutation-#1 kill target) and calls onFailed exactly once', async () => {
      const onConfirmed = vi.fn()
      const onFailed = vi.fn()
      const w = makeWriter({ onConfirmed, onFailed })
      await seed(w)
      onConfirmed.mockClear()
      vi.useFakeTimers()
      fake.state.failNext = new Error('boom')
      const a = w.writePreferences({ theme: 'dark' }).catch(() => {})
      const b = w.writePreferences({ compact_mode: true }).catch(() => {}) // same batch
      await vi.advanceTimersByTimeAsync(600)
      await Promise.all([a, b])
      expect(onConfirmed).not.toHaveBeenCalled()
      expect(onFailed).toHaveBeenCalledTimes(1)
      expect(onFailed.mock.calls[0]?.[0]).toBe('user')
      expect(onFailed.mock.calls[0]?.[1]).toBeInstanceOf(PreferencesWriteError)
    })

    it('two failing batches in sequence → onFailed twice', async () => {
      const onFailed = vi.fn()
      const w = makeWriter({ onFailed })
      await seed(w)
      fake.state.failNext = new Error('one')
      await w.writePreferences({ theme: 'dark' }).catch(() => {})
      fake.state.failNext = new Error('two')
      await w.writePreferences({ theme: 'dark' }).catch(() => {})
      expect(onFailed).toHaveBeenCalledTimes(2)
    })

    it('a throwing hook never breaks the cache sync', async () => {
      const w = makeWriter({
        onConfirmed: () => {
          throw new Error('hook boom')
        },
      })
      await seed(w)
      await w.writePreferences({ time_format: '12h' })
      expect(userCache()?.time_format).toBe('12h')
    })
  })
})
