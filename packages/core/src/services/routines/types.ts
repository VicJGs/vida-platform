// ============================================================================
// services/routines — types (mod-routines #64 ①)
//
// Deps + the RoutinesService interface + input types. Factory-object shape, hoisted
// closures, no `this.` (the finance/checkins/habits precedent). Slices follow the GOVERNING
// docs/features/routines/delivery/slice-map.md (re-scoped 2026-10-21): S1 routine/step CRUD and
// S2 ledger + skips are built; S2c floor conformance; S3–S9 append (run/drive · evaluate ·
// progress/analytics · reschedule · effects · tags/notes · providers). Each dep lands in the
// slice that first consumes it (habits precedent).
// ============================================================================

import type { z } from 'zod'
import type { Routine, RoutineStep, RoutineCompletion, RoutineLifecycle } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type { TaggableTypeRegistry } from '../../foundation/spaces/types'
import type { TasksService } from '../tasks'
import type { HabitsService } from '../habits'
import type { SessionsService, TimeRange, DueItem } from '../sessions'
import type { SectionData, DataPoint } from '../journals'
import type { SpacesService } from '../../foundation/spaces'
import type { NotesService } from '../notes'
import type { EntityTagRow, EntityLinkRow } from '../../db/schema/foundation/spaces'
import type { PageRow } from '../../db/schema/notes' // not re-exported by the notes barrel (the tasks precedent)
import type { SessionRegistry } from '../../foundation/sessions/registry'
import type { EffectRail, EffectRegistry } from '../../foundation/effects'
import type {
  CreateRoutineSchema,
  UpdateRoutineSchema,
  AddStepSchema,
  UpdateStepSchema,
  CompleteStepSchema,
  RunStepSchema,
  RescheduleStepSchema,
  EvaluateRoutineSchema,
  SkipStepSchema,
  EditRoutineCompletionSchema,
} from '../../validators/routine'

export interface RoutinesServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** `asOf` clock (YYYY-MM-DD); default = today. Injected for deterministic tests (S3/S5 derive-on-read). */
  clock?: () => string
  /** S2c — the shared entity-type registry: validates a step's `entity_type` (R2; sessions precedent). Required (seam).
   *  Registration is not needed here: 'routine'/'routine_step' are pre-seeded from ENTITY_TYPES (_registry.ts:45-46). */
  registry: TaggableTypeRegistry
  /** S3 — REQUIRED (D1). S5c: a standard task occurrence = a Tasks `work` session (startTimer/stopTimer); an obligation drives `completeTask`. */
  tasks: TasksService
  /** S3 — REQUIRED (seam): session steps (focus timer + any registered sub-type) + the routine_step instance attachment. */
  sessions: SessionsService
  /** S5c — REQUIRED (read-only): resolve a step's session sub-type + its declared lifecycle. Routines registers NO sub-type
   *  (ADR-004 §3.1/§3.3: owners author their types; first-wins registry). */
  sessionRegistry: SessionRegistry
  /** S3 — optional (seam): habit steps drive the native tick. Absent ⇒ a habit step is `EntityUnavailableError`. */
  habits?: HabitsService
  /** S4 — the USER's policy (intake Q2/Q3; a Spaces personalization surface, defaults via templates/presets SP5). Optional:
   *  absent ⇒ every evaluation is policy_source 'undefined' (PolicyUndefined, flagged). Routines hardcodes no policy values. */
  prefs?: RoutinesPrefsPort
  /** S7 (seam `effects?`, N8) — the routine-level `award_xp` + `contribute_purpose_metric` (D3) go through the rail, guarded by
   *  `registry.resolve`. Absent ⇒ dormant. Inline shape: the `EffectsPort` name is owned by checkins/habits (barrel collision). */
  effects?: { rail: EffectRail; registry: EffectRegistry }
  /** S8 — REQUIRED (seam `:26`): tag + link WRITES delegate to Spaces (`tagEntity`/`untagEntity`/`createLink`/`removeLink`, ADR-006 SP1/SP4). */
  spaces: SpacesService
  /** S8 — REQUIRED (seam `:27`): the routine/step note is a `pages` row via `ensureEntityNote('note', …)` (rule 19); tag junction reads. */
  notes: NotesService
}

