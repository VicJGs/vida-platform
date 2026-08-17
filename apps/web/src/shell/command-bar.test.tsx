// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { CommandBar } from './command-bar'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'

// The run-context's `navigate` is the ONE host injection (S3-BR-e). Mock it to a spy so the test needs no router.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))
vi.mock('./nav-link', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./nav-link')>()
  return { ...actual, useShellNavigate: () => navigateSpy }
})

afterEach(() => {
  cleanup()
  navigateSpy.mockClear()
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
  useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false })
})

function renderBar() {
  return render(
    <UIProvider>
      <CommandBar />
    </UIProvider>,
  )
}
function openBar(partial: Partial<{ query: string; mode: 'command' | 'search' }> = {}) {
  useCommandBarUIStore.setState({ isOpen: true, query: '', mode: 'command', ...partial })
}

describe('CommandBar', () => {
  it('renders nothing when the store is closed', () => {
    renderBar()
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('opens with focus IN the combobox input; options are non-focusable (single tab stop, B1)', async () => {
    openBar()
    renderBar()
    const input = screen.getByRole('combobox')
    await waitFor(() => expect(document.activeElement).toBe(input))
    for (const option of screen.getAllByRole('option')) {
      expect(option.getAttribute('tabindex')).toBeNull()
    }
  })

  it('command mode: renders the ranked command list as a listbox of options', () => {
    openBar()
    renderBar()
    expect(screen.getByRole('listbox')).not.toBeNull()
    expect(screen.getByRole('option', { name: 'Notes' })).not.toBeNull()
    expect(screen.getByRole('option', { name: 'Toggle sidebar' })).not.toBeNull()
  })

  it('filters gamification (visibleWhen fail-closed in M1.0)', () => {
    openBar()
    renderBar()
    expect(screen.queryByRole('option', { name: 'Gamification' })).toBeNull()
  })

  it('a navigation command executes via the injected navigate, then closes', () => {
    openBar()
    renderBar()
    fireEvent.click(screen.getByRole('option', { name: 'Notes' }))
    expect(navigateSpy).toHaveBeenCalledWith('/notes')
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
  })

  it('an action command ("Toggle sidebar") flips the shell store, then closes (no navigate)', () => {
    openBar()
    renderBar()
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(true)
    fireEvent.click(screen.getByRole('option', { name: 'Toggle sidebar' }))
    expect(useAppShellUIStore.getState().isSidebarOpen).toBe(false)
    expect(navigateSpy).not.toHaveBeenCalled()
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
  })

  it('↑/↓ move the virtual active option; Enter executes it', () => {
    openBar()
    renderBar()
    const input = screen.getByRole('combobox')
    const first = input.getAttribute('aria-activedescendant')
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    expect(input.getAttribute('aria-activedescendant')).not.toBe(first)
    // back up to the first (Notes) and execute it
    fireEvent.keyDown(input, { key: 'ArrowUp' })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(navigateSpy).toHaveBeenCalledWith('/notes')
  })

  it('search mode (non-empty query): a loud role=status message, no listbox, no aria-activedescendant (B2)', async () => {
    openBar({ query: 'meeting', mode: 'search' })
    renderBar()
    await waitFor(() => expect(screen.getByRole('status').textContent).toMatch(/DB-8/))
    expect(screen.queryByRole('listbox')).toBeNull()
    const input = screen.getByRole('combobox')
    expect(input.getAttribute('aria-activedescendant')).toBeNull()
    expect(input.getAttribute('aria-expanded')).toBe('false')
  })

  it('Esc closes the overlay', () => {
    openBar()
    renderBar()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Escape' })
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
  })
})
