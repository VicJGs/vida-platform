// ============================================================================
// DB boot — AR-4 (LIF-75). Owns the single main-thread DB client and the
// one-time open+migrate at app start.
//
// StrictMode-safe by construction: the client and the open promise are
// module-scope memoized (`??=`), so React 19's dev double-mount / double-effect
// cannot spawn a second worker or double-open (R5/R9). `open()` in the worker
// also migrates (worker.ts) — no separate migrate call here.
//
// MOD-notes ②a: boot also resolves+caches the device id (device-local `app_state`
// KV, after migrate creates the table) so `getDeviceId()` is synchronous for the
// post-boot data plane (App gates render on this promise → no hook runs before it).
//
// Boot also calls `initVault()` (libsodium WASM ready) — a hard precondition of every
// repository WRITE, since `_sync_hash` is a keyless BLAKE2b hash computed on write.
// See docs/specs/fixes/vault-not-initialized-on-boot. (A follow-up hoists this into
// @vida/core's DB-open path so mobile/desktop don't re-forget it.)
// ============================================================================

import { initVault } from '@vida/core'
import { WorkerDbClient } from './client'
import { getOrCreateDeviceId } from './device-id'

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
      // initVault() loads libsodium WASM (no key/password) — a HARD precondition of
      // every repository WRITE: `_sync_hash` is computed on write via hashContent()
      // (BLAKE2b), which throws `assertReady()` until the WASM is loaded. This is
      // independent of field-level [E] encryption, so it's required even in the M1.0
      // empty-[E] pass-through (ADR-017), and runs main-thread (the hash is computed
      // before the SQL crosses to the worker). Overlapped with open() — no shared dep.
      // Fix: docs/specs/fixes/vault-not-initialized-on-boot.
      await Promise.all([initVault(), c.open(DB_NAME)]) // libsodium ready + DB open+migrate
      await getOrCreateDeviceId(c.driver) // resolve+cache before any data-plane consumer (DP-3)
      return c
    } catch (e) {
      readyPromise = null
      throw e
    }
  })())
}
