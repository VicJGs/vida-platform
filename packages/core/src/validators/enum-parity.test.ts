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
  STUDY_SESSION_RESOURCE_TYPE,
  POMODORO_TYPE,
  POMODORO_STATUS,
  STUDY_PLAN_BATCH_STATUS,
  PRESET_BLOCK,
  STATUS,
  PRIORITY,
  TASK_DIFFICULTY,
  TASK_KIND,
  MEASUREMENT_KIND,
  BINDING_MODE,
  PROJECT_SCOPE,
  PROJECT_COMPLEXITY,
  HABIT_TYPE,
  HABIT_FREQUENCY,
  HABIT_TIME_OF_DAY,
  HABIT_DIFFICULTY,
  LIFE_DOMAIN,
  ROUTINE_LIFECYCLE,
  ROUTINE_TIME_OF_DAY,
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
import { migration014SessionsScheduling } from '../db/migrations/014_sessions_scheduling'
import { migration015Tasks } from '../db/migrations/015_tasks'
import { migration016Projects } from '../db/migrations/016_projects'
import { migration017Habits } from '../db/migrations/017_habits'
import { migration018Routines } from '../db/migrations/018_routines'
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
  // DB-4 group #3 — Sessions & Scheduling (+Pomodoro). FIXED TEXT-CHECK cols only;
  // day_of_week/preference_score are numeric BETWEEN checks (not tuple-sourced);
  // scope_type/sub_type/resource_id are OPEN (no CHECK).
  { table: 'study_sessions', column: 'resource_type', tuple: STUDY_SESSION_RESOURCE_TYPE },
  { table: 'focus_sessions', column: 'type', tuple: POMODORO_TYPE },
  { table: 'focus_sessions', column: 'status', tuple: POMODORO_STATUS },
  { table: 'study_availability', column: 'preset_block', tuple: PRESET_BLOCK },
  { table: 'study_plan_batches', column: 'status', tuple: STUDY_PLAN_BATCH_STATUS },
  // DB-4 group #4 — Tasks. The 6 FIXED TEXT-CHECK cols on `tasks`; parent refs +
  // recurrence_rule/scheduled_date are OPEN (no CHECK); task_time_logs has no CHECK col.
  { table: 'tasks', column: 'status', tuple: STATUS },
  { table: 'tasks', column: 'priority', tuple: PRIORITY },
  { table: 'tasks', column: 'difficulty', tuple: TASK_DIFFICULTY },
  { table: 'tasks', column: 'kind', tuple: TASK_KIND },
  { table: 'tasks', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'tasks', column: 'binding_mode', tuple: BINDING_MODE },
  // DB-4 group #5 — Projects. FIXED TEXT-CHECK cols: projects.scope/complexity/status/
  // priority; milestones.status; deliverables.measurement_kind/binding_mode. No-CHECK
  // cols (parent refs, progress, nesting_weight, dates) are OPEN → not rows;
  // project_documents has no CHECK col.
  { table: 'projects', column: 'scope', tuple: PROJECT_SCOPE },
  { table: 'projects', column: 'complexity', tuple: PROJECT_COMPLEXITY },
  { table: 'projects', column: 'status', tuple: STATUS },
  { table: 'projects', column: 'priority', tuple: PRIORITY },
  { table: 'milestones', column: 'status', tuple: STATUS },
  { table: 'deliverables', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'deliverables', column: 'binding_mode', tuple: BINDING_MODE },
  // DB-4 group #6 — Habits. 7 FIXED TEXT-CHECK cols on `habits`: habit_type/frequency/
  // time_of_day/domain/measurement_kind/binding_mode/difficulty. The mood_*/ease_rating/
  // satisfaction ratings are numeric BETWEEN 1 AND 5 (not tuple-sourced → not rows);
  // habit_completions + project_habits have no CHECK col.
  { table: 'habits', column: 'habit_type', tuple: HABIT_TYPE },
  { table: 'habits', column: 'frequency', tuple: HABIT_FREQUENCY },
  { table: 'habits', column: 'time_of_day', tuple: HABIT_TIME_OF_DAY },
  { table: 'habits', column: 'domain', tuple: LIFE_DOMAIN },
  { table: 'habits', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'habits', column: 'binding_mode', tuple: BINDING_MODE },
  { table: 'habits', column: 'difficulty', tuple: HABIT_DIFFICULTY },
  // DB-4 group #7 — Routines (reframe). 3 FIXED CHECK cols on `routines` + 1 on
  // `routine_step`. `step_type` is an OPEN vocab (no CHECK → not a row);
  // routine_completions has no CHECK col.
  { table: 'routines', column: 'lifecycle', tuple: ROUTINE_LIFECYCLE },
  { table: 'routines', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'routines', column: 'binding_mode', tuple: BINDING_MODE },
  { table: 'routine_step', column: 'time_of_day', tuple: ROUTINE_TIME_OF_DAY },
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
  await migration014SessionsScheduling.up(driver)
  await migration015Tasks.up(driver)
  await migration016Projects.up(driver)
  await migration017Habits.up(driver)
  await migration018Routines.up(driver)
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
