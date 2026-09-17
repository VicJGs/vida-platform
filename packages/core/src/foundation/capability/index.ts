// Foundation substrate: the capability/block registry (AR-7 Increment 2 · ADR-008 + ADR-010).
// CB1 definition registry + block_instances + capability_grants (structure) + a thin
// CapabilityRegistry (shipped code-registered + user persisted). Sandbox/DSL/enforce
// runtime is deferred (#85 CAP-authoring).
export * from './types'
export { createCapabilityRegistry, SHIPPED_CAPABILITIES, type CapabilityRegistry } from './registry'
// XS-capability #31 — enforcement services (S1 decision core + grant reads · S2 grant/revoke).
export {
  createCapabilityEnforcer,
  canonicalEnvelopeHash,
  type CapabilityEnforcer,
} from './enforcer'
// XS-capability #31 — offered-set resolver (S3: per-surface-per-Space palette).
export { createOfferedSetResolver, type OfferedSetResolver } from './offered-set'
