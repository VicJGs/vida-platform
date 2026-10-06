// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UIProvider } from '../provider'
import { ToastProvider } from './toast'
import { toast, resetToastStore } from '../internal/toast-store'
import { motion } from '../themes/motion'

const EXIT = motion.duration.fast

afterEach(() => {
  resetToastStore()
  cleanup()
  vi.useRealTimers()
})

function renderProvider(props?: React.ComponentProps<typeof ToastProvider>) {
  return render(
    <UIProvider>
      <ToastProvider {...props} />
    </UIProvider>,
  )
}

// jsdom limits (u10 §9): motion (enter/exit slide), real geometry, matchMedia reduced-motion, and true SR
// announcement are Visual-Gate/Brave claims. jsdom covers logic + roles + focus + timers (fake).

describe('Toast — imperative surface + regions', () => {
  it('toast() called from OUTSIDE a component renders into the mounted region', () => {
    renderProvider()
    act(() => {
      toast({ title: 'Saved' })
    })
    expect(screen.getByText('Saved')).toBeTruthy()
  })

  it('both live regions are present even when EMPTY (a live region must pre-exist to announce)', () => {
    renderProvider()
    const status = screen.getByRole('status')
    const alert = screen.getByRole('alert')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(alert.getAttribute('aria-live')).toBe('assertive')
  })

  it('intent routes to the correct region: info/success → status/polite, danger → alert/assertive', () => {
    renderProvider()
    act(() => {
      toast({ title: 'Info msg', intent: 'info' })
      toast({ title: 'Ok msg', intent: 'success' })
      toast({ title: 'Bad msg', intent: 'danger' })
    })
    expect(within(screen.getByRole('status')).getByText('Info msg')).toBeTruthy()
    expect(within(screen.getByRole('status')).getByText('Ok msg')).toBeTruthy()
    expect(within(screen.getByRole('alert')).getByText('Bad msg')).toBeTruthy()
    // danger did NOT land in the polite region
    expect(within(screen.getByRole('status')).queryByText('Bad msg')).toBeNull()
  })

  it('toast() returns an id; toast.dismiss(id) removes it', () => {
    vi.useFakeTimers()
    renderProvider()
    let id = ''
    act(() => {
      id = toast({ title: 'Dismiss me', duration: 0 })
    })
    expect(screen.getByText('Dismiss me')).toBeTruthy()
    act(() => {
      toast.dismiss(id)
      vi.advanceTimersByTime(EXIT)
    })
    expect(screen.queryByText('Dismiss me')).toBeNull()
  })

  it('focus is NOT moved to the toast on appear', () => {
    render(
      <UIProvider>
        <button>Stay focused</button>
        <ToastProvider />
      </UIProvider>,
    )
    const btn = screen.getByRole('button', { name: 'Stay focused' })
    btn.focus()
    act(() => {
      toast({ title: 'Appeared' })
    })
    expect(document.activeElement).toBe(btn)
  })
})

describe('Toast — timers (fake)', () => {
  it('auto-dismisses after the default 5s (+ exit window)', () => {
    vi.useFakeTimers()
    renderProvider()
    act(() => {
      toast({ title: 'Auto' })
    })
    expect(screen.getByText('Auto')).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(5000 + EXIT)
    })
    expect(screen.queryByText('Auto')).toBeNull()
  })

  it('duration:0 is STICKY — never auto-dismisses', () => {
    vi.useFakeTimers()
    renderProvider()
    act(() => {
      toast({ title: 'Sticky', duration: 0 })
    })
    act(() => {
      vi.advanceTimersByTime(60000)
    })
    expect(screen.getByText('Sticky')).toBeTruthy()
  })

  it('hover PAUSES the auto-dismiss timer; leaving resumes it', () => {
    vi.useFakeTimers()
    renderProvider()
    act(() => {
      toast({ title: 'Hovered', duration: 5000 })
    })
    const panel = screen.getByText('Hovered').closest('.vida-toast') as HTMLElement
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    fireEvent.mouseEnter(panel)
    act(() => {
      vi.advanceTimersByTime(10000)
    }) // paused — no dismissal despite 10s
    expect(screen.getByText('Hovered')).toBeTruthy()
    fireEvent.mouseLeave(panel)
    act(() => {
      vi.advanceTimersByTime(2000 + EXIT)
    }) // 2s remaining resumes → dismissed
    expect(screen.queryByText('Hovered')).toBeNull()
  })

  it('a sibling emit does NOT reset a live timer (gate-2 B1: deps = [id, duration])', () => {
    vi.useFakeTimers()
    renderProvider()
    act(() => {
      toast({ title: 'First', duration: 5000 })
    })
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    act(() => {
      toast({ title: 'Second' })
    }) // sibling emit → re-renders First; must NOT re-arm its timer
    act(() => {
      vi.advanceTimersByTime(2000 + EXIT)
    }) // First hits its ORIGINAL 5s
    expect(screen.queryByText('First')).toBeNull()
  })
})

