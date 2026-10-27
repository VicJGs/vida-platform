import { describe, it, expect, beforeEach } from 'vitest'
import { usePreferencesStore } from './preferences-store'

describe('preferences store (fe-settings S3 — in-session non-theme prefs, §A0 deferred persistence)', () => {
  beforeEach(() =>
    usePreferencesStore.setState({
      timeFormat: '24h',
      moduleVisibility: {},
      moduleNames: {},
    }),
  )

  it('no longer mirrors the Home arrangement (R3) or reduce motion (R4) — both are live via usePreferences', () => {
    const s = usePreferencesStore.getState()
    expect('arrangement' in s).toBe(false)
    expect('reduceMotion' in s).toBe(false)
    expect('setReduceMotion' in s).toBe(false)
  })

  it('hydrate (the deferred-seam activation point) merges a partial patch', () => {
    usePreferencesStore.getState().hydrate({ moduleVisibility: { finance: false } })
    expect(usePreferencesStore.getState().moduleVisibility).toEqual({ finance: false })
    expect(usePreferencesStore.getState().timeFormat).toBe('24h') // untouched key preserved
  })

  // S5 — module show/hide + rename (read-merge-write into the maps; absent key ⇒ visible/canonical label)
  it('setModuleVisible merges into the map without clobbering siblings', () => {
    const s = usePreferencesStore.getState()
    s.setModuleVisible('finance', false)
    s.setModuleVisible('habits', true)
    expect(usePreferencesStore.getState().moduleVisibility).toEqual({ finance: false, habits: true })
  })

  it('setModuleName merges into the names map', () => {
    usePreferencesStore.getState().setModuleName('habits', 'Rituals')
    expect(usePreferencesStore.getState().moduleNames.habits).toBe('Rituals')
  })

  it('hydrate also merges module maps', () => {
    usePreferencesStore.getState().hydrate({ moduleVisibility: { sync: false }, moduleNames: { notes: 'Pages' } })
    expect(usePreferencesStore.getState().moduleVisibility.sync).toBe(false)
    expect(usePreferencesStore.getState().moduleNames.notes).toBe('Pages')
  })

  // S6 — Locale + Notifications (defaults mirror USER_PREFERENCES_DEFAULTS)
  it('S6 defaults: date YYYY-MM-DD · 24h · week Mon · notifs on · quiet off', () => {
    const s = usePreferencesStore.getState()
    expect(s.dateFormat).toBe('YYYY-MM-DD')
    expect(s.timeFormat).toBe('24h')
    expect(s.weekStartsOn).toBe(1)
    expect(s.notifInApp).toBe(true)
    expect(s.notifPush).toBe(true)
    expect(s.notifEmail).toBe(true)
    expect(s.quietHours).toBe(false)
  })

  it('S6 setters update locale + notification fields', () => {
    const s = usePreferencesStore.getState()
    s.setDateFormat('DD/MM/YYYY')
    s.setTimeFormat('12h')
    s.setWeekStartsOn(0)
    s.setNotifPush(false)
    s.setQuietHours(true)
    const next = usePreferencesStore.getState()
    expect(next.dateFormat).toBe('DD/MM/YYYY')
    expect(next.timeFormat).toBe('12h')
    expect(next.weekStartsOn).toBe(0)
    expect(next.notifPush).toBe(false)
    expect(next.notifInApp).toBe(true) // sibling untouched
    expect(next.quietHours).toBe(true)
  })
})
