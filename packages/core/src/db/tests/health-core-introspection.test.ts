// ============================================================================
// DB-4 group #17 — Health: Core · Phase-5 DDL-introspection parity (the bookend).
//
// Applies migration 027 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// each of the 12 REAL tables, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (health-core.ts) — NOT the @vida/types interfaces.
//
// The enum-parity test checks only CHECK value-SETS; the runner test only that
// migrations APPLY. Neither catches a NOT-NULL-in-mirror-but-nullable-in-SQL drift.
//
// Notes:
// - deleted_at appears on `health_goals` ONLY (the documented floor); the col-set test
//   verifies the other 11 mirrors + SQL agree on its omission.
// - migration 027's 12 tables are self-contained (no cross-migration FK), so applying it
//   in isolation is sound.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import {
  healthMetrics,
  healthMetricValues,
  healthDomains,
  healthFactors,
  healthExams,
  assignedExams,
  healthGoals,
  physicalRoles,
  healthExperiments,
  healthResponses,
  medicalProfileEntries,
  safetyFlags,
} from '../schema/health-core'
import { migration027HealthCore } from '../migrations/027_health_core'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration027HealthCore.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> => getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [
  { name: 'health_metrics', table: healthMetrics },
  { name: 'health_metric_values', table: healthMetricValues },
  { name: 'health_domains', table: healthDomains },
  { name: 'health_factors', table: healthFactors },
  { name: 'health_exams', table: healthExams },
  { name: 'assigned_exams', table: assignedExams },
  { name: 'health_goals', table: healthGoals },
  { name: 'physical_roles', table: physicalRoles },
  { name: 'health_experiments', table: healthExperiments },
  { name: 'health_responses', table: healthResponses },
  { name: 'medical_profile_entries', table: medicalProfileEntries },
  { name: 'safety_flags', table: safetyFlags },
]

describe('DB-4 group #17 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
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
        expect(sqlDefault, `${name}.${col.name}: mirror default=${norm(col)} but SQL DEFAULT=${sqlDefault}`).toBe(
          norm(col),
        )
      }
    })
  }

  it('deleted_at is on health_goals ONLY (the documented floor)', async () => {
    const withDeletedAt: string[] = []
    for (const { name } of CASES) {
      const cols = (await introspectAsync(name)).map((c) => c.name)
      if (cols.includes('deleted_at')) withDeletedAt.push(name)
    }
    expect(withDeletedAt).toEqual(['health_goals'])
  })
})
