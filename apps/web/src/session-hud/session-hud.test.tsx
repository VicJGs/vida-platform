// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { createMemoryHistory, createRootRoute, createRoute, createRouter, RouterProvider } from '@tanstack/react-router'
import { UIProvider } from '@vida/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SessionHud } from './session-hud'
import type { HudRead, HudSessionsPort, HudSource, HudTiming } from './types'

// 17:42 out, captured FRESH per fixture call — a module-level capture drifts as the suite's wall-clock
// advances (the rendered remaining slid under the assertion regex once the file grew). Assertions use a
// one-minute-tolerant regex for the same reason.
const farEnd = () => Date.now() + 1_062_000

const port = (): HudSessionsPort & { calls: string[] } => {
  const calls: string[] = []
  return {
    calls,
    pauseFocus: async (id) => {
      calls.push(`pause:${id}`)
    },
    resumeFocus: async (id) => {
      calls.push(`resume:${id}`)
    },
  }
}

const source = (timing: HudTiming, over: Partial<HudSource> = {}): HudSource => ({
  sessionId: 's-1',
  kindLabel: 'Focus',
  title: 'Deep work — Vida platform',
  timing,
  canPause: true,
  ...over,
})

const active = (timing: HudTiming, over: Partial<HudSource> = {}): HudRead => ({
  kind: 'active',
  source: source(timing, over),
})

const focusCountdown = (over: Partial<Extract<HudTiming, { kind: 'countdown' }>> = {}): HudTiming => ({
  kind: 'countdown',
  phase: 'focus',
  endAt: farEnd(),
  durationSeconds: 1500,
  ...over,
})

// Local memory-router mount (the shell test-router pattern) WITH the /sessions/$id route registered,
// so PillLink builds a real href.
async function renderHud(ui: ReactNode, path = '/') {
  const rootRoute = createRootRoute({ component: () => <>{ui}</> })
  const indexRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: () => null })
  const sessionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/sessions/$id',
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, sessionRoute]),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  return render(
    <UIProvider>
      <RouterProvider router={router} />
    </UIProvider>,
  )
}

afterEach(() => {
  cleanup() // repo convention: vitest globals are off, RTL auto-cleanup does not fire
  window.history.pushState({}, '', '/')
})

