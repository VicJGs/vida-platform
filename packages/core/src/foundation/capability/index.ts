// Foundation substrate: the capability/block registry (AR-7 Increment 2 · ADR-008 + ADR-010).
// CB1 definition registry + block_instances + capability_grants (structure) + a thin
// CapabilityRegistry (shipped code-registered + user persisted). Sandbox/DSL/enforce
// runtime is deferred (#85 CAP-authoring).
export * from './types'
export { createCapabilityRegistry, SHIPPED_CAPABILITIES, type CapabilityRegistry } from './registry'
