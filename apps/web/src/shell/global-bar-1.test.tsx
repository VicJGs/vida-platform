// @vitest-environment jsdom
// fe-shell-scope (#15) · S3 — the Bar 1 assembly: both homes compose scope + the right surfaces form; strip mode
// resolves from the breakpoint override. (Scope/surfaces internals are covered by their own suites.)
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { useScopeStore } from '../stores/scope-store'
import { GlobalBar1 } from './global-bar-1'
import { renderInShell } from './test-router'

afterEach(() => {
  cleanup()
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
  useScopeStore.setState({ activeSpaceId: null })
})

// ScopeSelector reads via React Query → wrap in a client (the scope-selector.test precedent); renderInShell adds the router.
function renderBar(ui: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return renderInShell(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

describe('GlobalBar1 assembly', () => {
  it('strip (full ≥768) = scope + the surfaces strip as icon-nav links', async () => {
    const { getByRole, findByLabelText } = await renderBar(<GlobalBar1 variant="strip" __bp="desktop" />)
    expect(await findByLabelText(/Scope: All/)).not.toBeNull() // scope present (stub [] → empty-state trigger)
    expect(getByRole('button', { name: 'Search' })).not.toBeNull() // surfaces strip Search launcher
    expect(getByRole('link', { name: 'Home' })).not.toBeNull()
  })

  it('strip (condensed ≤375) = globe-only scope + More-only overflow (no inline links; #16 strip-budget)', async () => {
    const { getByRole, queryByRole, findByLabelText } = await renderBar(<GlobalBar1 variant="strip" __bp="mobile" />)
    expect(await findByLabelText(/Scope: All/)).not.toBeNull()
    expect(queryByRole('button', { name: 'Search' })).toBeNull() // folded into More (Victor 2026-10-18)
    expect(getByRole('button', { name: 'More' })).not.toBeNull()
    expect(queryByRole('link', { name: 'Home' })).toBeNull() // surfaces are in the overflow, not inline links
  })

  it('panel = scope + the labeled surfaces nav landmark', async () => {
    const { getByRole, findByLabelText } = await renderBar(<GlobalBar1 variant="panel" />)
    expect(await findByLabelText(/Scope: All/)).not.toBeNull()
    expect(getByRole('navigation', { name: 'Global surfaces' })).not.toBeNull()
    expect(getByRole('link', { name: 'Settings' })).not.toBeNull()
  })
})
