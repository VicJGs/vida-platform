// @vitest-environment jsdom
// TZ guard: the week maths keys dates locally; UTC−3 is where a UTC slip shows. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
// fe-calendar #19 — S1 chrome fix (docs/specs/fixes/fe-calendar-s1-chrome-375): the <768 range-switcher condense (EC-1),
// lg range chrome, the honest period label, and clamped month/year nav. Breakpoint via the `__bp` override (the
// global-bar-1 test precedent).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import CalendarSurface from './index'
import { useCalendarUIStore } from '../../stores/calendar-ui-store'
import { usePreferencesStore } from '../../stores/preferences-store'

// "Now" = Sunday 2026-10-18 23:30 in Brasília — already Monday 02:30 in UTC. Locally the current week is Oct 12–18; a
// UTC slip would make it Oct 19–25 and the label assertions below fail.
const NOW = new Date('2026-10-18T23:30:00-03:00')
// The Year range mounts ~500 Tamagui nodes per render — past the 5s default under a loaded suite (week-view precedent).
vi.setConfig({ testTimeout: 15000 })

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterAll(() => vi.useRealTimers())
afterEach(() => {
  cleanup()
  useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-10-18' })
  // every store a test mutates is reset — a leftover Sunday week start would make the label tests order-dependent
  usePreferencesStore.setState({ weekStartsOn: 1, timeFormat: '24h' })
})

function renderSurface(bp: 'mobile' | 'tablet') {
  return render(
    <UIProvider>
      <CalendarSurface __bp={bp} />
    </UIProvider>,
  )
}
const titleOf = (c: HTMLElement) => c.querySelector('.vida-canvas-title')?.textContent ?? ''

it('the TZ guard is live (the pinned instant is still Sunday the 18th locally)', () => {
  expect(new Date().getDate()).toBe(18)
  expect(new Date().getDay()).toBe(0)
})

describe('CalendarSurface — range chrome', () => {
  it('<768 (mobile): the switcher condenses to a "Range: <active>" menu trigger — no toolbar', () => {
    useCalendarUIStore.setState({ range: 'agenda' })
    const { getByRole, queryByRole } = renderSurface('mobile')
    expect(queryByRole('toolbar', { name: 'Calendar range' })).toBeNull()
    expect(getByRole('button', { name: 'Range: Agenda' })).toBeTruthy()
  })

  it('<768: choosing a range from the menu switches the range', async () => {
    useCalendarUIStore.setState({ range: 'agenda' })
    const { getByRole, findByRole } = renderSurface('mobile')
    fireEvent.click(getByRole('button', { name: 'Range: Agenda' }))
    fireEvent.click(await findByRole('menuitem', { name: /Week/ }))
    expect(useCalendarUIStore.getState().range).toBe('week')
  })

  it('≥768 (tablet): the 6-range toolbar with aria-pressed on the active range', () => {
    useCalendarUIStore.setState({ range: 'month' })
    const { getByRole } = renderSurface('tablet')
    const bar = getByRole('toolbar', { name: 'Calendar range' })
    const pressed = Array.from(bar.querySelectorAll('[aria-pressed="true"]')).map((b) => b.textContent)
    expect(pressed).toEqual(['Month'])
    expect(bar.querySelectorAll('button')).toHaveLength(6)
  })
})

describe('CalendarSurface — honest period label', () => {
  it('Agenda on the CURRENT local week reads "This week · Oct 12 – Oct 18, 2026"', () => {
    useCalendarUIStore.setState({ range: 'agenda', focusedDate: '2026-10-18' })
    const { container } = renderSurface('tablet')
    expect(titleOf(container)).toBe('This week · Oct 12 – Oct 18, 2026')
  })

  it('Agenda on the NEXT week (the UTC "today") reads the bare span', () => {
    useCalendarUIStore.setState({ range: 'agenda', focusedDate: '2026-10-19' })
    const { container } = renderSurface('tablet')
    expect(titleOf(container)).toBe('Oct 19 – Oct 25, 2026')
  })

  it('Week never carries the "This week" prefix', () => {
    useCalendarUIStore.setState({ range: 'week', focusedDate: '2026-10-18' })
    const { container } = renderSurface('tablet')
    expect(titleOf(container)).toBe('Oct 12 – Oct 18, 2026')
  })
})

