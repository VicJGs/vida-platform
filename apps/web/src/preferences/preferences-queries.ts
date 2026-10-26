// ============================================================================
// Preferences queries — preferences-rescope R3 (LIF-247), PLAN-R3 R3-BR-1/2.
//
// ONE read definition per singleton table (key + queryFn + the writer's
// epoch/noteConfirmed reconcile), used by BOTH `usePreferences` and the boot seed,
// so there is exactly one read path and one cache entry per table.
// `seedPreferences` runs inside App's boot gate (before the first themed paint,
// B2/N6): it never rejects — a failed read leaves the queries in error and the app
// boots on the defaults (PR-2, MUST-4). Both definitions set `retryOnMount: false` (PLAN-R3 rev 2.2): an errored,
// data-less query is otherwise re-read by EVERY mounting reader and reset to `pending` — a loading↔content surface then
// loops forever. Recovery is the error state's Retry → `refetch()` (state-conventions §3).
// ============================================================================

import type { QueryClient } from '@tanstack/react-query'
import type { MergedNavPreferences, MergedPreferences } from '@vida/types'
import { getServices } from '../db/composition-root'
import { NAV_PREFS_KEY, USER_PREFS_KEY } from './preferences-keys'
import type { PreferencesTable } from './preferences-writer'
import { FORCED_PREFS_FAILURE } from './force-flag'
import { preferencesWriter } from './writer-instance'

export { parseForceFlag } from './force-flag'

const readCount: Record<PreferencesTable, number> = { user: 0, nav: 0 }

/** DEV only: `prefs-read-error` fails every read (the boot seed too → the first-read state); `prefs-refetch-error`
 *  lets the first read per table succeed and fails later ones (→ the "last loaded" state, via a write's refetch). */
function forcedReadFailure(t: PreferencesTable): void {
  readCount[t]++
  if (FORCED_PREFS_FAILURE === 'prefs-read-error' || (FORCED_PREFS_FAILURE === 'prefs-refetch-error' && readCount[t] > 1)) {
    throw new Error(`forced: ${FORCED_PREFS_FAILURE}`)
  }
}

export function userPreferencesQuery() {
  return {
    queryKey: USER_PREFS_KEY,
    retryOnMount: false,
    queryFn: async (): Promise<MergedPreferences> => {
      forcedReadFailure('user')
      const epoch = preferencesWriter.epoch('user')
      const read = await (await getServices()).preferences.getMergedPreferences()
      return preferencesWriter.noteConfirmed('user', read, epoch)
    },
  }
}

export function navPreferencesQuery() {
  return {
    queryKey: NAV_PREFS_KEY,
    retryOnMount: false,
    queryFn: async (): Promise<MergedNavPreferences> => {
      forcedReadFailure('nav')
      const epoch = preferencesWriter.epoch('nav')
      const read = await (await getServices()).preferences.getNavPreferences()
      return preferencesWriter.noteConfirmed('nav', read, epoch)
    },
  }
}

/** The boot seed (B2): fetch both tables, no retry, and NEVER reject — the gate only waits for it to settle. */
export async function seedPreferences(qc: QueryClient): Promise<void> {
  await Promise.allSettled([
    qc.fetchQuery({ ...userPreferencesQuery(), retry: 0 }),
    qc.fetchQuery({ ...navPreferencesQuery(), retry: 0 }),
  ])
}
