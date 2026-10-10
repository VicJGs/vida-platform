// @vitest-environment jsdom
// fe-shell #14 · S3 — ShellPanel (docked) tests. The docked nav panel: landmark + two-row contained header (mode +
// edge controls + close) + content-fit body slot. Presentational + state-as-prop — we assert the rendered a11y
// structure, that the controls reflect `placement` (aria-pressed), and that they EMIT the right intents (the app wires
// the store). `[FACT: delivery/sessions/PLAN-s3-docked-panel.md §3/§6; envision.md EC-1/2/4/5]`
import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach } from 'vitest'
import { UIProvider } from '@vida/ui'
import { ShellPanel } from './shell-panel'
import { type PanelPlacement } from './regions'

afterEach(cleanup)

function dock(overrides?: Partial<PanelPlacement>): PanelPlacement {
  return { mode: 'dock', edge: 'left', open: true, ...overrides }
}

function renderPanel(props?: Partial<React.ComponentProps<typeof ShellPanel>>) {
  return render(
    <UIProvider>
      <ShellPanel id="modules" title="Modules" placement={dock()} {...props}>
        <div data-testid="body">nav body</div>
      </ShellPanel>
    </UIProvider>,
  )
}

describe('ShellPanel — docked (S3)', () => {
  it('renders the correct landmark per id (modules=nav, system=aside), named by the title', () => {
    renderPanel()
    expect(screen.getByRole('navigation', { name: 'Modules' })).not.toBeNull()
    cleanup()
    render(
      <UIProvider>
        <ShellPanel id="system" title="System" placement={dock()}>
          <div />
        </ShellPanel>
      </UIProvider>,
    )
    expect(screen.getByRole('complementary', { name: 'System' })).not.toBeNull()
  })

  it('carries a stable DOM id for the toggle aria-controls', () => {
    const { container } = renderPanel()
    expect(container.querySelector('#shell-panel-modules')).not.toBeNull()
  })

  it('renders the body slot (content-fit, EC-5)', () => {
    renderPanel()
    expect(screen.getByTestId('body')).not.toBeNull()
  })

  it('shows the ▣ Dock | ⧉ Float control reflecting the mode (EC-1); both enabled from S4', () => {
    renderPanel({ placement: dock({ mode: 'dock' }) })
    expect(screen.getByRole('button', { name: 'Dock' }).getAttribute('aria-pressed')).toBe('true')
    const float = screen.getByRole('button', { name: 'Float' })
    expect(float.getAttribute('aria-pressed')).toBe('false')
    // S4 built the float render → Float is now ENABLED (S3's `disabled` removed).
    expect((float as HTMLButtonElement).disabled).toBe(false)
  })

  it('shows the four-edge picker with the active edge pressed (EC-4)', () => {
    renderPanel({ placement: dock({ edge: 'top' }) })
    expect(screen.getByRole('button', { name: 'Dock top' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: 'Dock left' }).getAttribute('aria-pressed')).toBe('false')
    // all four edges offered
    for (const label of ['Dock left', 'Dock right', 'Dock top', 'Dock bottom']) {
      expect(screen.getByRole('button', { name: label })).not.toBeNull()
    }
  })

  it('emits onSetMode from both mode controls (intent only, R5)', () => {
    const onSetMode = vi.fn()
    renderPanel({ onSetMode })
    fireEvent.click(screen.getByRole('button', { name: 'Dock' }))
    expect(onSetMode).toHaveBeenCalledWith('dock')
    fireEvent.click(screen.getByRole('button', { name: 'Float' })) // enabled from S4
    expect(onSetMode).toHaveBeenCalledWith('float')
  })

  it('emits onSetEdge when an edge is picked', () => {
    const onSetEdge = vi.fn()
    renderPanel({ onSetEdge })
    fireEvent.click(screen.getByRole('button', { name: 'Dock bottom' }))
    expect(onSetEdge).toHaveBeenCalledWith('bottom')
  })

  it('emits onClose from the ✕ control', () => {
    const onClose = vi.fn()
    renderPanel({ onClose })
    fireEvent.click(screen.getByRole('button', { name: 'Close Modules panel' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe('ShellPanel — floating (S4)', () => {
  const float = (overrides?: Partial<PanelPlacement>): PanelPlacement => ({ mode: 'float', edge: 'left', open: true, ...overrides })

  function renderFloat(props?: Partial<React.ComponentProps<typeof ShellPanel>>) {
    return render(
      <UIProvider>
        <ShellPanel id="modules" title="Modules" placement={float()} {...props}>
          <button type="button">body action</button>
        </ShellPanel>
      </UIProvider>,
    )
  }

  it('renders a modal dialog (role=dialog, aria-modal) named by the title — NOT a landmark (B4)', () => {
    renderFloat()
    const dialog = screen.getByRole('dialog', { name: 'Modules' })
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('data-mode')).toBe('float')
    // The docked landmark role is NOT used in float mode.
    expect(screen.queryByRole('navigation', { name: 'Modules' })).toBeNull()
  })

  it('renders a scrim + carries the panel DOM id (aria-controls target)', () => {
    const { container } = renderFloat()
    expect(container.querySelector('.vida-shell-scrim')).not.toBeNull()
    expect(container.querySelector('#shell-panel-modules')).not.toBeNull()
  })

  it('anchors to its edge (EC-3)', () => {
    const { container } = renderFloat({ placement: float({ edge: 'bottom' }) })
    expect(container.querySelector('[data-panel="modules"]')?.getAttribute('data-edge')).toBe('bottom')
  })

  it('dismisses on Esc (EC-6)', () => {
    const onClose = vi.fn()
    renderFloat({ onClose })
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Modules' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('dismisses on scrim click (EC-6)', () => {
    const onClose = vi.fn()
    const { container } = renderFloat({ onClose })
    const scrim = container.querySelector('.vida-shell-scrim')
    expect(scrim).not.toBeNull()
    fireEvent.click(scrim as Element)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('moves focus into the panel on open — the first focusable (✕ close) is focused (EC-6)', () => {
    renderFloat()
    // The first focusable inside the panel is the ✕ close (header row 1 leads the controls).
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close Modules panel')
  })
})
