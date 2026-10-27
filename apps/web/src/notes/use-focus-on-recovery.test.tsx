// @vitest-environment jsdom
// notes-rescope R3 · G14 · IMPL R-9 — focus moves to the surface heading after a recovered read (test C6).
import { afterEach, describe, expect, it } from 'vitest'
import { useRef } from 'react'
import { cleanup, render } from '@testing-library/react'
import { useFocusOnRecovery } from './use-focus-on-recovery'

function Probe({ state }: { state: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  useFocusOnRecovery(state, ref)
  return (
    <h1 ref={ref} tabIndex={-1}>
      Title
    </h1>
  )
}

afterEach(() => {
  cleanup()
  ;(document.activeElement as HTMLElement | null)?.blur()
})

describe('useFocusOnRecovery (R-9)', () => {
  it('a first successful load never moves focus', () => {
    const r = render(<Probe state="loading" />)
    r.rerender(<Probe state="success" />)
    expect(document.activeElement).toBe(document.body)
  })
  it.each(['success', 'empty'])('error → %s moves focus to the target', (to) => {
    const r = render(<Probe state="error" />)
    r.rerender(<Probe state="loading" />) // a retry in flight passes through loading on some surfaces
    r.rerender(<Probe state={to} />)
    expect(document.activeElement?.textContent).toBe('Title')
  })
  it('error → error (a retry that failed again) does not move focus', () => {
    const r = render(<Probe state="error" />)
    r.rerender(<Probe state="error" />)
    expect(document.activeElement).toBe(document.body)
  })
})
