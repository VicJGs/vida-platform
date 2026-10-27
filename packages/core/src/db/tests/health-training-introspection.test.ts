// ============================================================================
// DB-4 group #19 — Health: Training · Phase-5 DDL-introspection parity (the bookend).
//
// Applies migration 029 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// each of the 5 REAL tables, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (health-training.ts) — NOT the @vida/types interfaces.
//
// Notes:
// - deleted_at appears on `exercises` + `exercise_plans` (the documented floor); the col-set
//   test verifies the other 3 mirrors + SQL agree on its omission.
// - workout_sessions = the `sessions` `workout` sub-type extension: own id + session_id UNIQUE,
//   NO deleted_at (base owns lifecycle).
// - migration 029's 5 tables are self-contained (no cross-migration FK), so applying it
//   in isolation is sound.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { exercises, exercisePlans, workoutTemplates, workoutSessions, workoutSets } from '../schema/health-training'
import { migration029HealthTraining } from '../migrations/029_health_training'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration029HealthTraining.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> => getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [
  { name: 'exercises', table: exercises },
  { name: 'exercise_plans', table: exercisePlans },
  { name: 'workout_templates', table: workoutTemplates },
  { name: 'workout_sessions', table: workoutSessions },
  { name: 'workout_sets', table: workoutSets },
]

describe('DB-4 group #19 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
  for (const { name, table } of CASES) {
    it(`${name}: column set matches the mirror`, async () => {
      const pragma = await introspectAsync(name)
      const sqlNames = new Set(pragma.map((c) => c.name))
      const mirror = mirrorCols(table)
      const mirrorNames = new Set(Object.values(mirror).map((c) => c.name))
      const missingInSql = [...mirrorNames].filter((n) => !sqlNames.has(n))
      const extraInSql = [...sqlNames].filter((n) => !mirrorNames.has(n))
      expect(missingInSql, `mirror cols absent from SQL: ${missingInSql}`).toEqual([])
      expect(extraInSql, `SQL cols absent from mirror: ${extraInSql}`).toEqual([])
    })

    it(`${name}: nullability matches the mirror (no $inferSelect type-lie)`, async () => {
      const pragma = await introspectAsync(name)
      const byName = new Map(pragma.map((c) => [c.name, c]))
      const mirror = mirrorCols(table)
      for (const col of Object.values(mirror)) {
        const p = byName.get(col.name)
        expect(p, `${name}.${col.name} missing in SQL`).toBeDefined()
        const sqlNotNull = p!.notnull === 1 || p!.pk > 0
        expect(
          sqlNotNull,
          `${name}.${col.name}: mirror.notNull=${col.notNull} but SQL notnull=${p!.notnull}/pk=${p!.pk}`,
        ).toBe(col.notNull)
      }
    })

    it(`${name}: primary key is 'id'`, async () => {
      const pragma = await introspectAsync(name)
      const pk = pragma.filter((c) => c.pk > 0).map((c) => c.name)
      expect(pk).toEqual(['id'])
    })

    it(`${name}: column DEFAULTs match the mirror`, async () => {
      const pragma = await introspectAsync(name)
      const byName = new Map(pragma.map((c) => [c.name, c]))
      const mirror = mirrorCols(table)
      const norm = (col: SQLiteColumn): string | null => {
        if (!col.hasDefault) return null
        const v = col.default as unknown
        if (typeof v === 'boolean') return v ? '1' : '0'
        if (typeof v === 'number') return String(v)
        if (typeof v === 'string') return `'${v}'`
        return null
      }
      for (const col of Object.values(mirror)) {
        const p = byName.get(col.name)!
        const sqlDefault = p.dflt_value == null ? null : String(p.dflt_value)
        expect(sqlDefault, `${name}.${col.name}: mirror default=${norm(col)} but SQL DEFAULT=${sqlDefault}`).toBe(
          norm(col),
        )
      }
    })
  }

  it('deleted_at is on exercises + exercise_plans ONLY (the documented floor)', async () => {
    const withDeletedAt: string[] = []
    for (const { name } of CASES) {
      const cols = (await introspectAsync(name)).map((c) => c.name)
      if (cols.includes('deleted_at')) withDeletedAt.push(name)
    }
    expect(withDeletedAt.sort()).toEqual(['exercise_plans', 'exercises'])
  })

  it('workout_sessions has a UNIQUE session_id (1:1 extension) and NO deleted_at', async () => {
    const db = new Database(':memory:')
    const driver = {
      run: async (sql: string) => {
        db.exec(sql)
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migration029HealthTraining.up(driver as any)
    const idx = db.prepare(`PRAGMA index_list(workout_sessions)`).all() as { unique: number; name: string }[]
    const uniqueIdxCols = idx
      .filter((i) => i.unique === 1)
      .flatMap((i) => (db.prepare(`PRAGMA index_info(${i.name})`).all() as { name: string }[]).map((c) => c.name))
    const cols = (db.prepare(`PRAGMA table_info(workout_sessions)`).all() as PragmaCol[]).map((c) => c.name)
    db.close()
    expect(uniqueIdxCols).toContain('session_id')
    expect(cols).not.toContain('deleted_at')
  })
})
