// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HudTiming } from './types'
import { deriveHudClock, formatHudTime, useHudClock } from './use-hud-clock'

const T0 = 1_760_000_000_000 // an arbitrary fixed epoch — durations are TZ-neutral (BR-HUD-S1-8)

const countdown = (over: Partial<Extract<HudTiming, { kind: 'countdown' }>> = {}): HudTiming => ({
  kind: 'countdown',
  phase: 'focus',
  endAt: T0 + 1_062_000, // 17:42 out
  durationSeconds: 1500,
  ...over,
})

describe('formatHudTime', () => {
  it('formats the canonical boundaries', () => {
    expect(formatHudTime(0)).toBe('0:00')
    expect(formatHudTime(1_062_000)).toBe('17:42')
    expect(formatHudTime(59_000)).toBe('0:59')
    expect(formatHudTime(60_000)).toBe('1:00')
    expect(formatHudTime(3_599_000)).toBe('59:59')
    expect(formatHudTime(3_600_000)).toBe('1:00:00')
    expect(formatHudTime(4_032_000)).toBe('1:07:12')
  })

  it('clamps negative input to 0:00 (never negative time — EC-3c)', () => {
    expect(formatHudTime(-5_000)).toBe('0:00')
  })
})

describe('deriveHudClock', () => {
  it('countdown: remaining time + proportional progress', () => {
    const c = deriveHudClock(countdown(), T0)
    expect(c.display).toBe('17:42')
    expect(c.complete).toBe(false)
    expect(c.frozen).toBe(false)
    // 1500s planned, 1062s remaining → 438s done
    expect(c.progress).toBeCloseTo(438 / 1500, 5)
  })

  it('paused: frozen at endAt − pausedAt, constant across advancing now (PD-5)', () => {
    const t = countdown({ pausedAt: T0, endAt: T0 + 630_000 })
    const atPause = deriveHudClock(t, T0)
    const muchLater = deriveHudClock(t, T0 + 3_600_000)
    expect(atPause.display).toBe('10:30')
    expect(muchLater.display).toBe('10:30')
    expect(muchLater.frozen).toBe(true)
    expect(muchLater.complete).toBe(false)
    expect(muchLater.progress).toBe(atPause.progress)
  })

  it('zero-cross: HOLDS 0:00, complete, progress 1 — never negative, never overtime (EC-3c)', () => {
    const t = countdown({ endAt: T0 - 5_000 })
    const c = deriveHudClock(t, T0)
    expect(c.display).toBe('0:00')
    expect(c.complete).toBe(true)
    expect(c.progress).toBe(1)
    // and it stays held far past the cross
    const later = deriveHudClock(t, T0 + 86_400_000)
    expect(later.display).toBe('0:00')
    expect(later.complete).toBe(true)
  })

  it('elapsed: honest count-up, progress 0, never complete (EC-3b)', () => {
    const c = deriveHudClock({ kind: 'elapsed', startedAt: T0 - 4_032_000 }, T0)
    expect(c.display).toBe('1:07:12')
    expect(c.progress).toBe(0)
    expect(c.complete).toBe(false)
  })

  it('clamps progress LOW: remaining beyond the planned length (clock skew) never yields negative progress', () => {
    // endAt 3000s out on a 1500s interval → rawProgress = −1 → clamp to 0 (g2 nit d)
    const c = deriveHudClock(countdown({ endAt: T0 + 3_000_000 }), T0)
    expect(c.progress).toBe(0)
    expect(c.complete).toBe(false)
  })

  it('durationSeconds <= 0: progress disabled (0), no throw, dev-warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const c = deriveHudClock(countdown({ durationSeconds: 0, endAt: T0 + 10_000 }), T0)
    expect(c.progress).toBe(0)
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })
})

describe('useHudClock (ticking wrapper)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('re-derives each second from timestamps (drift-free), arming ONE interval (BR-HUD-S1-5)', () => {
    const armed = vi.spyOn(globalThis, 'setInterval')
    const { result } = renderHook(() => useHudClock(countdown()))
    expect(result.current.display).toBe('17:42')
    act(() => {
      vi.advanceTimersByTime(2_000)
    })
    expect(result.current.display).toBe('17:40')
    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(result.current.display).toBe('16:40')
    expect(armed).toHaveBeenCalledTimes(1) // never re-armed per tick
    armed.mockRestore()
  })

  it('a paused timing never ticks the display', () => {
    const { result } = renderHook(() => useHudClock(countdown({ pausedAt: T0, endAt: T0 + 630_000 })))
    expect(result.current.display).toBe('10:30')
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    expect(result.current.display).toBe('10:30')
    expect(result.current.frozen).toBe(true)
  })

  it('crosses zero into the held complete state while ticking', () => {
    const { result } = renderHook(() => useHudClock(countdown({ endAt: T0 + 2_000 })))
    expect(result.current.complete).toBe(false)
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(result.current.display).toBe('0:00')
    expect(result.current.complete).toBe(true)
  })

  it('a timing change re-derives immediately and re-arms', () => {
    const { result, rerender } = renderHook(({ t }: { t: HudTiming }) => useHudClock(t), {
      initialProps: { t: countdown() },
    })
    expect(result.current.display).toBe('17:42')
    rerender({ t: { kind: 'elapsed', startedAt: T0 - 60_000 } })
    expect(result.current.display).toBe('1:00')
    expect(result.current.progress).toBe(0)
  })

  it('unmount clears the interval', () => {
    const cleared = vi.spyOn(globalThis, 'clearInterval')
    const { unmount } = renderHook(() => useHudClock(countdown()))
    unmount()
    expect(cleared).toHaveBeenCalled()
    cleared.mockRestore()
  })
})
