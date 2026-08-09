// @vitest-environment jsdom
import { createRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { View } from '@tamagui/core'
import { UIProvider } from '../provider'
import { Popover } from './popover'

afterEach(cleanup)

function renderPopover(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

// Default content carries a focusable child so focus-into is observable.
function Basic(props: Partial<React.ComponentProps<typeof Popover>>) {
  return (
    <Popover trigger={<button>Details</button>} aria-label="Details" {...props}>
      <button>Inside</button>
    </Popover>
  )
}

const trigger = () => screen.getByRole('button', { name: 'Details' })

describe('Popover — trigger + roles', () => {
  it('the trigger has aria-haspopup=dialog and aria-expanded=false when closed; no dialog rendered', () => {
    renderPopover(<Basic />)
    const t = trigger()
    expect(t.getAttribute('aria-haspopup')).toBe('dialog')
    expect(t.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking the trigger opens a role=dialog; aria-expanded + aria-controls set; labelled; NON-modal (no aria-modal)', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    expect(panel).toBeTruthy()
    expect(trigger().getAttribute('aria-expanded')).toBe('true')
    expect(trigger().getAttribute('aria-controls')).toBe(panel.id)
    expect(panel.getAttribute('aria-label')).toBe('Details')
    // non-modal → must NOT carry aria-modal (the Dialog/Popover distinction)
    expect(panel.getAttribute('aria-modal')).toBeNull()
  })

  it('the panel portals to document.body (outside the trigger subtree)', () => {
    const { container } = renderPopover(<Basic />)
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    expect(container.contains(panel)).toBe(false)
    expect(document.body.contains(panel)).toBe(true)
  })

  it('ArrowDown on the trigger does NOT open (a dialog opener, not a menu — G1)', () => {
    renderPopover(<Basic />)
    fireEvent.keyDown(trigger(), { key: 'ArrowDown' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Popover — focus (enters, NOT trapped)', () => {
  it('opening moves focus into the panel (the first focusable child)', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Inside' }))
  })

  it('with no focusable child, focus lands on the panel itself (tabIndex=-1)', () => {
    renderPopover(
      <Popover trigger={<button>Details</button>} aria-label="Details">
        <View>text only</View>
      </Popover>,
    )
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    expect(panel.getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(panel)
  })

  it('Tab-away (focusout to a node outside panel+trigger) CLOSES it — not trapped', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    fireEvent.blur(panel, { relatedTarget: outside })
    expect(screen.queryByRole('dialog')).toBeNull()
    outside.remove()
  })

  it('an INTERNAL focus move (relatedTarget inside the panel) does NOT close', () => {
    renderPopover(
      <Popover trigger={<button>Details</button>} aria-label="Details">
        <button>One</button>
        <button>Two</button>
      </Popover>,
    )
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    fireEvent.blur(panel, { relatedTarget: screen.getByRole('button', { name: 'Two' }) })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('focusout with relatedTarget = the trigger does NOT close (the Esc-return carve-out)', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    fireEvent.blur(panel, { relatedTarget: trigger() })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('focusout with a null relatedTarget does NOT close (survive window-blur; pointerdown owns empty clicks)', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    const panel = screen.getByRole('dialog')
    fireEvent.blur(panel, { relatedTarget: null })
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('Popover — dismiss', () => {
  it('Escape closes and returns focus to the trigger', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(trigger())
  })

  it('an outside pointerdown closes the popover', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking the trigger while open toggles it closed', () => {
    renderPopover(<Basic />)
    fireEvent.click(trigger())
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.click(trigger())
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('Popover — controlled vs uncontrolled', () => {
  it('controlled: open prop drives visibility; onOpenChange fires but the popover does not self-close', () => {
    const onOpenChange = vi.fn()
    renderPopover(<Basic open onOpenChange={onOpenChange} />)
    expect(screen.getByRole('dialog')).toBeTruthy()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onOpenChange).toHaveBeenCalledWith(false)
    // parent did not update `open` → still open
    expect(screen.getByRole('dialog')).toBeTruthy()
  })

  it('uncontrolled defaultOpen renders open on mount', () => {
    renderPopover(<Basic defaultOpen />)
    expect(screen.getByRole('dialog')).toBeTruthy()
  })
})

describe('Popover — ref composition + dev warnings', () => {
  it('assigns both the forwarded ref and the trigger element’s own ref to the trigger node', () => {
    const popRef = createRef<HTMLButtonElement>()
    const ownRef = createRef<HTMLButtonElement>()
    renderPopover(
      <Popover ref={popRef} trigger={<button ref={ownRef}>Details</button>} aria-label="Details">
        <button>Inside</button>
      </Popover>,
    )
    expect(popRef.current?.tagName).toBe('BUTTON')
    expect(ownRef.current?.tagName).toBe('BUTTON')
    expect(popRef.current).toBe(ownRef.current)
  })

  it('preserves the consumer’s own onClick on the trigger (composed, not clobbered)', () => {
    const onClick = vi.fn()
    renderPopover(<Basic trigger={<button onClick={onClick}>Details</button>} />)
    fireEvent.click(trigger())
    expect(onClick).toHaveBeenCalledTimes(1) // consumer handler still fires
    expect(screen.getByRole('dialog')).toBeTruthy() // and ours opened the popover
  })

  it('warns when no accessible name is provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    renderPopover(
      <Popover trigger={<button>Details</button>}>
        <button>Inside</button>
      </Popover>,
    )
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('accessible name'))
    warn.mockRestore()
  })
})
