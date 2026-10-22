// @vitest-environment jsdom
// TZ guard: a negative-offset zone is where the 'YYYY-MM-DD'→UTC off-by-one bites. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, within } from '@testing-library/react'
import { UIProvider } from '../provider'
import { WeekView, type CalChip, type TimedBlock } from './week-view'

// the first render pays the cold Tamagui load (~6s under a parallel suite) — the canvas-reader/flow-session precedent
vi.setConfig({ testTimeout: 15000 })
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

// The approved greybox week: Oct 5–11 2026, Thu 8 = today.
const TODAY = '2026-10-08'
const WEEK = ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']
const BLOCKS: TimedBlock[] = [
  { id: 'm', title: 'Re-plan draft', day: '2026-10-05', startHour: 9, color: '#2563EB' },
  { id: 't', title: 'Deep work', day: '2026-10-08', startHour: 9, endHour: 10.5 },
  { id: 'f', title: 'Design sync', day: '2026-10-09', startHour: 11 },
]
const CHIPS: CalChip[] = [
  { id: 'c1', title: 'Spanish session', color: '#B23733' },
  { id: 'c2', title: 'Read ch. 4' },
]

describe('WeekView', () => {
  it('Week: a named group with a keyboard-reachable scroll region, 7 headed columns, the all-day strip', () => {
    const { getByRole, getAllByRole } = renderUI(
      <WeekView days={WEEK} blocks={BLOCKS} allDay={CHIPS} today={TODAY} aria-label="Week" />,
    )
    expect(getByRole('group', { name: 'Week' })).toBeTruthy()
    const region = getByRole('region', { name: 'Week grid' })
    expect(region.getAttribute('tabindex')).toBe('0')
    const allDay = getByRole('list', { name: 'All day' })
    expect(within(allDay).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Spanish session', 'Read ch. 4'])
    // one list per day WITH blocks (Mon · Thu · Fri) + the all-day list
    expect(getAllByRole('list')).toHaveLength(4)
  })

  it('per-day lists are named by their column header; items read "time title"', () => {
    const { getByRole } = renderUI(<WeekView days={WEEK} blocks={BLOCKS} today={TODAY} aria-label="Week" />)
    const thu = getByRole('list', { name: 'Thu 8, today' })
    expect(within(thu).getByRole('listitem').textContent).toBe('09:00–10:30 Deep work')
    const mon = getByRole('list', { name: 'Mon 5' })
    expect(within(mon).getByRole('listitem').textContent).toBe('09:00 Re-plan draft')
  })

  it('no listitem has an aria-hidden ancestor (the hour layer is a sibling, not a parent)', () => {
    const { getAllByRole } = renderUI(<WeekView days={WEEK} blocks={BLOCKS} allDay={CHIPS} aria-label="Week" />)
    for (const li of getAllByRole('listitem')) expect(li.closest('[aria-hidden="true"]')).toBeNull()
  })

  it('the ONLY focusable element in Week is the scroll region; Day has none', () => {
    const { container, unmount } = renderUI(<WeekView days={WEEK} blocks={BLOCKS} aria-label="Week" />)
    expect(container.querySelectorAll('[tabindex], button, a, input')).toHaveLength(1)
    unmount()
    const day = renderUI(<WeekView days={[TODAY]} blocks={BLOCKS} aria-label="Day" />)
    expect(day.container.querySelectorAll('[tabindex], button, a, input')).toHaveLength(0)
    expect(day.queryByRole('region')).toBeNull()
  })

  it('Day = the same component with one column; only that day’s blocks render', () => {
    const { getAllByRole } = renderUI(<WeekView days={[TODAY]} blocks={BLOCKS} today={TODAY} aria-label="Day" />)
    const items = getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['09:00–10:30 Deep work'])
  })

  it('Day + today → underline mark + sr ", today"', () => {
    const { container, getByRole } = renderUI(<WeekView days={[TODAY]} blocks={BLOCKS} today={TODAY} aria-label="Day" />)
    expect(container.querySelector('.vida-week-today')).toBeTruthy()
    expect(getByRole('list', { name: /, today/ })).toBeTruthy()
  })

  it('auto-extends the window: early and late blocks both render (gutter shows 06:00 and 21:00)', () => {
    const blocks: TimedBlock[] = [
      { id: 'run', title: 'Run', day: TODAY, startHour: 6.5 },
      { id: 'call', title: 'Call', day: TODAY, startHour: 21 },
    ]
    const { getAllByRole, getAllByText } = renderUI(<WeekView days={[TODAY]} blocks={blocks} aria-label="Day" />)
    expect(getAllByRole('listitem')).toHaveLength(2)
    // each appears twice: the gutter hour label + the block's own time
    expect(getAllByText('06:00').length).toBeGreaterThan(0)
    expect(getAllByText('21:00')).toHaveLength(2)
  })

  it('overlapping blocks sit side by side (half width, offset lane)', () => {
    const blocks: TimedBlock[] = [
      { id: 'a', title: 'A', day: TODAY, startHour: 9, endHour: 11 },
      { id: 'b', title: 'B', day: TODAY, startHour: 10, endHour: 12 },
      { id: 'c', title: 'C', day: TODAY, startHour: 13 },
    ]
    const { container } = renderUI(<WeekView days={[TODAY]} blocks={blocks} aria-label="Day" />)
    const els = [...container.querySelectorAll<HTMLElement>('.vida-week-block')]
    expect(els.map((e) => [e.style.left, e.style.width])).toEqual([
      ['0%', '50%'],
      ['50%', '50%'],
      ['0%', '100%'],
    ])
  })

  it('timeFormat="12h" formats gutter and block labels', () => {
    const blocks: TimedBlock[] = [{ id: 'a', title: 'Lunch', day: TODAY, startHour: 12.5, endHour: 13.5 }]
    const { getByRole, getByText } = renderUI(<WeekView days={[TODAY]} blocks={blocks} timeFormat="12h" aria-label="Day" />)
    expect(getByRole('listitem').textContent).toBe('12:30 pm–1:30 pm Lunch')
    expect(getByText('8 am')).toBeTruthy()
    expect(getByText('12 pm')).toBeTruthy()
  })

  it('guards: day ∉ days and bad startHour are skipped; end ≤ start draws 1h but LABELS the start only (no invented end) — each dev-warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const blocks: TimedBlock[] = [
      { id: 'x', title: 'Elsewhere', day: '2026-12-25', startHour: 9 },
      { id: 'n', title: 'Broken', day: TODAY, startHour: Number.NaN },
      { id: 'e', title: 'Backwards', day: TODAY, startHour: 10, endHour: 9 },
    ]
    const { getAllByRole } = renderUI(<WeekView days={[TODAY]} blocks={blocks} aria-label="Day" />)
    expect(getAllByRole('listitem').map((li) => li.textContent)).toEqual(['10:00 Backwards'])
    const msgs = spy.mock.calls.map((c) => String(c[0]))
    expect(msgs.some((m) => m.includes('"x"'))).toBe(true)
    expect(msgs.some((m) => m.includes('"n"'))).toBe(true)
    expect(msgs.some((m) => m.includes('"e"'))).toBe(true)
  })

  it('a NaN block beside a valid one still yields a finite window', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const blocks: TimedBlock[] = [
      { id: 'n', title: 'Broken', day: TODAY, startHour: Number.NaN },
      { id: 'ok', title: 'Fine', day: TODAY, startHour: 9 },
    ]
    const { getByText } = renderUI(<WeekView days={[TODAY]} blocks={blocks} aria-label="Day" />)
    expect(getByText('08:00')).toBeTruthy()
    expect(getByText('19:00')).toBeTruthy()
  })

  it('invalid `hours` → the default window + a dev-warn', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByText } = renderUI(<WeekView days={[TODAY]} blocks={[]} allDay={CHIPS} hours={[8.5, 20]} aria-label="Day" />)
    expect(getByText('08:00')).toBeTruthy()
    expect(spy.mock.calls.some((c) => String(c[0]).includes('`hours`'))).toBe(true)
  })

  it('states: loading → aria-busy skeleton, no listitems', () => {
    const { getByRole, queryAllByRole } = renderUI(<WeekView days={WEEK} blocks={[]} state="loading" aria-label="Week" />)
    expect(getByRole('group', { name: 'Week' }).getAttribute('aria-busy')).toBe('true')
    expect(queryAllByRole('listitem')).toHaveLength(0)
  })

  it('states: error → role="status" message, or the slot', () => {
    const a = renderUI(<WeekView days={WEEK} blocks={[]} state="error" />)
    expect(a.getByRole('status').textContent).toMatch(/load/i)
    a.unmount()
    const b = renderUI(<WeekView days={WEEK} blocks={[]} state="error" error={<span>Calm error</span>} />)
    expect(b.getByRole('status').textContent).toBe('Calm error')
  })

  it('states: empty → the designed grid (headers + gutter) + an sr status; the slot overrides', () => {
    const a = renderUI(<WeekView days={WEEK} blocks={[]} state="empty" aria-label="Week" />)
    expect(a.getByRole('status').textContent).toMatch(/Nothing scheduled/)
    expect(a.getByText('08:00')).toBeTruthy()
    expect(a.queryAllByRole('listitem')).toHaveLength(0)
    a.unmount()
    const b = renderUI(<WeekView days={WEEK} blocks={[]} state="empty" empty={<span>Teach me</span>} />)
    expect(b.getByRole('status').textContent).toBe('Teach me')
  })

  it('all-invalid input lands on the designed empty grid (not error); zero blocks + chips stays success', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bad: TimedBlock[] = [{ id: 'x', title: 'X', day: '2030-01-01', startHour: 9 }]
    const a = renderUI(<WeekView days={WEEK} blocks={bad} aria-label="Week" />)
    expect(a.getByRole('status').textContent).toMatch(/Nothing scheduled/)
    a.unmount()
    const b = renderUI(<WeekView days={WEEK} blocks={[]} allDay={CHIPS} aria-label="Week" />)
    expect(b.queryByRole('status')).toBeNull()
    expect(b.getByRole('list', { name: 'All day' })).toBeTruthy()
  })

  it('a compact block shows only its start but keeps the full range in its accessible text', () => {
    const blocks: TimedBlock[] = [{ id: 'q', title: 'Quick check', day: TODAY, startHour: 12, endHour: 12.5 }]
    const { getByRole } = renderUI(<WeekView days={[TODAY]} blocks={blocks} aria-label="Day" />)
    const li = getByRole('listitem')
    // visible "12:00" (aria-hidden) + the sr-only full range + separator + title
    expect(li.textContent).toBe('12:0012:00–12:30 Quick check')
    expect(li.querySelector('[aria-hidden="true"]:not(:empty)')?.textContent).toBe('12:00')
  })

  it('a block sharing its column shows only its start visually (full range kept for SR) — D-S3-DEV-1', () => {
    const blocks: TimedBlock[] = [
      { id: 'a', title: 'Deep work', day: TODAY, startHour: 9, endHour: 10.5 },
      { id: 'b', title: 'Call', day: TODAY, startHour: 10, endHour: 11 },
    ]
    const { getAllByRole } = renderUI(<WeekView days={[TODAY]} blocks={blocks} aria-label="Day" />)
    const [a1] = getAllByRole('listitem')
    expect(a1.textContent).toBe('09:0009:00–10:30 Deep work')
  })

  it('state="empty" with items present renders none of them (+ dev-warn) — never items under "Nothing scheduled"', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { queryAllByRole, getByRole } = renderUI(
      <WeekView days={WEEK} blocks={BLOCKS} allDay={CHIPS} state="empty" aria-label="Week" />,
    )
    expect(queryAllByRole('listitem')).toHaveLength(0)
    expect(getByRole('status').textContent).toMatch(/Nothing scheduled/)
    expect(spy.mock.calls.some((c) => String(c[0]).includes('state="empty"'))).toBe(true)
  })

  it('warns when unnamed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<WeekView days={WEEK} blocks={BLOCKS} />)
    expect(spy).toHaveBeenCalled()
  })

  it('TZ-safe: a month-boundary YYYY-MM-DD renders its LOCAL weekday/number under America/Sao_Paulo', () => {
    const { getByRole } = renderUI(
      <WeekView days={['2026-11-01']} blocks={[{ id: 'a', title: 'A', day: '2026-11-01', startHour: 9 }]} aria-label="Day" />,
    )
    // 2026-11-01 is a Sunday; new Date('2026-11-01') would be Oct 31 (Sat) in UTC−3.
    expect(getByRole('list', { name: 'Sun 1' })).toBeTruthy()
  })

  it('forwards ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<WeekView ref={ref} days={WEEK} blocks={BLOCKS} aria-label="Week" />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })
})
