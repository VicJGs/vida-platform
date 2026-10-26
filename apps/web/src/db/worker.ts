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
// LIF-250 — BR-RT-D5 "opened once": a repeated or concurrent `open` (e.g. the boot screen's Retry while the
// first open is still migrating) shares the in-flight/completed open instead of opening a second connection
// over the same OPFS file. Cleared on failure (a retry re-opens) and by `close`.
let opening: Promise<void> | null = null

async function openOnce(dbName: string): Promise<void> {
  driver = await adapter.open({ dbName }) // plain — no sqlCipher in M1.0
  await migrate(driver) // bootstraps app_state (DB-7 ensureInfra) + applies every pending migration (runner.ts)
  db = adapter.createDrizzle(driver)
  // Prove the Drizzle proxy callback fires end-to-end against wa-sqlite
  // (raw SQL — the schema barrel has no tables yet; table CRUD is covered by
  // the Node contract test).
  await db.run(sql`SELECT 1`)
}

function open(dbName: string): Promise<void> {
  return (opening ??= openOnce(dbName).catch(async (e: unknown) => {
    // A failed open leaves nothing half-open: release a connection opened before migrate failed.
    await driver?.close().catch(() => {})
    driver = null
    db = null
    opening = null
    throw e
  }))
}

// AR-4 extends AR-2's minimal `open|exec|query|close` proof to the surface the
// main-thread client (client.ts) needs: `run` (write), `migrate` (explicit),
// `exists` (per-name first-run detection).
// data-plane-wiring (2026-10-20) lands AR-4's reserved seam: `values` (positional
// arrays — the Drizzle sqlite-proxy read path), `exec` (→ RawQueryResult), and
// `batch` are now exposed over the RPC, calling the in-worker `web-driver.ts`
// methods that already implement them. (`exec` was an AR-2 `run`-alias; no RPC
// caller used the alias — the client's `exec` slot was a throwing seam — so it is
// upgraded to the real `driver.exec` → RawQueryResult.)
type WorkerRequest =
  | { id: number; op: 'open'; dbName: string }
  | { id: number; op: 'exists'; dbName: string }
  | { id: number; op: 'migrate' }
  | { id: number; op: 'run'; sql: string; params?: unknown[] }
  | { id: number; op: 'exec'; sql: string; params?: unknown[] }
  | { id: number; op: 'query'; sql: string; params?: unknown[] }
  | { id: number; op: 'values'; sql: string; params?: unknown[] }
  | { id: number; op: 'batch'; statements: Array<{ sql: string; params?: unknown[] }> }
  | { id: number; op: 'close' }

type WorkerResponse =
  | { id: number; ok: true; rows?: Record<string, unknown>[]; result?: unknown }
  | { id: number; ok: false; error: string }
  // LIF-250 — receipt ack for the long-running lifecycle ops (`open`/`migrate`: every pending migration runs
  // inside them). Proves the worker is alive and working; the final reply still follows. Never settles a request.
  | { id: number; ack: true }

const ACKED_OPS = new Set<WorkerRequest['op']>(['open', 'migrate'])

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
  if (ACKED_OPS.has(msg.op)) workerScope.postMessage({ id: msg.id, ack: true })
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
        assertOpen(driver)
        await driver.run(msg.sql, msg.params)
        response = { id: msg.id, ok: true }
        break
      case 'exec': {
        // Real exec → RawQueryResult (data-plane-wiring; was an AR-2 run-alias).
        assertOpen(driver)
        const result = await driver.exec(msg.sql, msg.params)
        response = { id: msg.id, ok: true, result }
        break
      }
      case 'values': {
        // Positional-array rows — the Drizzle sqlite-proxy read path.
        assertOpen(driver)
        const result = await driver.values(msg.sql, msg.params)
        response = { id: msg.id, ok: true, result }
        break
      }
      case 'batch':
        assertOpen(driver)
        await driver.batch(msg.statements)
        response = { id: msg.id, ok: true }
        break
      case 'query': {
        assertOpen(driver)
        const rows = await driver.query(msg.sql, msg.params)
        response = { id: msg.id, ok: true, rows }
        break
      }
      case 'close':
        await opening?.catch(() => {}) // never close under an in-flight open
        await driver?.close()
        driver = null
        db = null
        opening = null // a later `open` opens again
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
