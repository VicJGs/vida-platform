// preferences-rescope R3 (PLAN-R3 R3-BR-3; IMPL-PLAN-R3 step 7) — `theme-store` is a DERIVED cache of the persisted
// `['preferences','user']` entry (PR-5 exemption): the cache is the truth, the store follows it synchronously, and the
// onboarding preview is a layer over it that re-hydration never clobbers. (Rewritten from the fe-settings S2 setter
// tests: the setters are gone — writes go through the writer.)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { THEME_DEFAULT } from '@vida/ui'
import { USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { queryClient } from '../lib/query-client'
import { USER_PREFS_KEY } from '../preferences/preferences-keys'
import { seedPreferences } from '../preferences/preferences-queries'
import { preferencesWriter, resetPreferencesWriterForTests } from '../preferences/writer-instance'
import { resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { resetThemeStoreForTests, useThemeStore } from './theme-store'

const sel = () => useThemeStore.getState().selection

beforeEach(() => {
  resetTestPreferences()
})
afterEach(() => {
  queryClient.clear()
  resetPreferencesWriterForTests()
  resetThemeStoreForTests()
})

describe('theme-store (derived cache)', () => {
  it('boots at THEME_DEFAULT with an empty cache', () => {
    expect(sel()).toEqual(THEME_DEFAULT)
  })

  it('follows a seeded row (dark + dense + quietDesk) before any render', async () => {
    testPreferences.state.user = {
      ...USER_PREFERENCES_DEFAULTS,
      theme: 'dark',
      compact_mode: true,
      dashboard_layout: { theme: 'quietDesk' },
    }
    await seedPreferences(queryClient)
    expect(sel()).toEqual({ preset: 'quietDesk', mode: 'dark', density: 'dense' })
  })

  it('a writer edit moves the selection SYNCHRONOUSLY (optimistic, EC-5 instant)', async () => {
    await seedPreferences(queryClient)
    void preferencesWriter.patchDashboardLayout({ theme: 'reader' })
    expect(sel().preset).toBe('reader') // no await: the cache listener ran in the same tick
    await preferencesWriter.flushAll()
  })

  it('a rejected write returns the selection to the confirmed value', async () => {
    await seedPreferences(queryClient)
    testPreferences.state.failNext = new Error('boom')
    const p = preferencesWriter.writePreferences({ theme: 'dark' }).catch(() => {})
    expect(sel().mode).toBe('dark')
    await p
    expect(sel().mode).toBe('light')
  })

  it('clearing the cache (removed) falls back to THEME_DEFAULT', async () => {
    testPreferences.state.user = { ...USER_PREFERENCES_DEFAULTS, theme: 'dark' }
    await seedPreferences(queryClient)
    expect(sel().mode).toBe('dark')
    queryClient.clear()
    expect(sel()).toEqual(THEME_DEFAULT)
  })

  it('the preview layer overrides only the preset, survives a cache update, and clears back to the persisted one', async () => {
    await seedPreferences(queryClient)
    useThemeStore.getState().setPreview('reader')
    expect(sel().preset).toBe('reader')
    queryClient.setQueryData(USER_PREFS_KEY, { ...USER_PREFERENCES_DEFAULTS, theme: 'dark' }) // a re-hydration
    expect(sel()).toEqual({ preset: 'reader', mode: 'dark', density: 'calm' }) // preview kept, mode followed
    useThemeStore.getState().setPreview(null)
    expect(sel().preset).toBe('editorial')
  })

  it('an unrelated user-row change does not replace the selection object (no needless UIProvider render)', async () => {
    await seedPreferences(queryClient)
    const before = sel()
    await preferencesWriter.writePreferences({ time_format: '12h' })
    expect(sel()).toBe(before)
  })
})
