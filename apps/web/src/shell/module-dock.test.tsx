// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup } from '@testing-library/react'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { ModuleDock } from './module-dock'
import { renderInShell } from './test-router'

afterEach(() => {
  cleanup()
  useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false })
})

describe('ModuleDock', () => {
  it('renders grouped dock modules from MODULE_MAP (sidebar form)', async () => {
    const { getByRole, getByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />)
    expect(getByRole('link', { name: 'Tasks' })).not.toBeNull()
    expect(getByRole('link', { name: 'Notes' })).not.toBeNull()
    // visible group headings in the full (non-icon-only) form
    expect(getByText('Productivity')).not.toBeNull()
    expect(getByText('Integration')).not.toBeNull()
  })

  it('hides fail-closed conditional modules + their now-empty group (S2-BR-b, S2-BR-a2)', async () => {
    const { queryByRole, queryByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />)
    // gamification is visibleWhen a flag that is OFF in M1.0 → absent
    expect(queryByRole('link', { name: 'Gamification' })).toBeNull()
    // platform-services (only gamification) is left empty → its heading is not rendered
    expect(queryByText('Platform Services')).toBeNull()
  })

  it('rail form is icon-only: no visible headings, links keep accessible names via aria-label (FOLD-2)', async () => {
    const { getByRole, queryByText } = await renderInShell(<ModuleDock dock="rail" bp="tablet" />)
    expect(queryByText('Productivity')).toBeNull() // no visible heading in the icon rail
    expect(getByRole('link', { name: 'Tasks' })).not.toBeNull() // name still announced (aria-label)
    // grouping is preserved via aria-label on the group container
    expect(document.querySelector('[role="group"][aria-label="Productivity"]')).not.toBeNull()
  })

  it('shows the collapse toggle only on the desktop sidebar, with aria-expanded (M4/FOLD-1)', async () => {
    const sidebar = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />)
    const toggle = sidebar.getByRole('button', { name: 'Collapse sidebar' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    cleanup()

    const rail = await renderInShell(<ModuleDock dock="rail" bp="tablet" />)
    expect(rail.queryByRole('button', { name: /sidebar/i })).toBeNull()
  })

  it('a collapsed desktop sidebar is icon-only but keeps an Expand toggle (FOLD-1)', async () => {
    useAppShellUIStore.setState({ isSidebarOpen: false })
    const { getByRole, queryByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />)
    expect(queryByText('Productivity')).toBeNull() // collapsed → icon-only, no headings
    expect(getByRole('button', { name: 'Expand sidebar' }).getAttribute('aria-expanded')).toBe('false')
  })
})
