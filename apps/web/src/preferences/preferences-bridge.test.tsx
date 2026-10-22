// @vitest-environment jsdom
// preferences-rescope R2 (LIF-247) — the transitional mirror + the hide flush (PLAN-R2 R2-BR-7/10, §4.5).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, render, waitFor } from '@testing-library/react'
import { createElement } from 'react'

vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { queryClient } from '../lib/query-client'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { usePreferencesStore } from '../stores/preferences-store'
import { preferencesWriter, resetPreferencesWriterForTests } from './writer-instance'
import { PreferencesBridge } from './preferences-bridge'

const Wrapper = createPrefsWrapper()
const mount = () => render(createElement(Wrapper, null, createElement(PreferencesBridge)))

beforeEach(() => {
  resetTestPreferences()
  usePreferencesStore.setState({ dateFormat: 'YYYY-MM-DD', timeFormat: '24h', reduceMotion: false })
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
  vi.restoreAllMocks()
})

describe('PreferencesBridge', () => {
  it('hydrates the store from the persisted view once both reads succeed', async () => {
    testPreferences.state.user = { ...(await testPreferences.svc.getMergedPreferences()), date_format: 'DD/MM/YYYY' }
    testPreferences.state.nav = { ...(await testPreferences.svc.getNavPreferences()), reduce_motion: true }
    mount()
    await waitFor(() => expect(usePreferencesStore.getState().dateFormat).toBe('DD/MM/YYYY'))
    expect(usePreferencesStore.getState().reduceMotion).toBe(true)
  })

  it('re-hydrates ONLY changed fields — an in-session edit to another field survives', async () => {
    mount()
    await waitFor(() => expect(queryClient.getQueryData(['preferences', 'nav'])).toBeDefined())
    usePreferencesStore.getState().setTimeFormat('12h') // an in-session edit to a not-yet-moved pane
    await preferencesWriter.writePreferences({ date_format: 'MM/DD/YYYY' })
    await preferencesWriter.flushAll()
    await waitFor(() => expect(usePreferencesStore.getState().dateFormat).toBe('MM/DD/YYYY'))
    expect(usePreferencesStore.getState().timeFormat).toBe('12h') // untouched: its DB value did not change
  })

  it('flushes pending writes when the page is hidden, and registers its listeners once', async () => {
    const flush = vi.spyOn(preferencesWriter, 'flushAll')
    const add = vi.spyOn(document, 'addEventListener')
    const { unmount } = mount()
    expect(add.mock.calls.filter((c) => c[0] === 'visibilitychange')).toHaveLength(1)
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(flush).toHaveBeenCalledTimes(1)
    window.dispatchEvent(new Event('pagehide'))
    expect(flush).toHaveBeenCalledTimes(2)
    const remove = vi.spyOn(document, 'removeEventListener')
    unmount()
    expect(remove.mock.calls.some((c) => c[0] === 'visibilitychange')).toBe(true)
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })
})
