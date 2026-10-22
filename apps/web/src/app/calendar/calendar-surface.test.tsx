// @vitest-environment jsdom
// TZ guard: the week maths keys dates locally; UTC−3 is where a UTC slip shows. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
// fe-calendar #19 — S1 chrome fix (docs/specs/fixes/fe-calendar-s1-chrome-375): the <768 range-switcher condense (EC-1),
// lg range chrome, the honest period label, and clamped month/year nav. Breakpoint via the `__bp` override (the
// global-bar-1 test precedent).
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CalendarSurface from './index'
import { renderInShell } from '../../shell/test-router'
import { useCalendarUIStore } from '../../stores/calendar-ui-store'
import { usePreferencesStore } from '../../stores/preferences-store'

// "Now" = Sunday 2026-10-18 23:30 in Brasília — already Monday 02:30 in UTC. Locally the current week is Oct 12–18; a
// UTC slip would make it Oct 19–25 and the label assertions below fail.
const NOW = new Date('2026-10-18T23:30:00-03:00')
// The Year range mounts ~500 Tamagui nodes per render — past the 5s default under a loaded suite (week-view precedent).
vi.setConfig({ testTimeout: 15000 })

// S7: the live data plane reads getServices() — mocked here (empty by default; a test seeds `svc.due`).
const svc = vi.hoisted(() => ({ due: [] as unknown[] }))
vi.mock('../../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({
      sessions: {
        dueIn: async (r: { start: number }) => (r.start === Date.UTC(2026, 8, 28) ? svc.due : []),
        listAvailability: async () => [],
        listAvailabilityExceptions: async () => [],
        getSessionAnalytics: async () => ({ totalFocusSeconds: 0 }),
      },
      tasks: { listTasks: async () => [] },
      habits: { getCompletionGrid: async () => [] },
      purposes: { listPurposes: async () => [] },
      notes: { getPageByJournalDate: async () => null },
    }),
}))

beforeAll(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(NOW)
})
afterAll(() => vi.useRealTimers())
afterEach(() => {
  cleanup()
  useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-10-18', expandedDay: null })
  svc.due = []
  // every store a test mutates is reset — a leftover Sunday week start would make the label tests order-dependent
  usePreferencesStore.setState({ weekStartsOn: 1, timeFormat: '24h' })
})

// The S1–S5 assertions read the fixture content → the DEV `?sample` path (router-subscribed, BR-CAL-S7-5); `live: true`
// renders the live data plane over the mocked services.
function renderSurface(bp: 'mobile' | 'tablet', { live = false }: { live?: boolean } = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderInShell(
    <QueryClientProvider client={qc}>
      <CalendarSurface __bp={bp} />
    </QueryClientProvider>,
    live ? '/' : '/?sample',
  )
}
const titleOf = (c: HTMLElement) => c.querySelector('.vida-canvas-title')?.textContent ?? ''

it('the TZ guard is live (the pinned instant is still Sunday the 18th locally)', () => {
  expect(new Date().getDate()).toBe(18)
  expect(new Date().getDay()).toBe(0)
})

describe('CalendarSurface — range chrome', () => {
  it('<768 (mobile): the switcher condenses to a "Range: <active>" menu trigger — no toolbar', async () => {
    useCalendarUIStore.setState({ range: 'agenda' })
    const { getByRole, queryByRole } = await renderSurface('mobile')
    expect(queryByRole('toolbar', { name: 'Calendar range' })).toBeNull()
    expect(getByRole('button', { name: 'Range: Agenda' })).toBeTruthy()
  })

  it('<768: choosing a range from the menu switches the range', async () => {
    useCalendarUIStore.setState({ range: 'agenda' })
    const { getByRole, findByRole } = await renderSurface('mobile')
    fireEvent.click(getByRole('button', { name: 'Range: Agenda' }))
    fireEvent.click(await findByRole('menuitem', { name: /Week/ }))
    expect(useCalendarUIStore.getState().range).toBe('week')
  })

  it('≥768 (tablet): the 6-range toolbar with aria-pressed on the active range', async () => {
    useCalendarUIStore.setState({ range: 'month' })
    const { getByRole } = await renderSurface('tablet')
    const bar = getByRole('toolbar', { name: 'Calendar range' })
    const pressed = Array.from(bar.querySelectorAll('[aria-pressed="true"]')).map((b) => b.textContent)
    expect(pressed).toEqual(['Month'])
    expect(bar.querySelectorAll('button')).toHaveLength(6)
  })
})

