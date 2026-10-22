// @vitest-environment jsdom
// TZ guard: a negative-offset zone is where the 'YYYY-MM-DD'→UTC off-by-one bites. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { Text, View } from '@tamagui/core'
import { UIProvider } from '../provider'
import { YearView, type YearDensity } from './year-view'

// the first render pays the cold Tamagui load (~6s under a parallel suite) — the week-view precedent
vi.setConfig({ testTimeout: 15000 })
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

// The approved greybox: 2026, today Thu Oct 8.
const TODAY = '2026-10-08'
const DENSITY: YearDensity[] = [
  { date: '2026-10-08', level: 2 },
  { date: '2026-10-09', level: 1 },
  { date: '2026-03-04', level: 1 },
  { date: '2026-03-05', level: 0 },
]
const year = (props: Partial<React.ComponentProps<typeof YearView>> = {}) => (
  <YearView year={2026} density={DENSITY} today={TODAY} aria-label="Year" {...props} />
)
// atomic class for a given style prefix — jsdom resolves no CSS vars, so compare to a reference element (lineHeight recipe)
const cls = (el: Element | null, prefix: string) =>
  (el?.getAttribute('class')?.split(/\s+/) ?? []).filter((c) => c.startsWith(prefix)).sort().join(' ')

describe('YearView', () => {
  it('a named group of 12 month tables, Jan→Dec, each named "<Month> <year>"', () => {
    const { getByRole, getAllByRole } = renderUI(year())
    expect(getByRole('group', { name: 'Year' })).toBeTruthy()
    const tables = getAllByRole('table')
    expect(tables).toHaveLength(12)
    expect(tables[0].getAttribute('aria-colcount')).toBe('7')
    expect(getByRole('table', { name: 'January 2026' })).toBeTruthy()
    expect(getByRole('table', { name: 'October 2026' })).toBeTruthy()
  })

  it('cells: full weekday + date + density + today; colindex is offset-aware (Oct 1 = Thu → col 4)', () => {
    const { getByRole } = renderUI(year())
    const oct = getByRole('table', { name: 'October 2026' })
    const cells = within(oct).getAllByRole('cell')
    expect(cells).toHaveLength(31)
    expect(cells[0].getAttribute('aria-label')).toBe('Thursday, 1 October')
    expect(cells[0].getAttribute('aria-colindex')).toBe('4')
    expect(cells[7].getAttribute('aria-label')).toBe('Thursday, 8 October, busy, today')
    expect(cells[8].getAttribute('aria-label')).toBe('Friday, 9 October, has activity')
    // level 0 = no suffix, no dot
    const mar = getByRole('table', { name: 'March 2026' })
    expect(within(mar).getAllByRole('cell')[4].getAttribute('aria-label')).toBe('Thursday, 5 March')
  })

  it('weekStartsOn=0 shifts the columns (Oct 1 → col 5)', () => {
    const { getByRole } = renderUI(year({ weekStartsOn: 0 }))
    const first = within(getByRole('table', { name: 'October 2026' })).getAllByRole('cell')[0]
    expect(first.getAttribute('aria-colindex')).toBe('5')
  })

  it('every row has 7 slots — spacers lead and trail, hidden, no role', () => {
    const { getByRole } = renderUI(year())
    const rows = within(getByRole('table', { name: 'October 2026' })).getAllByRole('row')
    for (const row of rows) expect(row.children).toHaveLength(7)
    const spacers = rows.flatMap((r) => [...r.children]).filter((c) => c.getAttribute('aria-hidden') === 'true')
    expect(spacers).toHaveLength(3 + 1) // 3 leading (Thu start) + 1 trailing (31 + 3 = 34 → 35)
    for (const s of spacers) expect(s.getAttribute('role')).toBeNull()
  })

  it('dots: busy 6px solid · has 4px @ .75 · level 0 none; today ring on exactly one cell', () => {
    const { container } = renderUI(
      <>
        {year()}
        <View data-ref="busy" width={6} height={6} />
        <View data-ref="has" width={4} height={4} opacity={0.75} />
      </>,
    )
    const dots = container.querySelectorAll('.vida-year-dot')
    expect(dots).toHaveLength(3) // Oct 8 busy · Oct 9 has · Mar 4 has
    const busyRef = container.querySelector('[data-ref="busy"]')
    const hasRef = container.querySelector('[data-ref="has"]')
    expect(cls(dots[0], '_w-')).toBe(cls(hasRef, '_w-')) // Mar 4 first in DOM order
    expect(cls(dots[0], '_o-')).toBe(cls(hasRef, '_o-'))
    expect(cls(dots[1], '_w-')).toBe(cls(busyRef, '_w-'))
    expect(cls(dots[1], '_o-')).toBe('')
    const ring = container.querySelectorAll('.vida-year-today')
    expect(ring).toHaveLength(1)
    expect(ring[0].getAttribute('aria-hidden')).toBe('true')
    for (const d of dots) expect(d.getAttribute('aria-hidden')).toBe('true')
    // no day numbers — the overview is density only
    for (const c of container.querySelectorAll('[role="cell"]')) expect(c.textContent).toBe('')
  })

  it('headings: serif subheading with its paired line-height; only the current month accented', () => {
    const { container } = renderUI(
      <>
        {year()}
        <Text data-ref="sub" fontFamily="$display" fontSize="$subheading" lineHeight="$subheading">ref</Text>
        <Text data-ref="accent" color="$colorBrandEmphasis">ref</Text>
        <Text data-ref="primary" color="$colorTextPrimary">ref</Text>
      </>,
    )
    const accentCol = cls(container.querySelector('[data-ref="accent"]'), '_col-')
    const primaryCol = cls(container.querySelector('[data-ref="primary"]'), '_col-')
    const names = container.querySelectorAll('.vida-year-month')
    expect(names).toHaveLength(12)
    expect(cls(names[0], '_lh-')).toBe(cls(container.querySelector('[data-ref="sub"]'), '_lh-'))
    expect(cls(names[0], '_lh-')).not.toBe('')
    expect(cls(names[9], '_col-')).toBe(accentCol) // October = brandEmphasis
    expect(cls(names[0], '_col-')).toBe(primaryCol) // every other month = textPrimary
    expect(cls(names[3], '_col-')).toBe(primaryCol)
  })

  it('a malformed today accents nothing (the accent never appears without the ring)', () => {
    const { container } = renderUI(year({ today: '2026-10' }))
    expect(container.querySelectorAll('.vida-year-today')).toHaveLength(0)
    const names = container.querySelectorAll('.vida-year-month')
    expect(new Set([...names].map((n) => cls(n, '_col-'))).size).toBe(1)
  })

  it('today outside the year: no ring, no accent, no warning', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderUI(year({ today: '2027-01-02' }))
    expect(container.querySelectorAll('.vida-year-today')).toHaveLength(0)
    const names = container.querySelectorAll('.vida-year-month')
    expect(new Set([...names].map((n) => cls(n, '_col-'))).size).toBe(1)
    expect(spy).not.toHaveBeenCalled()
  })

  it('onPickMonth: 12 buttons, visible "October", named "October 2026, open month", press → 9', () => {
    const onPick = vi.fn()
    const { getAllByRole, getByRole, container } = renderUI(
      <>
        {year({ onPickMonth: onPick })}
        <View data-ref="touch" minHeight={44} />
      </>,
    )
    expect(getAllByRole('button')).toHaveLength(12)
    // ≥44px touch floor on every button (the reference-class recipe; the px is measured at the Visual Gate)
    const touch = cls(container.querySelector('[data-ref="touch"]'), '_minHeight-')
    expect(touch).not.toBe('')
    for (const b of getAllByRole('button')) expect(cls(b, '_minHeight-')).toBe(touch)
    const oct = getByRole('button', { name: 'October 2026, open month' })
    expect(oct.tagName).toBe('BUTTON')
    expect(oct.getAttribute('type')).toBe('button')
    // the table name excludes the button's ", open month"
    expect(getByRole('table', { name: 'October 2026' })).toBeTruthy()
    fireEvent.click(oct)
    expect(onPick).toHaveBeenCalledWith(9)
  })

  it('no handler: no buttons, no tab stops, tables still named', () => {
    const { queryAllByRole, getByRole, container } = renderUI(year())
    expect(queryAllByRole('button')).toHaveLength(0)
    expect(container.querySelectorAll('[tabindex="0"]')).toHaveLength(0)
    expect(getByRole('table', { name: 'May 2026' })).toBeTruthy()
  })

  it('loading: the grid without dots + aria-busy; buttons stay; stale density warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole, container, getAllByRole } = renderUI(year({ state: 'loading', onPickMonth: () => {} }))
    expect(getByRole('group', { name: 'Year' }).getAttribute('aria-busy')).toBe('true')
    expect(container.querySelectorAll('.vida-year-dot')).toHaveLength(0)
    expect(getAllByRole('button')).toHaveLength(12)
    expect(spy.mock.calls.some(([m]) => String(m).includes('stale render'))).toBe(true)
  })

  it('error: a status message (or the slot), no grid, no buttons', () => {
    const { getByRole, queryAllByRole, rerender } = renderUI(year({ state: 'error', onPickMonth: () => {} }))
    expect(getByRole('status').textContent).toContain('Couldn’t load.')
    expect(queryAllByRole('table')).toHaveLength(0)
    expect(queryAllByRole('button')).toHaveLength(0)
    rerender(<UIProvider>{year({ state: 'error', error: <span>Year unavailable</span> })}</UIProvider>)
    expect(getByRole('status').textContent).toBe('Year unavailable')
  })

  it('empty: the designed year grid (no dots) + sr status; buttons stay', () => {
    const { getByRole, getAllByRole, container } = renderUI(year({ density: [], state: 'empty', onPickMonth: () => {} }))
    expect(getAllByRole('table')).toHaveLength(12)
    expect(getByRole('status').textContent).toBe('No activity this year.')
    expect(container.querySelectorAll('.vida-year-dot')).toHaveLength(0)
    expect(getAllByRole('button')).toHaveLength(12)
  })

  it('empty with a slot: the slot replaces the grid (no tables, no buttons)', () => {
    const { getByRole, queryAllByRole } = renderUI(
      year({ density: [], state: 'empty', empty: <span>Nothing yet</span>, onPickMonth: () => {} }),
    )
    expect(getByRole('status').textContent).toBe('Nothing yet')
    expect(queryAllByRole('table')).toHaveLength(0)
    expect(queryAllByRole('button')).toHaveLength(0)
  })

  it('state="empty" with activity renders none + warns; success with nothing self-heals to empty + warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, getByRole, rerender } = renderUI(year({ state: 'empty' }))
    expect(container.querySelectorAll('.vida-year-dot')).toHaveLength(0)
    expect(spy.mock.calls.some(([m]) => String(m).includes('not rendered'))).toBe(true)
    rerender(<UIProvider>{year({ density: [{ date: '2025-01-01', level: 2 }] })}</UIProvider>)
    expect(getByRole('status').textContent).toBe('No activity this year.')
    expect(spy.mock.calls.some(([m]) => String(m).includes('outside 2026'))).toBe(true)
    expect(spy.mock.calls.some(([m]) => String(m).includes('pass state="empty"'))).toBe(true)
  })

  it('an invalid year falls back to the current year + warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole } = renderUI(year({ year: 26, density: [], state: 'empty' }))
    const y = new Date().getFullYear()
    expect(getByRole('table', { name: `January ${y}` })).toBeTruthy()
    expect(spy.mock.calls.some(([m]) => String(m).includes('4-digit'))).toBe(true)
  })

  it('warns when unnamed (not in error)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<YearView year={2026} density={DENSITY} />)
    expect(spy.mock.calls.some(([m]) => String(m).includes('YearView: needs an accessible name'))).toBe(true)
    spy.mockClear()
    renderUI(<YearView year={2026} density={DENSITY} state="error" />)
    expect(spy).not.toHaveBeenCalled()
  })

  it('TZ: under UTC−3 the 2026-10-01 cell is a Thursday and today rings Oct 8', () => {
    const { getByRole } = renderUI(year())
    const cells = within(getByRole('table', { name: 'October 2026' })).getAllByRole('cell')
    expect(cells[0].getAttribute('aria-label')).toMatch(/^Thursday, 1 October/)
    expect(cells[7].querySelector('.vida-year-today')).not.toBeNull()
  })

  it('forwards ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<YearView ref={ref} year={2026} density={DENSITY} aria-label="Year" />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })
})
