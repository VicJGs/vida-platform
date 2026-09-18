// ============================================================================
// services/sessions — S1 input/return types (MOD-sessions ① · LIF-139)
//
// The service tier over the AR-5 `foundation/sessions` spine + the DB-4 schema.
// S1 = structural CRUD + attach; semantic registry validation + completion
// wiring are S2. Spec: docs/features/sessions-and-scheduling/service/S1-*.md
// ============================================================================

import type {
  SchedulingMode,
  SessionStatus,
  PomodoroType,
  PomodoroStatus,
  StudySessionResourceType,
} from '@vida/types'
import type { SessionRow, SessionAttachmentRow } from '../../db/schema/foundation/sessions'
import type { FocusSessionRow, StudySessionRow } from '../../db/schema/foundation/session-extensions'

/** The `focus` sub-type 1:1 extension input (PD-4/PD-5/PD-6 fields; spine fields NEVER here — BR-S1). */
export interface FocusExtensionInput {
  kind: 'focus'
  type: PomodoroType
  status?: PomodoroStatus
  duration_seconds?: number | null
  completed_count?: number
  paused_at?: number | null
  total_pause_seconds?: number
  was_interrupted?: boolean
  interruption_reason?: string | null
}

/** The `study` sub-type 1:1 extension input. */
export interface StudyExtensionInput {
  kind: 'study'
  resource_type: StudySessionResourceType
  resource_id: string
  pages_read?: number | null
  lessons_completed?: number | null
}

/** Discriminated by `kind`; valid only when it matches a mapped `sub_type` (focus|study). */
export type SessionExtensionInput = FocusExtensionInput | StudyExtensionInput

/** Create a session: spine fields + an optional 1:1 extension (focus|study only). */
export interface CreateSessionInput {
  sub_type: string // OPEN vocab (BR-6); semantic registry check is S2
  purpose?: string | null
  scheduling_mode: SchedulingMode
  status: SessionStatus // required — the spine has no default (caller supplies the start state)
  planned_block_id?: string | null
  started_at?: number | null
  ended_at?: number | null
  focus_rating?: number | null
  energy_level?: number | null
  distraction_count?: number | null
  key_learnings?: string | null // [E] — pass-through seam (M1.0 encryptedFields:[])
  extension?: SessionExtensionInput
}

/** Patch spine and/or (mapped) extension fields. `sub_type` is immutable (B3 — would mismatch the extension). */
export interface SessionPatch {
  purpose?: string | null
  scheduling_mode?: SchedulingMode
  status?: SessionStatus
  planned_block_id?: string | null
  started_at?: number | null
  ended_at?: number | null
  focus_rating?: number | null
  energy_level?: number | null
  distraction_count?: number | null
  key_learnings?: string | null
  extension?:
    | Partial<Omit<FocusExtensionInput, 'kind'>>
    | Partial<Omit<StudyExtensionInput, 'kind'>>
}

/** The composed read shape — spine + its extension row (never flat-merged: both carry baseColumns). */
export interface Session {
  session: SessionRow
  extension: FocusSessionRow | StudySessionRow | null
}

export interface AttachInput {
  sessionId: string
  entityType: string
  entityId: string
  level: 'type' | 'instance'
}

/** S1's own typed validation error — fail-loud, no partial write (IR-5). `field` is the offending path. */
export class InvalidSessionInput extends Error {
  constructor(public readonly field: string) {
    super(`Invalid session input: ${field}`)
    this.name = 'InvalidSessionInput'
  }
}

export type { SessionAttachmentRow }
