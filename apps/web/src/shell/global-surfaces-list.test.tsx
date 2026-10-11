// @vitest-environment jsdom
// fe-shell-scope (#15) · S2 — the panel-body surfaces list: its own <nav> landmark (IR6), the route surfaces as
// labeled links, and Search as a ⌘K button (never a link, EC-3).
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { GlobalSurfacesList } from './global-surfaces-list'
import { renderInShell } from './test-router'

afterEach(() => {
  cleanup()
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
})

describe('GlobalSurfacesList', () => {
  it('renders a labelled <nav> landmark (IR6)', async () => {
    const { getByRole } = await renderInShell(<GlobalSurfacesList />)
    expect(getByRole('navigation', { name: 'Global surfaces' })).not.toBeNull()
  })

  it('renders the route surfaces as labeled links', async () => {
    const { getByRole } = await renderInShell(<GlobalSurfacesList />)
    expect(getByRole('link', { name: 'Home' })).not.toBeNull()
    expect(getByRole('link', { name: 'Calendar' })).not.toBeNull()
    expect(getByRole('link', { name: 'Notifications' })).not.toBeNull()
    expect(getByRole('link', { name: 'Settings' })).not.toBeNull()
    expect(getByRole('link', { name: 'Graph' })).not.toBeNull()
  })

  it('marks the active surface with aria-current (EC-6, delegated to NavLink)', async () => {
    // Rendered at '/', the Home surface (to='/') is the active route → aria-current="page"; others are not.
    const { getByRole } = await renderInShell(<GlobalSurfacesList />, '/')
    expect(getByRole('link', { name: 'Home' }).getAttribute('aria-current')).toBe('page')
    expect(getByRole('link', { name: 'Settings' }).getAttribute('aria-current')).toBeNull()
  })

  it('Search is a button (never a link) that flips the command bar open (EC-3)', async () => {
    const { getByRole, queryByRole } = await renderInShell(<GlobalSurfacesList />)
    expect(queryByRole('link', { name: 'Search' })).toBeNull()
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })
})
