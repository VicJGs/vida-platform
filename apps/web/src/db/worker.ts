// ============================================================================
// Database Web Worker — AR-2 in-worker proof
// ADR-001 §5
//
// Hosts the wa-sqlite engine off the main thread (AccessHandlePoolVFS needs a
// worker). Boots the DB via the web DatabaseAdapter, runs the (empty v0)
// migration registry, builds the async Drizzle proxy, and exposes a minimal
// open/exec/query/close message protocol. This proves the engine + driver +
// proxy wiring works and persists; the app-facing main↔worker binding is AR-4.
// ============================================================================

import { sql } from 'drizzle-orm'
import { migrate } from '@vida/core'
import type { SqliteDriver, DrizzleDb } from '@vida/core'
import { createWebDatabaseAdapter } from './web-adapter'

const adapter = createWebDatabaseAdapter()
let driver: SqliteDriver | null = null
let db: DrizzleDb | null = null

async function open(dbName: string): Promise<void> {
  driver = await adapter.open({ dbName }) // plain — no sqlCipher in M1.0
  await migrate(driver) // bootstraps app_state (DB-7 ensureInfra) + applies 001/002/003
  db = adapter.createDrizzle(driver)
  // Prove the Drizzle proxy callback fires end-to-end against wa-sqlite
  // (raw SQL — the schema barrel has no tables yet; table CRUD is covered by
  // the Node contract test).
  await db.run(sql`SELECT 1`)
}

// AR-4 extends AR-2's minimal `open|exec|query|close` proof to the surface the
// main-thread client (client.ts) needs: `run` (write), `migrate` (explicit),
// `exists` (per-name first-run detection). `exec` is KEPT as an alias of `run`
// (do not remove — AR-2 compatibility, R7).
// SEAM — `values` / `batch` (the Drizzle-proxy repository path) are deferred to
// when module entity-CRUD lands (UI-3 / M1.1+); add the ops here + on the client
// driver then. AR-4 grain = mechanism + one reference read, not the full data path.
type WorkerRequest =
  | { id: number; op: 'open'; dbName: string }
  | { id: number; op: 'exists'; dbName: string }
  | { id: number; op: 'migrate' }
  | { id: number; op: 'run'; sql: string; params?: unknown[] }
  | { id: number; op: 'exec'; sql: string; params?: unknown[] } // alias of 'run' (AR-2 compat)
  | { id: number; op: 'query'; sql: string; params?: unknown[] }
  | { id: number; op: 'close' }

type WorkerResponse =
  | { id: number; ok: true; rows?: Record<string, unknown>[]; result?: unknown }
  | { id: number; ok: false; error: string }

function assertOpen(d: SqliteDriver | null): asserts d is SqliteDriver {
  if (!d) throw new Error('Database not open — send { op: "open" } first')
}

// apps/web is compiled with the DOM lib (not WebWorker), so `self` is typed as
// `Window`. Narrow it structurally to the dedicated-worker surface AR-2 uses —
// avoids the DOM↔WebWorker lib conflict without a per-file tsconfig.
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
  postMessage(message: WorkerResponse): void
}

workerScope.onmessage = async (event: MessageEvent<WorkerRequest>): Promise<void> => {
  const msg = event.data
  try {
    let response: WorkerResponse
    switch (msg.op) {
      case 'open':
        await open(msg.dbName)
        response = { id: msg.id, ok: true }
        break
      case 'exists': {
        // First-run detection — does NOT require an open DB (probes the VFS).
        const exists = await adapter.exists(msg.dbName)
        response = { id: msg.id, ok: true, result: exists }
        break
      }
      case 'migrate': {
        // Explicit re-migrate (open() already migrates at boot; idempotent).
        assertOpen(driver)
        const result = await migrate(driver)
        response = { id: msg.id, ok: true, result }
        break
      }
      case 'run':
      case 'exec': // alias — AR-2 compat (R7)
        assertOpen(driver)
        await driver.run(msg.sql, msg.params)
        response = { id: msg.id, ok: true }
        break
      case 'query': {
        assertOpen(driver)
        const rows = await driver.query(msg.sql, msg.params)
        response = { id: msg.id, ok: true, rows }
        break
      }
      case 'close':
        await driver?.close()
        driver = null
        db = null
        response = { id: msg.id, ok: true }
        break
      default: {
        // Unknown op (protocol drift / malformed message). Reply with the id so
        // the client's pending promise settles instead of hanging on `undefined`.
        const unknown = msg as { id: number; op: string }
        response = { id: unknown.id, ok: false, error: `Unknown op: ${unknown.op}` }
      }
    }
    workerScope.postMessage(response)
  } catch (err) {
    workerScope.postMessage({
      id: msg.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
