// ============================================================================
// DB-4 group #22 — Notifications · Phase-5 DDL-introspection parity (the bookend).
// ⚠ The FINAL DB-4 group — this closes DB-4 at 21/21 (the M1.0 schema foundation).
//
// Applies migration 032 in-memory (better-sqlite3 + PRAGMA table_info) and diffs
// the REAL notifications table, column by column, against the Drizzle mirror on:
//   - column SET · nullability (mirror .notNull ≡ SQL NOT NULL) · primary key · DEFAULTs
// The oracle is the MIRROR (notifications.ts) — NOT the @vida/types interface (the
// Notification interface reconcile [add metadata/delivered_*/effect_event_id + sync] is DB-11).
//
// Notes:
// - notifications carries a bespoke shape: id + fields + created_at + 6 _sync_*. NO updated_at
//   (v2 dropped it, intake L22), NO deleted_at (read→archive→expire→purge lifecycle, NF-13).
// - effect_event_id (nullable) + UNIQUE(effect_event_id): ADR-012 L45/L139 cross-device convergence
//   on the surface_notification Additive output row. SQLite NULLs are distinct → time-driven (NULL)
//   rows are unconstrained, event rows converge. This test also exercises that behavior.
// - idx_notifications_unread(is_read) WHERE is_archived=0 is a PARTIAL index (SQL-only, not in the mirror).
// - migration 032's single table is self-contained (no cross-migration FK), so applying it in isolation is sound.
// ============================================================================

import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { getTableColumns } from 'drizzle-orm'
import type { SQLiteColumn } from 'drizzle-orm/sqlite-core'
import { notifications } from '../schema/notifications'
import { migration032Notifications } from '../migrations/032_notifications'

type PragmaCol = { name: string; type: string; notnull: number; dflt_value: unknown; pk: number }

async function introspectAsync(table: string): Promise<PragmaCol[]> {
  const db = new Database(':memory:')
  const driver = {
    run: async (sql: string) => {
      db.exec(sql)
    },
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migration032Notifications.up(driver as any)
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as PragmaCol[]
  db.close()
  return rows
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mirrorCols = (t: any): Record<string, SQLiteColumn> =>
  getTableColumns(t) as Record<string, SQLiteColumn>

const CASES: ReadonlyArray<{ name: string; table: unknown }> = [
  { name: 'notifications', table: notifications },
]

describe('DB-4 group #22 — DDL-introspection parity (SQL ↔ Drizzle mirror)', () => {
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

  it('notifications has NO updated_at and NO deleted_at (v2-dropped / purge lifecycle — the floor)', async () => {
    const cols = (await introspectAsync('notifications')).map((c) => c.name)
    expect(cols).not.toContain('updated_at')
    expect(cols).not.toContain('deleted_at')
    expect(cols).toContain('created_at') // the sole non-sync timestamp
  })

  it('notifications has UNIQUE(effect_event_id) (ADR-012 convergence) + the partial unread index', async () => {
    const db = new Database(':memory:')
    const driver = {
      run: async (sql: string) => {
        db.exec(sql)
      },
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migration032Notifications.up(driver as any)
    const idx = db.prepare(`PRAGMA index_list(notifications)`).all() as {
      unique: number
      name: string
      partial: number
    }[]
    const idxCols = (n: string) =>
      (db.prepare(`PRAGMA index_info(${n})`).all() as { name: string }[]).map((c) => c.name)
    // The effect_event_id UNIQUE — an inline SQL `UNIQUE(col)` gets an auto-generated name
    // (sqlite_autoindex_*), so match by COLUMN, not the mirror's cosmetic name (the gamification precedent).
    // Excludes the separate _sync_id UNIQUE.
    const eventUnique = idx
      .filter((i) => i.unique === 1)
      .filter((i) => JSON.stringify(idxCols(i.name)) === JSON.stringify(['effect_event_id']))
    // The §5.16 partial index (a NAMED CREATE INDEX → keeps its name; non-unique, filtered).
    const unreadIdx = idx.filter((i) => i.name === 'idx_notifications_unread')
    // Verify the UNIQUE actually converges non-null but admits multiple NULLs (SQLite NULL-distinct).
    db.exec(
      `INSERT INTO notifications (id, type, title, is_read, is_archived, delivered_in_app, delivered_push, delivered_email, effect_event_id, created_at, _sync_id, _sync_device_id, _sync_lww_ts)
       VALUES ('a','info','t',0,0,0,0,0,NULL,1,'s1','d',1), ('b','info','t',0,0,0,0,0,NULL,1,'s2','d',1), ('c','info','t',0,0,0,0,0,'evt1',1,'s3','d',1)`,
    )
    let dupRejected = false
    try {
      db.exec(
        `INSERT INTO notifications (id, type, title, is_read, is_archived, delivered_in_app, delivered_push, delivered_email, effect_event_id, created_at, _sync_id, _sync_device_id, _sync_lww_ts)
         VALUES ('d','info','t',0,0,0,0,0,'evt1',1,'s4','d',1)`,
      )
    } catch {
      dupRejected = true
    }
    const rowCount = (db.prepare(`SELECT count(*) c FROM notifications`).get() as { c: number }).c
    db.close()
    expect(eventUnique.length, 'a UNIQUE on effect_event_id must exist (ADR-012 convergence)').toBe(1)
    expect(unreadIdx.length, 'idx_notifications_unread must exist').toBe(1)
    expect(unreadIdx[0]!.unique, 'idx_notifications_unread must be non-unique').toBe(0)
    expect(unreadIdx[0]!.partial, 'idx_notifications_unread must be partial (WHERE is_archived=0)').toBe(1)
    expect(dupRejected, 'a duplicate non-null effect_event_id must be rejected').toBe(true)
    expect(rowCount, 'two NULL effect_event_id rows + one event row must coexist (SQLite NULL-distinct)').toBe(3)
  })
})