describe('CalendarSurface — month/year nav clamps the day', () => {
  it('Month › from Jan 31 lands on February (not March)', () => {
    useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-01-31' })
    const { container, getByRole } = renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Next' }))
    expect(titleOf(container)).toBe('February 2026')
    expect(useCalendarUIStore.getState().focusedDate).toBe('2026-02-28')
  })

  it('Month ‹ from Mar 31 lands on February (not staying in March)', () => {
    useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-03-31' })
    const { container, getByRole } = renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Previous' }))
    expect(titleOf(container)).toBe('February 2026')
  })

  it('Year › from Feb 29 2028 lands on Feb 28 2029', () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2028-02-29' })
    const { getByRole } = renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Next' }))
    expect(useCalendarUIStore.getState().focusedDate).toBe('2029-02-28')
  })
})

describe('CalendarSurface — Year dispatch + drill-in (S4)', () => {
  it('Year renders YearView: a named group of 12 month tables', () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-10-18' })
    const { getByRole, getAllByRole, container } = renderSurface('tablet')
    expect(titleOf(container)).toBe('2026')
    expect(getByRole('group', { name: 'Year' })).toBeTruthy()
    expect(getAllByRole('table')).toHaveLength(12)
    expect(getAllByRole('button', { name: /, open month$/ })).toHaveLength(12)
    expect(container.textContent).not.toContain('ships in a later slice of #19 (S4')
  })


  it('weekStartsOn=0 reaches the grid (Oct 1 2026 = Thursday → column 5)', () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-10-18' })
    const { getByRole } = renderSurface('tablet')
    const oct1 = getByRole('table', { name: 'October 2026' }).querySelector('[role="cell"]')
    expect(oct1?.getAttribute('aria-colindex')).toBe('5')
  })

  it('pressing a month drills into Month, keeps the day clamped, and lands focus on the Month grid', () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-01-31' })
    const { getByRole, container } = renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'March 2026, open month' }))
    expect(useCalendarUIStore.getState().range).toBe('month')
    expect(useCalendarUIStore.getState().focusedDate).toBe('2026-03-31')
    expect(titleOf(container)).toBe('March 2026')
    expect(document.activeElement).toBe(getByRole('table', { name: 'Month grid' }))
  })

  it('the drill clamps a long day into a short month (Mar 31 → February = Feb 28)', () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-03-31' })
    const { getByRole } = renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'February 2026, open month' }))
    expect(useCalendarUIStore.getState().focusedDate).toBe('2026-02-28')
  })

  it('switching to Month via the range switcher does NOT move focus (only the drill does)', () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-10-18' })
    const { getByRole } = renderSurface('tablet')
    const monthToggle = getByRole('button', { name: 'Month' })
    monthToggle.focus()
    fireEvent.click(monthToggle)
    expect(useCalendarUIStore.getState().range).toBe('month')
    expect(document.activeElement).toBe(getByRole('button', { name: 'Month' }))
  })
})

