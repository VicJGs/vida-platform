// DS-4 — acceptance fixtures for the Tamagui config (spec §4). These are RUNTIME assertions on the built config —
// they catch what typecheck can't: createFont's key passthrough (does `$true` actually resolve?) and that dark is a
// real parallel theme at runtime, not just a typed shape. Also proves the CSS driver imports with NO react-native-web.
import { describe, it, expect } from 'vitest'
import { config } from './tamagui.config'
import { motion } from './themes/motion'
import { readFileSync } from 'node:fs'
import * as themes from './themes/themes'
import { tokens } from './themes/tokens'

const c = config as any
const val = (x: any) => (x && typeof x === 'object' && 'val' in x ? x.val : x)

describe('DS-4 tamagui.config (runtime)', () => {
  it('imports at runtime with no react-native-web (CSS driver, ADR-001 web)', () => {
    // reaching here at all means the module graph resolved — the RN driver would have thrown on `react-native-web`.
    expect(config).toBeDefined()
  })

  it('B13 / DSG-18 / §1.1-D — font size resolves, incl. the `true` default (role-keyed createFont passthrough guard)', () => {
    expect(val(c.fonts?.body?.size?.body)).toBe(16) // role key present
    expect(val(c.fonts?.body?.size?.true)).toBe(16) // unstyled <Text> default resolves — the trap typecheck misses
    expect(val(c.fonts?.display?.size?.true)).toBe(16) // both families share the scale
  })

  it('B14 / DSG-18 — dark is a parallel theme: resolves DIFFERENTLY from light at runtime', () => {
    const light = val(c.themes?.light?.colorSurfacePrimary)
    const dark = val(c.themes?.dark?.colorSurfacePrimary)
    expect(light).toBe('#FBFBFA') // editorial paper (default preset; fe-codec S1 repointed off the DS-2 placeholder)
    expect(dark).toBe('#16181D') // editorial ink
    expect(light).not.toBe(dark)
  })

  it('fe-codec S2 — all 6 scheme-first base themes resolve on config.themes', () => {
    for (const name of ['light', 'dark', 'light_reader', 'dark_reader', 'light_quietDesk', 'dark_quietDesk']) {
      expect(c.themes?.[name], name).toBeDefined()
      expect(val(c.themes[name].colorSurfacePrimary)).toMatch(/^#/) // a real resolved color
    }
    expect(Object.keys(c.themes).length).toBe(26) // 6 base + 20 editorial light_/dark_<Comp>; per-preset comp sub-themes retired (accent-inherit fix — preset color reaches components via direct semantics, not sub-themes)
  })

  it('fe-codec S2 — font family is the CSS-var seam (editorial family as fallback; provider swaps per preset, DSG-14)', () => {
    // Tamagui bakes this into the static .font_body/.font_display class; S3 overrides --vida-font-* per preset.
    expect(c.fonts?.body?.family).toBe("var(--vida-font-body, 'Spectral', Georgia, serif)")
    expect(c.fonts?.display?.family).toBe("var(--vida-font-display, 'Spectral', Georgia, serif)")
  })

  it('DSG-18 the config composes only the generated tokens and themes, and authors no value of its own', () => {
    expect(Object.keys(c.themes).sort()).toEqual(Object.keys(themes).sort())
    for (const cat of Object.keys(tokens) as (keyof typeof tokens)[]) {
      expect(Object.keys(c.tokens[cat]).sort(), cat).toEqual(Object.keys(tokens[cat]).sort())
      for (const k of Object.keys(tokens[cat]))
        expect(val(c.tokens[cat][k]), `${cat}.${k}`).toBe(val((tokens[cat] as any)[k]))
    }
    const src = readFileSync(new URL('./tamagui.config.ts', import.meta.url), 'utf8').replace(/\/\/[^\n]*/g, '')
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|cubic-bezier\(|\d+ms\b/)
  })

  it('B15 / DSG-18 — animations derive from motion.ts (duration + easing, losslessly, via the CSS driver)', () => {
    const a = c.animations?.animations ?? c.animations
    expect(a.fast).toBe(`${motion.easing.out} ${motion.duration.fast}ms`)
    expect(a.slow).toBe(`${motion.easing.out} ${motion.duration.slow}ms`)
    expect(a.fast).toContain('cubic-bezier(0, 0, 0.3, 1)') // DS-3's easing survives — no easing seam
  })
})
