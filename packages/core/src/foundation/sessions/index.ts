// Foundation substrate: Sessions base (AR-5 · ADR-004).
// The Integration-Contract types + the thin sub-type registry.
export * from './types'
export * from './registry'
// XS-effect-rail #32 (XCU-10) — attachment resolution (read-side).
export { resolveTargets, type ResolvedTarget } from './attachments'
// XS-effect-rail #32 (XCU-09) — lifecycle transition engine + fire step.
export {
  transition,
  fireCompletionEffects,
  InvalidTransition,
  type TransitionDeps,
  type TransitionResult,
} from './lifecycle'
