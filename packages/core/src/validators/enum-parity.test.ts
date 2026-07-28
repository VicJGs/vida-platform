// ============================================================================
// DB-9 — SQL-CHECK ↔ tuple parity (the load-bearing invariant, BR-DB9-1/5)
//
// Proves that every live table's `CHECK (col IN (...))` set is EQUAL to the
// canonical @vida/types tuple it is sourced from (ADR-002 §2.3 · ADR-016 §3.3).
// A value added to one side only must FAIL this test.
//
// Fixture scope = @vida/types-sourced enums that have a live table. M1.0 = sync_queue.
// Each future DB-4 slice APPENDS its (table,column,tuple) row here — explicit, not
// auto-discovered (there is no enum→table registry).
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { SYNC_OPERATION, SYNC_QUEUE_STATUS } from '@vida/types'
import { migration001SyncQueue } from '../db/migrations/001_sync_queue'
import type { SqliteDriver } from '../db/adapter'

// --- minimal async driver over better-sqlite3 (repository.test.ts pattern) ---
function createBetterSqlite3Driver(db: Database.Database): SqliteDriver {
  return {
    async exec(sqlText, params) {
      const stmt = db.prepare(sqlText)
      if (stmt.reader) {
        const rows = stmt.all(...(params ?? [])) as Record<string, unknown>[]
        return { rows, changes: 0, lastInsertRowId: 0 }
      }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sqlText, params) {
      if (!params || params.length === 0) db.exec(sqlText)
      else db.prepare(sqlText).run(...params)
    },
    async query(sqlText, params) {
      return db.prepare(sqlText).all(...(params ?? [])) as never
    },
    async values(sqlText, params) {
      return db.prepare(sqlText).raw().all(...(params ?? [])) as unknown[][]
    },
    async batch(statements) {
      for (const s of statements) {
        if (s.params && s.params.length > 0) db.prepare(s.sql).run(...s.params)
        else db.exec(s.sql)
      }
    },
    async close() {
      db.close()
    },
  }
}

/**
 * Extract the value set from a `CHECK (<col> IN ('a','b',...))` clause in raw DDL.
 * Returns null when NO such clause is found — the caller MUST treat null as a
 * failure, never as an empty-set match (guards against a silent false-PASS).
 */
function extractCheckSet(ddl: string, column: string): string[] | null {
  const re = new RegExp(`CHECK\\s*\\(\\s*${column}\\s+IN\\s*\\(([^)]*)\\)`, 'i')
  const m = ddl.match(re)
  if (!m) return null
  return m[1]
    .split(',')
    .map((s) => s.trim().replace(/^'(.*)'$/, '$1'))
    .filter((s) => s.length > 0)
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|')

// (table, column, canonical tuple) — append a row per live CHECK-backed enum as DB-4 streams.
const FIXTURE: ReadonlyArray<{ table: string; column: string; tuple: readonly string[] }> = [
  { table: 'sync_queue', column: 'operation', tuple: SYNC_OPERATION },
  { table: 'sync_queue', column: 'status', tuple: SYNC_QUEUE_STATUS },
]

async function ddlFor(table: string): Promise<string> {
  const db = new Database(':memory:')
  const driver = createBetterSqlite3Driver(db)
  await migration001SyncQueue.up(driver) // the REAL migration, not a hand-copied DDL
  const row = db
    .prepare(`SELECT sql FROM sqlite_master WHERE type='table' AND name=?`)
    .get(table) as { sql: string } | undefined
  db.close()
  if (!row?.sql) throw new Error(`no DDL found for table ${table}`)
  return row.sql
}

describe('enum CHECK ↔ tuple parity', () => {
  for (const { table, column, tuple } of FIXTURE) {
    it(`${table}.${column} CHECK set equals its canonical tuple`, async () => {
      const ddl = await ddlFor(table)
      const checkSet = extractCheckSet(ddl, column)
      // non-empty guard: a regex that matched nothing must FAIL, not compare []==[].
      expect(checkSet, `no CHECK(${column} IN …) found in ${table} DDL`).not.toBeNull()
      expect(checkSet!.length).toBeGreaterThan(0)
      expect(sameSet(checkSet!, tuple)).toBe(true)
    })
  }

  it('the comparator actually rejects drift (deliberate-drift negative)', () => {
    // extra member on one side
    expect(sameSet(['create', 'update', 'delete'], ['create', 'update'])).toBe(false)
    // missing member on one side
    expect(sameSet(['create', 'update'], ['create', 'update', 'delete'])).toBe(false)
    // renamed member
    expect(sameSet(['create', 'update', 'remove'], ['create', 'update', 'delete'])).toBe(false)
    // order-independent equality holds
    expect(sameSet(['delete', 'create', 'update'], SYNC_OPERATION)).toBe(true)
  })

  it('extractCheckSet returns null (not []) when no CHECK is present', () => {
    expect(extractCheckSet(`CREATE TABLE t (x TEXT)`, 'x')).toBeNull()
  })
})
