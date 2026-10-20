// ============================================================================
// useRules — the Rules mode + authoring-Flow DATA seam (fe-gamification ② · S4 · EC-7/EC-9).
//
// ALL rules + enable/disable/delete + create (the rule-authoring Flow). TYPE-correct against the ① seam
// (`listRules()`/`createRule`/`enableRule`/`disableRule`/`deleteRule`), data STUBBED (IR-G1); mutations are
// optimistic-local at M1 (the notifications lifecycle precedent). Honest M1 default = EMPTY (rules are
// user-authored; none exist until the user creates one).
//
// The Flow's three reads, grounded:
// - `availableMeasures` (condition) — the ADR-011 §3.6 advertised measurement registry. It ships EMPTY and exposes
//   only query(key) (NO enumeration API), so the measure picker is honestly EMPTY at M1 (EC-9 "honest empty-seam");
//   modules advertise measures later (first-consumer-pull). Type-correct shape, empty.
// - `rewardCurrencies` (reward) — from `listCurrencies()` (the grant/lock target); a small stub here.
// - `dreams` (reward earmark, GM-7) — a DENY-SAFE Purposes read (the System never owns Dreams); EMPTY at M1.
//
// Live swap: listRules via React Query; create/toggle/delete → the service ops then refetch. DEV: `?sample`/`?force`.
// ============================================================================
import { useMemo, useState } from 'react'
import type { ConsequenceSpec, Rule, RuleCondition, RuleCreateInput } from '@vida/core'
import type { CurrencyBackingKind } from '@vida/types'
import { deriveInteractionState, type InteractionState } from '../state-conventions/interaction-state'

export interface AvailableMeasure {
  key: string
  label: string
}
export interface RewardCurrency {
  code: string
  name: string
  backing_kind: CurrencyBackingKind
}
export interface DreamTarget {
  id: string
  title: string
}

export interface RulesData {
  rules: readonly Rule[]
  total: number
  state: InteractionState
  /** The advertised measures the condition can watch — EMPTY at M1 (honest empty-seam, EC-9). */
  availableMeasures: readonly AvailableMeasure[]
  /** The grant/lock target currencies (from listCurrencies). */
  rewardCurrencies: readonly RewardCurrency[]
  /** The Dream reward targets (deny-safe Purposes read) — EMPTY at M1. */
  dreams: readonly DreamTarget[]
  toggle: (id: string) => void
  remove: (id: string) => void
  create: (input: RuleCreateInput) => void
}

const NOW_REF = 1_760_000_000_000

function rule(id: string, name: string, condition: RuleCondition, consequences: ConsequenceSpec[], isEnabled: boolean): Rule {
  return { id, name, condition, consequences, grantId: null, isEnabled, created_at: NOW_REF - 86_400_000, updated_at: NOW_REF - 3_600_000 }
}

const SAMPLE_RULES: readonly Rule[] = [
  rule('r-focus', 'Daily focus reward', { kind: 'derived_pull', measureKey: 'focus_minutes', operator: 'gte', threshold: 60 }, [{ effectType: 'grant_currency', payload: { currencyId: 'XP', amount: 50 } }], true),
  rule('r-week', 'Weekly allowance', { kind: 'event_trigger', eventType: 'week.ended' }, [{ effectType: 'grant_currency', payload: { currencyId: 'COIN', amount: 100 } }], false),
]

const REWARD_CURRENCIES: readonly RewardCurrency[] = [
  { code: 'XP', name: 'Experience', backing_kind: 'self-granted' },
  { code: 'COIN', name: 'Allowance', backing_kind: 'self-granted' },
  { code: 'FOCUS', name: 'Focus Hours', backing_kind: 'measured-time' },
]

function devFlag(name: string): boolean {
  return process.env.NODE_ENV !== 'production' && typeof window !== 'undefined' && new URLSearchParams(window.location.search).has(name)
}
function forcedState(): InteractionState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const f = new URLSearchParams(window.location.search).get('force')
  return f === 'loading' || f === 'error' || f === 'empty' ? f : null
}

export function useRules(): RulesData {
  const forced = forcedState()
  const base = forced === 'empty' ? [] : devFlag('sample') ? SAMPLE_RULES : []
  const [overlay, setOverlay] = useState<{ added: Rule[]; toggled: Record<string, boolean>; removed: ReadonlySet<string> }>({ added: [], toggled: {}, removed: new Set() })

  const rules = useMemo(
    () =>
      [...base, ...overlay.added]
        .filter((r) => !overlay.removed.has(r.id))
        .map((r) => (r.id in overlay.toggled ? { ...r, isEnabled: overlay.toggled[r.id]! } : r)),
    [base, overlay],
  )

  const state: InteractionState = forced === 'loading' || forced === 'error' ? forced : deriveInteractionState({ isPending: false, isError: false, data: rules }, (d) => d.length === 0)

  return {
    rules,
    total: rules.length,
    state,
    availableMeasures: [], // honest empty-seam (M1): the registry ships empty + exposes no enumeration (EC-9)
    rewardCurrencies: REWARD_CURRENCIES,
    dreams: [], // deny-safe Purposes read — none at M1
    toggle: (id) => setOverlay((o) => ({ ...o, toggled: { ...o.toggled, [id]: !(rules.find((r) => r.id === id)?.isEnabled ?? false) } })),
    remove: (id) => setOverlay((o) => ({ ...o, removed: new Set(o.removed).add(id) })),
    create: (input) =>
      setOverlay((o) => ({
        ...o,
        added: [...o.added, { id: `r-${Date.now()}`, name: input.name, condition: input.condition, consequences: input.consequences, grantId: null, isEnabled: true, created_at: Date.now(), updated_at: Date.now() }],
      })),
  }
}
