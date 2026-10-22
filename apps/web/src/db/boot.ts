// ============================================================================
// DB boot — AR-4 (LIF-75). Owns the single main-thread DB client and the
// one-time open+migrate at app start.
//
// StrictMode-safe by construction: the client and the open promise are
// module-scope memoized (`??=`), so React 19's dev double-mount / double-effect
// cannot spawn a second worker or double-open (R5/R9). `open()` in the worker
// also migrates (worker.ts) — no separate migrate call here.
// ============================================================================

import { WorkerDbClient } from './client'

const DB_NAME = 'vida'

let client: WorkerDbClient | null = null
let readyPromise: Promise<WorkerDbClient> | null = null

/**
 * Worker teardown on NON-cancelable page-lifecycle events only (preferences-rescope R1, R1-BR-8):
 * - `pagehide` + `persisted` (entering the bfcache) → `terminate()`: a frozen page must not keep the exclusive OPFS
 *   handles (AccessHandlePoolVFS), or a new tab / a URL return would hit "in use" until eviction.
 * - `pageshow` + `persisted` (restored from the bfcache) → `reload()`: the worker is gone, start clean.
 * - a normal unload → nothing: the browser discards the dedicated worker with its document (e2e reloads prove it).
 * Never `beforeunload` — it is cancelable, and a cancelled navigation would leave a live page with a dead worker.
 * A transaction cannot finish after unload anyway (each statement needs a main-thread round trip); pending writes are
 * protected by flushing while the page is still visible (R2), not here.
 */
export function registerTeardown(
  target: Pick<EventTarget, 'addEventListener'>,
  worker: Pick<WorkerDbClient, 'terminate'>,
  reload: () => void,
): void {
  target.addEventListener('pagehide', (e) => {
    if ((e as PageTransitionEvent).persisted) worker.terminate()
  })
  target.addEventListener('pageshow', (e) => {
    if ((e as PageTransitionEvent).persisted) reload() // a reload is never `persisted` → no loop
  })
}

/** The process-wide DB client (spawns the worker on first call). */
export function getDbClient(): WorkerDbClient {
  if (client) return client
  client = new WorkerDbClient()
  // The SPA holds one client for its whole lifetime; `close()` is logical-only, `terminate()` the physical teardown.
  if (typeof window !== 'undefined') {
    registerTeardown(window, client, () => window.location.reload())
  }
  return client
}

/**
 * Open + migrate exactly once; repeat callers await the same promise.
 * On failure the memo is CLEARED so a retry (e.g. an error-boundary "Retry")
 * can re-attempt — a rejected promise must not be cached forever.
 */
export function ensureDbReady(): Promise<WorkerDbClient> {
  return (readyPromise ??= (async () => {
    try {
      const c = getDbClient()
      await c.open(DB_NAME)
      return c
    } catch (e) {
      readyPromise = null
      throw e
    }
  })())
}
