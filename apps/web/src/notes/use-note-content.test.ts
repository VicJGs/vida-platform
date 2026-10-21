// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderHook, act, cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { EditorDocument } from '@vida/types'
import { useNoteContent } from './use-note-content'

const writeSpy = vi.fn<(id: string, doc: EditorDocument) => Promise<unknown>>()

vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { writePageContent: (id: string, doc: EditorDocument) => writeSpy(id, doc) } }),
}))

const doc: EditorDocument = { type: 'doc', content: [] }

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useNoteContent (S2 — debounced content write, IR-7)', () => {
  beforeEach(() => {
    writeSpy.mockReset()
    writeSpy.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('debounces rapid edits to a single write (BR-NEU-3)', async () => {
    const { result } = renderHook(() => useNoteContent('p1'), { wrapper })
    act(() => {
      result.current.save(doc)
      result.current.save(doc)
      result.current.save(doc)
    })
    expect(writeSpy).not.toHaveBeenCalled() // still within the debounce window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenCalledTimes(1)
    expect(writeSpy).toHaveBeenCalledWith('p1', doc)
  })

  it('flushes the pending write on unmount — never drops the last edit', async () => {
    const { result, unmount } = renderHook(() => useNoteContent('p2'), { wrapper })
    act(() => {
      result.current.save(doc)
    })
    expect(writeSpy).not.toHaveBeenCalled()
    await act(async () => {
      unmount()
      await Promise.resolve()
    })
    expect(writeSpy).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed write as saveState="error" (BR-NEU-5)', async () => {
    writeSpy.mockRejectedValue(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useNoteContent('p3'), { wrapper })
    act(() => {
      result.current.save(doc)
    })
    // waitFor hangs under fake timers — advance + flush the mutation's microtask chain, then assert directly.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(result.current.saveState).toBe('error')
    expect(errSpy).toHaveBeenCalled()
    errSpy.mockRestore()
  })
})
