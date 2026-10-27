// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'

// preferences-rescope R5: the bar reads the live preferences (module visibility + names) and the ⌘K history.
vi.mock('../db/composition-root', async () => (await import('../test/preferences-test-utils')).compositionRootMock())
const { platform } = vi.hoisted(() => ({ platform: { value: 'other' as 'mac' | 'other' } }))
vi.mock('../lib/platform', () => ({ detectPlatform: () => platform.value }))

import { CommandBar } from './command-bar'
import { useCommandBarUIStore } from '../stores/command-bar-ui-store'
import { useAppShellUIStore } from '../stores/app-shell-ui-store'
import { queryClient } from '../lib/query-client'
import { createPrefsWrapper, resetTestPreferences, testPreferences } from '../test/preferences-test-utils'
import { preferencesWriter, resetPreferencesWriterForTests } from '../preferences/writer-instance'
import { commandHistory, resetCommandHistoryForTests } from '../preferences/command-history'
import { SETTINGS_COPY } from '../settings/settings-copy'

// The run-context's `navigate` is the ONE host injection (S3-BR-e). Mock it to a spy so the test needs no router.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }))
vi.mock('./nav-link', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./nav-link')>()
  return { ...actual, useShellNavigate: () => navigateSpy }
})

beforeEach(() => {
  resetTestPreferences()
  resetCommandHistoryForTests()
  platform.value = 'other'
})

afterEach(async () => {
  cleanup()
  await commandHistory.idle() // drain: an in-flight record would otherwise land in the NEXT test's fake
  queryClient.clear()
  resetPreferencesWriterForTests()
  navigateSpy.mockReset()
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
  useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false })
})

function renderBar() {
  const Prefs = createPrefsWrapper()
  return render(
    <Prefs>
      <UIProvider>
        <CommandBar />
      </UIProvider>
    </Prefs>,
  )
}
const optionNames = () => screen.getAllByRole('option').map((o) => o.getAttribute('aria-label') ?? o.textContent)
const activeId = () => screen.getByRole('combobox').getAttribute('aria-activedescendant')
const pinKey = (extra: Record<string, unknown> = {}) =>
  fireEvent.keyDown(screen.getByRole('combobox'), { code: 'KeyP', key: 'π', altKey: true, ...extra })
