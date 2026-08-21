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
  FREQUENCY,
  CALCULATION_METHOD,
  METRIC_VALUE_SOURCE,
  BUCKET_LIST_CATEGORY,
  BUCKET_LIST_STATUS,
  ACCOUNT_TYPE,
  TRANSACTION_TYPE,
  ASSET_TYPE,
  LIABILITY_TYPE,
  INVESTMENT_TYPE,
  INCOME_TYPE,
  WORK_TYPE,
  INTEREST_TYPE,
  FISCAL_OWNER_TYPE,
  MASTERY_LEVEL,
  SKILL_LEVEL_STATUS,
  SKILL_ACTIVITY_TYPE,
  SKILL_FILL_SOURCE,
  SKILL_DEPENDENCY_TYPE,
  SKILL_DEPENDENCY_SCOPE,
  SKILL_DEFINITION_SOURCE,
  SKILL_SETUP_MODE,
  STUDY_TOPIC_STATUS,
  TOPIC_DIFFICULTY,
  KNOWLEDGE_CONTAINER_TYPE,
  CARD_TYPE,
  BOOK_STATUS,
  BOOK_ASSET_FORMAT,
  READING_PLAN_ARRANGEMENT,
  READING_PLAN_GOAL_TYPE,
  COURSE_TYPE,
  COURSE_STATUS,
  DEGREE_TIER,
  TERM_LEVEL,
  PROGRAM_PARENT_TYPE,
  SCHEDULE_SOURCE,
  GRADING_SCOPE,
  GRADING_SCALE_TYPE,
  GRADING_COMPONENT_TYPE,
  ASSESSMENT_TYPE,
  ASSESSMENT_MODALITY,
  MEASUREMENT_REF_TYPE,
  RECORD_SOURCE,
  RELATIONSHIP_TYPE,
  INTERACTION_TYPE,
  SENTIMENT,
  CONTACT_EVENT_TYPE,
  REMINDER_GROUP_ANCHOR,
  CHECK_IN_TYPE,
  CHECK_IN_SCHEDULE_TYPE,
  CHECK_IN_PREFERRED_TIME,
  CHECK_IN_QUESTION_FIELD_TYPE,
  HEALTH_METRIC_KIND,
  METRIC_DIRECTION,
  METRIC_SIDE,
  HEALTH_METRIC_VALUE_SOURCE,
  HEALTH_GOAL_HORIZON,
  ASSIGNED_EXAM_STATUS,
  HEALTH_EXPERIMENT_PILLAR,
  HEALTH_EXPERIMENT_PHASE,
  HEALTH_EXPERIMENT_SOURCE,
  MEDICAL_PROFILE_KIND,
  MEDICAL_PROFILE_SOURCE,
  SAFETY_FLAG_TRIGGER,
  SAFETY_FLAG_STATUS,
  PHYSICAL_ROLE_AUTHORING_SOURCE,
  MEAL_SOURCE,
  MEAL_GENERATION_METHOD,
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
import { migration019Purposes } from '../db/migrations/019_purposes'
import { migration020Finance } from '../db/migrations/020_finance'
import { migration021Skills } from '../db/migrations/021_skills'
import { migration022Knowledge } from '../db/migrations/022_knowledge'
import { migration023Books } from '../db/migrations/023_books'
import { migration024LearningEducation } from '../db/migrations/024_learning_education'
import { migration025Relationships } from '../db/migrations/025_relationships'
import { migration026CheckIns } from '../db/migrations/026_check_ins'
import { migration027HealthCore } from '../db/migrations/027_health_core'
import { migration028HealthNutrition } from '../db/migrations/028_health_nutrition'
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
  // DB-4 group #8 — Purpose & Goals (capstone). 13 FIXED CHECK cols across 5 tables.
  // review_frequency reuses FREQUENCY; target_reviews.progress_rating is a range CHECK
  // (1-10, not tuple → not a row); purpose_metrics/target_reviews have no other CHECK col.
  { table: 'purposes', column: 'domain', tuple: LIFE_DOMAIN },
  { table: 'purposes', column: 'status', tuple: STATUS },
  { table: 'targets', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'targets', column: 'binding_mode', tuple: BINDING_MODE },
  { table: 'targets', column: 'status', tuple: STATUS },
  { table: 'targets', column: 'priority', tuple: PRIORITY },
  { table: 'targets', column: 'review_frequency', tuple: FREQUENCY },
  { table: 'purpose_metrics', column: 'calculation_method', tuple: CALCULATION_METHOD },
  { table: 'purpose_metric_values', column: 'source', tuple: METRIC_VALUE_SOURCE },
  { table: 'dreams', column: 'domain', tuple: LIFE_DOMAIN },
  { table: 'dreams', column: 'category', tuple: BUCKET_LIST_CATEGORY },
  { table: 'dreams', column: 'status', tuple: BUCKET_LIST_STATUS },
  { table: 'dreams', column: 'priority', tuple: PRIORITY },
  // DB-4 group #9 — Finance (+Fiscal & Legal). 13 FIXED TEXT-CHECK cols. OPEN vocabs
  // (currency, jurisdiction_code, category_bidx, residency_type, entity_type, obligation_type,
  // obligation status) have NO CHECK → deliberately not rows. recurring_frequency + payment_frequency
  // + income frequency all reuse FREQUENCY.
  { table: 'accounts', column: 'account_type', tuple: ACCOUNT_TYPE },
  { table: 'transactions', column: 'transaction_type', tuple: TRANSACTION_TYPE },
  { table: 'transactions', column: 'recurring_frequency', tuple: FREQUENCY },
  { table: 'assets', column: 'asset_type', tuple: ASSET_TYPE },
  { table: 'liabilities', column: 'liability_type', tuple: LIABILITY_TYPE },
  { table: 'liabilities', column: 'interest_type', tuple: INTEREST_TYPE },
  { table: 'liabilities', column: 'payment_frequency', tuple: FREQUENCY },
  { table: 'investments', column: 'investment_type', tuple: INVESTMENT_TYPE },
  { table: 'income_streams', column: 'income_type', tuple: INCOME_TYPE },
  { table: 'income_streams', column: 'work_type', tuple: WORK_TYPE },
  { table: 'income_streams', column: 'frequency', tuple: FREQUENCY },
  { table: 'fiscal_residencies', column: 'owner_type', tuple: FISCAL_OWNER_TYPE },
  { table: 'fiscal_obligations', column: 'owner_type', tuple: FISCAL_OWNER_TYPE },
  // DB-4 group Skills. 14 FIXED TEXT-CHECK cols / 11 distinct tuples (LIFE_DOMAIN×2,
  // MASTERY_LEVEL×2, FREQUENCY×2). OPEN vocabs (skills.status/ladder_template;
  // skill_activities.difficulty; skill_levels.duration_target; skill_actions.best_time;
  // skill_definitions.locale_variant) = no CHECK → not rows. Rating INTs (quality/energy_*/
  // focus_*) are plain INTEGER, not tuple-sourced. skill_actions has no FIXED CHECK column.
  { table: 'skills', column: 'domain', tuple: LIFE_DOMAIN },
  { table: 'skills', column: 'current_level', tuple: MASTERY_LEVEL },
  { table: 'skills', column: 'mastery_override', tuple: MASTERY_LEVEL },
  { table: 'skills', column: 'priority', tuple: PRIORITY },
  { table: 'skills', column: 'practice_frequency', tuple: FREQUENCY },
  { table: 'skills', column: 'setup_mode', tuple: SKILL_SETUP_MODE },
  { table: 'skill_levels', column: 'status', tuple: SKILL_LEVEL_STATUS },
  { table: 'skill_activities', column: 'type', tuple: SKILL_ACTIVITY_TYPE },
  { table: 'skill_activities', column: 'frequency', tuple: FREQUENCY },
  { table: 'skill_activities', column: 'fill_source', tuple: SKILL_FILL_SOURCE },
  { table: 'skill_dependencies', column: 'type', tuple: SKILL_DEPENDENCY_TYPE },
  { table: 'skill_dependencies', column: 'scope', tuple: SKILL_DEPENDENCY_SCOPE },
  { table: 'skill_definitions', column: 'domain', tuple: LIFE_DOMAIN },
  { table: 'skill_definitions', column: 'source', tuple: SKILL_DEFINITION_SOURCE },
  // DB-4 group #10 — Knowledge (+flashcards). 4 FIXED CHECK cols = 4 tuples (all single-use).
  // OPEN vocabs (object_kinds.name/learning_realm, references.type, compound_sets.consumer_module) =
  // no CHECK → not rows. mastery_level is a derived INTEGER (no CHECK). `references` is a SQL keyword
  // (quoted in DDL) but has no CHECK column → not queried here.
  { table: 'knowledge_objects', column: 'status', tuple: STUDY_TOPIC_STATUS },
  { table: 'knowledge_objects', column: 'difficulty', tuple: TOPIC_DIFFICULTY },
  { table: 'knowledge_containers', column: 'container_type', tuple: KNOWLEDGE_CONTAINER_TYPE },
  { table: 'flashcards', column: 'card_type', tuple: CARD_TYPE },
  // DB-4 group #11 — Books. 4 FIXED TEXT-CHECK cols = 4 tuples (all single-use). books.rating is a
  // numeric BETWEEN (not tuple-sourced → not a row). Position/statistics/json cols + reading_sessions.sub_type
  // (rides base sessions OPEN vocab) = no CHECK. reading_plans has NO measurement axes (C-M1).
  { table: 'books', column: 'status', tuple: BOOK_STATUS },
  { table: 'book_assets', column: 'format', tuple: BOOK_ASSET_FORMAT },
  { table: 'reading_plans', column: 'arrangement', tuple: READING_PLAN_ARRANGEMENT },
  { table: 'reading_plans', column: 'goal_type', tuple: READING_PLAN_GOAL_TYPE },
  // DB-4 group #12 — Learning: Education (+ICS). 15 FIXED CHECK cols across the hub. subjects.rating
  // is a numeric BETWEEN (not tuple-sourced → not a row); metadata/routing refs/progress/dates are OPEN.
  // subject_documents.doc_type is OPEN (user-extensible catch-all, no CHECK). education_measurements reuses
  // MEASUREMENT_KIND/BINDING_MODE (both CHECK-backed → rows, like deliverables). class_sessions rides base
  // sessions OPEN sub_type (no CHECK); ics/institution/self_taught/curricula have no FIXED CHECK col.
  { table: 'subjects', column: 'course_type', tuple: COURSE_TYPE },
  { table: 'subjects', column: 'status', tuple: COURSE_STATUS },
  { table: 'subjects', column: 'degree_tier', tuple: DEGREE_TIER },
  { table: 'programs', column: 'parent_type', tuple: PROGRAM_PARENT_TYPE },
  { table: 'terms', column: 'level', tuple: TERM_LEVEL },
  { table: 'subject_schedules', column: 'source', tuple: SCHEDULE_SOURCE },
  { table: 'grading_systems', column: 'scope', tuple: GRADING_SCOPE },
  { table: 'grading_systems', column: 'scale_type', tuple: GRADING_SCALE_TYPE },
  { table: 'grading_components', column: 'component_type', tuple: GRADING_COMPONENT_TYPE },
  { table: 'assessments', column: 'type', tuple: ASSESSMENT_TYPE },
  { table: 'assessments', column: 'modality', tuple: ASSESSMENT_MODALITY },
  { table: 'assessments', column: 'source', tuple: RECORD_SOURCE },
  { table: 'education_measurements', column: 'ref_type', tuple: MEASUREMENT_REF_TYPE },
  { table: 'education_measurements', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'education_measurements', column: 'binding_mode', tuple: BINDING_MODE },
  // DB-4 group #14 — Relationships (CRM). 9 FIXED TEXT-CHECK cols. FREQUENCY reused ×3
  // (stay_in_touch_frequency + contact_reminders.frequency + reminder_groups.frequency); PRIORITY
  // reused for contact_reminders.priority. OPEN vocab (contacts.closeness_tier = Preferences-defined)
  // has NO CHECK → not a row. Junctions have no CHECK col.
  { table: 'contacts', column: 'relationship_type', tuple: RELATIONSHIP_TYPE },
  { table: 'contacts', column: 'stay_in_touch_frequency', tuple: FREQUENCY },
  { table: 'contact_events', column: 'event_type', tuple: CONTACT_EVENT_TYPE },
  { table: 'interactions', column: 'interaction_type', tuple: INTERACTION_TYPE },
  { table: 'interactions', column: 'sentiment', tuple: SENTIMENT },
  { table: 'contact_reminders', column: 'frequency', tuple: FREQUENCY },
  { table: 'contact_reminders', column: 'priority', tuple: PRIORITY },
  { table: 'reminder_groups', column: 'frequency', tuple: FREQUENCY },
  { table: 'reminder_groups', column: 'anchor_type', tuple: REMINDER_GROUP_ANCHOR },
  // DB-4 group #16 — Check-ins. 4 FIXED CHECK cols (all the module's own tuples, reused from
  // @vida/types entities/user.ts; CHECK_IN_TYPE amended 3→6, CK-3). mood_score/energy_level are
  // numeric BETWEEN 1 AND 10 (not tuple-sourced → not rows). No inline tags (SP1).
  { table: 'daily_check_ins', column: 'check_in_type', tuple: CHECK_IN_TYPE },
  { table: 'check_in_templates', column: 'schedule_type', tuple: CHECK_IN_SCHEDULE_TYPE },
  { table: 'check_in_templates', column: 'preferred_time', tuple: CHECK_IN_PREFERRED_TIME },
  { table: 'check_in_template_questions', column: 'field_type', tuple: CHECK_IN_QUESTION_FIELD_TYPE },

  // DB-4 group #17 — Health: Core. 18 FIXED CHECK cols = 14 net-new (health.ts) + 4 reused
  // (MEASUREMENT_KIND/BINDING_MODE on health_goals; STATUS on health_goals.status; FREQUENCY on
  // health_goals.review_frequency). OPEN vocabs (modality/experiment-type/exam-kind/category/body_part/
  // response-scales/severity/medical-status/winner) carry NO CHECK → not rows.
  { table: 'health_metrics', column: 'kind', tuple: HEALTH_METRIC_KIND },
  { table: 'health_metrics', column: 'direction', tuple: METRIC_DIRECTION },
  { table: 'health_metrics', column: 'side', tuple: METRIC_SIDE },
  { table: 'health_metric_values', column: 'source', tuple: HEALTH_METRIC_VALUE_SOURCE },
  { table: 'assigned_exams', column: 'status', tuple: ASSIGNED_EXAM_STATUS },
  { table: 'health_goals', column: 'measurement_kind', tuple: MEASUREMENT_KIND },
  { table: 'health_goals', column: 'binding_mode', tuple: BINDING_MODE },
  { table: 'health_goals', column: 'horizon', tuple: HEALTH_GOAL_HORIZON },
  { table: 'health_goals', column: 'status', tuple: STATUS },
  { table: 'health_goals', column: 'review_frequency', tuple: FREQUENCY },
  { table: 'physical_roles', column: 'authoring_source', tuple: PHYSICAL_ROLE_AUTHORING_SOURCE },
  { table: 'health_experiments', column: 'pillar', tuple: HEALTH_EXPERIMENT_PILLAR },
  { table: 'health_experiments', column: 'phase', tuple: HEALTH_EXPERIMENT_PHASE },
  { table: 'health_experiments', column: 'source', tuple: HEALTH_EXPERIMENT_SOURCE },
  { table: 'medical_profile_entries', column: 'kind', tuple: MEDICAL_PROFILE_KIND },
  { table: 'medical_profile_entries', column: 'source', tuple: MEDICAL_PROFILE_SOURCE },
  { table: 'safety_flags', column: 'trigger', tuple: SAFETY_FLAG_TRIGGER },
  { table: 'safety_flags', column: 'status', tuple: SAFETY_FLAG_STATUS },

  // DB-4 group #18 — Health: Nutrition. 3 FIXED CHECK cols = 2 net-new (MEAL_SOURCE on meals.source [AI6 triad];
  // MEAL_GENERATION_METHOD on daily_meal_plans.generation_method) + 1 reused (FREQUENCY on nutritional_plans.
  // review_frequency). Everything else OPEN (modality per conventions L17 · editable-starter functional_area/
  // whole_food_type C5 · bare "status P") → NO CHECK, not rows.
  { table: 'meals', column: 'source', tuple: MEAL_SOURCE },
  { table: 'daily_meal_plans', column: 'generation_method', tuple: MEAL_GENERATION_METHOD },
  { table: 'nutritional_plans', column: 'review_frequency', tuple: FREQUENCY },
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
  await migration019Purposes.up(driver)
  await migration020Finance.up(driver)
  await migration021Skills.up(driver)
  await migration022Knowledge.up(driver)
  await migration023Books.up(driver)
  await migration024LearningEducation.up(driver)
  await migration025Relationships.up(driver)
  await migration026CheckIns.up(driver)
  await migration027HealthCore.up(driver)
  await migration028HealthNutrition.up(driver)
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
