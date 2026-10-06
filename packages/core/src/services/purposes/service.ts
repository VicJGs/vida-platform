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

import { createRepository, type CreateInput } from '../../db/repository'
import { purposes, targets } from '../../db/schema/purposes'
import { values } from '../../db/schema/foundation/purpose'
import {
  CreateValueSchema,
  UpdateValueSchema,
  CreatePurposeSchema,
  UpdatePurposeSchema,
  CreateTargetSchema,
  UpdateTargetSchema,
} from '../../validators/purpose'
import {
  type PurposesService,
  type PurposesServiceDeps,
  ValueNotFoundError,
  PurposeNotFoundError,
  TargetNotFoundError,
} from './types'
import type { ValueRow } from '../../db/schema/foundation/purpose'
import type { PurposeRow, TargetRow } from '../../db/schema/purposes'

export function createPurposesService(deps: PurposesServiceDeps): PurposesService {
  const { db, deviceId } = deps

  // All three spine tables carry deleted_at → softDelete:true. M1.0 encryptedFields:[] (M3 enables [E]).
  const valuesRepo = createRepository(db, values, { deviceId, softDelete: true, encryptedFields: [] })
  const purposesRepo = createRepository(db, purposes, { deviceId, softDelete: true, encryptedFields: [] })
  const targetsRepo = createRepository(db, targets, { deviceId, softDelete: true, encryptedFields: [] })

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
