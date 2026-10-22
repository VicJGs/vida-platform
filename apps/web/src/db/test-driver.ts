// ============================================================================
// Test-only: an async `SqliteDriver` over a synchronous better-sqlite3 handle (Node stand-in for the wa-sqlite worker).
// Extracted from web-adapter.test.ts (AR-2) for the composition-root + calendar read-only tests (fe-calendar S7, R13a).
// better-sqlite3's `.raw().all()` returns the same positional arrays wa-sqlite's `row()` produces, so Drizzle reads
// through `createDrizzleProxy` exactly as in the worker. Never imported by app code.
//
// `onSql` (optional) observes EVERY statement on EVERY method — Drizzle routes SQL through `values`/`exec`, not only
// `run` — so a spy can prove a read path issues no INSERT/UPDATE/DELETE/REPLACE (BR-CAL-S7-6).
// ============================================================================
import type Database from 'better-sqlite3'
import type { SqliteDriver } from '@vida/core'

export function createBetterSqlite3Driver(db: Database.Database, onSql?: (sql: string) => void): SqliteDriver {
  const see = (sql: string) => onSql?.(sql)
  return {
    async exec(sqlText, params) {
      see(sqlText)
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      see(sqlText)
      // Transaction-control + DDL statements must go through exec() in better-sqlite3 (prepared BEGIN/COMMIT is
      // rejected); parameterised DML goes through a prepared statement.
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      see(sqlText)
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      see(sqlText)
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        see(s.sql)
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}
