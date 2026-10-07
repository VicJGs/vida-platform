// ============================================================================
// Flow/Session ↔ FlowSessionView adapter — fe-codec-flow-session S2 (the apps/web plane).
//
// The documented CONVENTION + the pure pieces a consumer uses to drive @vida/ui's
// `FlowSessionView` from the @vida/core sessions service. This is the apps/web plane
// that binds the shell's EMITTED intents to real writes (transition/attach) — the
// Tamagui-only boundary forbids a @vida/core import in @vida/ui (BR-2; the collection/
// dashboard/entity adapter precedent).
//
// SHIPS (buildable + tested NOW): `toFlowProps` (the typed assembler) + `mapEffectLog`
// (the ADR-004 applied-effects ledger → the effect-rail entries) + `bindFlowIntents`
// (wires the shell's onMarkDone/onAttach/onRequireProof to a sessions-service PORT).
// DOES NOT ship a live data hook — no M1.2.1 flow consumer is BUILT yet (fe-session-
// runtime #23 / fe-session-hud #16 / fe-onboarding #26 / fe-check-ins #31 depend on
// this but ship after #11; grep clean). The concrete `useFlowSession(sessionId)` hook
// (React Query → the session + its attachments + the effect log, binding the real
// @vida/core sessions service to SessionsPort) is built at the FIRST consumer — the
// sibling-adapter precedent. The "stages" structure is a design-intent extension the
// CONSUMER resolves from its backend (deliverable_note / a stages ext) — OUT of this
// unit (O7). See ./CLAUDE.md.
// ============================================================================
import type { ReactNode } from 'react'
import type { FlowSessionViewProps, FlowStage, FlowEffect, AttachKind } from '@vida/ui'

type ViewState = FlowSessionViewProps['effectsState']

/** The module-fed source for one flow/session surface. `stages` are RESOLVED by the consumer (the backend "stages" shape
 *  is a design-intent extension, OUT — O7); intents are bound via `bindFlowIntents` at the consumer. */
export interface FlowSource {
  title: string
  context?: ReactNode
  stages: FlowStage[]
  renderStage?: (stage: FlowStage) => ReactNode
  nowLabel?: ReactNode
  /** explicit progress overrides the shell's stage-derived fraction; pass `progressLabel` too to keep them consistent. */
  progress?: number
  progressLabel?: string
  saveStatus?: ReactNode
  action?: ReactNode
  effects?: FlowEffect[]
  effectsState?: ViewState
  effectRailLabel?: ReactNode
  // the EMITTED intents — bound to the sessions service via bindFlowIntents (below).
  onMarkDone?: (stageId: string) => void
  onRequireProof?: (stageId: string) => void
  onAttach?: (stageId: string, kind: AttachKind) => void
}

/** THE typed assembler: a flow source → `FlowSessionView` props. A near pass-through — the shell owns progress derivation
 *  + degrade — so this stays a thin, explicit mapping (the entity `toEntityProps` shape; the logic lives in the intent
 *  wiring + the effect-log map below). */
export function toFlowProps(src: FlowSource): FlowSessionViewProps {
  return {
    title: src.title,
    context: src.context,
    stages: src.stages,
    renderStage: src.renderStage,
    nowLabel: src.nowLabel,
    progress: src.progress,
    progressLabel: src.progressLabel,
    saveStatus: src.saveStatus,
    action: src.action,
    effects: src.effects,
    effectsState: src.effectsState,
    effectRailLabel: src.effectRailLabel,
    onMarkDone: src.onMarkDone,
    onRequireProof: src.onRequireProof,
    onAttach: src.onAttach,
  }
}

/** The ADR-004 effect catalogue → human, plain-language labels for the effect-rail log (§3.2.2; the voice-honesty bar). */
const EFFECT_LABELS: Record<string, string> = {
  log_time: 'Logged time',
  emit_measurement_signal: 'Measurement',
  award_xp: 'Experience',
  surface_journal: 'Journal',
  surface_calendar: 'Calendar',
  complete_habit_occurrence: 'Habit',
  contribute_purpose_metric: 'Contribution',
  attach_pomodoro: 'Pomodoro',
}

/** One row of the local-only `applied_effects` ledger (ADR-004 F1) — the SOURCE for the effect-rail log. */
export interface AppliedEffectRow {
  id: string
  effectType: string
  detail?: ReactNode
}

/** THE pure mapping: the applied-effects ledger → the shell's read-only effect-rail entries. Unknown effect types fall back
 *  to their raw key (never dropped — the no-guessing bar). */
export function mapEffectLog(rows: readonly AppliedEffectRow[]): FlowEffect[] {
  return rows.map((r) => ({ id: r.id, kind: EFFECT_LABELS[r.effectType] ?? r.effectType, detail: r.detail ?? '' }))
}

/** The subset of the @vida/core sessions service the flow surface needs. The live hook binds the REAL service to this port;
 *  defining the PORT (not importing the concrete service) keeps S2 pure + testable, with the @vida/core edge in the hook. */
export interface SessionsPort {
  transition(sessionId: string, event: string): Promise<void> | void
  attach(sessionId: string, entityType: string, entityId: string, level?: 'type' | 'instance'): Promise<void> | void
}

/** How a consumer resolves a stage's attach target + its proof flow (both consumer-configured — the shell only emits). */
export interface FlowIntentOptions {
  attachTarget?: (stageId: string, kind: AttachKind) => { entityType: string; entityId: string } | undefined
  onProof?: (sessionId: string, stageId: string) => void
}

/** THE intent wiring: bind the shell's EMITTED intents to the sessions service (BR-FS-2 — the shell never writes; here is
 *  where the writes happen). mark-done → `transition(id,'complete')` (fires the declared effects, ADR-004 §3.2.2/3.2.3);
 *  attach → `attach(...)` to the consumer-resolved target; require-proof → the consumer's proof flow. */
export function bindFlowIntents(port: SessionsPort, sessionId: string, opts: FlowIntentOptions = {}) {
  return {
    onMarkDone: (_stageId: string) => port.transition(sessionId, 'complete'),
    onRequireProof: (stageId: string) => opts.onProof?.(sessionId, stageId),
    onAttach: (stageId: string, kind: AttachKind) => {
      const target = opts.attachTarget?.(stageId, kind)
      if (target) port.attach(sessionId, target.entityType, target.entityId, 'instance')
    },
  }
}

/** THE CONVENTION a consumer composes to drive FlowSessionView (the assembler + the effect-log map + the intent wiring).
 *  The live `useFlowSession(sessionId)` hook is built at the first consumer (R3). */
export interface FlowAdapter {
  toFlowProps: typeof toFlowProps
  mapEffectLog: typeof mapEffectLog
  bindFlowIntents: typeof bindFlowIntents
}

export function createFlowAdapter(): FlowAdapter {
  return { toFlowProps, mapEffectLog, bindFlowIntents }
}
