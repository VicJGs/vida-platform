// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { BacklinksView } from './backlinks-panel'
import type { BacklinkGroup } from './backlinks'

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => render(<UIProvider>{ui}</UIProvider>)

const groups: BacklinkGroup[] = [
  {
    module: 'Notes',
    items: [
      { sourceId: 'a', type: 'note', title: 'Research log', module: 'Notes', count: 2, snippet: 'linked here', latest: 50 },
      { sourceId: 'c', type: 'note', title: 'Alpha notes', module: 'Notes', count: 1, snippet: null, latest: 10 },
    ],
  },
  {
    module: 'Projects',
    items: [
      { sourceId: 'b', type: 'milestone_note', title: 'Launch', module: 'Projects', count: 1, snippet: null, latest: 40 },
    ],
  },
]

describe('BacklinksView (S3 — what links here)', () => {
  it('empty → the honest "nothing links here" message', () => {
    const { getByText } = renderUI(<BacklinksView groups={[]} state="empty" />)
    expect(getByText('Nothing links here yet.')).not.toBeNull()
  })

  it('error → a calm status message (not a crash)', () => {
    const { getByRole } = renderUI(<BacklinksView groups={[]} state="error" />)
    expect(getByRole('status').textContent).toContain('Couldn’t load')
  })

  it('loading → aria-busy', () => {
    const { container } = renderUI(<BacklinksView groups={[]} state="loading" />)
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('EC-6 — populated: renders a list per source module, grouped', () => {
    const { getByRole } = renderUI(<BacklinksView groups={groups} state="populated" />)
    expect(getByRole('list', { name: 'Notes' })).not.toBeNull()
    expect(getByRole('list', { name: 'Projects' })).not.toBeNull()
  })

  it('renders every source as a listitem with its title', () => {
    const { getAllByRole, getByText } = renderUI(<BacklinksView groups={groups} state="populated" />)
    expect(getAllByRole('listitem')).toHaveLength(3)
    expect(getByText('Research log')).not.toBeNull()
    expect(getByText('Launch')).not.toBeNull()
  })

  it('D-S3-3 — surfaces the occurrence count for a multi-link source (nothing silently dropped)', () => {
    const { getByText } = renderUI(<BacklinksView groups={groups} state="populated" />)
    expect(getByText('· 2 links')).not.toBeNull()
  })

  it('EC-22 — each row carries a Lucide icon (svg)', () => {
    const { container } = renderUI(<BacklinksView groups={groups} state="populated" />)
    expect(container.querySelectorAll('svg').length).toBeGreaterThan(0)
  })

  it('D-S3-4 — rows are non-interactive (no link role, no dead nav against the stub)', () => {
    const { queryAllByRole } = renderUI(<BacklinksView groups={groups} state="populated" />)
    expect(queryAllByRole('link')).toHaveLength(0)
  })
})
