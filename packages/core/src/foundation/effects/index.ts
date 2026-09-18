// Foundation substrate: the effect rail (AR-7 Increment 1 · ADR-004 §3.2.5 / F1).
// Exactly-once guarded-write: applied_effects dedup ledger + deterministic
// effect_event_id + one-handler-per-type registry + idempotent applyEffect dispatch.
// Ships the rail structure; per-module handlers register into the empty seam later.
export * from './types'
export * from './event-id'
export { createEffectRegistry, type EffectRegistry } from './registry'
export { createEffectRail, type EffectRail } from './service'
// XS-effect-rail #32 (XCU-22) — fire-time validation gate.
export { assertEffectPermitted, EffectConsentMissing, type FireGateContext } from './gate'
