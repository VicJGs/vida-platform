// ============================================================================
// DB-4 group #12 Learning: Education (+ICS) — Phase-5 DDL-introspection parity.
//
// Applies migration 024 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// the REAL table, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (learning.ts) — NOT the stale @vida/types interfaces.
//
// The enum-parity test checks only CHECK value-SETS; the runner test only that
// migrations APPLY. Neither catches a NOT-NULL-in-mirror-but-nullable-in-SQL drift.
// schema-foundation-build-flow.md §2 Phase 5.
//
// deleted_at exceptions (ics_feed_configs, ics_synced_events, class_sessions,
// subject_documents omit it) are covered by the column-set dim: both mirror and
// migration omit deleted_at, so the sets match. education_measurements.measurement_kind
// is notNull-no-default deliberately (dedicated measure entity) — the DEFAULT dim proves
// no accidental default crept in. @vida/types row-interface reconcile (Course→Subject) → DB-11.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import {
  subjects,
  icsFeedConfigs,
  icsSyncedEvents,
  institutions,
  selfTaught,
  programs,
  curricula,
  terms,
  classSessions,
  subjectSchedules,
  gradingSystems,
  gradingComponents,
  assessments,
  subjectDocuments,
  educationMeasurements,
} from '../schema/learning'
import { migration024LearningEducation } from '../migrations/024_learning_education'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration024LearningEducation.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info("${table}")`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> =>
  getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [
  { name: 'subjects', table: subjects },
  { name: 'ics_feed_configs', table: icsFeedConfigs },
  { name: 'ics_synced_events', table: icsSyncedEvents },
  { name: 'institutions', table: institutions },
  { name: 'self_taught', table: selfTaught },
  { name: 'programs', table: programs },
  { name: 'curricula', table: curricula },
  { name: 'terms', table: terms },
  { name: 'class_sessions', table: classSessions },
  { name: 'subject_schedules', table: subjectSchedules },
  { name: 'grading_systems', table: gradingSystems },
  { name: 'grading_components', table: gradingComponents },
  { name: 'assessments', table: assessments },
  { name: 'subject_documents', table: subjectDocuments },
  { name: 'education_measurements', table: educationMeasurements },
]

describe('DB-4 group #12 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
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
        expect(
          sqlDefault,
          `${name}.${col.name}: mirror default=${norm(col)} but SQL DEFAULT=${sqlDefault}`,
        ).toBe(norm(col))
      }
    })
  }
})
