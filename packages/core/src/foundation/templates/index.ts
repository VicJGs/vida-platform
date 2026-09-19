// Foundation substrate: Templates base (XS-templates #36 · ADR-009).
// Portable seed bundles instantiated by FORK (deep copy, no live link). S1 ships
// the shared types + typed errors; S2 the store CRUD; S3–S5 append the capture
// transform, instantiate/fork + write-seam registry, and shipped-asset/preset provider.
export * from './types'
export * from './service'
