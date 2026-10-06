// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { ListView } from './list-view'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

type Row = { id: string; title: string }
const rows: Row[] = [
  { id: 'a', title: 'Alpha' },
  { id: 'b', title: 'Beta' },
  { id: 'c', title: 'Gamma' },
]
const key = (r: Row) => r.id
const item = (r: Row) => <span>{r.title}</span>

describe('ListView', () => {
  // ── success ─────────────────────────────────────────────────────────────────
  it('renders role="list" with one role="listitem" per item, via renderItem', () => {
    const { getByRole, getAllByRole, getByText } = renderUI(
      <ListView items={rows} getKey={key} renderItem={item} aria-label="Rows" />,
    )
    expect(getByRole('list')).not.toBeNull()
    expect(getAllByRole('listitem')).toHaveLength(3)
    expect(getByText('Alpha')).not.toBeNull()
    expect(getByText('Gamma')).not.toBeNull()
  })

  it('calls getKey and renderItem with (item, index) for each row, in order', () => {
    const getKey = vi.fn((r: Row) => r.id)
    const renderItem = vi.fn((r: Row) => <span>{r.title}</span>)
    renderUI(<ListView items={rows} getKey={getKey} renderItem={renderItem} aria-label="Rows" />)
    expect(getKey).toHaveBeenCalledTimes(3)
    expect(getKey).toHaveBeenNthCalledWith(1, rows[0], 0)
    expect(renderItem).toHaveBeenNthCalledWith(3, rows[2], 2)
  })

  // ── loading ───────────────────────────────────────────────────────────────
  it('loading: role="list" + aria-busy + N aria-hidden skeleton listitems (default 5)', () => {
    const { getByRole, container } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="loading" aria-label="Rows" />,
    )
    const list = getByRole('list')
    expect(list.getAttribute('aria-busy')).toBe('true')
    const skeletons = container.querySelectorAll('[role="listitem"]')
    expect(skeletons).toHaveLength(5) // aria-hidden, so query the DOM directly
    expect(skeletons[0]?.getAttribute('aria-hidden')).toBe('true')
  })

  it('loading: respects loadingCount', () => {
    const { container } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="loading" loadingCount={3} aria-label="Rows" />,
    )
    expect(container.querySelectorAll('[role="listitem"]')).toHaveLength(3)
  })

  // ── empty ────────────────────────────────────────────────────────────────
  it('empty: role="status" (NOT list) + a default message', () => {
    const { getByRole, queryByRole, getByText } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="empty" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByRole('list')).toBeNull()
    expect(getByText(/nothing here/i)).not.toBeNull()
  })

  it('empty: renders the `empty` slot when provided', () => {
    const { getByText } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="empty" empty={<div>No pages</div>} />,
    )
    expect(getByText('No pages')).not.toBeNull()
  })

  it('success with empty items self-heals to the empty render (role="status")', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole, queryByRole } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="success" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByRole('list')).toBeNull()
    warn.mockRestore()
  })

  // ── error ────────────────────────────────────────────────────────────────
  it('error: role="status" + a default message', () => {
    const { getByRole, queryByRole, getByText } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="error" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(queryByRole('list')).toBeNull()
    expect(getByText(/couldn/i)).not.toBeNull()
  })

  it('error: renders the `error` slot when provided', () => {
    const { getByText } = renderUI(
      <ListView items={[]} getKey={key} renderItem={item} state="error" error={<div>Retry?</div>} />,
    )
    expect(getByText('Retry?')).not.toBeNull()
  })

  // ── ref (React 19 ref-as-prop, B2) ─────────────────────────────────────────
  it('forwards ref to the container <div>', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<ListView ref={ref} items={rows} getKey={key} renderItem={item} aria-label="Rows" />)
    expect(ref.current?.tagName).toBe('DIV')
    expect(ref.current?.getAttribute('role')).toBe('list')
  })

  // ── dividers (renders without breaking; the variant is a Tamagui class) ─────
  it('dividers: still renders one listitem per row', () => {
    const { getAllByRole } = renderUI(
      <ListView items={rows} getKey={key} renderItem={item} dividers aria-label="Rows" />,
    )
    expect(getAllByRole('listitem')).toHaveLength(3)
  })

  // ── dev-warns (LV-7 + accessible name) ─────────────────────────────────────
  it('warns when state="success" but items is empty', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={[]} getKey={key} renderItem={item} state="success" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('empty `items`'))
    warn.mockRestore()
  })

  it('warns when state="loading" but items are present (stale)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={rows} getKey={key} renderItem={item} state="loading" aria-label="Rows" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('stale render'))
    warn.mockRestore()
  })

  it('warns when a rendered list has no accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={rows} getKey={key} renderItem={item} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does NOT warn for a well-formed named list with items', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={rows} getKey={key} renderItem={item} aria-label="Rows" />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('does NOT warn about a name in the empty/error states (no list rendered)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={[]} getKey={key} renderItem={item} state="empty" />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})

// ── P1 (LIF-230) alive-hooks: sections · primaryKey/primaryLabel · activeKey ────────────────────────────
describe('ListView · P1 alive-hooks', () => {
  const sections = [
    { id: 'today', title: 'Today', items: [rows[0]!, rows[1]!] },
    { id: 'later', title: 'Later', items: [rows[2]!] },
  ]

  it('sections: outer role="group" + one role="list" per section + eyebrow headers + all rows', () => {
    const { getByRole, getAllByRole, getByText } = renderUI(
      <ListView sections={sections} getKey={key} renderItem={item} aria-label="Grouped" />,
    )
    expect(getByRole('group')).not.toBeNull()
    expect(getAllByRole('list')).toHaveLength(2)
    expect(getByText('Today')).not.toBeNull()
    expect(getByText('Later')).not.toBeNull()
    expect(getAllByRole('listitem')).toHaveLength(3)
  })

  it('sections: each section list is aria-labelledby its own header (board model)', () => {
    const { getAllByRole } = renderUI(
      <ListView sections={sections} getKey={key} renderItem={item} aria-label="Grouped" />,
    )
    const labelledby = getAllByRole('list')[0]?.getAttribute('aria-labelledby')
    expect(labelledby).toBeTruthy()
    expect(document.getElementById(labelledby!)?.textContent).toBe('Today')
  })

  it('sections: an empty section is a per-section role="status" (not an empty list)', () => {
    const withEmpty = [
      { id: 'today', title: 'Today', items: [rows[0]!] },
      { id: 'later', title: 'Later', items: [] as Row[] },
    ]
    const { getByRole, getAllByRole } = renderUI(
      <ListView sections={withEmpty} getKey={key} renderItem={item} aria-label="Grouped" />,
    )
    expect(getAllByRole('list')).toHaveLength(1) // only the non-empty section is a list
    expect(getByRole('status')).not.toBeNull() // the empty section
  })

  it('primaryKey + primaryLabel: renders the eyebrow above the featured row; rows intact', () => {
    const { getByText, getAllByRole } = renderUI(
      <ListView
        items={rows}
        getKey={key}
        renderItem={item}
        primaryKey="b"
        primaryLabel="The one thing"
        aria-label="Rows"
      />,
    )
    expect(getByText('The one thing')).not.toBeNull()
    expect(getAllByRole('listitem')).toHaveLength(3)
  })

  it('activeKey: renders one listitem per row (the tick is a variant, no structural change)', () => {
    const { getAllByRole } = renderUI(
      <ListView items={rows} getKey={key} renderItem={item} activeKey="a" aria-label="Rows" />,
    )
    expect(getAllByRole('listitem')).toHaveLength(3)
  })

  it('warns when both items and sections are passed', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={rows} sections={sections} getKey={key} renderItem={item} aria-label="Rows" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`items` OR `sections`'))
    warn.mockRestore()
  })

  it('warns when primaryKey matches no row', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={rows} getKey={key} renderItem={item} primaryKey="zzz" aria-label="Rows" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`primaryKey` matches no row'))
    warn.mockRestore()
  })

  it('warns when activeKey matches no row', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView items={rows} getKey={key} renderItem={item} activeKey="zzz" aria-label="Rows" />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`activeKey` matches no row'))
    warn.mockRestore()
  })

  it('does NOT warn for a well-formed, named sectioned list', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<ListView sections={sections} getKey={key} renderItem={item} aria-label="Grouped" />)
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })
})
