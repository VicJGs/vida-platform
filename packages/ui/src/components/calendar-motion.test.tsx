// @vitest-environment jsdom
// fe-calendar S7 (EC-F2, PLAN-S7 G15/R9) — the today pulse (`pulseKey`) across the five calendar renderers that draw a
// today mark, and the `RangeTransition` fade. Motion is CSS keyframes gated by a reduced-motion @media block (no
// first-render flash); the renderers only toggle a class + remount the mark per key.
process.env.TZ = 'America/Sao_Paulo'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { CalendarView } from './calendar-view'
import { AgendaView } from './agenda-view'
import { WeekView } from './week-view'
import { YearView } from './year-view'
import { LivingView, type LivingDay } from './living-view'
import { RangeTransition } from './range-transition'

vi.setConfig({ testTimeout: 15000 })
afterEach(cleanup)
const wrap = (ui: ReactElement) => <UIProvider>{ui}</UIProvider>

const TODAY = '2026-10-08'
const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
const LIVING: LivingDay[] = WEEK.map((date) => ({
  date,
  kind: date < TODAY ? 'past' : date === TODAY ? 'today' : 'future',
}))

// each renderer at a given pulseKey → returns its today mark (the element the pulse animates)
const CASES: Array<[string, (k: number | undefined) => ReactElement, string]> = [
  [
    'CalendarView',
    (k) => (
      <CalendarView
        items={[]}
        getDate={() => TODAY}
        getKey={() => 'x'}
        renderItem={() => null}
        month={new Date(2026, 9, 1)}
        today={new Date(2026, 9, 8)}
        pulseKey={k}
        aria-label="Cal"
      />
    ),
    '.vida-cal-today',
  ],
  [
    'AgendaView',
    (k) => <AgendaView days={[{ date: TODAY, items: [{ id: 'a', title: 'Gym', daypart: 'evening' }] }]} today={TODAY} pulseKey={k} aria-label="Agenda" />,
    '.vida-agenda-today',
  ],
  [
    'WeekView',
    (k) => <WeekView days={WEEK} blocks={[]} today={TODAY} pulseKey={k} aria-label="Week" />,
    '.vida-week-today',
  ],
  [
    'YearView',
    (k) => <YearView year={2026} density={[]} today={TODAY} pulseKey={k} aria-label="Year" />,
    '.vida-year-today',
  ],
  [
    'LivingView',
    (k) => <LivingView days={LIVING} budget={[]} threads={[]} pulseKey={k} aria-label="Living" />,
    '.vida-living-today',
  ],
]

describe.each(CASES)('%s — today pulse', (_name, ui, mark) => {
  it('no pulse on mount (pulseKey absent or 0) — the mark carries no pulse class', () => {
    const { container, rerender } = render(wrap(ui(undefined)))
    expect(container.querySelector(mark)).not.toBeNull()
    expect(container.querySelector('.vida-today-pulse')).toBeNull()
    rerender(wrap(ui(0)))
    expect(container.querySelector('.vida-today-pulse')).toBeNull()
  })

  it('a pulseKey > 0 pulses the today mark; a new key REMOUNTS it (restarts the one-shot animation)', () => {
    const { container, rerender } = render(wrap(ui(1)))
    const first = container.querySelector(mark)
    expect(first?.classList.contains('vida-today-pulse')).toBe(true)
    rerender(wrap(ui(2)))
    const second = container.querySelector(mark)
    expect(second?.classList.contains('vida-today-pulse')).toBe(true)
    expect(second).not.toBe(first)
  })
})

describe('calendar motion styles', () => {
  it('one injected sheet: token durations, ease-out, transform/opacity only, reduced-motion = none', () => {
    render(wrap(CASES[0][1](1)))
    const css = [...document.querySelectorAll('style[data-vida-calendar-motion]')].map((s) => s.textContent).join('')
    expect(document.querySelectorAll('style[data-vida-calendar-motion]')).toHaveLength(1)
    expect(css).toMatch(/vida-today-pulse[^}]*400ms cubic-bezier\(0, 0, 0\.3, 1\)/)
    expect(css).toMatch(/vida-range-fade[^}]*250ms cubic-bezier\(0, 0, 0\.3, 1\)/)
    expect(css).not.toMatch(/width|height|top|left|color/)
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\{[^}]*animation:none/)
  })
})

describe('RangeTransition', () => {
  it('first render does not fade; a new transitionKey remounts the region with the fade class', () => {
    const { container, rerender, getByText } = render(wrap(<RangeTransition transitionKey="month">a</RangeTransition>))
    expect(container.querySelector('.vida-range-fade')).toBeNull()
    const before = getByText('a')
    rerender(wrap(<RangeTransition transitionKey="month">a</RangeTransition>))
    expect(container.querySelector('.vida-range-fade')).toBeNull()
    expect(getByText('a')).toBe(before) // same key → no remount
    rerender(wrap(<RangeTransition transitionKey="week">b</RangeTransition>))
    expect(container.querySelector('.vida-range-fade')).not.toBeNull()
    // switching BACK to the first range fades too (g2 review #7 — the latch, not a first-key compare)
    rerender(wrap(<RangeTransition transitionKey="month">c</RangeTransition>))
    expect(container.querySelector('.vida-range-fade')).not.toBeNull()
    expect(getByText('c')).toBeTruthy()
  })
})
