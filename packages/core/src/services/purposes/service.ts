// services/purposes — service (mod-purposes-and-goals #55 · LIF-136 ①)
//
// createPurposesService over DB-4 019_purposes (6 tables) + DB-3 007_purpose (4 substrate tables),
// composing the built foundation/measurement engine (Purpose = rollup APEX + consumer, ADR-011 §3.8).
// Built PER SLICE (Entity Delivery Flow); S1 = the spine CRUD (values · purposes · targets) + DB-11 reconcile.
//
// Patterns (precedent: services/projects · services/habits):
// - factory → object literal; intra-service calls hoist to closures, NOT `this.` [[factory-service-no-this]].
// - validating methods are async (reject with a typed error, not a sync throw).
// - Repository.create() RETURNS THE INPUT ROW (not DB defaults) → backfill NN-default cols in the create input
//   (status/priority/measurement_kind/is_primary/sort_order); progress/current_value ⇒ null (override slot, PG-4).
// - findWhere skips the soft-delete filter → list active via findAll (applies isNull(deleted_at)) + JS filter.
// - M1.0 encryptedFields:[] (the [E] title/description/vision/why/… pass through; real field encryption = M3).

import { and, eq, isNull, isNotNull } from 'drizzle-orm'
import { CONTRIBUTION_GOAL_TYPE, CONTRIBUTION_CONTRIBUTOR_TYPE } from '@vida/types'
import type { ContributionGoalType, ContributionContributorType, BindingMode, Frequency } from '@vida/types'
import { normalize, rollup, assertAcyclic, MeasurementCycle, type Binding, type EntityRef } from '../../foundation/measurement'
import { type SessionTypeDef, DuplicateSubType } from '../../foundation/sessions'
import { createRepository, type CreateInput } from '../../db/repository'
import { purposes, targets, dreams, purposeMetrics, purposeMetricValues, targetReviews } from '../../db/schema/purposes'
import { values, contributions, purposeReviews, planSteps } from '../../db/schema/foundation/purpose'
import {
  CreateValueSchema,
  UpdateValueSchema,
  CreatePurposeSchema,
  UpdatePurposeSchema,
  CreateTargetSchema,
  UpdateTargetSchema,
  CreateDreamSchema,
  UpdateDreamSchema,
  CreateMetricSchema,
  UpdateMetricSchema,
  RecordMetricValueSchema,
  LinkContributionSchema,
  ReweightContributionSchema,
  BindSchema,
  OpenTargetReviewSchema,
  OpenPurposeReviewSchema,
  AddPlanStepSchema,
} from '../../validators/purpose'
import {
  type PurposesService,
  type PurposesServiceDeps,
  type MetricCurrent,
  type ContributionRef,
  type PurposeProgressView,
  type PlanStepOwnerRef,
  type PurposeTagLinkType,
  type PurposeNoteType,
  type PurposesDayDigest,
  ValueNotFoundError,
  PurposeNotFoundError,
  TargetNotFoundError,
  DreamNotFoundError,
  MetricNotFoundError,
  ContributionNotFoundError,
  InvalidContributor,
  CyclicBinding,
  BindingRefManaged,
  PlanStepNotFoundError,
} from './types'
import type { ValueRow, ContributionRow, PurposeReviewRow, PlanStepRow } from '../../db/schema/foundation/purpose'
import type {
  PurposeRow,
  TargetRow,
  DreamRow,
  PurposeMetricRow,
  PurposeMetricValueRow,
  TargetReviewRow,
} from '../../db/schema/purposes'
import type { PageRow } from '../../db/schema/notes'
import type { EffectType } from '@vida/types'
import type { DueItem, TimeRange } from '../sessions'

