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

type WorkerRequest =
  | { id: number; op: 'open'; dbName: string }
  | { id: number; op: 'exec'; sql: string; params?: unknown[] }
  | { id: number; op: 'query'; sql: string; params?: unknown[] }
  | { id: number; op: 'close' }

type WorkerResponse =
  | { id: number; ok: true; rows?: Record<string, unknown>[] }
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
      case 'exec':
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
