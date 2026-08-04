// ============================================================================
// E2E DB backdoor — QA-1 (LIF-103). The durable test-support surface.
//
// Mounts ONE WorkerDbClient (AR-4) and exposes its LIVE ops on `window.__vidaDb`
// so Playwright can drive the real wa-sqlite/OPFS worker via `page.evaluate`.
// This is NOT the app (App.tsx auto-opens 'vida' on mount, which would destroy
// the item-1 first-run baseline) — it deliberately does NOT auto-open.
//
// Live ops only: open · exists · migrate · run · query · close. The Drizzle-proxy
// path (exec/values/batch) is a deferred seam (UI-3/M1.1+) and is never exposed.
//
// SERIALIZATION CEILING: values returned here cross `page.evaluate` and MUST be
// JSON-serializable. `query` object-rows are fine; a `bigint` (driver
// lastInsertRowId) or `Date` would throw on the boundary — stringify such values
// here before returning if a future consumer needs them.
// ============================================================================

import { WorkerDbClient } from '../src/db/client'

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
  close: () => client.close(),
}
