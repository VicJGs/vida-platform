// ============================================================================
// services/checkins — the service (mod-check-ins #41 ① · S2 Entry CRUD)
//
// Entry CRUD over the finished DB-4 `daily_check_ins` table. Factory-object,
// hoisted closures, no `this.` (the ② destructure shape). Persistence: DB-6
// Repository, encryptedFields:[] M1.0 pass-through (CHE-30). No `deleted_at`
// (CK-10 hard-delete) → softDelete:false; reads are plain eq() clauses (the
// isNull(deleted_at) idiom is soft-delete-only). JSON `text()` columns are
// (de)serialized at the service boundary (the preferences toMerged/serialize
// precedent) so the surface returns the parsed DailyCheckIn (seam-contract).
// ============================================================================

import { and, eq, gte, lte, type SQL } from 'drizzle-orm'
import type { DailyCheckIn, CheckInType, CheckInTemplate } from '@vida/types'
import type { EffectEvent } from '../../foundation/effects'
import { createRepository, type CreateInput, type UpdateInput } from '../../db/repository'
import {
  dailyCheckIns,
  checkInTemplates,
  checkInTemplateQuestions,
  type DailyCheckInRow,
  type CheckInTemplateRow,
  type CheckInTemplateQuestionRow,
} from '../../db/schema/check-ins'
import {
  CreateCheckInSchema,
  UpdateCheckInSchema,
  CreateTemplateSchema,
  UpdateTemplateSchema,
  AddQuestionSchema,
  ScheduleConfigSchema,
} from '../../validators/user'
import {
  DuplicateCheckInError,
  DuplicateFieldKeyError,
  RequiredQuestionUnansweredError,
  StandardFieldInCustomDataError,
  type CheckInsService,
  type CheckInsServiceDeps,
  type CreateCheckInInput,
  type UpdateCheckInInput,
  type CreateTemplateInput,
  type UpdateTemplateInput,
  type AddQuestionInput,
  type ScheduleConfigInput,
  type MoodEnergyTrend,
  type StreakResult,
  type CheckInReviewData,
} from './types'

/** The `[E]` JSON-array columns on daily_check_ins (stored as TEXT; string[] in the domain). */
const JSON_ARRAY_FIELDS = ['top_intentions', 'wins', 'gratitude', 'challenges', 'tomorrow_focus'] as const

/** All daily_check_ins domain field names — a custom_data key colliding with any is a CHE-21 violation. */
const STANDARD_FIELDS = new Set<string>([
  'check_in_date',
  'check_in_type',
  'template_id',
  'mood_score',
  'energy_level',
  ...JSON_ARRAY_FIELDS,
  'reflection',
])

/** JSON-parse a TEXT column into its parsed app shape; malformed → fallback (never throws). */
function parseJson<T>(value: string | null, fallback: T): T {
  if (value == null) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

/** Row → parsed DailyCheckIn (the seam-contract shape). JSON arrays/object parse with a safe fallback;
 *  the `_sync_status` Row(string)→union gap is cast once here (the DB-11 reconcile). */
function toDailyCheckIn(row: DailyCheckInRow): DailyCheckIn {
  return {
    ...row,
    top_intentions: parseJson<string[]>(row.top_intentions, []),
    wins: parseJson<string[]>(row.wins, []),
    gratitude: parseJson<string[]>(row.gratitude, []),
    challenges: parseJson<string[]>(row.challenges, []),
    tomorrow_focus: parseJson<string[]>(row.tomorrow_focus, []),
    custom_data: parseJson<Record<string, unknown> | null>(row.custom_data, null),
    _sync_status: row._sync_status as DailyCheckIn['_sync_status'],
  }
}

/** Row → parsed CheckInTemplate (schedule_days JSON `text()` → number[]); `_sync_status` cast at the boundary. */
function toTemplate(row: CheckInTemplateRow): CheckInTemplate {
  return {
    ...row,
    // icon is `.default()` but not `.notNull()` → $inferSelect types it `string | null`; the interface is
    // non-null, so coalesce to the schema default (the preferences toMerged `row.x ?? DEFAULT` precedent).
    icon: row.icon ?? 'clipboard-check',
    schedule_days: parseJson<number[] | null>(row.schedule_days, null),
    _sync_status: row._sync_status as CheckInTemplate['_sync_status'],
  }
}

/** A `YYYY-MM-DD` calendar date → an integer day number (UTC), for consecutive-day math. Pure. */
function toDayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000)
}

