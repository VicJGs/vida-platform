// ============================================================================
// foundation/measurement — types (AR-7 Increment 3 · ADR-011)
//
// The universal measurability CONTRACT: measurement_kind + binding_mode, the
// Pursuable contract, the Binding type (owned here so economy's rules reuse it),
// and typed errors. Contract + pure engine only — measurement owns NO tables
// (§3.8): measurement_kind/binding_mode are per-entity COLUMNS (per-module, DB-4),
// contributions is Purpose-domain, progress is derived-on-read (never stored).
// ============================================================================

import type { MeasurementKind, BindingMode } from '@vida/types'
export type { MeasurementKind, BindingMode }

// §3.4 — every pursuable entity declares its kind + computes progress() in [0,1] (or null = unmeasured).
export interface Pursuable {
  measurement_kind: MeasurementKind
  progress(): number | null
}

// A binding edge: source feeds target. The TYPE is contract (owned here); binding
// STORAGE (columns on pursuable entities) defers to DB-4. Economy's rule conditions
// + consequence-cycle edges reuse this exact shape (ADR-012 extends §3.7).
export interface EntityRef {
  type: string
  id: string
}
export interface Binding {
  mode: BindingMode
  source: EntityRef
  target: EntityRef
}

// §3.1 — the per-kind normalization inputs (discriminated union).
export type NormalizeInput =
  | { kind: 'quantitative'; current: number; baseline: number; target: number; isHigherBetter: boolean }
  | { kind: 'milestone'; done: boolean }
  | { kind: 'milestone'; nDone: number; n: number }
  | { kind: 'rate'; value: number }
  | { kind: 'qualitative'; rating?: number; scaleMax?: number }

export class MeasurementCycle extends Error {
  constructor(detail: string) {
    super(`Binding graph has a cycle: ${detail}`)
    this.name = 'MeasurementCycle'
  }
}
