// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { createRef } from 'react'
import { View } from '@tamagui/core'
import { UIProvider } from '../provider'
import { CanvasView } from './canvas-view'

afterEach(cleanup)

function renderUI(ui: React.ReactElement) {
  return render(<UIProvider>{ui}</UIProvider>)
}

const child = <View testID="hosted" />

describe('CanvasView — frame', () => {
  it('renders a region named by the visible title, with the eyebrow + hosted children', () => {
    const { getByRole, getByText, container } = renderUI(
      <CanvasView eyebrow="Vision board" title="Before I die">
        {child}
      </CanvasView>,
    )
    const region = getByRole('region')
    expect(region).not.toBeNull()
    expect(region.getAttribute('aria-labelledby')).not.toBeNull() // named by the visible title (no explicit name)
    expect(getByText('Before I die')).not.toBeNull()
    expect(container.querySelector('.vida-canvas-eyebrow')?.textContent).toBe('Vision board')
    expect(container.querySelector('.vida-canvas-title')).not.toBeNull()
  })

  it('renders the meta + progress slots when provided (meta then progress)', () => {
    const { getByText, container } = renderUI(
      <CanvasView title="My calendar" meta="Today · Mon 10 Aug" progress={<View testID="meter" />}>
        {child}
      </CanvasView>,
    )
    expect(getByText('Today · Mon 10 Aug')).not.toBeNull()
    expect(container.querySelector('[data-testid="meter"]')).not.toBeNull()
  })

  it('renders the read-only actions slot when provided', () => {
    const { container } = renderUI(
      <CanvasView title="My calendar" actions={<View testID="nav" />}>
        {child}
      </CanvasView>,
    )
    expect(container.querySelector('.vida-canvas-actions')).not.toBeNull()
    expect(container.querySelector('[data-testid="nav"]')).not.toBeNull()
  })

  // BR-CB-S1-6 state rule — override-slot selection, else delegate to children.
  it('shows the empty override when state=empty AND empty is provided', () => {
    const { container } = renderUI(
      <CanvasView title="Before I die" state="empty" empty={<View testID="teaching" />}>
        {child}
      </CanvasView>,
    )
    expect(container.querySelector('[data-testid="teaching"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="hosted"]')).toBeNull() // children NOT rendered
  })

  it('delegates to children when state=empty but NO empty override (calendar keeps its grid)', () => {
    const { container } = renderUI(
      <CanvasView title="My calendar" state="empty">
        {child}
      </CanvasView>,
    )
    expect(container.querySelector('[data-testid="hosted"]')).not.toBeNull()
  })

  it('shows the error override when state=error AND error is provided', () => {
    const { container } = renderUI(
      <CanvasView title="Before I die" state="error" error={<View testID="err" />}>
        {child}
      </CanvasView>,
    )
    expect(container.querySelector('[data-testid="err"]')).not.toBeNull()
    expect(container.querySelector('[data-testid="hosted"]')).toBeNull()
  })

  it('delegates loading + success to children (frame owns no loading/success state)', () => {
    const loading = renderUI(
      <CanvasView title="X" state="loading" empty={<View testID="teaching" />}>
        {child}
      </CanvasView>,
    )
    expect(loading.container.querySelector('[data-testid="hosted"]')).not.toBeNull()
    expect(loading.container.querySelector('[data-testid="teaching"]')).toBeNull()
    cleanup()
    const success = renderUI(<CanvasView title="X">{child}</CanvasView>)
    expect(success.container.querySelector('[data-testid="hosted"]')).not.toBeNull()
  })

  it('uses an explicit aria-label over the title id, and does not warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { getByRole } = renderUI(
      <CanvasView title="Before I die" aria-label="Dreams board">
        {child}
      </CanvasView>,
    )
    expect(getByRole('region').getAttribute('aria-label')).toBe('Dreams board')
    expect(warn).not.toHaveBeenCalled()
    warn.mockRestore()
  })

  it('forwards ref to the region element', () => {
    const ref = createRef<HTMLDivElement>()
    renderUI(
      <CanvasView title="X" ref={ref}>
        {child}
      </CanvasView>,
    )
    expect(ref.current).not.toBeNull()
  })
})
