// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, renderHook } from '@testing-library/react'
import { useCommandKeybind } from './use-command-keybind'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'

beforeEach(() => {
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function dispatchKey(init: KeyboardEventInit): KeyboardEvent {
  const ev = new KeyboardEvent('keydown', { cancelable: true, ...init })
  document.dispatchEvent(ev)
  return ev
}

describe('useCommandKeybind', () => {
  it('⌘K (mac) opens the store + preventDefaults', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' })
    renderHook(() => useCommandKeybind())
    const ev = dispatchKey({ key: 'k', metaKey: true })
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('Ctrl+K (other) opens the store', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' })
    renderHook(() => useCommandKeybind())
    dispatchKey({ key: 'k', ctrlKey: true })
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })

  it('a bare "k" (no modifier) does nothing', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' })
    renderHook(() => useCommandKeybind())
    const ev = dispatchKey({ key: 'k' })
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
    expect(ev.defaultPrevented).toBe(false)
  })

  it('LENIENT MOD: ⌘K opens even when platform detection resolves "other" (the farbled-navigator bug)', () => {
    // The exact Visual-Gate failure: a real Mac whose navigator is farbled to non-Mac → detectPlatform() === 'other'.
    // With a single-mod match this ignored ⌘K; the lenient match must still open on the metaKey combo.
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' })
    renderHook(() => useCommandKeybind())
    const ev = dispatchKey({ key: 'k', metaKey: true })
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
    expect(ev.defaultPrevented).toBe(true)
  })

  it('LENIENT MOD: Ctrl+K also opens on a mac platform (either mod is accepted)', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' })
    renderHook(() => useCommandKeybind())
    dispatchKey({ key: 'k', ctrlKey: true })
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })

  it('removes the listener on unmount', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: '' })
    const { unmount } = renderHook(() => useCommandKeybind())
    unmount()
    dispatchKey({ key: 'k', ctrlKey: true })
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
  })
})
