// @vitest-environment jsdom
// notes-rescope R3 · G1/G2/G3 · BR-R3-1/2/6 · IMPL R-10 — live metadata writes (test C1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { NoteEntityData } from './use-note-entity'

const updatePage = vi.fn<(id: string, patch: Record<string, unknown>) => Promise<unknown>>()
vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { updatePage: (id: string, p: Record<string, unknown>) => updatePage(id, p) } }),
}))
const notifySpy = vi.fn()
vi.mock('../lib/notify-error', () => ({ notifyError: (...a: unknown[]) => notifySpy(...a) }))

import { usePageMetadata } from './use-page-metadata'

const page = (over: Partial<NoteEntityData> = {}): NoteEntityData => ({
  id: 'p1', type: 'note', title: 'T', content: null, contentStatus: 'absent', rawContent: null, favorite: false,
  archived: false, updated: 'now', journalDate: null, icon: null, cover: null, ...over,
})

let qc: QueryClient
let invalidated: unknown[][]
const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: qc }, children)
beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  invalidated = []
  vi.spyOn(qc, 'invalidateQueries').mockImplementation(async (f) => {
    invalidated.push((f as { queryKey: unknown[] }).queryKey)
  })
  updatePage.mockReset()
  updatePage.mockResolvedValue({})
  notifySpy.mockReset()
})
afterEach(cleanup)

const run = async (fn: () => void) => {
  await act(async () => {
    fn()
    await new Promise((r) => setTimeout(r, 0))
  })
}

describe('usePageMetadata — live (R3)', () => {
  it.each([
    ['toggleFavorite', (m: ReturnType<typeof usePageMetadata>) => m.toggleFavorite(), { is_favorite: true }],
    ['toggleArchive', (m: ReturnType<typeof usePageMetadata>) => m.toggleArchive(), { is_archived: true }],
    ['setIcon', (m: ReturnType<typeof usePageMetadata>) => m.setIcon('book-open'), { icon: 'book-open' }],
    ['setCover', (m: ReturnType<typeof usePageMetadata>) => m.setCover('https://e.com/c.png'), { cover_image: 'https://e.com/c.png' }],
    ['rename', (m: ReturnType<typeof usePageMetadata>) => m.rename('New'), { title: 'New' }],
  ] as const)('%s → updatePage with the exact patch', async (_n, act_, patch) => {
    const { result } = renderHook(() => usePageMetadata(page()), { wrapper })
    await run(() => act_(result.current))
    expect(updatePage).toHaveBeenCalledWith('p1', patch)
  })

  it('an empty rename stores null (G12)', async () => {
    const { result } = renderHook(() => usePageMetadata(page()), { wrapper })
    await run(() => result.current.rename(''))
    expect(updatePage).toHaveBeenCalledWith('p1', { title: null })
  })

  it('a metadata write invalidates the page + the list (G2)', async () => {
    const { result } = renderHook(() => usePageMetadata(page()), { wrapper })
    await run(() => result.current.toggleFavorite())
    expect(invalidated).toEqual([['pages', 'p1'], ['notes', 'pages']])
  })

  it('a rename also invalidates the forward keys; a journal page also its journal key (G2)', async () => {
    const { result } = renderHook(() => usePageMetadata(page({ type: 'journal', journalDate: '2026-10-27' })), { wrapper })
    await run(() => result.current.rename('Day'))
    expect(invalidated).toEqual([
      ['pages', 'p1'], ['notes', 'pages'], ['journal', '2026-10-27'], ['pages', 'resolve'], ['links', 'backlinks'],
    ])
  })

  it.each([
    ['toggleFavorite', 'favorite the page'],
    ['toggleArchive', 'archive the page'],
    ['setIcon', 'change the icon'],
    ['setCover', 'change the cover'],
    ['rename', 'rename the page'],
  ] as const)('%s failure → one toast "%s" (BR-R3-6)', async (fn, action) => {
    updatePage.mockRejectedValueOnce(new Error('disk'))
    const { result } = renderHook(() => usePageMetadata(page()), { wrapper })
    const m = result.current as unknown as Record<string, (v?: string) => void>
    await run(() => m[fn]!(fn === 'setIcon' ? 'star' : fn === 'setCover' ? 'https://e.com/a.png' : fn === 'rename' ? 'X' : undefined))
    expect(notifySpy).toHaveBeenCalledTimes(1)
    expect(notifySpy.mock.calls[0]?.[0]).toBe(action)
  })

  it('isPending while a write is in flight; a toggle pressed meanwhile is ignored (R-10)', async () => {
    let release: () => void = () => {}
    updatePage.mockImplementationOnce(() => new Promise((r) => (release = () => r({}))))
    const { result } = renderHook(() => usePageMetadata(page()), { wrapper })
    await run(() => result.current.toggleFavorite())
    await waitFor(() => expect(result.current.isPending).toBe(true))
    await run(() => result.current.toggleFavorite())
    expect(updatePage).toHaveBeenCalledTimes(1)
    await act(async () => release())
    await waitFor(() => expect(result.current.isPending).toBe(false))
  })
})
