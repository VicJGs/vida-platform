// ============================================================================
// Domain tables: Learning: Education (+ICS) — DB-4 · group #12 · ADR-002 §5.10/§5.18
//
// THE Learning hub — the heaviest DB-4 group (15 tables). 3 FACT-floor tables
// reshaped (subjects[=courses]·ics_feed_configs·ics_synced_events) + 12 net-new
// INTENDED entities (the 8-level academic hierarchy + grading builder + measurement).
// ADR-002 §5.10/§5.18 DDL is STALE (flat courses; inline tags; progress NOT NULL
// DEFAULT 0). Net-new domain — nothing was on disk (only the stale ADR DDL).
//
// DDL model (ADR-016 §3.5): CHECK + indexes + UNIQUEs live in the hand-written SQL
// migration (migrations/024_learning_education.ts). These Drizzle objects are the
// type-safe QUERY mirror — `enumText` gives the TS union, not a SQL CHECK.
//
// Reframe (spec docs/specs/foundation/db-4-learning-education/):
// - `courses` → `subjects` (reinterpreted): inline `tags` RETIRED → entity_tags
//   (SP1, entity_type='subject'); `progress` nullable override (NULL⇒derive, M3 —
//   the §5.10 NOT NULL DEFAULT 0 anti-signal resolved out); +routing (curriculum_id/
//   term_id) + degree_tier field (ED-3/A1 optional depth). course_type kept as a
//   subject-level modality (conventions L71).
// - The hierarchy (ED-2/H2): institutions + self_taught (SEPARATE tables) → programs
//   (parent_type+parent_id) → curricula (forked_from_id lineage, ED-11) → terms
//   (hierarchical level+parent_term_id, ED-12) → subjects. Degree = a tier FIELD.
// - class_sessions = base `sessions` sub_type='class' 1:1 extension (own id PK +
//   session_id UNIQUE, no FK; the study/focus/reading/practice precedent). Spine
//   fields live on `sessions` (BR-S1). NO deleted_at (base owns lifecycle, F1/BR-ED-7).
// - subject_schedules = one per subject (UNIQUE(subject_id)); class_sessions ARE the
//   schedule content (ED-5). Fed by ics/document/manual (SCHEDULE_SOURCE).
// - grading_systems (scope+scale) + grading_components (weighted template {type,
//   weight,points}) — the grade builder (ED-7). assessments attach to subjects (ED-8),
//   carry source (RECORD_SOURCE, AI6). grade/GPA COMPUTATION = service (M1.1+).
// - education_measurements = Education-forged measure entity (ED-10): measurement_kind
//   (M1, notNull no-default — dedicated entity, caller-supplied; diverges from
//   deliverables' 'milestone' default) × binding_mode (M2, nullable no-default ⇒ derive)
//   × progress (M3 nullable override). SEPARATE storage from Projects (never mixed).
// - subject_documents = the per-subject vault (ED-13, the project_documents/PJ-8 pattern:
//   baseColumns only, NO deleted_at, nullable blob + R2 ref).
// - NO FK anywhere (§5.10 REFERENCES/CASCADE superseded, ADR-016 §3.4); all refs plain TEXT.
//
// deleted_at EXCEPTIONS: ics_feed_configs + ics_synced_events (FACT interfaces omit;
// X8 add-only "never delete" / X9 revoke=is_active — BR-ED-4), class_sessions (session
// extension), subject_documents (PJ-8 faithful) carry NO deleted_at. The other 11 keep it.
//
// OUT (owned elsewhere / undesigned): homework = Tasks-owned (C-HW, no local table);
// entity_tags/entity_links = AR-6; AI document-extraction pipeline + ai_connections/
// import_staging = ADR-014/015 service (source=ai column authored here); grade/GPA/
// measurement compute = runtime service; base `sessions` spine = ADR-004; E2/grant (C-E2);
// AI4 agent (C-AI4); M5 seam (C-M5); My-Week/cross-subject/GPA-report views.
// @vida/types row-interface reconcile (Course→Subject rename etc.) → DB-11.
//
// M1.0 encryption (BR-DB6-3): the [E] fields are the M3 target — EMPTY [E] set in M1.0.
// ============================================================================

import { sqliteTable, text, integer, index, blob } from 'drizzle-orm/sqlite-core'
import {
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
  MEASUREMENT_KIND,
  BINDING_MODE,
} from '@vida/types'
import { baseColumns, enumText, boolInt, calendarDate } from './_shared'

