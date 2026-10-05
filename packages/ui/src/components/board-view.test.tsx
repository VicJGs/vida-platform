// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '../provider'
import { BoardView, type BoardGroup } from './board-view'

afterEach(cleanup)
function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

type Card = { id: string; title: string }
const GROUPS: BoardGroup<Card>[] = [
  { id: 'todo', title: 'To Do', items: [{ id: 'a', title: 'Alpha' }, { id: 'b', title: 'Beta' }] },
  { id: 'doing', title: 'In Progress', items: [{ id: 'c', title: 'Gamma' }] },
  { id: 'done', title: 'Done', items: [] },
]
const key = (c: Card) => c.id
const renderCard = (c: Card) => <span data-card>{c.title}</span>

describe('BoardView', () => {
  it('renders role="group" with a role="list" per non-empty column and a listitem per card (success)', () => {
    const { getByRole, getAllByRole } = renderUI(
      <BoardView groups={GROUPS} renderCard={renderCard} getKey={key} aria-label="Tasks board" />,
    )
    expect(getByRole('group')).not.toBeNull()
    // todo + doing are non-empty → role="list"; done is empty → role="status" (not a list)
    expect(getAllByRole('list')).toHaveLength(2)
    // 2 + 1 cards = 3 listitems total
    expect(getAllByRole('listitem')).toHaveLength(3)
  })

  it('renders each group title + per-group count + each card via renderCard', () => {
    const { getByText } = renderUI(
      <BoardView groups={GROUPS} renderCard={renderCard} getKey={key} aria-label="Tasks board" />,
    )
    expect(getByText('To Do')).not.toBeNull()
    expect(getByText('In Progress')).not.toBeNull()
    // counts (derived from items.length): 2, 1, 0
    expect(getByText('2')).not.toBeNull()
    expect(getByText('1')).not.toBeNull()
    expect(getByText('0')).not.toBeNull()
    expect(getByText('Alpha')).not.toBeNull()
    expect(getByText('Gamma')).not.toBeNull()
  })

  it('labels each column list by its group title (aria-labelledby → the header)', () => {
    const { getAllByRole } = renderUI(
      <BoardView groups={GROUPS} renderCard={renderCard} getKey={key} aria-label="Tasks board" />,
    )
    const lists = getAllByRole('list')
    // The first non-empty column is "To Do"; its list is labelled by the header element holding that text.
    const labelledby = lists[0]?.getAttribute('aria-labelledby')
    expect(labelledby).not.toBeNull()
    const label = labelledby ? document.getElementById(labelledby) : null
    expect(label?.textContent).toBe('To Do')
  })

  it('an empty column renders a role="status" (NOT a role="list"), the per-column empty', () => {
    const { getAllByRole } = renderUI(
      <BoardView groups={GROUPS} renderCard={renderCard} getKey={key} aria-label="Tasks board" />,
    )
    // "Done" column is empty → it is a status region, so there are exactly 2 lists (todo, doing)
    expect(getAllByRole('list')).toHaveLength(2)
    // and at least one status region (the empty column) exists
    expect(getAllByRole('status').length).toBeGreaterThanOrEqual(1)
  })

  it('exposes NO move/write handle (read-only lens, BV-1) — the contract has no onItemMove/drag', () => {
    const { getByRole, queryAllByRole } = renderUI(
      <BoardView groups={GROUPS} renderCard={renderCard} getKey={key} aria-label="Tasks board" />,
    )
    expect(getByRole('group')).not.toBeNull()
    // read-only: no buttons synthesized by the renderer (interactivity composes in renderCard)
    expect(queryAllByRole('button')).toHaveLength(0)
  })

  // ── terminal states (BV-4) ────────────────────────────────────────────────────────────────────────────
  it('loading → role="group" + aria-busy + skeleton columns (aria-hidden), no card data', () => {
    const { getByRole, queryByText } = renderUI(
      <BoardView groups={[]} renderCard={renderCard} getKey={key} state="loading" aria-label="Tasks board" />,
    )
    const group = getByRole('group')
    expect(group.getAttribute('aria-busy')).toBe('true')
    expect(queryByText('Alpha')).toBeNull()
  })

  it('error → role="status" (NOT a group), with the error slot', () => {
    const { getByRole, queryByRole } = renderUI(
      <BoardView groups={[]} renderCard={renderCard} getKey={key} state="error" error={<span>boom</span>} aria-label="Tasks board" />,
    )
    expect(queryByRole('group')).toBeNull()
    expect(getByRole('status').textContent).toContain('boom')
  })

  it('board-empty (no groups) → role="status", with the empty slot', () => {
    const { getByRole, queryByRole } = renderUI(
      <BoardView groups={[]} renderCard={renderCard} getKey={key} state="empty" empty={<span>no columns</span>} aria-label="Tasks board" />,
    )
    expect(queryByRole('group')).toBeNull()
    expect(getByRole('status').textContent).toContain('no columns')
  })

  it('success with 0 groups self-heals to the board-empty render', () => {
    const { getByRole, getByText } = renderUI(
      <BoardView groups={[]} renderCard={renderCard} getKey={key} state="success" empty={<span>self-healed</span>} aria-label="Tasks board" />,
    )
    expect(getByRole('status')).not.toBeNull()
    expect(getByText('self-healed')).not.toBeNull()
  })

  // ── contract guards ───────────────────────────────────────────────────────────────────────────────────
  it('dev-warns when the board group renders without an accessible name', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<BoardView groups={GROUPS} renderCard={renderCard} getKey={key} />)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does NOT dev-warn on the error state (no group rendered)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<BoardView groups={[]} renderCard={renderCard} getKey={key} state="error" />)
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })

  it('does NOT dev-warn "pass state=empty" for a legitimately empty column (success board)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(<BoardView groups={GROUPS} renderCard={renderCard} getKey={key} aria-label="Tasks board" />)
    // the "Done" column is empty but the board is success — must not warn about a success/empty-items contradiction
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('pass state="empty"'))
    warn.mockRestore()
  })

  it('forwards ref to the container (React 19 ref-as-prop)', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<BoardView groups={GROUPS} renderCard={renderCard} getKey={key} ref={ref} aria-label="Tasks board" />)
    expect(ref.current).not.toBeNull()
  })
})
