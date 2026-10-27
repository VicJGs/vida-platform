// preferences-rescope R3 (PLAN-R3 R3-BR-3; IMPL-PLAN-R3 step 7) — `theme-store` is a DERIVED cache of the persisted
// `['preferences','user']` entry (PR-5 exemption): the cache is the truth, the store follows it synchronously, and the
// onboarding preview is a layer over it that re-hydration never clobbers. (Rewritten from the fe-settings S2 setter
// tests: the setters are gone — writes go through the writer.)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { THEME_DEFAULT } from '@vida/ui'
import { NAV_PREFERENCES_DEFAULTS, USER_PREFERENCES_DEFAULTS } from '@vida/core'
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

// preferences-rescope R4 (PLAN-R4 R4-BR-2; IMPL-PLAN-R4 step 8) — `reduceMotion` derives from the NAV entry through the
// SAME cache subscription (no second Zustand-holds-prefs exemption), so UIProvider — outside QueryClientProvider — gets it.
describe('theme-store reduceMotion (derived from the nav entry)', () => {
  const motion = () => useThemeStore.getState().reduceMotion

  it('is false with an empty cache', () => {
    expect(motion()).toBe(false)
  })

  it('follows a seeded nav row before any render (the boot seed loads nav too — first themed frame)', async () => {
    testPreferences.state.nav = { ...NAV_PREFERENCES_DEFAULTS, reduce_motion: true }
    await seedPreferences(queryClient)
    expect(motion()).toBe(true)
  })

  it('a writer edit moves it SYNCHRONOUSLY, and a rejected write returns it (PR-4 revert)', async () => {
    await seedPreferences(queryClient)
    void preferencesWriter.writeNavPreferences({ reduce_motion: true })
    expect(motion()).toBe(true) // optimistic — same tick
    await preferencesWriter.flushAll()
    testPreferences.state.failNext = new Error('boom')
    const p = preferencesWriter.writeNavPreferences({ reduce_motion: false }).catch(() => {})
    expect(motion()).toBe(false)
    await p
    expect(motion()).toBe(true) // reverted to the confirmed value
  })

  it('an unrelated nav change sets nothing; clearing the cache (removed) falls back to false', async () => {
    testPreferences.state.nav = { ...NAV_PREFERENCES_DEFAULTS, reduce_motion: true }
    await seedPreferences(queryClient)
    let sets = 0
    const unsub = useThemeStore.subscribe(() => sets++)
    await preferencesWriter.writeNavPreferences({ show_labels: false })
    unsub()
    expect(sets).toBe(0)
    queryClient.clear()
    expect(motion()).toBe(false)
  })

  it('a failed nav seed leaves it false — the OS query still applies (R4-BR-6)', async () => {
    testPreferences.state.failReads = 'all'
    await seedPreferences(queryClient)
    expect(motion()).toBe(false)
  })
})
