// ============================================================================
// SessionsService — S1: Session CRUD + attach (MOD-sessions ① · LIF-139)
//
// The first real services/* build. Factory-object (no `this.`, IR-8), mirroring
// foundation/spaces/service.ts. Every mutation → the db-6 Repository → co-
// transactional sync_queue enqueue. M1.0 pass-through: encryptedFields: [] on
// every repo (key_learnings [E] stays dormant until M3/DB-5).
//
// Table lifecycle (B2'): `sessions` carries deleted_at (softDelete: true);
// `focus_sessions`/`study_sessions`/`session_attachments` use ...baseColumns
// with NO deleted_at (the base session owns lifecycle) → softDelete: false,
// removed only on a hard delete. Soft-deleting a session touches the SPINE only;
// the extension goes unreachable via getSession.
//
// S1 is STRUCTURAL only: no sub_type/entity_type registry validation and no
// completion/lifecycle wiring — those are S2. Spec: service/S1-*.md
// ============================================================================

import { eq } from 'drizzle-orm'
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
import { sessionTemplates } from '../../db/schema/foundation/scheduling'
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
import { CreateSessionSchema } from '../../validators/session'
import {
  type CreateSessionInput,
  type SessionPatch,
  type Session,
  type StartFocusInput,
  type FocusTimer,
  type FocusConfig,
  InvalidSessionInput,
  InvalidFocusTransition,
  SessionMissing,
} from './types'

export { InvalidTransition }

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

  // IR-3 precedence: template → user_preferences → PD-3 hard defaults (services/preferences unbuilt → read the table).
  async function resolveFocusConfig(templateId?: string): Promise<FocusConfig> {
    if (templateId) {
      const t = await templateRepo.findById(templateId)
      if (t)
        return {
          workMin: t.work_minutes,
          shortBreakMin: t.short_break_minutes,
          longBreakMin: t.long_break_minutes,
          sessionsBeforeLong: t.intervals_before_long_break,
        }
    }
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
  }

  return service
}
