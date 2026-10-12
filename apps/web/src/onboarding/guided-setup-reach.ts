// fe-onboarding (LIF-216) · S4 — the guided-setup capability's reach registration (EC-1, the ≥2-reachable-paths floor).
// Guided setup is reached from TWO distinct paths (envision EC-1): (a) the post-first-run INVITATION offered at the
// onboarding completion handoff → a `link` into the flow; (b) the shipped `EmptyState.guidedSetup` slot on empty module
// surfaces → `contextual` (the canonical contextual reach, reachability-registry.ts). Two DISTINCT ReachPath values, so
// the registry's dedupe keeps both → the ≥2 floor is met (the registry test asserts it; a 1-path capability fails CI).
import { createReachabilityRegistry, type ReachabilityRegistry } from '../reach/reachability-registry'

/** The capability id for the guided-setup flow (reach-registry key). */
export const GUIDED_SETUP_CAPABILITY = 'guided-setup'

/** Build the guided-setup reach registry with both shipped paths registered. The ≥2-path floor is a dev/CI invariant. */
export function createGuidedSetupReach(): ReachabilityRegistry {
  const registry = createReachabilityRegistry()
  registry.register(GUIDED_SETUP_CAPABILITY, 'link') // (a) post-first-run invitation CTA
  registry.register(GUIDED_SETUP_CAPABILITY, 'contextual') // (b) EmptyState.guidedSetup slot on empty surfaces
  return registry
}
