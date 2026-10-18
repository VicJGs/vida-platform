// ============================================================================
// toFlowSource — assemble a FlowSource from raw session data (fe-session-runtime #23, S1).
//
// The pure data leg of the Flow/Session runtime page: a session row (+ its resolved
// deliverable page, attachments, and fired-effect log) → the `FlowSource` the shipped
// `toFlowProps` maps into `FlowSessionView`. No new plumbing — the staged-deliverable
// structure is a design-intent assembly over existing primitives (frontend-quality-bar
// §4.5): a session IS a single stage by default (EC-9); the deliverable is its
// `deliverable_note` page; proof comes from `session_attachments`. Multi-stage is a
// driving module's concern (O7), not #23.
//
// NO @vida/core import — the inputs are mirror-by-value of the @vida/core shapes (the
// reader-adapter precedent); the live `@vida/core` edge lives in the deferred hook.
// ============================================================================
import type { FlowStage, StageStatus } from '@vida/ui'
import { mapEffectLog, type AppliedEffectRow, type FlowSource } from './adapter'

/** Mirror-by-value of the @vida/core `Session` fields this assembler needs (no @vida/core import). */
export interface SessionLike {
  id: string
  sub_type: string
  status: string
  started_at?: number | null
}
/** The current stage's deliverable, resolved from its `deliverable_note` page (O5 READ) by the consumer/hook. */
export interface DeliverableLike {
  title: string
  description?: string
}
/** A `session_attachments` row the proof summary is derived from. */
export interface AttachmentLike {
  id: string
  filename: string
}

/**
 * Total `SESSION_STATUS → StageStatus` map (packages/types SESSION_STATUS: scheduled · planned · in_progress ·
 * completed · skipped · missed · rescheduled). An unknown status degrades to `upcoming` + a dev-warn (BR-5 —
 * never a guessed/crashing stage). `proofLabel` carries an honest terminal label for skipped/missed.
 */
function stageStatusFor(status: string): { status: StageStatus; proofLabel?: string } {
  switch (status) {
    case 'in_progress':
      return { status: 'current' }
    case 'completed':
      return { status: 'done' }
    case 'scheduled':
    case 'planned':
    case 'rescheduled':
      return { status: 'upcoming' }
    case 'skipped':
      return { status: 'done', proofLabel: 'Skipped' }
    case 'missed':
      return { status: 'done', proofLabel: 'Missed' }
    default:
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[flow] unknown session status '${status}' → 'upcoming'`)
      }
      return { status: 'upcoming' }
  }
}

/** "work" → "Work session"; empty → "Session". The session-identity fallback when no deliverable page is resolved. */
function humanizeSubType(subType: string): string {
  const s = subType.replace(/_/g, ' ').trim()
  return s ? `${s.charAt(0).toUpperCase()}${s.slice(1)} session` : 'Session'
}

/**
 * Assemble a single-stage `FlowSource` from a session (+ its deliverable / attachments / effect log). The hero title
 * is the session identity (humanized sub_type); the one stage's title is the deliverable (decomposition.md:70 —
 * "entity title + summary · stage · deliverable + description"). Proof: an explicit skipped/missed label, else an
 * attachment-count summary on a done stage. Degrade-never-crash: missing deliverable/attachments → honest partials.
 */
export function toFlowSource(input: {
  session: SessionLike
  deliverable?: DeliverableLike
  attachments?: readonly AttachmentLike[]
  effects?: readonly AppliedEffectRow[]
}): FlowSource {
  const { session, deliverable, attachments, effects } = input
  const { status, proofLabel } = stageStatusFor(session.status)

  const attachmentProof =
    attachments && attachments.length > 0
      ? `${attachments.length} attachment${attachments.length === 1 ? '' : 's'}`
      : undefined
  const proof = proofLabel ?? (status === 'done' ? attachmentProof : undefined)

  const stage: FlowStage = {
    id: session.id,
    label: 'Stage 1',
    title: deliverable?.title ?? humanizeSubType(session.sub_type),
    status,
    ...(proof ? { proof } : {}),
  }

  return {
    title: humanizeSubType(session.sub_type),
    context: deliverable?.description,
    stages: [stage],
    effects: effects ? mapEffectLog(effects) : undefined,
  }
}
