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

const shellNav = () => document.querySelector('nav[aria-label="Modules"]')

beforeEach(() => {
  h.ensureDbReady.mockReset().mockResolvedValue(undefined)
  h.read.mockReset()
  h.write.mockReset()
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
    expect(shellNav()).toBeNull() // the dock/shell never mounts during onboarding (S4-BR-h)
  })

  it('goes straight to the app (shell + index route) on a returning launch', async () => {
    h.read.mockResolvedValue(true)
    render(<App />)
    await waitFor(() => expect(screen.getByText('Vida')).toBeTruthy())
    expect(shellNav()).not.toBeNull()
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
    expect(shellNav()).toBeNull()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
    // Only once the read resolves does onboarding appear — the app chrome was never committed.
    resolveRead(false)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy())
    expect(shellNav()).toBeNull()
  })

  it('writes the completion marker then mounts the app', async () => {
    h.read.mockResolvedValue(false)
    h.write.mockResolvedValue(undefined)
    render(<App />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Get started' })).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Get started' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Enter Vida' }))
    await waitFor(() => expect(h.write).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByText('Vida')).toBeTruthy())
  })
})
