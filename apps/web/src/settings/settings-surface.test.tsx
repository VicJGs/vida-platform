// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, within } from '@testing-library/react'
import { UIProvider, THEME_DEFAULT } from '@vida/ui'
import SettingsSurface from './settings-surface'
import { useThemeStore } from '../stores/theme-store'
import { usePreferencesStore } from '../stores/preferences-store'

afterEach(cleanup)
beforeEach(() => {
  useThemeStore.setState({ selection: THEME_DEFAULT })
  usePreferencesStore.setState({ reduceMotion: false, arrangement: 'journalFirst' })
})

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

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

  it('switching to a not-yet-built category shows the calm placeholder, not the Appearance controls', () => {
    const { getByText, queryByLabelText } = renderUI(<SettingsSurface />)
    fireEvent.click(getByText('Modules'))
    expect(getByText('These settings arrive in a later release.')).not.toBeNull()
    expect(queryByLabelText('Theme preset')).toBeNull()
  })

  it('EC-6 chrome — a disabled search box is present (filtering arrives in S4)', () => {
    const { getByLabelText } = renderUI(<SettingsSurface />)
    const search = getByLabelText('Search settings') as HTMLInputElement
    expect(search).not.toBeNull()
    expect(search.disabled).toBe(true)
  })
})
