// @vitest-environment jsdom
// UI-4 · S5 — the whole-shell INTEGRATION test. Unlike App.test.tsx (the S4 first-run branch) and
// command-bar.test.tsx (the S3 overlay in isolation, which mocks `useShellNavigate`), this mounts the REAL <App/>
// and drives the S1–S4 seams end-to-end through the actual router — proving they COMPOSE, not just that each works
// alone. The one thing it does NOT mock is the router injection: ⌘K → run a nav command → the real route changes.
// `./db/boot` + `./onboarding/first-run-repo` are stubbed so no worker loads and the returning-launch branch mounts
// the shell (the App.test.tsx precedent). Covers the §3.1 verification matrix + the BR-7 `/graph` lazy route.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({ ensureDbReady: vi.fn(), read: vi.fn(), write: vi.fn() }))
vi.mock('./db/boot', () => ({ ensureDbReady: h.ensureDbReady }))
// The live notes hooks read via the composition root; stub it so no worker spawns.
vi.mock('./db/composition-root', async () =>
  (await import('./test/preferences-test-utils')).compositionRootMock({ notes: { listPages: async () => [] } }),
)
vi.mock('./onboarding/first-run-repo', () => ({
  readFirstRunComplete: h.read,
  writeFirstRunComplete: h.write,
}))

import { App } from './App'
import { router } from './routes'
import { queryClient } from './lib/query-client'
import { resetPreferencesWriterForTests } from './preferences/writer-instance'
import { resetTestPreferences, testPreferences } from './test/preferences-test-utils'
import { NAV_PREFERENCES_DEFAULTS } from '@vida/core'
import { resetThemeStoreForTests } from './stores/theme-store'
import { useCommandBarUIStore } from './stores/command-bar-ui-store'
import { useAppShellUIStore } from './stores/app-shell-ui-store'

// The always-present frame signal — the reserved top strip is present iff the shell mounted. (fe-shell #14 reshape: the
// Modules nav became a dock⇄float panel built in S3; the top strip / banner is the stable whole-shell-mounted marker.)
const shellChrome = () => document.querySelector('[data-region="topStrip"]')
// Open the command bar the way a user does — the document-level ⌘K keybind (use-command-keybind), NOT by poking the
// store. This proves the S3 keybind seam is live inside the mounted shell.
const pressCmdK = () => fireEvent.keyDown(document.body, { key: 'k', metaKey: true })

beforeEach(async () => {
  h.ensureDbReady.mockReset().mockResolvedValue(undefined)
  h.read.mockReset().mockResolvedValue(true) // returning launch → straight to the app shell
  h.write.mockReset()
  // Reset the singleton router + command-bar store so each test starts from `/` with the bar closed (order-independent).
  useCommandBarUIStore.setState({ isOpen: false, query: '', mode: 'command' })
  useAppShellUIStore.setState({ isSidebarOpen: true, isMobileNavOpen: false })
  await router.navigate({ to: '/' })
})

afterEach(() => {
  cleanup()
  // preferences-rescope R3: the preferences cache/writer/theme store are module singletons (5 min stale) — reset them.
  queryClient.clear()
  resetPreferencesWriterForTests()
  resetTestPreferences()
  resetThemeStoreForTests()
})

describe('App shell — whole-shell integration (S5)', () => {
  it('composes the shell around the index route on a returning launch (S1 regions + first-run seam)', async () => {
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull())
    // The CODEC frame is present: the reserved top strip (banner/header) + the content main, with the wired
    // System/Modules panel toggles. (The Modules nav itself is a dock⇄float panel built in S3.)
    expect(document.querySelector('header')).not.toBeNull()
    expect(document.querySelector('main')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Modules' })).toBeTruthy()
    // No onboarding leaked into the returning-launch path.
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull()
  })

  it('⌘K opens the command bar and a nav command drives the REAL router (S3 router-injection seam)', async () => {
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull())

    pressCmdK()
    const input = await screen.findByRole('combobox')
    expect(input).toBeTruthy()

    // Running the "Notes" nav command drives the ACTUAL router to /notes → the BUILT Notes collection surface
    // (fe-notes-and-pages S1; the lazy chunk resolves inside the shell). Exercises the S3 command→router injection
    // seam end-to-end. (Reconciled in S2 per the prior TODO — /notes is now a registered, built route.)
    fireEvent.click(screen.getByRole('option', { name: 'Notes' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/notes'))
    await waitFor(() => expect(screen.getByRole('region', { name: 'Notes collection' })).toBeTruthy())
  })

  it('search with no index renders the loud search-unavailable state, never a blank list (S3 + BR-4)', async () => {
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull())

    pressCmdK()
    const input = await screen.findByRole('combobox')
    fireEvent.change(input, { target: { value: 'anything' } })
    // The stub provider degrades to the announced search-unavailable status (references the DB-8 seam), not silence.
    // (R5: the palette also holds an always-mounted pin announcer — a second, empty role=status.)
    await waitFor(() =>
      expect(screen.getAllByRole('status').some((el) => /DB-8/.test(el.textContent ?? ''))).toBe(true),
    )
  })

  it('the /graph route is lazy-split and degrades to the empty graph (BR-7 + BR-4-S5)', async () => {
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull())

    pressCmdK()
    await screen.findByRole('combobox')
    // "Graph" (GLOBAL_SURFACES → /graph) → the lazy chunk resolves → NeuralGraph renders its empty terminal state
    // (no graph-data source in M1.0). This exercises the lazy boundary end-to-end without crashing (WebGL stubbed).
    fireEvent.click(screen.getByRole('option', { name: 'Graph' }))
    await waitFor(() => expect(screen.getByText('No connections yet.')).toBeTruthy())
    expect(router.state.location.pathname).toBe('/graph')
  })

  it('a persisted reduce-motion preference reaches <html data-vida-motion> after boot (preferences-rescope R4, acc. 7)', async () => {
    testPreferences.state.nav = { ...NAV_PREFERENCES_DEFAULTS, reduce_motion: true }
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull())
    expect(document.documentElement.getAttribute('data-vida-motion')).toBe('reduce')
  })
})
