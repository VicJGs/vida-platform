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
import type { SpacesService } from '../../foundation/spaces'
import type { NotesService } from '../notes'
import type { PageRow } from '../../db/schema/notes'
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

/** The purposes-owned entity types that are valid `entity_tags`/`entity_links` targets (PG-18). All are already
 *  seeded in the shared `ENTITY_TYPES` (`_registry.ts:13,50-53`), so `SpacesService` validates them without any
 *  `register()` call from here. Includes `purpose_metric_value` (a ledger row is a tag/link target per PG-18). */
export type PurposeTagLinkType = 'value' | 'purpose' | 'target' | 'dream' | 'purpose_metric_value'

/** The titled first-class purposes entities that can carry a standalone note page (PG-18). A
 *  `purpose_metric_value` ledger row has no title, so it is a tag/link target only — never a note subject. */
export type PurposeNoteType = 'value' | 'purpose' | 'target' | 'dream'

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
  /** REQUIRED (S8) — the entity_tags + entity_links WRITE surface (PG-18). Purposes delegates ALL tag/link writes
   *  here (the read/write split); spaces validates entity_type against the shared registry it holds internally, so
   *  purposes needs NO own `registry` dep (the DB-4 seed already covers value/purpose/target/dream/metric_value). */
  spaces: SpacesService
  /** REQUIRED (S8) — the `pages` surface for standalone entity notes (PG-18). Purposes OWNS a standalone-note
   *  find-or-create for its titled entities (unlike projects, which punts general notes to the FE). */
  notes: NotesService
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

  // ---- S8: tags · links · pages (compose SpacesService WRITE + NotesService) ----
  /** Attach a tag to a purposes-owned entity (idempotent; delegates to SpacesService, which validates the
   *  entity_type against the shared taggable-type registry). Thin scoped wrapper (the read/write split). */
  tagEntity(entityType: PurposeTagLinkType, entityId: string, tagId: string): Promise<void>
  /** Detach a tag (resolve-then-soft-delete; no-op if absent). */
  untagEntity(entityType: PurposeTagLinkType, entityId: string, tagId: string): Promise<void>
  /** Link a page OUT to a purposes-owned entity (`entity_links`; idempotent). `pageId` is the source anchor. */
  linkEntity(pageId: string, target: { type: PurposeTagLinkType; id: string }, context?: string | null): Promise<void>
  /** Remove an `entity_links` edge (resolve-then-soft-delete; no-op if absent). */
  unlinkEntity(pageId: string, target: { type: PurposeTagLinkType; id: string }): Promise<void>
  /** Find-or-create the standalone note page for a titled purposes entity, seeded with the entity's own title
   *  (a client-side read of OWNED data, in-contract per `EntityNoteSeed`). No new PAGE_TYPE (`type:'note'`).
   *  Throws the entity's `*NotFoundError` if the owner is missing. */
  ensureEntityNote(entityType: PurposeNoteType, entityId: string): Promise<PageRow>
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
