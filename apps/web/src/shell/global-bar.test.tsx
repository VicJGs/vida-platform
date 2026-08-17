// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent } from '@testing-library/react'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { GlobalBar } from './global-bar'
import { renderInShell } from './test-router'

afterEach(() => {
  cleanup()
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
})

describe('GlobalBar', () => {
  it('full form renders the Search launcher + route surfaces as links', async () => {
    const { getByRole } = await renderInShell(<GlobalBar mode="full" onOpenMobileNav={() => {}} />)
    expect(getByRole('button', { name: 'Search' })).not.toBeNull()
    expect(getByRole('link', { name: 'Notifications' })).not.toBeNull()
    expect(getByRole('link', { name: 'Settings' })).not.toBeNull()
  })

  it('Search flips the command-bar store open (S2-BR-g); S3 renders the overlay', async () => {
    const { getByRole } = await renderInShell(<GlobalBar mode="full" onOpenMobileNav={() => {}} />)
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
    fireEvent.click(getByRole('button', { name: 'Search' }))
    expect(useCommandBarUIStore.getState().isOpen).toBe(true)
  })

  it('condensed form: hamburger opens the drawer + search icon + overflow menu trigger', async () => {
    const onOpenMobileNav = vi.fn()
    const { getByRole } = await renderInShell(<GlobalBar mode="condensed" onOpenMobileNav={onOpenMobileNav} />)
    fireEvent.click(getByRole('button', { name: 'Open navigation' }))
    expect(onOpenMobileNav).toHaveBeenCalledOnce()
    expect(getByRole('button', { name: 'Search' })).not.toBeNull()
    expect(getByRole('button', { name: 'More' })).not.toBeNull()
  })
})
