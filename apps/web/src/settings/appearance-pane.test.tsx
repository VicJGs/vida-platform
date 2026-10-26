// @vitest-environment jsdom
// fe-settings S3 (EC-4/EC-5) → preferences-rescope R3 (D4/D6/D7/D10, EC-7): the Appearance pane reads the persisted view
// and writes through the preferences writer (theme · arrangement · persona persist); reduce motion stays on the
// transitional store until R4. Read-only (a read error) disables every control.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { UIProvider } from '@vida/ui'
import { UpdatePreferencesSchema } from '@vida/core'
import { AppearancePane } from './appearance-pane'
import { SettingsContext } from './settings-context'
import { usePreferencesStore } from '../stores/preferences-store'
import { useThemeStore, resetThemeStoreForTests } from '../stores/theme-store'
import { queryClient } from '../lib/query-client'
import { seedPreferences } from '../preferences/preferences-queries'
import { preferencesWriter, resetPreferencesWriterForTests } from '../preferences/writer-instance'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'

const PrefsWrapper = createPrefsWrapper()

beforeEach(async () => {
  resetTestPreferences()
  usePreferencesStore.setState({ reduceMotion: false })
  await seedPreferences(queryClient)
})
afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
  resetThemeStoreForTests()
})

const renderUI = (ui: React.ReactNode) =>
  render(
    <PrefsWrapper>
      <UIProvider>{ui}</UIProvider>
    </PrefsWrapper>,
  )

/** Open a Select by its accessible name and pick an option by its label. */
function choose(name: string, option: string) {
  fireEvent.click(screen.getByLabelText(name))
  fireEvent.click(screen.getByRole('option', { name: option }))
}

describe('AppearancePane (EC-4/EC-5 · R3 persistence)', () => {
  it('renders the six Appearance controls, the persona row directly under the three theme rows', () => {
    const { container } = renderUI(<AppearancePane />)
    const labels = ['Theme preset', 'Mode', 'Density', 'Persona', 'Reduce motion', 'Home arrangement']
    const text = container.textContent ?? ''
    let at = -1
    for (const label of labels) {
      const i = text.indexOf(label, at + 1)
      expect(i).toBeGreaterThan(at) // present, and in this order
      at = i
    }
  })

  it('each control carries its own accessible name', () => {
    renderUI(<AppearancePane />)
    for (const name of ['Theme preset', 'Mode', 'Density', 'Persona', 'Reduce motion', 'Home arrangement']) {
      expect(screen.getByLabelText(name)).not.toBeNull()
    }
  })

  it('a preset choice re-themes instantly (optimistic) and persists to dashboard_layout.theme', async () => {
    renderUI(<AppearancePane />)
    choose('Theme preset', 'Quiet Desk')
    expect(useThemeStore.getState().selection.preset).toBe('quietDesk') // EC-5: same tick, no DB round trip
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.dashboard_layout).toMatchObject({ theme: 'quietDesk' })
  })

  it('mode + density + arrangement persist to their columns / sub-key (siblings survive, IR-2)', async () => {
    renderUI(<AppearancePane />)
    choose('Theme preset', 'Reader')
    choose('Mode', 'Dark')
    choose('Density', 'Compact')
    choose('Home arrangement', 'Dashboard first')
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user).toMatchObject({
      theme: 'dark',
      compact_mode: true,
      dashboard_layout: { theme: 'reader', arrangement: 'dashboardFirst' },
    })
  })

  it('persona: lists Not set + the 6 personas; a pick writes it, Not set writes null (accepted by the real schema)', async () => {
    renderUI(<AppearancePane />)
    fireEvent.click(screen.getByLabelText('Persona'))
    const names = screen.getAllByRole('option').map((o) => o.textContent?.trim())
    expect(names).toEqual(['Not set', 'Student', 'Professional', 'Entrepreneur', 'Creative', 'Parent', 'Retiree'])
    fireEvent.click(screen.getByRole('option', { name: 'Creative' }))
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.persona).toBe('creative')
    choose('Persona', 'Not set')
    await preferencesWriter.flushAll()
    expect(testPreferences.state.user?.persona).toBeNull()
    expect(UpdatePreferencesSchema.safeParse({ persona: null }).success).toBe(true)
  })

  it('reduce motion still binds the transitional store (R4 moves it)', () => {
    renderUI(<AppearancePane />)
    fireEvent.click(screen.getByLabelText('Reduce motion'))
    expect(usePreferencesStore.getState().reduceMotion).toBe(true)
  })

  it('reflects the persisted values (a seeded row)', async () => {
    cleanup()
    queryClient.clear()
    resetPreferencesWriterForTests()
    testPreferences.state.user = {
      ...(await testPreferences.svc.getMergedPreferences()),
      persona: 'parent',
      dashboard_layout: { arrangement: 'dashboardFirst' },
    }
    await seedPreferences(queryClient)
    renderUI(<AppearancePane />)
    await waitFor(() => expect(within(screen.getByLabelText('Persona')).getByText('Parent')).toBeTruthy())
    expect(within(screen.getByLabelText('Home arrangement')).getByText('Dashboard first')).toBeTruthy()
  })

  it('read-only (EC-7): every control is disabled', () => {
    renderUI(
      <SettingsContext.Provider value={{ readOnly: true, update: async () => {} }}>
        <AppearancePane />
      </SettingsContext.Provider>,
    )
    for (const name of ['Theme preset', 'Mode', 'Density', 'Persona', 'Home arrangement']) {
      expect((screen.getByLabelText(name) as HTMLButtonElement).disabled).toBe(true)
    }
    expect((screen.getByLabelText('Reduce motion') as HTMLInputElement).disabled).toBe(true)
  })
})
