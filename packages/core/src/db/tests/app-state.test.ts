// ============================================================================
// app_state KV accessor (notes-rescope R2, A-42 · PLAN-R2 G2, test A1) — on a real :memory: SQLite.
// ============================================================================
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import type { SqliteDriver } from '../adapter'
import { ensureInfra } from '../migrations/runner'
import {
  ENTITY_MODE_PREFIX,
  deleteAppState,
  entityModeKey,
  readAppState,
  readAppStatePrefix,
  writeAppState,
} from '../app-state'

// Copied per test file (the helper isn't exported — the migrations-runner.test.ts:32 pattern).
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
      return db
        .prepare(sqlText)
        .raw()
        .all(...(params ?? [])) as unknown[][]
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

let driver: SqliteDriver
beforeEach(async () => {
  driver = createBetterSqlite3Driver(new Database(':memory:'))
  await ensureInfra(driver) // creates app_state (runMigrations does not)
})

describe('app_state accessor (A-42)', () => {
  it('reads null for an absent key; write → read; overwrite; delete', async () => {
    expect(await readAppState(driver, 'k')).toBeNull()
    await writeAppState(driver, 'k', 'a')
    expect(await readAppState(driver, 'k')).toBe('a')
    await writeAppState(driver, 'k', 'b')
    expect(await readAppState(driver, 'k')).toBe('b')
    await deleteAppState(driver, 'k')
    expect(await readAppState(driver, 'k')).toBeNull()
  })

  it('entityModeKey is entity_mode:<type>:<id>', () => {
    expect(ENTITY_MODE_PREFIX).toBe('entity_mode:')
    expect(entityModeKey('task_note', '0190-abc')).toBe('entity_mode:task_note:0190-abc')
  })

  it('the prefix read returns only keys that START with the prefix — `_`/`%` are literal (not LIKE)', async () => {
    await writeAppState(driver, entityModeKey('note', 'n1'), 'merged')
    await writeAppState(driver, entityModeKey('task_note', 't1'), 'tabbed')
    await writeAppState(driver, 'entityXmode:note:n2', 'merged') // `_` would match X under LIKE
    await writeAppState(driver, 'entity_mode_x', 'merged') // 12th char isn't ':'
    await writeAppState(driver, 'ENTITY_MODE:note:n3', 'merged') // LIKE is ASCII case-insensitive; this isn't
    await writeAppState(driver, 'schema_version', '33')
    const rows = await readAppStatePrefix(driver, ENTITY_MODE_PREFIX)
    expect(rows.map((r) => r.key).sort()).toEqual(['entity_mode:note:n1', 'entity_mode:task_note:t1'])
    expect(rows.find((r) => r.key === 'entity_mode:note:n1')?.value).toBe('merged')
  })

  it('a prefix with a literal % matches only itself', async () => {
    await writeAppState(driver, 'a%b:1', 'x')
    await writeAppState(driver, 'aZb:1', 'y')
    expect((await readAppStatePrefix(driver, 'a%b:')).map((r) => r.key)).toEqual(['a%b:1'])
  })
})
