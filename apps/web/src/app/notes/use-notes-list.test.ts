// @vitest-environment jsdom
// MOD-notes ② · B5 — the Neural-graph edge fan-out. `toGraphEdges` is the pure correctness surface (filter + map);
// `useNotesGraphEdges` is the React-Query fan-out (enabled gate + Promise.all over the node set). The service is
// mocked (no real DB/worker); the QueryClient is a fresh per-test instance (retry off, no stale global staleTime).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { PageLinkRow } from '@vida/core'

const h = vi.hoisted(() => ({ getPageLinksFrom: vi.fn() }))
vi.mock('./notes-service', () => ({ getNotesService: () => ({ getPageLinksFrom: h.getPageLinksFrom }) }))

import { toGraphEdges, useNotesGraphEdges } from './use-notes-list'

const link = (source: string, target: string): PageLinkRow =>
  ({ id: `${source}->${target}`, source_page_id: source, target_page_id: target }) as unknown as PageLinkRow

afterEach(() => {
  cleanup()
  h.getPageLinksFrom.mockReset()
})

describe('toGraphEdges (BR-B5-1/2 — pure map + dangling filter)', () => {
  const nodes = new Set(['a', 'b', 'c'])

  it('maps a live page_link to a directed GraphEdge (source_page_id → source)', () => {
    expect(toGraphEdges([link('a', 'b')], nodes)).toEqual([{ source: 'a', target: 'b' }])
  })

  it('drops an edge whose target is not a live node (dangling — no dangling passed to the renderer)', () => {
    expect(toGraphEdges([link('a', 'z')], nodes)).toEqual([])
  })

  it('drops an edge whose source is not a live node', () => {
    expect(toGraphEdges([link('z', 'a')], nodes)).toEqual([])
  })

  it('returns [] for no rows', () => {
    expect(toGraphEdges([], nodes)).toEqual([])
  })

  it('keeps only the both-ends-present edges from a mixed set', () => {
    expect(toGraphEdges([link('a', 'b'), link('a', 'z'), link('b', 'c')], nodes)).toEqual([
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' },
    ])
  })
})

describe('useNotesGraphEdges (BR-B5-3 — lazy fan-out)', () => {
  const wrapper = ({ children }: { children: ReactNode }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return createElement(QueryClientProvider, { client }, children)
  }

  it('does NOT fan out when disabled (view !== neural)', async () => {
    const { result } = renderHook(() => useNotesGraphEdges(['a', 'b'], false), { wrapper })
    // idle: the query never runs, so the service read is never called
    expect(h.getPageLinksFrom).not.toHaveBeenCalled()
    expect(result.current.data).toBeUndefined()
  })

  it('does NOT fan out for an empty node set (enabled but nodeIds=[])', () => {
    renderHook(() => useNotesGraphEdges([], true), { wrapper })
    expect(h.getPageLinksFrom).not.toHaveBeenCalled()
  })

  it('fans out getPageLinksFrom over every node + returns the mapped, filtered edges when enabled', async () => {
    // node 'a' links to 'b'; node 'b' links to 'z' (dangling — 'z' not in the set) → only a→b survives.
    h.getPageLinksFrom.mockImplementation((id: string) =>
      Promise.resolve(id === 'a' ? [link('a', 'b')] : id === 'b' ? [link('b', 'z')] : []),
    )
    const { result } = renderHook(() => useNotesGraphEdges(['a', 'b'], true), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(h.getPageLinksFrom).toHaveBeenCalledTimes(2)
    expect(h.getPageLinksFrom).toHaveBeenCalledWith('a')
    expect(h.getPageLinksFrom).toHaveBeenCalledWith('b')
    expect(result.current.data).toEqual([{ source: 'a', target: 'b' }])
  })
})