/**
 * PURE consecutive-day streak over check-in dates (CHE-14/E9). Distinct dates (a day with ANY check-in counts
 * once); `longest_streak` = all-time longest run; `current_streak` = the run ending at the latest date, but ONLY
 * if that date is contiguous to `asOf` (today or yesterday) — else 0 (a broken streak is 0, never a stale count,
 * CK-27/§5). `asOf` is injected for determinism (no Date.now here). Never writes user_profile.
 */
export function computeStreak(dates: string[], asOf: string): StreakResult {
  const distinct = [...new Set(dates)].sort() // YYYY-MM-DD lexicographic order = chronological
  if (distinct.length === 0) return { current_streak: 0, longest_streak: 0, last_check_in_date: null }
  let longest = 0
  let run = 0
  let prev = Number.NEGATIVE_INFINITY
  let lastDay = 0
  let lastStr = ''
  for (const s of distinct) {
    const d = toDayNumber(s)
    run = d - prev === 1 ? run + 1 : 1
    if (run > longest) longest = run
    prev = d
    lastDay = d
    lastStr = s
  }
  const gap = toDayNumber(asOf) - lastDay // 0 = latest is today, 1 = yesterday
  return {
    current_streak: gap === 0 || gap === 1 ? run : 0,
    longest_streak: longest,
    last_check_in_date: lastStr,
  }
}

