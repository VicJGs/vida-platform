// @vitest-environment jsdom
// UI-4 · S4 — the App.tsx first-run branch (FOLD-2). `./db/boot` (ensureDbReady) + `./onboarding/first-run-repo`
// are mocked so no worker loads; the app branch mounts the real router/shell (the routes.test.tsx precedent).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'

const h = vi.hoisted(() => ({ ensureDbReady: vi.fn(), read: vi.fn(), write: vi.fn() }))
vi.mock('./db/boot', () => ({ ensureDbReady: h.ensureDbReady }))
vi.mock('./onboarding/first-run-repo', () => ({
  readFirstRunComplete: h.read,
  writeFirstRunComplete: h.write,
}))

import { App } from './App'
import { useGuidedSetupStore } from './onboarding/guided-setup-store'

// "Is the app shell mounted?" — the reserved top strip is present iff the shell frame mounted. (fe-shell #14 reshape:
// the Modules nav is now a dock⇄float panel built in S3; the always-present frame signal is the top strip / banner.)
const shellChrome = () => document.querySelector('[data-region="topStrip"]')

beforeEach(() => {
  h.ensureDbReady.mockReset().mockResolvedValue(undefined)
  h.read.mockReset()
  h.write.mockReset()
  useGuidedSetupStore.setState({ phase: 'none' }) // the launch phase is a module-global store — reset between tests
})

afterEach(() => {
  cleanup()
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