/** S9 — the Journal recap data points routines advertises (cross-module-integration §2 :69 completed/skipped; JR-4 selection).
 *  One home, shared by `summary` and `journal.ts` (kept out of the explicit barrel). */
export const ROUTINES_DATA_POINTS: readonly DataPoint[] = [
  { id: 'completed_today', label: 'Completed' },
  { id: 'skipped_today', label: 'Skipped' },
]

/** S9 — one routine's day in the Journal recap (§2 :69 + RT-5 "what was done vs not", surfaced positively). `status` /
 *  `policy_source` / `not_done` are absent when that routine's evaluation failed (per-routine isolation, RT-13). */
export interface RoutineDaySummaryItem {
  routine_id: string
  name: string
  status?: RoutineEvaluation['status']
  policy_source?: RoutineEvaluation['policy_source']
  not_done?: RoutineStepRef[]
  steps: {
    step_id: string
    title: string
    skipped: boolean
    skip_reason: string | null
    duration_minutes: number | null
  }[]
}

/** S8 — a page-link target (D2: notes/tags/links target `routine_step` + `routine`). */
export interface RoutineLinkTarget {
  type: 'routine' | 'routine_step'
  id: string
}

// --- S4 — the user's policy (port contract; storage is Spaces/Preferences-owned) ---
export type CompletionRule =
  | { kind: 'all_or_nothing' }
  | { kind: 'required_node' }
  | { kind: 'threshold'; percent: number }
export interface RoutinePolicy {
  completion: CompletionRule
  /** The miss policy (Q3 "how misses count"), both parts optional. [INTERP — minimal encoding.]
   *  `logged_skip`: how a LOGGED skip counts (RT-8; S4). `acceptance_window_days`: how many days a miss stays make-good-able before it is a
   *  real (final) miss (Q3 "one week · N days · …"; S5). */
  miss?: { logged_skip?: 'neutral' | 'not_done'; acceptance_window_days?: number }
}
export interface RoutinesPrefsPort {
  /** The user's policy for this routine, or null when none is configured (→ policy_source 'undefined'). */
  policyFor(routineId: string): Promise<RoutinePolicy | null>
}
export interface RoutineStepRef {
  step_id: string
  title: string
}
export interface RoutineEvaluation {
  routine_id: string
  date: string
  status: 'done' | 'partial' | 'not_started'
  /** round(100 × done / applicable) — display only; the threshold judges the exact ratio. */
  percent: number
  applicable: number
  /** RT-5 — always returned, never discarded. */
  done: RoutineStepRef[]
  not_done: RoutineStepRef[]
  neutral: RoutineStepRef[]
  policy_source: 'user' | 'undefined'
  policy_note?: 'no_required_steps' | 'required_steps_all_neutral'
}

// --- S5 — progress + analytics (derive-on-read; PLAN-S5) ---
export interface RoutineDateRange {
  from: string // YYYY-MM-DD inclusive
  to: string // YYYY-MM-DD inclusive
}
/** How one scheduled occurrence is judged: done · a real miss (beyond the window) · still make-good-able · neutral · not judgeable. */
export type OccurrenceStatus = 'done' | 'missed' | 'pending' | 'neutral' | 'unjudged'
/** The policy-derived streak (ROU-16): the READ seam Gamification pulls (D3). */
export interface RoutineStreak {
  current: number
  longest: number
  total: number
  policy_source: 'user' | 'undefined'
  unscheduled?: true
}
export interface RoutineCompletionRate {
  scheduled: number
  done: number
  missed: number
  pending: number
  neutral: number
  unjudged: number
  /** done / (done + missed); null when nothing was judged (not a silent 0). */
  rate: number | null
}
export interface RoutineStepRank {
  step_id: string
  title: string
  done: number
  applicable: number
  rate: number | null
}
export interface RoutineAnalytics {
  range: RoutineDateRange
  completion: RoutineCompletionRate
  ranking: RoutineStepRank[]
  comparison: { previous: RoutineDateRange; completion: RoutineCompletionRate; rate_delta: number | null }
  policy_source: 'user' | 'undefined'
  unscheduled?: true
}

