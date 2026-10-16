// Pure — env `node` (no jsdom). Verifies the reflow model + guards the layering token-name refs against typo drift.
import { describe, expect, it } from 'vitest'

import { BREAKPOINT_ORDER, type Breakpoint } from './breakpoints'
import {
  contentGutterAt,
  contentVInsetAt,
  CONTENT_MAX_WIDTH,
  DEFAULT_PLACEMENT,
  dockStateAt,
  GLOBAL_BAR_MODE,
  isOverlay,
  isRegionVisibleAt,
  LAYERING,
  overlayModeAt,
  PANEL_IDS,
  panelAxis,
  type PanelEdge,
  REGION_VISIBILITY,
  reservedTopInset,
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

  it('vertical inset resolves 24 / 32 / 40 (wide shares desktop)', () => {
    expect(contentVInsetAt('mobile')).toBe(24)
    expect(contentVInsetAt('tablet')).toBe(32)
    expect(contentVInsetAt('desktop')).toBe(40)
    expect(contentVInsetAt('wide')).toBe(40)
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

// ── fe-shell (#14) · the dock⇄float panel placement model ──────────────────────────────────
describe('panel placement model — dock⇄float × edge (envision M1–M7)', () => {
  it('defaults both panels closed, docked left (M1/L1)', () => {
    expect(DEFAULT_PLACEMENT.system).toEqual({ mode: 'dock', edge: 'left', open: false })
    expect(DEFAULT_PLACEMENT.modules).toEqual({ mode: 'dock', edge: 'left', open: false })
  })

  it('enumerates both panels in a stable order', () => {
    expect(PANEL_IDS).toEqual(['system', 'modules'])
  })

  it('axis is vertical on left/right, horizontal on top/bottom (content-fit, EC-5)', () => {
    expect(panelAxis('left')).toBe('vertical')
    expect(panelAxis('right')).toBe('vertical')
    expect(panelAxis('top')).toBe('horizontal')
    expect(panelAxis('bottom')).toBe('horizontal')
  })

  it('isOverlay iff floating (EC-2 docked inline vs EC-3 floating overlay)', () => {
    expect(isOverlay({ mode: 'float', edge: 'left', open: true })).toBe(true)
    expect(isOverlay({ mode: 'dock', edge: 'left', open: true })).toBe(false)
  })

  it('reserves a top strip per breakpoint, on the 4pt grid (EC-7)', () => {
    expect(reservedTopInset('mobile')).toBe(52)
    expect(reservedTopInset('desktop')).toBe(56)
    BREAKPOINT_ORDER.forEach((bp) => expect(reservedTopInset(bp) % 4).toBe(0))
  })

  it('all four edges are representable (M4 — incl. bottom)', () => {
    const edges: PanelEdge[] = ['left', 'right', 'top', 'bottom']
    edges.forEach((edge) => expect(panelAxis(edge)).toMatch(/vertical|horizontal/))
  })
})
