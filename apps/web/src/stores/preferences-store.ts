import { create } from 'zustand'

// fe-settings S3 — the app-owned in-session store for NON-theme preferences the Settings surface edits (the theme
// selection lives in theme-store.ts). House Zustand pattern (app-shell-ui-store.ts). Ephemeral UI state, module-scope
// singleton.
//
// ⚠ TRANSITIONAL MIRROR (preferences-rescope R2): React Query over SQLite is the source of truth (apps/web/src/preferences/);
// `PreferencesBridge` hydrates this store from the persisted view so the not-yet-migrated panes render persisted values.
// Each pane moves onto `useUpdatePreferences` in its slice (R3/R5/R6); R6 deletes this store. Pane edits made here
// before their slice lands are in-session only. R3 moved the Home arrangement off this store (Home reads
// `usePreferences().view.arrangement`; the Appearance pane writes it through the writer). R4 moved reduce motion and R5 the
// module maps (`moduleVisibility`/`moduleNames` — the Modules pane, the dock and ⌘K read `usePreferences().view`).

export type TimeFormat = '12h' | '24h'
/** 0 = Sunday, 1 = Monday (mirrors user_preferences.week_starts_on). */
export type WeekStartsOn = 0 | 1

interface PreferencesStoreState {
  /** S6 — Locale (mirrors user_preferences.date_format/time_format/week_starts_on). */
  dateFormat: string
  timeFormat: TimeFormat
  weekStartsOn: WeekStartsOn
  /** S6 — Notifications (mirrors user_preferences.notification_in_app/push/email + quiet_hours_enabled). */
  notifInApp: boolean
  notifPush: boolean
  notifEmail: boolean
  quietHours: boolean
  setDateFormat: (format: string) => void
  setTimeFormat: (format: TimeFormat) => void
  setWeekStartsOn: (day: WeekStartsOn) => void
  setNotifInApp: (on: boolean) => void
  setNotifPush: (on: boolean) => void
  setNotifEmail: (on: boolean) => void
  setQuietHours: (on: boolean) => void
  /** Hydration point — `PreferencesBridge` calls this with the persisted values (R2) so the mirrored panes render them. */
  hydrate: (
    patch: Partial<
      Pick<
        PreferencesStoreState,
        | 'dateFormat'
        | 'timeFormat'
        | 'weekStartsOn'
        | 'notifInApp'
        | 'notifPush'
        | 'notifEmail'
        | 'quietHours'
      >
    >,
  ) => void
}

export const usePreferencesStore = create<PreferencesStoreState>()((set) => ({
  // S6 defaults mirror USER_PREFERENCES_DEFAULTS (service.ts:55-77).
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  weekStartsOn: 1,
  notifInApp: true,
  notifPush: true,
  notifEmail: true,
  quietHours: false,
  setDateFormat: (dateFormat) => set({ dateFormat }),
  setTimeFormat: (timeFormat) => set({ timeFormat }),
  setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
  setNotifInApp: (notifInApp) => set({ notifInApp }),
  setNotifPush: (notifPush) => set({ notifPush }),
  setNotifEmail: (notifEmail) => set({ notifEmail }),
  setQuietHours: (quietHours) => set({ quietHours }),
  hydrate: (patch) => set((s) => ({ ...s, ...patch })),
}))
