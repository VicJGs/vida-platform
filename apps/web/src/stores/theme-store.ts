import { create } from 'zustand'
import { hashKey } from '@tanstack/react-query'
import { THEME_DEFAULT, type ThemePreset, type ThemeSelection } from '@vida/ui'
import { NAV_PREFERENCES_DEFAULTS } from '@vida/core'
import type { MergedNavPreferences, MergedPreferences } from '@vida/types'
import { queryClient } from '../lib/query-client'
import { NAV_PREFS_KEY, USER_PREFS_KEY } from '../preferences/preferences-keys'
import { toView } from '../preferences/preferences-view'

// The app-owned theme SELECTION that feeds `<UIProvider selection>` (AR-4: @vida/ui holds no theme state).
//
// preferences-rescope R3 (PLAN-R3 R3-BR-3) — a DERIVED CACHE of the persisted `['preferences','user']` entry, the one
// Zustand-holds-prefs exemption (PR-5, structure-data.md:46; BR-RT-7). React Query over SQLite is the truth; this store
// only FOLLOWS it, through ONE query-cache subscription installed at module load over the `lib/query-client` singleton.
// It has no setters for the persisted theme: Appearance writes go through the preferences writer, which sets the cache
// optimistically (so the re-theme is still instant, EC-5) and restores it on failure (the theme follows it back).
// App renders `UIProvider` OUTSIDE `QueryClientProvider`, which is why this is a store and not a `useQuery`.
//
// The onboarding theme preview is a LAYER (`previewPreset`) over the persisted selection — the subscription never touches
// it, so a re-hydration can't clobber an active preview (E8). App clears it whenever guided setup closes (E8 revert).

interface ThemeStoreState {
  /** The persisted selection (derived from the user-preferences cache entry; THEME_DEFAULT when there is none). */
  persisted: ThemeSelection
  /** The guided-setup live preview, or null. */
  previewPreset: ThemePreset | null
  /** What `UIProvider` renders: the persisted selection with the preview's preset over it. */
  selection: ThemeSelection
  setPreview: (preset: ThemePreset | null) => void
  /** preferences-rescope R4 (R4-BR-2): `nav_preferences.reduce_motion`, derived from the nav entry by the SAME cache
   *  subscription (no second exemption). Feeds `<UIProvider reduceMotion>`; false = OS query only. */
  reduceMotion: boolean
}

function compose(persisted: ThemeSelection, previewPreset: ThemePreset | null): ThemeSelection {
  return previewPreset ? { ...persisted, preset: previewPreset } : persisted
}

const sameSelection = (a: ThemeSelection, b: ThemeSelection) =>
  a.preset === b.preset && a.mode === b.mode && a.density === b.density

export const useThemeStore = create<ThemeStoreState>()((set, get) => ({
  persisted: THEME_DEFAULT,
  previewPreset: null,
  selection: THEME_DEFAULT,
  reduceMotion: false,
  setPreview: (previewPreset) => {
    if (get().previewPreset === previewPreset) return
    set({ previewPreset, selection: compose(get().persisted, previewPreset) })
  },
}))

/** Re-derive `persisted` from the cache. Sets only on a real change, so an unrelated user-row field (e.g. time format)
 *  never hands `UIProvider` a new selection object. */
function syncFromCache(): void {
  const row = queryClient.getQueryData<MergedPreferences>(USER_PREFS_KEY)
  const next = row ? toView(row, NAV_PREFERENCES_DEFAULTS).selection : THEME_DEFAULT
  const { persisted, previewPreset } = useThemeStore.getState()
  if (sameSelection(persisted, next)) return
  useThemeStore.setState({ persisted: next, selection: compose(next, previewPreset) })
}

/** Re-derive `reduceMotion` from the nav entry (no entry / removed → false). Sets only on a real change. */
function syncMotionFromCache(): void {
  const next = queryClient.getQueryData<MergedNavPreferences>(NAV_PREFS_KEY)?.reduce_motion ?? false
  if (useThemeStore.getState().reduceMotion !== next) useThemeStore.setState({ reduceMotion: next })
}

const USER_PREFS_HASH = hashKey(USER_PREFS_KEY)
const NAV_PREFS_HASH = hashKey(NAV_PREFS_KEY)

// Install once. Query-cache listeners run synchronously (inside notifyManager.batch), so a writer `setQueryData` updates
// the theme in the same tick; `queryClient.clear()` emits `removed` → back to THEME_DEFAULT. No HMR dispose: a stacked
// dev-only listener is idempotent (syncFromCache sets only on change).
syncFromCache()
syncMotionFromCache()
queryClient.getQueryCache().subscribe((event) => {
  if (event.query.queryHash === USER_PREFS_HASH) syncFromCache()
  else if (event.query.queryHash === NAV_PREFS_HASH) syncMotionFromCache()
})

/** Tests only — drop any preview and re-derive from the (usually just-cleared) cache. */
export function resetThemeStoreForTests(): void {
  useThemeStore.setState({ previewPreset: null })
  syncFromCache()
  syncMotionFromCache()
  const { persisted } = useThemeStore.getState()
  useThemeStore.setState({ selection: persisted })
}
