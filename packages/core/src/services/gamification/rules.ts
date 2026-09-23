// ============================================================================
// services/gamification — rule engine pure core (mod-gamification #48 ① · S2)
//
// DB-free: parse/serialize a rule's [E] JSON columns, evaluate a condition, assemble
// the typed EffectEvent[] a fire dispatches, and derive the rule→rule dependency edges
// the acyclicity guard checks. A rule = an ADR-011 binding (condition) + typed ADR-004
// consequence effects (GM-2). The service (service.ts) owns persistence, the balance
// clamp, the capability envelope check, and dispatchConsequence.
// ============================================================================

import type { z } from 'zod'
import type { Binding } from '../../foundation/measurement'
import type { EffectEvent } from '../../foundation/effects'
import type { RuleRow } from '../../db/schema/foundation/economy'
import {
  RuleConditionSchema,
  ConsequenceSpecSchema,
} from '../../validators/gamification'

export type RuleCondition = z.infer<typeof RuleConditionSchema>
export type ConsequenceSpec = z.infer<typeof ConsequenceSpecSchema>

/** The parsed rule domain shape the surface returns (condition_ref + consequences JSON decoded). */
export interface Rule {
  id: string
  name: string
  condition: RuleCondition
  consequences: ConsequenceSpec[]
  grantId: string | null
  isEnabled: boolean
  created_at: number
  updated_at: number
}

/** The execution context a feeder/sweep supplies. `occasion` is the idempotency token for a
 *  recurring derived_pull fire (default 'once' → the rule fires at most once per rule#index). */
export interface RuleContext {
  subjectId: string
  event?: { type: string; targetRef?: string; value?: number }
  occasion?: string
}

export interface ExecutionResult {
  ruleId: string
  /** The rule triggered this call (condition met + consequences dispatched). False → see `reason`. */
  fired: boolean
  reason?: 'disabled' | 'condition_not_met' | 'unmeasured'
  /** Effects NEWLY applied on the rail — an idempotent replay or a fully-clamped lock reports 0, so a
   *  downstream counter (journal / achievement / level-up) never double-counts (R1). */
  effectsFired: number
  clamped: boolean
}

/** Row → parsed Rule (condition_ref + consequences are [E] JSON-as-TEXT; validated on decode). */
export function parseRule(row: RuleRow): Rule {
  return {
    id: row.id,
    name: row.name,
    condition: RuleConditionSchema.parse(JSON.parse(row.condition_ref)),
    consequences: z_parseConsequences(row.consequences),
    grantId: row.grant_id ?? null,
    isEnabled: row.is_enabled,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }
}

function z_parseConsequences(raw: string): ConsequenceSpec[] {
  const arr = JSON.parse(raw) as unknown[]
  return arr.map((c) => ConsequenceSpecSchema.parse(c))
}

export function serializeCondition(condition: RuleCondition): string {
  return JSON.stringify(condition)
}
export function serializeConsequences(consequences: ConsequenceSpec[]): string {
  return JSON.stringify(consequences)
}

/** Evaluate a rule's condition. event_trigger matches the incoming event type; derived_pull reads a
 *  measurement source (null = unmeasured → does not fire) and compares to the threshold. */
export function evaluateCondition(
  rule: Rule,
  ctx: RuleContext,
  query: (key: string) => number | null,
): { met: boolean; unmeasured?: boolean } {
  const c = rule.condition
  if (c.kind === 'event_trigger') return { met: ctx.event?.type === c.eventType }
  const value = query(c.measureKey)
  if (value == null) return { met: false, unmeasured: true }
  const met = c.operator === 'gte' ? value >= c.threshold : c.operator === 'lte' ? value <= c.threshold : value === c.threshold
  return { met }
}

/** Assemble one EffectEvent per consequence. The transition is deterministic per (rule, occasion, index)
 *  so a replay of the same firing dedups on the rail, but two same-type consequences in one rule get
 *  DISTINCT effect_event_ids (else the ledger UNIQUE(effect_event_id,kind,target_ref) would collapse them). */
export function buildEffectEvents(rule: Rule, ctx: RuleContext): EffectEvent[] {
  const occasion = ctx.occasion ?? ctx.event?.targetRef ?? 'once'
  return rule.consequences.map((c, i) => ({
    subjectNaturalKey: ctx.subjectId,
    transition: `${rule.id}:${occasion}#${i}`,
    effectType: c.effectType,
    targetRef: c.targetRef ?? ctx.subjectId,
    payload: c.payload as Record<string, unknown> | undefined,
  }))
}

/** The rule→rule dependency edges for the acyclicity guard: a producer rule (whose grant/lock consequence
 *  writes currency X) feeds any consumer rule whose derived_pull condition reads measure X. A cycle here is
 *  a rule whose consequence feeds its own condition — an infinite reward loop (GM-2 / measurement §3.7). */
export function rulesToBindings(rules: Rule[]): Binding[] {
  const edges: Binding[] = []
  for (const consumer of rules) {
    if (consumer.condition.kind !== 'derived_pull') continue
    const measure = consumer.condition.measureKey
    for (const producer of rules) {
      const produces = producer.consequences.some(
        (c) =>
          (c.effectType === 'grant_currency' || c.effectType === 'lock_currency') &&
          c.payload.currencyId === measure,
      )
      if (produces) {
        edges.push({
          mode: 'derived-pull',
          source: { type: 'rule', id: producer.id },
          target: { type: 'rule', id: consumer.id },
        })
      }
    }
  }
  return edges
}
