// ============================================================================
// foundation/measurement — the measurability engine (AR-7 · ADR-011 §3.1/§3.3/§3.7)
//
// Pure functions: per-kind normalization, the fractal rollup, derive-by-default,
// and the acyclic-binding guard. Basic normalization only — non-linear curves,
// the qualitative status-ladder UI, and the DAG perf-envelope are build-phase.
// ============================================================================

import { type Binding, type EntityRef, type NormalizeInput, MeasurementCycle } from './types'

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n)

// §3.1 — normalize a measurable to [0,1], or null (unmeasured, BR-2). Direction-aware.
export function normalize(input: NormalizeInput): number | null {
  switch (input.kind) {
    case 'quantitative': {
      const { current, baseline, target, isHigherBetter } = input
      const range = isHigherBetter ? target - baseline : baseline - target
      if (range === 0) return current === target ? 1 : 0 // degenerate (baseline == target)
      const raw = isHigherBetter ? (current - baseline) / range : (baseline - current) / range
      return clamp01(raw)
    }
    case 'milestone':
      if ('done' in input) return input.done ? 1 : 0
      return input.n === 0 ? 0 : clamp01(input.nDone / input.n) // n-of-m checklist
    case 'rate':
      return clamp01(input.value)
    case 'qualitative':
      // No scale (or no rating yet) ⇒ unmeasured — NEVER coerced to 0 (BR-2).
      if (input.scaleMax == null || input.rating == null) return null
      return input.scaleMax === 0 ? null : clamp01(input.rating / input.scaleMax)
  }
}

// §3.3 — one weighted rule at every scale. Excludes null-progress children (an
// un-rated goal cannot drag a parent down); NULL/0 weight ⇒ equal-weight; an
// empty/all-null set ⇒ null (unmeasured, consistent with BR-2).
export function rollup(children: { progress: number | null; weight?: number | null }[]): number | null {
  const measured = children.filter((c): c is { progress: number; weight?: number | null } => c.progress !== null)
  if (measured.length === 0) return null
  let wsum = 0
  let psum = 0
  for (const c of measured) {
    const w = c.weight == null || c.weight === 0 ? 1 : c.weight // equal-weight default
    wsum += w
    psum += c.progress * w
  }
  return clamp01(psum / wsum)
}

// §3.2 — derive-by-default: a stored value is an OVERRIDE (NULL ⇒ derive).
export function resolveProgress(stored: number | null, derive: () => number | null): number | null {
  return stored !== null ? stored : derive()
}

// §3.7 — bindings are acyclic. Both mode edge-types count (source → target).
// Economy's consequence→source→condition edges compose into this same guard.
export function assertAcyclic(bindings: Binding[]): void {
  const key = (r: EntityRef): string => `${r.type}:${r.id}`
  const adj = new Map<string, string[]>()
  for (const b of bindings) {
    const s = key(b.source)
    if (!adj.has(s)) adj.set(s, [])
    adj.get(s)!.push(key(b.target))
  }
  const WHITE = 0
  const GRAY = 1
  const BLACK = 2
  const color = new Map<string, number>()
  const path: string[] = []
  const visit = (node: string): void => {
    color.set(node, GRAY)
    path.push(node)
    for (const next of adj.get(node) ?? []) {
      const c = color.get(next) ?? WHITE
      if (c === GRAY) throw new MeasurementCycle([...path, next].join(' → '))
      if (c === WHITE) visit(next)
    }
    color.set(node, BLACK)
    path.pop()
  }
  for (const node of adj.keys()) {
    if ((color.get(node) ?? WHITE) === WHITE) visit(node)
  }
}
