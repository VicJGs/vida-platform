// Pure — env `node` (no jsdom). Verifies the reflow model + guards the layering token-name refs against typo drift.
import { describe, expect, it } from 'vitest'

import { BREAKPOINT_ORDER, type Breakpoint } from './breakpoints'
import {
  contentGutterAt,
  CONTENT_MAX_WIDTH,
  dockStateAt,
  GLOBAL_BAR_MODE,
  isRegionVisibleAt,
  LAYERING,
  overlayModeAt,
  REGION_VISIBILITY,
  SHELL_REGIONS,
  type ShellRegion,
} from './regions'

describe('dock reflow — drawer → rail → sidebar', () => {
  it('resolves per breakpoint', () => {
    expect(dockStateAt('mobile')).toBe('drawer')
    expect(dockStateAt('tablet')).toBe('rail')
    expect(dockStateAt('desktop')).toBe('sidebar')
    expect(dockStateAt('wide')).toBe('sidebar')
  })
})

describe('overlay host — sheet on mobile, centered from tablet up', () => {
  it('resolves per breakpoint', () => {
    expect(overlayModeAt('mobile')).toBe('sheet')
    expect(overlayModeAt('tablet')).toBe('centered')
    expect(overlayModeAt('desktop')).toBe('centered')
    expect(overlayModeAt('wide')).toBe('centered')
  })
})

describe('global bar — condensed on mobile, full from tablet up', () => {
  it('resolves per breakpoint', () => {
    expect(GLOBAL_BAR_MODE.mobile).toBe('condensed')
    expect(GLOBAL_BAR_MODE.tablet).toBe('full')
    expect(GLOBAL_BAR_MODE.desktop).toBe('full')
    expect(GLOBAL_BAR_MODE.wide).toBe('full')
  })
})

describe('region visibility — Spaces bar hidden on mobile, reserved from tablet up', () => {
  it('hides only the Spaces bar, only on mobile', () => {
    expect(isRegionVisibleAt('spacesBar', 'mobile')).toBe(false)
    expect(isRegionVisibleAt('spacesBar', 'tablet')).toBe(true)
    for (const region of SHELL_REGIONS) {
      if (region === 'spacesBar') continue
      for (const bp of BREAKPOINT_ORDER) {
        expect(isRegionVisibleAt(region, bp)).toBe(true)
      }
    }
  })

  it('is exhaustive — every region has an entry for every breakpoint', () => {
    for (const region of SHELL_REGIONS) {
      const perBp = REGION_VISIBILITY[region as ShellRegion]
      for (const bp of BREAKPOINT_ORDER) {
        expect(typeof perBp[bp as Breakpoint]).toBe('boolean')
      }
    }
  })
})

describe('content — per-bp gutters, global 1280 cap', () => {
  it('gutters resolve 16 / 24 / 32 (wide shares desktop)', () => {
    expect(contentGutterAt('mobile')).toBe(16)
    expect(contentGutterAt('tablet')).toBe(24)
    expect(contentGutterAt('desktop')).toBe(32)
    expect(contentGutterAt('wide')).toBe(32)
  })

  it('content max-width is the single global cap constant', () => {
    expect(CONTENT_MAX_WIDTH).toBe(1280)
  })
})

describe('LAYERING — token-name refs (typo-drift guard; invisible to typecheck)', () => {
  it('references the real DS token names', () => {
    expect(LAYERING.stickyBars).toBe('$sticky')
    expect(LAYERING.overlayHost).toBe('$overlay')
    expect(LAYERING.modalHost).toBe('$modal')
    expect(LAYERING.overlayRadius.modal).toBe('$lg')
    expect(LAYERING.overlayRadius.drawer).toBe('$xl')
    expect(LAYERING.elevation).toBe('level-3')
  })
})
