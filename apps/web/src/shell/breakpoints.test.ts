// Pure — env `node` (no jsdom). Guards the design.md §X/§IV values against silent drift.
import { describe, expect, it } from 'vitest'

import {
  BREAKPOINT_ORDER,
  BREAKPOINTS,
  breakpointForWidth,
  CONTENT_MAX_WIDTH,
  PADDING_SCALE,
  PRIMARY_TEST_WIDTHS,
  SIDE_PADDING,
  TAMAGUI_MEDIA,
  TOUCH_TARGET,
  type Breakpoint,
} from './breakpoints'

describe('breakpoints — design.md §X value fidelity', () => {
  it('encodes the standard breakpoint thresholds (375-baseline / 768 / 1440 / 1920)', () => {
    expect(BREAKPOINTS.mobile.minWidth).toBe(0) // baseline; 375 is the design/test reference
    expect(BREAKPOINTS.tablet.minWidth).toBe(768)
    expect(BREAKPOINTS.desktop.minWidth).toBe(1440)
    expect(BREAKPOINTS.wide.minWidth).toBe(1920)
  })

  it('minWidth is strictly increasing along the mobile-first ladder', () => {
    for (let i = 1; i < BREAKPOINT_ORDER.length; i++) {
      const prev = BREAKPOINTS[BREAKPOINT_ORDER[i - 1]!].minWidth
      const cur = BREAKPOINTS[BREAKPOINT_ORDER[i]!].minWidth
      expect(cur).toBeGreaterThan(prev)
    }
  })

  it('pins the container / density / touch constants to the standard', () => {
    expect(PRIMARY_TEST_WIDTHS).toEqual([375, 768, 1440])
    expect(CONTENT_MAX_WIDTH).toBe(1280)
    expect(SIDE_PADDING).toEqual({ mobile: 16, tablet: 24, desktop: 32 })
    expect(TOUCH_TARGET).toEqual({ minSize: 44, minGap: 8 })
    expect(PADDING_SCALE).toEqual({
      compact: { v: 8, h: 12 },
      default: { v: 12, h: 16 },
      loose: { v: 16, h: 24 },
      spacious: { v: 24, h: 32 },
    })
  })
})

describe('breakpointForWidth — mobile-first boundary resolution', () => {
  it.each<[number, Breakpoint]>([
    [0, 'mobile'],
    [375, 'mobile'],
    [767, 'mobile'],
    [768, 'tablet'],
    [1439, 'tablet'],
    [1440, 'desktop'],
    [1919, 'desktop'],
    [1920, 'wide'],
    [3000, 'wide'],
  ])('%ipx → %s', (width, expected) => {
    expect(breakpointForWidth(width)).toBe(expected)
  })
})

describe('TAMAGUI_MEDIA — the reserved createMedia seam (plain data, no @tamagui)', () => {
  it('has one entry per breakpoint, mobile as the empty base', () => {
    expect(Object.keys(TAMAGUI_MEDIA)).toEqual([...BREAKPOINT_ORDER])
    expect(TAMAGUI_MEDIA.mobile).toEqual({})
  })

  it('minWidths match BREAKPOINTS for the enhancement breakpoints', () => {
    expect(TAMAGUI_MEDIA.tablet).toEqual({ minWidth: BREAKPOINTS.tablet.minWidth })
    expect(TAMAGUI_MEDIA.desktop).toEqual({ minWidth: BREAKPOINTS.desktop.minWidth })
    expect(TAMAGUI_MEDIA.wide).toEqual({ minWidth: BREAKPOINTS.wide.minWidth })
  })
})
