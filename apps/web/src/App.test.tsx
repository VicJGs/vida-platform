// @vitest-environment jsdom
// UI-4 · S4 — the App.tsx first-run branch (FOLD-2). `./db/boot` (ensureDbReady) + `./onboarding/first-run-repo`
// are mocked so no worker loads; the app branch mounts the real router/shell (the routes.test.tsx precedent).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({ ensureDbReady: vi.fn(), read: vi.fn(), write: vi.fn() }))
vi.mock('./db/boot', () => ({ ensureDbReady: h.ensureDbReady }))
// preferences-rescope R2: the PreferencesBridge (mounted in App) reads via the composition root — serve the fake.
vi.mock('./db/composition-root', async () => (await import('./test/preferences-test-utils')).compositionRootMock())
vi.mock('./onboarding/first-run-repo', () => ({
  readFirstRunComplete: h.read,
  writeFirstRunComplete: h.write,
}))
// preferences-rescope R3 — the first-render log (mutation-#2 kill target): wrap the real HomeSurface (routes.tsx:17
// imports it by name) to record the arrangement it renders on EVERY render.
const renderLog = vi.hoisted(() => ({ arrangements: [] as string[] }))
vi.mock('./home/home-surface', async (orig) => {
  const m = await orig<typeof import('./home/home-surface')>()
  function LoggedHomeSurface(props: Parameters<typeof m.HomeSurface>[0]) {
    renderLog.arrangements.push(m.useHomeArrangement())
    return m.HomeSurface(props)
  }
  return { ...m, HomeSurface: LoggedHomeSurface, default: LoggedHomeSurface }
})

import { USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { App } from './App'
import { useGuidedSetupStore } from './onboarding/guided-setup-store'
import { queryClient } from './lib/query-client'
import { preferencesWriter, resetPreferencesWriterForTests } from './preferences/writer-instance'
import { paintRoot, toThemeHint } from './preferences/theme-hint'
import { resetTestPreferences, testPreferences } from './test/preferences-test-utils'
import { resetThemeStoreForTests, useThemeStore } from './stores/theme-store'

// "Is the app shell mounted?" — the reserved top strip is present iff the shell frame mounted. (fe-shell #14 reshape:
// the Modules nav is now a dock⇄float panel built in S3; the always-present frame signal is the top strip / banner.)
const shellChrome = () => document.querySelector('[data-region="topStrip"]')

beforeEach(() => {
  h.ensureDbReady.mockReset().mockResolvedValue(undefined)
  h.read.mockReset()
  h.write.mockReset()
  useGuidedSetupStore.setState({ phase: 'none' }) // the launch phase is a module-global store — reset between tests
  resetTestPreferences()
  renderLog.arrangements = []
})

// R3: the preferences cache + writer + theme store are module singletons; with a 5 min stale time a cached seed would
// make every boot-gate test below order-dependent. Reset them all.
afterEach(() => {
  cleanup()
  queryClient.clear()
  resetPreferencesWriterForTests()
  resetThemeStoreForTests()
  document.documentElement.removeAttribute('style')
})

describe('App first-run branch', () => {
  it('shows onboarding (not the app chrome) on first launch', async () => {
    h.read.mockResolvedValue(false)
    render(<App />)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeTruthy())
    expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy()
    expect(shellChrome()).toBeNull() // the dock/shell never mounts during onboarding (S4-BR-h)
  })

  it('goes straight to the app (shell + index route) on a returning launch', async () => {
    h.read.mockResolvedValue(true)
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull())
    expect(document.querySelector('[data-region="content"]')).not.toBeNull()
    expect(screen.queryByRole('button', { name: 'Get started' })).toBeNull()
  })

  it('never flashes the app chrome before onboarding resolves (no-flash)', async () => {
    let resolveRead: (v: boolean) => void = () => {}
    h.read.mockReturnValue(
      new Promise<boolean>((r) => {
        resolveRead = r
      }),
    )
    render(<App />)
    // dbReady settles but the marker read is still pending → Loading, and crucially NO shell chrome.
    await waitFor(() => expect(screen.getByText('Loading…')).toBeTruthy())
    expect(shellChrome()).toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    // Only once the read resolves does onboarding appear — the app chrome was never committed.
    resolveRead(false)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy())
    expect(shellChrome()).toBeNull()
  })

  // Walk the 4-screen first-run onboarding to completion. markComplete writes the marker + flips to the app.
  const completeOnboarding = async () => {
    await waitFor(() => expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter Vida' }))
    await waitFor(() => expect(h.write).toHaveBeenCalledTimes(1))
  }
  const invitationHeading = () => screen.queryByRole('heading', { name: /make vida yours/i })

  // fe-onboarding S4 — reach path (a): completing onboarding offers the guided-setup invitation OVER the app (opt-in,
  // never a wall). The app (shell) mounts behind it; the invitation is a fixed overlay, not a replacement.
  it('writes the completion marker, mounts the app, and offers the guided-setup invitation', async () => {
    h.read.mockResolvedValue(false)
    h.write.mockResolvedValue(undefined)
    render(<App />)
    await completeOnboarding()
    await waitFor(() => expect(shellChrome()).not.toBeNull()) // the app is mounted behind the overlay
    await waitFor(() => expect(invitationHeading()).not.toBeNull()) // the opt-in invitation is offered
  })

  it('skipping the invitation returns to the app (never a wall)', async () => {
    h.read.mockResolvedValue(false)
    h.write.mockResolvedValue(undefined)
    render(<App />)
    await completeOnboarding()
    await waitFor(() => expect(invitationHeading()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))
    await waitFor(() => expect(invitationHeading()).toBeNull()) // overlay gone
    expect(shellChrome()).not.toBeNull() // the app remains
  })

  it('starting from the invitation opens the guided-setup flow (modules step first)', async () => {
    h.read.mockResolvedValue(false)
    h.write.mockResolvedValue(undefined)
    render(<App />)
    await completeOnboarding()
    await waitFor(() => expect(invitationHeading()).not.toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /set up your workspace/i }))
    // the flow's first step is the module enable-set picker (Notes toggle present)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Notes', pressed: true })).toBeTruthy())
  })
})