const liveRegion = () => document.querySelector('[data-cmdbar-announcer]') as HTMLElement
/** Arrow down until the option named `name` is active. */
function arrowTo(name: string) {
  const index = optionNames().indexOf(name)
  for (let i = 0; i < index; i++) fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
}
/** Wait for the user-row read (the writer only syncs the cache once a DB value is confirmed). */
const prefsLoaded = () => waitFor(() => expect(testPreferences.state.reads.user).toBeGreaterThan(0))

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
    await waitFor(() => expect(screen.getAllByRole('status').some((el) => /DB-8/.test(el.textContent ?? ''))).toBe(true))
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

  // ---- preferences-rescope R5 ----------------------------------------------------------------------------------

  it('is reactive: hiding or renaming a module updates the open list without a remount (D12)', async () => {
    openBar()
    renderBar()
    await prefsLoaded()
    await waitFor(() => expect(screen.getByRole('option', { name: 'Tasks' })).not.toBeNull())
    act(() => {
      void preferencesWriter.setModuleVisibilityMap({ tasks: false })
      void preferencesWriter.patchModuleNames({ habits: 'Rituals' })
    })
    await waitFor(() => expect(screen.queryByRole('option', { name: 'Tasks' })).toBeNull())
    expect(screen.getByRole('option', { name: 'Rituals' })).not.toBeNull()
    expect(screen.getByRole('option', { name: 'Settings' })).not.toBeNull() // EC-8
  })

  it('ranks by history: a pinned command leads, then the most used', async () => {
    testPreferences.state.history = [
      { command_key: 'nav:/projects', command_label: 'Projects', command_category: 'navigation', use_count: 3, last_used_at: Date.now(), is_pinned: false },
      { command_key: 'nav:/finance', command_label: 'Finance', command_category: 'navigation', use_count: 0, last_used_at: null, is_pinned: true },
    ]
    openBar()
    renderBar()
    await waitFor(() => expect(optionNames().slice(0, 2)).toEqual(['Finance' + SETTINGS_COPY.cmdPinnedSuffix, 'Projects']))
  })

  it('a history read failure leaves the list unranked and shows no error (business-rules.md:34)', async () => {
    testPreferences.state.history = [
      { command_key: 'nav:/projects', command_label: 'Projects', command_category: 'navigation', use_count: 3, last_used_at: Date.now(), is_pinned: false },
    ]
    testPreferences.state.failHistory = 'read'
    openBar()
    renderBar()
    await waitFor(() => expect(queryClient.getQueryState(['preferences', 'commands'])?.status).toBe('error'))
    expect(testPreferences.state.historyReads).toBeGreaterThan(0)
    expect(optionNames()[0]).toBe('Notes')
    expect(screen.queryByText(/fail|error|couldn/i)).toBeNull()
  })

  it('runs the command BEFORE recording it (best-effort, after run)', async () => {
    const record = vi.spyOn(testPreferences.svc, 'recordCommand')
    openBar()
    renderBar()
    fireEvent.click(screen.getByRole('option', { name: 'Notes' }))
    await commandHistory.idle()
    expect(navigateSpy).toHaveBeenCalledWith('/notes')
    expect(record).toHaveBeenCalledWith('nav:/notes', 'Notes', 'navigation')
    expect(navigateSpy.mock.invocationCallOrder[0]).toBeLessThan(record.mock.invocationCallOrder[0]!)
  })

  it('record is called only after the command ran and the bar closed (it can never block run)', () => {
    const seenAtRecord: { ran: boolean; open: boolean }[] = []
    vi.spyOn(commandHistory, 'record').mockImplementation(() => {
      seenAtRecord.push({ ran: navigateSpy.mock.calls.length > 0, open: useCommandBarUIStore.getState().isOpen })
    })
    openBar()
    renderBar()
    fireEvent.click(screen.getByRole('option', { name: 'Notes' }))
    expect(seenAtRecord).toEqual([{ ran: true, open: false }])
  })

  it('a failed record never blocks the command', async () => {
    testPreferences.state.failHistory = 'write'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openBar()
    renderBar()
    fireEvent.click(screen.getByRole('option', { name: 'Notes' }))
    await commandHistory.idle()
    expect(navigateSpy).toHaveBeenCalledWith('/notes')
    expect(useCommandBarUIStore.getState().isOpen).toBe(false)
    warn.mockRestore()
  })

  it('Alt+P (by key position — mac Option gives "π") pins the active option and announces it', async () => {
    openBar()
    renderBar()
    expect(liveRegion()).not.toBeNull() // mounted, empty, before the first pin
    expect(liveRegion().textContent).toBe('')
    pinKey()
    await waitFor(() => expect(liveRegion().textContent).toBe(SETTINGS_COPY.cmdPinned('Notes')))
    expect(testPreferences.state.history[0]).toMatchObject({ command_key: 'nav:/notes', is_pinned: true })
    expect((screen.getByRole('combobox') as HTMLInputElement).value).toBe('')
  })

  it('⌘/Ctrl+Option+P does nothing (only plain Alt+P pins)', async () => {
    openBar()
    renderBar()
    pinKey({ metaKey: true })
    pinKey({ ctrlKey: true })
    await commandHistory.idle()
    expect(testPreferences.state.historyCalls).toEqual([])
  })

  it('pinning a never-run command makes it lead; the highlight stays on it (by id)', async () => {
    openBar()
    renderBar()
    await waitFor(() => expect(optionNames()).toContain('Finance'))
    arrowTo('Finance')
    const before = activeId()
    pinKey()
    await waitFor(() => expect(optionNames()[0]).toBe('Finance' + SETTINGS_COPY.cmdPinnedSuffix))
    expect(activeId()).toBe(before)
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' })
    expect(navigateSpy).toHaveBeenCalledWith('/finance')
  })

  it('two quick Alt+P presses pin then unpin (the pending overlay, not the stale cache)', async () => {
    openBar()
    renderBar()
    pinKey()
    pinKey()
    await commandHistory.idle()
    expect(testPreferences.state.historyCalls).toEqual(['pin:nav:/notes:true', 'pin:nav:/notes:false'])
  })

  it('three quick Alt+P presses end pinned (pin · unpin · pin) — a pending entry settles only after its own write', async () => {
    openBar()
    renderBar()
    pinKey()
    pinKey()
    pinKey()
    await commandHistory.idle()
    expect(testPreferences.state.historyCalls).toEqual(['pin:nav:/notes:true', 'pin:nav:/notes:false', 'pin:nav:/notes:true'])
    await waitFor(() => expect(optionNames()[0]).toBe('Notes' + SETTINGS_COPY.cmdPinnedSuffix))
    expect(testPreferences.state.history[0]).toMatchObject({ command_key: 'nav:/notes', is_pinned: true })
  })

  it('a pin that settles after the bar closed is not announced on the next open', async () => {
    openBar()
    renderBar()
    pinKey()
    act(() => useCommandBarUIStore.getState().close())
    await commandHistory.idle()
    await new Promise((r) => setTimeout(r, 120)) // past ANNOUNCE_GAP_MS
    act(() => openBar())
    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeNull())
    expect(liveRegion().textContent).toBe('')
  })

  it('a failed pin announces it; a repeat failure is re-announced (cleared in between)', async () => {
    testPreferences.state.failHistory = 'write'
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    openBar()
    renderBar()
    const seen: string[] = []
    const observer = new MutationObserver(() => seen.push(liveRegion().textContent ?? ''))
    observer.observe(liveRegion(), { childList: true, characterData: true, subtree: true })
    pinKey()
    await waitFor(() => expect(liveRegion().textContent).toBe(SETTINGS_COPY.cmdPinFailed('Notes')))
    pinKey()
    await waitFor(() => expect(seen.filter((t) => t === SETTINGS_COPY.cmdPinFailed('Notes'))).toHaveLength(2))
    expect(seen).toContain('')
    observer.disconnect()
    warn.mockRestore()
  })

  it('closing and reopening resets the highlight to the first option (the bar stays mounted)', async () => {
    openBar()
    renderBar()
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'ArrowDown' })
    expect(activeId()).not.toBe(screen.getAllByRole('option')[0]!.id)
    act(() => useCommandBarUIStore.getState().close())
    act(() => openBar())
    await waitFor(() => expect(screen.getByRole('combobox')).not.toBeNull())
    expect(activeId()).toBe(screen.getAllByRole('option')[0]!.id)
  })

  it('the footer hint is the combobox description (how SR users learn Alt+P), per platform', async () => {
    platform.value = 'mac'
    openBar()
    renderBar()
    const describedBy = screen.getByRole('combobox').getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    expect(document.getElementById(describedBy!)?.textContent).toBe(SETTINGS_COPY.cmdHintMac)
  })
})
