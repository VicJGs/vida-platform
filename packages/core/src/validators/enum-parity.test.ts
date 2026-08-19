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
import {
  SYNC_OPERATION,
  SYNC_QUEUE_STATUS,
  SCHEDULING_MODE,
  SESSION_STATUS,
  VIEW_LAYOUT,
  EFFECT_TYPE,
  CURRENCY_BACKING_KIND,
  CONSEQUENCE_KIND,
  CONTRIBUTION_GOAL_TYPE,
  CONTRIBUTION_CONTRIBUTOR_TYPE,
  PLAN_STEP_OWNER_TYPE,
  REVIEW_CURVE_KIND,
  METHOD_BINDING_TARGET_TYPE,
  STORE_NODE_KIND,
  STORE_REF_TYPE,
  RULE_CONDITION_BINDING_TYPE,
  PLANNED_BLOCK_STATUS,
  PAGE_TYPE,
  THEME,
  TIME_FORMAT,
  DOCK_POSITION,
  DOCK_SIZE,
  PERSONA,
} from '@vida/types'
import { migration001SyncQueue } from '../db/migrations/001_sync_queue'
import { migration002Sessions } from '../db/migrations/002_sessions'
import { migration003Spaces } from '../db/migrations/003_spaces'
import { migration004Effects } from '../db/migrations/004_effects'
import { migration005Capability } from '../db/migrations/005_capability'
import { migration006Economy } from '../db/migrations/006_economy'
import { migration007Purpose } from '../db/migrations/007_purpose'
import { migration008KnowledgeReview } from '../db/migrations/008_knowledge_review'
import { migration009EconomyStoreRules } from '../db/migrations/009_economy_store_rules'
import { migration010Scheduling } from '../db/migrations/010_scheduling'
import { migration011Templates } from '../db/migrations/011_templates'
import { migration012Notes } from '../db/migrations/012_notes'
import { migration013Preferences } from '../db/migrations/013_preferences'
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
  // AR-5 sessions (only the FIXED scalar-CHECK columns; sub_type/purpose are OPEN, no CHECK;
  // EFFECT_TYPE is JSON, covered by the Zod test, not here — spec §4/BR-5b).
  { table: 'sessions', column: 'scheduling_mode', tuple: SCHEDULING_MODE },
  { table: 'sessions', column: 'status', tuple: SESSION_STATUS },
  // AR-6 views: `layout` is the only FIXED CHECK column (entity_type/link refs are OPEN, no CHECK).
  { table: 'views', column: 'layout', tuple: VIEW_LAYOUT },
  // AR-7 effect rail: applied_effects.effect_type is a scalar FIXED CHECK (vs the sessions
  // registry's JSON-array storage of the same tuple — that one stays Zod-covered, not here).
  { table: 'applied_effects', column: 'effect_type', tuple: EFFECT_TYPE },
  // AR-7 inc-4 economy: currencies.backing_kind + consequence_ledger.kind are scalar CHECK columns.
  { table: 'currencies', column: 'backing_kind', tuple: CURRENCY_BACKING_KIND },
  { table: 'consequence_ledger', column: 'kind', tuple: CONSEQUENCE_KIND },
  // DB-3 Purpose domain (007): contributions goal/contributor + plan_steps owner are scalar CHECK cols.
  { table: 'contributions', column: 'goal_type', tuple: CONTRIBUTION_GOAL_TYPE },
  { table: 'contributions', column: 'contributor_type', tuple: CONTRIBUTION_CONTRIBUTOR_TYPE },
  { table: 'plan_steps', column: 'owner_type', tuple: PLAN_STEP_OWNER_TYPE },
  // DB-3 review engine (008): review_curves.curve_kind + method_bindings.target_type.
  { table: 'review_curves', column: 'curve_kind', tuple: REVIEW_CURVE_KIND },
  { table: 'method_bindings', column: 'target_type', tuple: METHOD_BINDING_TARGET_TYPE },
  // DB-3 store/rules (009): store node_kind/ref_type + rules condition_binding_type.
  { table: 'store', column: 'node_kind', tuple: STORE_NODE_KIND },
  { table: 'store', column: 'ref_type', tuple: STORE_REF_TYPE },
  { table: 'rules', column: 'condition_binding_type', tuple: RULE_CONDITION_BINDING_TYPE },
  // DB-3 scheduling (010): planned_blocks.status is FIXED. sub_type is OPEN (SS-5/BR-6, no CHECK) —
  // deliberately NOT a parity row, mirroring sessions.sub_type (registry-validated, not a column CHECK).
  { table: 'planned_blocks', column: 'status', tuple: PLANNED_BLOCK_STATUS },
  // DB-4 group #1 — Notes & Pages (pages.type is the only CHECK; entity_type is OPEN, no CHECK)
  { table: 'pages', column: 'type', tuple: PAGE_TYPE },
  // DB-4 group #2 — Preferences (5 FIXED CHECK cols; default_task_priority/font_size/
  // notification_frequency are OPEN/bare-default, no CHECK — deliberately not rows).
  { table: 'user_preferences', column: 'theme', tuple: THEME },
  { table: 'user_preferences', column: 'time_format', tuple: TIME_FORMAT },
  { table: 'user_preferences', column: 'persona', tuple: PERSONA },
  { table: 'nav_preferences', column: 'dock_position', tuple: DOCK_POSITION },
  { table: 'nav_preferences', column: 'dock_size', tuple: DOCK_SIZE },
]

async function ddlFor(table: string): Promise<string> {
  const db = new Database(':memory:')
  const driver = createBetterSqlite3Driver(db)
  await migration001SyncQueue.up(driver) // the REAL migrations, not hand-copied DDL
  await migration002Sessions.up(driver)
  await migration003Spaces.up(driver)
  await migration004Effects.up(driver)
  await migration005Capability.up(driver)
  await migration006Economy.up(driver)
  await migration007Purpose.up(driver)
  await migration008KnowledgeReview.up(driver)
  await migration009EconomyStoreRules.up(driver)
  await migration010Scheduling.up(driver)
  await migration011Templates.up(driver)
  await migration012Notes.up(driver)
  await migration013Preferences.up(driver)
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