// preferences-rescope R3 (PLAN-R3 R3-BR-2/3/4/5; IMPL-PLAN-R3 step 9) — the boot seed gate, the preview clear, the
// guarded canvas paint, and the first-render guarantee.
describe('App boot — preferences seed (R3)', () => {
  const darkHint = toThemeHint({ preset: 'editorial', mode: 'dark', density: 'calm' })
  const lightHint = toThemeHint({ preset: 'editorial', mode: 'light', density: 'calm' })
  const htmlBg = () => document.documentElement.style.backgroundColor
  const asRgb = (hex: string) => {
    const el = document.createElement('div')
    el.style.backgroundColor = hex
    return el.style.backgroundColor
  }

  it('holds Loading (no shell) while the seed is pending, then mounts the app', async () => {
    h.read.mockResolvedValue(true)
    testPreferences.holdReads()
    render(<App />)
    await waitFor(() => expect(screen.getByText('Loading…')).toBeTruthy())
    // Without the gate the shell mounts as soon as the first-run read resolves (well inside 1.5 s); with it, Loading holds.
    await new Promise((r) => setTimeout(r, 1500))
    expect(screen.getByText('Loading…')).toBeTruthy()
    expect(shellChrome()).toBeNull()
    testPreferences.state.releaseReads()
    await waitFor(() => expect(shellChrome()).not.toBeNull(), { timeout: 10_000 })
  }, 30_000)

  it('a FAILED seed never blocks boot: the app mounts on the defaults', async () => {
    h.read.mockResolvedValue(true)
    testPreferences.state.failReads = 'all'
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull(), { timeout: 10_000 })
  }, 30_000)

  it('guarded paint: the inline dark paint stands while the seed is pending, then follows the seeded selection', async () => {
    h.read.mockResolvedValue(true)
    paintRoot(darkHint) // what index.html's inline script did before React
    testPreferences.state.user = { ...USER_PREFERENCES_DEFAULTS, theme: 'dark' }
    testPreferences.holdReads()
    render(<App />)
    await waitFor(() => expect(screen.getByText('Loading…')).toBeTruthy())
    expect(htmlBg()).toBe(asRgb(darkHint.bg)) // NOT overwritten by THEME_DEFAULT (light) during Loading
    testPreferences.state.releaseReads()
    await waitFor(() => expect(shellChrome()).not.toBeNull(), { timeout: 10_000 })
    expect(htmlBg()).toBe(asRgb(darkHint.bg))
  }, 30_000)

  it('guarded paint: a failed seed paints the default selection (the app renders the defaults)', async () => {
    h.read.mockResolvedValue(true)
    paintRoot(darkHint)
    testPreferences.state.failReads = 'all'
    render(<App />)
    await waitFor(() => expect(htmlBg()).toBe(asRgb(lightHint.bg)), { timeout: 10_000 })
  }, 30_000)

  it('mutation-#2 kill target: a persisted dashboardFirst is the arrangement of the FIRST Home render', async () => {
    h.read.mockResolvedValue(true)
    testPreferences.state.user = { ...USER_PREFERENCES_DEFAULTS, dashboard_layout: { arrangement: 'dashboardFirst' } }
    render(<App />)
    await waitFor(() => expect(renderLog.arrangements.length).toBeGreaterThan(0), { timeout: 10_000 })
    expect(renderLog.arrangements[0]).toBe('dashboardFirst')
  }, 30_000)

  it('leaving guided setup (every exit = dismiss) clears the preview; a Settings preset change then applies', async () => {
    h.read.mockResolvedValue(true)
    useGuidedSetupStore.setState({ phase: 'running' })
    render(<App />)
    await waitFor(() => expect(shellChrome()).not.toBeNull(), { timeout: 10_000 })
    useThemeStore.getState().setPreview('reader')
    expect(useThemeStore.getState().selection.preset).toBe('reader')
    useGuidedSetupStore.getState().dismiss() // finish, skip and close all call dismiss (guided-setup-store.ts:16-17)
    await waitFor(() => expect(useThemeStore.getState().previewPreset).toBeNull())
    expect(useThemeStore.getState().selection.preset).toBe('editorial') // back to the persisted theme
    void preferencesWriter.patchDashboardLayout({ theme: 'quietDesk' }) // what the Appearance preset control does
    expect(useThemeStore.getState().selection.preset).toBe('quietDesk')
    await preferencesWriter.flushAll()
  }, 30_000)
})
