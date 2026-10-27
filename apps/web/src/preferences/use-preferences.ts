// ============================================================================
// Preferences hooks — preferences-rescope R2 (LIF-247), PLAN-R2 R2-BR-1/6/9.
//
// The live read/write seam every surface uses (replaces the in-session
// `settings/use-preferences.ts`). React Query over SQLite is the source of truth
// (gate A6): two exact keys, one per singleton table. All cache logic lives in
// the writer (writer-instance.ts) — these hooks only read, drop echo patches,
// and report an honest save state (EC-7; Settings renders it with SyncStatus — R3; the revert toast is the writer’s).
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { NAV_PREFERENCES_DEFAULTS, USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { navPreferencesQuery, userPreferencesQuery } from './preferences-queries'
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
  /** R3 — BOTH tables hold a loaded value (so on `error` the view is "what was last loaded", not the defaults). */
  hasData: boolean
  /** state-conventions §3 — re-read ONLY the errored key(s) (`refetch()`; never on mount, PLAN-R3 rev 2.2). Never
   *  rejects (`refetch` resolves with the error result, `throwOnError: false`); resolves `true` when every re-read
   *  succeeded — the surface uses it to END a Retry even when `state` never changes (a later error that fails again). */
  retry: () => Promise<boolean>
}

export function usePreferences(): PreferencesRead {
  // R3-BR-1: the same definitions the boot seed uses — one read path, one cache entry per table.
  const user = useQuery(userPreferencesQuery())
  const nav = useQuery(navPreferencesQuery())
  const state: PreferencesState =
    user.isError || nav.isError ? 'error' : user.isPending || nav.isPending ? 'loading' : 'success'
  const view = useMemo(
    () => toView(user.data ?? USER_PREFERENCES_DEFAULTS, nav.data ?? NAV_PREFERENCES_DEFAULTS),
    [user.data, nav.data],
  )
  const { isError: userErrored, refetch: refetchUser } = user
  const { isError: navErrored, refetch: refetchNav } = nav
  const retry = useCallback(async () => {
    const reads = [userErrored && refetchUser(), navErrored && refetchNav()].filter((r) => r !== false)
    const settled = await Promise.allSettled(reads)
    return settled.every((r) => r.status === 'fulfilled' && !r.value.isError)
  }, [userErrored, navErrored, refetchUser, refetchNav])
  return {
    view,
    state,
    error: user.error ?? nav.error,
    hasData: user.data !== undefined && nav.data !== undefined,
    retry,
  }
}

/** The writes one view patch turns into (echo keys dropped, IR-1); `null` = nothing would change. */
function writeViewPatch(patch: ViewPatch): Promise<PromiseSettledResult<unknown>[]> | null {
  const user = preferencesWriter.withoutEcho('user', toUserPatch(patch))
  const nav = preferencesWriter.withoutEcho('nav', toNavPatch(patch))
  const writes: Promise<unknown>[] = []
  if (Object.keys(user).length > 0) writes.push(preferencesWriter.writePreferences(user))
  if (Object.keys(nav).length > 0) writes.push(preferencesWriter.writeNavPreferences(nav))
  return writes.length === 0 ? null : Promise.allSettled(writes)
}

/**
 * R3 — the module-level view write (no React state): optimistic now, persisted through the writer. Never rejects; a
 * failure is reverted + reported by the writer (one toast per failed batch). The Settings context's default `update`.
 */
export async function updateView(patch: ViewPatch): Promise<void> {
  await writeViewPatch(patch)
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
    const settled = writeViewPatch(patch)
    if (settled === null) return // nothing would change — no echo write (IR-1)
    const id = ++seq.current
    setSaveState('saving')
    const results = await settled
    const failed = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')
    if (failed) {
      failedSinceSaved.current =
        failed.reason instanceof PreferencesWriteError
          ? failed.reason
          : new PreferencesWriteError('unknown', failed.reason)
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
