// @vitest-environment jsdom
// notes-rescope R1 · B-15 / F-7 / BR-R1-7 — a failed create is never silent: one toast naming the action (test A7).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const createPage = vi.fn<() => Promise<unknown>>()
vi.mock('../db/composition-root', () => ({ getServices: () => Promise.resolve({ notes: { createPage } }) }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => vi.fn() }))
const notifySpy = vi.fn<(action: string, e: unknown) => void>()
vi.mock('../lib/notify-error', () => ({ notifyError: (a: string, e: unknown) => notifySpy(a, e) }))

import { useCreateNote } from './use-create-note'

afterEach(() => {
  cleanup()
  notifySpy.mockReset()
  createPage.mockReset()
})

describe('useCreateNote — failure surface (R1)', () => {
  it('a rejected createPage raises exactly one toast "create the note"', async () => {
    createPage.mockRejectedValue(new Error('disk full'))
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    const { result } = renderHook(() => useCreateNote(), {
      wrapper: ({ children }) => createElement(QueryClientProvider, { client: qc }, children),
    })
    await act(async () => {
      result.current.createNote()
      await new Promise((r) => setTimeout(r, 0))
    })
    expect(notifySpy).toHaveBeenCalledTimes(1)
    expect(notifySpy).toHaveBeenCalledWith('create the note', expect.any(Error))
  })
})
