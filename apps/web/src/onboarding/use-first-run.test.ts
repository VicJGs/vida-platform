// @vitest-environment jsdom
// UI-4 · S4 — the 3-state boot resolution + write-then-flip completion. `./first-run-repo` is mocked (FOLD-1).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({ read: vi.fn(), write: vi.fn() }))
vi.mock('./first-run-repo', () => ({ readFirstRunComplete: h.read, writeFirstRunComplete: h.write }))

import { useFirstRun } from './use-first-run'

beforeEach(() => {
  h.read.mockReset()
  h.write.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('useFirstRun', () => {
  it('stays resolving and never reads while dbReady is false', () => {
    const { result } = renderHook(({ ready }) => useFirstRun(ready), { initialProps: { ready: false } })
    expect(result.current.status).toBe('resolving')
    expect(h.read).not.toHaveBeenCalled()
  })

  it('resolves to ready when the marker is complete', async () => {
    h.read.mockResolvedValue(true)
    const { result } = renderHook(() => useFirstRun(true))
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('resolves to onboarding when the marker is absent', async () => {
    h.read.mockResolvedValue(false)
    const { result } = renderHook(() => useFirstRun(true))
    await waitFor(() => expect(result.current.status).toBe('onboarding'))
  })

  it('resolves to onboarding (never strands) when the read rejects', async () => {
    h.read.mockRejectedValue(new Error('db read failed'))
    const { result } = renderHook(() => useFirstRun(true))
    await waitFor(() => expect(result.current.status).toBe('onboarding'))
  })

  it('markComplete writes THEN flips to ready', async () => {
    h.read.mockResolvedValue(false)
    h.write.mockResolvedValue(undefined)
    const { result } = renderHook(() => useFirstRun(true))
    await waitFor(() => expect(result.current.status).toBe('onboarding'))
    await act(async () => {
      await result.current.markComplete()
    })
    expect(h.write).toHaveBeenCalledTimes(1)
    expect(result.current.status).toBe('ready')
  })

  it('leaves status unchanged and rejects when the write fails', async () => {
    h.read.mockResolvedValue(false)
    h.write.mockRejectedValue(new Error('write failed'))
    const { result } = renderHook(() => useFirstRun(true))
    await waitFor(() => expect(result.current.status).toBe('onboarding'))
    await act(async () => {
      await expect(result.current.markComplete()).rejects.toThrow('write failed')
    })
    expect(result.current.status).toBe('onboarding')
  })
})
