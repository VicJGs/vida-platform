// ============================================================================
// services/routines — types (mod-routines #64 ① · S1 routine CRUD + DB-11 reconcile)
//
// Deps + the RoutinesService interface + input types. Factory-object shape, hoisted
// closures, no `this.` (the finance/checkins/habits precedent). S1 declares the routine-
// definition CRUD surface; S2–S8 append (steps · completion ledger · runStep · evaluate ·
// lifecycle/schedule · tags/pages/links · provider+fan-out) per
// docs/features/routines/delivery/slice-map.md. Deny-safe ports are added by the slice
// that first consumes them (habits precedent) — S1 needs none.
// ============================================================================

import type { z } from 'zod'
import type { Routine, RoutineStep, RoutineCompletion, RoutineLifecycle } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import type {
  CreateRoutineSchema,
  UpdateRoutineSchema,
  AddStepSchema,
  UpdateStepSchema,
  CompleteStepSchema,
  SkipStepSchema,
  EditRoutineCompletionSchema,
} from '../../validators/routine'

export interface RoutinesServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** `asOf` clock (YYYY-MM-DD); default = today. Injected for deterministic tests (S3/S5 derive-on-read). */
  clock?: () => string
}

// --- Zod-inferred input shapes (validators/routine.ts) ----------------------
export type CreateRoutineInput = z.infer<typeof CreateRoutineSchema>
export type UpdateRoutineInput = z.infer<typeof UpdateRoutineSchema>
export type AddStepInput = z.infer<typeof AddStepSchema>
export type UpdateStepInput = z.infer<typeof UpdateStepSchema>
export type CompleteStepInput = z.infer<typeof CompleteStepSchema>
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
  listRoutines(filter?: RoutineFilter): Promise<Routine[]>

  // ── S2: step CRUD + ordering ─────────────────────────────────────
  /** RT-3 — add a polymorphic step to a routine. Throws `RoutineNotFoundError` if the routine is missing/archived. */
  addStep(routineId: string, step: AddStepInput): Promise<RoutineStep>
  updateStep(stepId: string, patch: UpdateStepInput): Promise<RoutineStep>
  /** RT-17 — soft-delete a step (its completion ledger is cascaded in S3/S8). */
  removeStep(stepId: string): Promise<void>
  /** RT-2 — set the explicit order of a routine's steps. Pass the FULL ordered set: ids assigned a contiguous
   *  step_order from 0 in list position; ids not owned by the routine are ignored; owned steps omitted from the
   *  list keep their prior step_order (callers reorder the whole set — the fe-routines list passes all of them). */
  reorderSteps(routineId: string, orderedStepIds: string[]): Promise<void>
  listSteps(routineId: string): Promise<RoutineStep[]>

  // ── S3: completion ledger + skip ─────────────────────────────────
  // NOTE (§XXVIII deviation from the Approval-1 seam-contract): RT-8 defines TWO distinct skip mechanisms with
  // different storage — a LOGGED skip (a completion row, on the day) vs a PRE-PLANNED skip (declared ahead, in
  // step.skip_dates, possibly a future date with no row). The seam-contract's single `skipStep({kind})` conflated
  // them (a planned future skip has no RoutineCompletion to return). Corrected here: `skipStep` = logged;
  // `planSkipDates` = pre-planned. Grounded in docs/features/routines/business-rules.md RT-8.
  /** RT-5 — log a DONE occurrence; UPSERT per (step,date). Throws `StepNotFoundError` if the step is missing. */
  completeStep(stepId: string, input?: CompleteStepInput): Promise<RoutineCompletion>
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
