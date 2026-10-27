// @vitest-environment jsdom
// TZ guard: a negative-offset zone is where the 'YYYY-MM-DD'→UTC off-by-one bites. Set before any Date use.
process.env.TZ = 'America/Sao_Paulo'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { UIProvider } from '../provider'
import { AgendaView, type AgendaDay } from './agenda-view'

afterEach(cleanup)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

// The approved greybox week: Thu Oct 8 2026 = today (dayparted); Fri/Sat flat; Wed has nothing (skipped).
const TODAY = '2026-10-08'
const WEEK: AgendaDay[] = [
  { date: '2026-10-07', items: [] },
  {
    date: '2026-10-08',
    items: [
      { id: 'a', title: 'Read ch. 4', daypart: 'evening', weight: 'can' },
      { id: 'b', title: 'Morning check-in', daypart: 'morning', done: true },
      {
        id: 'c',
        title: 'Finish the re-plan draft',
        daypart: 'morning',
        time: '09:30',
        weight: 'must',
        color: '#2563EB',
      },
      { id: 'd', title: 'Call Mariana', daypart: 'afternoon', time: '17:00', done: false },
    ],
  },
  {
    date: '2026-10-09',
    items: [
      { id: 'e', title: 'Design sync', daypart: 'morning', time: '11:00', done: false },
      { id: 'f', title: 'Weekly review', daypart: 'evening', weight: 'can' },
    ],
  },
]

