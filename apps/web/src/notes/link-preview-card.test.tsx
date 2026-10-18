// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { PreviewCard } from './link-preview-card'
import type { WikiCandidate } from './wikilink'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

const target: WikiCandidate = { id: 'a', type: 'milestone_note', title: 'Launch milestone', icon: null }

describe('PreviewCard (S4 — EC-11 / BSE-12 available-data preview)', () => {
  it('renders the target title + type label (available data only)', () => {
    const { getByText } = renderUI(<PreviewCard target={target} />)
    expect(getByText('Launch milestone')).not.toBeNull()
    expect(getByText('Milestone')).not.toBeNull() // typeLabel(milestone_note)
  })

  it('is a named group, never a dead card', () => {
    const { getByRole } = renderUI(<PreviewCard target={target} />)
    expect(getByRole('group', { name: 'Link preview: Launch milestone' })).not.toBeNull()
  })

  it('EC-22 — carries a Lucide icon (svg)', () => {
    const { container } = renderUI(<PreviewCard target={target} />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })
})
