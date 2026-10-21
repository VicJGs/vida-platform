// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useNoteEntity } from './use-note-entity'

// The live hook reads via React Query over the composition root; mock the root.
vi.mock('../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({
      notes: {
        getPage: async (id: string) =>
          id === 'exists'
            ? {
                id,
                type: 'note',
                title: 'Found',
                content: null,
                is_favorite: 0,
                is_archived: 0,
                updated_at: Date.now(),
                journal_date: null,
                icon: null,
                cover_image: null,
              }
            : null,
      },
    }),
}))

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useNoteEntity (S2) — live', () => {
  it('returns honest-empty when the page does not exist', async () => {
    const { result } = renderHook(() => useNoteEntity('missing'), { wrapper })
    await waitFor(() => expect(result.current.state).not.toBe('loading'))
    expect(result.current.page).toBeNull()
    expect(result.current.state).toBe('empty')
  })

  it('maps a found page to the entity shape (success)', async () => {
    const { result } = renderHook(() => useNoteEntity('exists'), { wrapper })
    await waitFor(() => expect(result.current.state).toBe('success'))
    expect(result.current.page?.title).toBe('Found')
    expect(result.current).toHaveProperty('page')
    expect(result.current).toHaveProperty('state')
  })
})
