// ============================================================================
// SessionsService — MOD-sessions ① backend service tier (LIF-139)
//
// The first real services/* build, over the AR-5 `foundation/sessions` spine +
// the #32 effect rail + the DB-4 schema. Factory-object (no `this.`, IR-8 —
// intra-service calls go via the `service` const / hoisted closures, mirroring
// foundation/spaces/service.ts). Every mutation → the db-6 Repository → co-
// transactional sync_queue enqueue. M1.0 pass-through: encryptedFields: [] on
// every repo ([E] fields — key_learnings, template/batch/exception names —
// stay dormant until M3/DB-5).
//
// The 7 slices (spec: service/S1-*.md … S7-*.md · rules: current-business-rules
// BR-13..BR-35):
//   S1 session CRUD + attach (atomic spine+extension via createInTx)
//   S2 sub_type/entity_type registry validation + completion→#32 transition wiring
//   S3 Pomodoro focus runtime over focus_sessions (pause/interruption/cadence)
//   S4 availability CRUD (study_availability + availability_exceptions)
//   S5 plan-batch endpoints (study_plan_batches state machine; G5 algorithm → M1.2)
//   S6 session_templates CRUD (focus presets; is_default single-winner)
//   S7 dueIn aggregator (shared platform primitive) + derived analytics
//
// Table lifecycle: `sessions` + `planned_blocks` carry deleted_at (softDelete:true);
// `focus_sessions`/`study_sessions`/`session_attachments`/`study_availability`/
// `availability_exceptions`/`study_plan_batches`/`session_templates` use bare
// ...baseColumns with NO deleted_at (base owns lifecycle / hard-delete-by-design)
// → softDelete:false. Soft-deleting a session touches the SPINE only; the
// extension goes unreachable via getSession.
//
// Config (PD-3) is Preferences-owned (user_preferences → PD-3 defaults); templates
// are ②-applied presets, not runtime-bound. Effect firing rides the single #32
// path; per-module handlers are deferred (#46) — the rail is fail-loud on a
// missing handler. Deferred beyond ①: placement algorithm + SS-8 bridge → M1.2 ·
// live dueIn provider lanes → owning modules · ② UI → fe-sessions.
// ============================================================================

import { eq, and, gte, lte, isNull } from 'drizzle-orm'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import {
  sessions,
  sessionAttachments,
  type SessionRow,
  type SessionAttachmentRow,
} from '../../db/schema/foundation/sessions'
import {
  focusSessions,
  studySessions,
  type FocusSessionRow,
  type StudySessionRow,
} from '../../db/schema/foundation/session-extensions'
import { userPreferences } from '../../db/schema/preferences'
import {
  sessionTemplates,
  studyAvailability,
  availabilityExceptions,
  studyPlanBatches,
  plannedBlocks,
  type StudyPlanBatchRow,
} from '../../db/schema/foundation/scheduling'
import type { PomodoroType } from '@vida/types'
import { resolveTargets, type ResolvedTarget } from '../../foundation/sessions/attachments'
import type { SessionRegistry } from '../../foundation/sessions/registry'
import {
  transition,
  InvalidTransition,
  type TransitionResult,
} from '../../foundation/sessions/lifecycle'
import type { EffectRail } from '../../foundation/effects'
import { type TaggableTypeRegistry, UnknownEntityType } from '../../foundation/spaces'
import {
  CreateSessionSchema,
  AvailabilitySchema,
  AvailabilityPatchSchema,
  AvailabilityExceptionSchema,
  TemplateSchema,
  TemplatePatchSchema,
} from '../../validators/session'
import {
  type CreateSessionInput,
  type SessionPatch,
  type Session,
  type StartFocusInput,
  type FocusTimer,
  type FocusConfig,
  type AvailabilityInput,
  type AvailabilityPatch,
  type AvailabilityExceptionInput,
  type Availability,
  type AvailabilityException,
  type TemplateInput,
  type TemplatePatch,
  type SessionTemplate,
  type GeneratePlanInput,
  type PlanBatch,
  type TimeRange,
  type DueItem,
  type DueProvider,
  type SessionAnalytics,
  InvalidSessionInput,
  InvalidFocusTransition,
  SessionMissing,
  InvalidBatchTransition,
} from './types'

