// @vitest-environment jsdom
// fe-onboarding (LIF-216) · S1 — guided-setup flow frame: step model honesty, state machine (navigate/skip/finalize +
// retryable error), StepRail markers, and the frame (rail + body + footer, never-a-wall). Wrapped in <UIProvider>
// (Tamagui tokens/Button — the onboarding.test.tsx:25 precedent).
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { GUIDED_SETUP_STEPS, type GuidedSetupStep } from './guided-setup-steps'
import { useGuidedSetup } from './use-guided-setup'
import { StepRail } from './step-rail'
import { GuidedSetup } from './guided-setup'
import { lintCopy } from '../voice/voice-copy'

afterEach(() => cleanup())

const heading = () => screen.getByRole('heading', { level: 1 })
const clickBtn = (name: string | RegExp) => fireEvent.click(screen.getByRole('button', { name }))

describe('GUIDED_SETUP_STEPS (model)', () => {
  it('is 3 ordered steps ending in the complete terminal', () => {
    expect(GUIDED_SETUP_STEPS.map((s) => s.id)).toEqual(['modules', 'theme', 'done'])
    expect(GUIDED_SETUP_STEPS.at(-1)!.kind).toBe('complete')
    expect(GUIDED_SETUP_STEPS.filter((s) => s.kind === 'pick')).toHaveLength(2)
  })

  it('every copy string is copy-honest (lintCopy clean — no ZK/dead-end, EC-7)', () => {
    for (const s of GUIDED_SETUP_STEPS) {
      expect(lintCopy(s.title)).toEqual([])
      expect(lintCopy(s.body)).toEqual([])
    }
  })
})

describe('useGuidedSetup (state machine)', () => {
  const setup = (onComplete = vi.fn().mockResolvedValue(undefined)) =>
    renderHook(() => useGuidedSetup({ steps: GUIDED_SETUP_STEPS, onComplete }))

  it('next/back navigate and clamp at the ends', () => {
    const { result } = setup()
    expect(result.current.index).toBe(0)
    act(() => result.current.back()) // clamp at 0
    expect(result.current.index).toBe(0)
    act(() => result.current.next())
    expect(result.current.index).toBe(1)
    act(() => result.current.next())
    act(() => result.current.next()) // clamp at last
    expect(result.current.index).toBe(2)
    expect(result.current.isLast).toBe(true)
  })

  it('complete calls onComplete exactly once (re-entrancy guard)', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined)
    const { result } = setup(onComplete)
    act(() => {
      result.current.complete()
      result.current.complete() // second press while submitting
    })
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it('skipAll finalizes from any step (never-a-wall)', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined)
    const { result } = setup(onComplete)
    act(() => result.current.skipAll())
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it('a rejected onComplete surfaces a retryable error and re-enables', async () => {
    const onComplete = vi.fn().mockRejectedValue(new Error('x'))
    const { result } = setup(onComplete)
    act(() => result.current.complete())
    await waitFor(() => expect(result.current.error).toBeTruthy())
    expect(result.current.submitting).toBe(false)
  })
})

describe('StepRail', () => {
  it('renders a marker per step and marks the current with aria-current', () => {
    render(
      <UIProvider>
        <StepRail steps={GUIDED_SETUP_STEPS.map((s) => ({ id: s.id, railLabel: s.railLabel }))} currentIndex={1} />
      </UIProvider>,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    const current = document.querySelector('[aria-current="step"]')
    expect(current?.textContent).toContain('Theme')
  })
})

describe('GuidedSetup (frame)', () => {
  const renderFrame = (
    onComplete = vi.fn().mockResolvedValue(undefined),
    renderStepBody?: (step: GuidedSetupStep) => ReactNode,
  ) =>
    render(
      <UIProvider>
        <GuidedSetup onComplete={onComplete} renderStepBody={renderStepBody} />
      </UIProvider>,
    )

  it('renders the rail, the first step heading (focused), and a persistent Skip setup escape', () => {
    renderFrame()
    expect(heading().textContent).toBe(GUIDED_SETUP_STEPS[0]!.title)
    expect(document.activeElement).toBe(heading())
    expect(screen.getByRole('button', { name: /skip setup/i })).toBeTruthy()
    expect(screen.getByRole('list', { name: /setup progress/i })).toBeTruthy()
  })

  it('advances to the complete step which offers Enter Vida and hides skip', () => {
    renderFrame()
    clickBtn(/continue/i) // modules → theme
    clickBtn(/continue/i) // theme → done
    expect(heading().textContent).toBe(GUIDED_SETUP_STEPS[2]!.title)
    expect(screen.getByRole('button', { name: /enter vida/i })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /skip setup/i })).toBeNull()
  })

  it('Enter Vida calls onComplete', async () => {
    const onComplete = vi.fn().mockResolvedValue(undefined)
    renderFrame(onComplete)
    clickBtn(/continue/i)
    clickBtn(/continue/i)
    clickBtn(/enter vida/i)
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1))
  })

  it('injects a step body via renderStepBody for pick steps', () => {
    renderFrame(undefined, (s: { id: string }) => <div data-testid="body">{`body:${s.id}`}</div>)
    expect(screen.getByTestId('body').textContent).toBe('body:modules')
  })
})
