import { create } from 'zustand'

// fe-settings S3 — the app-owned in-session store for NON-theme preferences the Settings surface edits (the theme
// selection lives in theme-store.ts). House Zustand pattern (app-shell-ui-store.ts). Ephemeral UI state, module-scope
// singleton.
//
// ⚠ Hydrate-on-boot + persistence are DEFERRED SEAMS (seam-contract §A0): the live preferences read/write path is
// blocked by the apps/web worker-RPC `values` seam (db/client.ts:154) — the same first-consumer home fe-notes deferred.
// `hydrate()` is the activation point (use-preferences.ts calls it once the seam lands). In M1 these are in-session only
// (do not survive reload). S5 extends this store with moduleVisibility / moduleNames for the Modules pane.

export type HomeArrangement = 'journalFirst' | 'dashboardFirst'

interface PreferencesStoreState {
  /** App-pref mirror of nav_preferences.reduce_motion. NOTE: actual motion gating is OS-media-query-driven
   *  (@vida/ui useReducedMotion); this app-pref override's live effect is persistence-gated (§A0). */
  reduceMotion: boolean
  /** Home layout arrangement — read live by useHomeArrangement (home-surface.tsx) so the toggle applies in-session. */
  arrangement: HomeArrangement
  /** S5 — per-module nav show/hide (key → visible). Absent key ⇒ visible (default true). Persist seam → module_visibility. */
  moduleVisibility: Record<string, boolean>
  /** S5 — per-module custom name (key → label). Absent ⇒ the canonical module-map label. Persist seam → dashboard_layout.moduleNames. */
  moduleNames: Record<string, string>
  setReduceMotion: (on: boolean) => void
  setArrangement: (arrangement: HomeArrangement) => void
  setModuleVisible: (key: string, visible: boolean) => void
  setModuleName: (key: string, name: string) => void
  /** Deferred-seam activation point — the read hook calls this with the persisted values once the DB seam lands. */
  hydrate: (
    patch: Partial<
      Pick<PreferencesStoreState, 'reduceMotion' | 'arrangement' | 'moduleVisibility' | 'moduleNames'>
    >,
  ) => void
}

export const usePreferencesStore = create<PreferencesStoreState>()((set) => ({
  reduceMotion: false,
  arrangement: 'journalFirst',
  moduleVisibility: {},
  moduleNames: {},
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setArrangement: (arrangement) => set({ arrangement }),
  // read-merge-write into the map (the §B dashboard_layout/module_visibility merge discipline, applied in-session).
  setModuleVisible: (key, visible) =>
    set((s) => ({ moduleVisibility: { ...s.moduleVisibility, [key]: visible } })),
  setModuleName: (key, name) => set((s) => ({ moduleNames: { ...s.moduleNames, [key]: name } })),
  hydrate: (patch) => set((s) => ({ ...s, ...patch })),
}))
