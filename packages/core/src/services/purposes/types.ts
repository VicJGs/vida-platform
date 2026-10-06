// services/purposes — types (mod-purposes-and-goals #55 · LIF-136 ①)
//
// The measurability capstone: Values → Purposes → Targets spine + metrics/dreams/contributions/reviews,
// composing the built foundation/measurement engine (ADR-011; Purpose = rollup APEX + consumer, NOT owner).
// Deps GROW per slice (notifications/projects precedent): S1 = { db, deviceId }; later slices widen
// (S5 measurementSources?, S7 sessions, S8 spaces/notes/registry, S9 journal, effects?).
// Return types are Drizzle Row types at M1 ([[drizzle-row-not-assignable-to-vida-types-interface]]); the
// @vida/types interface reconcile is DB-11 (mirror-only, S1).

import type { DrizzleDb } from '../../db/adapter'
import type { MetricValueSource } from '@vida/types'
import type { MeasurementSourceRegistry } from '../../foundation/measurement'
import type { SessionRegistry } from '../../foundation/sessions'
import type { SessionsService } from '../sessions'
import type {
  CreateValueInput,
  UpdateValueInput,
  CreatePurposeInput,
  UpdatePurposeInput,
  CreateTargetInput,
  UpdateTargetInput,
  CreateDreamInput,
  UpdateDreamInput,
  CreateMetricInput,
  UpdateMetricInput,
  RecordMetricValueInput,
  LinkContributionInput,
  BindInput,
  OpenTargetReviewInput,
  OpenPurposeReviewInput,
  AddPlanStepInput,
} from '../../validators/purpose'
import type { ValueRow, ContributionRow, PurposeReviewRow, PlanStepRow } from '../../db/schema/foundation/purpose'
import type { PurposeRow, TargetRow, DreamRow, PurposeMetricRow, PurposeMetricValueRow, TargetReviewRow } from '../../db/schema/purposes'

/** A plan step's polymorphic owner — a task or a target (PG-11). */
export interface PlanStepOwnerRef {
  type: 'task' | 'target'
  id: string
}

/** A polymorphic endpoint of a contribution edge — a goal (purpose|target) or a contributor (habit|…|check_in). */
export interface ContributionRef {
  type: string
  id: string
}

/** The current value of a metric: the override slot if set, else derived from the ledger via calculation_method. */
export interface MetricCurrent {
  value: number | null
  /** Provenance: 'manual' iff every contributing ledger point (or the override) is manual; else 'auto'. */
  source: MetricValueSource
  /** true when `value` came from the stored override slot, false when derived from the ledger. */
  override: boolean
}

export interface PurposesServiceDeps {
  db: DrizzleDb
  deviceId: string
  /** Deny-safe (S5) — the ADR-011 §3.6 measurement-source READ seam. ABSENT/empty at M1 ⇒ every cross-module
   *  contributor + derived-pull resolves `null` (unmeasured, excluded from rollup). Real sources = M2. */
  measurementSources?: MeasurementSourceRegistry
  /** REQUIRED (S7) — the ADR-004 session seam (PG-13 FACT: reviews fire as `review` SESSIONS). `registry.register`
   *  persists the `review` sub-type (SS-5 owning-module registration); `service.createSession` writes the session
   *  row. mod-sessions is built+Done → the FACT is wired at M1, not hedged (g1 #1/#2). */
  sessions: { registry: SessionRegistry; service: SessionsService }
}

/** A derived progress reading in 0–100 (the engine computes in [0,1]; converted at this edge). */
export interface PurposeProgressView {
  /** 0–100, or null when unmeasured (a qualitative with no rating, or no measured child — never coerced to 0). */
  value: number | null
  /** true when derived (rollup/normalize); false when read straight from an override slot. */
  derived: boolean
  /** true when some child of a rollup was unmeasured (excluded) — the value reflects only the measured subset. */
  partial: boolean
  /** true when `value` is null because nothing was measurable. */
  unmeasured: boolean
}

