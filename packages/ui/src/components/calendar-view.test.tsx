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

  it('hideHeader suppresses the month title + nav (frame owns the period — D4), grid still renders', () => {
    const onMonthChange = vi.fn()
    const { queryByText, queryByLabelText, getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} onMonthChange={onMonthChange} hideHeader aria-label="Cal" />,
    )
    expect(queryByText('August 2026')).toBeNull() // no internal title
    expect(queryByLabelText('Previous month')).toBeNull() // no internal nav even with onMonthChange
    expect(getByRole('table')).toBeTruthy() // the grid still renders
  })

  it('tabIndex opts the grid in as a programmatic focus target (S4 drill-in); absent = not focusable', () => {
    const { getByRole, rerender } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} tabIndex={-1} aria-label="Cal" />,
    )
    const table = getByRole('table')
    expect(table.getAttribute('tabindex')).toBe('-1')
    table.focus()
    expect(document.activeElement).toBe(table)
    rerender(
      <UIProvider>
        <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />
      </UIProvider>,
    )
    expect(getByRole('table').hasAttribute('tabindex')).toBe(false)
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

  // ── P5 editorial refinement (LIF-230) ────────────────────────────────────────
  // Tamagui compiles styled props to atomic classes (not inline styles), so tone/colour are asserted via the
  // deterministic class substrings (`_backgroundColor-colorSurfac…`, `_col-colorTextPr/Mu/BrandP…`); `fontVariantNumeric`
  // is a raw `style={}` so it lands on `.style`. The VISUAL rendering (actual AA, the "muddy vs rhythm" tint) is the
  // blocking Storybook Visual Gate's job — jsdom can't compute Tamagui theme vars. Aug 2026: Aug 1 = Sat; today = Mon Aug 10.
  const dayNum = (cell: HTMLElement) =>
    (cell.querySelector('.vida-cal-today')?.firstElementChild ?? cell.firstElementChild) as HTMLElement

  it('today mark = accent number + underline, NOT a filled blob', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    const mark = getByRole('cell', { name: '10 August 2026' }).querySelector('.vida-cal-today') as HTMLElement
    expect(mark).not.toBeNull()
    // the mark is an underline wrapper (border-bottom), NOT a filled brand blob (no backgroundColor on the wrapper)
    expect(mark.className).toContain('_borderBottomWidth-2px')
    expect(mark.className).not.toContain('_backgroundColor-colorBrand')
    // the number itself is the brand accent (emphasis step — higher-contrast, AA on secondary surfaces) + tabular
    const num = mark.firstElementChild as HTMLElement
    expect(num.className).toContain('col-colorBrandE')
    expect(num.style.fontVariantNumeric).toBe('tabular-nums')
  })

  it('day figures are tabular', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(dayNum(getByRole('cell', { name: '11 August 2026' })).style.fontVariantNumeric).toBe('tabular-nums')
  })

  it('weekday eyebrow uppercase is CSS (DOM label stays "Mon" — SR-correct columnheader name)', () => {
    const { getAllByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} weekStartsOn={1} aria-label="Cal" />,
    )
    // DOM text is the real word (not ".toUpperCase()"); the uppercase is a visual textTransform (Visual-Gate verified)
    expect(getAllByRole('columnheader')[0]?.textContent).toBe('Mon')
    expect(getAllByRole('columnheader')[0]?.textContent).not.toBe('MON')
  })

  it('weekend-in-month cell = secondary tone + a PRIMARY (ink) number', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    const sat = getByRole('cell', { name: '8 August 2026' }) // Sat, in-month
    expect(sat.className).toContain('_backgroundColor-colorSurfac')
    expect(dayNum(sat).className).toContain('col-colorTextPr')
  })

  it('out-of-month cell = secondary tone + a MUTED (faint) number', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    const oos = getByRole('cell', { name: '27 July 2026' }) // Mon, out-of-month
    expect(oos.className).toContain('_backgroundColor-colorSurfac')
    expect(dayNum(oos).className).toContain('col-colorTextMu')
  })

  it('plain in-month weekday has no paper tone', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    expect(getByRole('cell', { name: '11 August 2026' }).className).not.toContain('_backgroundColor-colorSurfac')
  })

  it('oos precedence over weekend — an out-of-month weekend is oos-toned (muted number)', () => {
    const { getByRole } = renderUI(
      <CalendarView items={[]} getDate={(e: Evt) => e.on} getKey={key} renderItem={chip} month={AUG} today={TODAY} aria-label="Cal" />,
    )
    const sepSat = getByRole('cell', { name: '5 September 2026' }) // Sat but out-of-month → oos wins
    expect(sepSat.className).toContain('_backgroundColor-colorSurfac')
    expect(dayNum(sepSat).className).toContain('col-colorTextMu') // muted (oos), NOT primary (weekend)
  })
})
