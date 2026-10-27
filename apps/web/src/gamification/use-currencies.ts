// ============================================================================
// useCurrencies — the Currencies mode DATA seam (fe-gamification ② · S2 · EC-5).
//
// ALL currencies grouped by the 3 backing kinds (real-money · measured-time · self-granted), each with its
// derived balance; paginated 50/page; a `+ New currency` entry (optimistic-local at M1). TYPE-correct against
// the shipped ① seam (`listCurrencies()` × `getBalances()`), data STUBBED (IR-G1). The honest M1 default is the
// shipped XP currency (SHIPPED_CURRENCIES = [XP]) at a zero balance — a fresh System already has XP, so the
// surface is `success`, not empty.
//
// Live swap (one binding, zero signature change):
//   const defs = useQuery(['gamification','currencies'], () => svc.listCurrencies())
//   const bals = useQuery(['gamification','balances'],   () => svc.getBalances())
//   create → svc.defineCurrency(input).then(refetch)   // the ① write (thin-BUILD: re-reads via list())
// Pagination is a UI slice over the flat list (the seam returns all; cursor paging is a forward concern).
//
// DEV gates (off in prod): `?sample` populates a multi-kind System; `?force=loading|error|empty`.
// ============================================================================
import { useMemo, useState } from 'react'
import type { CurrencyBalance, CurrencyDef } from '@vida/core'
import type { CurrencyBackingKind } from '@vida/types'
import { deriveInteractionState, type InteractionState } from '../state-conventions/interaction-state'

export const PAGE_SIZE = 50

/** One currency + its derived balance (the `listCurrencies` × `getBalances` join a row renders). */
export interface CurrencyLine {
  def: CurrencyDef
  balance: CurrencyBalance
}

/** A backing-kind section — the stable taxonomy the list groups by (EC-5). */
export interface CurrencyGroup {
  kind: CurrencyBackingKind
  label: string
  lines: readonly CurrencyLine[]
}

export interface CurrenciesData {
  /** The current page, grouped by backing kind (only non-empty groups, in the canonical kind order). */
  groups: readonly CurrencyGroup[]
  /** Total currencies across all pages (the collection count). */
  total: number
  state: InteractionState
  page: { index: number; size: number; count: number }
  setPage: (index: number) => void
  /** `+ New currency` — optimistic-local at M1 (the notifications lifecycle precedent); swaps to `defineCurrency`. */
  create: (input: { name: string; backing_kind: CurrencyBackingKind }) => void
}

/** The canonical backing-kind order + labels (EC-5 "real-money · measured-time · self-granted allowance"). */
const KIND_ORDER: readonly CurrencyBackingKind[] = ['real-money', 'measured-time', 'self-granted']
const KIND_LABEL: Record<CurrencyBackingKind, string> = {
  'real-money': 'Real money',
  'measured-time': 'Measured time',
  'self-granted': 'Self-granted',
}

function zeroBalance(): CurrencyBalance {
  return { earned: 0, locked: 0, spent: 0, distributed: 0, current: 0, toDistribute: null }
}

// --- the honest M1 default: the shipped XP currency at zero (SHIPPED_CURRENCIES = [XP]) --------------
const DEFAULT_LINES: readonly CurrencyLine[] = [
  { def: { code: 'XP', name: 'Experience', backing_kind: 'self-granted', unit: 'xp' }, balance: zeroBalance() },
]

// --- DEV/gate sample (never shipped live) -----------------------------------------------------------
function bal(earned: number, locked: number, spent: number, distributed = 0): CurrencyBalance {
  return { earned, locked, spent, distributed, current: earned - spent - locked - distributed, toDistribute: null }
}
const SAMPLE_LINES: readonly CurrencyLine[] = [
  { def: { code: 'XP', name: 'Experience', backing_kind: 'self-granted', unit: 'xp' }, balance: bal(4120, 0, 0) },
  { def: { code: 'COIN', name: 'Allowance', backing_kind: 'self-granted', unit: 'coin' }, balance: bal(240, 50, 90) },
  {
    def: { code: 'FOCUS', name: 'Focus Hours', backing_kind: 'measured-time', unit: 'min' },
    balance: bal(1860, 120, 600),
  },
  { def: { code: 'DEEP', name: 'Deep Work', backing_kind: 'measured-time', unit: 'min' }, balance: bal(900, 0, 300) },
  {
    def: { code: 'BRL', name: 'Reward Fund', backing_kind: 'real-money', unit: 'cents' },
    balance: bal(50000, 10000, 15000),
  },
]

// a >50 set so the Visual Gate can exercise the multi-page pager (120 currencies across the 3 kinds).
const BIG_SAMPLE: readonly CurrencyLine[] = Array.from({ length: 120 }, (_, i) => ({
  def: { code: `CUR${i}`, name: `Currency ${i + 1}`, backing_kind: KIND_ORDER[i % 3]!, unit: 'pt' },
  balance: bal(i * 10, i % 4 === 0 ? i * 2 : 0, i % 3 === 0 ? i : 0),
}))

function devFlag(name: string): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has(name)
  )
}
function forcedState(): InteractionState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const f = new URLSearchParams(window.location.search).get('force')
  return f === 'loading' || f === 'error' || f === 'empty' ? f : null
}

/** Group a page's lines into the non-empty backing-kind sections, in the canonical order. */
function groupByKind(lines: readonly CurrencyLine[]): CurrencyGroup[] {
  return KIND_ORDER.map((kind) => ({
    kind,
    label: KIND_LABEL[kind],
    lines: lines.filter((l) => l.def.backing_kind === kind),
  })).filter((g) => g.lines.length > 0)
}

export function useCurrencies(): CurrenciesData {
  const forced = forcedState()
  // optimistic-local additions (the `+ New currency` entry; session-only at M1 — never a faked persist).
  const [added, setAdded] = useState<readonly CurrencyLine[]>([])
  const [index, setIndex] = useState(0)

  const base = forced === 'empty' ? [] : devFlag('big') ? BIG_SAMPLE : devFlag('sample') ? SAMPLE_LINES : DEFAULT_LINES
  const all = useMemo(() => [...base, ...added], [base, added])

  const total = all.length
  const count = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageIndex = Math.min(index, count - 1)
  const pageLines = all.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE)
  const groups = useMemo(() => groupByKind(pageLines), [pageLines])

  const state: InteractionState =
    forced === 'loading' || forced === 'error'
      ? forced
      : deriveInteractionState({ isPending: false, isError: false, data: all }, (d) => d.length === 0)

  return {
    groups,
    total,
    state,
    page: { index: pageIndex, size: PAGE_SIZE, count },
    setPage: setIndex,
    create: ({ name, backing_kind }) => {
      const code =
        name
          .trim()
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, '_')
          .slice(0, 12) || `CUR_${total}`
      setAdded((prev) => [...prev, { def: { code, name: name.trim(), backing_kind }, balance: zeroBalance() }])
    },
  }
}
