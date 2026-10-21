// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, renderHook } from '@testing-library/react'
import { UIProvider } from '@vida/ui'

// This suite tests the ARRANGEMENT composition, not the journal internals. JournalPageRegion is now
// a live surface (calls useJournalEntry → React Query); mock it to a landmark sentinel so HomeSurface
// renders standalone. The region itself is covered by journal-page-region.test.tsx.
vi.mock('./journal-page-region', () => ({
  JournalPageRegion: ({ 'aria-label': ariaLabel = 'Journal entry' }: { 'aria-label'?: string }) => (
    <div role="region" aria-label={ariaLabel}>journal</div>
  ),
}))

import { HomeSurface, useHomeArrangement } from './home-surface'
import { usePreferencesStore } from '../stores/preferences-store'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('HomeSurface (S3)', () => {
  it('EC-6 — renders the greet header', () => {
    const { getByText } = renderUI(<HomeSurface />)
    expect(getByText(/Good (morning|afternoon|evening)\./)).not.toBeNull()
  })

  it('EC-1/EC-2 — Journal-first: journal page is the hero + a compact "At a glance" dashboard rail', () => {
    const { getByText, getByRole } = renderUI(<HomeSurface arrangement="journalFirst" />)
    // the journal page entity (landmark)
    expect(getByRole('region', { name: 'Journal entry' })).not.toBeNull()
    // the dashboard entity, compacted to the glance rail
    expect(getByText('At a glance')).not.toBeNull()
    expect(getByText('Finances')).not.toBeNull()
  })

  it('EC-1/EC-2 — Dashboard-first: the full OS dashboard leads, the journal page sits below', () => {
    const { getByText, getByRole } = renderUI(<HomeSurface arrangement="dashboardFirst" />)
    expect(getByText('Your day across the OS')).not.toBeNull()
    // the full widget set (incl. ones not in the rail)
    expect(getByText('Projects')).not.toBeNull()
    expect(getByText('Purposes')).not.toBeNull()
    expect(getByText('Dreams')).not.toBeNull()
    // the journal page still present (landmark)
    expect(getByRole('region', { name: 'Journal entry' })).not.toBeNull()
  })

  it('defaults to the persisted arrangement seam (journalFirst)', () => {
    // fe-settings S3 activated the read seam: useHomeArrangement now reads the app preferences store (a real hook).
    usePreferencesStore.setState({ arrangement: 'journalFirst', reduceMotion: false })
    const { result } = renderHook(() => useHomeArrangement())
    expect(result.current).toBe('journalFirst')
  })

  it('reflects the Settings arrangement toggle live (gate-1 #1 — read-seam activated)', () => {
    usePreferencesStore.setState({ arrangement: 'dashboardFirst', reduceMotion: false })
    const { result } = renderHook(() => useHomeArrangement())
    expect(result.current).toBe('dashboardFirst')
  })
})
