import { z } from 'zod'
import {
  SESSION_SUB_TYPE,
  SESSION_PURPOSE,
  SCHEDULING_MODE,
  SESSION_STATUS,
  EFFECT_TYPE,
  PLANNED_BLOCK_STATUS,
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