describe('CalendarSurface — honest period label', () => {
  it('Agenda on the CURRENT local week reads "This week · Oct 12 – Oct 18, 2026"', async () => {
    useCalendarUIStore.setState({ range: 'agenda', focusedDate: '2026-10-18' })
    const { container } = await renderSurface('tablet')
    expect(titleOf(container)).toBe('This week · Oct 12 – Oct 18, 2026')
  })

  it('Agenda on the NEXT week (the UTC "today") reads the bare span', async () => {
    useCalendarUIStore.setState({ range: 'agenda', focusedDate: '2026-10-19' })
    const { container } = await renderSurface('tablet')
    expect(titleOf(container)).toBe('Oct 19 – Oct 25, 2026')
  })

  it('Week never carries the "This week" prefix', async () => {
    useCalendarUIStore.setState({ range: 'week', focusedDate: '2026-10-18' })
    const { container } = await renderSurface('tablet')
    expect(titleOf(container)).toBe('Oct 12 – Oct 18, 2026')
  })
})

describe('CalendarSurface — month/year nav clamps the day', () => {
  it('Month › from Jan 31 lands on February (not March)', async () => {
    useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-01-31' })
    const { container, getByRole } = await renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Next' }))
    expect(titleOf(container)).toBe('February 2026')
    expect(useCalendarUIStore.getState().focusedDate).toBe('2026-02-28')
  })

  it('Month ‹ from Mar 31 lands on February (not staying in March)', async () => {
    useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-03-31' })
    const { container, getByRole } = await renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Previous' }))
    expect(titleOf(container)).toBe('February 2026')
  })

  it('Year › from Feb 29 2028 lands on Feb 28 2029', async () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2028-02-29' })
    const { getByRole } = await renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Next' }))
    expect(useCalendarUIStore.getState().focusedDate).toBe('2029-02-28')
  })
})

describe('CalendarSurface — Year dispatch + drill-in (S4)', () => {
  it('Year renders YearView: a named group of 12 month tables', async () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-10-18' })
    const { getByRole, getAllByRole, container } = await renderSurface('tablet')
    expect(titleOf(container)).toBe('2026')
    expect(getByRole('group', { name: 'Year' })).toBeTruthy()
    expect(getAllByRole('table')).toHaveLength(12)
    expect(getAllByRole('button', { name: /, open month$/ })).toHaveLength(12)
    expect(container.textContent).not.toContain('ships in a later slice of #19 (S4')
  })

  it('weekStartsOn=0 reaches the grid (Oct 1 2026 = Thursday → column 5)', async () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-10-18' })
    const { getByRole } = await renderSurface('tablet')
    const oct1 = getByRole('table', { name: 'October 2026' }).querySelector('[role="cell"]')
    expect(oct1?.getAttribute('aria-colindex')).toBe('5')
  })

  it('pressing a month drills into Month, keeps the day clamped, and lands focus on the Month grid', async () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-01-31' })
    const { getByRole, container } = await renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'March 2026, open month' }))
    expect(useCalendarUIStore.getState().range).toBe('month')
    expect(useCalendarUIStore.getState().focusedDate).toBe('2026-03-31')
    expect(titleOf(container)).toBe('March 2026')
    expect(document.activeElement).toBe(getByRole('table', { name: 'Month grid' }))
  })

  it('the drill clamps a long day into a short month (Mar 31 → February = Feb 28)', async () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-03-31' })
    const { getByRole } = await renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'February 2026, open month' }))
    expect(useCalendarUIStore.getState().focusedDate).toBe('2026-02-28')
  })

  it('switching to Month via the range switcher does NOT move focus (only the drill does)', async () => {
    useCalendarUIStore.setState({ range: 'year', focusedDate: '2026-10-18' })
    const { getByRole } = await renderSurface('tablet')
    const monthToggle = getByRole('button', { name: 'Month' })
    monthToggle.focus()
    fireEvent.click(monthToggle)
    expect(useCalendarUIStore.getState().range).toBe('month')
    expect(document.activeElement).toBe(getByRole('button', { name: 'Month' }))
  })
})

