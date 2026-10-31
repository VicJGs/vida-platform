// ============================================================================
// Schema-wide conventions over the FULL migrated schema (every migration in ALL_MIGRATIONS).
// The per-domain *-introspection tests diff one group against its Drizzle mirror; they can't
// see a rule that only shows up across groups, so a new table written to a stale ADR-002 §5.x floor
// passes its own introspection test (mirror ≡ migration, both wrong). These two rules close that gap:
//
//   • every SYNCABLE table (it carries the `_sync_*` columns) is keyed by the single synthetic `id`
//     column — junctions included (the entity_tags-v2 shape: id PK + UNIQUE(pair) + reverse index,
//     never a composite PK). Device-local tables (app_state, applied_effects, …) never sync and
//     keep their own keys (applied_effects' composite PK is ADR-004 F1);
//   • no CHECK constraint enumerates an OPEN vocabulary — SESSION_SUB_TYPE / SESSION_PURPOSE are
//     user-extensible and registry-validated (SS-5/BR-6), so a CHECK mirroring the tuple rejects
//     a sub-type the owning `sessions` table accepts. enum-parity.test.ts can't catch it: the
//     CHECK matches the tuple, so parity passes.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { SESSION_PURPOSE, SESSION_SUB_TYPE } from '@vida/types'
import type { SqliteDriver } from '../adapter'
import { migrate } from '../migrations/runner'

const OPEN_VOCABS: ReadonlyArray<{ name: string; values: readonly string[] }> = [
  { name: 'SESSION_SUB_TYPE', values: SESSION_SUB_TYPE },
  { name: 'SESSION_PURPOSE', values: SESSION_PURPOSE },
]

function driverFor(db: Database.Database): SqliteDriver {
  const all = (sql: string, params?: unknown[]) => db.prepare(sql).all(...(params ?? []))
  return {
    async exec(sql, params) {
      const stmt = db.prepare(sql)
      if (stmt.reader)
        return { rows: stmt.all(...(params ?? [])) as Record<string, unknown>[], changes: 0, lastInsertRowId: 0 }
      const info = stmt.run(...(params ?? []))
      return { rows: [], changes: info.changes, lastInsertRowId: info.lastInsertRowid }
    },
    async run(sql, params) {
      if (!params || params.length === 0) db.exec(sql)
      else db.prepare(sql).run(...params)
    },
    async query(sql, params) {
      return all(sql, params) as never
    },
    async values(sql, params) {
      return db
        .prepare(sql)
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

async function migratedSchema(): Promise<Array<{ name: string; sql: string; pk: string[]; syncable: boolean }>> {
  const db = new Database(':memory:')
  await migrate(driverFor(db))
  const tables = db
    .prepare(`SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
    .all() as Array<{ name: string; sql: string }>
  const out = tables.map(({ name, sql }) => {
    // Quoted: one table is named `references`, an SQL keyword.
    const cols = db.prepare(`PRAGMA table_info("${name}")`).all() as Array<{ name: string; pk: number }>
    const syncable = cols.some((c) => c.name === '_sync_id')
    const pk = cols
      .filter((c) => c.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map((c) => c.name)
    return { name, sql, pk, syncable }
  })
  db.close()
  return out
}

// Every `IN ('a', 'b', …)` value list inside the table's CREATE statement.
function checkValueLists(sql: string): string[][] {
  return [...sql.matchAll(/\bIN\s*\(([^()]*)\)/gi)].map((m) => [...m[1]!.matchAll(/'([^']*)'/g)].map((v) => v[1]!))
}

describe('schema conventions across every migrated table', () => {
  it('every syncable table is keyed by the single synthetic id column (no composite PK)', async () => {
    const schema = await migratedSchema()
    expect(schema.filter((t) => t.syncable).length).toBeGreaterThan(50)
    const offenders = schema
      .filter((t) => t.syncable)
      .filter((t) => t.pk.length !== 1 || t.pk[0] !== 'id')
      .map((t) => `${t.name}: PK (${t.pk.join(', ') || 'none'})`)
    expect(offenders).toEqual([])
  })

  it('no CHECK constraint enumerates an OPEN vocabulary', async () => {
    const schema = await migratedSchema()
    const offenders: string[] = []
    for (const t of schema) {
      for (const list of checkValueLists(t.sql)) {
        for (const vocab of OPEN_VOCABS) {
          // A list made only of an open vocab's values (2+ of them) is that vocab hard-coded as a CHECK.
          const fromVocab = list.filter((v) => vocab.values.includes(v))
          if (fromVocab.length >= 2 && fromVocab.length === list.length)
            offenders.push(`${t.name}: CHECK IN (${list.join(', ')}) ⊆ ${vocab.name}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