describe('CalendarSurface — Living dispatch (S5)', () => {
  it('Living renders LivingView: lanes + 7 named day Cards, the current week labelled "This week"', () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-18' })
    const { getByRole, container } = renderSurface('tablet')
    expect(getByRole('group', { name: 'Living' })).toBeTruthy()
    expect(getByRole('group', { name: 'Purpose budget · This week' })).toBeTruthy()
    expect(getByRole('group', { name: 'Habit threads' })).toBeTruthy()
    const region = getByRole('region', { name: 'Week columns' })
    // NOW = Sun Oct 18 (Monday start → Oct 12–18): today is the last Card
    expect(getByRole('group', { name: 'Mon 12' })).toBeTruthy()
    expect(getByRole('group', { name: 'Sun 18, today' })).toBeTruthy()
    expect(region.querySelectorAll('[role="group"]')).toHaveLength(7)
    // all six ranges are live — no placeholder copy remains anywhere
    expect(container.textContent).not.toContain('ships in a later slice')
  })

  it('no open-time button in M1 (the slotting capability is absent — deny-safe)', () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-18' })
    const { queryAllByRole } = renderSurface('tablet')
    expect(queryAllByRole('button', { name: /open,/ })).toHaveLength(0)
  })

  it('weekStartsOn=0 starts the Living week on Sunday', () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-18' })
    const { getByRole } = renderSurface('tablet')
    const first = getByRole('region', { name: 'Week columns' }).querySelector('[role="group"]')
    expect(getByRole('group', { name: 'Sun 18, today' })).toBe(first)
  })

  it('a future week: no today Card and no "today" thread node', () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-11-04' })
    const { getByRole, queryByRole, container } = renderSurface('tablet')
    expect(getByRole('group', { name: 'Purpose budget · Nov 2 – Nov 8, 2026' })).toBeTruthy()
    expect(queryByRole('group', { name: /, today$/ })).toBeNull()
    expect(container.querySelectorAll('.vida-thread-today')).toHaveLength(0)
    expect(container.querySelectorAll('.vida-thread-missed')).toHaveLength(0)
    expect(container.textContent).not.toContain('broke')
  })

  it('a past week: the budget is labelled with the span, and no day is today', () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-05' })
    const { getByRole, queryByRole } = renderSurface('tablet')
    expect(getByRole('group', { name: 'Purpose budget · Oct 5 – Oct 11, 2026' })).toBeTruthy()
    expect(queryByRole('group', { name: /, today$/ })).toBeNull()
  })
})

describe('CalendarSurface — Week/Day dispatch (S3)', () => {
  it('Week renders WeekView: 7 headed columns in a keyboard-reachable scroll region', () => {
    useCalendarUIStore.setState({ range: 'week', focusedDate: '2026-10-18' })
    const { getByRole } = renderSurface('tablet')
    expect(getByRole('group', { name: 'Week' })).toBeTruthy()
    expect(getByRole('region', { name: 'Week grid' })).toBeTruthy()
    // today (Sun 18, the last day of a Monday week) carries the rich fixture day
    expect(getByRole('list', { name: 'Sun 18, today' })).toBeTruthy()
  })

  it('Day renders WeekView with one column — the focused day only, no scroll region', () => {
    useCalendarUIStore.setState({ range: 'day', focusedDate: '2026-10-18' })
    const { getByRole, queryByRole, getAllByRole } = renderSurface('tablet')
    expect(getByRole('group', { name: 'Day' })).toBeTruthy()
    expect(queryByRole('region', { name: 'Week grid' })).toBeNull()
    expect(getAllByRole('list').map((l) => l.getAttribute('aria-labelledby') != null)).toContain(true)
    expect(getByRole('list', { name: 'All day' }).textContent).toBe('Spanish session')
  })
})

describe('CalendarSurface — locale prefs are READ (BR-16)', () => {
  it('weekStartsOn=0: Agenda on Sun Oct 18 reads "This week · Oct 18 – Oct 24, 2026"', () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'agenda', focusedDate: '2026-10-18' })
    const { container } = renderSurface('tablet')
    expect(titleOf(container)).toBe('This week · Oct 18 – Oct 24, 2026')
  })

  it('weekStartsOn=0: the Month grid starts on Sunday', () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-10-18' })
    const { getAllByRole } = renderSurface('tablet')
    expect(getAllByRole('columnheader')[0].textContent).toBe('Sun')
  })

  it('weekStartsOn=0: Week columns start on Sunday', () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'week', focusedDate: '2026-10-18' })
    const { container, getByRole } = renderSurface('tablet')
    expect(titleOf(container)).toBe('Oct 18 – Oct 24, 2026')
    // the COLUMNS (not just the label) start on Sunday: column 0's header names Sun 18's list
    expect(getByRole('list', { name: 'Sun 18, today' }).getAttribute('aria-labelledby')).toMatch(/-h-0$/)
  })

  it('timeFormat=12h reaches WeekView', () => {
    usePreferencesStore.setState({ timeFormat: '12h' })
    useCalendarUIStore.setState({ range: 'day', focusedDate: '2026-10-18' })
    const { getAllByText } = renderSurface('tablet')
    expect(getAllByText('8 am').length).toBeGreaterThan(0)
  })
})
