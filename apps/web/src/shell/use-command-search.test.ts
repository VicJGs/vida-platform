// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCommandSearch } from './use-command-search'
import { stubSearchProvider } from '../command-bar/search-provider'
import type { SearchOutcome, SearchProvider } from '../command-bar/types'

describe('useCommandSearch', () => {
  it('an empty query is idle (command mode — no provider call)', () => {
    const { result } = renderHook(() => useCommandSearch('', stubSearchProvider))
    expect(result.current.status).toBe('idle')
  })

  it('a non-empty query resolves to the stub outcome (search-unavailable in M1.0)', async () => {
    const { result } = renderHook(() => useCommandSearch('meeting notes', stubSearchProvider))
    await waitFor(() => expect(result.current.status).toBe('search-unavailable'))
    expect(result.current.message).toMatch(/DB-8/)
  })

  it('is race-guarded — a stale (slower) query never clobbers the latest', async () => {
    // 'a' resolves LATER than 'b'; without the guard 'a' would overwrite 'b'.
    const provider: SearchProvider = {
      search: (q) =>
        new Promise<SearchOutcome>((res) => setTimeout(() => res({ status: 'empty', message: q }), q === 'a' ? 40 : 0)),
    }
    const { result, rerender } = renderHook(({ q }) => useCommandSearch(q, provider), {
      initialProps: { q: 'a' },
    })
    rerender({ q: 'b' })
    await waitFor(() => expect(result.current.message).toBe('b'))
    // let the delayed 'a' resolve — the guard must discard it
    await new Promise((r) => setTimeout(r, 60))
    expect(result.current.message).toBe('b')
  })
})
