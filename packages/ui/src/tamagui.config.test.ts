// DS-4 — acceptance fixtures for the Tamagui config (spec §4). These are RUNTIME assertions on the built config —
// they catch what typecheck can't: createFont's key passthrough (does `$true` actually resolve?) and that dark is a
// real parallel theme at runtime, not just a typed shape. Also proves the CSS driver imports with NO react-native-web.
import { describe, it, expect } from 'vitest'
import { config } from './tamagui.config'
import { motion } from './themes/motion'

const c = config as any
const val = (x: any) => (x && typeof x === 'object' && 'val' in x ? x.val : x)

describe('DS-4 tamagui.config (runtime)', () => {
  it('imports at runtime with no react-native-web (CSS driver, ADR-001 web)', () => {
    // reaching here at all means the module graph resolved — the RN driver would have thrown on `react-native-web`.
    expect(config).toBeDefined()
  })

  it('B13/§1.1-D — font size resolves, incl. the `true` default (role-keyed createFont passthrough guard)', () => {
    expect(val(c.fonts?.body?.size?.body)).toBe(16) // role key present
    expect(val(c.fonts?.body?.size?.true)).toBe(16) // unstyled <Text> default resolves — the trap typecheck misses
    expect(val(c.fonts?.display?.size?.true)).toBe(16) // both families share the scale
  })

  it('B14 — dark is a parallel theme: resolves DIFFERENTLY from light at runtime', () => {
    const light = val(c.themes?.light?.colorSurfacePrimary)
    const dark = val(c.themes?.dark?.colorSurfacePrimary)
    expect(light).toBe('#FBFBFA') // editorial paper (default preset; fe-codec S1 repointed off the DS-2 placeholder)
    expect(dark).toBe('#16181D') // editorial ink
    expect(light).not.toBe(dark)
  })

  it('B15 — animations derive from motion.ts (duration + easing, losslessly, via the CSS driver)', () => {
    const a = c.animations?.animations ?? c.animations
    expect(a.fast).toBe(`${motion.easing.out} ${motion.duration.fast}ms`)
    expect(a.slow).toBe(`${motion.easing.out} ${motion.duration.slow}ms`)
    expect(a.fast).toContain('cubic-bezier(0, 0, 0.3, 1)') // DS-3's easing survives — no easing seam
  })
})
