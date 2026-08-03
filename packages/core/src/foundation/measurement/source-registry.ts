// ============================================================================
// foundation/measurement — the measurement-source READ seam (AR-7 · ADR-011 §3.6)
//
// A module ADVERTISES a queryable measure (net_worth ← Finance, streak ← Habits, …);
// a `derived-pull` measurable reads it here. A read contract (advertise + query),
// no direct table access (INT-1). Ships EMPTY — real sources are advertised by their
// modules at build (first-consumer-pull). An unadvertised key yields null (unmeasured),
// never a fabricated value; outage → last-known + flag is runtime (deferred).
// ============================================================================

export type MeasurementSourceResolver = () => number | null

export interface MeasurementSourceRegistry {
  /** A module advertises a queryable measure by key (e.g. 'net_worth'). */
  advertise(key: string, resolver: MeasurementSourceResolver): void
  /** Read a source; an unadvertised key ⇒ null (unmeasured), never fabricated. */
  query(key: string): number | null
  has(key: string): boolean
}

export function createMeasurementSourceRegistry(): MeasurementSourceRegistry {
  const sources = new Map<string, MeasurementSourceResolver>()
  return {
    advertise(key, resolver) {
      sources.set(key, resolver)
    },
    query(key) {
      const resolver = sources.get(key)
      return resolver ? resolver() : null
    },
    has(key) {
      return sources.has(key)
    },
  }
}
