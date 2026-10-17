// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { SessionRuntimeSurface } from './session-runtime-surface'

const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('SessionRuntimeSurface (fe-session-runtime S2)', () => {
  afterEach(() => {
    cleanup()
    window.history.pushState({}, '', '/') // reset the query string between cases
  })

  it('M1 default (no ?sample) → the honest-empty state, not a crash or blank', () => {
    const { getByText } = renderUI(<SessionRuntimeSurface sessionId="any-id" />)
    expect(getByText('No session open')).not.toBeNull()
  })

  it('?sample → renders the FlowSessionView region named by the session title', () => {
    window.history.pushState({}, '', '/?sample')
    const { getByRole } = renderUI(<SessionRuntimeSurface sessionId="any-id" />)
    expect(getByRole('region', { name: 'Work session' })).not.toBeNull()
  })

  it('?sample → surfaces the current stage deliverable (EC-2) and the effect-rail log (EC-4)', () => {
    window.history.pushState({}, '', '/?sample')
    const { getByText } = renderUI(<SessionRuntimeSurface sessionId="any-id" />)
    expect(getByText('Draft the outline')).not.toBeNull() // the deliverable (stage title)
    expect(getByText('Logged time')).not.toBeNull() // a mapped effect in the rail
  })
})
