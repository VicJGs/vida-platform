// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { HomeSurface, useHomeArrangement } from './home-surface'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

describe('HomeSurface (S3)', () => {
  it('EC-6 — renders the greet header', () => {
    const { getByText } = renderUI(<HomeSurface />)
    expect(getByText(/Good (morning|afternoon|evening)\./)).not.toBeNull()
  })

  it('EC-1/EC-2 — Journal-first: journal page is the hero + a compact "At a glance" dashboard rail', () => {
    const { getByText, getByRole } = renderUI(<HomeSurface arrangement="journalFirst" />)
    // the journal page entity
    expect(getByText(/Mornings have started to settle/)).not.toBeNull()
    // the dashboard entity, compacted to the glance rail
    expect(getByText('At a glance')).not.toBeNull()
    expect(getByText('Finances')).not.toBeNull()
    expect(getByRole('region', { name: 'Journal entry' })).not.toBeNull()
  })

  it('EC-1/EC-2 — Dashboard-first: the full OS dashboard leads, the journal page sits below', () => {
    const { getByText } = renderUI(<HomeSurface arrangement="dashboardFirst" />)
    expect(getByText('Your day across the OS')).not.toBeNull()
    // the full widget set (incl. ones not in the rail)
    expect(getByText('Projects')).not.toBeNull()
    expect(getByText('Purposes')).not.toBeNull()
    expect(getByText('Dreams')).not.toBeNull()
    // the journal page still present
    expect(getByText(/Mornings have started to settle/)).not.toBeNull()
  })

  it('defaults to the persisted arrangement seam (journalFirst)', () => {
    expect(useHomeArrangement()).toBe('journalFirst')
  })
})
