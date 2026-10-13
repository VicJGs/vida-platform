import { describe, it, expect } from 'vitest'
import {
  resolveTheme,
  THEME_DEFAULT,
  THEME_PRESETS,
  DENSITY_SPACE_BAND,
  DENSE_SPACE_PX,
  DENSE_TYPE_SCALE,
  type ThemePreset,
  type ThemeMode,
  type ThemeName,
} from './theme-resolution'

describe('resolveTheme', () => {
  // The exhaustive 8 (preset × mode) → scheme-first name matrix. Each name MUST be a base theme registered in themes.ts.
  const cases: Array<[ThemePreset, ThemeMode, ThemeName]> = [
    ['editorial', 'light', 'light'],
    ['editorial', 'dark', 'dark'],
    ['reader', 'light', 'light_reader'],
    ['reader', 'dark', 'dark_reader'],
    ['quietDesk', 'light', 'light_quietDesk'],
    ['quietDesk', 'dark', 'dark_quietDesk'],
    ['game', 'light', 'light_game'],
    ['game', 'dark', 'dark_game'],
  ]

  it.each(cases)('%s + %s → theme "%s" (scheme-first)', (preset, mode, expected) => {
    expect(resolveTheme({ preset, mode, density: 'calm' }).themeName).toBe(expected)
  })

  it('passes density through unchanged', () => {
    expect(resolveTheme({ preset: 'editorial', mode: 'light', density: 'dense' }).density).toBe('dense')
    expect(resolveTheme({ preset: 'reader', mode: 'dark', density: 'calm' }).density).toBe('calm')
  })

  it('editorial keeps the BARE scheme name (no preset suffix — the inversion/reset invariant)', () => {
    expect(resolveTheme({ preset: 'editorial', mode: 'light', density: 'calm' }).themeName).toBe('light')
    expect(resolveTheme({ preset: 'editorial', mode: 'dark', density: 'calm' }).themeName).toBe('dark')
  })

  it('non-default presets prefix the mode (scheme is the FIRST segment)', () => {
    for (const preset of ['reader', 'quietDesk', 'game'] as const) {
      for (const mode of ['light', 'dark'] as const) {
        const { themeName } = resolveTheme({ preset, mode, density: 'calm' })
        expect(themeName.split('_')[0]).toBe(mode) // scheme first
        expect(themeName).toBe(`${mode}_${preset}`)
      }
    }
  })
})

describe('defaults + constants', () => {
  it('THEME_DEFAULT is Editorial + light + calm (cold-start, R2/R6)', () => {
    expect(THEME_DEFAULT).toEqual({ preset: 'editorial', mode: 'light', density: 'calm' })
  })

  it('THEME_PRESETS lists all four presets', () => {
    expect([...THEME_PRESETS].sort()).toEqual(['editorial', 'game', 'quietDesk', 'reader'])
  })

  it('the density space band + dense px map agree on keys (inset band only, no large layout tokens)', () => {
    expect(Object.keys(DENSE_SPACE_PX).sort()).toEqual([...DENSITY_SPACE_BAND].sort())
    // dense is strictly tighter than calm (the numeric band value equals its token key)
    for (const key of DENSITY_SPACE_BAND) expect(DENSE_SPACE_PX[key]).toBeLessThan(Number(key))
  })

  it('the dense type scale is a sub-1 readability-preserving factor', () => {
    expect(DENSE_TYPE_SCALE).toBeGreaterThan(0.5)
    expect(DENSE_TYPE_SCALE).toBeLessThan(1)
  })
})
