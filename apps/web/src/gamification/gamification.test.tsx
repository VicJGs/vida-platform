// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { THEME_DEFAULT, UIProvider, type ThemeSelection } from '@vida/ui'
import { rewardCopy } from './reward-copy'
import { toRegister } from './use-persona'
import { useGamification } from './use-gamification'
import { XpHero } from './xp-hero'
import { GamificationSurface } from './gamification-surface'

afterEach(() => {
  cleanup()
  document.body.className = ''
})

const renderUI = (ui: React.ReactNode, selection?: ThemeSelection) =>
  render(<UIProvider selection={selection}>{ui}</UIProvider>)

describe('reward-copy (EC-10 — copy only, documented pairs)', () => {
  it('neutral keeps Rules/Reward; game swaps the documented pair (Quests/Loot)', () => {
    expect(rewardCopy('neutral')).toEqual({ rules: 'Rules', reward: 'Reward' })
    expect(rewardCopy('game')).toEqual({ rules: 'Quests', reward: 'Loot' })
  })
})

describe('usePersona.toRegister (deny-safe — absent ⇒ neutral)', () => {
  it('absent/null/unknown ⇒ neutral; the game-audience persona ⇒ game', () => {
    expect(toRegister(null)).toBe('neutral')
    expect(toRegister(undefined)).toBe('neutral')
    expect(toRegister('professional')).toBe('neutral')
    expect(toRegister('student')).toBe('game')
  })
})

describe('useGamification (data seam — honest default)', () => {
  it('M1 default is a fresh System (success, level 1, no balances/unlocks) — never a fake', () => {
    let data: ReturnType<typeof useGamification> | null = null
    function Probe() {
      data = useGamification()
      return null
    }
    renderUI(<Probe />)
    expect(data!.state).toBe('success')
    expect(data!.overview.level.info).toEqual({ level: 1, title: 'Novice' })
    expect(data!.overview.level.total).toBe(0)
    expect(data!.overview.balances).toHaveLength(0)
    expect(data!.overview.recentUnlocks).toHaveLength(0)
  })
})

describe('XpHero (EC-4 — register-keyed progress, honest)', () => {
  const level = { info: { level: 3, title: 'Novice' }, total: 520, nextLevelAt: 900, fraction: 0.4 }

  it('calm preset ⇒ an honest HonestProgress bar (role=progressbar) with the XP-to-next label', () => {
    const { getByRole } = renderUI(<XpHero level={level} />)
    const bar = getByRole('progressbar')
    expect(bar).not.toBeNull()
    expect(bar.getAttribute('aria-valuenow')).toBe('40')
  })

  it('game preset ⇒ a ring + an SR caption carrying the progress (ring is decorative)', async () => {
    // drive the preset through the real lever — UIProvider applies `t_game` to <body>, which useActivePreset reads
    const { container, getByText } = renderUI(<XpHero level={level} />, { ...THEME_DEFAULT, preset: 'game' })
    // the ring is an aria-hidden <svg>; it appears once the provider's class lands + the observer re-reads
    await waitFor(() => expect(container.querySelector('svg[aria-hidden]')).not.toBeNull())
    expect(getByText('380 XP to level 4')).not.toBeNull()
  })
})

describe('GamificationSurface (S1 — EC-3 switcher + EC-4 Overview)', () => {
  it('renders the title-hero + a 5-mode tablist; Overview is active with the Level block', () => {
    const { getByText, getAllByRole, getByRole } = renderUI(<GamificationSurface />)
    expect(getByText('The System')).not.toBeNull()
    const tabs = getAllByRole('tab')
    expect(tabs.map((t) => t.textContent)).toEqual(['Overview', 'Currencies', 'Achievements', 'Rules', 'Activity'])
    // the active Overview panel shows the DashboardView region + the Level block
    expect(getByRole('tabpanel')).not.toBeNull()
    expect(getByText('Level')).not.toBeNull()
  })

  it('EC-3 — switching to a still-not-built mode shows the honest EmptyState (no dead action)', () => {
    // Currencies is built in S2; Achievements/Rules/Activity remain honest EmptyState placeholders (S3–S5).
    const { getByText, getAllByRole } = renderUI(<GamificationSurface />)
    const achievementsTab = getAllByRole('tab').find((t) => t.textContent === 'Achievements')!
    fireEvent.click(achievementsTab)
    expect(getByText('Every achievement by category and tier, with progress toward the ones still locked.')).not.toBeNull()
  })

  it('EC-10 — the game register renames the Rules tab to Quests (copy only)', () => {
    const prev = window.location.search
    window.history.replaceState({}, '', '/gamification?persona=game')
    try {
      const { getAllByRole } = renderUI(<GamificationSurface />)
      expect(getAllByRole('tab').map((t) => t.textContent)).toContain('Quests')
    } finally {
      window.history.replaceState({}, '', `/${prev}`)
    }
  })
})
