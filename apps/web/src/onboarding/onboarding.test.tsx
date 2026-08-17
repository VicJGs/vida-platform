// @vitest-environment jsdom
// UI-4 · S4 — the onboarding screens: step order + copy honesty, focus-to-heading, no-Esc, completion callback +
// retryable error. Wrapped in <UIProvider> (Tamagui tokens/Button need it — the command-bar.test.tsx:25 precedent).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { Onboarding } from './onboarding'
import { ONBOARDING_STEPS } from './steps'

afterEach(() => {
  cleanup()
})

function renderOnboarding(onComplete = vi.fn().mockResolvedValue(undefined)) {
  const utils = render(
    <UIProvider>
      <Onboarding onComplete={onComplete} />
    </UIProvider>,
  )
  return { ...utils, onComplete }
}

const heading = () => screen.getByRole('heading', { level: 1 })
const clickPrimary = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

describe('Onboarding', () => {
  it('renders the first step and focuses its heading', () => {
    renderOnboarding()
    expect(heading().textContent).toBe(ONBOARDING_STEPS[0]!.copy.m1)
    expect(document.activeElement).toBe(heading())
  })

  it('advances through all four steps in order, focusing each heading', () => {
    renderOnboarding()
    // welcome → privacy
    clickPrimary('Get started')
    expect(heading().textContent).toBe(ONBOARDING_STEPS[1]!.copy.m1)
    expect(document.activeElement).toBe(heading())
    // privacy → vault
    clickPrimary('Continue')
    expect(heading().textContent).toBe(ONBOARDING_STEPS[2]!.copy.m1)
    // vault → ready
    clickPrimary('Continue')
    expect(heading().textContent).toBe(ONBOARDING_STEPS[3]!.copy.m1)
  })

  it('the vault step is confirmation-only — no input, no crypto prompt (BR-6)', () => {
    renderOnboarding()
    clickPrimary('Get started') // → privacy
    clickPrimary('Continue') // → vault
    expect(heading().textContent).toBe('Your local vault is ready on this device.')
    expect(document.querySelector('input')).toBeNull()
  })

  it('renders only the M1.0 (m1) copy, never the deferred m3 claim', () => {
    renderOnboarding()
    clickPrimary('Get started') // → privacy (the step with an m3)
    const privacy = ONBOARDING_STEPS[1]!
    expect(screen.getByText(privacy.copy.m1)).toBeTruthy()
    expect(privacy.copy.m3).toBeTruthy() // the model has one…
    expect(screen.queryByText(privacy.copy.m3!)).toBeNull() // …but S4 must not render it (BR-6)
  })

  it('calls onComplete on the final step', () => {
    const { onComplete } = renderOnboarding()
    clickPrimary('Get started')
    clickPrimary('Continue')
    clickPrimary('Continue')
    clickPrimary('Enter Vida')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('does not advance or dismiss on Escape (boot gate, not an overlay)', () => {
    renderOnboarding()
    fireEvent.keyDown(document, { key: 'Escape' })
    fireEvent.keyDown(heading(), { key: 'Escape' })
    expect(heading().textContent).toBe(ONBOARDING_STEPS[0]!.copy.m1)
  })

  it('surfaces a retryable alert and re-enables the button when completion fails', async () => {
    const onComplete = vi.fn().mockRejectedValueOnce(new Error('write failed'))
    renderOnboarding(onComplete)
    clickPrimary('Get started')
    clickPrimary('Continue')
    clickPrimary('Continue')
    clickPrimary('Enter Vida')
    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy())
    const button = screen.getByRole('button', { name: 'Enter Vida' })
    expect((button as HTMLButtonElement).disabled).toBe(false)
  })
})
