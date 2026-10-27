import { z } from 'zod'
import {
  SESSION_SUB_TYPE,
  SESSION_PURPOSE,
  SCHEDULING_MODE,
  SESSION_STATUS,
  EFFECT_TYPE,
  PLANNED_BLOCK_STATUS,
  PRESET_BLOCK,
} from '@vida/types'

// Canonical validators for the Session framework enums (AR-5 · ADR-004).
// z.enum over the @vida/types tuple — the single source (DB-9). No cast, no spread.
export const SessionSubTypeSchema = z.enum(SESSION_SUB_TYPE)
export const SessionPurposeSchema = z.enum(SESSION_PURPOSE)
export const SchedulingModeSchema = z.enum(SCHEDULING_MODE)
export const SessionStatusSchema = z.enum(SESSION_STATUS)
export const EffectTypeSchema = z.enum(EFFECT_TYPE)
// DB-3: planned_blocks lifecycle (ADR-004 §3.1)
export const PlannedBlockStatusSchema = z.enum(PLANNED_BLOCK_STATUS)

// MOD-sessions ① S1 — structural validation for createSession (IR-5, fail-loud).
// sub_type is OPEN free-TEXT (BR-6) → z.string; scheduling_mode/status FIXED → the enum tuples.
// focus_rating/energy_level mirror the migration CHECK 1..5. The ended_at≥started_at rule is a
// refine so its issue path is exactly `ended_at` (mapped to InvalidSessionInput('ended_at')).
export const CreateSessionSchema = z
  .object({
    sub_type: z.string().min(1),
    purpose: z.string().nullish(),
    scheduling_mode: SchedulingModeSchema,
    status: SessionStatusSchema,
    planned_block_id: z.string().nullish(),
    started_at: z.number().int().nullish(),
    ended_at: z.number().int().nullish(),
    focus_rating: z.number().int().min(1).max(5).nullish(),
    energy_level: z.number().int().min(1).max(5).nullish(),
    distraction_count: z.number().int().min(0).nullish(),
    key_learnings: z.string().nullish(),
  })
  .refine(
    (d) => d.started_at == null || d.ended_at == null || d.ended_at >= d.started_at,
    { message: 'ended_at must be >= started_at', path: ['ended_at'] },
  )

// Routines S6 (R1 first-consumer-pull) — planned_blocks write (SS-7/SS-8 intent). Unix-ms slot, end > start when given;
// sub_type/target_type are OPEN (no SQL CHECK) and registry-validated in the service; status FIXED → the enum tuple.
export const PlanBlockSchema = z
  .object({
    scheduled_start: z.number().int(),
    scheduled_end: z.number().int().nullish(),
    sub_type: z.string().min(1).nullish(),
    target_type: z.string().min(1).nullish(),
    target_id: z.string().min(1).nullish(),
    source: z.string().nullish(),
  })
  .refine((d) => d.scheduled_end == null || d.scheduled_end > d.scheduled_start, {
    message: 'scheduled_end must be > scheduled_start',
    path: ['scheduled_end'],
  })
export const PlannedBlockPatchSchema = z
  .object({
    scheduled_start: z.number().int().optional(),
    scheduled_end: z.number().int().nullable().optional(),
    status: PlannedBlockStatusSchema.optional(),
  })
  .refine((d) => d.scheduled_start == null || d.scheduled_end == null || d.scheduled_end > d.scheduled_start, {
    message: 'scheduled_end must be > scheduled_start',
    path: ['scheduled_end'],
  })

// MOD-sessions ① S4 — Availability (SS-9). Mirrors migration 014 CHECKs: day 0..6, score 1..5,
// preset_block ∈ PRESET_BLOCK, HH:MM times, YYYY-MM-DD date. Fail-loud before the write (IR-5).
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/
const YMD = /^\d{4}-\d{2}-\d{2}$/

const AvailabilityFields = z.object({
  day_of_week: z.number().int().min(0).max(6),
  start_time: z.string().regex(HHMM),
  end_time: z.string().regex(HHMM),
  is_available: z.boolean().optional(),
  preference_score: z.number().int().min(1).max(5).nullish(),
  preset_block: z.enum(PRESET_BLOCK).nullish(),
  max_session_minutes: z.number().int().min(1).nullish(),
})
// Create: both times required + end > start (a real window). is_available:false = a valid blackout window
// (orthogonal — never rejected). No uniqueness/overlap check (SS-9/G5 input — stored as-is).
export const AvailabilitySchema = AvailabilityFields.refine(
  (d) => d.end_time > d.start_time,
  { message: 'end_time must be > start_time', path: ['end_time'] },
)
// Patch: every field optional; the end>start check is applied in the service when both are present.
export const AvailabilityPatchSchema = AvailabilityFields.partial()

const AvailabilityExceptionFields = z.object({
  exception_date: z.string().regex(YMD),
  is_available: z.boolean(),
  reason: z.string().nullish(),
  start_time: z.string().regex(HHMM).nullish(),
  end_time: z.string().regex(HHMM).nullish(),
})
export const AvailabilityExceptionSchema = AvailabilityExceptionFields.refine(
  (d) => d.start_time == null || d.end_time == null || d.end_time > d.start_time,
  { message: 'end_time must be > start_time', path: ['end_time'] },
)

// MOD-sessions ① S6 — session_templates (focus presets, PD-3). No DDL CHECK (all plain INTEGER NOT NULL
// DEFAULT) → app-layer is the only guard: name non-empty, minutes/intervals ≥ 1 (fail-loud, IR-5).
const TemplateFields = z.object({
  name: z.string().min(1),
  work_minutes: z.number().int().min(1).optional(),
  short_break_minutes: z.number().int().min(1).optional(),
  long_break_minutes: z.number().int().min(1).optional(),
  intervals_before_long_break: z.number().int().min(1).optional(),
  auto_start_breaks: z.boolean().optional(),
  auto_start_work: z.boolean().optional(),
  is_default: z.boolean().optional(),
  focus_technique: z.string().nullish(),
  description: z.string().nullish(),
  notifications: z.boolean().optional(),
  sounds: z.boolean().optional(),
  usage_count: z.number().int().min(0).optional(),
  last_used_at: z.number().int().nullish(),
})
export const TemplateSchema = TemplateFields
export const TemplatePatchSchema = TemplateFields.partial()