export interface PurposesService {
  // ---- S1: spine CRUD (values · purposes · targets) -------------------------
  createValue(input: CreateValueInput): Promise<ValueRow>
  updateValue(id: string, patch: UpdateValueInput): Promise<ValueRow>
  archiveValue(id: string): Promise<void>
  getValue(id: string): Promise<ValueRow | null>
  listValues(): Promise<ValueRow[]>

  createPurpose(input: CreatePurposeInput): Promise<PurposeRow>
  updatePurpose(id: string, patch: UpdatePurposeInput): Promise<PurposeRow>
  archivePurpose(id: string): Promise<void>
  getPurpose(id: string): Promise<PurposeRow | null>
  listPurposes(): Promise<PurposeRow[]>

  createTarget(input: CreateTargetInput): Promise<TargetRow>
  updateTarget(id: string, patch: UpdateTargetInput): Promise<TargetRow>
  archiveTarget(id: string): Promise<void>
  getTarget(id: string): Promise<TargetRow | null>
  /** Active targets; optionally scoped to one purpose (nullable purpose_id ⇒ standalone targets, PG-9). */
  listTargets(purposeId?: string): Promise<TargetRow[]>

  // ---- S2: dreams (single aspiration; absorbs bucket_list, PG-16) -----------
  createDream(input: CreateDreamInput): Promise<DreamRow>
  updateDream(id: string, patch: UpdateDreamInput): Promise<DreamRow>
  archiveDream(id: string): Promise<void>
  getDream(id: string): Promise<DreamRow | null>
  /** Active dreams; optionally scoped to one purpose. */
  listDreams(purposeId?: string): Promise<DreamRow[]>

  // ---- S3: metrics + value ledger (PG-15) ----------------------------------
  createMetric(input: CreateMetricInput): Promise<PurposeMetricRow>
  updateMetric(id: string, patch: UpdateMetricInput): Promise<PurposeMetricRow>
  getMetric(id: string): Promise<PurposeMetricRow | null>
  listMetrics(purposeId?: string): Promise<PurposeMetricRow[]>
  /** Hard delete (no deleted_at) + two-hop hard-cascade of this metric's value ledger. */
  deleteMetric(id: string): Promise<void>
  /** Append a time-series point to a metric's ledger (hard insert). */
  recordMetricValue(metricId: string, value: number, opts?: RecordMetricValueInput): Promise<PurposeMetricValueRow>
  /** The metric's current value: override slot if set, else derived via calculation_method over the ledger. */
  getMetricCurrent(metricId: string): Promise<MetricCurrent>

  // ---- S4: contributions edge (weighted polymorphic goal-edge, PG-10) -------
  /** Link a contributor into a goal with a weight. Throws InvalidContributor if either end is out of vocabulary. */
  linkContribution(goal: ContributionRef, contributor: ContributionRef, opts: LinkContributionInput): Promise<ContributionRow>
  unlinkContribution(id: string): Promise<void>
  reweightContribution(id: string, weight: number): Promise<ContributionRow>
  /** Active contributions whose goal is the given (type,id). */
  listContributions(goal: ContributionRef): Promise<ContributionRow[]>

  // ---- S5: measurability core (derive-on-read; compose foundation/measurement) ----
  /** The LEAF progress of a pursuable (target via normalize; dream via its override slot). 0–100 or null. */
  progress(entity: { type: 'target' | 'dream'; id: string }): Promise<PurposeProgressView>
  /** The ROLLUP progress of a goal: override slot if set, else weighted rollup of spine-targets + contributions. */
  computeProgress(goal: { type: 'purpose' | 'target'; id: string }): Promise<PurposeProgressView>

  // ---- S6: bindings + DAG guard + derived-pull (ADR-011 §3.5/§3.6/§3.7) ----
  /** Declare a target's `binding_mode` (manual | derived-pull | event-trigger). A non-manual mode records its
   *  source `ref` in `measurement_method` (`${type}:${id}`) and is rejected with `CyclicBinding` if it would make
   *  the binding graph cyclic (PG-8, both edge-types + the contributions feed-graph). `manual` clears the binding.
   *  A `derived-pull` target then reads its value from the measurement-source seam (null at M1, empty registry). */
  bind(target: { type: 'target'; id: string }, input: BindInput): Promise<TargetRow>

