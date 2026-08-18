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
