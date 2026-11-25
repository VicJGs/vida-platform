// @vitest-environment jsdom
// preferences-rescope R4 (LIF-247) — UIProvider turns `reduceMotion` into <html data-vida-motion> (CSS) + the
// ReducedMotionContext (JS). PLAN-R4 rev 2.1 R4-BR-3 · acceptance 3/4 · §XXVIII D-R4-1/D-R4-2.
import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useReducedMotion } from './hooks/use-reduced-motion'
import { UIProvider } from './provider'
import { fonts } from './themes/fonts'
import type { ThemeSelection } from './theme-resolution'

const html = () => document.documentElement
const motionAttr = () => html().getAttribute('data-vida-motion')

beforeEach(() => {
  // OS says "no-preference" so every `true` below comes from the in-app preference.
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  })
})
afterEach(cleanup)

const READER_DENSE: ThemeSelection = { preset: 'reader', mode: 'light', density: 'dense' }

describe('UIProvider — preset, scheme and density', () => {
  it('DSG-14 a preset switches its fonts through the root font vars in the same commit, with no transition', () => {
    const { rerender } = render(<UIProvider selection={{ ...READER_DENSE, preset: 'editorial' }} />)
    expect(html().style.getPropertyValue('--vida-font-body')).toBe('')
    rerender(<UIProvider selection={READER_DENSE} />)
    expect(html().style.getPropertyValue('--vida-font-body')).toBe(fonts.fontFamily.readerBody)
    expect(html().style.getPropertyValue('--vida-font-display')).toBe(fonts.fontFamily.readerDisplay)
    rerender(<UIProvider selection={{ ...READER_DENSE, preset: 'quietDesk' }} />)
    expect(html().style.getPropertyValue('--vida-font-body')).toBe(fonts.fontFamily.quietDeskBody)
    expect(html().style.transition).toBe('')
  })

  it('DSG-15 the scheme sits on the page root and the preset on the body', () => {
    const { rerender } = render(<UIProvider selection={{ ...READER_DENSE, mode: 'dark' }} />)
    expect(html().classList.contains('t_dark')).toBe(true)
    expect(document.body.classList.contains('t_reader')).toBe(true)
    expect(html().classList.contains('t_reader')).toBe(false)
    rerender(<UIProvider selection={{ ...READER_DENSE, preset: 'editorial', mode: 'dark' }} />)
    expect(document.body.classList.contains('t_reader')).toBe(false)
  })

  it('DSG-16 density is one stylesheet toggled by a root attribute, scaling space and type together', () => {
    const { rerender } = render(<UIProvider selection={READER_DENSE} />)
    expect(html().getAttribute('data-vida-density')).toBe('dense')
    rerender(<UIProvider selection={{ ...READER_DENSE, density: 'calm' }} />)
    expect(html().getAttribute('data-vida-density')).toBe('calm')
    const sheets = document.querySelectorAll('style#vida-density-scale')
    expect(sheets).toHaveLength(1)
    const css = sheets[0].textContent ?? ''
    expect(css).toMatch(/\[data-vida-density="dense"\]\{[^}]*--t-space-/)
    expect(css).toMatch(/\[data-vida-density="dense"\] \.font_body[^{]*\{[^}]*--f-size-/)
  })
})

describe('UIProvider — reduce motion', () => {
  it('writes data-vida-motion="reduce" when on, "full" when off or absent', () => {
    const { rerender } = render(<UIProvider reduceMotion />)
    expect(motionAttr()).toBe('reduce')
    rerender(<UIProvider reduceMotion={false} />)
    expect(motionAttr()).toBe('full')
    rerender(<UIProvider />)
    expect(motionAttr()).toBe('full')
  })

  it('a motion toggle leaves the font vars, the preset class and density untouched', () => {
    const { rerender } = render(<UIProvider selection={READER_DENSE} reduceMotion={false} />)
    const font = html().style.getPropertyValue('--vida-font-body')
    expect(font).not.toBe('')
    rerender(<UIProvider selection={READER_DENSE} reduceMotion />)
    expect(motionAttr()).toBe('reduce')
    expect(html().style.getPropertyValue('--vida-font-body')).toBe(font)
    expect(document.body.classList.contains('t_reader')).toBe(true)
    expect(html().getAttribute('data-vida-density')).toBe('dense')
  })

  it('a theme swap (preset, then density) keeps data-vida-motion="reduce" (D-R4-2: clearCodec runs on every swap)', () => {
    const { rerender } = render(<UIProvider selection={READER_DENSE} reduceMotion />)
    rerender(<UIProvider selection={{ ...READER_DENSE, preset: 'quietDesk' }} reduceMotion />)
    expect(motionAttr()).toBe('reduce')
    rerender(<UIProvider selection={{ ...READER_DENSE, preset: 'quietDesk', density: 'calm' }} reduceMotion />)
    expect(motionAttr()).toBe('reduce')
  })

  it('unmount removes the attribute along with every other codec marker', () => {
    const { unmount } = render(<UIProvider selection={READER_DENSE} reduceMotion />)
    unmount()
    expect(html().hasAttribute('data-vida-motion')).toBe(false)
    expect(html().hasAttribute('data-vida-density')).toBe(false)
    expect(html().style.getPropertyValue('--vida-font-body')).toBe('')
    expect(document.body.classList.contains('t_reader')).toBe(false)
  })

  it('a consumer reads the preference on its FIRST render under <UIProvider reduceMotion> (acceptance 4)', () => {
    const log: boolean[] = []
    function Probe() {
      log.push(useReducedMotion())
      return null
    }
    render(
      <UIProvider reduceMotion>
        <Probe />
      </UIProvider>,
    )
    expect(log[0]).toBe(true)
  })
})