  // ---- S7: reviews + plan_steps (PG-11/12/13) -------------------------------
  /** Record a target review (ledger). Registers the `review` session sub-type (idempotent), writes the ledger,
   *  computes the next `next_review_date` from the target's `review_frequency`, and fires the review as a
   *  scheduled `review` SESSION (PG-13; the Scheduler firing is M2). */
  openTargetReview(targetId: string, input: OpenTargetReviewInput): Promise<TargetReviewRow>
  /** Record a purpose review (the alignment/fulfillment loop, PG-12) + fire a scheduled `review` SESSION. */
  openPurposeReview(purposeId: string, input: OpenPurposeReviewInput): Promise<PurposeReviewRow>
  listTargetReviews(targetId: string): Promise<TargetReviewRow[]>
  listPurposeReviews(purposeId: string): Promise<PurposeReviewRow[]>
  /** Append a plan step to a task/target (a doc checklist, PG-11 — not a tracked entity). */
  addPlanStep(owner: PlanStepOwnerRef, input: AddPlanStepInput): Promise<PlanStepRow>
  /** Flip a plan step's completion (stamps/clears `completed_at`). */
  togglePlanStep(id: string): Promise<PlanStepRow>
  listPlanSteps(owner: PlanStepOwnerRef): Promise<PlanStepRow[]>
}

// --- typed errors (contract.md:49-57) ---------------------------------------
export class ValueNotFoundError extends Error {
  constructor(id: string) {
    super(`Value not found: ${id}`)
    this.name = 'ValueNotFoundError'
  }
}
export class PurposeNotFoundError extends Error {
  constructor(id: string) {
    super(`Purpose not found: ${id}`)
    this.name = 'PurposeNotFoundError'
  }
}
export class TargetNotFoundError extends Error {
  constructor(id: string) {
    super(`Target not found: ${id}`)
    this.name = 'TargetNotFoundError'
  }
}
export class DreamNotFoundError extends Error {
  constructor(id: string) {
    super(`Dream not found: ${id}`)
    this.name = 'DreamNotFoundError'
  }
}
export class MetricNotFoundError extends Error {
  constructor(id: string) {
    super(`Purpose metric not found: ${id}`)
    this.name = 'MetricNotFoundError'
  }
}
export class ContributionNotFoundError extends Error {
  constructor(id: string) {
    super(`Contribution not found: ${id}`)
    this.name = 'ContributionNotFoundError'
  }
}
/** A contribution references a goal or contributor type outside the ADR-011 vocabulary (PG-10). */
export class InvalidContributor extends Error {
  constructor(side: 'goal' | 'contributor', type: string) {
    super(`Invalid contribution ${side} type: ${type}`)
    this.name = 'InvalidContributor'
  }
}
/** A plan step id miss on toggle/get (PG-11). */
export class PlanStepNotFoundError extends Error {
  constructor(id: string) {
    super(`Plan step not found: ${id}`)
    this.name = 'PlanStepNotFoundError'
  }
}
/** A `bind` that would make the binding graph cyclic — rejected at author time, no save (PG-8, ADR-011 §3.7). */
export class CyclicBinding extends Error {
  constructor(detail: string) {
    super(`Binding would create a cycle: ${detail}`)
    this.name = 'CyclicBinding'
  }
}
/** `measurement_method` doubles as the binding source ref on a non-manual target — it is managed via `bind()`,
 *  never writable directly through create/updateTarget (that would silently corrupt the ref + bypass the DAG
 *  guard). Set `binding_mode` to `manual` (via bind) first to free the column for a human description. */
export class BindingRefManaged extends Error {
  constructor() {
    super('measurement_method is bind-managed while a binding is live — set binding_mode to manual first')
    this.name = 'BindingRefManaged'
  }
}
/** A `derived-pull` source outage — surfaced as last-known + a flag, never fabricated (PG-6). Record-not-throw:
 *  the measurable degrades to null (unmeasured) rather than failing the read. */
export class SourceUnavailable extends Error {
  constructor(key: string) {
    super(`Measurement source unavailable: ${key}`)
    this.name = 'SourceUnavailable'
  }
}
