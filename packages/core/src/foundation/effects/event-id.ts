// ============================================================================
// foundation/effects — deterministic effect identity (AR-7 · BR-2)
// ============================================================================

import type { EffectType } from '@vida/types'

/**
 * Deterministic `effect_event_id = derive(subject_natural_key ‖ transition ‖ effect_type)`
 * (ADR-004 §3.2.5-B.1 / F1 §3B). Same inputs → same id on any device, so a replay or a
 * second device originating the same outcome converges (BR-2 / cross-device convergence key).
 *
 * FORM: a canonical string. The ADRs place the derive() HASH at build-phase (ADR-011 §3.8),
 * so the rail commits only the determinism the contract requires — hashing later is a
 * representation-only compaction, not a semantic change.
 *
 * INVARIANT: `|` is the reserved separator. Every input component is a UUIDv7 TEXT id or a
 * `YYYY-MM-DD` calendar date (project conventions) — none contains `|`, so the join is
 * unambiguous. Do NOT pass values that may contain `|` without revisiting this.
 */
export function deriveEffectEventId(subjectNaturalKey: string, transition: string, effectType: EffectType): string {
  return `${subjectNaturalKey}|${transition}|${effectType}`
}
