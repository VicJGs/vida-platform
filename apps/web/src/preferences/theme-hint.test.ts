// @vitest-environment jsdom
// preferences-rescope R3 (IMPL-PLAN-R3 step 2) — the device-local theme hint: resolved hex colours, written from DB truth
// only (the writer's onConfirmed), painted onto <html> before React by the inline script and after by App.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { USER_PREFERENCES_DEFAULTS } from '@vida/core'
import { THEME_PRESETS, type ThemeMode, type ThemePreset } from '@vida/ui'
import { paintRoot, THEME_HINT_KEY, toThemeHint, writeThemeHint } from './theme-hint'

const HEX = /^#[0-9a-f]{6}$/i

afterEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('style')
  vi.restoreAllMocks()
})

describe('toThemeHint', () => {
  const cases: Array<[ThemePreset, ThemeMode]> = THEME_PRESETS.flatMap((p) =>
    (['light', 'dark'] as const).map((m) => [p, m] as [ThemePreset, ThemeMode]),
  )
  it.each(cases)('%s × %s resolves to hex bg/fg (the Variable values, never the objects)', (preset, mode) => {
    const h = toThemeHint({ preset, mode, density: 'calm' })
    expect(h.scheme).toBe(mode)
    expect(h.bg).toMatch(HEX)
    expect(h.fg).toMatch(HEX)
  })

  it('dark and light differ, and the editorial default is the bare light theme', () => {
    const light = toThemeHint({ preset: 'editorial', mode: 'light', density: 'calm' })
    const dark = toThemeHint({ preset: 'editorial', mode: 'dark', density: 'dense' })
    expect(light.bg).not.toBe(dark.bg)
    expect(light.bg.toUpperCase()).toBe('#FBFBFA') // editorialNeutral50 = the paper surface
  })
})

describe('writeThemeHint', () => {
  it('writes the persisted row’s resolved hint (system → light, preset from dashboard_layout.theme)', () => {
    writeThemeHint({ ...USER_PREFERENCES_DEFAULTS, theme: 'dark', dashboard_layout: { theme: 'quietDesk' } })
    const stored = JSON.parse(localStorage.getItem(THEME_HINT_KEY) ?? 'null')
    expect(stored).toEqual(toThemeHint({ preset: 'quietDesk', mode: 'dark', density: 'calm' }))
    writeThemeHint({ ...USER_PREFERENCES_DEFAULTS })
    expect(JSON.parse(localStorage.getItem(THEME_HINT_KEY) ?? 'null').scheme).toBe('light')
  })

  it('blocked storage is a silent no-op', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('blocked', 'SecurityError')
    })
    expect(() => writeThemeHint({ ...USER_PREFERENCES_DEFAULTS, theme: 'dark' })).not.toThrow()
  })
})

describe('paintRoot', () => {
  it('sets background, color and color-scheme on <html>', () => {
    paintRoot(toThemeHint({ preset: 'reader', mode: 'dark', density: 'calm' }))
    const st = document.documentElement.style
    expect(st.backgroundColor).not.toBe('')
    expect(st.color).not.toBe('')
    expect(st.colorScheme).toBe('dark')
  })
})
