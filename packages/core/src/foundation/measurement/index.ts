// Foundation substrate: the measurability engine (AR-7 Increment 3 · ADR-011).
// Contract + pure engine, NO tables (§3.8): measurement_kind/binding_mode, the
// Pursuable + Binding contracts, normalize/rollup/resolveProgress, assertAcyclic
// DAG guard, and the (empty) measurement-source read seam. Per-entity columns,
// contributions (Purpose-domain), and real sources are homed downstream (DF-12).
export * from './types'
export * from './engine'
export * from './source-registry'
