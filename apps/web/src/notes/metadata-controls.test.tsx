// @vitest-environment jsdom
// notes-rescope R3 · G1/G7/G9/G16 · R-10 — the live metadata controls (C1 wiring, C2/C3 opening, focus).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import type { NoteEntityData } from './use-note-entity'

const updatePage = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<unknown>>()
vi.mock('../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({ notes: { updatePage: (id: string, p: Record<string, unknown>) => updatePage(id, p) } }),
}))
vi.mock('../lib/notify-error', () => ({ notifyError: vi.fn() }))

import { MetadataControls } from './page-metadata'

const page: NoteEntityData = {
  id: 'p1',
  type: 'note',
  title: 'T',
  content: null,
  contentStatus: 'absent',
  rawContent: null,
  favorite: false,
  archived: false,
  updated: 'now',
  journalDate: null,
  icon: null,
  cover: null,
}
const renderUI = () =>
  render(
    <UIProvider>
      <QueryClientProvider client={new QueryClient()}>
        <MetadataControls page={page} />
      </QueryClientProvider>
    </UIProvider>,
  )

beforeEach(() => {
  updatePage.mockReset()
  updatePage.mockResolvedValue({})
})
afterEach(cleanup)

describe('MetadataControls — live (R3)', () => {
  it('Favorite writes is_favorite; focus STAYS on the control while the write is pending (R-10, aria-disabled)', async () => {
    let release: () => void = () => {}
    updatePage.mockImplementationOnce(() => new Promise((r) => (release = () => r({}))))
    const r = renderUI()
    const fav = r.getByRole('button', { name: 'Favorite' })
    fav.focus()
    fireEvent.click(fav)
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith('p1', { is_favorite: true }))
    await waitFor(() => expect(fav.getAttribute('aria-disabled')).toBe('true'))
    expect(document.activeElement).toBe(fav)
    fireEvent.click(fav) // ignored while pending
    expect(updatePage).toHaveBeenCalledTimes(1)
    await act(async () => release())
  })

  it('"Add icon" opens the (lazy) icon picker; choosing writes the icon', async () => {
    const r = renderUI()
    fireEvent.click(r.getByRole('button', { name: 'Add icon' }))
    const radio = await r.findByRole('radio', { name: 'Book open' })
    fireEvent.click(radio)
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith('p1', { icon: 'book-open' }))
  })

  it('"Add cover" opens the (lazy) cover picker; a link writes the cover', async () => {
    const r = renderUI()
    fireEvent.click(r.getByRole('button', { name: 'Add cover' }))
    const input = await r.findByRole('textbox', { name: 'Image link' })
    fireEvent.change(input, { target: { value: 'https://e.com/c.png' } })
    fireEvent.click(r.getByRole('button', { name: 'Use link' }))
    await waitFor(() => expect(updatePage).toHaveBeenCalledWith('p1', { cover_image: 'https://e.com/c.png' }))
  })
})
