// @vitest-environment jsdom
// MOD-notes ②a — the Notes data hooks. Proves the read → terminal-state mapping
// and the mutation → invalidation matrix (DP-6/DP-7) over a mocked NotesService
// (the service's own logic is ①-tested; here we test the RQ wiring only).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type ReactNode } from 'react'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const svc = {
  listPages: vi.fn(),
  getPage: vi.fn(),
  getPagesByType: vi.fn(),
  getBacklinks: vi.fn(),
  createPage: vi.fn(),
  updatePage: vi.fn(),
  createPageLink: vi.fn(),
}
vi.mock('../../services/notes-service', () => ({ getNotesService: () => svc }))

import { usePages, usePage, useCreatePage, useUpdatePage, useCreatePageLink } from './hooks'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
  return { qc, Wrapper }
}

beforeEach(() => vi.clearAllMocks())

describe('usePages — read + terminal state (DP-7)', () => {
  it('maps an empty result to state "empty"', async () => {
    svc.listPages.mockResolvedValue([])
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => usePages(), { wrapper: Wrapper })
    expect(result.current.state).toBe('loading') // isPending-first
    await waitFor(() => expect(result.current.state).toBe('empty'))
  })

  it('maps a non-empty result to state "success"', async () => {
    svc.listPages.mockResolvedValue([{ id: 'p1' }])
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => usePages(), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.state).toBe('success'))
    expect(result.current.data).toEqual([{ id: 'p1' }])
  })

  it('usePage maps a null (miss) to state "empty"', async () => {
    svc.getPage.mockResolvedValue(null)
    const { Wrapper } = makeWrapper()
    const { result } = renderHook(() => usePage('missing'), { wrapper: Wrapper })
    await waitFor(() => expect(result.current.state).toBe('empty'))
  })
})

describe('useCreatePage — invalidation matrix (DP-6)', () => {
  it('invalidates the lists + the created type on success', async () => {
    svc.createPage.mockResolvedValue({ id: 'p1', type: 'note' })
    const { qc, Wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useCreatePage(), { wrapper: Wrapper })

    await result.current.mutateAsync({ type: 'note', title: 'X' } as never)

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['notes', 'list'])
    expect(keys).toContainEqual(['notes', 'type', 'note'])
  })

  it('useUpdatePage invalidates the page key + lists + the page type', async () => {
    svc.updatePage.mockResolvedValue({ id: 'p1', type: 'note' })
    const { qc, Wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useUpdatePage(), { wrapper: Wrapper })

    await result.current.mutateAsync({ id: 'p1', patch: { title: 'Y' } as never })

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['notes', 'page', 'p1'])
    expect(keys).toContainEqual(['notes', 'list'])
    expect(keys).toContainEqual(['notes', 'type', 'note'])
  })

  it('useCreatePageLink invalidates the backlinks + pagelinks prefixes (both endpoints)', async () => {
    svc.createPageLink.mockResolvedValue({ id: 'l1' })
    const { qc, Wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useCreatePageLink(), { wrapper: Wrapper })

    await result.current.mutateAsync({ sourcePageId: 'a', targetPageId: 'b' })

    const keys = spy.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['notes', 'backlinks'])
    expect(keys).toContainEqual(['notes', 'pagelinks'])
  })
})