// --- Zod-inferred input shapes (validators/routine.ts) ----------------------
export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>
export type UpdateRoutineInput = z.infer<typeof UpdateRoutineSchema>
export type AddStepInput = z.infer<typeof AddStepSchema>
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>
export type CompleteStepInput = z.infer<typeof CompleteStepSchema>
export type RunStepInput = z.infer<typeof RunStepSchema>
export type RescheduleStepInput = z.infer<typeof RescheduleStepSchema>
export type EvaluateRoutineInput = z.infer<typeof EvaluateRoutineSchema>
export type SkipStepInput = z.infer<typeof SkipStepSchema>
export type EditRoutineCompletionInput = z.infer<typeof EditRoutineCompletionSchema>

/** listRoutines filter (S1) — narrow the All-Routines read by lifecycle. */
export interface RoutineFilter {
  lifecycle?: RoutineLifecycle
}

/** RT-3 — a step is added to a routine that must exist (fail-loud; no orphan step — no FK guards this). */
export class RoutineNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Routine not found: ${id}`)
    this.name = 'RoutineNotFoundError'
  }
}

/** RT-3 — a completion/skip targets a step that must exist (fail-loud; no orphan completion — no FK guards this). */
export class StepNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Routine step not found: ${id}`)
    this.name = 'StepNotFoundError'
  }
}

/** S2c (B3) — a `recurrence_rule` the canonical parser rejects, or one with no FREQ (ical.js parses such strings silently
 *  with `freq = null`, and its iterator then throws). Scope = parse + FREQ only: semantic validity (e.g. an unsatisfiable
 *  BYMONTHDAY, UNTIL+COUNT together) is not checked here. */
export class InvalidRecurrenceRuleError extends Error {
  constructor(public readonly rule: string) {
    super(`Invalid recurrence rule (RFC-5545 RRULE with FREQ required): ${JSON.stringify(rule)}`)
    this.name = 'InvalidRecurrenceRuleError'
  }
}

/** S5c — what a step drives (Q1/RT-4/D3): a task (check-off steps ARE tasks), a habit, the focus timer, or any registered
 *  session sub-type. There is no entity-less step. */
export type StepTarget = 'task' | 'habit' | 'focus' | 'session'
/** 'advanced' = a habit ticked but still below its target_count (a repeat run stays 'advanced': habits' re-log is a patch). */
export type StepRunStatus = 'done' | 'advanced' | 'in_progress' | 'scheduled' // 'scheduled' — S6 rescheduleStep (an SS-8 intent block)

/** S3 — the live state of a driven step (seam `StepRunState`). `completion` is the stamped ledger row when status is 'done'. */
export interface StepRunState {
  step_id: string
  date: string
  target: StepTarget
  status: StepRunStatus
  completion: RoutineCompletion | null
  session_id?: string
  focus_id?: string
  /** S6 — the SS-8 intent block of a rescheduled occurrence (rescheduleStep), or the one a make-good fulfilled/linked. */
  planned_block_id?: string
  /** TAS-23 complete-but-flag passthrough: the task IS completed, its next occurrence failed to spawn. */
  flag?: 'recurrence_regen_failed' | 'effect_emit_failed' // S7: a routine-level effect handler threw (G8 — flagged, never dropped)
}

