// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { TableView, type Column } from './table-view'

afterEach(cleanup)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

type Row = { id: string; name: string; qty: number }
const ROWS: Row[] = [
  { id: 'a', name: 'Alpha', qty: 2 },
  { id: 'b', name: 'Beta', qty: 5 },
]
const key = (r: Row) => r.id
const COLS: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => <span data-cell>{r.name}</span> },
  { key: 'qty', header: 'Qty', align: 'end', render: (r) => <span data-cell>{r.qty}</span> },
]

describe('TableView', () => {
  it('renders role="table" with a columnheader per column and a cell per row×column (success)', () => {
    const { getByRole, getAllByRole } = renderUI(
      <TableView items={ROWS} columns={COLS} getKey={key} aria-label="Items" />,
    )
    expect(getByRole('table')).not.toBeNull()
    expect(getAllByRole('columnheader')).toHaveLength(2)
    // 2 rows × 2 columns = 4 body cells (headers are columnheader, not cell)
    expect(getAllByRole('cell')).toHaveLength(4)
    // 1 header row + 2 body rows
    expect(getAllByRole('row')).toHaveLength(3)
  })

  it('renders each column header + cell content via render', () => {
    const { getAllByRole, getByText } = renderUI(
      <TableView items={ROWS} columns={COLS} getKey={key} aria-label="Items" />,
    )
    expect(getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Name', 'Qty'])
    expect(getByText('Alpha')).not.toBeNull()
    expect(getByText('Beta')).not.toBeNull()
  })

  // ── aria-sort is DISPLAY-only (TV-5): reflects column.sort, no toggle ──────────────────────────────────
  it('maps column.sort to aria-sort (asc→ascending, desc→descending, absent→none)', () => {
    const sorted: Column<Row>[] = [
      { ...COLS[0]!, sort: 'asc' },
      { ...COLS[1]!, sort: 'desc' },
      { key: 'x', header: 'X', render: () => null },
    ]
    const { getAllByRole } = renderUI(<TableView items={ROWS} columns={sorted} getKey={key} aria-label="Items" />)
    const heads = getAllByRole('columnheader')
    expect(heads[0]?.getAttribute('aria-sort')).toBe('ascending')
    expect(heads[1]?.getAttribute('aria-sort')).toBe('descending')
    expect(heads[2]?.getAttribute('aria-sort')).toBe('none')
  })

  it('exposes NO sort/write handle (read-only lens, TV-1) — the contract has no onSortChange/onRowClick', () => {
    // compile-level guarantee; asserted structurally: a sorted header is not a button/clickable
    const { getAllByRole, queryAllByRole } = renderUI(
      <TableView items={ROWS} columns={[{ ...COLS[0]!, sort: 'asc' }]} getKey={key} aria-label="Items" />,
    )
    expect(getAllByRole('columnheader')).toHaveLength(1)
    expect(queryAllByRole('button')).toHaveLength(0)
  })

  // ── terminal states (TV-4) ────────────────────────────────────────────────────────────────────────────
  it('loading → aria-busy + skeleton rows (aria-hidden), no data cells', () => {
    const { getByRole, queryByText } = renderUI(
      <TableView items={[]} columns={COLS} getKey={key} state="loading" loadingCount={3} aria-label="Items" />,
    )
    const table = getByRole('table')
    expect(table.getAttribute('aria-busy')).toBe('true')
    expect(queryByText('Alpha')).toBeNull()
  })

  it('error → role="status" (NOT a table), with the error slot', () => {
    const { getByRole, queryByRole } = renderUI(
      <TableView items={[]} columns={COLS} getKey={key} state="error" error={<span>boom</span>} aria-label="Items" />,
    )
    expect(queryByRole('table')).toBeNull()
    expect(getByRole('status').textContent).toContain('boom')
  })

  it('empty → a designed empty row (NOT a role="status"); headers still render', () => {
    const { getByRole, getAllByRole, getByText } = renderUI(
      <TableView
        items={[]}
        columns={COLS}
        getKey={key}
        state="empty"
        empty={<span>none yet</span>}
        aria-label="Items"
      />,
    )
    expect(getByRole('table')).not.toBeNull() // still a table (designed empty, calendar divergence)
    expect(getAllByRole('columnheader')).toHaveLength(2)
    expect(getByText('none yet')).not.toBeNull()
  })

  it('success with 0 items self-heals to the empty render', () => {
    const { getByRole, getByText } = renderUI(
      <TableView
        items={[]}
        columns={COLS}
        getKey={key}
        state="success"
        empty={<span>self-healed</span>}
        aria-label="Items"
      />,
    )
    expect(getByRole('table')).not.toBeNull()
    expect(getByText('self-healed')).not.toBeNull()
  })

  // ── contract guards ───────────────────────────────────────────────────────────────────────────────────
  it('dev-warns when the table renders without an accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<TableView items={ROWS} columns={COLS} getKey={key} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does NOT dev-warn on the error state (no grid rendered)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<TableView items={[]} columns={COLS} getKey={key} state="error" />)
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('forwards ref to the container (React 19 ref-as-prop)', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<TableView items={ROWS} columns={COLS} getKey={key} ref={ref} aria-label="Items" />)
    expect(ref.current).not.toBeNull()
  })
})