export { InvalidTransition } // from lifecycle (not ./types); the ./types errors export via the barrel

export interface SessionsServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** AR-5 SessionRegistry — validates createSession sub_type (S2) + drives lifecycle transitions. */
  registry: SessionRegistry
  /** #32 effect rail — completion fires declared effects through it (fail-loud on missing handlers). */
  rail: EffectRail
  /** Shared entity-type registry (spaces/ENTITY_TYPES) — validates attach entity_type (BR-6). */
  entityRegistry: TaggableTypeRegistry
}

export interface SessionsService {
  createSession(input: CreateSessionInput): Promise<Session>
  getSession(id: string): Promise<Session | null>
  updateSession(id: string, patch: SessionPatch): Promise<Session>
  softDeleteSession(id: string): Promise<void>
  restoreSession(id: string): Promise<Session>
  attach(
    sessionId: string,
    entityType: string,
    entityId: string,
    level: 'type' | 'instance',
  ): Promise<SessionAttachmentRow>
  detach(attachmentId: string): Promise<void>
  resolveTargets(sessionId: string): Promise<ResolvedTarget[]>
  /** Complete a session — routes through the #32 transition engine (fires declared effects). */
  completeSession(id: string): Promise<TransitionResult>
  /** Apply any declared lifecycle event via the #32 transition engine. */
  transitionSession(id: string, event: string): Promise<TransitionResult>
  // --- S3 · Pomodoro focus runtime (timer id = the focus_sessions row id) ---
  startFocus(input: StartFocusInput): Promise<FocusTimer>
  pauseFocus(id: string): Promise<FocusTimer>
  resumeFocus(id: string): Promise<FocusTimer>
  nextInterval(id: string): Promise<FocusTimer>
  completeFocus(id: string): Promise<FocusTimer>
  cancelFocus(id: string, opts?: { interruptionReason?: string }): Promise<FocusTimer>
  // --- S4 · Availability (SS-9) — hard-delete (no deleted_at) --------------
  setAvailability(input: AvailabilityInput): Promise<Availability>
  updateAvailability(id: string, patch: AvailabilityPatch): Promise<Availability>
  removeAvailability(id: string): Promise<void>
  listAvailability(): Promise<Availability[]>
  addAvailabilityException(input: AvailabilityExceptionInput): Promise<AvailabilityException>
  removeAvailabilityException(id: string): Promise<void>
  listAvailabilityExceptions(): Promise<AvailabilityException[]>
  // --- S6 · session_templates CRUD (focus presets, PD-3) — hard-delete -----
  createTemplate(input: TemplateInput): Promise<SessionTemplate>
  updateTemplate(id: string, patch: TemplatePatch): Promise<SessionTemplate>
  deleteTemplate(id: string): Promise<void>
  listTemplates(): Promise<SessionTemplate[]>
  setDefaultTemplate(id: string): Promise<void>
  // --- S5 · Plan-batch endpoints (study_plan_batches) — state machine, no G5 algorithm ---
  generatePlan(input: GeneratePlanInput): Promise<PlanBatch>
  approvePlan(id: string): Promise<PlanBatch>
  activatePlan(id: string): Promise<PlanBatch>
  recalcPlan(id: string): Promise<PlanBatch>
  // --- S7 · dueIn aggregator (shared platform primitive) + derived analytics ---
  dueIn(range: TimeRange): Promise<DueItem[]>
  registerDueProvider(provider: DueProvider): void
  getSessionAnalytics(range: TimeRange): Promise<SessionAnalytics>
}

// The single source of the sub_type → extension routing (B1). Only these two
// sub-types have a 1:1 extension today; every other sub_type is spine-only.
type ExtKind = 'focus' | 'study'
function extKindFor(subType: string): ExtKind | null {
  if (subType === 'focus') return 'focus'
  if (subType === 'study') return 'study'
  return null
}

