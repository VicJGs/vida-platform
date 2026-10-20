import type { ThemeSelection } from '@vida/ui'
import { useThemeStore } from '../stores/theme-store'
import { usePreferencesStore, type HomeArrangement } from '../stores/preferences-store'

// fe-settings S3 — the preferences read/write SEAM. In M1 this reads the in-session stores (theme + preferences) and
// the "write" applies optimistically to those stores; the live DB read/write is a DEFERRED SEAM (seam-contract §A0 —
// blocked by the apps/web worker-RPC `values` seam, the first-consumer home fe-notes deferred). The signatures match
// the live shape so activation is drop-in: the read becomes `useQuery(['preferences'], getMergedPreferences)` + a
// `hydrate()` into the stores; the write becomes a `useMutation` calling `preferencesService.updatePreferences` +
// `invalidateQueries(['preferences'])` (query-client staleTime is 30s → invalidate-on-write, not stale-read).

/** The merged preferences view the Settings surface reads. M1: in-session stores over defaults. `state` carries the
 *  honest-state scaffold (EC-7) — always 'success' while the read is a deferred-default seam; a real read error would
 *  surface 'error' (render defaults read-only) once the live read activates. */
export interface PreferencesView {
  selection: ThemeSelection
  reduceMotion: boolean
  arrangement: HomeArrangement
  state: 'loading' | 'error' | 'success'
}

export function usePreferences(): PreferencesView {
  const selection = useThemeStore((s) => s.selection)
  const reduceMotion = usePreferencesStore((s) => s.reduceMotion)
  const arrangement = usePreferencesStore((s) => s.arrangement)
  // DEFERRED SEAM: the live read (getMergedPreferences via the worker) + hydrate() lands at first-consumer activation.
  return { selection, reduceMotion, arrangement, state: 'success' }
}

/** The write seam. M1: applies optimistically to the in-session stores (the live effect); DB persistence is deferred
 *  (§A0) so there is no throw and no error toast on a toggle. Activation swaps the body for a React-Query mutation. */
export function useUpdatePreferences() {
  const setSelection = useThemeStore((s) => s.setSelection)
  const setReduceMotion = usePreferencesStore((s) => s.setReduceMotion)
  const setArrangement = usePreferencesStore((s) => s.setArrangement)
  return {
    setSelection,
    setReduceMotion,
    setArrangement,
    // persist(patch) — DEFERRED: once the worker write seam lands, this calls updatePreferences(patch) +
    // invalidateQueries(['preferences']). In M1 it is a documented no-op (the store setters above are the live apply).
  }
}
