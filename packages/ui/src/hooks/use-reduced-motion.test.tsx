// @vitest-environment jsdom
// preferences-rescope R4 (LIF-247) — useReducedMotion = the in-app preference (context) OR the OS query.
// PLAN-R4 rev 2.1 R4-BR-5/6 · acceptance 4 · §XXVIII D-R4-1. The UIProvider first-render case lives in provider.test.tsx.
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ReducedMotionContext, useReducedMotion } from './use-reduced-motion'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** A probe that LOGS every render's value — so the first render is asserted, not an after-effect value. */
function renderProbe(ui: (probe: React.ReactElement) => React.ReactElement = (p) => p) {
  const log: boolean[] = []
  function Probe() {
    log.push(useReducedMotion())
    return null
  }
  const utils = render(ui(<Probe />))
  return { log, ...utils }
}

/** A controllable OS media query. */
function mockOS(matches: boolean) {
  const listeners = new Set<(e: MediaQueryListEvent) => void>()
  const mql = {
    matches,
    addEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: (e: MediaQueryListEvent) => void) => listeners.delete(cb)),
  }
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: vi.fn(() => mql) })
  return {
    mql,
    change(next: boolean) {
      mql.matches = next
      act(() => listeners.forEach((cb) => cb({ matches: next } as MediaQueryListEvent)))
    },
  }
}

function removeMatchMedia() {
  Object.defineProperty(window, 'matchMedia', { configurable: true, writable: true, value: undefined })
}

describe('useReducedMotion', () => {
  it('the in-app preference is true on the FIRST render (no observer, no ordering race — D-R4-1)', () => {
    mockOS(false)
    const { log } = renderProbe((p) => <ReducedMotionContext.Provider value>{p}</ReducedMotionContext.Provider>)
    expect(log[0]).toBe(true)
  })

  it('with no provider it is OS-only: reduce → true, no-preference → false', () => {
    mockOS(true)
    expect(renderProbe().log[0]).toBe(true)
    cleanup()
    mockOS(false)
    expect(renderProbe().log[0]).toBe(false)
  })

  it('an OS change event re-renders with the new value', () => {
    const os = mockOS(false)
    const { log } = renderProbe()
    os.change(true)
    expect(log.at(-1)).toBe(true)
    os.change(false)
    expect(log.at(-1)).toBe(false)
  })

  it('preference OFF never forces motion — the OS query still applies (R4-BR-6)', () => {
    mockOS(true)
    const { log } = renderProbe((p) => (
      <ReducedMotionContext.Provider value={false}>{p}</ReducedMotionContext.Provider>
    ))
    expect(log[0]).toBe(true)
  })

  it('no matchMedia (node-like env) → false, and no throw', () => {
    removeMatchMedia()
    expect(renderProbe().log[0]).toBe(false)
  })

  it('unsubscribes from the OS query on unmount', () => {
    const os = mockOS(false)
    const { unmount } = renderProbe()
    expect(os.mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    unmount()
    expect(os.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
  })
})
