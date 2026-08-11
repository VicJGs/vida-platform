// @vitest-environment jsdom
// TZ guard: a negative-offset zone is where the 'YYYY-MM-DD'→UTC off-by-one bites (B1). Set before Date use.
process.env.TZ = 'America/Sao_Paulo'
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { CalendarView } from './calendar-view'

afterEach(cleanup)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

type Evt = { id: string; on: string | Date; title: string }
const key = (e: Evt) => e.id
const chip = (e: Evt) => <span data-chip>{e.title}</span>
// A fixed month + today so the grid is deterministic (Aug 2026; Aug 1 is a Saturday).
const AUG = new Date(2026, 7, 1)
const TODAY = new Date(2026, 7, 10)

describe('CalendarView', () => {
  it('renders a role="table" with 7 columnheaders + exactly 42 role="cell" days', () => {
    const { getByRole, getAllByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(getByRole('table')).not.toBeNull()
    expect(getAllByRole('columnheader')).toHaveLength(7)
    expect(getAllByRole('cell')).toHaveLength(42)
  })

  it('uses role="cell" (NOT gridcell)', () => {
    const { queryAllByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(queryAllByRole('gridcell')).toHaveLength(0)
    expect(queryAllByRole('cell').length).toBe(42)
  })

  it('weekday headers shift with weekStartsOn', () => {
    const { getAllByRole, rerender } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} weekStartsOn={1} aria-label="Cal" />,
    )
    expect(getAllByRole('columnheader')[0]?.textContent).toBe('Mon')
    rerender(
      <UIProvider>
        <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} weekStartsOn={0} aria-label="Cal" />
      </UIProvider>,
    )
    expect(getAllByRole('columnheader')[0]?.textContent).toBe('Sun')
  })

  // ── TZ-safe bucketing (B1) — the month-boundary is where the UTC off-by-one would strike ──────────────
  it('buckets a "YYYY-MM-DD" string onto the CORRECT local day (no UTC off-by-one) under TZ=America/Sao_Paulo', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[{ id: 'x', on: '2026-08-01', title: 'BOUNDARY' }]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    // must land on Aug 1, NOT the previous cell (Jul 31) that new Date('2026-08-01') would produce in UTC-3
    expect(getByRole('cell', { name: '1 August 2026' }).textContent).toContain('BOUNDARY')
    expect(getByRole('cell', { name: '31 July 2026' }).textContent).not.toContain('BOUNDARY')
  })

  it('buckets a Date item onto its local day', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[{ id: 'd', on: new Date(2026, 7, 15, 23, 30), title: 'LATE' }]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(getByRole('cell', { name: '15 August 2026' }).textContent).toContain('LATE')
  })

  it('caps chips at maxPerDay + shows "+K more"', () => {
    const many: Evt[] = Array.from({ length: 5 }, (_, i) => ({ id: `e${i}`, on: '2026-08-10', title: `E${i}` }))
    const { getByRole } = renderUI(
      <CalendarView items={many} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} maxPerDay={3} aria-label="Cal" />,
    )
    const cell = getByRole('cell', { name: '10 August 2026' })
    expect(cell.querySelectorAll('[data-chip]')).toHaveLength(3)
    expect(cell.textContent).toContain('+2 more')
  })

  it('today is marked (injected today)', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    const todayCell = getByRole('cell', { name: '10 August 2026' })
    expect(todayCell.querySelector('.vida-cal-today')).not.toBeNull()
  })

  // ── month nav (opt-in) ──────────────────────────────────────────────────────
  it('renders no nav buttons without onMonthChange', () => {
    const { queryByLabelText } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(queryByLabelText('Previous month')).toBeNull()
  })

  it('nav buttons fire onMonthChange(prev/next) when provided', () => {
    const onMonthChange = vi.fn()
    const { getByLabelText } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} onMonthChange={onMonthChange} aria-label="Cal" />,
    )
    fireEvent.click(getByLabelText('Previous month'))
    expect(onMonthChange.mock.calls[0]?.[0].getMonth()).toBe(6) // July
    fireEvent.click(getByLabelText('Next month'))
    expect(onMonthChange.mock.calls[1]?.[0].getMonth()).toBe(8) // September
  })

  // ── terminal states (the divergence) ───────────────────────────────────────
  it('empty renders the GRID (role=table), NOT a status message', () => {
    const { getByRole, queryByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} state="empty" month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(getByRole('table')).not.toBeNull()
    expect(queryByRole('status')).toBeNull()
  })

  it('error → role="status" message, no table', () => {
    const { getByRole, queryByRole, getByText } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} state="error" month={AUG} today={TODAY} />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByRole('table')).toBeNull()
    expect(getByText(/couldn/i)).not.toBeNull()
  })

  it('loading → role="table" + aria-busy', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} state="loading" month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(getByRole('table').getAttribute('aria-busy')).toBe('true')
  })

  it('forwards ref to the container', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<CalendarView ref={ref} items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current?.getAttribute('role')).toBe('table')
  })

  it('warns (shared warnMissingName) when the table has no accessible name; not in error', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockClear()
    renderUI(<CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} state="error" month={AUG} today={TODAY} />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
