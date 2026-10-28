// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { USER_PREFERENCES_DEFAULTS } from '@vida/core'

// preferences-rescope R3 (IMPL step 17): the arrangement is read from the live preferences (React Query over the
// composition root) — serve the fake, seed the cache as App's boot gate does.
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

// This suite tests the ARRANGEMENT composition, not the journal internals. JournalPageRegion is now
// a live surface (calls useJournalEntry → React Query); mock it to a landmark sentinel so HomeSurface
// renders standalone. The region itself is covered by journal-page-region.test.tsx.
vi.mock('./journal-page-region', () => ({
  JournalPageRegion: ({ 'aria-label': ariaLabel = 'Journal entry' }: { 'aria-label'?: string }) => (
    <div role="region" aria-label={ariaLabel}>
      journal
    </div>
  ),
}))

import { HomeSurface, useHomeArrangement } from './home-surface'
import { queryClient } from '../lib/query-client'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { seedPreferences } from '../preferences/preferences-queries'
import { updateView } from '../preferences/use-preferences'
import { resetPreferencesWriterForTests, preferencesWriter } from '../preferences/writer-instance'

const PrefsWrapper = createPrefsWrapper()
beforeEach(async () => {
  await seedPreferences(queryClient)
})
afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
  resetTestPreferences()
})
const renderUI = (ui: React.ReactNode) =>
  render(
    <PrefsWrapper>
      <UIProvider>{ui}</UIProvider>
    </PrefsWrapper>,
  )
const persist = async (arrangement: 'journalFirst' | 'dashboardFirst') => {
  queryClient.clear()
  testPreferences.state.user = { ...USER_PREFERENCES_DEFAULTS, dashboard_layout: { arrangement } }
  await seedPreferences(queryClient)
}

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

  it('defaults to journalFirst when nothing is persisted (the seeded defaults row)', () => {
    const { result } = renderHook(() => useHomeArrangement(), { wrapper: PrefsWrapper })
    expect(result.current).toBe('journalFirst')
  })

  it('R3 step 17 — a persisted dashboardFirst is the arrangement of the FIRST render (render log, not waitFor)', async () => {
    await persist('dashboardFirst')
    const log: string[] = []
    renderHook(
      () => {
        const a = useHomeArrangement()
        log.push(a)
        return a
      },
      { wrapper: PrefsWrapper },
    )
    expect(log[0]).toBe('dashboardFirst')
  })

  it('reflects a Settings arrangement write live (optimistic, through the writer)', async () => {
    const { result } = renderHook(() => useHomeArrangement(), { wrapper: PrefsWrapper })
    expect(result.current).toBe('journalFirst')
    await act(async () => {
      void updateView({ arrangement: 'dashboardFirst' })
    })
    // optimistic: in the cache at once; React Query notifies observers on its next batch tick
    await waitFor(() => expect(result.current).toBe('dashboardFirst'))
    await act(async () => {
      await preferencesWriter.flushAll()
    })
    expect(result.current).toBe('dashboardFirst')
  })
})