describe('CalendarSurface — Living dispatch (S5)', () => {
  it('Living renders LivingView: lanes + 7 named day Cards, the current week labelled "This week"', async () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-18' })
    const { getByRole, container } = await renderSurface('tablet')
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

  it('no open-time button in M1 (the slotting capability is absent — deny-safe)', async () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-18' })
    const { queryAllByRole } = await renderSurface('tablet')
    expect(queryAllByRole('button', { name: /open,/ })).toHaveLength(0)
  })

  it('weekStartsOn=0 starts the Living week on Sunday', async () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-18' })
    const { getByRole } = await renderSurface('tablet')
    const first = getByRole('region', { name: 'Week columns' }).querySelector('[role="group"]')
    expect(getByRole('group', { name: 'Sun 18, today' })).toBe(first)
  })

  it('a future week: no today Card and no "today" thread node', async () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-11-04' })
    const { getByRole, queryByRole, container } = await renderSurface('tablet')
    expect(getByRole('group', { name: 'Purpose budget · Nov 2 – Nov 8, 2026' })).toBeTruthy()
    expect(queryByRole('group', { name: /, today$/ })).toBeNull()
    expect(container.querySelectorAll('.vida-thread-today')).toHaveLength(0)
    expect(container.querySelectorAll('.vida-thread-missed')).toHaveLength(0)
    expect(container.textContent).not.toContain('broke')
  })

  it('a past week: the budget is labelled with the span, and no day is today', async () => {
    useCalendarUIStore.setState({ range: 'living', focusedDate: '2026-10-05' })
    const { getByRole, queryByRole } = await renderSurface('tablet')
    expect(getByRole('group', { name: 'Purpose budget · Oct 5 – Oct 11, 2026' })).toBeTruthy()
    expect(queryByRole('group', { name: /, today$/ })).toBeNull()
  })
})

describe('CalendarSurface — Week/Day dispatch (S3)', () => {
  it('Week renders WeekView: 7 headed columns in a keyboard-reachable scroll region', async () => {
    useCalendarUIStore.setState({ range: 'week', focusedDate: '2026-10-18' })
    const { getByRole } = await renderSurface('tablet')
    expect(getByRole('group', { name: 'Week' })).toBeTruthy()
    expect(getByRole('region', { name: 'Week grid' })).toBeTruthy()
    // today (Sun 18, the last day of a Monday week) carries the rich fixture day
    expect(getByRole('list', { name: 'Sun 18, today' })).toBeTruthy()
  })

  it('Day renders WeekView with one column — the focused day only, no scroll region', async () => {
    useCalendarUIStore.setState({ range: 'day', focusedDate: '2026-10-18' })
    const { getByRole, queryByRole, getAllByRole } = await renderSurface('tablet')
    expect(getByRole('group', { name: 'Day' })).toBeTruthy()
    expect(queryByRole('region', { name: 'Week grid' })).toBeNull()
    expect(getAllByRole('list').map((l) => l.getAttribute('aria-labelledby') != null)).toContain(true)
    expect(getByRole('list', { name: 'All day' }).textContent).toBe('Spanish session')
  })
})

