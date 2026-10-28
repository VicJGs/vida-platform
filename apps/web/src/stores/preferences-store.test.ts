import { describe, it, expect, beforeEach } from 'vitest'
import { usePreferencesStore } from './preferences-store'

describe('preferences store (fe-settings S3 — in-session non-theme prefs, §A0 deferred persistence)', () => {
  beforeEach(() =>
    usePreferencesStore.setState({
      timeFormat: '24h',
      dateFormat: 'YYYY-MM-DD',
    }),
  )

  it('no longer mirrors the Home arrangement (R3) or reduce motion (R4) — both are live via usePreferences', () => {
    const s = usePreferencesStore.getState()
    expect('arrangement' in s).toBe(false)
    expect('reduceMotion' in s).toBe(false)
    expect('setReduceMotion' in s).toBe(false)
  })

  it('no longer mirrors the module maps (R5) — the Modules pane, dock and ⌘K read the seam', () => {
    const s = usePreferencesStore.getState()
    for (const key of ['moduleVisibility', 'moduleNames', 'setModuleVisible', 'setModuleName'])
      expect(key in s).toBe(false)
  })

  it('hydrate (the deferred-seam activation point) merges a partial patch', () => {
    usePreferencesStore.getState().hydrate({ dateFormat: 'DD/MM/YYYY' })
    expect(usePreferencesStore.getState().dateFormat).toBe('DD/MM/YYYY')
    expect(usePreferencesStore.getState().timeFormat).toBe('24h') // untouched key preserved
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