export function createSessionsService(deps: SessionsServiceDeps): SessionsService {
  const { db, deviceId, registry, rail, entityRegistry } = deps
  // The #32 transition engine's deps — completion/lifecycle route through it (IR-1), never a second path.
  const transitionDeps = { db, registry, rail, deviceId }

  const sessionCfg = { deviceId, encryptedFields: [] as string[], softDelete: true }
  const extCfg = { deviceId, encryptedFields: [] as string[], softDelete: false }
  const sessionRepo = createRepository(db, sessions, sessionCfg)
  const focusRepo = createRepository(db, focusSessions, extCfg)
  const studyRepo = createRepository(db, studySessions, extCfg)
  const attachmentRepo = createRepository(db, sessionAttachments, extCfg)
  const availabilityRepo = createRepository(db, studyAvailability, extCfg) // no deleted_at → hard delete
  const exceptionRepo = createRepository(db, availabilityExceptions, extCfg)
  const batchRepo = createRepository(db, studyPlanBatches, extCfg) // no deleted_at → hard delete
  const plannedBlocksRepo = createRepository(db, plannedBlocks, sessionCfg) // HAS deleted_at → softDelete
  const dueProviders: DueProvider[] = [] // S7 empty provider seam (N5); owning modules register lanes

  // Read the mapped extension row for a session (findWhere is soft-delete-blind,
  // but the extensions carry no deleted_at anyway). Returns null when spine-only.
  async function readExtension(
    subType: string,
    sessionId: string,
  ): Promise<FocusSessionRow | StudySessionRow | null> {
    const kind = extKindFor(subType)
    if (kind === 'focus') {
      const rows = await focusRepo.findWhere(eq(focusSessions.session_id, sessionId))
      return rows[0] ?? null
    }
    if (kind === 'study') {
      const rows = await studyRepo.findWhere(eq(studySessions.session_id, sessionId))
      return rows[0] ?? null
    }
    return null
  }

  // --- S3 focus-runtime substrate: config resolution + shared timer helpers ---
  const userPrefsRepo = createRepository(db, userPreferences, { deviceId, encryptedFields: [] })
  const templateRepo = createRepository(db, sessionTemplates, extCfg)
  const PD3_DEFAULTS: FocusConfig = { workMin: 25, shortBreakMin: 5, longBreakMin: 15, sessionsBeforeLong: 4 }

  // PD-3: "config is Preferences-owned; the runtime only obeys it." The runtime resolves the cadence from
  // `user_preferences` → PD-3 hard defaults (services/preferences unbuilt → read the table directly, IR-3).
  // Named templates are focus PRESETS the ② UI applies (fe-sessions) — the M1.1 backend persists no
  // timer↔template binding (no `template_id` on focus_sessions), so the runtime does NOT resolve from a
  // template. `startFocus.templateId` is a ②-seam the backend does not consume in M1.1.
  async function resolveFocusConfig(): Promise<FocusConfig> {
    const prefs = (await userPrefsRepo.findAll())[0]
    if (prefs)
      return {
        workMin: prefs.pomodoro_work_minutes,
        shortBreakMin: prefs.pomodoro_break_minutes,
        longBreakMin: prefs.pomodoro_long_break_minutes,
        sessionsBeforeLong: prefs.pomodoro_sessions_before_long,
      }
    return PD3_DEFAULTS
  }

  async function loadFocusRow(sessionId: string): Promise<FocusSessionRow | null> {
    const rows = await focusRepo.findWhere(eq(focusSessions.session_id, sessionId))
    return rows[0] ?? null
  }

  // Resume a PAUSED timer only (§2 — resume a non-paused is illegal); real focus excludes the
  // paused span (PD-5). startFocus handles the running=no-op case itself before calling this.
  async function resumeTimer(row: FocusSessionRow): Promise<FocusTimer> {
    if (row.status !== 'paused') throw new InvalidFocusTransition(row.id, row.status, 'resume')
    const now = Date.now()
    const addPause = row.paused_at != null ? Math.floor((now - row.paused_at) / 1000) : 0
    return focusRepo.update(row.id, {
      status: 'running',
      total_pause_seconds: row.total_pause_seconds + addPause,
      paused_at: null,
    })
  }

  // S6 single-winner (PD-3): clear is_default on every template except `exceptId`. Sequential
  // best-effort (no cross-row tx — eventual consistency, same stance as the soft-delete cascade).
  async function unsetOtherDefaults(exceptId: string): Promise<void> {
    const all = await templateRepo.findAll()
    for (const t of all) {
      if (t.id !== exceptId && t.is_default) await templateRepo.update(t.id, { is_default: false })
    }
  }

  // S5 batch-state guard (business-rules:88) — fail-loud before any write.
  function assertBatchStatus(row: StudyPlanBatchRow, expected: string, event: string): void {
    if (row.status !== expected) throw new InvalidBatchTransition(row.id, row.status, event)
  }

  const service: SessionsService = {
    // --- createSession (validate → tx{ spine [+ extension] }) ----------------
    async createSession(input) {
      const parsed = CreateSessionSchema.safeParse(input)
      if (!parsed.success) {
        throw new InvalidSessionInput(parsed.error.issues[0]?.path.join('.') || 'input')
      }
      // S2 — sub_type must be a registered type (SS-3); an unregistered one throws
      // SessionTypeNotFound (fail-loud, BEFORE the tx → no write). Shipped types resolve
      // in-memory; user types cost one findWhere. Roster = AR-5-shipped + register() seam.
      await registry.get(input.sub_type)
      const kind = extKindFor(input.sub_type)
      const ext = input.extension
      if (ext) {
        // extension only valid on a mapped sub_type, and its discriminant must match.
        if (kind == null || ext.kind !== kind) throw new InvalidSessionInput('extension')
      }

      const spineData = {
        sub_type: input.sub_type,
        purpose: input.purpose ?? null,
        scheduling_mode: input.scheduling_mode,
        planned_block_id: input.planned_block_id ?? null,
        started_at: input.started_at ?? null,
        ended_at: input.ended_at ?? null,
        status: input.status,
        focus_rating: input.focus_rating ?? null,
        energy_level: input.energy_level ?? null,
        distraction_count: input.distraction_count ?? null,
        key_learnings: input.key_learnings ?? null,
      }

      return db.transaction(async (tx) => {
        const session = await sessionRepo.createInTx(tx, spineData)
        let extension: FocusSessionRow | StudySessionRow | null = null
        if (ext?.kind === 'focus') {
          extension = await focusRepo.createInTx(tx, {
            session_id: session.id,
            type: ext.type,
            status: ext.status ?? 'running',
            duration_seconds: ext.duration_seconds ?? null,
            completed_count: ext.completed_count ?? 0,
            paused_at: ext.paused_at ?? null,
            total_pause_seconds: ext.total_pause_seconds ?? 0,
            was_interrupted: ext.was_interrupted ?? false,
            interruption_reason: ext.interruption_reason ?? null,
          })
        } else if (ext?.kind === 'study') {
          extension = await studyRepo.createInTx(tx, {
            session_id: session.id,
            resource_type: ext.resource_type,
            resource_id: ext.resource_id,
            pages_read: ext.pages_read ?? null,
            lessons_completed: ext.lessons_completed ?? null,
          })
        }
        return { session, extension }
      })
    },

    // --- getSession (spine + mapped extension) -------------------------------
    async getSession(id) {
      const session = await sessionRepo.findById(id) // null if not found / soft-deleted
      if (!session) return null
      const extension = await readExtension(session.sub_type, id)
      return { session, extension }
    },

    // --- updateSession (spine and/or extension; sub_type immutable, B3) ------
    async updateSession(id, patch) {
      const current = await sessionRepo.findById(id)
      if (!current) throw new InvalidSessionInput('id')
      if (patch.started_at != null && patch.ended_at != null && patch.ended_at < patch.started_at) {
        throw new InvalidSessionInput('ended_at')
      }

      const spinePatch = {
        ...(patch.purpose !== undefined && { purpose: patch.purpose }),
        ...(patch.scheduling_mode !== undefined && { scheduling_mode: patch.scheduling_mode }),
        ...(patch.status !== undefined && { status: patch.status }),
        ...(patch.planned_block_id !== undefined && { planned_block_id: patch.planned_block_id }),
        ...(patch.started_at !== undefined && { started_at: patch.started_at }),
        ...(patch.ended_at !== undefined && { ended_at: patch.ended_at }),
        ...(patch.focus_rating !== undefined && { focus_rating: patch.focus_rating }),
        ...(patch.energy_level !== undefined && { energy_level: patch.energy_level }),
        ...(patch.distraction_count !== undefined && { distraction_count: patch.distraction_count }),
        ...(patch.key_learnings !== undefined && { key_learnings: patch.key_learnings }),
      }
      let session: SessionRow = current
      if (Object.keys(spinePatch).length > 0) session = await sessionRepo.update(id, spinePatch)

      if (patch.extension !== undefined) {
        const existing = await readExtension(current.sub_type, id)
        if (existing) {
          const kind = extKindFor(current.sub_type)
          const repo = kind === 'focus' ? focusRepo : studyRepo
          await repo.update(existing.id, patch.extension)
        }
      }
      const extension = await readExtension(current.sub_type, id)
      return { session, extension }
    },

    // --- soft-delete / restore — SPINE ONLY (B2') ----------------------------
    async softDeleteSession(id) {
      await sessionRepo.delete(id) // soft (has deleted_at) → enqueue operation:'update'
    },

    async restoreSession(id) {
      await sessionRepo.update(id, { deleted_at: null }) // by PK — findById would be null for soft-deleted (N1)
      const session = await sessionRepo.findById(id)
      if (!session) throw new InvalidSessionInput('id')
      const extension = await readExtension(session.sub_type, id)
      return { session, extension }
    },

    // --- attach (idempotent, hard-create; entity_type validation is S2) ------
    async attach(sessionId, entityType, entityId, level) {
      // S2 — entity_type must be a registered polymorphic target (BR-6); mirrors spaces assertRegistered.
      if (!entityRegistry.isRegistered(entityType)) throw new UnknownEntityType(entityType)
      if (level !== 'type' && level !== 'instance') throw new InvalidSessionInput('level')
      const existing = await attachmentRepo.findWhere(
        eq(sessionAttachments.session_id, sessionId),
      )
      const match = existing.find(
        (r) => r.entity_type === entityType && r.entity_id === entityId && r.level === level,
      )
      if (match) return match // idempotent no-op (no deleted_at → no revive path, IR-7)
      return attachmentRepo.create({
        session_id: sessionId,
        entity_type: entityType,
        entity_id: entityId,
        level,
      })
    },

    async detach(attachmentId) {
      await attachmentRepo.hardDelete(attachmentId) // no deleted_at → always hard (IR-7)
    },

    resolveTargets(sessionId) {
      return resolveTargets(db, sessionId)
    },

    // --- completion / lifecycle — delegate to the #32 engine (IR-1, no second path) --
    completeSession(id) {
      return transition(transitionDeps, id, 'complete')
    },

    transitionSession(id, event) {
      return transition(transitionDeps, id, event)
    },

    // --- S3 · Pomodoro focus runtime (timer id = focus_sessions.id) ----------
    async startFocus(input) {
      if (input.sessionId) {
        // Resume path (B1) — the session must be a focus session with a timer row.
        const spine = await sessionRepo.findById(input.sessionId)
        if (!spine || spine.sub_type !== 'focus') throw new SessionMissing(input.sessionId)
        const row = await loadFocusRow(input.sessionId)
        if (!row) throw new SessionMissing(input.sessionId)
        if (row.status === 'running') return row // idempotent no-op
        if (row.status === 'paused') return resumeTimer(row)
        throw new InvalidFocusTransition(row.id, row.status, 'start') // completed/cancelled → terminal
      }
      // Fresh path — a focus timer IS a new focus Session (PD-1). S2 sub_type gate passes (focus shipped).
      const created = await service.createSession({
        sub_type: 'focus',
        scheduling_mode: 'ad_hoc',
        status: 'in_progress',
        started_at: Date.now(),
        extension: { kind: 'focus', type: 'focus', status: 'running' },
      })
      if (input.attach) {
        await service.attach(
          created.session.id,
          input.attach.entityType,
          input.attach.entityId,
          input.attach.level,
        )
      }
      const row = await loadFocusRow(created.session.id)
      if (!row) throw new SessionMissing(created.session.id)
      return row
    },

    async pauseFocus(id) {
      const row = await focusRepo.findById(id)
      if (!row) throw new SessionMissing(id)
      if (row.status !== 'running') throw new InvalidFocusTransition(id, row.status, 'pause')
      return focusRepo.update(id, { status: 'paused', paused_at: Date.now() })
    },

    async resumeFocus(id) {
      const row = await focusRepo.findById(id)
      if (!row) throw new SessionMissing(id)
      return resumeTimer(row)
    },

    async nextInterval(id) {
      const row = await focusRepo.findById(id)
      if (!row) throw new SessionMissing(id)
      if (row.status === 'completed' || row.status === 'cancelled') {
        throw new InvalidFocusTransition(id, row.status, 'next')
      }
      const cfg = await resolveFocusConfig()
      let nextType: PomodoroType
      let completed = row.completed_count
      if (row.type === 'focus') {
        completed = row.completed_count + 1
        nextType = completed % cfg.sessionsBeforeLong === 0 ? 'long_break' : 'short_break'
      } else {
        nextType = 'focus'
      }
      return focusRepo.update(id, { type: nextType, completed_count: completed, status: 'running' })
    },

    async completeFocus(id) {
      const row = await focusRepo.findById(id)
      if (!row) throw new SessionMissing(id)
      if (row.status === 'completed' || row.status === 'cancelled') {
        throw new InvalidFocusTransition(id, row.status, 'complete')
      }
      const spine = await sessionRepo.findById(row.session_id)
      const now = Date.now()
      // Fold an open pause, then real focus = run wall-time − total pauses (PD-5; per-interval cut is S7).
      const openPause =
        row.status === 'paused' && row.paused_at != null
          ? Math.floor((now - row.paused_at) / 1000)
          : 0
      const totalPause = row.total_pause_seconds + openPause
      const startedAt = spine?.started_at ?? row.created_at
      const duration = Math.max(0, Math.floor((now - startedAt) / 1000) - totalPause)
      const completedCount = row.type === 'focus' ? row.completed_count + 1 : row.completed_count // B2
      return focusRepo.update(id, {
        status: 'completed',
        duration_seconds: duration,
        total_pause_seconds: totalPause,
        paused_at: null,
        completed_count: completedCount,
      })
    },

    async cancelFocus(id, opts) {
      const row = await focusRepo.findById(id)
      if (!row) throw new SessionMissing(id)
      if (row.status === 'completed' || row.status === 'cancelled') {
        throw new InvalidFocusTransition(id, row.status, 'cancel')
      }
      return focusRepo.update(id, {
        status: 'cancelled',
        was_interrupted: true,
        interruption_reason: opts?.interruptionReason ?? null,
      })
    },

    // --- S4 · Availability (SS-9) — CRUD; hard-delete; no uniqueness/overlap check (G5 input) --
    async setAvailability(input) {
      const p = AvailabilitySchema.safeParse(input)
      if (!p.success) throw new InvalidSessionInput(p.error.issues[0]?.path.join('.') || 'input')
      return availabilityRepo.create({
        day_of_week: input.day_of_week,
        start_time: input.start_time,
        end_time: input.end_time,
        is_available: input.is_available ?? true,
        preference_score: input.preference_score ?? null,
        preset_block: input.preset_block ?? null,
        max_session_minutes: input.max_session_minutes ?? null,
      })
    },

    async updateAvailability(id, patch) {
      const p = AvailabilityPatchSchema.safeParse(patch)
      if (!p.success) throw new InvalidSessionInput(p.error.issues[0]?.path.join('.') || 'input')
      if (patch.start_time != null && patch.end_time != null && !(patch.end_time > patch.start_time)) {
        throw new InvalidSessionInput('end_time')
      }
      const data = {
        ...(patch.day_of_week !== undefined && { day_of_week: patch.day_of_week }),
        ...(patch.start_time !== undefined && { start_time: patch.start_time }),
        ...(patch.end_time !== undefined && { end_time: patch.end_time }),
        ...(patch.is_available !== undefined && { is_available: patch.is_available }),
        ...(patch.preference_score !== undefined && { preference_score: patch.preference_score }),
        ...(patch.preset_block !== undefined && { preset_block: patch.preset_block }),
        ...(patch.max_session_minutes !== undefined && { max_session_minutes: patch.max_session_minutes }),
      }
      return availabilityRepo.update(id, data)
    },

    async removeAvailability(id) {
      await availabilityRepo.hardDelete(id) // no deleted_at → hard; enqueues operation:'delete'
    },

    listAvailability() {
      return availabilityRepo.findAll()
    },

    async addAvailabilityException(input) {
      const p = AvailabilityExceptionSchema.safeParse(input)
      if (!p.success) throw new InvalidSessionInput(p.error.issues[0]?.path.join('.') || 'input')
      return exceptionRepo.create({
        exception_date: input.exception_date,
        is_available: input.is_available,
        reason: input.reason ?? null,
        start_time: input.start_time ?? null,
        end_time: input.end_time ?? null,
      })
    },

    async removeAvailabilityException(id) {
      await exceptionRepo.hardDelete(id)
    },

    listAvailabilityExceptions() {
      return exceptionRepo.findAll()
    },

    // --- S6 · session_templates CRUD (focus presets, PD-3) -------------------
    async createTemplate(input) {
      const p = TemplateSchema.safeParse(input)
      if (!p.success) throw new InvalidSessionInput(p.error.issues[0]?.path.join('.') || 'input')
      // Set every field explicitly (defaults mirror the migration-014 DDL) so the returned row equals the
      // DB row — `Repository.create` returns the constructed row, not a re-read, so omitted DDL-defaulted
      // columns would come back `undefined` (mirrors the spaces-service pattern).
      const row = await templateRepo.create({
        name: input.name,
        work_minutes: input.work_minutes ?? 25,
        short_break_minutes: input.short_break_minutes ?? 5,
        long_break_minutes: input.long_break_minutes ?? 15,
        intervals_before_long_break: input.intervals_before_long_break ?? 4,
        auto_start_breaks: input.auto_start_breaks ?? true,
        auto_start_work: input.auto_start_work ?? false,
        is_default: input.is_default ?? false,
        focus_technique: input.focus_technique ?? null,
        description: input.description ?? null,
        notifications: input.notifications ?? true,
        sounds: input.sounds ?? true,
        usage_count: input.usage_count ?? 0,
        last_used_at: input.last_used_at ?? null,
      })
      if (input.is_default) await unsetOtherDefaults(row.id) // single-winner (PD-3)
      return row
    },

    async updateTemplate(id, patch) {
      const p = TemplatePatchSchema.safeParse(patch)
      if (!p.success) throw new InvalidSessionInput(p.error.issues[0]?.path.join('.') || 'input')
      const data = {
        ...(patch.name !== undefined && { name: patch.name }),
        ...(patch.work_minutes !== undefined && { work_minutes: patch.work_minutes }),
        ...(patch.short_break_minutes !== undefined && { short_break_minutes: patch.short_break_minutes }),
        ...(patch.long_break_minutes !== undefined && { long_break_minutes: patch.long_break_minutes }),
        ...(patch.intervals_before_long_break !== undefined && {
          intervals_before_long_break: patch.intervals_before_long_break,
        }),
        ...(patch.auto_start_breaks !== undefined && { auto_start_breaks: patch.auto_start_breaks }),
        ...(patch.auto_start_work !== undefined && { auto_start_work: patch.auto_start_work }),
        ...(patch.is_default !== undefined && { is_default: patch.is_default }),
        ...(patch.focus_technique !== undefined && { focus_technique: patch.focus_technique }),
        ...(patch.description !== undefined && { description: patch.description }),
        ...(patch.notifications !== undefined && { notifications: patch.notifications }),
        ...(patch.sounds !== undefined && { sounds: patch.sounds }),
        ...(patch.usage_count !== undefined && { usage_count: patch.usage_count }),
        ...(patch.last_used_at !== undefined && { last_used_at: patch.last_used_at }),
      }
      const row = await templateRepo.update(id, data)
      if (patch.is_default === true) await unsetOtherDefaults(id) // single-winner (PD-3)
      return row
    },

    async deleteTemplate(id) {
      await templateRepo.hardDelete(id) // no deleted_at → hard; enqueues operation:'delete'
    },

    listTemplates() {
      return templateRepo.findAll()
    },

    async setDefaultTemplate(id) {
      await unsetOtherDefaults(id)
      await templateRepo.update(id, { is_default: true })
    },

    // --- S5 · Plan-batch endpoints — state machine only (G5 algorithm deferred M1.2) ---
    async generatePlan(input) {
      // Shell: create a batch ready for approval (pending_approval). Placement (planned_blocks,
      // total_sessions) is the deferred algorithm — M1.2 (intake:169-170). All fields set explicitly
      // so the returned row == the DB row (Repository.create returns the constructed row, S6 lesson).
      return batchRepo.create({
        name: input.name ?? null,
        scope_type: input.scope_type ?? null,
        scope_id: input.scope_id ?? null,
        status: 'pending_approval',
        total_sessions: 0,
        generated_at: Date.now(),
        approved_at: null,
      })
    },

    async approvePlan(id) {
      const row = await batchRepo.findById(id)
      if (!row) throw new InvalidBatchTransition(id, 'missing', 'approve')
      assertBatchStatus(row, 'pending_approval', 'approve')
      return batchRepo.update(id, { status: 'approved', approved_at: Date.now() })
    },

    async activatePlan(id) {
      const row = await batchRepo.findById(id)
      if (!row) throw new InvalidBatchTransition(id, 'missing', 'activate')
      assertBatchStatus(row, 'approved', 'activate')
      // SS-8 block→session bridge deferred with the algorithm — status flip only in M1.1.
      return batchRepo.update(id, { status: 'active' })
    },

    async recalcPlan(id) {
      const row = await batchRepo.findById(id)
      if (!row) throw new InvalidBatchTransition(id, 'missing', 'recalc')
      assertBatchStatus(row, 'active', 'recalc')
      // Shell: mark a recompute occurred; the real re-placement is the deferred algorithm (M1.2).
      return batchRepo.update(id, { generated_at: Date.now() })
    },

    // --- S7 · dueIn aggregator (SS-7) + derived analytics (SS-12/IR-6) -------
    async dueIn(range) {
      const items: DueItem[] = []
      // Own planned_blocks in range (findWhere is soft-delete-blind → filter deleted_at explicitly).
      const blocks = await plannedBlocksRepo.findWhere(
        and(
          gte(plannedBlocks.scheduled_start, range.start),
          lte(plannedBlocks.scheduled_start, range.end),
        )!,
      )
      for (const b of blocks) {
        if (b.deleted_at != null) continue
        items.push({
          source_module: 'sessions',
          ref_id: b.id,
          label: b.sub_type ?? 'session',
          est_minutes: b.scheduled_end != null ? Math.round((b.scheduled_end - b.scheduled_start) / 60000) : 0,
          urgency: 0, // no urgency column — the deferred algorithm (M1.2) computes it
          hard_deadline: b.scheduled_end ?? undefined,
        })
      }
      // Live provider lanes (empty in M1.1). SS-7 degrade: a throwing lane is skipped, never fatal.
      for (const p of dueProviders) {
        try {
          items.push(...(await p.fetch(range)))
        } catch {
          // degrade this lane only; surfacing the failed lane to the ② agenda is deferred (§2)
        }
      }
      return items
    },

    registerDueProvider(provider) {
      dueProviders.push(provider)
    },

    async getSessionAnalytics(range) {
      // Session log in range, soft-deleted excluded (findWhere is soft-delete-blind).
      const inRange = await sessionRepo.findWhere(
        and(
          gte(sessions.started_at, range.start),
          lte(sessions.started_at, range.end),
          isNull(sessions.deleted_at),
        )!,
      )
      const total = inRange.length
      const completed = inRange.filter((s) => s.status === 'completed').length
      const completionRate = total > 0 ? completed / total : 0
      const rated = inRange.filter((s) => s.focus_rating != null)
      const avgFocusRating =
        rated.length > 0 ? rated.reduce((sum, s) => sum + (s.focus_rating ?? 0), 0) / rated.length : null
      // Focus time = Σ focus_sessions.duration_seconds for the in-range focus sessions (derived, not stored).
      let totalFocusSeconds = 0
      for (const s of inRange) {
        if (s.sub_type !== 'focus') continue
        const rows = await focusRepo.findWhere(eq(focusSessions.session_id, s.id))
        totalFocusSeconds += rows[0]?.duration_seconds ?? 0
      }
      return { total, completed, completionRate, avgFocusRating, totalFocusSeconds }
    },
  }

  return service
}
