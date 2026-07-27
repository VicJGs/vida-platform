// ============================================================================
// Web SqliteDriver — async driver over the wa-sqlite Factory API
// AR-2 · ADR-001 §5
//
// Implements @vida/core's `SqliteDriver` for the browser. wa-sqlite's Factory
// API is asynchronous (prepare/step/finalize return Promises), so every method
// here is async. Built on `sqlite3.statements()` — the async iterator that owns
// prepare + finalize + string-pointer lifetime, avoiding manual leaks.
//
// Row shapes:
//   query()  → column-name-keyed objects (internal: migrations, schema version)
//   values() → positional arrays        (the Drizzle sqlite-proxy callback path)
// ============================================================================

import * as SQLite from 'wa-sqlite'
import type { SqliteDriver, RawQueryResult } from '@vida/core'

/** The API object returned by `SQLite.Factory(module)` (not exported as a named type). */
type SQLiteAPI = ReturnType<typeof SQLite.Factory>
/** The binding-collection shape wa-sqlite accepts (SQLiteCompatibleType is ambient). */
type BindParams = Parameters<SQLiteAPI['bind_collection']>[1]

/**
 * Create an async `SqliteDriver` bound to an open wa-sqlite database pointer.
 * `sqlite3` + `db` come from the worker bootstrap (see worker.ts).
 */
export function createWebDriver(sqlite3: SQLiteAPI, db: number): SqliteDriver {
  /**
   * Prepare→bind→step across every statement in `sql`, collecting result rows.
   * `mode` selects object (column-keyed) vs positional (array) row shape.
   */
  async function collect(
    sql: string,
    params: unknown[] | undefined,
    mode: 'object' | 'positional',
  ): Promise<unknown[]> {
    const out: unknown[] = []
    for await (const stmt of sqlite3.statements(db, sql)) {
      if (params && params.length > 0) {
        sqlite3.bind_collection(stmt, params as BindParams)
      }
      const columns = mode === 'object' ? sqlite3.column_names(stmt) : null
      while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        const positional = sqlite3.row(stmt)
        if (mode === 'positional' || columns === null) {
          out.push(positional)
        } else {
          const obj: Record<string, unknown> = {}
          for (let i = 0; i < columns.length; i++) obj[columns[i]] = positional[i]
          out.push(obj)
        }
      }
    }
    return out
  }

  /** Run a statement to completion, discarding any rows. */
  async function run(sql: string, params?: unknown[]): Promise<void> {
    for await (const stmt of sqlite3.statements(db, sql)) {
      if (params && params.length > 0) {
        sqlite3.bind_collection(stmt, params as BindParams)
      }
      while ((await sqlite3.step(stmt)) === SQLite.SQLITE_ROW) {
        /* drain — a non-SELECT (INSERT/UPDATE/DDL) returns SQLITE_DONE immediately */
      }
    }
  }

  async function lastInsertRowId(): Promise<number | bigint> {
    const rows = (await collect('SELECT last_insert_rowid()', undefined, 'positional')) as unknown[][]
    const v = rows[0]?.[0]
    return typeof v === 'number' || typeof v === 'bigint' ? v : 0
  }

  return {
    async exec(sql, params): Promise<RawQueryResult> {
      const rows = (await collect(sql, params, 'object')) as Record<string, unknown>[]
      return {
        rows,
        changes: sqlite3.changes(db),
        lastInsertRowId: await lastInsertRowId(),
      }
    },

    run,

    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
      return (await collect(sql, params, 'object')) as T[]
    },

    async values(sql, params): Promise<unknown[][]> {
      return (await collect(sql, params, 'positional')) as unknown[][]
    },

    async batch(statements): Promise<void> {
      for (const s of statements) await run(s.sql, s.params)
    },

    async close(): Promise<void> {
      await sqlite3.close(db)
    },
  }
}
