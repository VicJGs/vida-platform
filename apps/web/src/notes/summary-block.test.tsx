// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { SummaryView } from './summary-block'
import type { SectionData } from '@vida/core'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

// A MIXED-state set: success + empty + error — the EC-9/NOT-34 anti-blank proof.
const mixed: readonly SectionData[] = [
  {
    sectionKey: 'summary',
    module: 'habits',
    dataPoints: [
      { id: 'h1', label: '3 of 4 habits done' },
      { id: 'h2', label: 'Longest streak: 12 days' },
    ],
    state: 'success',
  },
  { sectionKey: 'summary', module: 'tasks', dataPoints: [], state: 'empty' },
  { sectionKey: 'summary', module: 'finance', dataPoints: [{ id: 'f1', label: 'Net today' }], state: 'error' },
]

describe('SummaryView (S5 — /summary block)', () => {
  it('block loading → aria-busy', () => {
    const { container } = renderUI(<SummaryView sections={[]} state="loading" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('block error → a calm status message', () => {
    const { getByRole } = renderUI(<SummaryView sections={[]} state="error" />)
    expect(getByRole('status').textContent).toContain('Couldn’t load your summary')
  })

  it('block empty → the honest not-connected message', () => {
    const { getByText } = renderUI(<SummaryView sections={[]} state="empty" />)
    expect(getByText(/appears here once sources are connected/)).not.toBeNull()
  })

  it('EC-9/NOT-34 — a success section renders its dataPoint labels', () => {
    const { getByText } = renderUI(<SummaryView sections={mixed} state="populated" />)
    expect(getByText('3 of 4 habits done')).not.toBeNull()
    expect(getByText('Longest streak: 12 days')).not.toBeNull()
  })

  it('EC-9/NOT-34 — an error section degrades to a SCOPED error while the others still render (anti-blank)', () => {
    const { getByText, getAllByRole } = renderUI(<SummaryView sections={mixed} state="populated" />)
    // the finance section errored...
    expect(getByText('Couldn’t load Finance.')).not.toBeNull()
    expect(getAllByRole('status')).toHaveLength(1) // only the one errored section
    // ...while the empty + success sections still render
    expect(getByText('No Tasks today.')).not.toBeNull()
    expect(getByText('3 of 4 habits done')).not.toBeNull()
  })

  it('renders a section header per section (module label)', () => {
    const { getByText } = renderUI(<SummaryView sections={mixed} state="populated" />)
    expect(getByText('Habits')).not.toBeNull()
    expect(getByText('Tasks')).not.toBeNull()
    expect(getByText('Finance')).not.toBeNull()
  })

  it('EC-22 — section headers carry Lucide icons (svg)', () => {
    const { container } = renderUI(<SummaryView sections={mixed} state="populated" />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('opaque items are never rendered (only dataPoint labels)', () => {
    const withItems: readonly SectionData[] = [
      { sectionKey: 'summary', module: 'habits', dataPoints: [{ id: 'h1', label: 'Shown' }], state: 'success', items: [{ secret: 'hidden' }] },
    ]
    const { queryByText, getByText } = renderUI(<SummaryView sections={withItems} state="populated" />)
    expect(getByText('Shown')).not.toBeNull()
    expect(queryByText(/hidden/)).toBeNull()
  })
})
