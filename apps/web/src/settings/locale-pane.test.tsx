// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// preferences-rescope R3: the pane reads `useSettings()` (→ the preferences writer → the composition root) — serve the fake.
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { LocalePane } from './locale-pane'
import { usePreferencesStore } from '../stores/preferences-store'

afterEach(cleanup)
beforeEach(() => usePreferencesStore.setState({ dateFormat: 'YYYY-MM-DD', timeFormat: '24h', weekStartsOn: 1 }))

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('LocalePane (fe-settings S6 — EC-4)', () => {
  it('renders the three locale controls', () => {
    const { getByText } = renderUI(<LocalePane />)
    for (const label of ['Date format', 'Time format', 'Week starts on']) {
      expect(getByText(label)).not.toBeNull()
    }
  })

  it('each control carries its own accessible name', () => {
    const { getByLabelText } = renderUI(<LocalePane />)
    expect(getByLabelText('Date format')).not.toBeNull()
    expect(getByLabelText('Time format')).not.toBeNull()
    expect(getByLabelText('Week starts on')).not.toBeNull()
  })

  it('reflects the store value (week-start maps 1 → Monday)', () => {
    const { getByLabelText } = renderUI(<LocalePane />)
    // the Select trigger shows the current mapped label
    expect(getByLabelText('Week starts on').textContent).toContain('Monday')
  })
})