export function createCheckInsService(deps: CheckInsServiceDeps): CheckInsService {
  const { db, deviceId, journal, effects } = deps
  // No deleted_at (CK-10 hard-delete) → softDelete:false; encryptedFields:[] M1.0 pass-through (CHE-30).
  const dailyRepo = createRepository(db, dailyCheckIns, {
    deviceId,
    encryptedFields: [],
    softDelete: false,
  })
  // Questions repo (CHE-08/20). No deleted_at → softDelete:false. Reduced-column table (id + syncColumns,
  // no created_at/updated_at) → create() RETURN carries phantom baseColumns; re-read via findById for a
  // faithful row (repository-create-on-reduced-column-table-drops-phantom-basecolumns).
  const questionRepo = createRepository(db, checkInTemplateQuestions, {
    deviceId,
    encryptedFields: [],
    softDelete: false,
  })
  // check_in_templates full table (has baseColumns). No deleted_at (is_active governs lifecycle) → softDelete:false.
  const templateRepo = createRepository(db, checkInTemplates, {
    deviceId,
    encryptedFields: [],
    softDelete: false,
  })

  /** CHE-21 — reject a custom_data key that duplicates a standard field (fail-loud). */
  function assertNoStandardFieldInCustomData(customData: Record<string, unknown> | null | undefined): void {
    if (customData == null) return
    for (const key of Object.keys(customData)) {
      if (STANDARD_FIELDS.has(key)) throw new StandardFieldInCustomDataError(key)
    }
  }

  /** CHE-20 — when a template is referenced, every required question must be answered (custom_data
   *  key or the matching standard field). No template referenced → no gate. */
  async function assertRequiredAnswered(
    templateId: string | null | undefined,
    input: { custom_data?: Record<string, unknown> | null } & Record<string, unknown>,
  ): Promise<void> {
    if (templateId == null) return
    const questions = await questionRepo.findWhere(
      and(eq(checkInTemplateQuestions.template_id, templateId), eq(checkInTemplateQuestions.is_required, true)) as SQL,
    )
    for (const q of questions) {
      const inCustom = input.custom_data != null && input.custom_data[q.field_key] != null
      const inStandard = STANDARD_FIELDS.has(q.field_key) && input[q.field_key] != null
      if (!inCustom && !inStandard) throw new RequiredQuestionUnansweredError(q.field_key)
    }
  }

  /** Stringify the JSON `text()` columns on the create-write path (the preferences serialize precedent).
   *  Nullable scalars are coalesced to `null` so the returned row is FAITHFUL to the DB — create() echoes
   *  the input, not a re-read, so an omitted nullable would surface as `undefined` (repository-create-
   *  returns-input-row seam; the notes backfill precedent). */
  function serializeCreate(p: CreateCheckInInput): CreateInput<typeof dailyCheckIns> {
    const { top_intentions, wins, gratitude, challenges, tomorrow_focus, custom_data, ...rest } = p
    return {
      ...rest,
      template_id: p.template_id ?? null,
      mood_score: p.mood_score ?? null,
      energy_level: p.energy_level ?? null,
      reflection: p.reflection ?? null,
      top_intentions: top_intentions == null ? null : JSON.stringify(top_intentions),
      wins: wins == null ? null : JSON.stringify(wins),
      gratitude: gratitude == null ? null : JSON.stringify(gratitude),
      challenges: challenges == null ? null : JSON.stringify(challenges),
      tomorrow_focus: tomorrow_focus == null ? null : JSON.stringify(tomorrow_focus),
      custom_data: custom_data == null ? null : JSON.stringify(custom_data),
    }
  }

  /** Stringify the JSON columns present on an update patch (only the keys the caller sent). */
  function serializeUpdate(p: UpdateCheckInInput): UpdateInput<typeof dailyCheckIns> {
    const { top_intentions, wins, gratitude, challenges, tomorrow_focus, custom_data, ...rest } = p
    const out: UpdateInput<typeof dailyCheckIns> = { ...rest }
    if ('top_intentions' in p) out.top_intentions = top_intentions == null ? null : JSON.stringify(top_intentions)
    if ('wins' in p) out.wins = wins == null ? null : JSON.stringify(wins)
    if ('gratitude' in p) out.gratitude = gratitude == null ? null : JSON.stringify(gratitude)
    if ('challenges' in p) out.challenges = challenges == null ? null : JSON.stringify(challenges)
    if ('tomorrow_focus' in p) out.tomorrow_focus = tomorrow_focus == null ? null : JSON.stringify(tomorrow_focus)
    if ('custom_data' in p) out.custom_data = custom_data == null ? null : JSON.stringify(custom_data)
    return out
  }

  // CHE-16 — link the check-in to its day's Journal `pages` row (link-don't-copy, CK-7). Best-effort:
  // dormant without the `journal` dep; no-op when no day page exists (never creates the page — notes' job).
  // Runs POST-commit; the link is a re-drivable side-effect (IR-13 eventually-consistent), not atomic.
  async function refeedJournal(checkIn: DailyCheckIn): Promise<void> {
    if (!journal) return
    const page = await journal.getPageByJournalDate(checkIn.check_in_date)
    if (!page) return
    await journal.createEntityLink(page.id, 'daily_check_in', checkIn.id)
  }

  // CHE-17 — EMIT the grant_currency feeder on completion (create). GUARDED: dormant without the `effects`
  // dep OR without a registered handler (M1.0 — Gamification registers it at M1.2). Check-ins NEVER writes
  // XP / consequence_ledger / user_profile (E2/E3 — Gamification applies). A registered handler's error
  // propagates (fail-loud); a missing handler is the legitimate deferred state (skip, no throw).
  async function emitGrantCurrency(checkIn: DailyCheckIn): Promise<void> {
    if (!effects || !effects.registry.resolve('grant_currency')) return
    const event: EffectEvent = {
      subjectNaturalKey: checkIn.id,
      transition: 'completed',
      effectType: 'grant_currency',
      targetRef: checkIn.id,
    }
    await effects.rail.applyEffect(event)
  }

  const getCheckIn = async (date: string, type: CheckInType): Promise<DailyCheckIn | null> => {
    const rows = await dailyRepo.findWhere(
      and(eq(dailyCheckIns.check_in_date, date), eq(dailyCheckIns.check_in_type, type)) as SQL,
    )
    return rows[0] ? toDailyCheckIn(rows[0]) : null
  }

  const service: CheckInsService = {
    createCheckIn: async (input: CreateCheckInInput): Promise<DailyCheckIn> => {
      const p = CreateCheckInSchema.parse(input)
      assertNoStandardFieldInCustomData(p.custom_data) // CHE-21
      await assertRequiredAnswered(p.template_id, p) // CHE-20
      // CHE-01 — slot pre-query, then create (uq_daily_check_ins_slot is the DB backstop).
      const clash = await getCheckIn(p.check_in_date, p.check_in_type)
      if (clash) throw new DuplicateCheckInError(p.check_in_date, p.check_in_type)
      // Backfill the notNull-default columns so the returned row is faithful — create() returns the
      // input-derived row, not a re-read (the notes/preferences precedent).
      const row = await dailyRepo.create({
        ...serializeCreate(p),
        check_in_type: p.check_in_type, // notNull default 'morning'; slot key always present
      })
      const created = toDailyCheckIn(row)
      // Post-commit side-effects (S5): re-feed the Journal day page (CHE-16) then emit the completion
      // feeder (CHE-17). Both dormant without their deps; re-drivable (IR-13), the check-in already stands.
      await refeedJournal(created)
      await emitGrantCurrency(created)
      return created
    },

    updateCheckIn: async (id: string, patch: UpdateCheckInInput): Promise<DailyCheckIn> => {
      const p = UpdateCheckInSchema.parse(patch)
      assertNoStandardFieldInCustomData(p.custom_data) // CHE-21
      const row = await dailyRepo.update(id, serializeUpdate(p))
      const updated = toDailyCheckIn(row)
      await refeedJournal(updated) // CHE-16 re-feed on update; NO emit (a content edit is not a re-completion)
      return updated
    },

    getCheckIn,

    listCheckIns: async (range: { from: string; to: string }): Promise<DailyCheckIn[]> => {
      const rows = await dailyRepo.findWhere(
        and(gte(dailyCheckIns.check_in_date, range.from), lte(dailyCheckIns.check_in_date, range.to)) as SQL,
      )
      return rows.map(toDailyCheckIn)
    },

    // ── S3: templates & questions ───────────────────────────────────
    // CHE-05 — default-first: the active default custom template, else null → the caller renders the built-in
    // columns (G5/CK-4). Resolution via is_default/is_active (no check_in_type column; the built-in is
    // type-agnostic, G5). The `type` param is the seam-contract shape; M1.0 resolves default-first.
    getActiveTemplate: async (_type: CheckInType): Promise<CheckInTemplate | null> => {
      const rows = await templateRepo.findWhere(
        and(eq(checkInTemplates.is_default, true), eq(checkInTemplates.is_active, true)) as SQL,
      )
      return rows[0] ? toTemplate(rows[0]) : null
    },

    createTemplate: async (input: CreateTemplateInput): Promise<CheckInTemplate> => {
      const p = CreateTemplateSchema.parse(input)
      const { schedule_days, ...rest } = p
      const row = await templateRepo.create({
        ...rest,
        // Backfill notNull-default columns so the returned row is faithful (create() echoes input, S2 seam).
        icon: p.icon ?? 'clipboard-check',
        is_default: p.is_default ?? false,
        is_active: p.is_active ?? true,
        sort_order: p.sort_order ?? 0,
        schedule_type: p.schedule_type ?? null,
        preferred_time: p.preferred_time ?? null,
        schedule_days: schedule_days == null ? null : JSON.stringify(schedule_days),
      })
      return toTemplate(row)
    },

    updateTemplate: async (id: string, patch: UpdateTemplateInput): Promise<CheckInTemplate> => {
      const p = UpdateTemplateSchema.parse(patch)
      const { schedule_days, ...rest } = p
      const out: UpdateInput<typeof checkInTemplates> = { ...rest }
      if ('schedule_days' in p) out.schedule_days = schedule_days == null ? null : JSON.stringify(schedule_days)
      const row = await templateRepo.update(id, out)
      return toTemplate(row)
    },

    // CHE-22 — no-FK app-cascade: null referencing entries' template_id (entry survives) + delete the
    // template's questions (the intended CASCADE), then delete the template. Done in app code (no FK).
    deleteTemplate: async (id: string): Promise<void> => {
      const entries = await dailyRepo.findWhere(eq(dailyCheckIns.template_id, id))
      for (const e of entries) await dailyRepo.update(e.id, { template_id: null })
      const questions = await questionRepo.findWhere(eq(checkInTemplateQuestions.template_id, id))
      for (const q of questions) await questionRepo.delete(q.id)
      await templateRepo.delete(id)
    },

    // CHE-12 — seed ONE canonical, type-agnostic default template (is_default+is_active); idempotent
    // (skip if a default already exists). The built-in columns remain the zero-setup answer path (G5); this
    // row is the editable starting point (G3). getActiveTemplate resolves it via is_default.
    seedDefaultTemplates: async (): Promise<CheckInTemplate[]> => {
      const existing = await templateRepo.findWhere(eq(checkInTemplates.is_default, true))
      if (existing.length > 0) return existing.map(toTemplate)
      const row = await templateRepo.create({
        name: 'Default Check-in',
        description: null,
        icon: 'clipboard-check',
        is_default: true,
        is_active: true,
        schedule_type: null,
        schedule_days: null,
        preferred_time: null,
        sort_order: 0,
      })
      return [toTemplate(row)]
    },

    getQuestions: async (templateId: string): Promise<CheckInTemplateQuestionRow[]> =>
      questionRepo.findWhere(eq(checkInTemplateQuestions.template_id, templateId)),

    // CHE-08 — UNIQUE(template_id, field_key) via pre-query → DuplicateFieldKeyError (uq_..._field is backstop).
    // Reduced-column table → re-read via findById for a row free of the create() phantom baseColumns.
    addQuestion: async (templateId: string, q: AddQuestionInput): Promise<CheckInTemplateQuestionRow> => {
      const parsed = AddQuestionSchema.parse(q)
      const clash = await questionRepo.findWhere(
        and(
          eq(checkInTemplateQuestions.template_id, templateId),
          eq(checkInTemplateQuestions.field_key, parsed.field_key),
        ) as SQL,
      )
      if (clash[0]) throw new DuplicateFieldKeyError(templateId, parsed.field_key)
      const created = await questionRepo.create({
        template_id: templateId,
        field_key: parsed.field_key,
        label: parsed.label,
        field_type: parsed.field_type,
        placeholder: parsed.placeholder ?? null,
        is_required: parsed.is_required ?? false,
        min_value: parsed.min_value ?? null,
        max_value: parsed.max_value ?? null,
        sort_order: parsed.sort_order ?? 0,
      })
      const clean = await questionRepo.findById(created.id)
      if (!clean) throw new Error('addQuestion: created question not found')
      return clean
    },

    reorderQuestions: async (templateId: string, orderedFieldKeys: string[]): Promise<void> => {
      const questions = await questionRepo.findWhere(eq(checkInTemplateQuestions.template_id, templateId))
      const byKey = new Map(questions.map((q) => [q.field_key, q]))
      for (let i = 0; i < orderedFieldKeys.length; i++) {
        const key = orderedFieldKeys[i]
        const q = key == null ? undefined : byKey.get(key)
        if (q) await questionRepo.update(q.id, { sort_order: i })
      }
    },

    removeQuestion: async (templateId: string, fieldKey: string): Promise<void> => {
      const rows = await questionRepo.findWhere(
        and(
          eq(checkInTemplateQuestions.template_id, templateId),
          eq(checkInTemplateQuestions.field_key, fieldKey),
        ) as SQL,
      )
      const q = rows[0]
      if (q) await questionRepo.delete(q.id)
    },

    // CHE-11 — persist the per-template schedule CONFIG (the fire is CHE-24, deferred).
    setSchedule: async (templateId: string, cfg: ScheduleConfigInput): Promise<CheckInTemplate> => {
      const c = ScheduleConfigSchema.parse(cfg)
      const row = await templateRepo.update(templateId, {
        schedule_type: c.schedule_type,
        schedule_days: c.schedule_days == null ? null : JSON.stringify(c.schedule_days),
        preferred_time: c.preferred_time,
      })
      return toTemplate(row)
    },

    // ── S4: derivations (read-side, no writes) ──────────────────────
    // CHE-13 — mood/energy trend from the PLAINTEXT scales (CK-1), sorted by date. Empty → { points: [] }.
    getMoodEnergyTrend: async (range: { from: string; to: string }): Promise<MoodEnergyTrend> => {
      const rows = await dailyRepo.findWhere(
        and(gte(dailyCheckIns.check_in_date, range.from), lte(dailyCheckIns.check_in_date, range.to)) as SQL,
      )
      const points = rows
        .map((r) => ({
          date: r.check_in_date,
          check_in_type: r.check_in_type,
          mood_score: r.mood_score,
          energy_level: r.energy_level,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
      return { points }
    },

    // CHE-14 — DERIVED consecutive-day streak; NO user_profile write (E9). asOf defaults to today (injected
    // into the pure computeStreak for determinism).
    computeCheckInStreak: async (asOf?: string): Promise<StreakResult> => {
      const rows = await dailyRepo.findAll()
      const today = asOf ?? new Date().toISOString().slice(0, 10)
      return computeStreak(
        rows.map((r) => r.check_in_date),
        today,
      )
    },

    // ── S5: cross-module seams ──────────────────────────────────────
    // CHE-15/28 — M1.1 PLACEHOLDER review: a degraded shape, never a falsely-complete review (CK-6/§5). The
    // real Purpose/Projects/Tasks aggregation + target_reviews contribution (CHE-25) are cross-wave-deferred.
    getReviewData: async (type: CheckInType): Promise<CheckInReviewData> => ({
      type,
      sections: [],
      degraded: true,
      note: 'Review aggregation is not yet available — Purpose/Projects/Tasks are documented in a later wave. Use free reflection.',
    }),
  }

  return service
}
