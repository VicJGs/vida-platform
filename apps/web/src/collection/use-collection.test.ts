// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, renderHook, act } from '@testing-library/react'
import type { ResolvedView } from '@vida/core'
import type { ViewLayout } from '@vida/types'
import { useCollection } from './use-collection'

afterEach(cleanup)
const LAYOUTS: readonly ViewLayout[] = ['list', 'gallery', 'calendar', 'graph']
const resolved = (rows: unknown[], state: ResolvedView['state']): ResolvedView => ({ rows, groups: [], state, degraded: [] })

describe('useCollection (S1 — first Collection consumer)', () => {
  it('defaults layout to the first available + maps chrome from the resolved set', () => {
    const { result } = renderHook(() => useCollection('notes-default', LAYOUTS))
    expect(result.current.layout).toBe('list')
    const chrome = result.current.chromeFor(resolved([{}, {}], 'success'))
    expect(chrome.layout).toBe('list')
    expect(chrome.layouts).toEqual(LAYOUTS)
    expect(chrome.count).toBe(2)
    expect(chrome.state).toBe('success')
  })

  it('onLayoutChange switches the (M1 local) layout', () => {
    const { result } = renderHook(() => useCollection('notes-default', LAYOUTS))
    act(() => result.current.onLayoutChange('gallery'))
    expect(result.current.layout).toBe('gallery')
    expect(result.current.chromeFor(resolved([], 'empty')).layout).toBe('gallery')
  })

  it('chrome reflects the empty terminal honestly (count 0)', () => {
    const { result } = renderHook(() => useCollection('notes-default', LAYOUTS))
    const chrome = result.current.chromeFor(resolved([], 'empty'))
    expect(chrome.state).toBe('empty')
    expect(chrome.count).toBe(0)
  })
})
