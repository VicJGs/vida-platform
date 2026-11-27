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
  it('full form renders the Search launcher + the five route surfaces as icon-only links (SH-14)', async () => {
    const { getByRole, getAllByRole } = await renderInShell(<GlobalSurfacesStrip mode="full" />)
    expect(getByRole('button', { name: 'Search' })).not.toBeNull()
    const links = getAllByRole('link')
    expect(links.map((l) => l.getAttribute('aria-label'))).toEqual([
      'Home',
      'Calendar',
      'Notifications',
      'Settings',
      'Graph',
    ])
    for (const link of links) expect(link.textContent).toBe('') // icons only; the label is on aria-label
  })

  it('full form marks the current surface with aria-current (SH-14)', async () => {
    const { getByRole } = await renderInShell(<GlobalSurfacesStrip mode="full" />, '/')
    expect(getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    expect(getByRole('link', { name: 'Calendar' }).getAttribute('aria-current')).toBeNull()
  })

  it('Search flips the command-bar store open (EC-3); it is never a link (SH-14)', async () => {
    const { getByRole, queryByRole } = await renderInShell(<GlobalSurfacesStrip mode="full" />)
    expect(queryByRole('link', { name: 'Search' })).toBeNull()
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })

  it('condensed form: More-only — Search folds into the menu; no standalone button, no hamburger (#16 strip-budget, SH-14)', async () => {
    const { getByRole, queryByRole } = await renderInShell(<GlobalSurfacesStrip mode="condensed" />)
    expect(queryByRole('button', { name: 'Search' })).toBeNull() // folded into More (Victor 2026-10-18)
    expect(getByRole('button', { name: 'More' })).not.toBeNull()
    expect(queryByRole('button', { name: 'Open navigation' })).toBeNull()
  })

  it('condensed overflow Menu: Search is the FIRST row (the ⌘K action, never a link) + the route surfaces (SH-14)', async () => {
    const { getByRole, getAllByRole } = await renderInShell(<GlobalSurfacesStrip mode="condensed" />)
    fireEvent.click(getByRole('button', { name: 'More' }))
    await waitFor(() => expect(getByRole('menuitem', { name: 'Search' })).not.toBeNull())
    expect(getAllByRole('menuitem')[0]!.textContent).toContain('Search')
    expect(getByRole('menuitem', { name: 'Settings' })).not.toBeNull()
    expect(getByRole('menuitem', { name: 'Home' })).not.toBeNull()
  })
})
