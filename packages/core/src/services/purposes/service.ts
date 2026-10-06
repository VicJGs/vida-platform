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

import { and, eq, isNull } from 'drizzle-orm'
import { CONTRIBUTION_GOAL_TYPE, CONTRIBUTION_CONTRIBUTOR_TYPE } from '@vida/types'
import type { ContributionGoalType, ContributionContributorType } from '@vida/types'
import { createRepository, type CreateInput } from '../../db/repository'
import { purposes, targets, dreams, purposeMetrics, purposeMetricValues } from '../../db/schema/purposes'
import { values, contributions } from '../../db/schema/foundation/purpose'
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
} from '../../validators/purpose'
import {
  type PurposesService,
  type PurposesServiceDeps,
  type MetricCurrent,
  type ContributionRef,
  ValueNotFoundError,
  PurposeNotFoundError,
  TargetNotFoundError,
  DreamNotFoundError,
  MetricNotFoundError,
  ContributionNotFoundError,
  InvalidContributor,
} from './types'
import type { ValueRow, ContributionRow } from '../../db/schema/foundation/purpose'
import type {
  PurposeRow,
  TargetRow,
  DreamRow,
  PurposeMetricRow,
  PurposeMetricValueRow,
} from '../../db/schema/purposes'

export function createPurposesService(deps: PurposesServiceDeps): PurposesService {
  const { db, deviceId } = deps

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
    if (!(await purposesRepo.findById(id))) throw new PurposeNotFoundError(id)
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
    return Object.keys(data).length === 0 ? (await purposesRepo.findById(id))! : purposesRepo.update(id, data)
  }

  async function archivePurpose(id: string): Promise<void> {
    if (!(await purposesRepo.findById(id))) throw new PurposeNotFoundError(id)
    await purposesRepo.delete(id)
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
    if (!(await targetsRepo.findById(id))) throw new TargetNotFoundError(id)
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
    return Object.keys(data).length === 0 ? (await targetsRepo.findById(id))! : targetsRepo.update(id, data)
  }

  async function archiveTarget(id: string): Promise<void> {
    if (!(await targetsRepo.findById(id))) throw new TargetNotFoundError(id)
    await targetsRepo.delete(id)
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
    await dreamsRepo.delete(id)
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
  }
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
