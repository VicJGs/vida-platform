// ============================================================================
// Sessions & Scheduling — canonical enum tuples  (AR-5 · ADR-004)
//
// The Session framework's vocabulary. Enums are `as const` tuples with the
// union DERIVED from the tuple (DB-9 / ADR-002 §2.3, C2 tuple-as-source):
// @vida/core wraps each as `z.enum(...)`, and the SQL CHECK list is sourced
// from it — tuple ≡ union ≡ validator ≡ CHECK (enum-parity.test.ts).
//
// FIXED vs OPEN (AR-5 spec §3.1, BR-5a/BR-5b/BR-6):
//   • SESSION_STATUS + SCHEDULING_MODE — FIXED scalar columns → hard SQL CHECK.
//   • EFFECT_TYPE — FIXED catalogue, but stored as a JSON array in
//     session_type_registry → Zod-validated at registry-write, NO SQL CHECK.
//   • SESSION_SUB_TYPE + SESSION_PURPOSE — OPEN (SS-5 user-extensibility):
//     free TEXT, validated at runtime against session_type_registry, NOT a
//     column CHECK. The tuples below are the SHIPPED set (typing + defaults).
// ============================================================================

/** Session sub-type discriminator — SHIPPED set; OPEN vocabulary (BR-6, SS-1/SS-5). */
export const SESSION_SUB_TYPE = [
  'study',
  'class',
  'focus',
  'reading',
  'practice',
  'daily',
  'review',
  'workout',
  'work',
] as const
export type SessionSubType = (typeof SESSION_SUB_TYPE)[number]

/** Why a session happens — orthogonal to sub_type (BR-2, SS-2); SHIPPED set; OPEN vocabulary (BR-6). */
export const SESSION_PURPOSE = [
  'new_learning',
  'review',
  'exam_prep',
  'pre_class',
  'post_class',
  'maintenance',
] as const
export type SessionPurpose = (typeof SESSION_PURPOSE)[number]

/**
 * How a session is placed in time — FIXED (BR-5a) → hard SQL CHECK.
 * NOTE: 'ad_hoc' is intentional snake_case (identifier convention — every live tuple member is
 * snake_case). The docs' prose spelling 'ad-hoc' is display-only; do NOT "fix" this to a hyphen.
 */
export const SCHEDULING_MODE = ['attended', 'planned', 'ad_hoc'] as const
export type SchedulingMode = (typeof SCHEDULING_MODE)[number]

/** A `planned_blocks` (aggregator-scheduled block) lifecycle status — ADR-004 §3.1 · DB-3 substrate.
 *  The base `sessions.planned_block_id` points at a block; the block tracks whether it was fulfilled. */
export const PLANNED_BLOCK_STATUS = ['planned', 'scheduled', 'fulfilled', 'skipped'] as const
export type PlannedBlockStatus = (typeof PLANNED_BLOCK_STATUS)[number]

/** The S5 lifecycle state machine — FIXED (BR-5a) → hard SQL CHECK. Supersedes the legacy
 *  SCHEDULED_SESSION_STATUS (knowledge.ts), which lacks 'planned' + 'missed'. */
export const SESSION_STATUS = [
  'scheduled',
  'planned',
  'in_progress',
  'completed',
  'skipped',
  'missed',
  'rescheduled',
] as const
export type SessionStatus = (typeof SESSION_STATUS)[number]

// Pomodoro / focus-timer phase + run-state — a Sessions sub-type concern (ADR-004:
// pomodoro is a `sessions` sub-type; `focus_sessions` is the timer runtime). Relocated
// here from the retired notes types file during the notes teardown (2026-09-11).
// TODO(backend-replan): confirm final home in the full-backend intake.
export const POMODORO_TYPE = ['focus', 'short_break', 'long_break'] as const
export type PomodoroType = (typeof POMODORO_TYPE)[number]
export const POMODORO_STATUS = ['running', 'paused', 'completed', 'cancelled'] as const
export type PomodoroStatus = (typeof POMODORO_STATUS)[number]

/**
 * The effect catalogue (Integration-Contract dim2) — FIXED vocabulary (BR-5b).
 * Stored as a JSON array in session_type_registry.effects → Zod-validated, NO SQL CHECK.
 * 12 members = ADR-004 §3.2.2 base (8) + ADR-012 amendment (4, all §3.2.5 Additive-class).
 * `award_xp` is retained: ADR-012 §3 — `grant_currency` GENERALIZES it, does not retire it
 * (the retired token is `xp_history`, not `award_xp`).
 */
export const EFFECT_TYPE = [
  // base (ADR-004 §3.2.2)
  'complete_habit_occurrence',
  'log_time',
  'emit_measurement_signal',
  'contribute_purpose_metric',
  'award_xp',
  'surface_journal',
  'surface_calendar',
  'attach_pomodoro',
  // ADR-012 amendment (§3.2.2 catalogue additions)
  'grant_currency',
  'lock_currency',
  'move_money',
  'surface_notification',
] as const
export type EffectType = (typeof EFFECT_TYPE)[number]
