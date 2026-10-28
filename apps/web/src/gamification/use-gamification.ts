// ============================================================================
// useGamification — the gamification Overview DATA seam (fe-gamification ② · S1).
// The notes-surface / notifications precedent: M1 returns the honest DEFAULT (a
// fresh System — level 1, no currencies, no unlocks); the live swap is drop-in,
// zero signature change.
//
// TYPE-CORRECT against the shipped ① `GamificationService` (seam-contract.md), data
// STUBBED (IR-G1 — the fe-notes data-plane gap: `live blocked by the worker-RPC
// Drizzle values seam + no composition root`). Every shape here is exactly what the
// service op returns, so the live swap changes only this file:
//
//   const svc = useGamificationService()                            // composition root (deferred)
//   const profile  = useQuery({ queryKey:['gamification','profile'],  queryFn:() => svc.getProfile() })
//   const level    = useQuery({ queryKey:['gamification','level'],    queryFn:() => svc.getLevel('XP') })
//   const balances = useQuery({ queryKey:['gamification','balances'], queryFn:() => svc.getBalances() })
//   const currencies = useQuery({ queryKey:['gamification','currencies'], queryFn:() => svc.listCurrencies() })
//   const unlocks  = useQuery({ queryKey:['gamification','unlocks'],   queryFn:() => svc.getUserAchievements() })
//   // the XP-to-next band (nextLevelAt/fraction) is the curve's — `requiredXpForLevel(level+1)` over the
//   // service level; it is level MATH (IR-G3), so it rides the service's deriveLevel/getLevel, NEVER the UI.
//
// A DEV-ONLY `?sample` renders a populated System for the blocking Visual Gate; `?force=loading|error`
// reaches the two terminal states the honest-empty seam can't otherwise produce. Both off in production.
// ============================================================================
import type { CurrencyBalance, CurrencyDef, GamificationProfile, LevelInfo } from '@vida/core'
import type { Achievement } from '@vida/types'
import { deriveInteractionState, type InteractionState } from '../state-conventions/interaction-state'

/** One currency + its live-derived balance (the `listCurrencies` × `getBalances` join the Overview renders). */
export interface CurrencyLine {
  def: CurrencyDef
  balance: CurrencyBalance
}

/** A recently-earned achievement (the `listAchievements` × `getUserAchievements` join). */
export interface RecentUnlock {
  achievement: Achievement
  earnedAt: number
}

/**
 * The level hero's shape (EC-4). `info` is the service's `LevelInfo` (level + title, GM-14); `total` is the
 * currency's lifetime `earned`; `nextLevelAt`/`fraction` are the XP-to-next band — the CURVE's derivation
 * (`requiredXpForLevel`), carried as data here (the UI does no level math, IR-G3). `nextLevelAt === null` = max band.
 */
export interface LevelProgress {
  info: LevelInfo
  total: number
  nextLevelAt: number | null
  fraction: number
}

/** The glanceable System hub (EC-4): level + XP-to-next, currency balances, recent unlocks. */
export interface GamificationOverview {
  profile: GamificationProfile | null
  level: LevelProgress
  balances: readonly CurrencyLine[]
  recentUnlocks: readonly RecentUnlock[]
}

export interface GamificationData {
  overview: GamificationOverview
  /** The surface's 8-state (collapsed to a terminal rendering by the surface). */
  state: InteractionState
  /** The reference instant "recent" labels compute against (sample = a fixed ref so the Gate is deterministic). */
  now: number
}

// --- the honest M1 default (a fresh System) ------------------------------------------------------
const FRESH_LEVEL: LevelProgress = {
  info: { level: 1, title: 'Novice' },
  total: 0,
  nextLevelAt: 100, // requiredXpForLevel(2) = 100·(2−1)² (GM-14 curve); the service supplies it live
  fraction: 0,
}

const EMPTY_OVERVIEW: GamificationOverview = {
  profile: null,
  level: FRESH_LEVEL,
  balances: [],
  recentUnlocks: [],
}

// --- DEV/gate sample (never shipped live) --------------------------------------------------------
const NOW_REF = 1_760_000_000_000 // fixed reference so the gate is deterministic (no Date.now() in a module)

function bal(earned: number, locked: number, spent: number): CurrencyBalance {
  return { earned, locked, spent, distributed: 0, current: earned - spent - locked, toDistribute: null }
}

function ach(
  key: string,
  category: Achievement['category'],
  tier: Achievement['tier'],
  title: string,
  xp: number,
): Achievement {
  return {
    id: `a-${key}`,
    key,
    category,
    tier,
    title,
    description: null,
    icon: null,
    xp_reward: xp,
    condition: null,
    is_secret: false,
    created_at: NOW_REF - 30 * 86_400_000,
  }
}

const SAMPLE_OVERVIEW: GamificationOverview = {
  profile: null,
  // level 7 Adept: requiredXpForLevel(7)=100·36=3600, next (8)=100·49=4900; 4120 earned → 520/1300 into the band.
  level: { info: { level: 7, title: 'Adept' }, total: 4120, nextLevelAt: 4900, fraction: 520 / 1300 },
  balances: [
    { def: { code: 'XP', name: 'Experience', backing_kind: 'self-granted', unit: 'xp' }, balance: bal(4120, 0, 0) },
    {
      def: { code: 'FOCUS', name: 'Focus Hours', backing_kind: 'measured-time', unit: 'min' },
      balance: bal(1860, 120, 600),
    },
    { def: { code: 'COIN', name: 'Allowance', backing_kind: 'self-granted', unit: 'coin' }, balance: bal(240, 50, 90) },
  ],
  recentUnlocks: [
    { achievement: ach('streak-7', 'habits', 'silver', 'Seven-day streak', 150), earnedAt: NOW_REF - 5 * 3_600_000 },
    {
      achievement: ach('first-focus', 'learning', 'bronze', 'First focus session', 50),
      earnedAt: NOW_REF - 3 * 86_400_000,
    },
  ],
}

function devFlag(name: string): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has(name)
  )
}

/** DEV/gate-only: force a terminal state the honest-empty seam can't otherwise reach (loading/error). Off in prod. */
function forcedState(): InteractionState | null {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return null
  const f = new URLSearchParams(window.location.search).get('force')
  return f === 'loading' || f === 'error' ? f : null
}

/**
 * M1 default (honest-fresh System) + the DEV/gate sample. `state` is derived via the shipped 8-state canon;
 * a fresh System is `success` (the level hero always renders — the hub is never a blank "empty", EC-4), with
 * its empty balances/unlocks sub-regions handled block-locally by the DashboardView composition.
 */
export function useGamification(): GamificationData {
  const forced = forcedState()
  if (forced) return { overview: EMPTY_OVERVIEW, state: forced, now: NOW_REF }
  if (devFlag('sample')) {
    return { overview: SAMPLE_OVERVIEW, state: 'success', now: NOW_REF }
  }
  // Honest default: a fresh System is content (level 1), so the terminal state is `success`, never `empty`.
  const state = deriveInteractionState({ isPending: false, isError: false, data: EMPTY_OVERVIEW }, () => false)
  return { overview: EMPTY_OVERVIEW, state, now: typeof window === 'undefined' ? NOW_REF : Date.now() }
}
