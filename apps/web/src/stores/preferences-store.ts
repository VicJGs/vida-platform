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
  setReduceMotion: (on: boolean) => void
  setArrangement: (arrangement: HomeArrangement) => void
  /** Deferred-seam activation point — the read hook calls this with the persisted values once the DB seam lands. */
  hydrate: (patch: Partial<Pick<PreferencesStoreState, 'reduceMotion' | 'arrangement'>>) => void
}

export const usePreferencesStore = create<PreferencesStoreState>()((set) => ({
  reduceMotion: false,
  arrangement: 'journalFirst',
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
  setArrangement: (arrangement) => set({ arrangement }),
  hydrate: (patch) => set((s) => ({ ...s, ...patch })),
}))
