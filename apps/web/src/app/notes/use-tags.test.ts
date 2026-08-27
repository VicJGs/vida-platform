// @vitest-environment jsdom
// MOD-notes ② · B6 — the tag hooks. Reads (useTags/useNoteTags) + fail-loud writes (useTagNote/useUntagNote/
// useCreateTag) mirroring B4's pattern: onError Toast, onSuccess invalidate the ['tags'] namespace + NOTES_LIST_KEY
// (never noteKey). The service + toast are mocked; the QueryClient is a fresh per-test instance.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor, cleanup } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { EntityTagRow, TagRow } from '@vida/core'

const h = vi.hoisted(() => ({
  listTags: vi.fn(),
  getTagsForEntity: vi.fn(),
  tagEntity: vi.fn(),
  untagEntity: vi.fn(),
  createTag: vi.fn(),
  toast: vi.fn(),
}))
vi.mock('./notes-service', () => ({
  getNotesService: () => ({
    listTags: h.listTags,
    getTagsForEntity: h.getTagsForEntity,
    tagEntity: h.tagEntity,
    untagEntity: h.untagEntity,
    createTag: h.createTag,
  }),
}))
vi.mock('@vida/ui', () => ({ toast: h.toast }))

import { useTags, useNoteTags, useTagNote, useUntagNote, useCreateTag } from './use-tags'

const tag = (id: string, name: string): TagRow => ({ id, name }) as unknown as TagRow

function wrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const spy = vi.spyOn(client, 'invalidateQueries')
  const Wrap = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
  return { Wrap, spy }
}

afterEach(() => {
  cleanup()
  Object.values(h).forEach((fn) => fn.mockReset())
})

describe('useTags / useNoteTags (reads)', () => {
  it('useTags reads listTags()', async () => {
    h.listTags.mockResolvedValue([tag('t1', 'work')])
    const { Wrap } = wrapper()
    const { result } = renderHook(() => useTags(), { wrapper: Wrap })
    await waitFor(() => expect(result.current.data).toEqual([tag('t1', 'work')]))
  })

  it('useNoteTags reads getTagsForEntity("page", id)', async () => {
    const row = { tag_id: 't1', entity_type: 'page', entity_id: 'n1' } as unknown as EntityTagRow
    h.getTagsForEntity.mockResolvedValue([row])
    const { Wrap } = wrapper()
    const { result } = renderHook(() => useNoteTags('n1'), { wrapper: Wrap })
    await waitFor(() => expect(result.current.data).toEqual([row]))
    expect(h.getTagsForEntity).toHaveBeenCalledWith('page', 'n1')
  })
})

describe('tag writes (fail-loud + invalidation)', () => {
  it('useTagNote invalidates ["tags"] + NOTES_LIST_KEY on success', async () => {
    h.tagEntity.mockResolvedValue({})
    const { Wrap, spy } = wrapper()
    const { result } = renderHook(() => useTagNote('n1'), { wrapper: Wrap })
    result.current.mutate('t1')
    await waitFor(() => expect(h.tagEntity).toHaveBeenCalledWith('t1', 'page', 'n1'))
    await waitFor(() => {
      expect(spy).toHaveBeenCalledWith({ queryKey: ['tags'] })
      expect(spy).toHaveBeenCalledWith({ queryKey: ['pages', 'list'] })
    })
  })

  it('useTagNote toasts on error (fail-loud, never swallowed)', async () => {
    h.tagEntity.mockRejectedValue(new Error('boom'))
    const { Wrap } = wrapper()
    const { result } = renderHook(() => useTagNote('n1'), { wrapper: Wrap })
    result.current.mutate('t1')
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith({ title: "Couldn't add tag", intent: 'danger' }))
  })

  it('useUntagNote calls untagEntity("page") + invalidates', async () => {
    h.untagEntity.mockResolvedValue(undefined)
    const { Wrap, spy } = wrapper()
    const { result } = renderHook(() => useUntagNote('n1'), { wrapper: Wrap })
    result.current.mutate('t1')
    await waitFor(() => expect(h.untagEntity).toHaveBeenCalledWith('t1', 'page', 'n1'))
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['tags'] }))
  })

  it('useCreateTag delegates createTag + invalidates the tag list', async () => {
    h.createTag.mockResolvedValue(tag('t9', 'new'))
    const { Wrap, spy } = wrapper()
    const { result } = renderHook(() => useCreateTag(), { wrapper: Wrap })
    result.current.mutate('new')
    await waitFor(() => expect(h.createTag).toHaveBeenCalledWith('new'))
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['tags', 'list'] }))
  })
})
