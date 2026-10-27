// @vitest-environment jsdom
// TZ guard: a negative-offset zone is where the 'YYYY-MM-DD'→UTC off-by-one bites. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { Text, View } from '@tamagui/core'
import { UIProvider } from '../provider'
import { LivingView, type HabitThread, type LivingDay, type PurposeBudget } from './living-view'

// the first render pays the cold Tamagui load — the week-view precedent
vi.setConfig({ testTimeout: 15000 })
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}
const cls = (el: Element | null, prefix: string) =>
  (el?.getAttribute('class')?.split(/\s+/) ?? [])
    .filter((c) => c.startsWith(prefix))
    .sort()
    .join(' ')

// The approved greybox week: Oct 5–11 2026, Thu 8 = today (PLAN-S5 / concept board data).
const P = { career: '#1D4ED8', health: '#5A6B3F', growth: '#9A2A2A', admin: '#64748B' }
const BUDGET: PurposeBudget[] = [
  { id: 'c', name: 'Career', color: P.career, hours: 6, fraction: 1 },
  { id: 'h', name: 'Health', color: P.health, hours: 0, fraction: 0 },
  { id: 'g', name: 'Growth', color: P.growth, hours: 4.5, fraction: 0.75 },
  { id: 'l', name: 'Learning', color: P.admin, hours: null, fraction: null },
]
const THREADS: HabitThread[] = [
  {
    id: 'm',
    name: 'Meditate',
    color: P.health,
    days: ['kept', 'kept', 'kept', 'today', 'future', 'future', 'future'],
    streak: '12-day streak',
  },
  {
    id: 'r',
    name: 'Read 20 min',
    color: P.growth,
    days: ['kept', 'missed', 'kept', 'today', 'future', 'future', 'future'],
    streak: 'broke Tue · back on',
  },
]
const DAYS: LivingDay[] = [
  {
    date: '2026-10-05',
    kind: 'past',
    record: 'Shipped the re-plan draft — a good, quiet start.',
    done: [{ id: 'd1', title: 'Re-plan draft', color: P.career }],
    focus: '2h40 deep focus',
  },
  {
    date: '2026-10-06',
    kind: 'past',
    record: 'Caught the finance import up.',
    done: [{ id: 'd2', title: '1:1 with Ana', color: P.career }],
    focus: '1h10 focus',
  },
  { date: '2026-10-07', kind: 'past', record: 'A slow one.', focus: '0h focus' },
  {
    date: '2026-10-08',
    kind: 'today',
    entries: [
      { kind: 'item', item: { id: 't1', title: 'Deep work', time: '09:00', color: P.career } },
      { kind: 'open', label: '2h open', hint: 'slot deep work or a study session?' },
      { kind: 'item', item: { id: 't2', title: 'Send proposal', color: P.career, slipping: true } },
      { kind: 'item', item: { id: 't3', title: 'Gym', time: '18:00', color: P.health } },
    ],
  },
  {
    date: '2026-10-09',
    kind: 'future',
    intent: 'Wrap the week, review what moved.',
    plan: [{ id: 'f1', title: 'Design sync', time: '11:00', color: P.career }],
  },
  {
    date: '2026-10-10',
    kind: 'future',
    intent: 'Rest. Nothing owed.',
    plan: [{ id: 'f2', title: 'Family lunch', color: P.health }],
  },
  { date: '2026-10-11', kind: 'future', intent: 'Plan the week ahead.' },
]
const living = (props: Partial<React.ComponentProps<typeof LivingView>> = {}) => (
  <LivingView days={DAYS} budget={BUDGET} threads={THREADS} weekLabel="This week" aria-label="Living" {...props} />
)