describe('AgendaView', () => {
  it('renders a named role="group" of day lists; rows are role="listitem"', () => {
    const { getByRole, getAllByRole } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect(getByRole('group', { name: 'Agenda' })).toBeTruthy()
    // today = 3 daypart lists + Friday = 1 flat list
    expect(getAllByRole('list')).toHaveLength(4)
    expect(getAllByRole('listitem')).toHaveLength(6)
  })

  it('skips a day with no items (Wednesday absent)', () => {
    const { queryByText } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect(queryByText('Wednesday')).toBeNull()
    expect(queryByText('Thursday')).not.toBeNull()
  })

  it('groups ONLY today under Morning → Afternoon → Evening, in fixed order; other days are flat', () => {
    const { getAllByRole, getByRole } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    const lists = getAllByRole('list')
    // aria-labelledby = [day, part] for today's lists → names compose day + daypart, in order
    expect(lists[0].getAttribute('aria-labelledby')?.split(' ')).toHaveLength(2)
    // each daypart list's composed name ends with its part → assert the POSITION, i.e. the fixed order
    ;['Morning', 'Afternoon', 'Evening'].forEach((p, i) => {
      expect(getByRole('list', { name: new RegExp(`Thursday.*${p}$`) })).toBe(lists[i])
    })
    // input order preserved within a daypart (b before c), evening item moved after afternoon
    expect(
      within(lists[0])
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual([expect.stringContaining('Morning check-in'), expect.stringContaining('Finish the re-plan draft')])
    expect(within(lists[2]).getByText('Read ch. 4')).toBeTruthy()
    // Friday: ONE flat list, single-id labelledby, no daypart eyebrows inside its day
    expect(lists[3].getAttribute('aria-labelledby')?.split(' ')).toHaveLength(1)
    expect(within(lists[3]).getAllByRole('listitem')).toHaveLength(2)
  })

  it('omits an empty daypart header (no part rendered for a part with no items)', () => {
    const days: AgendaDay[] = [{ date: TODAY, items: [{ id: 'x', title: 'Only evening', daypart: 'evening' }] }]
    const { queryByText } = renderUI(<AgendaView days={days} today={TODAY} aria-label="Agenda" />)
    expect(queryByText('Morning')).toBeNull()
    expect(queryByText('Afternoon')).toBeNull()
    expect(queryByText('Evening')).not.toBeNull()
  })

  it('marks today (accent day + "Today" eyebrow); a non-today day has none', () => {
    const { getAllByText } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect(getAllByText('Today')).toHaveLength(1)
  })

  it('timed rows show the tabular time; untimed rows show "All day"', () => {
    const { getByText, getAllByText } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect((getByText('09:30') as HTMLElement).style.fontVariantNumeric).toBe('tabular-nums')
    expect(getAllByText('All day').length).toBe(3) // b, a, f
  })

  it('renders Must / Can weight tags; no tag when weight is absent', () => {
    const { getAllByText } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect(getAllByText('Must')).toHaveLength(1)
    expect(getAllByText('Can')).toHaveLength(2)
  })

  it('a done row is struck through', () => {
    const { getByText } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    const title = getByText('Morning check-in')
    expect(getComputedStyle(title).textDecorationLine || title.getAttribute('style')).toContain('line-through')
  })

  it('completion control: role="checkbox" only for completable items when onToggleItem is given', () => {
    const { getAllByRole } = renderUI(
      <AgendaView days={WEEK} today={TODAY} onToggleItem={() => {}} aria-label="Agenda" />,
    )
    // b (done), d, e are completable; a, c, f are not
    const boxes = getAllByRole('checkbox')
    expect(boxes).toHaveLength(3)
    // A NATIVE <button type="button">: Space/Enter activation is the platform's (jsdom can't synthesize it — the real
    // keypress is asserted in the browser Visual Gate), and type=button never submits an enclosing <form>. A swap to a
    // View+onPress (losing key activation) fails here.
    expect(boxes.map((b) => [b.tagName, b.getAttribute('type')])).toEqual([
      ['BUTTON', 'button'],
      ['BUTTON', 'button'],
      ['BUTTON', 'button'],
    ])
  })

  it('checkbox activation does not submit an enclosing form', () => {
    const onSubmit = vi.fn((e: Event) => e.preventDefault())
    const onToggle = vi.fn()
    const { getByRole } = renderUI(
      <form onSubmit={(e) => onSubmit(e.nativeEvent)}>
        <AgendaView days={WEEK} today={TODAY} onToggleItem={onToggle} aria-label="Agenda" />
      </form>,
    )
    fireEvent.click(getByRole('checkbox', { name: 'Call Mariana' }))
    expect(onToggle).toHaveBeenCalledWith('d')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('checkbox is named by its item title, reflects aria-checked, and emits the intent on activation', () => {
    const onToggle = vi.fn()
    const { getByRole } = renderUI(<AgendaView days={WEEK} today={TODAY} onToggleItem={onToggle} aria-label="Agenda" />)
    const done = getByRole('checkbox', { name: 'Morning check-in' })
    expect(done.getAttribute('aria-checked')).toBe('true')
    const open = getByRole('checkbox', { name: 'Call Mariana' })
    expect(open.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(open)
    expect(onToggle).toHaveBeenCalledWith('d')
    // never a write: the renderer doesn't flip its own state (still unchecked — the owning module writes)
    expect(open.getAttribute('aria-checked')).toBe('false')
  })

  it('without onToggleItem: NO interactive control; done is still announced (sr-only)', () => {
    const { queryAllByRole, getByText } = renderUI(<AgendaView days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect(queryAllByRole('checkbox')).toHaveLength(0)
    expect(queryAllByRole('button')).toHaveLength(0)
    expect(getByText('Morning check-in').textContent).toContain('(done)')
  })

  it('TZ-safe: a YYYY-MM-DD at a month boundary renders its LOCAL day/weekday under America/Sao_Paulo', () => {
    // new Date('2026-11-01') would be Oct 31 (Saturday) in UTC−3. Nov 1 2026 is a Sunday.
    const days: AgendaDay[] = [{ date: '2026-11-01', items: [{ id: 'z', title: 'Boundary', daypart: 'morning' }] }]
    const { getByText, queryByText } = renderUI(<AgendaView days={days} aria-label="Agenda" />)
    expect(getByText('Sunday')).toBeTruthy()
    expect(getByText('1')).toBeTruthy()
    expect(queryByText('Saturday')).toBeNull()
  })

  it('loading → aria-busy skeleton group, no items', () => {
    const { getByRole, queryAllByRole } = renderUI(<AgendaView days={[]} state="loading" aria-label="Agenda" />)
    expect(getByRole('group', { name: 'Agenda' }).getAttribute('aria-busy')).toBe('true')
    expect(queryAllByRole('listitem')).toHaveLength(0)
  })

  it('loading with days present dev-warns a stale render (the spine guard)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<AgendaView days={WEEK} state="loading" aria-label="Agenda" />)
    expect(warn.mock.calls.some(([m]) => String(m).includes('stale render'))).toBe(true)
    warn.mockRestore()
  })

  it('duplicate dates in `days` render both days without a React key collision', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {})
    const dup: AgendaDay[] = [
      { date: '2026-10-09', items: [{ id: 'p', title: 'From tasks', daypart: 'morning' }] },
      { date: '2026-10-09', items: [{ id: 'q', title: 'From habits', daypart: 'evening' }] },
    ]
    const { getByText } = renderUI(<AgendaView days={dup} aria-label="Agenda" />)
    expect(getByText('From tasks')).toBeTruthy()
    expect(getByText('From habits')).toBeTruthy()
    expect(err.mock.calls.some(([m]) => String(m).includes('same key'))).toBe(false)
    err.mockRestore()
  })

  it('error → role="status" default message; the slot overrides it', () => {
    const { getByRole, rerender } = renderUI(<AgendaView days={WEEK} state="error" aria-label="Agenda" />)
    expect(getByRole('status').textContent).toContain('load')
    rerender(
      <UIProvider>
        <AgendaView days={WEEK} state="error" error={<span>Custom error</span>} aria-label="Agenda" />
      </UIProvider>,
    )
    expect(getByRole('status').textContent).toBe('Custom error')
  })

  it('empty → role="status"; the slot overrides it', () => {
    const { getByRole } = renderUI(
      <AgendaView days={[]} state="empty" empty={<span>Free week</span>} aria-label="Agenda" />,
    )
    expect(getByRole('status').textContent).toBe('Free week')
  })

  it('success with zero items self-heals to empty + dev-warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole } = renderUI(<AgendaView days={[{ date: TODAY, items: [] }]} aria-label="Agenda" />)
    expect(getByRole('status')).toBeTruthy()
    expect(warn.mock.calls.some(([m]) => String(m).includes('no items'))).toBe(true)
    warn.mockRestore()
  })

  it('warns when a rendered group has no accessible name; not in error/empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<AgendaView days={WEEK} today={TODAY} />)
    expect(warn.mock.calls.some(([m]) => String(m).includes('accessible name'))).toBe(true)
    warn.mockClear()
    renderUI(<AgendaView days={WEEK} state="error" />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('forwards ref to the container', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<AgendaView ref={ref} days={WEEK} today={TODAY} aria-label="Agenda" />)
    expect(ref.current).toBeInstanceOf(HTMLElement)
  })
})
