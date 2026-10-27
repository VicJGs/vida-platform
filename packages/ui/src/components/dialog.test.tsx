// @vitest-environment jsdom
import { createRef, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { UIProvider } from '../provider'
import { Dialog, type DialogProps } from './dialog'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

// A controlled dialog with a required title + a focusable body button, overridable per test.
function Basic(props: Partial<DialogProps>) {
  return (
    <Dialog open onOpenChange={() => {}} title="My title" {...props}>
      {props.children ?? <button>Inside</button>}
    </Dialog>
  )
}

// A trigger + dialog whose open state is real, for open→focus→close-return flows.
function Harness({ withFocusable = true, dismissible }: { withFocusable?: boolean; dismissible?: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog open={open} onOpenChange={setOpen} title="My title" dismissible={dismissible}>
        {withFocusable ? <button>Inside</button> : <p>No focusable content</p>}
      </Dialog>
    </>
  )
}

const dialog = () => screen.getByRole('dialog')

describe('Dialog — presence + ARIA', () => {
  it('renders nothing when open={false}', () => {
    renderUI(
      <Dialog open={false} onOpenChange={() => {}} title="T">
        <button>x</button>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('has role=dialog + aria-modal=true when open', () => {
    renderUI(<Basic />)
    expect(dialog().getAttribute('aria-modal')).toBe('true')
  })

  it('aria-labelledby points to the rendered title (a heading)', () => {
    renderUI(<Basic />)
    const labelId = dialog().getAttribute('aria-labelledby')
    expect(labelId).toBeTruthy()
    expect(document.getElementById(labelId!)?.textContent).toBe('My title')
    expect(screen.getByRole('heading', { name: 'My title' })).toBeTruthy()
  })

  it('aria-describedby is present + wired when `description` is provided', () => {
    renderUI(<Basic description="Some description" />)
    const descId = dialog().getAttribute('aria-describedby')
    expect(descId).toBeTruthy()
    expect(document.getElementById(descId!)?.textContent).toBe('Some description')
  })

  it('aria-describedby is absent when no `description` (no dangling idref)', () => {
    renderUI(<Basic />)
    expect(dialog().getAttribute('aria-describedby')).toBeNull()
  })
})

describe('Dialog — focus management', () => {
  it('moves focus to the first focusable element inside on open', () => {
    renderUI(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Inside' }))
  })

  it('focuses the panel itself when there is no focusable child', () => {
    renderUI(<Harness withFocusable={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(document.activeElement).toBe(dialog())
  })

  it('returns focus to the trigger on close', () => {
    renderUI(<Harness />)
    const openBtn = screen.getByRole('button', { name: 'Open' })
    openBtn.focus()
    fireEvent.click(openBtn)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Inside' }))
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(document.activeElement).toBe(openBtn)
  })

  it('does not throw and does not strand focus if the trigger unmounts while open', () => {
    // Driven via rerender (not a click) because once open, the trigger is in the inert/aria-hidden background —
    // that's the modal working. We capture it as prevFocus, unmount it while open, then close.
    function H({ open, showTrigger }: { open: boolean; showTrigger: boolean }) {
      return (
        <>
          {showTrigger && <button>Open</button>}
          <Dialog open={open} onOpenChange={() => {}} title="T">
            <button>Inside</button>
          </Dialog>
        </>
      )
    }
    const { rerender } = renderUI(<H open={false} showTrigger />)
    screen.getByRole('button', { name: 'Open' }).focus() // becomes the captured prevFocus on open
    rerender(
      <UIProvider>
        <H open showTrigger />
      </UIProvider>,
    )
    // unmount the trigger while the dialog is open
    rerender(
      <UIProvider>
        <H open showTrigger={false} />
      </UIProvider>,
    )
    // close → focus-restore runs against a now-detached trigger: must not throw, must not strand
    expect(() =>
      rerender(
        <UIProvider>
          <H open={false} showTrigger={false} />
        </UIProvider>,
      ),
    ).not.toThrow()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Dialog — focus trap', () => {
  function Trapped(props: Partial<DialogProps>) {
    return (
      <Dialog
        open
        onOpenChange={() => {}}
        title="T"
        footer={
          <>
            <button>Cancel</button>
            <button>OK</button>
          </>
        }
        {...props}
      >
        <button>First</button>
      </Dialog>
    )
  }

  it('Tab from the last focusable wraps to the first', () => {
    renderUI(<Trapped />)
    screen.getByRole('button', { name: 'OK' }).focus()
    fireEvent.keyDown(dialog(), { key: 'Tab' })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'First' }))
  })

  it('Shift+Tab from the first focusable wraps to the last', () => {
    renderUI(<Trapped />)
    screen.getByRole('button', { name: 'First' }).focus()
    fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'OK' }))
  })

  it('a single focusable element: Tab and Shift+Tab both keep focus on it', () => {
    renderUI(
      <Basic>
        <button>Only</button>
      </Basic>,
    )
    const only = screen.getByRole('button', { name: 'Only' })
    only.focus()
    fireEvent.keyDown(dialog(), { key: 'Tab' })
    expect(document.activeElement).toBe(only)
    fireEvent.keyDown(dialog(), { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(only)
  })

  it('zero focusable elements: Tab is swallowed, focus stays on the panel', () => {
    renderUI(
      <Basic>
        <p>No actions here</p>
      </Basic>,
    )
    const d = dialog()
    expect(document.activeElement).toBe(d)
    fireEvent.keyDown(d, { key: 'Tab' })
    expect(document.activeElement).toBe(d)
  })
})

describe('Dialog — dismissal', () => {
  it('Escape closes (onOpenChange(false)) when dismissible (default)', () => {
    const onOpenChange = vi.fn()
    renderUI(<Basic onOpenChange={onOpenChange} />)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('Escape does nothing when dismissible={false}', () => {
    const onOpenChange = vi.fn()
    renderUI(<Basic onOpenChange={onOpenChange} dismissible={false} />)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('backdrop pointerdown closes when dismissible', () => {
    const onOpenChange = vi.fn()
    renderUI(<Basic onOpenChange={onOpenChange} />)
    fireEvent.pointerDown(dialog().parentElement!) // the positioner (backdrop)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('backdrop pointerdown does nothing when dismissible={false}', () => {
    const onOpenChange = vi.fn()
    renderUI(<Basic onOpenChange={onOpenChange} dismissible={false} />)
    fireEvent.pointerDown(dialog().parentElement!)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('pointerdown INSIDE the panel does not close', () => {
    const onOpenChange = vi.fn()
    renderUI(<Basic onOpenChange={onOpenChange} />)
    fireEvent.pointerDown(dialog())
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})

describe('Dialog — slots, sizing, ref, control', () => {
  it('renders the footer slot', () => {
    renderUI(<Basic footer={<button>Save</button>} />)
    expect(screen.getByRole('button', { name: 'Save' })).toBeTruthy()
  })

  it('accepts size sm/md/lg and renders the panel', () => {
    for (const size of ['sm', 'md', 'lg'] as const) {
      const { unmount } = renderUI(<Basic size={size} />)
      expect(dialog()).toBeTruthy()
      unmount()
    }
    // (the exact maxWidth is a Visual-Gate measurement — jsdom does not resolve Tamagui atomic classes)
  })

  it('forwardRef resolves to the panel element', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(<Basic ref={ref} />)
    expect(ref.current).toBe(dialog())
  })

  it('is fully controlled — onOpenChange is the only close path (the dialog stays open on Esc)', () => {
    const onOpenChange = vi.fn()
    renderUI(<Basic onOpenChange={onOpenChange} />)
    fireEvent.keyDown(dialog(), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByRole('dialog')).not.toBeNull() // no internal state closed it
  })
})

describe('Dialog — inert background + motion base', () => {
  it('inert + aria-hidden on body siblings while open; restored on close; the dialog subtree is never inert', () => {
    const sib = document.createElement('div')
    sib.setAttribute('data-app-root', '')
    document.body.appendChild(sib)

    const { rerender } = renderUI(
      <Dialog open onOpenChange={() => {}} title="T">
        <button>x</button>
      </Dialog>,
    )
    expect(sib.getAttribute('aria-hidden')).toBe('true')
    expect(sib.hasAttribute('inert')).toBe(true)

    // BLOCK-1: the dialog's own portal root + subtree must NOT be inert'd.
    const root = document.querySelector('[data-vida-dialog-root]')!
    expect(root.hasAttribute('inert')).toBe(false)
    expect(root.getAttribute('aria-hidden')).toBeNull()
    expect(dialog().closest('[inert]')).toBeNull()

    rerender(
      <UIProvider>
        <Dialog open={false} onOpenChange={() => {}} title="T">
          <button>x</button>
        </Dialog>
      </UIProvider>,
    )
    expect(sib.getAttribute('aria-hidden')).toBeNull()
    expect(sib.hasAttribute('inert')).toBe(false)

    document.body.removeChild(sib)
  })

  it('the panel carries its resting motion class with no inline opacity:0 (fails safe visible)', () => {
    renderUI(<Basic />)
    const d = dialog()
    expect(d.className).toContain('vida-dialog-panel')
    expect(d.style.opacity).not.toBe('0')
    expect(document.querySelector('.vida-dialog-scrim')).toBeTruthy()
    // (true reduced-motion "appears instantly" is a Visual-Gate item — jsdom runs no @media/@keyframes)
  })

  it('dev-warns when dismissible={false} and the panel has no focusable action', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderUI(
      <Dialog open onOpenChange={() => {}} title="T" dismissible={false}>
        <p>no actions</p>
      </Dialog>,
    )
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('non-dismissible'))
    spy.mockRestore()
  })
})

describe('Dialog — focus returns to the trigger AFTER the background is un-inerted (notes-rescope R3 DEV-R3-2)', () => {
  it('restores focus to the trigger with no `inert` ancestor at the moment of focus (a browser ignores focus() inside inert)', () => {
    function Harness() {
      const [open, setOpen] = useState(false)
      return (
        <>
          <button onClick={() => setOpen(true)}>Open it</button>
          <Dialog open={open} onOpenChange={setOpen} title="T">
            <button>Inside</button>
          </Dialog>
        </>
      )
    }
    const { getByText } = render(
      <UIProvider>
        <Harness />
      </UIProvider>,
    )
    const trigger = getByText('Open it')
    trigger.focus()
    fireEvent.click(trigger)
    const calls: Array<{ el: Element; inertAncestor: boolean }> = []
    const orig = HTMLElement.prototype.focus
    HTMLElement.prototype.focus = function (this: HTMLElement, ...a: Parameters<HTMLElement['focus']>) {
      calls.push({ el: this, inertAncestor: this.closest('[inert]') != null })
      return orig.apply(this, a)
    }
    try {
      fireEvent.keyDown(getByText('Inside'), { key: 'Escape' })
    } finally {
      HTMLElement.prototype.focus = orig
    }
    const toTrigger = calls.filter((c) => c.el === trigger)
    expect(toTrigger.length).toBeGreaterThan(0)
    expect(toTrigger.every((c) => !c.inertAncestor)).toBe(true)
    expect(document.activeElement).toBe(trigger)
  })
})
