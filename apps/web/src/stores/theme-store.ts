import { create } from 'zustand'
import { THEME_DEFAULT, type ThemeDensity, type ThemeMode, type ThemePreset, type ThemeSelection } from '@vida/ui'

// fe-settings S2 (EC-5 keystone) — the app-owned theme SELECTION store. AR-4: @vida/ui holds no theme state; the app
// owns it and feeds `<UIProvider selection>`. This store is the in-session source of truth that makes a preset/mode/
// density change re-theme the WHOLE app instantly (the Settings Appearance controls dispatch here, S3). The house
// Zustand pattern (app-shell-ui-store.ts) — ephemeral UI state, module-scope singleton.
//
// ⚠ Hydrate-on-boot + persistence are DEFERRED SEAMS (seam-contract §A0): the live preferences read/write path is
// blocked by the apps/web worker-RPC `values` seam (client.ts:154) — the same first-consumer home fe-notes deferred.
// `hydrate()` is the activation point (S3's usePreferences read calls it once the seam lands); persistence is S3's
// deferred write hook. In M1 the store boots at THEME_DEFAULT and the selection is in-session only (does not survive
// reload) — consistent with every other fe-* surface shipping its live data as a deferred seam.

interface ThemeStoreState {
  selection: ThemeSelection
  /** Replace the whole selection (used by `hydrate` + bulk set). */
  setSelection: (selection: ThemeSelection) => void
  setPreset: (preset: ThemePreset) => void
  setMode: (mode: ThemeMode) => void
  setDensity: (density: ThemeDensity) => void
  /** Deferred-seam activation point — S3's read hook calls this with the persisted selection once the DB seam lands. */
  hydrate: (selection: ThemeSelection) => void
}

export const useThemeStore = create<ThemeStoreState>()((set) => ({
  selection: THEME_DEFAULT,
  setSelection: (selection) => set({ selection }),
  setPreset: (preset) => set((s) => ({ selection: { ...s.selection, preset } })),
  setMode: (mode) => set((s) => ({ selection: { ...s.selection, mode } })),
  setDensity: (density) => set((s) => ({ selection: { ...s.selection, density } })),
  hydrate: (selection) => set({ selection }),
}))
