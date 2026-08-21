// ============================================================================
// Main-thread Drizzle instance — MOD-notes ②a (LIF-131). The app-facing
// `DrizzleDb` that @vida/core services (NotesService, SpacesService, …) run
// against. Wraps the AR-4 worker RPC driver with `createDrizzleProxy` so every
// query/write crosses to the wa-sqlite/OPFS worker — NO HTTP (BR-RT-3).
//
// DP-8 — WHOLE-TRANSACTION SERIALIZATION (not per-RPC). `db.transaction(cb)`
// under sqlite-proxy emits `begin`/`commit` as SEPARATE RPCs, and every
// repository write is a `db.transaction` (repository.ts:349). The single worker
// connection cannot nest BEGIN, and the worker's async onmessage does not
// serialize. A per-RPC FIFO queue would NOT help — sqlite-proxy enqueues each
// txn's `begin` before its inner statements, so two concurrent writes interleave
// as `A:begin B:begin …` regardless. The correct unit is the whole transaction:
// a non-reentrant async mutex gates `.transaction` so each `begin…commit` runs to
// completion before the next `begin`. Deadlock-free — the repository opens no
// nested transaction (repository.ts:326 "No transaction opened here") so the
// mutex is never re-entered; reads (`db.select`) are NOT gated → concurrent
// (a read mid-transaction is harmless under single-user/single-connection).
// ============================================================================

import { createDrizzleProxy, type DrizzleDb } from '@vida/core'
import { getDbClient } from './boot'

let db: DrizzleDb | null = null

// The transaction mutex tail. Chained on SETTLE (not success) so a failed
// transaction never stalls the queue; the caller still receives its own
// rejection (we return the un-swallowed promise, and swallow only for the tail).
let txTail: Promise<unknown> = Promise.resolve()

/**
 * The process-wide main-thread `DrizzleDb` (memoized — DP-2). Its `.transaction`
 * is wrapped by the DP-8 mutex; everything else passes through to the base proxy.
 */
export function getDb(): DrizzleDb {
  if (db) return db
  const base = createDrizzleProxy(getDbClient().driver)

  db = new Proxy(base, {
    get(target, prop, receiver) {
      if (prop === 'transaction') {
        // Bind to the BASE (not the proxy) so drizzle's internals never recurse
        // back through this trap.
        const original = target.transaction.bind(target) as DrizzleDb['transaction']
        const gated: DrizzleDb['transaction'] = (...args) => {
          const run = () => original(...args)
          const p = txTail.then(run, run) // run regardless of the prior txn's outcome
          txTail = p.then(
            () => undefined,
            () => undefined,
          ) // tail swallows; the caller's `p` keeps its rejection
          return p
        }
        return gated
      }
      return Reflect.get(target, prop, receiver)
    },
  })

  return db
}

/** Test-only reset of the memoized instance + mutex (mirrors the boot memo pattern). */
export function resetDbForTest(): void {
  db = null
  txTail = Promise.resolve()
}
