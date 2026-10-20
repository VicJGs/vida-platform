// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { sampleHudRead, useActiveSession, type HudSampleForm } from './use-active-session'

const T0 = 1_760_000_000_000

// Pure function in M1 (no React hooks) — safe to call directly (the use-flow-session precedent).
describe('useActiveSession (M1 stub)', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('M1 default (no ?sample) is hidden — the HUD renders nothing in prod (BR-HUD-S1-6)', () => {
    const { read, port } = useActiveSession()
    expect(read.kind).toBe('hidden')
    expect(typeof port.pauseFocus).toBe('function')
    expect(typeof port.resumeFocus).toBe('function')
  })

  it('an unknown ?sample value stays hidden (never a half-designed form)', () => {
    window.history.pushState({}, '', '/?sample=bogus')
    expect(useActiveSession().read.kind).toBe('hidden')
  })

  it.each(['idle', 'focus', 'break', 'elapsed', 'paused', 'complete'] as const)(
    '?sample=%s yields its designed read (DEV)',
    (form) => {
      window.history.pushState({}, '', `/?sample=${form}`)
      const { read } = useActiveSession()
      expect(read.kind).toBe(form === 'idle' ? 'idle' : 'active')
    },
  )

  it('a sample read is STABLE across calls — captured once per load, never rebuilt per render (g2 F1)', () => {
    window.history.pushState({}, '', '/?sample=focus')
    const first = useActiveSession().read
    const second = useActiveSession().read
    expect(second).toBe(first) // referential: a slid endAt per render would pin the demo countdown
  })

  it('non-DEV ignores ?sample — production stays hidden (BR-HUD-S1-6)', () => {
    window.history.pushState({}, '', '/?sample=focus')
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      expect(useActiveSession().read.kind).toBe('hidden')
    } finally {
      process.env.NODE_ENV = prev
    }
  })

  it('the no-op port is call-safe (resolves, no throw)', async () => {
    const { port } = useActiveSession()
    await expect(port.pauseFocus('s1')).resolves.toBeUndefined()
    await expect(port.resumeFocus('s1')).resolves.toBeUndefined()
  })
})

describe('sampleHudRead (the designed demo forms)', () => {
  const active = (form: HudSampleForm) => {
    const read = sampleHudRead(form, T0)
    if (read.kind !== 'active') throw new Error(`expected active, got ${read.kind}`)
    return read.source
  }

  it('focus: a mid-run focus countdown, pausable', () => {
    const s = active('focus')
    expect(s.timing).toMatchObject({ kind: 'countdown', phase: 'focus', durationSeconds: 1500 })
    expect(s.canPause).toBe(true)
    expect(s.sessionId).toBe('sample-session')
  })

  it('break: a break-phase countdown — a first-class interval, never shown as focus (EC-3d)', () => {
    const s = active('break')
    expect(s.timing).toMatchObject({ kind: 'countdown', phase: 'short-break' })
    expect(s.kindLabel).toBe('Break')
  })

  it('elapsed: a generic in_progress session — count-up, NOT pausable (no paused in SESSION_STATUS)', () => {
    const s = active('elapsed')
    expect(s.timing.kind).toBe('elapsed')
    expect(s.canPause).toBe(false)
  })

  it('paused: a frozen countdown (pausedAt set) — the clock must not drain (PD-5)', () => {
    const s = active('paused')
    expect(s.timing).toMatchObject({ kind: 'countdown', pausedAt: T0 })
  })

  it('complete: a zero-crossed countdown (endAt in the past) — the held 0:00 form (EC-3c)', () => {
    const s = active('complete')
    if (s.timing.kind !== 'countdown') throw new Error('expected countdown')
    expect(s.timing.endAt).toBeLessThan(T0)
  })
})
