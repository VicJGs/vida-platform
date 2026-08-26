// @vitest-environment jsdom
// B4 — the entityLink block body: the fail-loud ORDER helper (row FIRST → commit | remove) and the two render states
// (committed reference vs the inline picker). Real @vida/ui; router Link + useNoteTitle mocked. Spec: b4-link-panels.md.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import type { PageRow } from '@vida/core'

vi.mock('@tanstack/react-router', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
  Link: ({ children, params, ...rest }: any) => (
    <a href={`/note/${params?.id ?? ''}`} {...rest}>
      {children}
    </a>
  ),
}))
const title = vi.fn()
vi.mock('./use-note', () => ({ useNoteTitle: (id: string) => title(id) }))

import { EntityLinkBody, resolveEntityLink } from './entity-link-body'

afterEach(cleanup)

const pageRow = (over: Partial<PageRow> = {}): PageRow =>
  ({ id: 'p2', title: 'Target', type: 'note', ...over }) as unknown as PageRow

describe('resolveEntityLink — row FIRST, then commit; reject → remove (BR-B4-6)', () => {
  it('write RESOLVES → commit called with the attrs, remove NOT called', async () => {
    const link = vi.fn().mockResolvedValue({})
    const commit = vi.fn()
    const remove = vi.fn()
    await resolveEntityLink(
      { link, commit, remove },
      { entityType: 'page', entityId: 'p2', label: 'Target' },
    )
    expect(link).toHaveBeenCalledWith({ entityType: 'page', entityId: 'p2' })
    expect(commit).toHaveBeenCalledWith({ entityType: 'page', entityId: 'p2', label: 'Target' })
    expect(remove).not.toHaveBeenCalled()
  })

  it('write REJECTS → remove called, commit NEVER called (no committed node without a row)', async () => {
    const link = vi.fn().mockRejectedValue(new Error('nope'))
    const commit = vi.fn()
    const remove = vi.fn()
    await resolveEntityLink(
      { link, commit, remove },
      { entityType: 'page', entityId: 'p2', label: 'Target' },
    )
    expect(remove).toHaveBeenCalledTimes(1)
    expect(commit).not.toHaveBeenCalled()
  })
})

describe('EntityLinkBody — render states (BR-B4-4/8)', () => {
  const deps = { resolveTargets: vi.fn().mockResolvedValue([pageRow()]), createLink: vi.fn().mockResolvedValue({}) }
  const mount = (attrs: Record<string, unknown>, over: { updateAttributes?: () => void; deleteNode?: () => void } = {}) =>
    render(
      <UIProvider>
        <EntityLinkBody
          attrs={attrs}
          updateAttributes={over.updateAttributes ?? vi.fn()}
          deleteNode={over.deleteNode ?? vi.fn()}
          deps={deps}
        />
      </UIProvider>,
    )

  it('a FILLED page reference renders a navigable link resolved by id (NP-7)', () => {
    title.mockReturnValue({ data: pageRow({ title: 'Resolved Title' }) })
    mount({ entityType: 'page', entityId: 'p2', label: 'stale label' })
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/note/p2')
    expect(link.textContent).toContain('Resolved Title') // by-id title wins over the captured label
  })

  it('a FILLED unshipped-type reference degrades to a non-navigable label (CB6, BR-B4-8)', () => {
    title.mockReturnValue({ data: null })
    mount({ entityType: 'contact', entityId: 'c9', label: 'Ana' })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.getByText(/opens when its module ships/)).toBeTruthy()
  })

  it('an EMPTY node renders the inline picker (a combobox with a search input)', () => {
    title.mockReturnValue({ data: null })
    mount({ entityType: '', entityId: '', label: '' })
    expect(screen.getByRole('combobox')).toBeTruthy()
    expect(screen.getByLabelText('Search notes to link')).toBeTruthy()
  })

  it('picking a result writes the row FIRST then commits the node (integration)', async () => {
    title.mockReturnValue({ data: null })
    const updateAttributes = vi.fn()
    mount({ entityType: '', entityId: '', label: '' }, { updateAttributes })
    // The debounced search resolves to one candidate; click it.
    const option = await screen.findByRole('option')
    fireEvent.click(option)
    await waitFor(() => expect(deps.createLink).toHaveBeenCalledWith({ entityType: 'page', entityId: 'p2' }))
    await waitFor(() =>
      expect(updateAttributes).toHaveBeenCalledWith({ entityType: 'page', entityId: 'p2', label: 'Target' }),
    )
  })
})
