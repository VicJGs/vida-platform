// @vitest-environment jsdom
// fe-shell-scope (#15) · S1 — the scope selector: store semantics + the five read states + the switch interaction.
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { ScopeSelector } from './scope-selector'
import type { SpaceOption, SpacesScopeRead } from './spaces-scope'
import { useScopeStore } from '../stores/scope-store'

const SPACES: SpaceOption[] = [
  { id: 's1', name: 'Work' },
  { id: 's2', name: 'Personal' },
]

afterEach(() => {
  cleanup()
  useScopeStore.setState({ activeSpaceId: null })
})

// Fresh client per render (retry off so the error state settles immediately; no stale cache across tests).
function renderSelector(read: SpacesScopeRead) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <UIProvider>
        <ScopeSelector read={read} />
      </UIProvider>
    </QueryClientProvider>,
  )
}

describe('useScopeStore', () => {
  it('defaults to global (null)', () => {
    expect(useScopeStore.getState().activeSpaceId).toBeNull()
  })
  it('setScope sets and clears the active space', () => {
    useScopeStore.getState().setScope('s1')
    expect(useScopeStore.getState().activeSpaceId).toBe('s1')
    useScopeStore.getState().setScope(null)
    expect(useScopeStore.getState().activeSpaceId).toBeNull()
  })
})

describe('ScopeSelector — read states', () => {
  it('loading → a busy trigger', () => {
    renderSelector(() => new Promise(() => {})) // never resolves
    expect(screen.getByLabelText('Loading spaces')).toBeTruthy()
  })

  it('empty [] → global-only, disabled', async () => {
    renderSelector(() => Promise.resolve([]))
    const btn = await screen.findByLabelText('Scope: All (no spaces yet)')
    expect(btn).toBeTruthy()
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })

  it('error → calm role=status, still global', async () => {
    renderSelector(() => Promise.reject(new Error('boom')))
    const status = await screen.findByRole('status')
    expect(status.textContent).toContain('offline')
    expect(screen.getByLabelText('Scope: All (spaces unavailable)')).toBeTruthy()
  })

  it('populated → a switchable Menu (All + each Space)', async () => {
    renderSelector(() => Promise.resolve(SPACES))
    fireEvent.click(await screen.findByRole('button', { name: 'Spaces: All' }))
    await waitFor(() => expect(screen.getByText('Work')).toBeTruthy())
    expect(screen.getByText('Personal')).toBeTruthy()
  })

  it('selecting a Space sets the scope; the trigger reflects it', async () => {
    renderSelector(() => Promise.resolve(SPACES))
    fireEvent.click(await screen.findByRole('button', { name: 'Spaces: All' }))
    fireEvent.click(await screen.findByText('Work'))
    await waitFor(() => expect(useScopeStore.getState().activeSpaceId).toBe('s1'))
    expect(await screen.findByRole('button', { name: 'Spaces: Work' })).toBeTruthy()
  })
})

describe('ScopeSelector — compact (≤375 strip)', () => {
  function renderCompact(read: SpacesScopeRead) {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    return render(
      <QueryClientProvider client={client}>
        <UIProvider>
          <ScopeSelector read={read} compact />
        </UIProvider>
      </QueryClientProvider>,
    )
  }

  it('populated: trigger drops the "Spaces: " prefix but keeps the full name in aria-label (EC-1)', async () => {
    renderCompact(() => Promise.resolve(SPACES))
    const trigger = await screen.findByRole('button', { name: 'Scope: All' }) // aria-label, not visible text
    expect(trigger.textContent).toContain('All')
    expect(trigger.textContent).not.toContain('Spaces:')
  })

  it('empty: still global-only, aria-label unchanged, no prefix', async () => {
    renderCompact(() => Promise.resolve([]))
    const btn = await screen.findByLabelText('Scope: All (no spaces yet)')
    expect(btn.textContent).not.toContain('Spaces:')
    expect((btn as HTMLButtonElement).disabled).toBe(true)
  })
})
