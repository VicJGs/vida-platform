// ============================================================================
// services/checkins — types (mod-check-ins #41 ① · S2 Entry CRUD)
//
// Deps + the CheckInsService interface + input types + typed errors. Factory-object
// shape, hoisted closures, no `this.` (the ② destructure-consumption shape). Bespoke
// Error subclasses (the notes/types.ts precedent; ServiceError reconcile → DB-11).
// S2 declares the entry-CRUD surface; S3–S5 append.
// ============================================================================

import type { z } from 'zod'
import type { DailyCheckIn, CheckInType, CheckInTemplate } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type { CheckInTemplateQuestionRow } from '../../db/schema/check-ins'
import type {
  CreateCheckInSchema,
  UpdateCheckInSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  AddQuestionSchema,
  ScheduleConfigSchema,
} from '../../validators/user'

/**
 * S5 CHE-16 — the Journal day-page link collaborator (a structural subset of NotesService:
 * getPageByJournalDate + createEntityLink). The app injects the real notes service; a test injects a stub.
 */
export interface JournalLinkPort {
  getPageByJournalDate(date: string): Promise<{ id: string } | null>
  createEntityLink(pageId: string, entityType: string, entityId: string, context?: string): Promise<unknown>
}

/** S5 CHE-17 — the effect rail + registry (the registry gates the guarded emit). Injected by M1.2 Gamification. */
export interface EffectsPort {
  rail: EffectRail
  registry: EffectRegistry
}

export interface CheckInsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** S5 CHE-16 — optional Journal day-page re-feed collaborator (dormant when absent). */
  journal?: JournalLinkPort
  /** S5 CHE-17 — optional effect rail (guarded grant_currency emit; dormant without a registered handler). */
  effects?: EffectsPort
}

/** S5 CHE-15/28 — M1.1 PLACEHOLDER review shape (namespaced; journals owns the generic `ReviewData`). */
export interface CheckInReviewData {
  type: CheckInType
  sections: never[]
  degraded: true
  note: string
}

/** createCheckIn input — the Zod-validated create shape (validators/user.ts). */
export type CreateCheckInInput = z.infer<typeof CreateCheckInSchema>
/** updateCheckIn patch — content-only; the slot key is omitted (CK-2, immutable on update). */
export type UpdateCheckInInput = z.infer<typeof UpdateCheckInSchema>
export type CreateTemplateInput = z.infer<typeof CreateTemplateSchema>
export type UpdateTemplateInput = z.infer<typeof UpdateTemplateSchema>
export type AddQuestionInput = z.infer<typeof AddQuestionSchema>
export type ScheduleConfigInput = z.infer<typeof ScheduleConfigSchema>

/** A single plaintext mood/energy data point (CHE-13). */
export interface MoodEnergyPoint {
  date: string
  check_in_type: CheckInType
  mood_score: number | null
  energy_level: number | null
}
/** Mood/energy trend dataset for the dashboard (CHE-13) — points sorted by date asc. */
export interface MoodEnergyTrend {
  points: MoodEnergyPoint[]
}
/** DERIVED consecutive-day streak (CHE-14) — mirrors the E9 check_in_streak* names; never persisted. */
export interface StreakResult {
  current_streak: number
  longest_streak: number
  last_check_in_date: string | null
}

export interface CheckInsService {
  // ── S2: entry CRUD ──────────────────────────────────────────────
  createCheckIn(input: CreateCheckInInput): Promise<DailyCheckIn>
  updateCheckIn(id: string, patch: UpdateCheckInInput): Promise<DailyCheckIn>
  getCheckIn(date: string, type: CheckInType): Promise<DailyCheckIn | null>
  listCheckIns(range: { from: string; to: string }): Promise<DailyCheckIn[]>

  // ── S3: templates & questions ───────────────────────────────────
  getActiveTemplate(type: CheckInType): Promise<CheckInTemplate | null>
  createTemplate(input: CreateTemplateInput): Promise<CheckInTemplate>
  updateTemplate(id: string, patch: UpdateTemplateInput): Promise<CheckInTemplate>
  deleteTemplate(id: string): Promise<void>
  seedDefaultTemplates(): Promise<CheckInTemplate[]>
  addQuestion(templateId: string, q: AddQuestionInput): Promise<CheckInTemplateQuestionRow>
  reorderQuestions(templateId: string, orderedFieldKeys: string[]): Promise<void>
  removeQuestion(templateId: string, fieldKey: string): Promise<void>
  getQuestions(templateId: string): Promise<CheckInTemplateQuestionRow[]>
  setSchedule(templateId: string, cfg: ScheduleConfigInput): Promise<CheckInTemplate>

  // ── S4: derivations (read-side, no writes) ──────────────────────
  getMoodEnergyTrend(range: { from: string; to: string }): Promise<MoodEnergyTrend>
  computeCheckInStreak(asOf?: string): Promise<StreakResult>

  // ── S5: cross-module seams ──────────────────────────────────────
  getReviewData(type: CheckInType): Promise<CheckInReviewData>
}

/** CK-2 — one check-in per (date, type); never a silent overwrite (the JournalExistsError precedent). */
export class DuplicateCheckInError extends Error {
  constructor(
    public readonly date: string,
    public readonly type: string,
  ) {
    super(`A check-in already exists for ${date} / ${type}`)
    this.name = 'DuplicateCheckInError'
  }
}

/** CHE-20 — a required template question blocks completion until answered (CK-5). */
export class RequiredQuestionUnansweredError extends Error {
  constructor(public readonly fieldKey: string) {
    super(`Required check-in question unanswered: "${fieldKey}"`)
    this.name = 'RequiredQuestionUnansweredError'
  }
}

/** CHE-21 — custom_data must never duplicate a standard field (fail-loud, never a silent strip). */
export class StandardFieldInCustomDataError extends Error {
  constructor(public readonly fieldKey: string) {
    super(`custom_data must not duplicate the standard field "${fieldKey}"`)
    this.name = 'StandardFieldInCustomDataError'
  }
}

/** CHE-08 — a template question's field_key is UNIQUE per template (CK-5). */
export class DuplicateFieldKeyError extends Error {
  constructor(
    public readonly templateId: string,
    public readonly fieldKey: string,
  ) {
    super(`Question field_key "${fieldKey}" already exists on template ${templateId}`)
    this.name = 'DuplicateFieldKeyError'
  }
}
