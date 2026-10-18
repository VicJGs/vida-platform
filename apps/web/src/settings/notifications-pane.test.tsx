// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { NotificationsPane } from './notifications-pane'
import { usePreferencesStore } from '../stores/preferences-store'

afterEach(cleanup)
beforeEach(() =>
  usePreferencesStore.setState({ notifInApp: true, notifPush: true, notifEmail: true, quietHours: false }),
)

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('NotificationsPane (fe-settings S6 — EC-4)', () => {
  it('renders the channel toggles + quiet hours', () => {
    const { getByText } = renderUI(<NotificationsPane />)
    for (const label of ['In-app', 'Push', 'Email', 'Quiet hours']) {
      expect(getByText(label)).not.toBeNull()
    }
  })

  it('each Switch carries its own accessible name', () => {
    const { getByLabelText } = renderUI(<NotificationsPane />)
    expect(getByLabelText('In-app notifications')).not.toBeNull()
    expect(getByLabelText('Quiet hours')).not.toBeNull()
  })

  it('toggling Push dispatches to the store (sibling untouched)', () => {
    const { getByLabelText } = renderUI(<NotificationsPane />)
    fireEvent.click(getByLabelText('Push notifications'))
    expect(usePreferencesStore.getState().notifPush).toBe(false)
    expect(usePreferencesStore.getState().notifInApp).toBe(true)
  })
})