describe('CalendarSurface — locale prefs are READ (BR-16)', () => {
  it('weekStartsOn=0: Agenda on Sun Oct 18 reads "This week · Oct 18 – Oct 24, 2026"', async () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'agenda', focusedDate: '2026-10-18' })
    const { container } = await renderSurface('tablet')
    expect(titleOf(container)).toBe('This week · Oct 18 – Oct 24, 2026')
  })

  it('weekStartsOn=0: the Month grid starts on Sunday', async () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'month', focusedDate: '2026-10-18', expandedDay: null })
    svc.due = []
    const { getAllByRole } = await renderSurface('tablet')
    expect(getAllByRole('columnheader')[0].textContent).toBe('Sun')
  })

  it('weekStartsOn=0: Week columns start on Sunday', async () => {
    usePreferencesStore.setState({ weekStartsOn: 0 })
    useCalendarUIStore.setState({ range: 'week', focusedDate: '2026-10-18' })
    const { container, getByRole } = await renderSurface('tablet')
    expect(titleOf(container)).toBe('Oct 18 – Oct 24, 2026')
    // the COLUMNS (not just the label) start on Sunday: column 0's header names Sun 18's list
    expect(getByRole('list', { name: 'Sun 18, today' }).getAttribute('aria-labelledby')).toMatch(/-h-0$/)
  })

  it('timeFormat=12h reaches WeekView', async () => {
    usePreferencesStore.setState({ timeFormat: '12h' })
    useCalendarUIStore.setState({ range: 'day', focusedDate: '2026-10-18' })
    const { getAllByText } = await renderSurface('tablet')
    expect(getAllByText('8 am').length).toBeGreaterThan(0)
  })
})

describe('CalendarSurface — S7 live data plane + motion + unfurl', () => {
  const due = (i: number, day: string) => ({
    source_module: 'purposes',
    ref_id: `p${i}`,
    label: `Review ${i}`,
    est_minutes: 15,
    urgency: 0,
    hard_deadline: Date.UTC(2026, 9, Number(day)),
  })

  it('prod path (no ?sample): Month shows the LIVE chips, never the fixtures', async () => {
    svc.due = [due(1, '14')]
    const { findByText, container } = await renderSurface('tablet', { live: true })
    expect(await findByText('Review 1')).toBeTruthy()
    expect(container.textContent).not.toContain('Re-plan draft') // a fixture title
  })

  it('a dense live day unfurls in place, and a month change collapses it (the store owns collapse)', async () => {
    svc.due = [1, 2, 3, 4, 5].map((i) => due(i, '14'))
    const { findByRole, getByRole, queryByRole } = await renderSurface('tablet', { live: true })
    fireEvent.click(await findByRole('button', { name: 'Show all 5 items, 14 October 2026' }))
    expect(useCalendarUIStore.getState().expandedDay).toBe('2026-10-14')
    const region = await findByRole('cell', { name: 'All items, 14 October 2026' })
    expect(region.textContent).toContain('Review 5')
    fireEvent.click(getByRole('button', { name: 'Next' }))
    expect(useCalendarUIStore.getState().expandedDay).toBeNull()
    await waitFor(() => expect(queryByRole('cell', { name: /All items/ })).toBeNull())
  })

  it('Today pulses the today mark (never on mount); a range switch fades the region in', async () => {
    const { getByRole, container } = await renderSurface('tablet')
    expect(container.querySelector('.vida-today-pulse')).toBeNull()
    expect(container.querySelector('.vida-range-fade')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Today' }))
    expect(container.querySelector('.vida-cal-today.vida-today-pulse')).not.toBeNull()
    fireEvent.click(getByRole('button', { name: 'Week' }))
    expect(container.querySelector('.vida-range-fade')).not.toBeNull()
  })

  it('the pulse never REPLAYS on a later remount — only a fresh Today press pulses (g2 review #1)', async () => {
    const { getByRole, container } = await renderSurface('tablet')
    fireEvent.click(getByRole('button', { name: 'Today' }))
    expect(container.querySelector('.vida-today-pulse')).not.toBeNull()
    fireEvent.click(getByRole('button', { name: 'Next' }))
    fireEvent.click(getByRole('button', { name: 'Previous' })) // back on the current month — the today cell remounts
    expect(container.querySelector('.vida-today-pulse')).toBeNull()
    fireEvent.click(getByRole('button', { name: 'Today' }))
    fireEvent.click(getByRole('button', { name: 'Week' })) // a range switch remounts every today mark
    expect(container.querySelector('.vida-today-pulse')).toBeNull()
  })
})
