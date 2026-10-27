// ============================================================================
// Routines Domain — @vida/types
// ADR-002 §5.6 (reframe) · mirrors packages/core/src/db/schema/routines.ts
//
// DB-11 reconcile (mod-routines #64 ① · S1): the schema shipped the ORCHESTRATION
// REFRAME (migration 018) — `routines` (named ordered sequence, pursuable) +
// `routine_step` (polymorphic driven step) + `routine_completions` (per-step ledger,
// re-keyed). These interfaces are reconciled to that shipped shape.
//
// RETIRED here (flat 2-table POC, now only in _legacy/): RoutineAction,
// ROUTINE_ACTION_TYPE, ROUTINE_RECURRENCE_FREQUENCY. KEPT: ROUTINE_LIFECYCLE,
// ROUTINE_TIME_OF_DAY (both are live SQL CHECK columns — enum-parity.test.ts:298-301).
// ============================================================================

import type { Id, Timestamp } from './common'
import type { SyncableEntity } from './sync'
import type { MeasurementKind, BindingMode } from './measurement'

// ---------------------------------------------------------------------------
// Enums (tuple ≡ union ≡ validator ≡ SQL CHECK — DB-9)
// ---------------------------------------------------------------------------

/** Routine lifecycle (SQL CHECK on routines.lifecycle). Paused/off generate no misses (RT-6). */
export const ROUTINE_LIFECYCLE = ['active', 'paused', 'off'] as const
export type RoutineLifecycle = (typeof ROUTINE_LIFECYCLE)[number]

/** Time-of-day bucket for a step (SQL CHECK on routine_step.time_of_day, nullable). */
export const ROUTINE_TIME_OF_DAY = ['morning', 'afternoon', 'evening'] as const
export type RoutineTimeOfDay = (typeof ROUTINE_TIME_OF_DAY)[number]

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

/**
 * A routine — the named, ordered, recurring SEQUENCE and a pursuable (ADR-011).
 * Routine-level "done"/streak is DERIVED on read from the completions ledger
 * (RT-14/RT-19): `progress` is a nullable override slot, never a cached counter.
 */
export interface Routine extends SyncableEntity {
  /** @encrypted */
  name: string
  /** @encrypted */
  description: string | null
  /** RRULE — the broad schedule (RT-11), consumed by the Scheduler. */
  recurrence_rule: string | null
  lifecycle: RoutineLifecycle
  /** Pursuable measure kind (ADR-011 M1); natural `rate` (RT-19). */
  measurement_kind: MeasurementKind
  /** Pursuable binding (ADR-011 M2); null ⇒ derive derived-pull. */
  binding_mode: BindingMode | null
  /** Nullable override slot (RT-14 — no cached streak; NULL ⇒ derive). */
  progress: number | null
  sort_order: number
  deleted_at: Timestamp | null
}

/**
 * A routine step — polymorphic, driving a real entity elsewhere (RT-3). Replaces
 * the retired flat `RoutineAction`. `step_type` is OPEN vocab (user-extensible,
 * registry-validated — no enum); `entity_type`/`entity_id` are nullable (an
 * actionable "alarm" step has no driven entity — RT-4).
 */
export interface RoutineStep extends SyncableEntity {
  /** Parent routine (no FK — app-layer cascade, RT-17). */
  routine_id: Id | null
  step_order: number
  /** OPEN vocab (RT-3) — e.g. habit · task · workout/focus/study session sub-type · … */
  step_type: string | null
  /** Polymorphic driven-entity ref (nullable — RT-4). */
  entity_type: string | null
  entity_id: Id | null
  /** Required-node completion-policy support (RT-5). */
  is_required: boolean
  /** @encrypted */
  title: string
  /** @encrypted */
  description: string | null
  time_of_day: RoutineTimeOfDay | null
  /** JSON array of YYYY-MM-DD — pre-planned skips (RT-8). */
  skip_dates: string[] | null
  deleted_at: Timestamp | null
}

/**
 * A per-step completion ledger entry (re-keyed from `routine_action_id`). UNIQUE per
 * (routine_step_id, completed_date). No `deleted_at` — a ledger row hard-deletes with
 * its step (RT-17). Independently synced ⇒ extends SyncableEntity (carries updated_at).
 */
export interface RoutineCompletion extends SyncableEntity {
  routine_step_id: Id
  /** YYYY-MM-DD — unique per step + date. */
  completed_date: string
  completed_at: Timestamp
  skipped: boolean
  /** @encrypted */
  skip_reason: string | null
  actual_duration_minutes: number | null
}
