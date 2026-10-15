// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, renderHook } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { PAGE_SIZE, useActivity } from './use-activity'
import { ActivityMode } from './activity-mode'

function setSearch(s: string) {
  window.history.replaceState({}, '', `/gamification${s}`)
}

beforeEach(() => setSearch(''))
afterEach(() => {
  cleanup()
  setSearch('')
})

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('useActivity (data seam)', () => {
  it('honest M1 default = an empty ledger (empty, not a faked history)', () => {
    const { result } = renderHook(() => useActivity())
    expect(result.current.state).toBe('empty')
    expect(result.current.total).toBe(0)
    expect(result.current.entries).toHaveLength(0)
  })

  it('?sample populates a multi-page, strictly reverse-chronological ledger', () => {
    setSearch('?sample')
    const { result } = renderHook(() => useActivity())
    expect(result.current.state).toBe('success')
    expect(result.current.total).toBe(64)
    expect(result.current.page.count).toBe(Math.ceil(64 / PAGE_SIZE))
    expect(result.current.entries).toHaveLength(PAGE_SIZE) // first page is full
    // strictly descending by `at` (newest first)
    const times = result.current.entries.map((e) => e.at)
    for (let i = 1; i < times.length; i++) expect(times[i]!).toBeLessThan(times[i - 1]!)
    // sample `now` is a FIXED instant → deterministic Visual Gate
    expect(result.current.now).toBe(Date.UTC(2026, 9, 14, 18, 0, 0))
  })

  it('?force=empty → empty; ?force=loading/error → that state', () => {
    setSearch('?force=empty')
    expect(renderHook(() => useActivity()).result.current.state).toBe('empty')
    setSearch('?force=loading')
    expect(renderHook(() => useActivity()).result.current.state).toBe('loading')
    setSearch('?force=error')
    expect(renderHook(() => useActivity()).result.current.state).toBe('error')
  })

  it('setPage slices to the next page (64 → 2 pages; page 1 holds the remainder)', () => {
    setSearch('?sample')
    const { result } = renderHook(() => useActivity())
    act(() => result.current.setPage(1))
    expect(result.current.page.index).toBe(1)
    expect(result.current.entries).toHaveLength(64 - PAGE_SIZE) // 14
  })
})

describe('ActivityMode (EC-8)', () => {
  it('renders kind-labelled, timestamped events + the pager on multi-page data', () => {
    setSearch('?sample')
    const { getAllByText, getByText, getByLabelText } = renderUI(<ActivityMode />)
    // the kind LABELS carry direction (BR-S5-3 — no asserted ± sign)
    expect(getAllByText('Earned').length).toBeGreaterThan(0)
    expect(getAllByText('Spent').length).toBeGreaterThan(0)
    // a source chip ("across modules")
    expect(getAllByText(/Habits ·/).length).toBeGreaterThan(0)
    // an absolute date-time (Intl; "Oct 14, …") + the pager
    expect(getAllByText(/Oct \d/).length).toBeGreaterThan(0)
    expect(getByText('Next')).not.toBeNull()
    expect(getByLabelText('Pagination')).not.toBeNull()
  })

  it('empty ledger renders a READ-ONLY honest empty state (no "add" promise), no pager', () => {
    const { getByText, queryByText } = renderUI(<ActivityMode />)
    expect(queryByText('Next')).toBeNull() // no pager when total === 0
    // the activity-honest empty — NOT the shell default "Items you add will show up here" (g2 #1)
    expect(getByText('No activity yet')).not.toBeNull()
    expect(queryByText(/Items you add/)).toBeNull()
  })
})