/** Kept for callers that still narrow: since S5c every step is driven, so `completeStep` always returns a StepRunState. */
export function isStepRunState(x: RoutineCompletion | StepRunState): x is StepRunState {
  return 'target' in x && 'status' in x
}

/** S3 (ROU-30a, RT-3 fail-loud) — a step's driven target is missing/deleted, its optional dep is absent, or the target is not
 *  drivable in M1 (R5). Thrown before any routine write; the step is never silently marked done. */
export class EntityUnavailableError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly reason: string,
  ) {
    super(`Step ${stepId} cannot be driven: ${reason}`)
    this.name = 'EntityUnavailableError'
  }
}

/** S6 (RT-6, contract.md:55, business-rules.md:120) — a make-good/skip/reschedule write for a day beyond the user's acceptance
 *  window (`addDays(date, window) < today`): rejected, no state change. */
export class OutsideAcceptanceWindowError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly date: string,
    public readonly windowDays: number,
  ) {
    super(`Step ${stepId}: ${date} is beyond the ${windowDays}-day acceptance window`)
    this.name = 'OutsideAcceptanceWindowError'
  }
}

/** S6 (R1) — `rescheduleStep` for a date that is not a make-good-admissible occurrence of the step. */
export class NotMissedOccurrenceError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly date: string,
    public readonly reason: 'future' | 'not_an_occurrence' | 'not_in_step_set' | 'planned_skip' | 'done' | 'inactive',
  ) {
    super(`Step ${stepId}: ${date} is not a reschedulable occurrence (${reason})`)
    this.name = 'NotMissedOccurrenceError'
  }
}

/** S6 (R2) — the caller-given slot is before now, before D's day, or past the last make-good day. */
export class InvalidRescheduleSlotError extends Error {
  constructor(
    public readonly stepId: string,
    public readonly reason: 'before_now' | 'before_occurrence' | 'past_window',
  ) {
    super(`Step ${stepId}: invalid reschedule slot (${reason})`)
    this.name = 'InvalidRescheduleSlotError'
  }
}

/** S7 (G8, business-rules.md:122-123) — the re-drivable purpose contribution for a done routine-day failed (habits' MetricContributionError precedent). */
export class RoutineContributionError extends Error {
  constructor(
    public readonly routineId: string,
    public readonly date: string,
    public readonly reason: string,
  ) {
    super(`Routine ${routineId}: the purpose contribution for ${date} failed: ${reason}`)
    this.name = 'RoutineContributionError'
  }
}

/** S4 — the port returned a policy whose completion kind is none of the three the docs define. Fails loud (the port owner validates). */
export class InvalidRoutinePolicyError extends Error {
  constructor(
    public readonly routineId: string,
    public readonly kind: unknown,
  ) {
    super(`Routine ${routineId} has an unrecognized completion policy kind: ${JSON.stringify(kind)}`)
    this.name = 'InvalidRoutinePolicyError'
  }
}

/** S3 — editing/deleting a (step,date) completion that isn't in the ledger. */
export class CompletionNotFoundError extends Error {
  constructor(stepId: string, date: string) {
    super(`Completion not found: ${stepId} @ ${date}`)
    this.name = 'CompletionNotFoundError'
  }
}

export interface RoutinesService {
  // ── S1: routine definition CRUD ──────────────────────────────────
  /** RT-2 — create a routine (the named ordered sequence). Steps are added in S2 (addStep). */
  createRoutine(input: CreateRoutineInput): Promise<Routine>
  updateRoutine(id: string, patch: UpdateRoutineInput): Promise<Routine>
  /** RT-17 — soft-delete; the completion ledger is preserved (app-cascade of steps is S2/S8). */
  archiveRoutine(id: string): Promise<void>
  getRoutine(id: string): Promise<Routine | null>
  /** Ordered by sort_order, then created_at, then id (S2c A8). */
  listRoutines(filter?: RoutineFilter): Promise<Routine[]>
  /** ROU-17 — set the routine lifecycle. Throws `RoutineNotFoundError` if missing/archived. paused/off generate no misses (RT-6), applied
   *  through the acceptance-window procedure (S5 A3): only today / in-window undone occurrences become neutral; a real miss stays missed. */
  setLifecycle(id: string, lifecycle: RoutineLifecycle): Promise<Routine>

