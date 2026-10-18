// ============================================================================
// useFlowSession — the live data seam for the Session runtime page (fe-session-runtime #23, S1).
//
// Same stub discipline as useNoteEntity/useAttachments/useCollection: M1 has no apps/web
// `@vida/core` service composition root, and a live query throws on the worker-RPC Drizzle
// `values` seam (S1-D2 / F3) — so the data leg is DEFERRED. M1 DEFAULT = empty; `?sample`
// (DEV) seeds a single-stage FlowSource for the Visual Gate. Writes go through a no-op-safe
// `SessionsPort` (the shell never writes — BR-2; the real engine binds at the live swap).
//
// Live swap (zero signature change — the @vida/core sessions service is LIVE, only the
// apps/web edge is deferred):
//   const { data, isPending, isError } = useQuery({
//     queryKey: ['session', sessionId],
//     queryFn: () => sessions.getSession(sessionId),   // + resolveTargets + applied_effects
//   })
//   const source = data ? toFlowSource({ session: data, deliverable, attachments, effects }) : null
//   const state  = deriveTerminalState({ isPending, isError, data })   // ./state-conventions/terminal-state
//   const port   = { transition: sessions.transitionSession, attach: sessions.attach }  // the real service
// ============================================================================
import type { SessionsPort, FlowSource } from './adapter'
import type { TerminalState } from '../state-conventions/terminal-state'
import { toFlowSource } from './flow-source'

export interface UseFlowSession {
  /** The assembled flow source (null until the live/seeded data resolves). */
  source: FlowSource | null
  /** The sessions-service port the page binds via `bindFlowIntents` (no-op-safe in M1). */
  port: SessionsPort
  /** The terminal state the page threads to the shell (M1 default 'empty'; 'success' with `?sample'). */
  state: TerminalState
}

/** M1 no-op-safe port — logged in DEV; mutates nothing until the live swap (BR-2: the page never writes directly). */
const noopPort: SessionsPort = {
  transition: (sessionId, event) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[flow] no-op transition(${sessionId}, '${event}') — live swap pending`)
    }
  },
  attach: (sessionId, entityType, entityId) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[flow] no-op attach(${sessionId}, '${entityType}', '${entityId}') — live swap pending`)
    }
  },
}

/** DEV/gate sample gate (NOT live data) — the use-attachments idiom verbatim. */
function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

// --- DEV/gate sample: a single-stage 'work' session mid-run, so the page exercises EC-1/EC-2/EC-4/EC-9. ---
const SAMPLE_SESSION = { id: 'sample-session', sub_type: 'work', status: 'in_progress' } as const
const SAMPLE_DELIVERABLE = { title: 'Draft the outline', description: "A one-page skeleton for 'Write the book'." }
const SAMPLE_ATTACHMENTS = [{ id: 'att-1', filename: 'outline.md' }] as const
const SAMPLE_EFFECTS = [
  { id: 'eff-1', effectType: 'log_time', detail: "25 min to 'Write the book'" },
  { id: 'eff-2', effectType: 'award_xp', detail: '+10 XP' },
] as const

/**
 * The runtime page's data hook. M1: empty by default; `?sample` (DEV) seeds a single-stage FlowSource. The
 * `_sessionId` is unused in the stub — the live swap un-prefixes it for `getSession(sessionId)` + the
 * `['session', sessionId]` query key (call site unchanged — the sibling-hook convention).
 */
export function useFlowSession(_sessionId: string): UseFlowSession {
  if (devSampleActive()) {
    return {
      source: toFlowSource({
        session: SAMPLE_SESSION,
        deliverable: SAMPLE_DELIVERABLE,
        attachments: [...SAMPLE_ATTACHMENTS],
        effects: [...SAMPLE_EFFECTS],
      }),
      port: noopPort,
      state: 'success',
    }
  }
  return { source: null, port: noopPort, state: 'empty' }
}
