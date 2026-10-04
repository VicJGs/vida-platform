// fe-codec-patterns · S5 — ReachabilityRegistry (the ≥2-reachable-paths floor, as a runtime registry).
// Reconcile: docs/specs/foundation/fe-codec-patterns/s5-conventions.md · interpretation R6 · frontend-quality-bar §2.4.
//
// The CAPABILITY-axis reach registry — the runtime companion to the G4 set-cover gate. A capability must be reachable
// ≥2 ways (a hard floor: a 1-path capability FAILS G4). This is the capability axis (how a thing is reached), distinct
// from nav/module-map.ts's module-level `NavPlacement` (where a module's home sits).
//
// CALL-SITE INTENT: a dev/test/CI invariant assertion — a 1-path capability is a real bug that fails loud in CI. It is
// NOT a per-render guard (don't crash a user's render on it). A factory, not a module-global singleton (testable; the
// AR-4/registry precedent + the factory-service-no-`this` rule).

/** The ways a capability can be reached (quality-bar §2.4). The capability axis — NOT module `NavPlacement`. */
export type ReachPath = 'dock' | 'command-bar' | 'contextual' | 'link' | 'spaces'

/** Thrown by `assertReachable` when a capability is below the ≥2-path floor. Names the capability + its current paths. */
export class UnreachableCapabilityError extends Error {
  constructor(
    readonly capabilityId: string,
    readonly paths: readonly ReachPath[],
  ) {
    super(
      `Capability "${capabilityId}" has ${paths.length} reach path(s) (${paths.join(', ') || 'none'}); ` +
        `the ≥2-reachable-paths floor is unmet (frontend-quality-bar §2.4).`,
    )
    this.name = 'UnreachableCapabilityError'
  }
}

export interface ReachabilityRegistry {
  /** Register one way `capabilityId` is reachable. Idempotent per (capability, path) — paths de-dupe. */
  register(capabilityId: string, path: ReachPath): void
  /** The distinct reach paths registered for a capability (deduped). */
  getReach(capabilityId: string): readonly ReachPath[]
  /** Non-throwing probe: has the capability ≥2 distinct reach paths? */
  isReachable(capabilityId: string): boolean
  /** Fail-loud invariant assertion (dev/test/CI): throws `UnreachableCapabilityError` below the ≥2 floor. */
  assertReachable(capabilityId: string): void
}

export function createReachabilityRegistry(): ReachabilityRegistry {
  const paths = new Map<string, Set<ReachPath>>()

  // Hoisted to a closure (NOT `this.` — the factory-object consumption shape, factory-service rule).
  const reachOf = (capabilityId: string): Set<ReachPath> => paths.get(capabilityId) ?? new Set()

  return {
    register(capabilityId, path) {
      const set = paths.get(capabilityId) ?? new Set<ReachPath>()
      set.add(path)
      paths.set(capabilityId, set)
    },
    getReach(capabilityId) {
      return [...reachOf(capabilityId)]
    },
    isReachable(capabilityId) {
      return reachOf(capabilityId).size >= 2
    },
    assertReachable(capabilityId) {
      const set = reachOf(capabilityId)
      if (set.size < 2) throw new UnreachableCapabilityError(capabilityId, [...set])
    },
  }
}