describe('LivingView — layout + lanes', () => {
  it('a named group: the two lane Cards + a keyboard-reachable region of 7 named day Cards', () => {
    const { getByRole } = renderUI(living())
    expect(getByRole('group', { name: 'Living' })).toBeTruthy()
    expect(getByRole('group', { name: 'Purpose budget · This week' })).toBeTruthy()
    expect(getByRole('group', { name: 'Habit threads' })).toBeTruthy()
    const region = getByRole('region', { name: 'Week columns' })
    expect(region.getAttribute('tabindex')).toBe('0')
    expect(within(region).getAllByRole('group')).toHaveLength(7)
    expect(getByRole('group', { name: 'Thu 8, today' })).toBeTruthy()
    expect(getByRole('group', { name: 'Mon 5' })).toBeTruthy()
  })

  it('weekLabel absent → the budget header reads "Purpose budget"', () => {
    const { getByRole } = renderUI(living({ weekLabel: undefined }))
    expect(getByRole('group', { name: 'Purpose budget' })).toBeTruthy()
  })

  it('budget entries: hours "6h" / "4h30"; zero = "0h · none yet"; null = "unmeasured" with no fill', () => {
    const { getByRole, container } = renderUI(living())
    const items = within(
      within(getByRole('group', { name: 'Purpose budget · This week' })).getByRole('list'),
    ).getAllByRole('listitem')
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining('Career, 6 hours'),
      expect.stringContaining('Health, 0 hours, none yet'),
      expect.stringContaining('Growth, 4 hours 30 minutes'),
      expect.stringContaining('Learning, unmeasured'),
    ])
    expect(container.textContent).toContain('0h · none yet')
    expect(container.textContent).toContain('4h30')
    const fills = container.querySelectorAll('.vida-living-fill')
    expect(fills).toHaveLength(3) // Learning (null) has no fill
    expect((fills[2] as HTMLElement).style.width).toBe('75%')
  })

  it('the zero entry is flagged in the emphasis token (not danger text); others are primary', () => {
    const { container } = renderUI(
      <>
        {living()}
        <Text data-ref="emph" color="$colorBrandEmphasis">
          r
        </Text>
        <Text data-ref="prim" color="$colorTextPrimary">
          r
        </Text>
      </>,
    )
    const names = container.querySelectorAll('.vida-living-budget-name')
    expect(cls(names[1], '_col-')).toBe(cls(container.querySelector('[data-ref="emph"]'), '_col-'))
    expect(cls(names[0], '_col-')).toBe(cls(container.querySelector('[data-ref="prim"]'), '_col-'))
  })

  it('stale: last-known hours + "as of last read"; ignored for null hours', () => {
    const { getByRole } = renderUI(
      living({
        budget: [
          { id: 'c', name: 'Career', color: P.career, hours: 2, fraction: 0.5, stale: true },
          { id: 'x', name: 'X', color: P.admin, hours: null, fraction: null, stale: true },
        ],
      }),
    )
    const items = within(
      within(getByRole('group', { name: 'Purpose budget · This week' })).getByRole('list'),
    ).getAllByRole('listitem')
    expect(items[0].textContent).toContain('Career, 2 hours, as of last read')
    expect(items[1].textContent).not.toContain('as of last read')
  })

  it('lane degrade: absent = "unavailable right now"; [] = "no … yet" (never blanks the view)', () => {
    const { container, rerender } = renderUI(living({ budget: undefined, threads: undefined }))
    expect(container.textContent).toContain('Purpose budget is unavailable right now.')
    expect(container.textContent).toContain('Habit threads are unavailable right now.')
    rerender(<UIProvider>{living({ budget: [], threads: [] })}</UIProvider>)
    expect(container.textContent).toContain('No purposes yet.')
    expect(container.textContent).toContain('No habits tracked yet.')
  })

  it('threads: one row each, 7 nodes with a class per state, 6 connectors, hollow nodes aria-hidden', () => {
    const { container, getByRole } = renderUI(living())
    const rows = within(within(getByRole('group', { name: 'Habit threads' })).getByRole('list')).getAllByRole(
      'listitem',
    )
    expect(rows).toHaveLength(2)
    expect(
      rows[1].querySelectorAll('.vida-thread-kept, .vida-thread-missed, .vida-thread-today, .vida-thread-future'),
    ).toHaveLength(7)
    expect(rows[1].querySelectorAll('.vida-thread-missed')).toHaveLength(1)
    expect(rows[1].querySelectorAll('.vida-thread-today')).toHaveLength(1)
    expect(rows[1].querySelectorAll('.vida-thread-future')).toHaveLength(3)
    expect(rows[1].querySelectorAll('.vida-thread-connector')).toHaveLength(6)
    expect(container.querySelector('.vida-thread-kept')?.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('a thread row reads as one sentence by weekday (TZ-safe), with the streak', () => {
    const { getByRole } = renderUI(living())
    const rows = within(within(getByRole('group', { name: 'Habit threads' })).getByRole('list')).getAllByRole(
      'listitem',
    )
    expect(rows[1].textContent).toContain(
      'Read 20 min: kept Mon, Wed; missed Tue; today Thu; upcoming Fri, Sat, Sun — broke Tue · back on',
    )
  })
})

describe('LivingView — S7 amendments (V13 color? · off)', () => {
  // A rest day (a non-daily habit's unscheduled day) + a thread/purpose with no colour source (D-S6-DEV-2/-3).
  const REST: HabitThread = {
    id: 'g',
    name: 'Gym',
    days: ['kept', 'off', 'missed', 'today', 'off', 'future', 'future'],
  }
  const UNCOLOURED: PurposeBudget = { id: 'u', name: 'Health', hours: null, fraction: null }
  const muted = () => {
    const ref = renderUI(<View className="ref" backgroundColor="$colorTextMuted" />)
    const out = { bg: cls(ref.container.querySelector('.ref'), '_backgroundColor-') }
    ref.unmount()
    expect(out.bg).not.toBe('') // a vacuous '' === '' comparison would pass anything
    return out
  }

  it('an off day is a distinct node (no ring) named "rest day", never "missed"', () => {
    const { getByRole } = renderUI(living({ threads: [REST] }))
    const row = within(within(getByRole('group', { name: 'Habit threads' })).getByRole('list')).getByRole('listitem')
    expect(row.querySelectorAll('.vida-thread-off')).toHaveLength(2)
    expect(row.querySelectorAll('.vida-thread-missed')).toHaveLength(1)
    // every day still draws a node + the connector runs through the rest days
    expect(row.querySelectorAll('[class*="vida-thread-"]:not(.vida-thread-connector)')).toHaveLength(7)
    expect(row.querySelectorAll('.vida-thread-connector')).toHaveLength(6)
    expect(row.textContent).toContain('Gym: kept Mon; missed Wed; today Thu; upcoming Sat, Sun; rest day Tue, Fri')
  })

  it('absent colour → the neutral muted ink (dot, node fill, connector), never a fabricated hex', () => {
    const ref = muted()
    const { getByRole } = renderUI(living({ threads: [REST], budget: [UNCOLOURED] }))
    const row = within(within(getByRole('group', { name: 'Habit threads' })).getByRole('list')).getByRole('listitem')
    expect(cls(row.querySelector('.vida-thread-kept'), '_backgroundColor-')).toBe(ref.bg)
    expect(cls(row.querySelector('.vida-thread-off'), '_backgroundColor-')).toBe(ref.bg)
    expect(cls(row.querySelector('.vida-thread-connector'), '_backgroundColor-')).toBe(ref.bg)
    const budget = within(getByRole('group', { name: /Purpose budget/ })).getByRole('listitem')
    expect(cls(budget.querySelector('.vida-living-dot'), '_backgroundColor-')).toBe(ref.bg)
    expect(budget.textContent).toContain('Health, unmeasured')
  })
})

describe('LivingView — temporal day Cards', () => {
  it('past = faded (flat), today = warm (edge), future = neutral', () => {
    const { getByRole } = renderUI(living())
    expect(getByRole('group', { name: 'Mon 5' }).className).toContain('vida-card-flat')
    const today = getByRole('group', { name: 'Thu 8, today' })
    expect(today.querySelector('.vida-card-edge')).not.toBeNull()
    const fri = getByRole('group', { name: 'Fri 9' })
    expect(fri.className).not.toContain('vida-card-flat')
    expect(fri.querySelector('.vida-card-edge')).toBeNull()
  })

  it('past: record + struck done with "(done)" + focus last', () => {
    const { getByRole } = renderUI(living())
    const mon = getByRole('group', { name: 'Mon 5' })
    expect(mon.textContent).toContain('Shipped the re-plan draft')
    // the spoken text lives in the inline label (a flex-level space would be dropped by the browser)
    expect(mon.querySelector('.vida-living-chip')?.textContent).toBe('Re-plan draft (done)')
    expect(mon.textContent?.trim().endsWith('2h40 deep focus')).toBe(true)
  })

  it('today: entries in provider order; time + title; slipping read once; open block read-only', () => {
    const { getByRole, queryAllByRole } = renderUI(living())
    const thu = getByRole('group', { name: 'Thu 8, today' })
    const items = within(thu).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    const labels = [...thu.querySelectorAll('.vida-living-chip')].map((l) => l.textContent)
    expect(labels).toEqual(['09:00 Deep work', 'Send proposal, slipping', '18:00 Gym'])
    expect(items[1].textContent).toContain('2h open')
    // the visible time is aria-hidden (the label carries it once)
    expect(items[0].querySelector('[aria-hidden="true"]')?.textContent).toBe('09:00')
    // the visible SLIPPING tag is aria-hidden (no double read)
    const tag = items[2].querySelector('.vida-living-slip')
    expect(tag?.getAttribute('aria-hidden')).toBe('true')
    // no handler → no button anywhere
    expect(queryAllByRole('button')).toHaveLength(0)
  })

  it('open time with a handler: a <button> named "{label}, {hint}" → onSlotOpenTime(date)', () => {
    const onSlot = vi.fn()
    const { getByRole } = renderUI(living({ onSlotOpenTime: onSlot }))
    const btn = getByRole('button', { name: '2h open, slot deep work or a study session?' })
    expect(btn.tagName).toBe('BUTTON')
    fireEvent.click(btn)
    expect(onSlot).toHaveBeenCalledWith('2026-10-08')
  })

  it('future: intent + plan chips', () => {
    const { getByRole } = renderUI(living())
    const fri = getByRole('group', { name: 'Fri 9' })
    expect(fri.textContent).toContain('Wrap the week, review what moved.')
    expect(fri.querySelector('.vida-living-chip')?.textContent).toBe('11:00 Design sync')
  })

  it('day numbers: serif subheading with the paired line-height', () => {
    const { container } = renderUI(
      <>
        {living()}
        <Text data-ref="sub" fontFamily="$display" fontSize="$subheading" lineHeight="$subheading">
          r
        </Text>
      </>,
    )
    const n = container.querySelector('.vida-living-daynum')
    expect(cls(n, '_lh-')).not.toBe('')
    expect(cls(n, '_lh-')).toBe(cls(container.querySelector('[data-ref="sub"]'), '_lh-'))
  })
})

describe('LivingView — review-folded coverage', () => {
  it('today header reads "· Today" with the number in the emphasis token', () => {
    const { getByRole, container } = renderUI(
      <>
        {living()}
        <Text data-ref="emph" color="$colorBrandEmphasis">
          r
        </Text>
      </>,
    )
    const thu = getByRole('group', { name: 'Thu 8, today' })
    expect(thu.textContent).toContain('Thu · Today')
    const nums = container.querySelectorAll('.vida-living-daynum')
    expect(cls(nums[3], '_col-')).toBe(cls(container.querySelector('[data-ref="emph"]'), '_col-'))
  })

  it('fraction is clamped (1.4 → 100%); NaN hours render "unmeasured"; NaN fraction → no fill', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container, getByRole } = renderUI(
      living({
        budget: [
          { id: 'a', name: 'A', color: P.admin, hours: 1, fraction: 1.4 },
          { id: 'b', name: 'B', color: P.admin, hours: Number.NaN, fraction: 0.2 },
          { id: 'c', name: 'C', color: P.admin, hours: 2, fraction: Number.NaN },
        ],
      }),
    )
    const fills = container.querySelectorAll('.vida-living-fill')
    expect(fills).toHaveLength(1)
    expect((fills[0] as HTMLElement).style.width).toBe('100%')
    const items = within(
      within(getByRole('group', { name: 'Purpose budget · This week' })).getByRole('list'),
    ).getAllByRole('listitem')
    expect(items[1].textContent).toContain('B, unmeasured')
  })

  it('state="empty" keeps lane data honest (no "No purposes yet." over a real purpose) + warns about day content', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { container } = renderUI(living({ state: 'empty' }))
    expect(container.textContent).not.toContain('No purposes yet.')
    expect(container.textContent).toContain('Career')
    expect(container.textContent).not.toContain('Shipped the re-plan draft')
    expect(spy.mock.calls.some(([m]) => String(m).includes('day content is not rendered'))).toBe(true)
  })

  it('success with nothing self-heals to empty + warns', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bare = DAYS.map(({ date, kind }) => ({ date, kind }))
    const { getByRole } = renderUI(living({ days: bare, budget: [], threads: [] }))
    expect(getByRole('status').textContent).toBe('Nothing this week.')
    expect(spy.mock.calls.some(([m]) => String(m).includes('pass state="empty"'))).toBe(true)
  })

  it('loading: skeleton day Cards aria-hidden; the region stays a tab stop (it still scrolls — axe)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole } = renderUI(living({ state: 'loading' }))
    const region = getByRole('region', { name: 'Week columns', hidden: true })
    expect(region.getAttribute('tabindex')).toBe('0')
    const cards = [...region.querySelectorAll('.vida-card')]
    expect(cards).toHaveLength(7)
    for (const c of cards) expect(c.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('LivingView — states + guards', () => {
  it('loading: aria-busy, skeleton day Cards hidden, no content', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole, container } = renderUI(living({ state: 'loading' }))
    expect(getByRole('group', { name: 'Living' }).getAttribute('aria-busy')).toBe('true')
    expect(container.textContent).not.toContain('Shipped the re-plan draft')
    expect(spy.mock.calls.some(([m]) => String(m).includes('stale render'))).toBe(true)
  })

  it('error: a status message (or the slot)', () => {
    const { getByRole, rerender } = renderUI(living({ state: 'error' }))
    expect(getByRole('status').textContent).toContain('Couldn’t load.')
    rerender(<UIProvider>{living({ state: 'error', error: <span>Week unavailable</span> })}</UIProvider>)
    expect(getByRole('status').textContent).toBe('Week unavailable')
  })

  it('empty: the designed layout + sr "Nothing this week." (or the slot replaces it)', () => {
    const bare = DAYS.map(({ date, kind }) => ({ date, kind }))
    const { getByRole, rerender, queryByRole } = renderUI(
      living({ days: bare, budget: [], threads: [], state: 'empty' }),
    )
    expect(getByRole('status').textContent).toBe('Nothing this week.')
    expect(getByRole('region', { name: 'Week columns' })).toBeTruthy()
    rerender(
      <UIProvider>
        {living({ days: bare, budget: [], threads: [], state: 'empty', empty: <span>Quiet week</span> })}
      </UIProvider>,
    )
    expect(getByRole('status').textContent).toBe('Quiet week')
    expect(queryByRole('region')).toBeNull()
  })

  it('an ABSENT lane never makes the view empty (unknown ≠ nothing)', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const bare = DAYS.map(({ date, kind }) => ({ date, kind }))
    const { queryByText } = renderUI(living({ days: bare, budget: undefined, threads: [] }))
    expect(queryByText('Nothing this week.')).toBeNull()
    expect(spy.mock.calls.some(([m]) => String(m).includes('pass state="empty"'))).toBe(false)
  })

  it('dev-warns: day count · two todays · thread length · fraction-null · bad hours · fraction range', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(
      living({
        days: [...DAYS.slice(0, 6), { date: '2026-10-11', kind: 'today' }],
        threads: [{ id: 'x', name: 'X', color: P.admin, days: ['kept', 'kept'] }],
        budget: [
          { id: 'a', name: 'A', color: P.admin, hours: 3, fraction: null },
          { id: 'b', name: 'B', color: P.admin, hours: Number.NaN, fraction: 0.2 },
          { id: 'c', name: 'C', color: P.admin, hours: 1, fraction: 1.4 },
        ],
      }),
    )
    const msgs = spy.mock.calls.map(([m]) => String(m)).join('\n')
    expect(msgs).toContain('more than one')
    expect(msgs).toContain('thread "x"')
    expect(msgs).toContain('fraction is null')
    expect(msgs).toContain('not a finite')
    expect(msgs).toContain('outside [0, 1]')
    spy.mockClear()
    renderUI(living({ days: DAYS.slice(0, 5) }))
    expect(spy.mock.calls.some(([m]) => String(m).includes('7 days'))).toBe(true)
  })

  it('warns when unnamed', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<LivingView days={DAYS} />)
    expect(spy.mock.calls.some(([m]) => String(m).includes('LivingView: needs an accessible name'))).toBe(true)
  })

  it('forwards ref to the root', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(living({ ref }))
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })
})
