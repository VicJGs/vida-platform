// foundation/review — the generic review engine (ADR-005 · mod-knowledge #50 ① · S3).
// Scheduling substrate: methods (capability-registry partition), curves, bindings.
// Cross-consumed (flashcards S7 + future skills/languages/education) — homes to foundation (D1).
export { createReviewEngine } from './engine'
export {
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
