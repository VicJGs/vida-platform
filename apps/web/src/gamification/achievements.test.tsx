// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { THEME_DEFAULT, UIProvider, type ThemeSelection } from '@vida/ui'
import { useAchievements } from './use-achievements'
import { AchievementsMode } from './achievements-mode'

function setSearch(s: string) {
  window.history.replaceState({}, '', `/gamification${s}`)
}
beforeEach(() => setSearch(''))
afterEach(() => {
  cleanup()
  setSearch('')
})
const renderUI = (ui: React.ReactNode, selection?: ThemeSelection) => render(<UIProvider selection={selection}>{ui}</UIProvider>)

describe('useAchievements (data seam)', () => {
  it('honest M1 default = empty (nothing seeded until app init)', () => {
    const { result } = renderHook(() => useAchievements())
    expect(result.current.state).toBe('empty')
    expect(result.current.total).toBe(0)
  })

  it('?sample groups by category, counts earned, normalizes locked progress', () => {
    setSearch('?sample')
    const { result } = renderHook(() => useAchievements())
    expect(result.current.total).toBe(8)
    expect(result.current.earnedCount).toBe(4)
    // grouped by category in canonical order (habits before learning before financial before checkin)
    expect(result.current.groups.map((g) => g.category)).toEqual(['habits', 'learning', 'financial', 'checkin'])
    // a locked achievement carries normalized {current,target} progress (the deny-safe future-slice shape)
    const streak30 = result.current.rows.find((r) => r.achievement.key === 'streak-30')!
    expect(streak30.earned).toBe(false)
    expect(streak30.progress).toEqual({ current: 7, target: 30 })
  })

  it('?force=empty/loading/error → that state', () => {
    setSearch('?force=loading')
    expect(renderHook(() => useAchievements()).result.current.state).toBe('loading')
    setSearch('?force=error')
    expect(renderHook(() => useAchievements()).result.current.state).toBe('error')
  })
})

describe('AchievementsMode (EC-6)', () => {
  it('calm default = list: category groups + earned/locked + a progress bar for locked-with-progress', () => {
    setSearch('?sample')
    const { getByText, getAllByText, getByRole } = renderUI(<AchievementsMode />)
    expect(getByText('Habits')).not.toBeNull() // category eyebrow
    expect(getByText('Seven-day streak')).not.toBeNull()
    expect(getAllByText('Earned').length).toBeGreaterThan(0)
    expect(getByText('Locked')).not.toBeNull() // locked, no progress (saver)
    // locked-with-progress → a HonestProgress bar (role=progressbar)
    expect(getByRole('progressbar', { name: '7 / 30' })).not.toBeNull()
  })

  it('EC-6 — the game preset defaults to the trophy wall (gallery of Lucide Medal tiles)', async () => {
    // "calm = list · game = trophy wall" = preset-keyed default (the S1 ring idiom). Drive it via UIProvider.
    setSearch('?sample')
    const { container } = renderUI(<AchievementsMode />, { ...THEME_DEFAULT, preset: 'game' })
    // once the provider's t_game lands + useActivePreset re-reads → the gallery renders medal tiles
    await waitFor(() => expect(container.querySelector('svg.lucide-medal')).not.toBeNull())
  })
})
