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
