// ============================================================================
// Composition seams — barrel · fe-codec-seams #13 (the apps/web plane).
//
// ONE import site for the composition-primitive consumption adapters the shells
// and module ②-tracks drive (#19/#20/#27+). This barrel re-exports the two
// shipped read-consumption adapters — it RATIFIES them as #13's seam surface, it
// does not re-author them (BR-S1-2):
//   • SavedView seam  (ADR-007)  → ../collection/adapter  (fe-codec-collection S3)
//   • Capability/Block seam (ADR-008, standalone) → ../dashboard/adapter (fe-codec-dashboard S2)
//
// Ships TYPE + CONVENTION only — no live hook / service instantiation (IR-1/H4).
// The live main-thread service bootstrap (over the worker-db Drizzle-proxy) is
// doc-homed to UI-3/first-consumer; the consumption conventions (ReadProvider
// registration · offered-set→add-menu · service access) live in ./CLAUDE.md.
// The Template + Spaces portability seams land in S2.
// ============================================================================

export * from '../collection/adapter'
export * from '../dashboard/adapter'
