// @vitest-environment jsdom
// MOD-notes ②c — the autosave hook: skip-once echo (EM-3), debounce coalescing, flush-on-unmount (EM-10).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { EditorDocument } from '@vida/types'

const { mutate, useUpdatePage } = vi.hoisted(() => {
  const mutate = vi.fn()
  return { mutate, useUpdatePage: vi.fn(() => ({ mutate, isPending: false, isError: false })) }
})
vi.mock('./hooks', () => ({ useUpdatePage }))

import { useNoteAutosave } from './use-note-autosave'

const docA: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a' }] }] }
const docB: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'b' }] }] }

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
})
afterEach(() => vi.useRealTimers())

describe('useNoteAutosave', () => {
  it('drops the FIRST onChange (the mount echo) → no save', () => {
    const { result } = renderHook(() => useNoteAutosave('p1'))
    act(() => result.current.onChange(docA))
    act(() => vi.advanceTimersByTime(1000))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('a real edit debounces to ONE save with the serialized content', () => {
    const { result } = renderHook(() => useNoteAutosave('p1'))
    act(() => result.current.onChange(docA)) // echo — skipped
    act(() => result.current.onChange(docB)) // real edit
    expect(mutate).not.toHaveBeenCalled() // still within the debounce window
    act(() => vi.advanceTimersByTime(600))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith({ id: 'p1', patch: { content: JSON.stringify(docB) } })
  })

  it('coalesces rapid edits into a single save (the latest wins)', () => {
    const { result } = renderHook(() => useNoteAutosave('p1'))
    act(() => result.current.onChange(docA)) // echo
    act(() => result.current.onChange(docA)) // edit 1
    act(() => result.current.onChange(docB)) // edit 2
    act(() => vi.advanceTimersByTime(600))
    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate).toHaveBeenCalledWith({ id: 'p1', patch: { content: JSON.stringify(docB) } })
  })

  it('flushes a pending save on unmount (EM-10 — no lost edit on fast navigate)', () => {
    const { result, unmount } = renderHook(() => useNoteAutosave('p1'))
    act(() => result.current.onChange(docA)) // echo
    act(() => result.current.onChange(docB)) // real edit, still debouncing
    expect(mutate).not.toHaveBeenCalled()
    unmount()
    expect(mutate).toHaveBeenCalledWith({ id: 'p1', patch: { content: JSON.stringify(docB) } })
  })
})
