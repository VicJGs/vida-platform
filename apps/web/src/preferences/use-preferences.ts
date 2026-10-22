// ============================================================================
// Preferences hooks — preferences-rescope R2 (LIF-247), PLAN-R2 R2-BR-1/6/9.
//
// The live read/write seam every surface uses (replaces the in-session
// `settings/use-preferences.ts`). React Query over SQLite is the source of truth
// (gate A6): two exact keys, one per singleton table. All cache logic lives in
// the writer (writer-instance.ts) — these hooks only read, drop echo patches,
// and report an honest save state (EC-7; the copy + toast land in R3).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NAV_PREFERENCES_DEFAULTS, USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { getServices } from '../db/composition-root'
import { NAV_PREFS_KEY, USER_PREFS_KEY } from './preferences-keys'
import { toNavPatch, toUserPatch, toView, type PreferencesView, type ViewPatch } from './preferences-view'
import { PreferencesWriteError } from './preferences-writer'
import { preferencesWriter } from './writer-instance'

export type PreferencesState = 'loading' | 'error' | 'success'
export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export interface PreferencesRead {
  /** Always defined: the persisted view; while loading or on a first-read error, the defaults (render read-only); on a
   *  later refetch error, the last good view. */
  view: PreferencesView
  state: PreferencesState
  error: unknown
}

export function usePreferences(): PreferencesRead {
  const user = useQuery({
    queryKey: USER_PREFS_KEY,
    queryFn: async () => {
      const epoch = preferencesWriter.epoch('user')
      const read = await (await getServices()).preferences.getMergedPreferences()
      return preferencesWriter.noteConfirmed('user', read, epoch)
    },
  })
  const nav = useQuery({
    queryKey: NAV_PREFS_KEY,
    queryFn: async () => {
      const epoch = preferencesWriter.epoch('nav')
      const read = await (await getServices()).preferences.getNavPreferences()
      return preferencesWriter.noteConfirmed('nav', read, epoch)
    },
  })
  const state: PreferencesState =
    user.isError || nav.isError ? 'error' : user.isPending || nav.isPending ? 'loading' : 'success'
  const view = useMemo(
    () => toView(user.data ?? USER_PREFERENCES_DEFAULTS, nav.data ?? NAV_PREFERENCES_DEFAULTS),
    [user.data, nav.data],
  )
  return { view, state, error: user.error ?? nav.error }
}

export interface PreferencesUpdate {
  /** Apply a view edit: optimistic now, persisted (debounced, batched) through the writer. */
  update: (patch: ViewPatch) => Promise<void>
  saveState: SaveState
  lastError: PreferencesWriteError | null
}

export function useUpdatePreferences(): PreferencesUpdate {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [lastError, setLastError] = useState<PreferencesWriteError | null>(null)
  const seq = useRef(0)
  const failedSinceSaved = useRef<PreferencesWriteError | null>(null)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const update = useCallback(async (patch: ViewPatch) => {
    const user = preferencesWriter.withoutEcho('user', toUserPatch(patch))
    const nav = preferencesWriter.withoutEcho('nav', toNavPatch(patch))
    const writes: Promise<unknown>[] = []
    if (Object.keys(user).length > 0) writes.push(preferencesWriter.writePreferences(user))
    if (Object.keys(nav).length > 0) writes.push(preferencesWriter.writeNavPreferences(nav))
    if (writes.length === 0) return // nothing would change — no echo write (IR-1)
    const id = ++seq.current
    setSaveState('saving')
    const results = await Promise.allSettled(writes)
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) {
      failedSinceSaved.current =
        failed.reason instanceof PreferencesWriteError ? failed.reason : new PreferencesWriteError('unknown', failed.reason)
    }
    if (!mounted.current || id !== seq.current) return // a newer call owns the state (it folds this failure in)
    // EC-7 honest states: an earlier call's failure is not hidden by a later success.
    if (failedSinceSaved.current) {
      setLastError(failedSinceSaved.current)
      setSaveState('error')
      failedSinceSaved.current = null
    } else {
      setSaveState('saved')
    }
  }, [])

  return { update, saveState, lastError }
}
