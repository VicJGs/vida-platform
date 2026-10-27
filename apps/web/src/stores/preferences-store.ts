import { create } from 'zustand'

// fe-settings S3 — the app-owned in-session store for NON-theme preferences the Settings surface edits (the theme
// selection lives in theme-store.ts). House Zustand pattern (app-shell-ui-store.ts). Ephemeral UI state, module-scope
// singleton.
//
// ⚠ TRANSITIONAL MIRROR (preferences-rescope R2): React Query over SQLite is the source of truth (apps/web/src/preferences/);
// `PreferencesBridge` hydrates this store from the persisted view so the not-yet-migrated panes render persisted values.
// Each pane moves onto `useUpdatePreferences` in its slice (R3/R5/R6); R6 deletes this store. Pane edits made here
// before their slice lands are in-session only. R3 moved the Home arrangement off this store (Home reads
// `usePreferences().view.arrangement`; the Appearance pane writes it through the writer). S5 extends this store with moduleVisibility / moduleNames for the Modules pane.

export type TimeFormat = '12h' | '24h'
/** 0 = Sunday, 1 = Monday (mirrors user_preferences.week_starts_on). */
export type WeekStartsOn = 0 | 1

interface PreferencesStoreState {
  /** S5 — per-module nav show/hide (key → visible). Absent key ⇒ visible (default true). Persist seam → module_visibility. */
  moduleVisibility: Record<string, boolean>
  /** S5 — per-module custom name (key → label). Absent ⇒ the canonical module-map label. Persist seam → dashboard_layout.moduleNames. */
  moduleNames: Record<string, string>
  /** S6 — Locale (mirrors user_preferences.date_format/time_format/week_starts_on). */
  dateFormat: string
  timeFormat: TimeFormat
  weekStartsOn: WeekStartsOn
  /** S6 — Notifications (mirrors user_preferences.notification_in_app/push/email + quiet_hours_enabled). */
  notifInApp: boolean
  notifPush: boolean
  notifEmail: boolean
  quietHours: boolean
  setModuleVisible: (key: string, visible: boolean) => void
  setModuleName: (key: string, name: string) => void
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
        | 'moduleVisibility'
        | 'moduleNames'
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
  moduleVisibility: {},
  moduleNames: {},
  // S6 defaults mirror USER_PREFERENCES_DEFAULTS (service.ts:55-77).
  dateFormat: 'YYYY-MM-DD',
  timeFormat: '24h',
  weekStartsOn: 1,
  notifInApp: true,
  notifPush: true,
  notifEmail: true,
  quietHours: false,
  // read-merge-write into the map (the §B dashboard_layout/module_visibility merge discipline, applied in-session).
  setModuleVisible: (key, visible) =>
    set((s) => ({ moduleVisibility: { ...s.moduleVisibility, [key]: visible } })),
  setModuleName: (key, name) => set((s) => ({ moduleNames: { ...s.moduleNames, [key]: name } })),
  setDateFormat: (dateFormat) => set({ dateFormat }),
  setTimeFormat: (timeFormat) => set({ timeFormat }),
  setWeekStartsOn: (weekStartsOn) => set({ weekStartsOn }),
  setNotifInApp: (notifInApp) => set({ notifInApp }),
  setNotifPush: (notifPush) => set({ notifPush }),
  setNotifEmail: (notifEmail) => set({ notifEmail }),
  setQuietHours: (quietHours) => set({ quietHours }),
  hydrate: (patch) => set((s) => ({ ...s, ...patch })),
}))
