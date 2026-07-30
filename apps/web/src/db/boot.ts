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

/** The process-wide DB client (spawns the worker on first call). */
export function getDbClient(): WorkerDbClient {
  if (client) return client
  client = new WorkerDbClient()
  // The SPA holds one client for its whole lifetime; `close()` is logical-only,
  // `terminate()` is the physical teardown. Terminate on unload so the worker
  // isn't orphaned (no explicit close() in the app flow).
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => client?.terminate())
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
