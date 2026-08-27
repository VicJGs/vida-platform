// @vitest-environment jsdom
// MOD-notes ② · B5 — the R1 liveness regression guard. A `[[` link write must invalidate the whole `['links']`
// namespace (Backlinks + Links-out + the Neural graph key `['links','graph',…]`) — NOT just `NOTES_LIST_KEY`, which
// under staleTime:30s never reaches the graph and left the new edge invisible (BR-B5-5, EC-10). React-Query
// invalidation is prefix-based, so one `['links']` key covers all three. Service mocked; QueryClient spied.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const h = vi.hoisted(() => ({ createPageLink: vi.fn(), removePageLink: vi.fn(), getSummaryConfig: vi.fn() }))
vi.mock('../notes/notes-service', () => ({
  getNotesService: () => ({
    createPageLink: h.createPageLink,
    removePageLink: h.removePageLink,
    getSummaryConfig: h.getSummaryConfig,
  }),
}))
// Toast is a real @vida/ui import in use-note.ts — stub it so onError/onSuccess don't touch the DOM store here.
vi.mock('@vida/ui', () => ({ toast: vi.fn() }))

import { useCreatePageLink, useRemovePageLink, useSummaryConfig } from './use-note'

afterEach(() => {
  cleanup()
  h.createPageLink.mockReset()
  h.removePageLink.mockReset()
  h.getSummaryConfig.mockReset()
})

function setup<T>(hook: () => T) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const spy = vi.spyOn(client, 'invalidateQueries')
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  const { result } = renderHook(hook, { wrapper })
  // The invalidated queryKeys, in call order (c[0] = InvalidateQueryFilters, whose `queryKey` we assert on).
  const keys = (): unknown[] => spy.mock.calls.map((c) => c[0]?.queryKey)
  return { result, keys }
}

describe('useCreatePageLink — R1 liveness invalidation (BR-B5-5)', () => {
  it('invalidates the ["links"] namespace AND the list on success (never list-only)', async () => {
    h.createPageLink.mockResolvedValue({ id: 'n1->t1' })
    const { result, keys } = setup(() => useCreatePageLink('n1'))
    result.current.mutate('t1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(keys()).toContainEqual(['links']) // ← reaches the graph key ['links','graph',…] by prefix
    expect(keys()).toContainEqual(['pages', 'list'])
  })
})

describe('useRemovePageLink — same ["links"] invalidation (Links-out remove reflects in the graph)', () => {
  it('invalidates the ["links"] namespace + the list on success', async () => {
    h.removePageLink.mockResolvedValue(undefined)
    const { result, keys } = setup(() => useRemovePageLink('n1'))
    result.current.mutate('t1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(keys()).toContainEqual(['links'])
    expect(keys()).toContainEqual(['pages', 'list'])
  })
})

describe('useSummaryConfig — B7 reads the ① getSummaryConfig on its own key (BR-B7-4)', () => {
  it('reads getSummaryConfig(id) and returns the parsed config', async () => {
    h.getSummaryConfig.mockResolvedValue({ showHabits: true })
    const { result } = setup(() => useSummaryConfig('p1'))
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(h.getSummaryConfig).toHaveBeenCalledWith('p1')
    expect(result.current.data).toEqual({ showHabits: true })
  })
})
