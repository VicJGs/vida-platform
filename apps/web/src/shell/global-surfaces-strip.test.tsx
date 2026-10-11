// @vitest-environment jsdom
// fe-shell-scope (#15) · S2 — the top-strip surfaces in both modes: the Search ⌘K action, the route surfaces as
// links (full) / overflow Menu (condensed), and the dropped hamburger (app-shell owns panel toggles now).
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, waitFor } from '@testing-library/react'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { GlobalSurfacesStrip } from './global-surfaces-strip'
import { renderInShell } from './test-router'

afterEach(() => {
  cleanup()
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
})

describe('GlobalSurfacesStrip', () => {
  it('full form renders the Search launcher + the route surfaces as links', async () => {
    const { getByRole } = await renderInShell(<GlobalSurfacesStrip mode="full" />)
    expect(getByRole('button', { name: 'Search' })).not.toBeNull()
    expect(getByRole('link', { name: 'Home' })).not.toBeNull()
    expect(getByRole('link', { name: 'Notifications' })).not.toBeNull()
    expect(getByRole('link', { name: 'Graph' })).not.toBeNull()
  })

  it('Search flips the command-bar store open (EC-3); it is never a link', async () => {
    const { getByRole, queryByRole } = await renderInShell(<GlobalSurfacesStrip mode="full" />)
    expect(queryByRole('link', { name: 'Search' })).toBeNull()
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })

  it('condensed form: Search icon + overflow Menu — and NO hamburger (app-shell owns that now)', async () => {
    const { getByRole, queryByRole } = await renderInShell(<GlobalSurfacesStrip mode="condensed" />)
    expect(getByRole('button', { name: 'Search' })).not.toBeNull()
    expect(getByRole('button', { name: 'More' })).not.toBeNull()
    expect(queryByRole('button', { name: 'Open navigation' })).toBeNull()
  })

  it('condensed overflow Menu lists the route surfaces', async () => {
    const { getByRole } = await renderInShell(<GlobalSurfacesStrip mode="condensed" />)
    fireEvent.click(getByRole('button', { name: 'More' }))
    await waitFor(() => expect(getByRole('menuitem', { name: 'Settings' })).not.toBeNull())
    expect(getByRole('menuitem', { name: 'Home' })).not.toBeNull()
  })
})
