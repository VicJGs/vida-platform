// @vitest-environment jsdom
// preferences-rescope R4 (LIF-247) — the shell panel's reduced-motion gate keys on the OS query AND the in-app
// preference. This file can't import @vida/ui's internal `reducedMotionCss`, so it hand-writes the twin; this test pins
// it to the helper's exact contract (PLAN-R4 rev 2.1 R4-BR-4 · acceptance 5).
import { describe, expect, it } from 'vitest'
import { ensureShellPanelStyles } from './shell-panel-styles'

const SELECTORS = [
  '.vida-shell-scrim',
  '.vida-shell-panel-left',
  '.vida-shell-panel-right',
  '.vida-shell-panel-top',
  '.vida-shell-panel-bottom',
]

describe('shell-panel-styles — reduced motion', () => {
  ensureShellPanelStyles()
  const css = document.querySelector('style[data-vida-shell-panel]')?.textContent ?? ''

  it('keeps the OS media gate', () => {
    expect(css).toContain(`@media (prefers-reduced-motion: reduce){${SELECTORS.join(',')}{animation:none}}`)
  })

  it('adds the [data-vida-motion="reduce"] twin — every selector, the same declarations (the literal UIProvider writes)', () => {
    expect(css).toContain(`${SELECTORS.map((s) => `[data-vida-motion="reduce"] ${s}`).join(',')}{animation:none}`)
  })
})
