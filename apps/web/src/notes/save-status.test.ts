// @vitest-environment jsdom
// notes-rescope R1 · BR-R1-5 / G6 — the per-page save-status store (one chip per host, survives tab switches).
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { StrictMode, createElement } from 'react'
import { act, cleanup, renderHook } from '@testing-library/react'
import { __resetSaveStatus, getSaveStatus, observed, setSaveStatus, useSaveStatus } from './save-status'

beforeEach(() => __resetSaveStatus())
afterEach(cleanup)

describe('save-status store (G6)', () => {
  it('a page with no write yet reads saved (it was loaded from the device)', () => {
    expect(getSaveStatus('p1')).toBe('saved')
  })

  it('useSaveStatus follows set: saved → error → saved', () => {
    const { result } = renderHook(() => useSaveStatus('p1'))
    expect(result.current).toBe('saved')
    act(() => setSaveStatus('p1', 'error'))
    expect(result.current).toBe('error')
    act(() => setSaveStatus('p1', 'saved'))
    expect(result.current).toBe('saved')
  })

  it('is per page id', () => {
    setSaveStatus('a', 'error')
    expect(getSaveStatus('a')).toBe('error')
    expect(getSaveStatus('b')).toBe('saved')
  })

  it("'locked' is sticky — a late saved/error can't bring the chip back over the EC-33 notice", () => {
    setSaveStatus('p1', 'locked')
    setSaveStatus('p1', 'saved')
    setSaveStatus('p1', 'error')
    expect(getSaveStatus('p1')).toBe('locked')
  })

  it('observed() counts live subscriptions, balanced under StrictMode', () => {
    expect(observed('p1')).toBe(false)
    const { unmount } = renderHook(() => useSaveStatus('p1'), {
      wrapper: ({ children }) => createElement(StrictMode, null, children),
    })
    expect(observed('p1')).toBe(true)
    unmount()
    expect(observed('p1')).toBe(false)
  })

  it('two observers: observed until the last one leaves', () => {
    const a = renderHook(() => useSaveStatus('p1'))
    const b = renderHook(() => useSaveStatus('p1'))
    a.unmount()
    expect(observed('p1')).toBe(true)
    b.unmount()
    expect(observed('p1')).toBe(false)
  })
})
