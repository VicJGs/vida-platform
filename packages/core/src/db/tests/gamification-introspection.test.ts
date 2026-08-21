// ============================================================================
// DB-4 group #21 — Gamification · Phase-5 DDL-introspection parity (the bookend).
//
// Applies migration 031 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// each of the 3 REAL tables, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (gamification.ts) — NOT the @vida/types interfaces (the
// UserProfile reconcile + XpHistory retire are the standing DB-11 boundary).
//
// Notes:
// - user_profile (singleton) = baseColumns + the ADR-012 §3.10 post-split residual;
//   nullability from the entities/user.ts interface (focus_areas/timezone/total_xp/
//   current_level/skipped_modules NOT NULL w/ defaults). No deleted_at.
// - achievements is the FIRST non-syncable table: id + fields + created_at ONLY (no
//   _sync_*, no updated_at, no deleted_at). The col-set test verifies the mirror + SQL
//   agree on those omissions; `pk == ['id']` still holds.
// - user_achievements = SyncMetadata: id + syncColumns (no created_at/updated_at),
//   UNIQUE(achievement_id), no deleted_at.
// - migration 031's 3 tables are self-contained (no cross-migration FK), so applying it
//   in isolation is sound.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { userProfile, achievements, userAchievements } from '../schema/gamification'
import { migration031Gamification } from '../migrations/031_gamification'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration031Gamification.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> =>
  getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [
  { name: 'user_profile', table: userProfile },
  { name: 'achievements', table: achievements },
  { name: 'user_achievements', table: userAchievements },
]

describe('DB-4 group #21 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
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
        expect(
          sqlDefault,
          `${name}.${col.name}: mirror default=${norm(col)} but SQL DEFAULT=${sqlDefault}`,
        ).toBe(norm(col))
      }
    })
  }

  it('achievements is NON-SYNCABLE: no _sync_*, no updated_at, no deleted_at (static seed — the floor)', async () => {
    const cols = (await introspectAsync('achievements')).map((c) => c.name)
    expect(cols.filter((c) => c.startsWith('_sync_')), 'achievements must carry NO _sync_* columns').toEqual([])
    expect(cols).not.toContain('updated_at')
    expect(cols).not.toContain('deleted_at')
    expect(cols).toContain('created_at') // the sole timestamp
  })

  it('user_achievements is SyncMetadata: has _sync_*, NO created_at/updated_at, UNIQUE(achievement_id)', async () => {
    const db = new Database(':memory:')
    const driver = {
      run: async (sql: string) => {
        db.exec(sql)
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migration031Gamification.up(driver as any)
    const cols = (db.prepare(`PRAGMA table_info(user_achievements)`).all() as PragmaCol[]).map((c) => c.name)
    const idx = db.prepare(`PRAGMA index_list(user_achievements)`).all() as { unique: number; name: string }[]
    const uniqueIdxCols = idx
      .filter((i) => i.unique === 1)
      .flatMap((i) => (db.prepare(`PRAGMA index_info(${i.name})`).all() as { name: string }[]).map((c) => c.name))
    db.close()
    expect(cols).toContain('_sync_id')
    expect(cols).not.toContain('created_at')
    expect(cols).not.toContain('updated_at')
    expect(uniqueIdxCols).toContain('achievement_id')
  })

  it('no table carries deleted_at (§5.15 floor — none of the 3 is soft-deletable)', async () => {
    for (const { name } of CASES) {
      const cols = (await introspectAsync(name)).map((c) => c.name)
      expect(cols, `${name} must NOT carry deleted_at`).not.toContain('deleted_at')
    }
  })
})
