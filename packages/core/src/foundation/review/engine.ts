// ============================================================================
// foundation/review — the engine (mod-knowledge #50 ① · S3 review engine ①)
//
// Populates the reserved foundation/review substrate (ADR-005/ADR-018): pluggable
// methods (capability-registry partition), curves (review_curves), bindings
// (method_bindings). Authors NO schema (008_knowledge_review already shipped).
//
// Factory-object, hoisted closures, no `this.` — so KnowledgeService re-exposes
// these verbs by bare method reference (the ② destructure-consumption shape).
//
// json<T>() seam (review_curves.params = a TEXT column with a $type LIE): the M1.0
// repo does NOT auto-serialize non-encrypted values (encryptRow pass-through, empty
// [E] set), so the engine stringifies at the WRITE boundary and parses on READ —
// exactly ONE cast per boundary (S1 key_concepts precedent). [E] fields persist via
// encryptedFields:[] (M1.0 pass-through; M3 target).
// ============================================================================

import { and, eq, isNull } from 'drizzle-orm'
import type { ReviewCurve, MethodBinding, MethodBindingTargetType } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  reviewCurves,
  methodBindings,
  type ReviewCurveRow,
  type MethodBindingRow,
} from '../../db/schema/foundation/knowledge-review'
import type { CapabilityDefinition } from '../capability'
import { DefineCurveSchema, RegisterMethodSchema, BindMethodSchema } from '../../validators/knowledge'
import {
  STUDY_METHOD_KIND,
  ReviewCurveNotFoundError,
  MethodBindingNotFoundError,
  type ReviewEngine,
  type ReviewEngineDeps,
  type DefineCurveInput,
  type RegisterMethodInput,
  type BindMethodInput,
  type ResolveKindInput,
} from './types'

/** Defensive JSON read (the S1/checkins boundary): degrade malformed JSON to null, never throw an opaque
 *  SyntaxError out of a read (a future sync row / manual DB edit could carry bad JSON). */
function parseParams(value: string | null): Record<string, unknown> | null {
  if (value == null) return null
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return null
  }
}

// --- Row → @vida/types interface --------------------------------------------
const toCurve = (r: ReviewCurveRow): ReviewCurve => ({
  ...r,
  // params is a json<Record<string,unknown>> TEXT column (a $type lie): stored as a JSON string at runtime,
  // parsed back here. r.params is TYPED Record but is a string → cast to the read shape.
  params: parseParams(r.params as unknown as string | null),
  _sync_status: r._sync_status as ReviewCurve['_sync_status'],
})
const toBinding = (r: MethodBindingRow): MethodBinding => ({
  ...r,
  // no json columns on method_bindings — only the _sync_status union cast (Drizzle-row-not-assignable seam).
  _sync_status: r._sync_status as MethodBinding['_sync_status'],
})

export function createReviewEngine(db: DrizzleDb, deviceId: string, deps: ReviewEngineDeps): ReviewEngine {
  const { capability } = deps

  const curvesRepo = createRepository(db, reviewCurves, { deviceId, softDelete: true, encryptedFields: [] })
  const bindingsRepo = createRepository(db, methodBindings, { deviceId, softDelete: true, encryptedFields: [] })

  // --- methods: the kind='study_method' partition of the capability registry ---

  async function listMethods(): Promise<CapabilityDefinition[]> {
    // registry.list() returns ALL kinds (shipped ∪ user) → filter to the study-method partition (KNO-15).
    const all = await capability.list()
    return all.filter((d) => d.kind === STUDY_METHOD_KIND)
  }

  async function registerMethod(input: RegisterMethodInput): Promise<CapabilityDefinition> {
    const v = RegisterMethodSchema.parse(input)
    // A study method is NOT an effect-firing block: it declares an empty privilege envelope so capability
    // BR-2..6 pass trivially (empty ⊆ shipped envelope; no terminal states owed). Roles/config (S7/FC-02)
    // ride config_schema. register() returns void → re-read the registered def via get(). (BR-S3-1/2)
    await capability.register({
      id: v.id,
      kind: STUDY_METHOD_KIND,
      render_targets: [],
      bindings: [],
      effects: [],
      terminal_states: {},
      config_schema: v.config_schema,
    })
    return capability.get(v.id)
  }

  // --- curves: personalizable scheduling curves (SM-2 preset seed = S4) --------

  async function listCurves(): Promise<ReviewCurve[]> {
    const rows = await curvesRepo.findWhere(isNull(reviewCurves.deleted_at)) // findWhere skips the soft-delete filter
    return rows.map(toCurve)
  }

  async function defineCurve(input: DefineCurveInput): Promise<ReviewCurve> {
    const v = DefineCurveSchema.parse(input)
    const row = await curvesRepo.create({
      name: v.name,
      curve_kind: v.curve_kind,
      // json<T> write boundary (BR-S3-8): stringify + one cast, here only.
      params: (v.params != null ? JSON.stringify(v.params) : null) as unknown as Record<string, unknown> | null,
      is_preset: false, // notNull default — user curves are never presets (SM-2 preset seed defers to S4). Backfill (create echoes input).
      deleted_at: null, // faithful echo (a new row is not deleted)
    } satisfies CreateInput<typeof reviewCurves>)
    return toCurve(row)
  }

  async function removeCurve(id: string): Promise<void> {
    if ((await curvesRepo.findById(id)) == null) throw new ReviewCurveNotFoundError(id)
    await curvesRepo.delete(id) // soft delete (softDelete:true → sets deleted_at)
  }

  // --- bindings: which method+curve applies where (polymorphic) ----------------

  async function bindMethod(input: BindMethodInput): Promise<MethodBinding> {
    const v = BindMethodSchema.parse(input)
    // No method_id/curve_id existence guard (BR-S3-6): the schema is no-FK; a method may be a shipped/future
    // service id not yet registered (e.g. Flashcards at S7). Do not add integrity the schema declines.
    const row = await bindingsRepo.create({
      method_id: v.methodId,
      curve_id: v.curveId ?? null,
      target_type: v.targetType,
      target_id: v.targetId,
      daily_cap: v.dailyCap ?? null,
      deleted_at: null, // faithful echo
    } satisfies CreateInput<typeof methodBindings>)
    return toBinding(row)
  }

  async function listBindings(
    targetType: MethodBindingTargetType,
    targetId: string,
  ): Promise<MethodBinding[]> {
    const rows = await bindingsRepo.findWhere(
      and(
        eq(methodBindings.target_type, targetType),
        eq(methodBindings.target_id, targetId),
        isNull(methodBindings.deleted_at),
      )!,
    )
    return rows.map(toBinding)
  }

  async function unbindMethod(id: string): Promise<void> {
    if ((await bindingsRepo.findById(id)) == null) throw new MethodBindingNotFoundError(id)
    await bindingsRepo.delete(id) // soft delete
  }

  // --- default-method resolution (KNO-20, 2-tier in S3) -----------------------

  function resolveDefaultMethod(kind: ResolveKindInput): string | null {
    // 2-tier (BR-S3-5): the kind's explicit override, else null. NEVER synthesize a method id — the
    // realm→registered-method tier activates at S7 when methods self-declare their realm (No-Guessing).
    return kind.default_method_id ?? null
  }

  return {
    listMethods,
    registerMethod,
    listCurves,
    defineCurve,
    removeCurve,
    bindMethod,
    listBindings,
    unbindMethod,
    resolveDefaultMethod,
  }
}
