// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'

// preferences-rescope R2: Settings reads the live seam (React Query over the composition root) — serve the fake.
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())
// R3: the revert toast is fired by the writer (writer-instance) — spy on it, keep every other @vida/ui export real.
const toastSpy = vi.hoisted(() => vi.fn())
vi.mock('@vida/ui', async (orig) => ({ ...(await orig<typeof import('@vida/ui')>()), toast: toastSpy }))
import { UIProvider } from '@vida/ui'
import SettingsSurface from './settings-surface'
import { SETTINGS_COPY } from './settings-copy'
import { resetThemeStoreForTests } from '../stores/theme-store'
import { usePreferencesStore } from '../stores/preferences-store'
import { queryClient } from '../lib/query-client'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { preferencesWriter, resetPreferencesWriterForTests } from '../preferences/writer-instance'
import { seedPreferences } from '../preferences/preferences-queries'
import { NAV_PREFS_KEY, USER_PREFS_KEY } from '../preferences/preferences-keys'
import { usePreferences } from '../preferences/use-preferences'

const PrefsWrapper = createPrefsWrapper()

afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
  resetTestPreferences()
  resetThemeStoreForTests()
})
// R3: the app seeds the cache at boot (App's gate), so the surface renders its panes immediately — mirror that here, or
// every synchronous pane query below would meet the loading skeleton.
beforeEach(async () => {
  usePreferencesStore.setState({ reduceMotion: false })
  toastSpy.mockClear()
  await seedPreferences(queryClient)
})

const renderUI = (ui: React.ReactNode) =>
  render(
    <PrefsWrapper>
      <UIProvider>{ui}</UIProvider>
    </PrefsWrapper>,
  )

describe('SettingsSurface (fe-settings S3 — EC-1/EC-7/EC-8)', () => {
  it('EC-1 — renders a named Settings region with the two-pane layout', () => {
    const { getByRole } = renderUI(<SettingsSurface />)
    expect(getByRole('region', { name: 'Settings' })).not.toBeNull()
  })

  it('EC-1 — the rail lists all six categories', () => {
    const { getByRole } = renderUI(<SettingsSurface />)
    // Scope to the nav — "Appearance" also appears as the pane's Card header, so a global getByText would be ambiguous.
    const nav = within(getByRole('navigation', { name: 'Settings categories' }))
    for (const label of ['Appearance', 'Locale', 'Notifications', 'Modules', 'Data', 'Account']) {
      expect(nav.getByText(label)).not.toBeNull()
    }
  })

  it('Appearance is active by default — its controls render', () => {
    const { getByLabelText } = renderUI(<SettingsSurface />)
    expect(getByLabelText('Theme preset')).not.toBeNull()
  })

  it('switching to Modules renders the real Modules pane (S5)', () => {
    const { getByText, getAllByText } = renderUI(<SettingsSurface />)
    fireEvent.click(getAllByText('Modules')[0]!) // the rail item
    expect(getByText('Surfaces')).not.toBeNull() // the Surfaces subsection = the real pane
  })

  it('S6 — Locale renders its real controls (not a placeholder)', () => {
    const { getByText, getByLabelText, queryByLabelText } = renderUI(<SettingsSurface />)
    fireEvent.click(getByText('Locale'))
    expect(getByLabelText('Date format')).not.toBeNull()
    expect(queryByLabelText('Theme preset')).toBeNull()
  })

  it('S6 — Notifications renders its channel toggles', () => {
    const { getByText, getByLabelText } = renderUI(<SettingsSurface />)
    fireEvent.click(getByText('Notifications'))
    expect(getByLabelText('In-app notifications')).not.toBeNull()
  })

  it('S6/EC-9 — Data + Account render calm delegated placeholders', () => {
    const { getByText, getAllByText } = renderUI(<SettingsSurface />)
    fireEvent.click(getByText('Data'))
    expect(getByText(/part of Data & Sync/)).not.toBeNull()
    fireEvent.click(getAllByText('Account')[0]!)
    expect(getByText(/managed separately/)).not.toBeNull()
  })

  it('EC-6 — a matching query replaces the pane with grouped results (category eyebrow)', () => {
    const { getByLabelText, getByRole } = renderUI(<SettingsSurface />)
    fireEvent.change(getByLabelText('Search settings'), { target: { value: 'motion' } })
    const results = within(getByRole('region', { name: 'Search results' }))
    expect(results.getByText('Reduce motion')).not.toBeNull()
    // the category eyebrow groups the match
    expect(results.getByRole('list', { name: 'Appearance' })).not.toBeNull()
  })

  it('EC-6 — a non-matching query shows the calm no-match status', () => {
    const { getByLabelText, getByRole } = renderUI(<SettingsSurface />)
    fireEvent.change(getByLabelText('Search settings'), { target: { value: 'xyzzy' } })
    const status = within(getByRole('status'))
    expect(status.getByText(/No setting matches/)).not.toBeNull()
  })

  it('EC-6 — clearing the query restores the Appearance pane', () => {
    const { getByLabelText, queryByRole } = renderUI(<SettingsSurface />)
    const search = getByLabelText('Search settings')
    fireEvent.change(search, { target: { value: 'motion' } })
    expect(queryByRole('region', { name: 'Search results' })).not.toBeNull()
    fireEvent.change(search, { target: { value: '' } })
    expect(queryByRole('region', { name: 'Search results' })).toBeNull()
    expect(getByLabelText('Theme preset')).not.toBeNull()
  })

  it('EC-6 — selecting a result navigates to its category and clears the query', () => {
    const { getByLabelText, getByText, queryByRole } = renderUI(<SettingsSurface />)
    fireEvent.change(getByLabelText('Search settings'), { target: { value: 'density' } })
    fireEvent.click(getByText('Density'))
    // query cleared → results region gone, Appearance pane (Density's category) shown
    expect(queryByRole('region', { name: 'Search results' })).toBeNull()
    expect(getByLabelText('Density')).not.toBeNull()
  })
})