describe('SessionHud forms', () => {
  it('hidden renders NOTHING (BR-HUD-S2-1)', async () => {
    const { container } = await renderHud(<SessionHud read={{ kind: 'hidden' }} port={port()} __compact={false} />)
    expect(container.querySelector('a, button, svg')).toBeNull()
  })

  it('idle is a presentational invitation — hollow ring + text, NO interactive control (BR-HUD-S2-2)', async () => {
    const { container } = await renderHud(<SessionHud read={{ kind: 'idle' }} port={port()} __compact={false} />)
    expect(screen.getByText('Begin a session')).toBeTruthy()
    expect(container.querySelector('svg circle')).toBeTruthy()
    expect(container.querySelector('a, button')).toBeNull()
  })

  it('idle compact drops the invitation text (ring glyph only, EC-6)', async () => {
    const { container } = await renderHud(<SessionHud read={{ kind: 'idle' }} port={port()} __compact />)
    expect(screen.queryByText('Begin a session')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('active focus countdown: one real link with time, phase eyebrow and title (BR-HUD-S2-3/6)', async () => {
    const { container } = await renderHud(
      <SessionHud read={active(focusCountdown())} port={port()} __compact={false} />,
    )
    const link = container.querySelector('a')!
    expect(link).toBeTruthy()
    expect(link.getAttribute('href')).toContain('/sessions/s-1')
    expect(link.getAttribute('aria-label')).toMatch(/Active session: Focus — Deep work.*17:(3|4)\d remaining/)
    expect(screen.getByText(/17:(3|4)\d/)).toBeTruthy()
    expect(screen.getByText('Focus')).toBeTruthy() // eyebrow (CSS uppercases — SR-correct)
    expect(screen.getByText('Deep work — Vida platform')).toBeTruthy()
  })

  it('compact active: ring + time only — no eyebrow, title or pause control (EC-6)', async () => {
    const { container } = await renderHud(<SessionHud read={active(focusCountdown())} port={port()} __compact />)
    expect(screen.getByText(/17:(3|4)\d/)).toBeTruthy()
    expect(screen.queryByText('Deep work — Vida platform')).toBeNull()
    expect(container.querySelector('button')).toBeNull()
  })

  it('break phase shows the Break eyebrow — never shown as focus (EC-3d)', async () => {
    await renderHud(
      <SessionHud
        read={active(focusCountdown({ phase: 'short-break', endAt: Date.now() + 180_000, durationSeconds: 300 }))}
        port={port()}
        __compact={false}
      />,
    )
    expect(screen.getByText('Break')).toBeTruthy()
  })

  it('paused: frozen muted time, Paused eyebrow, resume control → port.resumeFocus (BR-HUD-S2-5/7)', async () => {
    const p = port()
    await renderHud(
      <SessionHud
        read={active(focusCountdown({ endAt: Date.now() + 630_000, pausedAt: Date.now() }))}
        port={p}
        __compact={false}
      />,
    )
    expect(screen.getByText('Paused')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Resume session' }))
    await Promise.resolve()
    expect(p.calls).toEqual(['resume:s-1'])
  })

  it('running pause control → port.pauseFocus (EC-5)', async () => {
    const p = port()
    await renderHud(<SessionHud read={active(focusCountdown())} port={p} __compact={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pause session' }))
    await Promise.resolve()
    expect(p.calls).toEqual(['pause:s-1'])
  })

  it('interval-complete: held 0:00 + "<Phase> · Done" eyebrow + NO pause control (EC-3c, BR-HUD-S2-7)', async () => {
    const { container } = await renderHud(
      <SessionHud read={active(focusCountdown({ endAt: Date.now() - 5_000 }))} port={port()} __compact={false} />,
    )
    expect(screen.getByText('0:00')).toBeTruthy()
    expect(screen.getByText('Focus · Done')).toBeTruthy()
    expect(container.querySelector('button')).toBeNull()
  })

  it('elapsed (generic session): count-up, kind eyebrow, no pause (canPause=false — EC-3b)', async () => {
    const { container } = await renderHud(
      <SessionHud
        read={active({ kind: 'elapsed', startedAt: Date.now() - 4_032_000 }, { kindLabel: 'Work', canPause: false })}
        port={port()}
        __compact={false}
      />,
    )
    expect(screen.getByText(/1:07:1\d/)).toBeTruthy()
    expect(screen.getByText('Work')).toBeTruthy()
    expect(container.querySelector('button')).toBeNull()
  })
})

describe('SessionHud composition + a11y', () => {
  it('the pause control is a DOM SIBLING of the anchor, never nested (§E)', async () => {
    const { container } = await renderHud(
      <SessionHud read={active(focusCountdown())} port={port()} __compact={false} />,
    )
    const button = container.querySelector('button')!
    expect(button.closest('a')).toBeNull()
  })

  it('?sample deep-link preserves the sample param (seam §D, g1-B5)', async () => {
    window.history.pushState({}, '', '/?sample=focus')
    const { container } = await renderHud(
      <SessionHud read={active(focusCountdown())} port={port()} __compact={false} />,
    )
    expect(container.querySelector('a')!.getAttribute('href')).toContain('sample=focus')
  })

  it('the status region is EMPTY on mount and announces only on an observed TRANSITION (BR-HUD-S2-8)', async () => {
    vi.useFakeTimers()
    try {
      // Mount running 2s from the cross; the ticking clock itself performs the in-place transition.
      const read = active(focusCountdown({ endAt: Date.now() + 2_000 }))
      const view = await renderHud(<SessionHud read={read} port={port()} __compact={false} />)
      const status = () => view.container.querySelector('[role="status"]')!
      expect(status().textContent).toBe('') // never announces on a fresh mount
      act(() => {
        vi.advanceTimersByTime(3_000)
      })
      expect(status().textContent).toBe('Session focus complete')
    } finally {
      vi.useRealTimers()
    }
  })
})