describe('Toast — dismiss paths', () => {
  it('Esc dismisses the focused toast (stopPropagation keeps it off overlays behind)', () => {
    vi.useFakeTimers()
    renderProvider()
    act(() => {
      toast({ title: 'Esc me', duration: 0 })
    })
    const panel = screen.getByText('Esc me').closest('.vida-toast') as HTMLElement
    const outer = vi.fn()
    document.addEventListener('keydown', outer)
    fireEvent.keyDown(panel, { key: 'Escape' })
    act(() => {
      vi.advanceTimersByTime(EXIT)
    })
    expect(screen.queryByText('Esc me')).toBeNull()
    // stopPropagation → a document-level listener does NOT see the Esc
    expect(outer).not.toHaveBeenCalled()
    document.removeEventListener('keydown', outer)
  })

  it('onDismiss fires EXACTLY once under a double dismiss (idempotent)', () => {
    vi.useFakeTimers()
    renderProvider()
    const onDismiss = vi.fn()
    let id = ''
    act(() => {
      id = toast({ title: 'Once', duration: 0, onDismiss })
    })
    act(() => {
      toast.dismiss(id)
      toast.dismiss(id) // second call must be a no-op (already exiting)
      vi.advanceTimersByTime(EXIT)
    })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('pressing the ACTION does not dismiss the toast (only fires onPress)', () => {
    vi.useFakeTimers()
    renderProvider()
    const onPress = vi.fn()
    act(() => {
      toast({ title: 'Undo?', duration: 0, action: { label: 'Undo', onPress } })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onPress).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Undo?')).toBeTruthy() // still there
  })
})

describe('Toast — cap (store-enforced, per-region, evict-oldest)', () => {
  it('evicts the oldest when a region exceeds limit; the evicted one fires onDismiss', () => {
    vi.useFakeTimers()
    renderProvider({ limit: 2 })
    const onDismiss = vi.fn()
    act(() => {
      toast({ title: 'A', duration: 0, onDismiss })
      toast({ title: 'B', duration: 0 })
      toast({ title: 'C', duration: 0 }) // over limit → A evicted
    })
    act(() => {
      vi.advanceTimersByTime(EXIT)
    })
    expect(screen.queryByText('A')).toBeNull()
    expect(screen.getByText('B')).toBeTruthy()
    expect(screen.getByText('C')).toBeTruthy()
    expect(onDismiss).toHaveBeenCalledTimes(1) // eviction fired A's onDismiss
  })

  it('a danger toast is NOT starved by an info burst (per-region budgets)', () => {
    renderProvider({ limit: 2 })
    act(() => {
      toast({ title: 'i1', intent: 'info' })
      toast({ title: 'i2', intent: 'info' })
      toast({ title: 'i3', intent: 'info' }) // evicts i1 from polite; does not touch assertive
      toast({ title: 'danger!', intent: 'danger' })
    })
    expect(within(screen.getByRole('alert')).getByText('danger!')).toBeTruthy()
  })
})

describe('Toast — F6 + single-provider', () => {
  it('F6 focuses into the GLOBALLY newest visible toast across both regions', () => {
    renderProvider()
    act(() => {
      toast({ title: 'older info', intent: 'info' })
      toast({ title: 'newest danger', intent: 'danger' }) // added last → the global newest
    })
    fireEvent.keyDown(document, { key: 'F6' })
    const dangerPanel = screen.getByText('newest danger').closest('.vida-toast') as HTMLElement
    expect(dangerPanel.contains(document.activeElement)).toBe(true)
  })

  it('warns in dev when a second ToastProvider is mounted (singleton store)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <UIProvider>
        <ToastProvider />
        <ToastProvider />
      </UIProvider>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('more than one instance'))
    warn.mockRestore()
  })

  // fe-codec-controls-refinement P4b — the hover "slight elevation" overlay (toast.md:27)
  it('P4b: each toast renders an aria-hidden elevation overlay (the hover slight-elevation)', () => {
    renderProvider()
    act(() => {
      toast({ title: 'Saved' })
    })
    const overlays = document.querySelectorAll('.vida-toast-elevation')
    expect(overlays).toHaveLength(1)
    expect(overlays[0]?.getAttribute('aria-hidden')).toBe('true')
  })
})
