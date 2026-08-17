// UI-4 · S4 (LIF-89) — the first-run boot-resolution hook. Turns the async marker read into a THREE-state signal
// the App.tsx branch consumes, so the app chrome never flashes before onboarding (S4-BR-c). Keys ONLY on the
// marker (S4-BR-b). `markComplete` writes THEN flips (S4-BR-d) — a reload never re-shows a completed onboarding.
import { useCallback, useEffect, useState } from 'react'
import { readFirstRunComplete, writeFirstRunComplete } from './first-run-repo'

export type FirstRunStatus = 'resolving' | 'onboarding' | 'ready'

export interface FirstRun {
  readonly status: FirstRunStatus
  /** Write the completion marker, then flip to 'ready'. Rejects (status unchanged) if the write fails. */
  readonly markComplete: () => Promise<void>
}

/**
 * Resolve first-run against the device-local marker once the DB is open.
 * @param dbReady the App.tsx boot gate — the marker read is deferred until the worker DB is open + migrated.
 */
export function useFirstRun(dbReady: boolean): FirstRun {
  const [status, setStatus] = useState<FirstRunStatus>('resolving')

  useEffect(() => {
    if (!dbReady) return
    // StrictMode-safe: the dev double-effect is guarded by `active` (the App.tsx:32-34 / boot R9 precedent).
    let active = true
    readFirstRunComplete()
      .then((done) => {
        if (active) setStatus(done ? 'ready' : 'onboarding')
      })
      .catch(() => {
        // A read failure must never strand the boot at Loading. Show onboarding (the mandatory gate); the
        // completion write is idempotent, so re-showing + re-writing is safe (S4-BR-c).
        if (active) setStatus('onboarding')
      })
    return () => {
      active = false
    }
  }, [dbReady])

  const markComplete = useCallback(async () => {
    await writeFirstRunComplete() // write THEN flip — a reject leaves status 'onboarding' (S4-BR-d)
    setStatus('ready')
  }, [])

  return { status, markComplete }
}