describe('SettingsSurface — honest states (R3 · EC-7 · D1 · C5 UI)', () => {
  const fresh = () => {
    queryClient.clear()
    resetPreferencesWriterForTests()
  }

  it('loading → the pane is the skeleton (aria-busy); the rail still renders', async () => {
    fresh()
    testPreferences.holdReads()
    renderUI(<SettingsSurface />)
    const sk = screen.getByRole('region', { name: SETTINGS_COPY.loadingLabel })
    expect(sk.getAttribute('aria-busy')).toBe('true')
    expect(screen.getByRole('navigation', { name: 'Settings categories' })).not.toBeNull()
    expect(screen.queryByLabelText('Theme preset')).toBeNull()
    testPreferences.state.releaseReads()
    await waitFor(() => expect(screen.getByLabelText('Theme preset')).not.toBeNull())
  })

  it('first-read error → panes read-only over the defaults + the "showing defaults" line', async () => {
    fresh()
    testPreferences.state.failReads = 'all'
    renderUI(<SettingsSurface />)
    await waitFor(() => expect(screen.getByText(SETTINGS_COPY.readErrorDefaults)).not.toBeNull(), { timeout: 4000 })
    expect((screen.getByLabelText('Theme preset') as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText('Reduce motion') as HTMLInputElement).disabled).toBe(true)
    fireEvent.click(screen.getByText('Notifications'))
    expect((screen.getByLabelText('In-app notifications') as HTMLInputElement).disabled).toBe(true)
  })

  it('later error (data kept) → read-only + the "last loaded" line, never the defaults copy', async () => {
    renderUI(<SettingsSurface />)
    expect(screen.getByLabelText('Theme preset')).not.toBeNull()
    testPreferences.state.failReads = 'all'
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: USER_PREFS_KEY }).catch(() => {})
    })
    await waitFor(() => expect(screen.getByText(SETTINGS_COPY.readErrorKept)).not.toBeNull(), { timeout: 4000 })
    expect(screen.queryByText(SETTINGS_COPY.readErrorDefaults)).toBeNull()
    expect((screen.getByLabelText('Mode') as HTMLButtonElement).disabled).toBe(true)
  })

  it('a save shows SyncStatus "Saved on this device" — and never a "Saving…" state (P4 contract)', async () => {
    renderUI(<SettingsSurface />)
    fireEvent.click(screen.getByLabelText('Mode'))
    fireEvent.click(screen.getByRole('option', { name: 'Dark' }))
    expect(screen.queryByText(/Saving/)).toBeNull() // regression guard (LocalSyncState has no saving state)
    await act(async () => {
      await preferencesWriter.flushAll()
    })
    await waitFor(() => expect(screen.getByText('Saved on this device')).not.toBeNull())
    expect(screen.queryByText(/Saving/)).toBeNull()
  })

  it('a rejected save → the control shows the reverted value, ONE toast, and no stale "Saved" status', async () => {
    renderUI(<SettingsSurface />)
    testPreferences.state.failNext = new Error('boom')
    fireEvent.click(screen.getByLabelText('Mode'))
    fireEvent.click(screen.getByRole('option', { name: 'Dark' }))
    expect(within(screen.getByLabelText('Mode')).getByText('Dark')).toBeTruthy() // optimistic
    await act(async () => {
      await preferencesWriter.flushAll()
    })
    await waitFor(() => expect(within(screen.getByLabelText('Mode')).getByText('Light')).toBeTruthy()) // reverted
    expect(toastSpy).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Saved on this device')).toBeNull()
  })
})

