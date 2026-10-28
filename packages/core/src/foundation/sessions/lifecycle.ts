// ============================================================================
// foundation/sessions — lifecycle transition engine + fire step (XS-effect-rail #32 · XCU-09)
//
// The runtime AR-5 deferred (registry.ts:8): validate a session's declared
// transitions, apply the status, and ON COMPLETION fire the type's declared
// effects — scoped to attachments (S1), through the AR-7 rail. The engine's
// guardrail is the STRUCTURAL canTouch (effect ∈ allowed_effects, enforced at
// registration; target ∈ attachments, by construction). Sensitive-consent is
// HANDLER-side (ADR-004 §3.2.5-A(3) / BR-17) — the engine does not gate.
//
// Ordering: fire-first, commit-status-LAST (the status write is the commit
// point) — a mid-fire crash self-heals on replay (re-run from the unchanged
// from-state; the applied_effects ledger dedupes). [ADR-004 §3.2.5-B.4]
// ============================================================================

import { eq } from 'drizzle-orm'
import type { SessionStatus } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository } from '../../db/repository'
import { sessions, type SessionRow } from '../../db/schema/foundation/sessions'
import type { EffectEvent, EffectRail } from '../effects'
import { resolveTargets } from './attachments'
import type { SessionRegistry } from './registry'
import type { SessionTypeDef } from './types'

/** Illegal lifecycle move — thrown BEFORE any write (contract.md:65 InvalidTransition). */
export class InvalidTransition extends Error {
  constructor(
    public readonly sessionId: string,
    public readonly fromStatus: string,
    public readonly event: string,
  ) {
    super(`Illegal transition for session '${sessionId}': no '${event}' from status '${fromStatus}'`)
    this.name = 'InvalidTransition'
  }
}

export interface TransitionDeps {
  db: DrizzleDb
  registry: SessionRegistry
  rail: EffectRail
  deviceId: string
}

export interface TransitionResult {
  status: SessionStatus
  /** effects that applied ({applied:true}); a replay/duplicate is not counted. */
  fired: number
}

/** Stable UTC calendar date (YYYY-MM-DD) — deterministic across devices/replay (BR-S3-5). */
function utcDate(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * Fire a completed session's declared effects, scoped to its attachments. Each (effect × target)
 * is an independently-idempotent `applyEffect` (no outer tx — the replay-safe fan-out, IR-1). The
 * occurrence discriminator is the stable `started_at` date so two sessions completing the same
 * target on the same day converge (SS-6 no-double-count). Exported for direct replay testing.
 */
export async function fireCompletionEffects(
  deps: TransitionDeps,
  session: SessionRow,
  def: SessionTypeDef,
): Promise<{ fired: number }> {
  const targets = await resolveTargets(deps.db, session.id)
  const occ = utcDate(session.started_at ?? session.created_at)

  let fired = 0
  for (const effectType of def.effects) {
    const events: EffectEvent[] =
      targets.length === 0
        ? // No-attachment fallback: the session itself is the subject (BR-S3-6).
          [{ subjectNaturalKey: session.id, transition: 'completed', effectType, targetRef: session.id }]
        : targets.map((t) => ({
            subjectNaturalKey: t.entityId,
            transition: occ,
            effectType,
            targetRef: t.entityId,
          }))
    for (const event of events) {
      const { applied } = await deps.rail.applyEffect(event)
      if (applied) fired++
    }
  }
  return { fired }
}

/**
 * Apply a lifecycle event to a session: validate the declared transition, fire on completion, then
 * commit the new status LAST. Illegal `(status, event)` → `InvalidTransition` (no write). Not
 * target-state idempotent: re-issuing an already-applied event throws `InvalidTransition` (BR-S3-9).
 */
export async function transition(deps: TransitionDeps, sessionId: string, event: string): Promise<TransitionResult> {
  const rows = await deps.db.select().from(sessions).where(eq(sessions.id, sessionId)).all()
  const session = rows[0]
  if (!session) throw new InvalidTransition(sessionId, 'missing', event)

  const def = await deps.registry.get(session.sub_type) // throws SessionTypeNotFound if unknown
  const match = def.lifecycle.transitions.find((t) => t.from === session.status && t.event === event)
  if (!match) throw new InvalidTransition(sessionId, session.status, event)

  const toStatus = match.to
  let fired = 0
  if (toStatus === 'completed') {
    fired = (await fireCompletionEffects(deps, session, def)).fired
  }

  // Commit LAST — the status write is the transition's commit point (fire-first, BR-S3-8).
  // The engine stamps started_at at in_progress (so the occurrence date exists) + ended_at at completion.
  // encryptedFields: [] — the M1.0 pass-through seam is dormant (ADR-017:20); `key_learnings` [E]
  // is the future boundary, not the M1.0 runtime set (getVaultKey throws while the vault is locked).
  const repo = createRepository(deps.db, sessions, {
    deviceId: deps.deviceId,
    encryptedFields: [],
  })
  const now = Date.now()
  const patch =
    toStatus === 'completed'
      ? { status: toStatus, ended_at: now }
      : toStatus === 'in_progress'
        ? { status: toStatus, started_at: now }
        : { status: toStatus }
  await repo.update(sessionId, patch)

  return { status: toStatus, fired }
}
