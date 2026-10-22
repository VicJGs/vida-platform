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
import type { SessionsService } from '../sessions'
import type {
  CreateRoutineSchema,
  UpdateRoutineSchema,
  AddStepSchema,
  UpdateStepSchema,
  CompleteStepSchema,
  RunStepSchema,
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
  /** S3 — REQUIRED (D1): task steps drive `completeTask` (the routine never writes a parallel task completion). */
  tasks: TasksService
  /** S3 — REQUIRED (seam): focus steps drive `startFocus`/`completeFocus` + the routine_step instance attachment. */
  sessions: SessionsService
  /** S3 — optional (seam): habit steps drive the native tick. Absent ⇒ a habit step is `EntityUnavailableError`. */
  habits?: HabitsService
  /** S4 — the USER's policy (intake Q2/Q3; a Spaces personalization surface, defaults via templates/presets SP5). Optional:
   *  absent ⇒ every evaluation is policy_source 'undefined' (PolicyUndefined, flagged). Routines hardcodes no policy values. */
  prefs?: RoutinesPrefsPort
}

// --- S4 — the user's policy (port contract; storage is Spaces/Preferences-owned) ---
export type CompletionRule =
  | { kind: 'all_or_nothing' }
  | { kind: 'required_node' }
  | { kind: 'threshold'; percent: number }
export interface RoutinePolicy {
  completion: CompletionRule
  /** The miss policy (Q3 "how misses count"): how a LOGGED skip counts (RT-8). [INTERP — minimal encoding.] */
  miss?: { logged_skip: 'neutral' | 'not_done' }
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

// --- Zod-inferred input shapes (validators/routine.ts) ----------------------
export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>
export type UpdateRoutineInput = z.infer<typeof UpdateRoutineSchema>
export type AddStepInput = z.infer<typeof AddStepSchema>
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>
export type CompleteStepInput = z.infer<typeof CompleteStepSchema>
export type RunStepInput = z.infer<typeof RunStepSchema>
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

/** S3 — what a step drives (resolved by precedence, PLAN-S3): focus · task · habit · actionable (no entity). */
export type StepTarget = 'actionable' | 'task' | 'habit' | 'focus'
/** 'advanced' = a habit ticked but still below its target_count (a repeat run stays 'advanced': habits' re-log is a patch). */
export type StepRunStatus = 'done' | 'advanced' | 'in_progress'

/** S3 — the live state of a driven step (seam `StepRunState`). `completion` is the stamped ledger row when status is 'done'. */
export interface StepRunState {
  step_id: string
  date: string
  target: StepTarget
  status: StepRunStatus
  completion: RoutineCompletion | null
  session_id?: string
  focus_id?: string
  /** TAS-23 complete-but-flag passthrough: the task IS completed, its next occurrence failed to spawn. */
  flag?: 'recurrence_regen_failed'
}

/** Narrow `completeStep`'s union: a driven step returns a StepRunState, an actionable step its RoutineCompletion. */
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

/** S4 — the port returned a policy whose completion kind is none of the three the docs define. Fails loud (the port owner validates). */
export class InvalidRoutinePolicyError extends Error {
  constructor(public readonly routineId: string, public readonly kind: unknown) {
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
  /** ROU-17 — set the routine lifecycle. Throws `RoutineNotFoundError` if missing/archived. Miss suppression for
   *  paused/off lands with the S5 miss derivation (vacuous until then). */
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
  completeStep(stepId: string, input?: CompleteStepInput): Promise<RoutineCompletion | StepRunState>
  /** ROU-07 — drive the step's target (task completion · habit tick · focus start/re-entry); actionable = completeStep.
   *  Drive first, stamp second (N7). Throws `EntityUnavailableError` / `StepNotFoundError` before any routine write. */
  runStep(stepId: string, input?: RunStepInput): Promise<StepRunState>

  // ── S4: policy evaluation (read-only, derive-on-read) ────────────
  /** ROU-12 — judge a routine's occurrence date under the USER's policy (prefs port). Always returns what was done (RT-5);
   *  without a policy, only the policy-independent judgments are made and the result is flagged 'undefined'. */
  evaluateRoutine(routineId: string, input?: EvaluateRoutineInput): Promise<RoutineEvaluation>
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
