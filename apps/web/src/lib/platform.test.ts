// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { detectPlatform } from './platform'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('detectPlatform', () => {
  it('resolves a Mac (navigator.platform) to "mac"', () => {
    vi.stubGlobal('navigator', { platform: 'MacIntel', userAgent: '' })
    expect(detectPlatform()).toBe('mac')
  })

  it('resolves an iPhone (userAgent) to "mac" (⌘-key family)', () => {
    vi.stubGlobal('navigator', { platform: '', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)' })
    expect(detectPlatform()).toBe('mac')
  })

  it('resolves Windows to "other"', () => {
    vi.stubGlobal('navigator', { platform: 'Win32', userAgent: 'Mozilla/5.0 (Windows NT 10.0)' })
    expect(detectPlatform()).toBe('other')
  })

  it('resolves an undefined navigator (SSR) to "other"', () => {
    vi.stubGlobal('navigator', undefined)
    expect(detectPlatform()).toBe('other')
  })
})
