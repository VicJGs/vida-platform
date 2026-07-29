// Foundation substrate: Views base (AR-6 · ADR-007).
// One saved-view primitive (filter × layout × grouping) + the read-provider
// seam (V4/R7) + the resolution engine (V3/V5). Ships with an empty provider
// registry; modules register their read APIs per-module at build.
export * from './types'
export * from './provider-registry'
export * from './engine'
export * from './service'
