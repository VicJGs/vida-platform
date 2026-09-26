// ============================================================================
// foundation/review — types (mod-knowledge #50 ① · S3 review engine ①)
//
// The generic review engine's scheduling substrate: pluggable METHODS (a typed
// partition of the ONE capability registry, kind='study_method'), user-tunable
// CURVES (review_curves; SM-2 = one preset — seeded at S4), and polymorphic
// BINDINGS (method_bindings). Cross-consumed (flashcards S7 + future skills/
// languages/education), so it homes to foundation, NOT services/knowledge (D1).
//
// Factory-object shape, hoisted closures, no `this.` (the ② destructure-consumption
// shape) — so KnowledgeService can re-expose the verbs by bare method reference.
// S4 appends: getDue/recordReview/deriveMastery/rollupMastery + seedPresetCurves.
// ============================================================================

import type { z } from 'zod'
import type { ReviewCurve, MethodBinding, MethodBindingTargetType } from '@vida/types'
import type { CapabilityRegistry, CapabilityDefinition } from '../capability'
import type {
  DefineCurveSchema,
  RegisterMethodSchema,
  BindMethodSchema,
} from '../../validators/knowledge'

/** The `kind` partition the study-method registry reads/writes in the OS capability registry (ADR-008). */
export const STUDY_METHOD_KIND = 'study_method'

export interface ReviewEngineDeps {
  /** ADR-008 — the ONE OS capability registry. Methods are its `kind='study_method'` partition (F2/D2);
   *  the engine NEVER opens a parallel method store. Required — core to the engine. */
  capability: CapabilityRegistry
}

// --- Zod-inferred input shapes (validators/knowledge.ts) --------------------
export type DefineCurveInput = z.infer<typeof DefineCurveSchema>
export type RegisterMethodInput = z.infer<typeof RegisterMethodSchema>
export type BindMethodInput = z.infer<typeof BindMethodSchema>

/** The kind fields `resolveDefaultMethod` reads (pure — no persistence). `learning_realm` is carried for the
 *  S7 forward seam (realm→registered-method match); S3 reads only `default_method_id` (BR-S3-5). */
export interface ResolveKindInput {
  default_method_id: string | null
  learning_realm: string | null
}

// --- typed errors ------------------------------------------------------------

/** KNO-18 companion — a `review_curves` id did not resolve (distinct from the knowledge object errors). */
export class ReviewCurveNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Review curve not found: ${id}`)
    this.name = 'ReviewCurveNotFoundError'
  }
}

/** KNO-19 companion — a `method_bindings` id did not resolve. */
export class MethodBindingNotFoundError extends Error {
  constructor(public readonly id: string) {
    super(`Method binding not found: ${id}`)
    this.name = 'MethodBindingNotFoundError'
  }
}

export interface ReviewEngine {
  // ── methods: the kind='study_method' partition of the capability registry ──
  /** KNO-15 — read the `study_method` partition (registry.list() filtered; the registry returns ALL kinds). */
  listMethods(): Promise<CapabilityDefinition[]>
  /** KNO-16 — register a `study_method` capability (empty privilege envelope, BR-S3-2). Returns the registered
   *  def (capability.register returns void → the engine re-reads via get). */
  registerMethod(input: RegisterMethodInput): Promise<CapabilityDefinition>

  // ── curves: personalizable scheduling curves (SM-2 preset seed = S4) ───────
  /** KNO-17 — read live curves (soft-delete filtered). */
  listCurves(): Promise<ReviewCurve[]>
  /** KNO-18 — define a user curve (`is_preset:false`); `params` json round-trips via stringify/parse (BR-S3-8). */
  defineCurve(input: DefineCurveInput): Promise<ReviewCurve>
  /** Companion — soft-delete a curve (guard-exists → ReviewCurveNotFoundError). */
  removeCurve(id: string): Promise<void>

  // ── bindings: which method+curve applies where (polymorphic) ───────────────
  /** KNO-19 — bind a method(+curve) at any spine level. No method_id/curve_id FK guard (BR-S3-6). */
  bindMethod(input: BindMethodInput): Promise<MethodBinding>
  /** Companion / S4 due-queue input — the bindings at a target level (write-leg read half, soft-delete filtered). */
  listBindings(targetType: MethodBindingTargetType, targetId: string): Promise<MethodBinding[]>
  /** Companion — soft-delete a binding (guard-exists → MethodBindingNotFoundError). */
  unbindMethod(id: string): Promise<void>

  // ── default-method resolution (KNO-20, 2-tier in S3) ───────────────────────
  /** KNO-20 — resolve the default method for a kind: `default_method_id` if set, else `null`. Pure; NEVER
   *  synthesizes a method id (the realm-driven tier activates at S7 — BR-S3-5). */
  resolveDefaultMethod(kind: ResolveKindInput): string | null
}
