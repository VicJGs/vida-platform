// ============================================================================
// DB-4 group #8 — Phase-5 DDL-introspection parity (the mandatory bookend).
//
// Applies migration 019 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// the REAL table, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (purposes.ts) — NOT the stale @vida/types interfaces.
//
// The enum-parity test checks only CHECK value-SETS; the runner test only that
// migrations APPLY. Neither catches a NOT-NULL-in-mirror-but-nullable-in-SQL drift.
// Origin: group #2 P5 (time_format type-lie). schema-foundation-build-flow.md §2 Phase 5.
//
// Interface (@vida/types) divergences DEFERRED to DB-11 (Purpose +value_id/progress→null;
// new Target/PurposeMetric/PurposeMetricValue/TargetReview/Dream; retire TARGET_TYPE;
// BucketListItem→Dream) — cited in the spec, not asserted here.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import {
  purposes,
  targets,
  purposeMetrics,
  purposeMetricValues,
  targetReviews,
  dreams,
} from '../schema/purposes'
import { migration019Purposes } from '../migrations/019_purposes'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

// Apply migration 019 in-memory (it only calls driver.run → a minimal shim drives it;
// the 6 tables are self-contained, no cross-migration FK) and read PRAGMA table_info.
async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration019Purposes.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> =>
  getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [
  { name: 'purposes', table: purposes },
  { name: 'targets', table: targets },
  { name: 'purpose_metrics', table: purposeMetrics },
  { name: 'purpose_metric_values', table: purposeMetricValues },
  { name: 'target_reviews', table: targetReviews },
  { name: 'dreams', table: dreams },
]

describe('DB-4 group #8 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
  for (const { name, table } of CASES) {
    it(`${name}: column set matches the mirror`, async () => {
      const pragma = await introspectAsync(name)
      const sqlNames = new Set(pragma.map((c) => c.name))
      const mirror = mirrorCols(table)
      const mirrorNames = new Set(Object.values(mirror).map((c) => c.name))
      // symmetric difference must be empty
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
        // SQLite: PK columns are implicitly NOT NULL even if notnull=0 in pragma.
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
      // Normalize a Drizzle mirror default to the SQL literal PRAGMA reports.
      const norm = (col: SQLiteColumn): string | null => {
        if (!col.hasDefault) return null
        const v = col.default as unknown
        if (typeof v === 'boolean') return v ? '1' : '0'
        if (typeof v === 'number') return String(v)
        if (typeof v === 'string') return `'${v}'`
        return null // SQL-expression defaults (none here) — skip
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
})
