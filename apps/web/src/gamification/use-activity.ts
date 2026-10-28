// ============================================================================
// useActivity — the Activity mode DATA seam (fe-gamification ② · S5 · EC-8).
//
// The consequence-ledger HISTORY: every earn / lock / spend / distribute across
// the modules, reverse-chronological, paginated 50/page. TYPE-correct against the
// INTENDED ① read, data STUBBED (IR-G1) — the honest M1 default is EMPTY (a fresh
// System has no ledger rows yet → the 8-state `empty`, a teaching line, no dead
// affordance).
//
// ⚠ There is NO ledger-history read in the shipped ① seam (seam-contract.md exposes
// only getBalance/getBalances, which read consequence_ledger PRIVATELY inside
// computeBalance). "S5 Activity owns the ledger" (currencies-mode.tsx:26,
// CLAUDE.md:50). The enriched read is an UNBUILT ①-tier first-consumer-pull seam —
// filed F-S5-1. Live swap (one binding, zero signature change) once it lands:
//   const page = useQuery(
//     ['gamification','activity', pageIndex],
//     () => svc.listConsequences({ offset: pageIndex * PAGE_SIZE, limit: PAGE_SIZE }),
//   )   // → { entries: ActivityEntry[]; total: number }
// Every shape here maps to a real `consequence_ledger` column (economy.ts:36-52), so
// the swap changes only this file.
//
// DEV gates (off in prod): `?sample` populates a multi-page ledger; `?force=loading|error|empty`.
// ============================================================================
import { useMemo, useState } from 'react'
import type { ConsequenceKind } from '@vida/types'
import { deriveInteractionState, type InteractionState } from '../state-conventions/interaction-state'
import { PAGE_SIZE } from './use-currencies'

export { PAGE_SIZE }

/**
 * One consequence-ledger event (the row the history renders). Each field maps to a real
 * `consequence_ledger` column `[FACT: db/schema/foundation/economy.ts:36-52]` — so the live
 * read is a drop-in. Amount is a POSITIVE magnitude; direction is the `kind` (BR-S5-3 — the UI
 * renders a label + glyph, never an asserted ± sign: `current = earned − locked − spent`, and
 * `distribute` draws the to-distribute ceiling, not `current`, per balance.ts).
 */
export interface ActivityEntry {
  /** consequence_ledger.id */
  id: string
  /** consequence_ledger.created_at (Unix ms) — the "timestamped" of EC-8. */
  at: number
  /** consequence_ledger.kind — 'earn' | 'lock' | 'spend' | 'distribute'. */
  kind: ConsequenceKind
  /** Positive magnitude (consequence_ledger.amount). */
  amount: number
  /** consequence_ledger.currency_id (→ currencies.code). */
  currencyCode: string
  /** Display name resolved from the currency def; absent ⇒ the row falls back to the code. */
  currencyName?: string
  /** consequence_ledger.target_ref — the "across modules" origin, shown as a quiet chip. */
  source: string
}

export interface ActivityData {
  /** The CURRENT page of entries, newest first. */
  entries: readonly ActivityEntry[]
  /** Total events across all pages (the collection count). */
  total: number
  state: InteractionState
  page: { index: number; size: number; count: number }
  setPage: (index: number) => void
  /** The reference instant relative labels compute against (sample = a fixed ref so the Gate is deterministic). */
  now: number
}

// --- the honest M1 default: an empty ledger (a fresh System has earned nothing yet) -----------------
const DEFAULT_ENTRIES: readonly ActivityEntry[] = []

// --- DEV/gate sample (never shipped live): a deterministic, multi-page descending ledger -------------
// A fixed "now" so `?sample` renders byte-identical for the Visual Gate.
const SAMPLE_NOW = Date.UTC(2026, 9, 14, 18, 0, 0) // 2026-10-14 18:00 UTC

const SAMPLE_KINDS: readonly ConsequenceKind[] = ['earn', 'spend', 'lock', 'distribute']
const SAMPLE_CURRENCIES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'XP', name: 'Experience' },
  { code: 'COIN', name: 'Allowance' },
  { code: 'FOCUS', name: 'Focus Hours' },
]
const SAMPLE_SOURCES: readonly string[] = [
  'Habits · Morning run',
  'Tasks · Ship the report',
  'Study · Deep work block',
  'Routines · Evening wind-down',
  'Purposes · Marathon fund',
]

// 64 events (> PAGE_SIZE) so the Gate exercises the multi-page pager; strictly descending `at`.
// The `!` below are provably-safe modulo-indexes into fixed non-empty arrays (safe under noUncheckedIndexedAccess) —
// the shipped S2 sample-builder precedent (use-currencies.ts:81).
const SAMPLE_ENTRIES: readonly ActivityEntry[] = Array.from({ length: 64 }, (_, i) => {
  const cur = SAMPLE_CURRENCIES[i % SAMPLE_CURRENCIES.length]!
  return {
    id: `act-${i}`,
    at: SAMPLE_NOW - i * 3_600_000 - (i % 5) * 600_000, // ~hourly, strictly descending
    kind: SAMPLE_KINDS[i % SAMPLE_KINDS.length]!,
    amount: 10 + ((i * 7) % 90),
    currencyCode: cur.code,
    currencyName: cur.name,
    source: SAMPLE_SOURCES[i % SAMPLE_SOURCES.length]!,
  }
})

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

export function useActivity(): ActivityData {
  const forced = forcedState()
  const [index, setIndex] = useState(0)

  const sampling = forced !== 'empty' && devFlag('sample')
  const all = forced === 'empty' ? DEFAULT_ENTRIES : sampling ? SAMPLE_ENTRIES : DEFAULT_ENTRIES
  const now = sampling ? SAMPLE_NOW : Date.now()

  const total = all.length
  const count = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pageIndex = Math.min(index, count - 1)
  const entries = useMemo(() => all.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE), [all, pageIndex])

  const state: InteractionState =
    forced === 'loading' || forced === 'error'
      ? forced
      : deriveInteractionState({ isPending: false, isError: false, data: all }, (d) => d.length === 0)

  return {
    entries,
    total,
    state,
    page: { index: pageIndex, size: PAGE_SIZE, count },
    setPage: setIndex,
    now,
  }
}
