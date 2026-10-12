import { describe, it, expect, beforeEach } from 'vitest'
import { usePreferencesStore } from './preferences-store'

describe('preferences store (fe-settings S3 — in-session non-theme prefs, §A0 deferred persistence)', () => {
  beforeEach(() => usePreferencesStore.setState({ reduceMotion: false, arrangement: 'journalFirst' }))

  it('defaults: reduceMotion off, arrangement journalFirst', () => {
    const s = usePreferencesStore.getState()
    expect(s.reduceMotion).toBe(false)
    expect(s.arrangement).toBe('journalFirst')
  })

  it('setReduceMotion toggles the flag', () => {
    usePreferencesStore.getState().setReduceMotion(true)
    expect(usePreferencesStore.getState().reduceMotion).toBe(true)
  })

  it('setArrangement switches the home arrangement', () => {
    usePreferencesStore.getState().setArrangement('dashboardFirst')
    expect(usePreferencesStore.getState().arrangement).toBe('dashboardFirst')
  })

  it('hydrate (the deferred-seam activation point) merges a partial patch', () => {
    usePreferencesStore.getState().hydrate({ arrangement: 'dashboardFirst' })
    expect(usePreferencesStore.getState().arrangement).toBe('dashboardFirst')
    expect(usePreferencesStore.getState().reduceMotion).toBe(false) // untouched key preserved
  })
})
