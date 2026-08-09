// Pure — env `node`. Contract-locks the keyboard-model data shape (the frecency-
// fixture precedent: the test doubles as the contract assertion).
import { describe, expect, it } from 'vitest'

import { FOCUS_CONTRACT, OVERLAY_DISMISS } from './keyboard'

describe('FOCUS_CONTRACT — the §XIV focus-at-transition map', () => {
  it('declares a target for every transition', () => {
    expect(FOCUS_CONTRACT).toEqual({
      overlayOpen: 'first-focusable',
      overlayClose: 'trigger',
      pageNav: 'main-heading',
      tabChange: 'panel',
      toastAppear: 'none',
    })
  })

  it('a toast never steals focus (announced via aria-live only)', () => {
    expect(FOCUS_CONTRACT.toastAppear).toBe('none')
  })

  it('an overlay returns focus to its trigger on close', () => {
    expect(FOCUS_CONTRACT.overlayClose).toBe('trigger')
  })
})

describe('OVERLAY_DISMISS — Escape closes every overlay', () => {
  it('escape is enabled', () => {
    expect(OVERLAY_DISMISS.escape).toBe(true)
  })
})
