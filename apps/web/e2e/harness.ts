// ============================================================================
// E2E DB backdoor — QA-1 (LIF-103). The durable test-support surface.
//
// Mounts ONE WorkerDbClient (AR-4) and exposes its LIVE ops on `window.__vidaDb`
// so Playwright can drive the real wa-sqlite/OPFS worker via `page.evaluate`.
// This is NOT the app (App.tsx auto-opens 'vida' on mount, which would destroy
// the item-1 first-run baseline) — it deliberately does NOT auto-open.
//
// Live ops: open · exists · migrate · run · query · close, plus the Drizzle-proxy
// path exec · values · batch (LANDED by data-plane-wiring 2026-10-20 — the UI-3
// extension point this file reserved).
//
// SERIALIZATION CEILING: values returned here cross `page.evaluate` and MUST be
// JSON-serializable. `query`/`values` rows are fine (numbers/strings); `exec`'s
// `lastInsertRowId` is a `bigint` on some paths → stringify it before returning.
// ============================================================================

import { WorkerDbClient } from '../src/db/client'

/** JSON-safe echo of a RawQueryResult (lastInsertRowId bigint → string). */
export interface ExecResultJSON {
  rows: Record<string, unknown>[]
  changes: number
  lastInsertRowId: string
}

export interface VidaDbBackdoor {
  open(dbName: string): Promise<void>
  /**
   * Pool-scoped in M1.0: returns whether the single `/vida` VFS pool holds ANY
   * persisted DB — the `dbName` arg is NOT yet honored per-name (web-adapter.ts
   * `exists(_dbName)`). Fine for the single-vault model; true per-name detection
   * is a later item.
   */
  exists(dbName: string): Promise<boolean>
  migrate(): Promise<void>
  run(sql: string, params?: unknown[]): Promise<void>
  query(sql: string, params?: unknown[]): Promise<Record<string, unknown>[]>
  /** Positional-array rows — the Drizzle sqlite-proxy read path (data-plane-wiring). */
  values(sql: string, params?: unknown[]): Promise<unknown[][]>
  /** Statement + metadata; `lastInsertRowId` stringified for the evaluate boundary. */
  exec(sql: string, params?: unknown[]): Promise<ExecResultJSON>
  batch(statements: Array<{ sql: string; params?: unknown[] }>): Promise<void>
  close(): Promise<void>
}

declare global {
  interface Window {
    __vidaDb: VidaDbBackdoor
  }
}

const client = new WorkerDbClient()

window.__vidaDb = {
  open: (dbName) => client.open(dbName),
  exists: (dbName) => client.exists(dbName),
  migrate: () => client.migrate(),
  run: (sql, params) => client.driver.run(sql, params),
  query: (sql, params) => client.driver.query(sql, params),
  values: (sql, params) => client.driver.values(sql, params),
  exec: async (sql, params) => {
    const r = await client.driver.exec(sql, params)
    return { rows: r.rows, changes: r.changes, lastInsertRowId: String(r.lastInsertRowId) }
  },
  batch: (statements) => client.driver.batch(statements),
  close: () => client.close(),
}
