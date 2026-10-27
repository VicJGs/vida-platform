// ============================================================================
// DB-4 group #20 — Journals · Phase-5 DDL-introspection parity (the bookend).
//
// Applies migration 030 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// the REAL journal_snapshots table, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (journals.ts) — NOT the @vida/types interfaces (the
// JournalSnapshot interface is the standing DB-11 mirror-only carry-forward).
//
// Notes:
// - journal_snapshots carries a hand-composed reduced column set: id + snapshot_date
//   + sections_data[E] + captured_at + 6 _sync_*. NO created_at/updated_at (captured_at
//   IS the timestamp) and NO deleted_at (a frozen ledger record — the JR-6/JR-7
//   lifecycle; the check_in_template_questions reduced-column precedent). The col-set
//   test verifies the mirror + SQL agree on those omissions; `pk == ['id']` still holds.
// - migration 030's single table is self-contained (no cross-migration FK), so applying
//   it in isolation is sound.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { journalSnapshots } from '../schema/journals'
import { migration030Journals } from '../migrations/030_journals'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration030Journals.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> => getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [{ name: 'journal_snapshots', table: journalSnapshots }]

describe('DB-4 group #20 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
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

  it('journal_snapshots has NO deleted_at and NO created_at/updated_at (frozen ledger record — the floor)', async () => {
    const cols = (await introspectAsync('journal_snapshots')).map((c) => c.name)
    expect(cols).not.toContain('deleted_at')
    expect(cols).not.toContain('created_at')
    expect(cols).not.toContain('updated_at')
  })

  it('journal_snapshots has an index on snapshot_date and NO UNIQUE (one-per-date is NP-2 for pages, not snapshots)', async () => {
    const db = new Database(':memory:')
    const driver = {
      run: async (sql: string) => {
        db.exec(sql)
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migration030Journals.up(driver as any)
    const idx = db.prepare(`PRAGMA index_list(journal_snapshots)`).all() as {
      unique: number
      name: string
    }[]
    // No table-level UNIQUE index (the _sync_id column UNIQUE is a column constraint, an
    // auto-index named sqlite_autoindex_*; we assert no NON-auto unique index exists on the table).
    const nonAutoUnique = idx.filter((i) => i.unique === 1 && !i.name.startsWith('sqlite_autoindex_'))
    const dateIdx = idx.filter((i) => i.name === 'idx_journal_snapshots_date')
    db.close()
    expect(nonAutoUnique, `unexpected non-auto UNIQUE index(es): ${nonAutoUnique.map((i) => i.name)}`).toEqual([])
    expect(dateIdx.length, 'idx_journal_snapshots_date must exist').toBe(1)
    expect(dateIdx[0]!.unique, 'idx_journal_snapshots_date must be non-unique').toBe(0)
  })
})
