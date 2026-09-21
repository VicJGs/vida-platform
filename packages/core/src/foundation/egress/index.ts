// Foundation substrate: the egress guard (XS-egress-guard #43 · ADR-014 §3.3 · XCU-06/08).
// Per-target consent + union-of-consents + audit + never-auto-transmit over the capability
// enforcer's external_out boolean (#31). Decides + records; holds no credentials, makes no
// network call. No schema at M1 — the durable audit + per-target-consent store is M2 (the ports).
export * from './types'
export { createEgressGuard } from './service'
