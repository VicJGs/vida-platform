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
import type { ReviewCurve, MethodBinding, MethodBindingTargetType, ReviewEvent } from '@vida/types'
import type { DrizzleDb } from '../../db/adapter'
import { createRepository, type CreateInput } from '../../db/repository'
import {
  reviewCurves,
  methodBindings,
  reviewEvents,
  type ReviewCurveRow,
  type MethodBindingRow,
  type ReviewEventRow,
} from '../../db/schema/foundation/knowledge-review'
import type { CapabilityDefinition } from '../capability'
import { normalize } from '../measurement'
import {
  DefineCurveSchema,
  RegisterMethodSchema,
  BindMethodSchema,
  RecordReviewSchema,
} from '../../validators/knowledge'
import {
  STUDY_METHOD_KIND,
  ReviewCurveNotFoundError,
  MethodBindingNotFoundError,
  type ReviewEngine,
  type ReviewEngineDeps,
  type DefineCurveInput,
  type RegisterMethodInput,
  type BindMethodInput,
  type RecordReviewInput,
  type ResolveKindInput,
  type DueRange,
  type ReviewDueItem,
} from './types'

// --- S4 scheduling/derivation constants -------------------------------------
const DAY_MS = 86_400_000
/** M1.0 fallback review interval when the bound curve declares no `interval_days` (basic scheduling;
 *  curve-accurate SM-2 progression = build-phase, ADR-011:76). */
const DEFAULT_INTERVAL_DAYS = 1
/** The `quality` signal scale (0–5) for the M1.0 qualitative mastery reduction (BR-S4-3). */
const QUALITY_SCALE_MAX = 5

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
const toReviewEvent = (r: ReviewEventRow): ReviewEvent => ({
  ...r,
  // append-only, no json columns — only the _sync_status union cast (Drizzle-row-not-assignable seam).
  _sync_status: r._sync_status as ReviewEvent['_sync_status'],
})

export function createReviewEngine(db: DrizzleDb, deviceId: string, deps: ReviewEngineDeps): ReviewEngine {
  const { capability } = deps

  const curvesRepo = createRepository(db, reviewCurves, { deviceId, softDelete: true, encryptedFields: [] })
  const bindingsRepo = createRepository(db, methodBindings, { deviceId, softDelete: true, encryptedFields: [] })
  // S4 — review_events is APPEND-ONLY (no deleted_at) → no softDelete (default false; the repo never touches
  // deleted_at on create/findWhere). The event log is the source of truth replayed on read (BR-S4-1).
  const eventsRepo = createRepository(db, reviewEvents, { deviceId, encryptedFields: [] })

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

  async function listBindings(targetType: MethodBindingTargetType, targetId: string): Promise<MethodBinding[]> {
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

  // --- S4: review engine ② — record + due + derive --------------------------

  /** An object's events, newest-first (findWhere is unordered → sort by reviewed_at desc). */
  async function eventsFor(objectId: string): Promise<ReviewEventRow[]> {
    const rows = await eventsRepo.findWhere(eq(reviewEvents.object_id, objectId))
    return rows.sort((a, b) => b.reviewed_at - a.reviewed_at)
  }

  /** The bound curve's review interval (days). params is json<T> (a string at runtime) → parse + narrow the
   *  `interval_days` field (NIT-1: `unknown` needs a typeof guard, never `as any`). Falls back to the M1.0 default. */
  function curveIntervalDays(curve: ReviewCurveRow | null): number {
    const params = curve ? parseParams(curve.params as unknown as string | null) : null
    const raw = params?.interval_days
    return typeof raw === 'number' && raw > 0 ? raw : DEFAULT_INTERVAL_DAYS
  }

  /** Next-review time for a target (ms), or null when never reviewed (⇒ due now). Short-circuits before any
   *  latestReviewedAt deref on the empty-events case (NIT-3). */
  async function nextReviewAt(targetId: string, curveId: string | null): Promise<number | null> {
    const events = await eventsFor(targetId)
    if (events.length === 0) return null // never reviewed → due now (BR-S4-2)
    const latestReviewedAt = events[0]!.reviewed_at // newest-first
    const curve = curveId ? await curvesRepo.findById(curveId) : null
    return latestReviewedAt + curveIntervalDays(curve) * DAY_MS
  }

  async function recordReview(input: RecordReviewInput): Promise<ReviewEvent> {
    const v = RecordReviewSchema.parse(input)
    // Append an immutable event; mastery is derived-on-read, NOT written here (BR-S4-1). reviewed_at stamped now.
    const row = await eventsRepo.create({
      object_id: v.objectId,
      method_id: v.methodId,
      quality: v.quality ?? null,
      reviewed_at: Date.now(),
    } satisfies CreateInput<typeof reviewEvents>)
    return toReviewEvent(row)
  }

  async function getDue(range: DueRange, opts: { level?: MethodBindingTargetType } = {}): Promise<ReviewDueItem[]> {
    const now = Date.now()
    const where =
      opts.level !== undefined
        ? and(eq(methodBindings.target_type, opts.level), isNull(methodBindings.deleted_at))!
        : isNull(methodBindings.deleted_at)
    const bindings = await bindingsRepo.findWhere(where)
    const due: ReviewDueItem[] = []
    for (const b of bindings) {
      const dueAt = await nextReviewAt(b.target_id, b.curve_id)
      const effective = dueAt ?? now // never-reviewed ⇒ due now (BR-S4-2)
      if (effective >= range.from && effective <= range.to) {
        due.push({ targetType: b.target_type, targetId: b.target_id, methodId: b.method_id, dueAt })
      }
    }
    return due
  }

  async function dueIn(objectId: string, at: number = Date.now()): Promise<boolean> {
    // Resolve the object's binding curve (M1.0: first live binding; multi-binding resolution = build-phase).
    const bindings = await bindingsRepo.findWhere(
      and(eq(methodBindings.target_id, objectId), isNull(methodBindings.deleted_at))!,
    )
    const nextAt = await nextReviewAt(objectId, bindings[0]?.curve_id ?? null)
    return nextAt === null ? true : nextAt <= at // never-reviewed ⇒ due; else due once past next-review
  }

  async function deriveMastery(objectId: string): Promise<number | null> {
    // M1.0 reduction (BR-S4-3): normalize is single-value → reduce events to the LATEST non-null quality under a
    // qualitative 0–5 scale. null when unmeasured (NEVER coerced to 0). Multi-event weighting / decay = build-phase.
    const events = await eventsFor(objectId) // newest-first
    const latest = events.find((e) => e.quality != null)
    if (latest == null || latest.quality == null) return null
    const norm = normalize({ kind: 'qualitative', rating: latest.quality, scaleMax: QUALITY_SCALE_MAX })
    return norm == null ? null : Math.round(norm * 100) // [0,1] → 0–100 bridge (BR-S4-5)
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
    // S4
    recordReview,
    getDue,
    dueIn,
    deriveMastery,
  }
}