  // ── S2: step CRUD + ordering ─────────────────────────────────────
  /** RT-3 — add a polymorphic step to a routine. Throws `RoutineNotFoundError` if the routine is missing/archived, and
   *  `UnknownEntityType` if `entity_type` is not registered. Appends (step_order = max+1) unless `step_order` is given. */
  addStep(routineId: string, step: AddStepInput): Promise<RoutineStep>
  updateStep(stepId: string, patch: UpdateStepInput): Promise<RoutineStep>
  /** RT-17 — soft-delete a step (its completion ledger is cascaded in S3/S8). */
  removeStep(stepId: string): Promise<void>
  /** RT-2 — set the explicit order of a routine's steps. Pass the FULL ordered set: ids assigned a contiguous
   *  step_order from 0 in list position; ids not owned by the routine are ignored; owned steps omitted from the
   *  list keep their prior step_order (callers reorder the whole set — the fe-routines list passes all of them). */
  reorderSteps(routineId: string, orderedStepIds: string[]): Promise<RoutineStep[]>
  listSteps(routineId: string): Promise<RoutineStep[]>

  // ── S3: completion ledger + skip ─────────────────────────────────
  // NOTE (§XXVIII deviation from the Approval-1 seam-contract): RT-8 defines TWO distinct skip mechanisms with
  // different storage — a LOGGED skip (a completion row, on the day) vs a PRE-PLANNED skip (declared ahead, in
  // step.skip_dates, possibly a future date with no row). The seam-contract's single `skipStep({kind})` conflated
  // them (a planned future skip has no RoutineCompletion to return). Corrected here: `skipStep` = logged;
  // `planSkipDates` = pre-planned. Grounded in docs/features/routines/business-rules.md RT-8.
  /** RT-5 — log a DONE occurrence; UPSERT per (step,date). Throws `StepNotFoundError` if the step is missing. */
  completeStep(stepId: string, input?: CompleteStepInput): Promise<StepRunState>
  /** ROU-07 — drive the step's target (task occurrence start · session start · habit tick · focus start/re-entry) (S5c).
   *  Drive first, stamp second (N7). Throws `EntityUnavailableError` / `StepNotFoundError` before any routine write. */
  runStep(stepId: string, input?: RunStepInput): Promise<StepRunState>
  /** S6 (ROU-10, SS-8) — move a missed occurrence D into a caller-given slot: writes ONE planned block (intent), no session, no
   *  ledger row; the make-good (`completeStep`/`runStep(D)`) creates the occurrence session carrying `planned_block_id` and
   *  fulfils it. Throws `OutsideAcceptanceWindowError` · `NotMissedOccurrenceError` · `InvalidRescheduleSlotError` ·
   *  `EntityUnavailableError` · `StepNotFoundError`, all before any write. */
  rescheduleStep(stepId: string, input: RescheduleStepInput): Promise<StepRunState>
  /** S7 (G8, ROU-22) — re-drive the routine-level `contribute_purpose_metric` for a done, scheduled day (rail-idempotent). Not done /
   *  not an occurrence / no effects or handler ⇒ no-op. `RoutineNotFoundError` · `ZodError` (date) · `RoutineContributionError`; an evaluation
   *  failure propagates like a read (`InvalidRoutinePolicyError` · `InvalidRecurrenceRuleError`). */
  contributeToPurposeMetrics(routineId: string, date: string): Promise<void>