// PLAN-R3 rev 2.2 (IMPL step 16b) — a failed read recovers ONLY by the error state's Retry (state-conventions §3):
// mounting readers never re-read an errored query (`retryOnMount: false`), so there is no refetch loop.
describe('SettingsSurface — failed-read recovery (R3 rev 2.2 · state-conventions §3)', () => {
  const failedFirstRead = async () => {
    queryClient.clear()
    resetPreferencesWriterForTests()
    resetTestPreferences()
    testPreferences.state.failReads = 'all'
    await seedPreferences(queryClient) // retry 0 → both keys deterministically in error, no data
  }
  const reads = () => ({ ...testPreferences.state.reads })
  const settle = () => act(() => new Promise((r) => setTimeout(r, 2100)))

  it('no refetch loop: mounting the surface, its panes and a second reader adds no read', async () => {
    await failedFirstRead()
    const before = reads()
    renderUI(<SettingsSurface />)
    renderHook(() => usePreferences(), { wrapper: PrefsWrapper })
    await waitFor(() => expect(screen.getByText(SETTINGS_COPY.readErrorDefaults)).not.toBeNull(), { timeout: 3000 })
    await settle()
    expect(reads()).toEqual(before)
    expect(screen.getByText(SETTINGS_COPY.readErrorDefaults)).not.toBeNull() // still settled on the error
  }, 10_000)

  it('Retry is the one live control, before the pane; it re-reads each errored key once → skeleton → editable', async () => {
    await failedFirstRead()
    renderUI(<SettingsSurface />)
    const retry = await screen.findByRole('button', { name: SETTINGS_COPY.retry }, { timeout: 3000 })
    expect((retry as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByLabelText('Theme preset') as HTMLButtonElement).disabled).toBe(true)
    // DOM order: the Retry block precedes the pane
    expect(
      retry.compareDocumentPosition(screen.getByLabelText('Theme preset')) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()

    const before = reads()
    testPreferences.state.failReads = 'none'
    testPreferences.holdReads()
    fireEvent.click(retry)
    const sk = await screen.findByRole('region', { name: SETTINGS_COPY.loadingLabel })
    await waitFor(() => expect(document.activeElement).toBe(sk)) // focus is placed, never dropped to <body>
    testPreferences.state.releaseReads()
    await waitFor(() => expect((screen.getByLabelText('Theme preset') as HTMLButtonElement).disabled).toBe(false), {
      timeout: 3000,
    })
    expect(reads()).toEqual({ user: before.user + 1, nav: before.nav + 1 })
    expect(screen.queryByText(SETTINGS_COPY.readErrorDefaults)).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Appearance' })) // top of the content
  }, 10_000)

  it('Retry that fails again → the same defaults line, focus back on Retry, still no loop', async () => {
    await failedFirstRead()
    renderUI(<SettingsSurface />)
    fireEvent.click(await screen.findByRole('button', { name: SETTINGS_COPY.retry }, { timeout: 3000 }))
    await screen.findByRole('region', { name: SETTINGS_COPY.loadingLabel }) // re-entered loading (§3)
    // the re-read inherits the global `retry: 1` (1 s delay) before it settles on the error again
    const again = await screen.findByRole('button', { name: SETTINGS_COPY.retry }, { timeout: 4000 })
    expect(screen.getByText(SETTINGS_COPY.readErrorDefaults)).not.toBeNull()
    await waitFor(() => expect(document.activeElement).toBe(again))
    const after = reads()
    await settle()
    expect(reads()).toEqual(after)
  }, 10_000)

  it('later error: Retry re-reads only the errored key and keeps the last loaded view meanwhile', async () => {
    renderUI(<SettingsSurface />) // beforeEach seeded both keys successfully
    testPreferences.state.failReads = 'all'
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: USER_PREFS_KEY }).catch(() => {})
    })
    const retry = await screen.findByRole('button', { name: SETTINGS_COPY.retry }, { timeout: 4000 })
    expect(queryClient.getQueryState(NAV_PREFS_KEY)?.status).toBe('success')
    const before = reads()
    testPreferences.state.failReads = 'none'
    fireEvent.click(retry)
    expect(screen.queryByRole('region', { name: SETTINGS_COPY.loadingLabel })).toBeNull() // data kept → no skeleton
    await waitFor(() => expect((screen.getByLabelText('Mode') as HTMLButtonElement).disabled).toBe(false), {
      timeout: 3000,
    })
    expect(reads()).toEqual({ user: before.user + 1, nav: before.nav })
  }, 10_000)

  it('a failed later-error Retry ends the Retry: a later unrelated refetch never moves focus (R3-BR-6)', async () => {
    renderUI(<SettingsSurface />)
    testPreferences.state.failReads = 'all'
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: USER_PREFS_KEY }).catch(() => {})
    })
    const retry = await screen.findByRole('button', { name: SETTINGS_COPY.retry }, { timeout: 4000 })
    retry.focus()
    fireEvent.click(retry) // fails again (data kept → `state` stays 'error' throughout)
    await settle()
    testPreferences.state.failReads = 'none'
    const search = screen.getByLabelText('Search settings')
    search.focus() // the user moved on
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: USER_PREFS_KEY }) // e.g. the writer's idle invalidate
    })
    await waitFor(() => expect((screen.getByLabelText('Mode') as HTMLButtonElement).disabled).toBe(false), {
      timeout: 3000,
    })
    expect(document.activeElement).toBe(search)
  }, 10_000)

  it('a repeat later-error failure is re-announced: the status line is a fresh live node per failed Retry', async () => {
    renderUI(<SettingsSurface />)
    testPreferences.state.failReads = 'all'
    await act(async () => {
      await queryClient.refetchQueries({ queryKey: USER_PREFS_KEY }).catch(() => {})
    })
    const first = (await screen.findByText(SETTINGS_COPY.readErrorKept, {}, { timeout: 4000 })).closest(
      '[role="status"]',
    )
    fireEvent.click(screen.getByRole('button', { name: SETTINGS_COPY.retry })) // fails again; `state` never leaves 'error'
    await waitFor(
      () => expect(screen.getByText(SETTINGS_COPY.readErrorKept).closest('[role="status"]')).not.toBe(first),
      { timeout: 4000 },
    )
  }, 10_000)
})
