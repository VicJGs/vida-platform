// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { PickerView } from './wikilink-picker'
import type { WikiCandidate } from './wikilink'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

const candidates: WikiCandidate[] = [
  { id: 'a', type: 'note', title: 'Research log', icon: null },
  { id: 'b', type: 'milestone_note', title: 'Launch milestone', icon: null },
]
const noop = () => {}

describe('PickerView (S4 — the [[ picker)', () => {
  it('searching → aria-busy', () => {
    const { container } = renderUI(
      <PickerView query="la" candidates={[]} createRow={null} state="searching" onPick={noop} onCreate={noop} />,
    )
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('error → a calm status message', () => {
    const { getByRole } = renderUI(
      <PickerView query="la" candidates={[]} createRow={null} state="error" onPick={noop} onCreate={noop} />,
    )
    expect(getByRole('status').textContent).toContain('Couldn’t search')
  })

  it('blank query, no candidates → a type-to-search hint (no dead listbox)', () => {
    const { getByText, queryByRole } = renderUI(
      <PickerView query="" candidates={[]} createRow={null} state="empty" onPick={noop} onCreate={noop} />,
    )
    expect(getByText('Type to search pages.')).not.toBeNull()
    expect(queryByRole('listbox')).toBeNull()
  })

  it('EC-10 — populated: a listbox of candidate options + a DISTINCT "Create" row', () => {
    const { getByRole, getAllByRole, getByText } = renderUI(
      <PickerView query="la" candidates={candidates} createRow={{ query: 'la' }} state="populated" onPick={noop} onCreate={noop} />,
    )
    expect(getByRole('listbox', { name: 'Link to page' })).not.toBeNull()
    // 2 candidates + 1 create row = 3 options
    expect(getAllByRole('option')).toHaveLength(3)
    expect(getByText('Research log')).not.toBeNull()
    expect(getByText('Create “la”')).not.toBeNull()
  })

  it('EC-10 — empty candidates but non-blank query still offers the Create row (create-on-miss)', () => {
    const { getAllByRole, getByText } = renderUI(
      <PickerView query="novel" candidates={[]} createRow={{ query: 'novel' }} state="empty" onPick={noop} onCreate={noop} />,
    )
    expect(getAllByRole('option')).toHaveLength(1)
    expect(getByText('Create “novel”')).not.toBeNull()
  })

  it('picking a candidate fires onPick with its id (the stored link — not onCreate)', () => {
    const onPick = vi.fn()
    const onCreate = vi.fn()
    const { getByText } = renderUI(
      <PickerView query="la" candidates={candidates} createRow={{ query: 'la' }} state="populated" onPick={onPick} onCreate={onCreate} />,
    )
    fireEvent.click(getByText('Launch milestone'))
    expect(onPick).toHaveBeenCalledWith('b')
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('the Create row fires onCreate with the query (explicit choice — NOT-19)', () => {
    const onPick = vi.fn()
    const onCreate = vi.fn()
    const { getByText } = renderUI(
      <PickerView query="la" candidates={candidates} createRow={{ query: 'la' }} state="populated" onPick={onPick} onCreate={onCreate} />,
    )
    fireEvent.click(getByText('Create “la”'))
    expect(onCreate).toHaveBeenCalledWith('la')
    expect(onPick).not.toHaveBeenCalled()
  })

  it('keyboard: ArrowDown + Enter activates the next option', () => {
    const onPick = vi.fn()
    const { getByRole } = renderUI(
      <PickerView query="la" candidates={candidates} createRow={null} state="populated" onPick={onPick} onCreate={noop} />,
    )
    const listbox = getByRole('listbox')
    fireEvent.keyDown(listbox, { key: 'ArrowDown' }) // 0 → 1
    fireEvent.keyDown(listbox, { key: 'Enter' })
    expect(onPick).toHaveBeenCalledWith('b')
  })

  it('EC-22 — options carry Lucide icons (svg)', () => {
    const { container } = renderUI(
      <PickerView query="la" candidates={candidates} createRow={{ query: 'la' }} state="populated" onPick={noop} onCreate={noop} />,
    )
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})