// --- subjects: the study unit (= `courses` reinterpreted) -------------------
export const subjects = sqliteTable(
  'subjects',
  {
    ...baseColumns,
    /** @encrypted [E] */
    title: text('title').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    /** @encrypted [E] */
    provider: text('provider'),
    /** @encrypted [E] */
    instructor: text('instructor'),
    /** @encrypted [E] */
    url: text('url'),
    /** @encrypted [E] — generic slot (v1 college-data superseded by the structured entities) */
    metadata: text('metadata'),
    course_type: enumText('course_type', COURSE_TYPE), // FIXED → CHECK; nullable (subject modality, conventions L71)
    status: enumText('status', COURSE_STATUS).notNull(), // FIXED → CHECK
    progress: integer('progress'), // DERIVED override, nullable (M3 — no NOT NULL DEFAULT 0)
    total_modules: integer('total_modules'),
    completed_modules: integer('completed_modules'),
    start_date: calendarDate('start_date'),
    end_date: calendarDate('end_date'),
    target_completion: calendarDate('target_completion'),
    estimated_hours: integer('estimated_hours'), // minutes
    rating: integer('rating'), // CHECK BETWEEN 1 AND 5 (numeric, not a tuple)
    curriculum_id: text('curriculum_id'), // no FK; routing (ED-3), nullable per A1 optional depth
    term_id: text('term_id'), // no FK, nullable
    degree_tier: enumText('degree_tier', DEGREE_TIER), // FIXED → CHECK; nullable
    deleted_at: integer('deleted_at'),
    // RETIRED: inline tags → entity_tags (SP1, entity_type='subject')
  },
  (t) => [index('idx_subjects_curriculum').on(t.curriculum_id)],
)

// --- ics_feed_configs: calendar feeds (FACT) — NO deleted_at (X9 revoke=is_active) ---
export const icsFeedConfigs = sqliteTable('ics_feed_configs', {
  ...baseColumns,
  /** @encrypted [E] */
  feed_url: text('feed_url').notNull(),
  /** @encrypted [E] */
  feed_name: text('feed_name'),
  is_active: boolInt('is_active').notNull().default(true),
  auto_create_sessions: boolInt('auto_create_sessions').notNull().default(false),
  default_subject_id: text('default_subject_id'), // no FK (was default_course_id — reframe F3)
  sync_interval_hours: integer('sync_interval_hours').notNull().default(6), // FACT §5.18
  last_synced_at: integer('last_synced_at'),
  /** @encrypted [E] */
  last_error: text('last_error'),
  /** @encrypted [E] */
  metadata: text('metadata'),
  // NO deleted_at — FACT interface omits; a feed is revoked via is_active (X9), not deleted
})

// --- ics_synced_events: synced events (FACT) — add-only, NO deleted_at (X8) --
export const icsSyncedEvents = sqliteTable(
  'ics_synced_events',
  {
    ...baseColumns,
    feed_id: text('feed_id').notNull(), // no FK
    uid: text('uid').notNull(),
    /** @encrypted [E] */
    summary: text('summary'),
    /** @encrypted [E] */
    description: text('description'),
    /** @encrypted [E] */
    location: text('location'),
    start_time: integer('start_time').notNull(),
    end_time: integer('end_time'),
    recurrence_rule: text('recurrence_rule'),
    matched_subject_id: text('matched_subject_id'), // no FK (was matched_course_id — reframe F3)
    created_session_id: text('created_session_id'), // no FK
    is_ignored: boolInt('is_ignored').notNull().default(false),
    /** @encrypted [E] — full ICS event data */
    raw_event: text('raw_event'),
    // NO deleted_at — X8 add-only feed (dedup + is_ignored, never delete)
  },
  (t) => [index('idx_ics_synced_events_feed').on(t.feed_id)],
  // UNIQUE(feed_id, uid) authored in the migration — the X8 natural-key dedup
)

// --- institutions: formal parent (ED-2) ------------------------------------
export const institutions = sqliteTable('institutions', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  deleted_at: integer('deleted_at'),
})

// --- self_taught: the self-taught mode container (ED-2/H2, separate table) ---
export const selfTaught = sqliteTable('self_taught', {
  ...baseColumns,
  /** @encrypted [E] */
  name: text('name').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  deleted_at: integer('deleted_at'),
})

