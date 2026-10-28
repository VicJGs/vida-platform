// ============================================================================
// useAchievements — the Achievements mode DATA seam (fe-gamification ② · S3 · EC-6).
//
// ALL achievements by category × tier, earned + locked + progress. TYPE-correct against the ① seam
// (`listAchievements()` [static seed, read-only] × `getUserAchievements()` [earned, with partial progress]),
// data STUBBED (IR-G1). Honest M1 default = EMPTY (nothing is seeded until the app init calls `seedAchievements`
// — no composition root yet), so the surface shows the teaching empty; `?sample` populates.
//
// `progress` (toward a locked achievement) is NORMALIZED to {current,target} here — the raw
// `UserAchievement.progress: Record<string,number>` + the condition target is a LATER backend slice
// (current-business-rules.md:96: "partial-progress tracking → later slices"). The UI renders it deny-safe
// (present ⇒ a bar; absent ⇒ just "Locked") and NEVER derives it (IR-G3 — no business logic in the UI).
//
// Live swap (one binding): join `svc.listAchievements()` with `svc.getUserAchievements()` by achievement_id.
// DEV gates: `?sample` populates; `?force=loading|error|empty`.
// ============================================================================
import { useMemo } from 'react'
import type { Achievement, AchievementCategory, AchievementTier } from '@vida/types'
import { deriveInteractionState, type InteractionState } from '../state-conventions/interaction-state'

/** An achievement joined with the user's earned/progress state (the `listAchievements` × `getUserAchievements` join). */
export interface AchievementRow {
  achievement: Achievement
  earned: boolean
  earnedAt: number | null
  /** Normalized progress toward a LOCKED achievement; null = earned or no tracked progress. Deny-safe (future slice). */
  progress: { current: number; target: number } | null
}

export interface AchievementCategoryGroup {
  category: AchievementCategory
  label: string
  rows: readonly AchievementRow[]
}

export interface AchievementsData {
  /** Flat, sorted (category then tier) — the gallery/trophy-wall order. */
  rows: readonly AchievementRow[]
  /** Grouped by category (for the list layout), non-empty groups in the canonical order. */
  groups: readonly AchievementCategoryGroup[]
  total: number
  earnedCount: number
  state: InteractionState
}

const CATEGORY_ORDER: readonly AchievementCategory[] = [
  'onboarding',
  'habits',
  'learning',
  'projects',
  'financial',
  'social',
  'checkin',
  'purpose',
  'general',
]
const CATEGORY_LABEL: Record<AchievementCategory, string> = {
  onboarding: 'Getting started',
  habits: 'Habits',
  learning: 'Learning',
  projects: 'Projects',
  financial: 'Finance',
  social: 'Relationships',
  checkin: 'Check-ins',
  purpose: 'Purpose',
  general: 'General',
}
const TIER_RANK: Record<AchievementTier, number> = { bronze: 0, silver: 1, gold: 2, platinum: 3 }

const NOW_REF = 1_760_000_000_000

function ach(
  key: string,
  category: AchievementCategory,
  tier: AchievementTier,
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
function earnedRow(a: Achievement, hoursAgo: number): AchievementRow {
  return { achievement: a, earned: true, earnedAt: NOW_REF - hoursAgo * 3_600_000, progress: null }
}
function lockedRow(a: Achievement, progress: { current: number; target: number } | null = null): AchievementRow {
  return { achievement: a, earned: false, earnedAt: null, progress }
}

const SAMPLE_ROWS: readonly AchievementRow[] = [
  earnedRow(ach('first-habit', 'habits', 'bronze', 'First habit logged', 25), 72),
  earnedRow(ach('streak-7', 'habits', 'silver', 'Seven-day streak', 150), 5),
  lockedRow(ach('streak-30', 'habits', 'gold', 'Thirty-day streak', 500), { current: 7, target: 30 }),
  earnedRow(ach('first-focus', 'learning', 'bronze', 'First focus session', 25), 120),
  lockedRow(ach('scholar', 'learning', 'platinum', 'Hundred hours studied', 1000), { current: 42, target: 100 }),
  earnedRow(ach('budget-set', 'financial', 'bronze', 'First budget set', 25), 240),
  lockedRow(ach('saver', 'financial', 'gold', 'Saved a reward fund', 500), null),
  lockedRow(ach('reflector', 'checkin', 'silver', 'Thirty check-ins', 150), { current: 12, target: 30 }),
]

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

function sortRows(rows: readonly AchievementRow[]): AchievementRow[] {
  return [...rows].sort((a, b) => {
    const c = CATEGORY_ORDER.indexOf(a.achievement.category) - CATEGORY_ORDER.indexOf(b.achievement.category)
    return c !== 0 ? c : TIER_RANK[a.achievement.tier] - TIER_RANK[b.achievement.tier]
  })
}
function groupByCategory(rows: readonly AchievementRow[]): AchievementCategoryGroup[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABEL[category],
    rows: rows.filter((r) => r.achievement.category === category),
  })).filter((g) => g.rows.length > 0)
}

export function useAchievements(): AchievementsData {
  const forced = forcedState()
  const base = forced === 'empty' ? [] : devFlag('sample') ? SAMPLE_ROWS : []
  const rows = useMemo(() => sortRows(base), [base])
  const groups = useMemo(() => groupByCategory(rows), [rows])
  const state: InteractionState =
    forced === 'loading' || forced === 'error'
      ? forced
      : deriveInteractionState({ isPending: false, isError: false, data: rows }, (d) => d.length === 0)
  return { rows, groups, total: rows.length, earnedCount: rows.filter((r) => r.earned).length, state }
}
