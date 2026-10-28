// ============================================================================
// Templates — canonical domain types  (XS-templates #36 · ADR-009)
//
// A Template is a portable seed bundle instantiated by FORK (deep copy, no live
// link). This file holds only the SHARED VOCABULARY the templates engine slices
// (S2–S5) rest on: the instantiation terminal-state tuple and the bundle
// ENVELOPE. The bundle's per-member SERIALIZATION is NOT designed here — ADR-009
// fixes the 5-member envelope but defers detailed serialization to build-time
// (ADR-009:112-115), authored in S3's serializer. Each member is therefore an
// opaque authored-JSON placeholder (`unknown`) at this layer.
// ============================================================================

/** Instantiation terminal states — FIXED (ADR-009:108-110). Declared,
 *  degrade-never-crash: a bundle referencing a capability absent on this device
 *  seeds what it can and flags the rest (`partial-failure`), never throws. */
export const INSTANTIATION_STATUS = ['in-progress', 'success', 'partial-failure'] as const
export type InstantiationStatus = (typeof INSTANTIATION_STATUS)[number]

/** The portable seed bundle ENVELOPE — the 5 FIXED members (ADR-009:46-50 §3.1).
 *  Contents are opaque authored JSON here; S3's capture serializer defines each
 *  member's concrete wire shape at build-time from the live Spaces/Views/
 *  Capability reads, and `seed_entities` is resolved per owning-module build
 *  (the write-seam). Typing members `unknown` is the No-Guessing-correct stop —
 *  the bundle is a document, never a live graph of FKs into the vault. */
export interface TemplateBundle {
  /** authored root tag (+ nested); shape → S3 serializer (a Space's root_tag). */
  root_tag: unknown
  /** per-module authored seeds; shape → owning-module build (write-seam). */
  seed_entities: unknown[]
  /** authored views (ADR-007); shape → S3 serializer. */
  views: unknown[]
  /** the offered-capability palette + config (= a Space's `space_enabled_blocks`,
   *  ADR-006 §3.4 / ADR-008); shape → S3 serializer. */
  enabled_blocks: unknown
  /** nested Space structure (ADR-006); shape → S3 serializer. */
  child_structure?: unknown
}