  // ── S8: tags · notes · links (D2, ROU-23/26; writes via Spaces/Notes, T1) ── // ⟲ amended (A27)
  /** Tag a live routine with a LIVE tag (`TagNotFound`); idempotent (Spaces revives a soft-deleted junction row). */
  tagRoutine(routineId: string, tagId: string): Promise<EntityTagRow>
  /** Untag a live routine (a deleted tag is still cleanable); no-op when absent. */
  untagRoutine(routineId: string, tagId: string): Promise<void>
  /** The routine's live junction rows whose tag is LIVE (deleteTag doesn't cascade); never throws — unknown id ⇒ []. */
  getRoutineTags(routineId: string): Promise<EntityTagRow[]>
  tagStep(stepId: string, tagId: string): Promise<EntityTagRow>
  untagStep(stepId: string, tagId: string): Promise<void>
  getStepTags(stepId: string): Promise<EntityTagRow[]>
  /** The routine's note page (find-or-create, `type:'note'`, rule 19). The seed name is creation-only (content H1). */
  getRoutineNote(routineId: string): Promise<PageRow>
  getStepNote(stepId: string): Promise<PageRow>
  /** Link a page to a live routine/step (idempotent). `pageId` is not validated (no FK). */
  linkPage(pageId: string, target: RoutineLinkTarget, context?: string | null): Promise<EntityLinkRow>
  /** Remove a page link (no-op when absent). */
  unlinkPage(pageId: string, target: RoutineLinkTarget): Promise<void>

  // ── S9: providers (RT-13; seam S9) — the routines due lane + the Journal recap ──
  /** Scheduled routine occurrences (routine-days) still due in the window, by the due predicate (PLAN-S9). Pure; per-routine isolated. */
  dueIn(range: TimeRange): Promise<DueItem[]>
  /** The SS-7 lane impl = `dueIn`, after the owner's live drop of closed reschedule blocks (sessions BR :72-74). */
  getDueReminders(range: TimeRange): Promise<DueItem[]>
  /** The Journal `/summary` section for a date (PULL at render): each routine's ledger rows + its evaluation. Never throws for an idle day. */
  summary(date: string): Promise<SectionData>

  // ── S4: policy evaluation (read-only, derive-on-read) ────────────
  /** ROU-12 — judge a routine's occurrence date under the USER's policy (prefs port). Always returns what was done (RT-5);
   *  without a policy, only the policy-independent judgments are made and the result is flagged 'undefined'. */
  evaluateRoutine(routineId: string, input?: EvaluateRoutineInput): Promise<RoutineEvaluation>

  // ── S5: progress + analytics (read-only, derive-on-read) ──────────
  /** ROU-16 — the policy-derived streak over the routine's occurrences (DTSTART..today). */
  getStreak(routineId: string): Promise<RoutineStreak>
  /** ROU-15 — completion rate · step ranking · comparison with the preceding equal range. */
  getAnalytics(routineId: string, range: RoutineDateRange): Promise<RoutineAnalytics>
  /** ROU-13 — resolveProgress(stored override /100, all-time completion rate); null when nothing is judgeable. */
  progress(routineId: string): Promise<number | null>
  /** RT-8 — log a SKIP on the day (completion row, skipped=true + reason); UPSERT per (step,date). */
  skipStep(stepId: string, input?: SkipStepInput): Promise<RoutineCompletion>
  /** RT-8 — declare PRE-PLANNED skip dates (merged into step.skip_dates, deduped+sorted); not a completion row. */
  planSkipDates(stepId: string, dates: string[]): Promise<RoutineStep>
  /** RT-5 — edit an existing (step,date) completion. Throws `CompletionNotFoundError` if absent. */
  editCompletion(stepId: string, date: string, patch: EditRoutineCompletionInput): Promise<RoutineCompletion>
  /** RT-14 — delete a completion (HARD — the ledger has no deleted_at). */
  deleteCompletion(stepId: string, date: string): Promise<void>
  /** The (step,date)-ordered ledger for a step — the derive-on-read source for S5 analytics. */
  listCompletions(stepId: string): Promise<RoutineCompletion[]>
}