export function createPurposesService(deps: PurposesServiceDeps): PurposesService {
  const { db, deviceId, measurementSources, sessions, spaces, notes, effects } = deps

  // S9 — a goal/target is "complete" at status 'completed'; 'cancelled' is terminal-but-not-an-achievement (no
  // signal). Mirrors projects TERMINAL_STATUSES (projects/service.ts:69); STATUS = common.ts:32.
  const TERMINAL_STATUSES = new Set(['completed', 'cancelled'])
  // Emit-only measurement signal (C-E2): NEVER award_xp/grant_currency — gamification's rule turns the signal into
  // XP. keyed class ⇒ rail-idempotent via effect_event_id = derive(key‖transition‖type).
  const COMPLETION_EFFECTS: readonly EffectType[] = ['emit_measurement_signal']
  // Fire the completion fan-out for a goal/target that just transitioned INTO 'completed'. Emit-only, dormant at M1
  // (no rail wired / no handler ⇒ no-op), post-commit + failure-isolated (the completed entity stands). The
  // projects/service.ts:72 pattern.
  async function fanOutCompletion(entityId: string, transition: string): Promise<void> {
    if (!effects) return // M1 default: no rail wired → dormant
    for (const effectType of COMPLETION_EFFECTS) {
      if (!effects.registry.resolve(effectType)) continue // dormant guard: no handler ⇒ skip (would throw NoEffectHandler)
      try {
        // `{applied}` result ignored — emit is fire-and-forget (rail-idempotent via effect_event_id).
        await effects.rail.applyEffect({ subjectNaturalKey: entityId, transition, effectType, targetRef: entityId })
      } catch {
        // post-commit, failure-isolated: a handler throw is non-fatal; the completion stands (PG-14).
      }
    }
  }
  // A status patch that crosses INTO 'completed' (was not completed before) is a completion transition → emit.
  const isCompletionTransition = (prev: string, next: string | undefined): boolean =>
    next === 'completed' && prev !== 'completed'

  // S9 PG-19 — soft-cascade every contribution where (type,id) is EITHER the goal (business-rules.md:105) OR the
  // contributor (business-rules.md:123). Keys on the COMPOSITE (type,id) leg — goal_id/contributor_id are polymorphic
  // bare TEXT, so an id alone could collide across types. findWhere skips the soft-delete filter → add isNull
  // explicitly ([[repository-findwhere-skips-softdelete-filter]]). Cast mirrors S4 listContributions.
  async function cascadeContributionsFor(type: string, id: string): Promise<void> {
    const asGoal = await contributionsRepo.findWhere(
      and(
        eq(contributions.goal_type, type as ContributionGoalType),
        eq(contributions.goal_id, id),
        isNull(contributions.deleted_at),
      )!,
    )
    const asContributor = await contributionsRepo.findWhere(
      and(
        eq(contributions.contributor_type, type as ContributionContributorType),
        eq(contributions.contributor_id, id),
        isNull(contributions.deleted_at),
      )!,
    )
    const seen = new Set<string>()
    for (const c of [...asGoal, ...asContributor]) {
      if (seen.has(c.id)) continue
      seen.add(c.id)
      await contributionsRepo.delete(c.id) // soft (contributions carry deleted_at)
    }
  }

  // All three spine tables carry deleted_at → softDelete:true. M1.0 encryptedFields:[] (M3 enables [E]).
  const valuesRepo = createRepository(db, values, { deviceId, softDelete: true, encryptedFields: [] })
  const purposesRepo = createRepository(db, purposes, { deviceId, softDelete: true, encryptedFields: [] })
  const targetsRepo = createRepository(db, targets, { deviceId, softDelete: true, encryptedFields: [] })
  const dreamsRepo = createRepository(db, dreams, { deviceId, softDelete: true, encryptedFields: [] })
  // Metrics + the value ledger carry NO deleted_at → softDelete:false (delete = hard).
  const metricsRepo = createRepository(db, purposeMetrics, { deviceId, softDelete: false, encryptedFields: [] })
  const metricValuesRepo = createRepository(db, purposeMetricValues, { deviceId, softDelete: false, encryptedFields: [] })
  // contributions carries deleted_at → softDelete:true.
  const contributionsRepo = createRepository(db, contributions, { deviceId, softDelete: true, encryptedFields: [] })
  // S7 ledgers: target_reviews has NO deleted_at (ledger) → softDelete:false; purpose_reviews + plan_steps carry it.
  const targetReviewsRepo = createRepository(db, targetReviews, { deviceId, softDelete: false, encryptedFields: [] })
  const purposeReviewsRepo = createRepository(db, purposeReviews, { deviceId, softDelete: true, encryptedFields: [] })
  const planStepsRepo = createRepository(db, planSteps, { deviceId, softDelete: true, encryptedFields: [] })

  // ---- S1: values CRUD ------------------------------------------------------
  async function createValue(input: Parameters<PurposesService['createValue']>[0]): Promise<ValueRow> {
    const v = CreateValueSchema.parse(input)
    return valuesRepo.create({
      name: v.name,
      description: v.description ?? null,
      sort_order: v.sort_order ?? 0, // NN default backfill (create echoes input)
      deleted_at: null,
    } satisfies CreateInput<typeof values>)
  }

  async function updateValue(id: string, patch: Parameters<PurposesService['updateValue']>[1]): Promise<ValueRow> {
    const v = UpdateValueSchema.parse(patch)
    if (!(await valuesRepo.findById(id))) throw new ValueNotFoundError(id)
    const data = stripUndefined({ name: v.name, description: v.description, sort_order: v.sort_order })
    return Object.keys(data).length === 0 ? (await valuesRepo.findById(id))! : valuesRepo.update(id, data)
  }

  async function archiveValue(id: string): Promise<void> {
    if (!(await valuesRepo.findById(id))) throw new ValueNotFoundError(id)
    // PG-19/PG-9: purposes referencing this value SURVIVE standalone → SET NULL their value_id (no-FK; findWhere
    // skips the soft-delete filter so add isNull explicitly). Update, not delete.
    const childPurposes = await purposesRepo.findWhere(and(eq(purposes.value_id, id), isNull(purposes.deleted_at))!)
    for (const p of childPurposes) await purposesRepo.update(p.id, { value_id: null })
    await valuesRepo.delete(id) // soft (deleted_at)
  }

  async function getValue(id: string): Promise<ValueRow | null> {
    return valuesRepo.findById(id)
  }
  async function listValues(): Promise<ValueRow[]> {
    return valuesRepo.findAll() // excludes soft-deleted
  }

  // ---- S1: purposes CRUD ----------------------------------------------------
  async function createPurpose(input: Parameters<PurposesService['createPurpose']>[0]): Promise<PurposeRow> {
    const v = CreatePurposeSchema.parse(input)
    return purposesRepo.create({
      title: v.title,
      description: v.description ?? null,
      vision: v.vision ?? null,
      why: v.why ?? null,
      value_id: v.value_id ?? null,
      domain: v.domain ?? null,
      status: v.status ?? 'in_progress', // NN default backfill
      progress: v.progress ?? null, // override slot — NULL ⇒ derive (PG-4)
      start_date: v.start_date ?? null,
      target_date: v.target_date ?? null,
      is_primary: v.is_primary ?? false,
      sort_order: v.sort_order ?? 0,
      deleted_at: null,
    } satisfies CreateInput<typeof purposes>)
  }

  async function updatePurpose(id: string, patch: Parameters<PurposesService['updatePurpose']>[1]): Promise<PurposeRow> {
    const v = UpdatePurposeSchema.parse(patch)
    const existing = await purposesRepo.findById(id)
    if (!existing) throw new PurposeNotFoundError(id)
    const data = stripUndefined({
      title: v.title,
      description: v.description,
      vision: v.vision,
      why: v.why,
      value_id: v.value_id,
      domain: v.domain,
      status: v.status,
      progress: v.progress,
      start_date: v.start_date,
      target_date: v.target_date,
      is_primary: v.is_primary,
      sort_order: v.sort_order,
    })
    const updated = Object.keys(data).length === 0 ? existing : await purposesRepo.update(id, data)
    // S9 — emit a measurement signal on a completion transition (emit-only, dormant M1).
    if (isCompletionTransition(existing.status, v.status)) await fanOutCompletion(id, 'purpose.completed')
    return updated
  }

  async function archivePurpose(id: string): Promise<void> {
    if (!(await purposesRepo.findById(id))) throw new PurposeNotFoundError(id)
    // PG-19: child targets SURVIVE standalone → SET NULL their purpose_id (SR-003 relaxed), not cascade-delete.
    const childTargets = await targetsRepo.findWhere(and(eq(targets.purpose_id, id), isNull(targets.deleted_at))!)
    for (const t of childTargets) await targetsRepo.update(t.id, { purpose_id: null })
    // PG-19: cascade contributions (goal + contributor legs) + the purpose_reviews ledger (soft). The surviving
    // targets keep their own target_reviews → NOT cascaded here.
    await cascadeContributionsFor('purpose', id)
    const prevs = await purposeReviewsRepo.findWhere(
      and(eq(purposeReviews.purpose_id, id), isNull(purposeReviews.deleted_at))!,
    )
    for (const r of prevs) await purposeReviewsRepo.delete(r.id)
    // PG-19 two-hop: hard-cascade purpose_metrics + their value ledger — reuse S3 deleteMetric (metrics carry no
    // deleted_at → hard; it also hard-deletes the metric's purpose_metric_values).
    const metrics = await metricsRepo.findWhere(eq(purposeMetrics.purpose_id, id))
    for (const m of metrics) await deleteMetric(m.id)
    await purposesRepo.delete(id) // soft
  }

  async function getPurpose(id: string): Promise<PurposeRow | null> {
    return purposesRepo.findById(id)
  }
  async function listPurposes(): Promise<PurposeRow[]> {
    return purposesRepo.findAll()
  }

  // ---- S1: targets CRUD -----------------------------------------------------
  async function createTarget(input: Parameters<PurposesService['createTarget']>[0]): Promise<TargetRow> {
    const v = CreateTargetSchema.parse(input)
    // measurement_method is bind-managed on a non-manual target (its binding ref) — a live binding goes through
    // bind() so the DAG guard runs; reject a direct create that would smuggle a ref past it (g2 MINOR).
    if (v.measurement_method != null && v.binding_mode != null && v.binding_mode !== 'manual') throw new BindingRefManaged()
    return targetsRepo.create({
      purpose_id: v.purpose_id ?? null, // nullable spine joint (PG-9)
      title: v.title,
      description: v.description ?? null,
      measurement_kind: v.measurement_kind ?? 'quantitative', // NN default backfill
      binding_mode: v.binding_mode ?? null, // NULL ⇒ derive
      target_value: v.target_value ?? null,
      current_value: v.current_value ?? null, // override slot (PG-4)
      unit: v.unit ?? null,
      success_criteria: v.success_criteria ?? null,
      measurement_method: v.measurement_method ?? null,
      status: v.status ?? 'not_started',
      priority: v.priority ?? 'medium',
      start_date: v.start_date ?? null,
      target_date: v.target_date ?? null,
      next_review_date: v.next_review_date ?? null,
      review_frequency: v.review_frequency ?? null,
      sort_order: v.sort_order ?? 0,
      deleted_at: null,
    } satisfies CreateInput<typeof targets>)
  }

  async function updateTarget(id: string, patch: Parameters<PurposesService['updateTarget']>[1]): Promise<TargetRow> {
    const v = UpdateTargetSchema.parse(patch)
    const existing = await targetsRepo.findById(id)
    if (!existing) throw new TargetNotFoundError(id)
    // measurement_method is bind-managed on a non-manual target (its binding ref) — reject a direct write that
    // would corrupt the ref / bypass the DAG guard (g2 MINOR). Clear the binding (bind → manual) first.
    const effectiveMode = v.binding_mode !== undefined ? v.binding_mode : existing.binding_mode
    if (v.measurement_method !== undefined && effectiveMode != null && effectiveMode !== 'manual') throw new BindingRefManaged()
    const data = stripUndefined({
      purpose_id: v.purpose_id,
      title: v.title,
      description: v.description,
      measurement_kind: v.measurement_kind,
      binding_mode: v.binding_mode,
      target_value: v.target_value,
      current_value: v.current_value,
      unit: v.unit,
      success_criteria: v.success_criteria,
      measurement_method: v.measurement_method,
      status: v.status,
      priority: v.priority,
      start_date: v.start_date,
      target_date: v.target_date,
      next_review_date: v.next_review_date,
      review_frequency: v.review_frequency,
      sort_order: v.sort_order,
    })
    const updated = Object.keys(data).length === 0 ? existing : await targetsRepo.update(id, data)
    // S9 — emit a measurement signal on a completion transition (emit-only, dormant M1).
    if (isCompletionTransition(existing.status, v.status)) await fanOutCompletion(id, 'target.completed')
    return updated
  }

  async function archiveTarget(id: string): Promise<void> {
    if (!(await targetsRepo.findById(id))) throw new TargetNotFoundError(id)
    // PG-19: cascade contributions (goal + contributor legs, soft) + hard-cascade the target_reviews ledger
    // (no deleted_at → delete() is hard). Then soft-delete the target.
    await cascadeContributionsFor('target', id)
    const trevs = await targetReviewsRepo.findWhere(eq(targetReviews.target_id, id))
    for (const r of trevs) await targetReviewsRepo.delete(r.id)
    await targetsRepo.delete(id) // soft
  }

  async function getTarget(id: string): Promise<TargetRow | null> {
    return targetsRepo.findById(id)
  }
  async function listTargets(purposeId?: string): Promise<TargetRow[]> {
    const all = await targetsRepo.findAll() // active only
    return purposeId === undefined ? all : all.filter((t) => t.purpose_id === purposeId)
  }

  // ---- S2: dreams CRUD ------------------------------------------------------
  // `steps` is a plain TEXT column holding a JSON string (never json<T>()) → serialize on write; the Row read
  // returns the raw string (the consumer parses). The DreamRow this service returns carries `steps: string | null`.
  async function createDream(input: Parameters<PurposesService['createDream']>[0]): Promise<DreamRow> {
    const v = CreateDreamSchema.parse(input)
    return dreamsRepo.create({
      title: v.title,
      description: v.description ?? null,
      domain: v.domain ?? null,
      category: v.category ?? null, // nullable (DB default 'other' never fires under create-echo)
      status: v.status ?? 'dream', // NN default backfill
      priority: v.priority ?? 'medium',
      target_age: v.target_age ?? null,
      target_date: v.target_date ?? null,
      completed_date: v.completed_date ?? null,
      estimated_cost: v.estimated_cost ?? null,
      location: v.location ?? null,
      image_url: v.image_url ?? null,
      cover_image_url: v.cover_image_url ?? null,
      inspiration_url: v.inspiration_url ?? null,
      progress_percentage: v.progress_percentage ?? null, // override slot (PG-4)
      steps: v.steps == null ? null : JSON.stringify(v.steps),
      purpose_id: v.purpose_id ?? null,
      project_id: v.project_id ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof dreams>)
  }

  async function updateDream(id: string, patch: Parameters<PurposesService['updateDream']>[1]): Promise<DreamRow> {
    const v = UpdateDreamSchema.parse(patch)
    if (!(await dreamsRepo.findById(id))) throw new DreamNotFoundError(id)
    const data = stripUndefined({
      title: v.title,
      description: v.description,
      domain: v.domain,
      category: v.category,
      status: v.status,
      priority: v.priority,
      target_age: v.target_age,
      target_date: v.target_date,
      completed_date: v.completed_date,
      estimated_cost: v.estimated_cost,
      location: v.location,
      image_url: v.image_url,
      cover_image_url: v.cover_image_url,
      inspiration_url: v.inspiration_url,
      progress_percentage: v.progress_percentage,
      // steps: an omitted key ⇒ untouched; an explicit value (incl. null) ⇒ reserialize/clear.
      steps: v.steps === undefined ? undefined : v.steps === null ? null : JSON.stringify(v.steps),
      purpose_id: v.purpose_id,
      project_id: v.project_id,
    })
    return Object.keys(data).length === 0 ? (await dreamsRepo.findById(id))! : dreamsRepo.update(id, data)
  }

  async function archiveDream(id: string): Promise<void> {
    if (!(await dreamsRepo.findById(id))) throw new DreamNotFoundError(id)
    // PG-19: a dream is never a GOAL (not in CONTRIBUTION_GOAL_TYPE) → only its contributor-side contributions
    // cascade (business-rules.md:123). No children, no SET NULL. Then soft-delete.
    await cascadeContributionsFor('dream', id)
    await dreamsRepo.delete(id) // soft
  }

  async function getDream(id: string): Promise<DreamRow | null> {
    return dreamsRepo.findById(id)
  }
  async function listDreams(purposeId?: string): Promise<DreamRow[]> {
    const all = await dreamsRepo.findAll() // active only
    return purposeId === undefined ? all : all.filter((d) => d.purpose_id === purposeId)
  }

  // ---- S3: metrics + value ledger (PG-15) -----------------------------------
  async function createMetric(input: Parameters<PurposesService['createMetric']>[0]): Promise<PurposeMetricRow> {
    const v = CreateMetricSchema.parse(input)
    return metricsRepo.create({
      purpose_id: v.purpose_id ?? null,
      name: v.name,
      description: v.description ?? null,
      unit: v.unit ?? null,
      target_value: v.target_value ?? null,
      current_value: v.current_value ?? null, // override slot — NULL ⇒ derive (PG-4)
      calculation_method: v.calculation_method ?? 'latest', // NN default backfill
      is_higher_better: v.is_higher_better ?? null,
      baseline_value: v.baseline_value ?? null,
    } satisfies CreateInput<typeof purposeMetrics>)
  }

  async function updateMetric(id: string, patch: Parameters<PurposesService['updateMetric']>[1]): Promise<PurposeMetricRow> {
    const v = UpdateMetricSchema.parse(patch)
    if (!(await metricsRepo.findById(id))) throw new MetricNotFoundError(id)
    const data = stripUndefined({
      purpose_id: v.purpose_id,
      name: v.name,
      description: v.description,
      unit: v.unit,
      target_value: v.target_value,
      current_value: v.current_value,
      calculation_method: v.calculation_method,
      is_higher_better: v.is_higher_better,
      baseline_value: v.baseline_value,
    })
    return Object.keys(data).length === 0 ? (await metricsRepo.findById(id))! : metricsRepo.update(id, data)
  }

  async function getMetric(id: string): Promise<PurposeMetricRow | null> {
    return metricsRepo.findById(id)
  }
  async function listMetrics(purposeId?: string): Promise<PurposeMetricRow[]> {
    const all = await metricsRepo.findAll()
    return purposeId === undefined ? all : all.filter((m) => m.purpose_id === purposeId)
  }

  async function deleteMetric(id: string): Promise<void> {
    if (!(await metricsRepo.findById(id))) throw new MetricNotFoundError(id)
    // Two-hop app-layer cascade (no FK): hard-delete the metric's value ledger first, then the metric.
    const vals = await metricValuesRepo.findWhere(eq(purposeMetricValues.metric_id, id))
    for (const row of vals) await metricValuesRepo.hardDelete(row.id)
    await metricsRepo.hardDelete(id)
  }

  async function recordMetricValue(
    metricId: string,
    value: number,
    opts?: Parameters<PurposesService['recordMetricValue']>[2],
  ): Promise<PurposeMetricValueRow> {
    const o = RecordMetricValueSchema.parse(opts ?? {})
    if (!(await metricsRepo.findById(metricId))) throw new MetricNotFoundError(metricId)
    return metricValuesRepo.create({
      metric_id: metricId,
      value,
      recorded_at: o.recorded_at ?? Date.now(),
      source: o.source ?? 'manual', // NN default backfill
      context_notes: o.context_notes ?? null,
    } satisfies CreateInput<typeof purposeMetricValues>)
  }

  async function getMetricCurrent(metricId: string): Promise<MetricCurrent> {
    const m = await metricsRepo.findById(metricId)
    if (!m) throw new MetricNotFoundError(metricId)
    // Override slot wins (PG-4): a user-set current_value is an explicit manual override.
    if (m.current_value !== null) return { value: m.current_value, source: 'manual', override: true }
    const rows = await metricValuesRepo.findWhere(eq(purposeMetricValues.metric_id, metricId))
    if (rows.length === 0) return { value: null, source: 'manual', override: false } // unmeasured
    const value = aggregate(m.calculation_method, rows)
    // Provenance: manual iff EVERY contributing point is manual (for 'latest', the one latest point).
    const contributing = m.calculation_method === 'latest' ? [latestRow(rows)] : rows
    const source = contributing.every((r) => r.source === 'manual') ? 'manual' : 'auto'
    return { value, source, override: false }
  }

  // ---- S4: contributions edge (PG-10) ---------------------------------------
  const isGoalType = (t: string): t is ContributionGoalType => (CONTRIBUTION_GOAL_TYPE as readonly string[]).includes(t)
  const isContributorType = (t: string): t is ContributionContributorType =>
    (CONTRIBUTION_CONTRIBUTOR_TYPE as readonly string[]).includes(t)

  async function linkContribution(
    goal: ContributionRef,
    contributor: ContributionRef,
    opts: Parameters<PurposesService['linkContribution']>[2],
  ): Promise<ContributionRow> {
    // Two-sided domain guard (PG-10): BOTH ends must be in vocabulary (a typed error, not a ZodError).
    if (!isGoalType(goal.type)) throw new InvalidContributor('goal', goal.type)
    if (!isContributorType(contributor.type)) throw new InvalidContributor('contributor', contributor.type)
    const v = LinkContributionSchema.parse(opts)
    return contributionsRepo.create({
      goal_type: goal.type, // narrowed by the guard
      goal_id: goal.id,
      contributor_type: contributor.type,
      contributor_id: contributor.id,
      contribution_percentage: v.weight, // the weight ONLY — never a copied progress value (PG-10)
      contribution_notes: v.notes ?? null,
      deleted_at: null,
    } satisfies CreateInput<typeof contributions>)
  }

  async function unlinkContribution(id: string): Promise<void> {
    if (!(await contributionsRepo.findById(id))) throw new ContributionNotFoundError(id)
    await contributionsRepo.delete(id) // soft
  }

  async function reweightContribution(id: string, weight: number): Promise<ContributionRow> {
    const v = ReweightContributionSchema.parse({ weight })
    if (!(await contributionsRepo.findById(id))) throw new ContributionNotFoundError(id)
    return contributionsRepo.update(id, { contribution_percentage: v.weight })
  }

  async function listContributions(goal: ContributionRef): Promise<ContributionRow[]> {
    // findWhere skips the soft-delete filter → add isNull(deleted_at) explicitly.
    return contributionsRepo.findWhere(
      and(
        eq(contributions.goal_type, goal.type as ContributionGoalType),
        eq(contributions.goal_id, goal.id),
        isNull(contributions.deleted_at),
      )!,
    )
  }

  // ---- S5: measurability core (compose foundation/measurement; derive-on-read) ----
  // All math is in [0,1] (the engine's unit); stored/override columns are 0–100 → convert only at this edge (F-1).
  const toPct = (n: number): number => Math.round(n * 100)
  const fromPct = (n: number): number => n / 100

  /** The LEAF [0,1] progress of a target from its measurement_kind (the schema-split: targets carry no
   *  baseline/direction col → quantitative defaults baseline 0 / higher-better; qualitative has no rating col →
   *  unmeasured at M1; milestone reads `status`; rate reads current_value). Returns null = unmeasured. */
  function leafTarget01(t: TargetRow): number | null {
    // S6 derived-pull (ADR-011 §3.6): the value is READ from the measurement-source seam, keyed by the bound
    // source ref stored in measurement_method. The seam returns a [0,1] fraction directly (BR-PG-S5-2). Empty
    // registry at M1 — or a source outage (SourceUnavailable, record-not-throw) — degrades to null (unmeasured,
    // never fabricated, PG-6); real sources advertised by Finance/Habits/Health at M2 (zero-signature swap).
    if (t.binding_mode === 'derived-pull') {
      return t.measurement_method == null ? null : (measurementSources?.query(t.measurement_method) ?? null)
    }
    switch (t.measurement_kind) {
      case 'quantitative':
        return t.current_value == null || t.target_value == null
          ? null
          : normalize({ kind: 'quantitative', current: t.current_value, baseline: 0, target: t.target_value, isHigherBetter: true })
      case 'milestone':
        return normalize({ kind: 'milestone', done: t.status === 'completed' })
      case 'rate':
        return t.current_value == null ? null : normalize({ kind: 'rate', value: t.current_value })
      case 'qualitative':
        return null // no rating/scale column on targets → unmeasured at M1 (PG-3), never 0
    }
  }

  /** The [0,1] leaf of a purpose_metric — direction-aware (metrics carry baseline_value + is_higher_better, unlike
   *  targets). Reads the current value via getMetricCurrent (override slot or calculation_method over the ledger). */
  async function metricLeaf01(m: PurposeMetricRow): Promise<number | null> {
    if (m.target_value == null) return null
    const cur = await getMetricCurrent(m.id)
    if (cur.value == null) return null
    return normalize({
      kind: 'quantitative',
      current: cur.value,
      baseline: m.baseline_value ?? 0,
      target: m.target_value,
      isHigherBetter: m.is_higher_better ?? true,
    })
  }

  /** Resolve a contribution's contributor to a [0,1] progress. In-module dream = its override slot; cross-module
   *  (habit/routine/project/task/finance_target/check_in) = the measurement-source seam (empty at M1 ⇒ null). */
  async function contributorProgress01(c: ContributionRow): Promise<number | null> {
    if (c.contributor_type === 'dream') {
      const d = await dreamsRepo.findById(c.contributor_id)
      return d && d.progress_percentage != null ? fromPct(d.progress_percentage) : null
    }
    // Per-entity key convention; the empty M1 registry returns null (unmeasured). Real sources = M2.
    return measurementSources?.query(`${c.contributor_type}:${c.contributor_id}`) ?? null
  }

  const rollupView = (children: { progress: number | null; weight: number | null }[]): PurposeProgressView => {
    const rolled = rollup(children)
    const measured = children.filter((c) => c.progress !== null).length
    return {
      value: rolled == null ? null : toPct(rolled),
      derived: true,
      partial: measured > 0 && measured < children.length,
      unmeasured: rolled == null,
    }
  }

  async function progress(entity: { type: 'target' | 'dream'; id: string }): Promise<PurposeProgressView> {
    if (entity.type === 'dream') {
      const d = await dreamsRepo.findById(entity.id)
      if (!d) throw new DreamNotFoundError(entity.id)
      // Dream progress = its override slot (0–100) or null (no measurement_kind → no derive).
      return { value: d.progress_percentage, derived: false, partial: false, unmeasured: d.progress_percentage == null }
    }
    const t = await targetsRepo.findById(entity.id)
    if (!t) throw new TargetNotFoundError(entity.id)
    const leaf = leafTarget01(t)
    return { value: leaf == null ? null : toPct(leaf), derived: true, partial: false, unmeasured: leaf == null }
  }

  async function computeProgress(goal: { type: 'purpose' | 'target'; id: string }): Promise<PurposeProgressView> {
    if (goal.type === 'purpose') {
      const p = await purposesRepo.findById(goal.id)
      if (!p) throw new PurposeNotFoundError(goal.id)
      if (p.progress != null) return { value: p.progress, derived: false, partial: false, unmeasured: false } // override (0–100)
      // Two-channel rollup (build-phase resolution, ADR-011 §3.8 — the docs don't fix cross-channel mixing):
      //   Channel A = in-module LEAVES (spine-targets via purpose_id + purpose_metrics), equal-weight peers.
      //   Channel B = direct CONTRIBUTIONS (heterogeneous contributors), weighted by contribution_percentage.
      // Each channel rolls up on its OWN scale; the two channel-results then combine EQUAL-weight. This keeps
      // contribution_percentage meaningful *within* B and stops a weight-1 target drowning under a weight-60
      // contribution (g2 #2). A metric can only feed via this direct channel (purpose_metric ∉ contributor vocab, g2 #1).
      const spineTargets = await listTargets(goal.id)
      const targetChildren = await Promise.all(
        spineTargets.map(async (t) => {
          const view = await computeProgress({ type: 'target', id: t.id })
          return { progress: view.value == null ? null : fromPct(view.value), weight: null as number | null }
        }),
      )
      const metrics = await listMetrics(goal.id)
      const metricChildren = await Promise.all(
        metrics.map(async (m) => ({ progress: await metricLeaf01(m), weight: null as number | null })),
      )
      const channelA = [...targetChildren, ...metricChildren]
      const contribs = await listContributions({ type: 'purpose', id: goal.id })
      const channelB = await Promise.all(
        contribs.map(async (c) => ({ progress: await contributorProgress01(c), weight: c.contribution_percentage })),
      )
      const aRolled = channelA.length ? rollup(channelA) : null
      const bRolled = channelB.length ? rollup(channelB) : null
      const combined = rollup([
        { progress: aRolled, weight: null },
        { progress: bRolled, weight: null },
      ])
      // `partial` reflects the RAW leaves (a channel that excluded a null child), not the two combined channels.
      const allChildren = [...channelA, ...channelB]
      const measured = allChildren.filter((c) => c.progress !== null).length
      return {
        value: combined == null ? null : toPct(combined),
        derived: true,
        partial: measured > 0 && measured < allChildren.length,
        unmeasured: combined == null,
      }
    }
    // target: its own leaf (override/measurement) wins; else roll up its contributions.
    const t = await targetsRepo.findById(goal.id)
    if (!t) throw new TargetNotFoundError(goal.id)
    const leaf = leafTarget01(t)
    if (leaf != null) return { value: toPct(leaf), derived: true, partial: false, unmeasured: false }
    const contribs = await listContributions({ type: 'target', id: goal.id })
    const children = await Promise.all(
      contribs.map(async (c) => ({ progress: await contributorProgress01(c), weight: c.contribution_percentage })),
    )
    return rollupView(children)
  }

  // ---- S6: bindings + DAG guard + derived-pull source resolution ------------
  // A binding records its source `ref` as the target's `measurement_method` (`${type}:${id}`, the PG-11/PG-15
  // restored column) and sets `binding_mode`; `manual` clears both. The feed direction is always source→measurable
  // (a derived-pull target READS its source; an event-trigger target is SET when its source fires — both "ref feeds
  // target", ADR-011 §3.5). Before persisting a non-manual binding the DAG guard (§3.7, seam-contract §3) composes
  // `assertAcyclic` over the BINDING graph — every OTHER non-manual bound target's edge (reconstructed from its
  // stored measurement_method) + the proposed edge. A cycle (incl. target↔target) → CyclicBinding. (Contributions
  // are NOT in this graph: their contributor vocabulary excludes `target`/`purpose`, so a contribution can never be
  // an outgoing edge from a binding node — it cannot close a binding cycle. The graph is binding edges only.)
  const refKey = (r: { type: string; id: string }): string => `${r.type}:${r.id}`
  const parseRefKey = (key: string): EntityRef | null => {
    const i = key.indexOf(':')
    return i <= 0 || i === key.length - 1 ? null : { type: key.slice(0, i), id: key.slice(i + 1) }
  }

  async function bind(target: { type: 'target'; id: string }, input: Parameters<PurposesService['bind']>[1]): Promise<TargetRow> {
    const v = BindSchema.parse(input)
    if (!(await targetsRepo.findById(target.id))) throw new TargetNotFoundError(target.id)
    if (v.binding_mode === 'manual') {
      // Clear the binding: manual measurables carry no source.
      return targetsRepo.update(target.id, { binding_mode: 'manual', measurement_method: null })
    }
    // Non-manual: validate acyclicity before persisting (author-time rejection, PG-8).
    const proposedKey = refKey(v.ref!)
    const edges: Binding[] = []
    // Existing binding edges — exclude the target being (re)bound, its old edge is replaced by the proposed one.
    for (const t of await targetsRepo.findAll()) {
      if (t.id === target.id || t.binding_mode == null || t.binding_mode === 'manual' || t.measurement_method == null) continue
      const src = parseRefKey(t.measurement_method)
      if (src) edges.push({ mode: t.binding_mode as BindingMode, source: src, target: { type: 'target', id: t.id } })
    }
    // The proposed edge: the source feeds the measurable (both modes).
    edges.push({ mode: v.binding_mode, source: v.ref!, target: { type: 'target', id: target.id } })
    try {
      assertAcyclic(edges)
    } catch (e) {
      if (e instanceof MeasurementCycle) throw new CyclicBinding(e.message)
      throw e
    }
    return targetsRepo.update(target.id, { binding_mode: v.binding_mode, measurement_method: proposedKey })
  }

  // ---- S7: reviews + plan_steps (PG-11/12/13) -------------------------------
  // PG-13 FACT — reviews fire as `review` SESSIONS (ADR-004). The def is the seam-contract transcription
  // (owner_module:'purposes', effects:[], lifecycle scheduled→completed, allowed_effects:[] ⊆ shipped). `review`
  // is a SHARED canonical sub-type (flashcards also registers it); register is idempotent (first-wins, keyed by
  // sub_type) → catch DuplicateSubType. createSession only requires the sub_type be registered (service.ts:276).
  const REVIEW_SESSION_TYPE_DEF: SessionTypeDef = {
    sub_type: 'review',
    owner_module: 'purposes',
    attachment_defaults: {},
    effects: [],
    lifecycle: { transitions: [{ from: 'scheduled', to: 'completed', event: 'complete' }] },
    permissions: { allowed_effects: [] },
    default_purpose: 'review',
  }
  async function registerReview(): Promise<void> {
    try {
      await sessions.registry.register(REVIEW_SESSION_TYPE_DEF)
    } catch (err) {
      if (!(err instanceof DuplicateSubType)) throw err // already registered → no-op (idempotent)
    }
  }

  // Fire the review as a SCHEDULED `review` session (PG-13; contract.md:24 "a due review is scheduled as a review
  // session"). No extension (review ∉ focus/study), no attach (seam-contract = register + createSession; the target
  // linkage is the ledger + next_review_date). The live Scheduler firing/completion is the only M2 piece.
  async function fireReviewSession(): Promise<void> {
    await sessions.service.createSession({ sub_type: 'review', scheduling_mode: 'planned', status: 'scheduled' })
  }

  async function openTargetReview(
    targetId: string,
    input: Parameters<PurposesService['openTargetReview']>[1],
  ): Promise<TargetReviewRow> {
    const v = OpenTargetReviewSchema.parse(input)
    const t = await targetsRepo.findById(targetId)
    if (!t) throw new TargetNotFoundError(targetId)
    await registerReview()
    const reviewedAt = v.reviewed_at ?? Date.now()
    const row = await targetReviewsRepo.create({
      target_id: targetId,
      progress_rating: v.progress_rating ?? null,
      reflection: v.reflection ?? null,
      next_actions: v.next_actions ?? null,
      reviewed_at: reviewedAt,
    } satisfies CreateInput<typeof targetReviews>)
    // next_review_date compute — targets carry review_frequency (purposes do not). Schedule the next review.
    if (t.review_frequency != null) {
      await targetsRepo.update(targetId, { next_review_date: nextReviewDate(reviewedAt, t.review_frequency) })
    }
    await fireReviewSession()
    return row
  }

  async function openPurposeReview(
    purposeId: string,
    input: Parameters<PurposesService['openPurposeReview']>[1],
  ): Promise<PurposeReviewRow> {
    const v = OpenPurposeReviewSchema.parse(input)
    if (!(await purposesRepo.findById(purposeId))) throw new PurposeNotFoundError(purposeId)
    await registerReview()
    const row = await purposeReviewsRepo.create({
      purpose_id: purposeId,
      still_aligned: v.still_aligned,
      alignment_notes: v.alignment_notes ?? null,
      overall_progress: v.overall_progress ?? null,
      key_achievements: v.key_achievements ?? null,
      obstacles_faced: v.obstacles_faced ?? null,
      adjustments_needed: v.adjustments_needed ?? null,
      renewed_commitment: v.renewed_commitment ?? null,
      fulfillment_rating: v.fulfillment_rating ?? null,
      clarity_rating: v.clarity_rating ?? null,
      reviewed_at: v.reviewed_at ?? Date.now(),
      deleted_at: null,
    } satisfies CreateInput<typeof purposeReviews>)
    await fireReviewSession()
    return row
  }

  async function listTargetReviews(targetId: string): Promise<TargetReviewRow[]> {
    return targetReviewsRepo.findWhere(eq(targetReviews.target_id, targetId)) // no deleted_at on this ledger
  }
  async function listPurposeReviews(purposeId: string): Promise<PurposeReviewRow[]> {
    // findWhere skips the soft-delete filter → add isNull(deleted_at) explicitly.
    return purposeReviewsRepo.findWhere(
      and(eq(purposeReviews.purpose_id, purposeId), isNull(purposeReviews.deleted_at))!,
    )
  }

  async function addPlanStep(
    owner: PlanStepOwnerRef,
    input: Parameters<PurposesService['addPlanStep']>[1],
  ): Promise<PlanStepRow> {
    const v = AddPlanStepSchema.parse(input)
    return planStepsRepo.create({
      owner_type: owner.type,
      owner_id: owner.id,
      title: v.title,
      note: v.note ?? null,
      sort_order: v.sort_order ?? 0,
      is_completed: false,
      completed_at: null,
      deleted_at: null,
    } satisfies CreateInput<typeof planSteps>)
  }
  async function togglePlanStep(id: string): Promise<PlanStepRow> {
    const step = await planStepsRepo.findById(id)
    if (!step) throw new PlanStepNotFoundError(id)
    const nowCompleted = !step.is_completed
    return planStepsRepo.update(id, { is_completed: nowCompleted, completed_at: nowCompleted ? Date.now() : null })
  }
  async function listPlanSteps(owner: PlanStepOwnerRef): Promise<PlanStepRow[]> {
    return planStepsRepo.findWhere(
      and(eq(planSteps.owner_type, owner.type), eq(planSteps.owner_id, owner.id), isNull(planSteps.deleted_at))!,
    )
  }

  // ---- S8: tags · links · pages ---------------------------------------------
  // Thin SCOPED wrappers over the built SpacesService / NotesService (the WRITE owners). Purposes never touches
  // entity_tags/entity_links/pages directly — the read/write split ([[spaces-junctions-split-read-write-tagentity-blind-inserts]]).
  // `spaces.*` validate entity_type against the shared taggable-type registry they hold; value/purpose/target/dream/
  // purpose_metric_value are all pre-seeded in ENTITY_TYPES (_registry.ts) → no `register()` call here (PG-18).
  async function tagEntity(entityType: PurposeTagLinkType, entityId: string, tagId: string): Promise<void> {
    await spaces.tagEntity(tagId, entityType, entityId)
  }
  async function untagEntity(entityType: PurposeTagLinkType, entityId: string, tagId: string): Promise<void> {
    await spaces.untagEntity(tagId, entityType, entityId)
  }
  async function linkEntity(
    pageId: string,
    target: { type: PurposeTagLinkType; id: string },
    context?: string | null,
  ): Promise<void> {
    await spaces.createLink(pageId, target.type, target.id, context ?? null)
  }
  async function unlinkEntity(pageId: string, target: { type: PurposeTagLinkType; id: string }): Promise<void> {
    await spaces.removeLink(pageId, target.type, target.id)
  }

  // The title seed is a read of the OWNED entity (not cross-module) → in-contract per EntityNoteSeed. Guards the
  // owner exists with the entity's own *NotFoundError (the getProjectPage find-or-create guard precedent).
  async function resolveOwnedTitle(entityType: PurposeNoteType, entityId: string): Promise<string> {
    switch (entityType) {
      case 'value': {
        const v = await valuesRepo.findById(entityId)
        if (!v) throw new ValueNotFoundError(entityId)
        return v.name
      }
      case 'purpose': {
        const p = await purposesRepo.findById(entityId)
        if (!p) throw new PurposeNotFoundError(entityId)
        return p.title
      }
      case 'target': {
        const t = await targetsRepo.findById(entityId)
        if (!t) throw new TargetNotFoundError(entityId)
        return t.title
      }
      case 'dream': {
        const d = await dreamsRepo.findById(entityId)
        if (!d) throw new DreamNotFoundError(entityId)
        return d.title
      }
    }
  }
  // Find-or-create the standalone note for a titled entity (the projects `getProjectPage` mechanism — NOT
  // `notes.ensureEntityNote`, which seeds the `content` column, not `title` [notes/service.ts:171-175]). We want a
  // TITLED page, so find the entity's existing note-page else `createPage` with the owned entity's title. No new
  // PAGE_TYPE (type='note'); idempotent (find-first by type+entity); spaces/notes validate the entity_type.
  async function ensureEntityNote(entityType: PurposeNoteType, entityId: string): Promise<PageRow> {
    const title = await resolveOwnedTitle(entityType, entityId)
    const existing = (await notes.getPagesForEntity(entityType, entityId)).find((p) => p.type === 'note')
    if (existing) return existing
    return notes.createPage({ type: 'note', title, entity_type: entityType, entity_id: entityId })
  }

  // ---- S9: provider (Journal summary digest + the SS-7 DueProvider lane) -----
  // The day's recap (PULL — the Journals registry calls this at render via registerPurposesJournal). Active purposes
  // (non-terminal, live) + targets whose next_review_date is this day. Deltas come from Journal snapshots, not here
  // (PG-14, business-rules.md:48) → counts only.
  async function getDayPurposesDigest(date: string): Promise<PurposesDayDigest> {
    const allPurposes = await purposesRepo.findAll() // applies isNull(deleted_at)
    const activePurposes = allPurposes.filter((p) => !TERMINAL_STATUSES.has(p.status)).length
    const due = await targetsRepo.findWhere(and(eq(targets.next_review_date, date), isNull(targets.deleted_at))!)
    return { activePurposes, reviewsDue: due.length }
  }

  // Parse a YYYY-MM-DD calendar date to its UTC-midnight ms instant (matches the S7 next_review_date UTC anchor,
  // service.ts next_review_date math — a local-tz parse would drift the boundary up to a day).
  const toUtcMidnightMs = (ymd: string): number => Date.parse(`${ymd}T00:00:00Z`)
  // The SS-7 due-work lane (canonical DueItem). TARGETS ONLY — purposes carry no next_review_date (schema/purposes.ts
  // :52-70), so review-due is target-grained. urgency=0 (M1.2 ranking, sessions/service.ts:705); est_minutes=15 default.
  async function dueIn(range: TimeRange): Promise<DueItem[]> {
    const withReview = await targetsRepo.findWhere(and(isNotNull(targets.next_review_date), isNull(targets.deleted_at))!)
    const items: DueItem[] = []
    for (const t of withReview) {
      if (!t.next_review_date) continue
      const dueMs = toUtcMidnightMs(t.next_review_date)
      if (Number.isNaN(dueMs) || dueMs < range.start || dueMs > range.end) continue
      items.push({
        source_module: 'purposes',
        ref_id: t.id,
        label: t.title,
        est_minutes: 15,
        urgency: 0,
        hard_deadline: dueMs,
      })
    }
    return items
  }

  return {
    createValue,
    updateValue,
    archiveValue,
    getValue,
    listValues,
    createPurpose,
    updatePurpose,
    archivePurpose,
    getPurpose,
    listPurposes,
    createTarget,
    updateTarget,
    archiveTarget,
    getTarget,
    listTargets,
    createDream,
    updateDream,
    archiveDream,
    getDream,
    listDreams,
    createMetric,
    updateMetric,
    getMetric,
    listMetrics,
    deleteMetric,
    recordMetricValue,
    getMetricCurrent,
    linkContribution,
    unlinkContribution,
    reweightContribution,
    listContributions,
    progress,
    computeProgress,
    bind,
    openTargetReview,
    openPurposeReview,
    listTargetReviews,
    listPurposeReviews,
    addPlanStep,
    togglePlanStep,
    listPlanSteps,
    tagEntity,
    untagEntity,
    linkEntity,
    unlinkEntity,
    ensureEntityNote,
    getDayPurposesDigest,
    dueIn,
  }
}

/** next_review_date = the anchor date (UTC from `reviewed_at` ms) + one `review_frequency` step. No date-fns
 *  (@vida/core convention — the finance `addSteps` precedent): day-based freqs add days; month-based add months +
 *  clamp the day to the target month's last day (Jan 31 +1mo → Feb 28, never a Mar rollover). UTC → no TZ drift. */
function nextReviewDate(reviewedAtMs: number, freq: Frequency): string {
  const [y, m, d] = new Date(reviewedAtMs).toISOString().slice(0, 10).split('-').map(Number)
  if (freq === 'daily' || freq === 'weekly' || freq === 'biweekly') {
    const days = freq === 'daily' ? 1 : freq === 'weekly' ? 7 : 14
    const dt = new Date(Date.UTC(y, m - 1, d))
    dt.setUTCDate(dt.getUTCDate() + days)
    return dt.toISOString().slice(0, 10)
  }
  const monthsAdd = freq === 'monthly' ? 1 : freq === 'quarterly' ? 3 : 12
  const total = m - 1 + monthsAdd
  const ny = y + Math.floor(total / 12)
  const nm = ((total % 12) + 12) % 12
  const lastDay = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate()
  const nd = Math.min(d, lastDay)
  return `${ny}-${String(nm + 1).padStart(2, '0')}-${String(nd).padStart(2, '0')}`
}

/** The row with the greatest `recorded_at` (ties → the later `created_at`). */
function latestRow(rows: PurposeMetricValueRow[]): PurposeMetricValueRow {
  return rows.reduce((a, b) =>
    b.recorded_at > a.recorded_at || (b.recorded_at === a.recorded_at && b.created_at > a.created_at) ? b : a,
  )
}

/** Aggregate a metric's value ledger by its calculation_method (the derived current value). */
function aggregate(method: PurposeMetricRow['calculation_method'], rows: PurposeMetricValueRow[]): number {
  const vals = rows.map((r) => r.value)
  switch (method) {
    case 'sum':
      return vals.reduce((a, b) => a + b, 0)
    case 'average':
      return vals.reduce((a, b) => a + b, 0) / vals.length
    case 'max':
      return Math.max(...vals)
    case 'min':
      return Math.min(...vals)
    case 'count':
      return vals.length
    case 'latest':
      return latestRow(rows).value
  }
}

/** Drop keys whose value is `undefined` (an omitted patch field) — a `null` is a real "clear to null". */
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {}
  for (const [k, val] of Object.entries(obj)) {
    if (val !== undefined) out[k as keyof T] = val as T[keyof T]
  }
  return out
}
