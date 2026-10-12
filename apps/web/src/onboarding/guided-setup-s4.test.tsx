// @vitest-environment jsdom
// fe-onboarding (LIF-216) · S4 — reach + app-mount: the launch store, the ≥2-path reach floor (EC-1), the two reach
// surfaces (invitation + slot), and the takeover wiring (pickers injected · live-preview lever · commit→close).
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import { lintCopy } from '../voice/voice-copy'
import { useGuidedSetupStore } from './guided-setup-store'
import { createGuidedSetupReach, GUIDED_SETUP_CAPABILITY } from './guided-setup-reach'
import { GuidedSetupInvitation, GuidedSetupSlotButton } from './guided-setup-entry'
import { GuidedSetupTakeover } from './guided-setup-mount'

afterEach(() => {
  cleanup()
  act(() => useGuidedSetupStore.getState().dismiss()) // reset the shared store between tests
})

describe('useGuidedSetupStore (launch phase)', () => {
  it('transitions none → invited → running → none', () => {
    const { result } = renderHook(() => useGuidedSetupStore())
    expect(result.current.phase).toBe('none')
    act(() => result.current.invite())
    expect(result.current.phase).toBe('invited')
    act(() => result.current.start())
    expect(result.current.phase).toBe('running')
    act(() => result.current.dismiss())
    expect(result.current.phase).toBe('none')
  })
})

describe('guided-setup reach (EC-1, ≥2-path floor)', () => {
  it('registers two DISTINCT paths and clears the floor', () => {
    const reg = createGuidedSetupReach()
    expect([...reg.getReach(GUIDED_SETUP_CAPABILITY)].sort()).toEqual(['contextual', 'link'])
    expect(reg.isReachable(GUIDED_SETUP_CAPABILITY)).toBe(true)
    expect(() => reg.assertReachable(GUIDED_SETUP_CAPABILITY)).not.toThrow()
  })
})

describe('reach surfaces', () => {
  it('GuidedSetupInvitation: opt-in start + a never-a-wall skip, copy-honest', () => {
    const onStart = vi.fn()
    const onSkip = vi.fn()
    render(
      <UIProvider>
        <GuidedSetupInvitation onStart={onStart} onSkip={onSkip} />
      </UIProvider>,
    )
    expect(screen.getByRole('heading', { name: /make vida yours/i })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /set up your workspace/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: /skip for now/i }))
    expect(onSkip).toHaveBeenCalledTimes(1)
    // copy honesty (EC-7): no ZK/dead-end strings
    expect(lintCopy('Make Vida yours')).toEqual([])
    expect(
      lintCopy('Pick the areas you want in your sidebar and choose a look. It takes a minute, and you can change everything later.'),
    ).toEqual([])
  })

  it('GuidedSetupSlotButton: opens the flow from the EmptyState slot', () => {
    const onStart = vi.fn()
    render(
      <UIProvider>
        <GuidedSetupSlotButton onStart={onStart} />
      </UIProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: /set up your modules/i }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })
})

describe('GuidedSetupTakeover (app-mount wiring)', () => {
  const renderTakeover = (onPreview = vi.fn(), onClose = vi.fn()) =>
    render(
      <UIProvider>
        <GuidedSetupTakeover mode="light" initialPreset="editorial" onPreview={onPreview} onClose={onClose} />
      </UIProvider>,
    )

  it('injects the module picker on the first step', () => {
    renderTakeover()
    // the modules step is first; its body is the module enable-set picker (Notes toggle present)
    expect(screen.getByRole('button', { name: 'Notes', pressed: true })).toBeTruthy()
  })

  it('previews a theme through the lever and finishes via commit→onClose', async () => {
    const onPreview = vi.fn()
    const onClose = vi.fn()
    renderTakeover(onPreview, onClose)
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // modules → theme
    // theme swatches present; selecting one drives the live-preview lever
    fireEvent.click(screen.getByRole('button', { name: 'Reader' }))
    expect(onPreview).toHaveBeenCalledWith('reader')
    fireEvent.click(screen.getByRole('button', { name: /continue/i })) // theme → done
    fireEvent.click(screen.getByRole('button', { name: /enter vida/i }))
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
  })
})
