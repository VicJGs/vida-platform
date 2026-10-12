// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider, THEME_DEFAULT } from '@vida/ui'
import { AppearancePane } from './appearance-pane'
import { useThemeStore } from '../stores/theme-store'
import { usePreferencesStore } from '../stores/preferences-store'

afterEach(cleanup)
beforeEach(() => {
  useThemeStore.setState({ selection: THEME_DEFAULT })
  usePreferencesStore.setState({ reduceMotion: false, arrangement: 'journalFirst' })
})

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('AppearancePane (fe-settings S3 — EC-4/EC-5)', () => {
  it('renders all five Appearance controls', () => {
    const { getByText } = renderUI(<AppearancePane />)
    for (const label of ['Theme preset', 'Mode', 'Density', 'Reduce motion', 'Home arrangement']) {
      expect(getByText(label)).not.toBeNull()
    }
  })

  it('each control carries its own accessible name', () => {
    const { getByLabelText } = renderUI(<AppearancePane />)
    expect(getByLabelText('Theme preset')).not.toBeNull()
    expect(getByLabelText('Reduce motion')).not.toBeNull()
    expect(getByLabelText('Home arrangement')).not.toBeNull()
  })

  it('EC-5 — the reduce-motion Switch dispatches to the preferences store (live apply)', () => {
    const { getByLabelText } = renderUI(<AppearancePane />)
    const sw = getByLabelText('Reduce motion') as HTMLInputElement
    expect(usePreferencesStore.getState().reduceMotion).toBe(false)
    fireEvent.click(sw)
    expect(usePreferencesStore.getState().reduceMotion).toBe(true)
  })

  it('the reduce-motion Switch reflects the store value', () => {
    usePreferencesStore.setState({ reduceMotion: true, arrangement: 'journalFirst' })
    const { getByLabelText } = renderUI(<AppearancePane />)
    expect((getByLabelText('Reduce motion') as HTMLInputElement).checked).toBe(true)
  })
})