// --- programs: the pursuit (ED-2) ------------------------------------------
export const programs = sqliteTable(
  'programs',
  {
    ...baseColumns,
    parent_type: enumText('parent_type', PROGRAM_PARENT_TYPE).notNull(), // FIXED → CHECK
    parent_id: text('parent_id').notNull(), // no FK (institution OR self_taught)
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_programs_parent').on(t.parent_type, t.parent_id)],
)

// --- curricula: the shaped plan, forkable (ED-11) ---------------------------
export const curricula = sqliteTable(
  'curricula',
  {
    ...baseColumns,
    program_id: text('program_id').notNull(), // no FK
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    forked_from_id: text('forked_from_id'), // no FK, nullable — lineage pointer (ED-11)
    is_template: boolInt('is_template').notNull().default(false),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_curricula_program').on(t.program_id)],
)

// --- terms: hierarchical time containers (ED-12) ----------------------------
export const terms = sqliteTable(
  'terms',
  {
    ...baseColumns,
    curriculum_id: text('curriculum_id').notNull(), // no FK
    level: enumText('level', TERM_LEVEL).notNull(), // FIXED → CHECK
    parent_term_id: text('parent_term_id'), // no FK, nullable — year ⊃ semester ⊃ term
    /** @encrypted [E] */
    name: text('name').notNull(),
    start_date: calendarDate('start_date'),
    end_date: calendarDate('end_date'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_terms_curriculum').on(t.curriculum_id)],
)

// --- class_sessions: `class` Session sub-type (BR-ED-7) — NO deleted_at -----
export const classSessions = sqliteTable(
  'class_sessions',
  {
    ...baseColumns,
    session_id: text('session_id').notNull().unique(), // 1:1 key → sessions.id (no FK)
    subject_id: text('subject_id').notNull(), // no FK
    schedule_id: text('schedule_id'), // no FK, nullable — derived from subject_schedules
    source_event_id: text('source_event_id'), // no FK, nullable — the ics_synced_event it maps from
    /** @encrypted [E] */
    location: text('location'),
    // NO deleted_at — session extension; base `sessions` owns lifecycle (BR-ED-7)
  },
  (t) => [index('idx_class_sessions_subject').on(t.subject_id)],
)

// --- subject_schedules: the single schedule source (ED-5) -------------------
export const subjectSchedules = sqliteTable('subject_schedules', {
  ...baseColumns,
  subject_id: text('subject_id').notNull(), // no FK — UNIQUE (one per subject) in migration
  source: enumText('source', SCHEDULE_SOURCE).notNull(), // FIXED → CHECK
  deleted_at: integer('deleted_at'),
})

// --- grading_systems: the grading builder (ED-7) ----------------------------
export const gradingSystems = sqliteTable(
  'grading_systems',
  {
    ...baseColumns,
    scope: enumText('scope', GRADING_SCOPE).notNull(), // FIXED → CHECK
    scope_id: text('scope_id').notNull(), // no FK (institution/program/subject)
    /** @encrypted [E] */
    name: text('name').notNull(),
    /** @encrypted [E] */
    description: text('description'),
    scale_type: enumText('scale_type', GRADING_SCALE_TYPE).notNull(), // FIXED → CHECK
    /** @encrypted [E] — custom scale definition (JSON-as-text) */
    scale_config: text('scale_config'),
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_grading_systems_scope').on(t.scope, t.scope_id)],
)

// --- grading_components: weighted component template (ED-7) ------------------
export const gradingComponents = sqliteTable(
  'grading_components',
  {
    ...baseColumns,
    grading_system_id: text('grading_system_id').notNull(), // no FK
    component_type: enumText('component_type', GRADING_COMPONENT_TYPE).notNull(), // FIXED → CHECK
    /** @encrypted [E] */
    name: text('name'),
    weight: integer('weight'), // BasisPoints (relative weight), nullable
    max_points: integer('max_points'), // absolute points, nullable
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_grading_components_system').on(t.grading_system_id)],
)

// --- assessments: subject-attached (ED-8) -----------------------------------
export const assessments = sqliteTable(
  'assessments',
  {
    ...baseColumns,
    subject_id: text('subject_id').notNull(), // no FK
    type: enumText('type', ASSESSMENT_TYPE).notNull(), // FIXED → CHECK
    grading_component_id: text('grading_component_id'), // no FK, nullable — which component it counts toward
    /** @encrypted [E] */
    title: text('title'),
    /** @encrypted [E] */
    description: text('description'),
    date: calendarDate('date'),
    weight: integer('weight'), // BasisPoints, nullable (per grading system)
    max_points: integer('max_points'), // nullable
    modality: enumText('modality', ASSESSMENT_MODALITY), // FIXED → CHECK; nullable
    score: integer('score'), // the result; grade derives via the grading system (no range CHECK, F6)
    source: enumText('source', RECORD_SOURCE).notNull().default('manual'), // FIXED → CHECK; AI6
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_assessments_subject').on(t.subject_id), index('idx_assessments_type').on(t.type)],
)

// --- subject_documents: the per-subject vault (ED-13, PJ-8) — NO deleted_at --
export const subjectDocuments = sqliteTable('subject_documents', {
  ...baseColumns,
  subject_id: text('subject_id').notNull(), // no FK
  /** @encrypted [E] */
  title: text('title').notNull(),
  /** @encrypted [E] */
  description: text('description'),
  doc_type: text('doc_type'), // OPEN vocab (syllabus/schedule/material catch-all) — no CHECK
  encrypted_blob: blob('encrypted_blob'), // inline small (nullable BLOB) — project_documents pattern
  storage_ref: text('storage_ref'), // R2 ref for large (nullable)
  // NO deleted_at — the project_documents/PJ-8 vault pattern (faithful §5.4)
})

// --- education_measurements: Education-forged measure entity (ED-10) ---------
export const educationMeasurements = sqliteTable(
  'education_measurements',
  {
    ...baseColumns,
    ref_type: enumText('ref_type', MEASUREMENT_REF_TYPE).notNull(), // FIXED → CHECK (subject|program)
    ref_id: text('ref_id').notNull(), // no FK
    // notNull no-default: a dedicated measure entity, caller always supplies the kind
    // (contract setMeasurement) — diverges from deliverables' 'milestone' default deliberately.
    measurement_kind: enumText('measurement_kind', MEASUREMENT_KIND).notNull(), // FIXED → CHECK (M1)
    binding_mode: enumText('binding_mode', BINDING_MODE), // FIXED → CHECK; nullable no-default ⇒ derive (M2)
    progress: integer('progress'), // DERIVED override, nullable (M3)
    deleted_at: integer('deleted_at'),
  },
  (t) => [index('idx_education_measurements_ref').on(t.ref_type, t.ref_id)],
)

// --- inferred row types ------------------------------------------------------
export type SubjectRow = typeof subjects.$inferSelect
export type SubjectInsert = typeof subjects.$inferInsert
export type IcsFeedConfigRow = typeof icsFeedConfigs.$inferSelect
export type IcsFeedConfigInsert = typeof icsFeedConfigs.$inferInsert
export type IcsSyncedEventRow = typeof icsSyncedEvents.$inferSelect
export type IcsSyncedEventInsert = typeof icsSyncedEvents.$inferInsert
export type InstitutionRow = typeof institutions.$inferSelect
export type InstitutionInsert = typeof institutions.$inferInsert
export type SelfTaughtRow = typeof selfTaught.$inferSelect
export type SelfTaughtInsert = typeof selfTaught.$inferInsert
export type ProgramRow = typeof programs.$inferSelect
export type ProgramInsert = typeof programs.$inferInsert
export type CurriculumRow = typeof curricula.$inferSelect
export type CurriculumInsert = typeof curricula.$inferInsert
export type TermRow = typeof terms.$inferSelect
export type TermInsert = typeof terms.$inferInsert
export type ClassSessionRow = typeof classSessions.$inferSelect
export type ClassSessionInsert = typeof classSessions.$inferInsert
export type SubjectScheduleRow = typeof subjectSchedules.$inferSelect
export type SubjectScheduleInsert = typeof subjectSchedules.$inferInsert
export type GradingSystemRow = typeof gradingSystems.$inferSelect
export type GradingSystemInsert = typeof gradingSystems.$inferInsert
export type GradingComponentRow = typeof gradingComponents.$inferSelect
export type GradingComponentInsert = typeof gradingComponents.$inferInsert
export type AssessmentRow = typeof assessments.$inferSelect
export type AssessmentInsert = typeof assessments.$inferInsert
export type SubjectDocumentRow = typeof subjectDocuments.$inferSelect
export type SubjectDocumentInsert = typeof subjectDocuments.$inferInsert
export type EducationMeasurementRow = typeof educationMeasurements.$inferSelect
export type EducationMeasurementInsert = typeof educationMeasurements.$inferInsert
