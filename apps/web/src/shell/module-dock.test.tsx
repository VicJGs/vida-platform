// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { USER_PREFERENCES_DEFAULTS } from '@vida/core'

// preferences-rescope R5: the dock reads the live module visibility + names (the shared nav filter).
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())

import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { ModuleDock } from './module-dock'
import { renderInShell } from './test-router'
import { queryClient } from '../lib/query-client'
import { resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { resetPreferencesWriterForTests } from '../preferences/writer-instance'

beforeEach(() => {
  resetTestPreferences()
})

afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
  useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false })
})

describe('ModuleDock', () => {
  it('renders grouped dock modules from MODULE_MAP (sidebar form)', async () => {
    const { getByRole, getByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />, '/', { prefs: true })
    expect(getByRole('link', { name: 'Tasks' })).not.toBeNull()
    expect(getByRole('link', { name: 'Notes' })).not.toBeNull()
    // visible group headings in the full (non-icon-only) form
    expect(getByText('Productivity')).not.toBeNull()
    expect(getByText('Integration')).not.toBeNull()
  })

  it('hides fail-closed conditional modules + their now-empty group (S2-BR-b, S2-BR-a2)', async () => {
    const { queryByRole, queryByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />, '/', { prefs: true })
    // gamification is visibleWhen a flag that is OFF in M1.0 → absent
    expect(queryByRole('link', { name: 'Gamification' })).toBeNull()
    // platform-services (only gamification) is left empty → its heading is not rendered
    expect(queryByText('Platform Services')).toBeNull()
  })

  it('rail form is icon-only: no visible headings, links keep accessible names via aria-label (FOLD-2)', async () => {
    const { getByRole, queryByText } = await renderInShell(<ModuleDock dock="rail" bp="tablet" />, '/', { prefs: true })
    expect(queryByText('Productivity')).toBeNull() // no visible heading in the icon rail
    expect(getByRole('link', { name: 'Tasks' })).not.toBeNull() // name still announced (aria-label)
    // grouping is preserved via aria-label on the group container
    expect(document.querySelector('[role="group"][aria-label="Productivity"]')).not.toBeNull()
  })

  it('shows the collapse toggle only on the desktop sidebar, with aria-expanded (M4/FOLD-1)', async () => {
    const sidebar = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />, '/', { prefs: true })
    const toggle = sidebar.getByRole('button', { name: 'Collapse sidebar' })
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    cleanup()

    const rail = await renderInShell(<ModuleDock dock="rail" bp="tablet" />, '/', { prefs: true })
    expect(rail.queryByRole('button', { name: /sidebar/i })).toBeNull()
  })

  it('a collapsed desktop sidebar is icon-only but keeps an Expand toggle (FOLD-1)', async () => {
    useAppShellUIStore.setState({ isSidebarOpen: false })
    const { getByRole, queryByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />, '/', { prefs: true })
    expect(queryByText('Productivity')).toBeNull() // collapsed → icon-only, no headings
    expect(getByRole('button', { name: 'Expand sidebar' }).getAttribute('aria-expanded')).toBe('false')
  })

  // ---- preferences-rescope R5 (PLAN-R5 R5-BR-2/3/4; dock live proof = shell-rescope, D-R5-2) ----
  function seedPrefs(visibility: Record<string, boolean>, names: Record<string, string> = {}) {
    testPreferences.state.user = {
      ...USER_PREFERENCES_DEFAULTS,
      module_visibility: visibility,
      dashboard_layout: { moduleNames: names },
    }
  }

  it('omits a hidden module and shows a renamed one under its custom name (sidebar)', async () => {
    seedPrefs({ tasks: false }, { habits: 'Rituals' })
    const { getByRole, queryByRole } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />, '/', { prefs: true })
    await waitFor(() => expect(getByRole('link', { name: 'Rituals' })).not.toBeNull())
    expect(queryByRole('link', { name: 'Tasks' })).toBeNull()
    expect(queryByRole('link', { name: 'Habits' })).toBeNull()
  })

  it('the rail (icon-only) announces the custom name', async () => {
    seedPrefs({}, { habits: 'Rituals' })
    const { getByRole } = await renderInShell(<ModuleDock dock="rail" bp="tablet" />, '/', { prefs: true })
    await waitFor(() => expect(getByRole('link', { name: 'Rituals' })).not.toBeNull())
  })

  it('hiding every module of a group drops its heading', async () => {
    seedPrefs({ tasks: false, habits: false, projects: false, routines: false })
    const { queryByText, getByText } = await renderInShell(<ModuleDock dock="sidebar" bp="desktop" />, '/', { prefs: true })
    await waitFor(() => expect(queryByText('Productivity')).toBeNull())
    expect(getByText('Integration')).not.toBeNull()
  })
})
