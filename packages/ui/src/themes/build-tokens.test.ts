// DS-1 token pipeline — acceptance fixtures (spec §4).
// Proves: B2 fails loud on every malformed seed · B4 determinism · B1/B3 traceability.
// The standalone-typecheck acceptance (tokens.ts/themes.ts compile without tamagui.config.ts) is covered
// by `pnpm --filter @vida/ui typecheck` in CI, not here.
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
// @ts-expect-error — .mjs build script has no type declarations; this is a test-only import.
import { checkLayers, validate, build, PipelineError } from './build-tokens.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const read = (f: string) => readFileSync(join(HERE, f), 'utf8')

// A minimal VALID 3-layer seed used as the base for mutation tests.
const valid = () => ({
  primitive: { color: { blue: { '500': { value: '#3B82F6', type: 'color' } } } },
  semantic: { color: { brand: { primary: { value: '{color.blue.500}', type: 'color' } } } },
  component: { button: { bg: { value: '{color.brand.primary}', type: 'color' } } },
})

describe('checkLayers — three-layer indirection (B2, fail loud)', () => {
  it('accepts a valid primitive → semantic → component seed', () => {
    expect(() => checkLayers(valid())).not.toThrow()
  })

  it('rejects a primitive holding a reference', () => {
    const s = valid()
    s.primitive.color.blue['500'].value = '{color.brand.primary}'
    expect(() => checkLayers(s)).toThrow(PipelineError)
  })

  it('rejects a semantic holding a raw literal (no reference)', () => {
    const s = valid()
    s.semantic.color.brand.primary.value = '#000000'
    expect(() => checkLayers(s)).toThrow(/raw literal/)
  })

  it('rejects a layer-skip (component → primitive)', () => {
    const s = valid()
    s.component.button.bg.value = '{color.blue.500}' // skips the semantic layer
    expect(() => checkLayers(s)).toThrow(/layer-skip/)
  })

  it('rejects a dangling reference', () => {
    const s = valid()
    s.semantic.color.brand.primary.value = '{color.does.not.exist}'
    expect(() => checkLayers(s)).toThrow(/dangling/)
  })

  it('rejects an empty layer', () => {
    const s = valid()
    s.component = {} as typeof s.component
    expect(() => checkLayers(s)).toThrow(/empty seed layer/)
  })
})

describe('build — outputs (B1/B3/B4)', () => {
  let css1: string, tokens1: string, themes1: string

  beforeAll(async () => {
    await build()
    css1 = read('variables.css')
    tokens1 = read('tokens.ts')
    themes1 = read('themes.ts')
  })

  it('the real seed validates', () => {
    expect(() => validate()).not.toThrow()
  })

  it('B4 — a second build is byte-identical', async () => {
    await build()
    expect(read('variables.css')).toBe(css1)
    expect(read('tokens.ts')).toBe(tokens1)
    expect(read('themes.ts')).toBe(themes1)
  })

  it('B3 — CSS var names follow design.md §XII (a/b/c → --a-b-c) and chain via var()', () => {
    expect(css1).toMatch(/--color-surface-primary:\s*var\(--color-white\);/)
    expect(css1).toMatch(/--color-white:\s*#FFFFFF;/) // primitive → literal
  })

  it('B1 — every emitted CSS custom property traces to a seed path', () => {
    const { byPath } = validate()
    const seedVars = new Set([...byPath.keys()].map((p: string) => `--${p.split('.').join('-')}`))
    const emitted = [...css1.matchAll(/^\s*(--[\w-]+):/gm)].map((m) => m[1])
    expect(emitted.length).toBeGreaterThan(0)
    for (const v of emitted) expect(seedVars.has(v)).toBe(true)
  })

  it('tokens.ts emits createTokens with all five Tamagui categories + a `true` default', () => {
    expect(tokens1).toContain('createTokens({')
    for (const cat of ['color', 'space', 'size', 'radius', 'zIndex']) {
      expect(tokens1).toMatch(new RegExp(`${cat}: \\{[^}]*true:`))
    }
  })

  it('themes.ts emits light/dark base + light_/dark_ sub-themes referencing tokens', () => {
    expect(themes1).toMatch(/export const light = \{/)
    expect(themes1).toMatch(/export const dark = \{/)
    expect(themes1).toMatch(/export const light_Button = \{/)
    expect(themes1).toMatch(/tokens\.color\./)
  })

  it('F003 — component sub-themes reference the BASE themes (light./dark.), not raw primitives, so dark inherits the overlay', () => {
    // Regression guard for docs/specs/fixes/component-subtheme-dark-drift (DS-1:113).
    // Before the fix, light_/dark_ both emitted `tokens.color.*` → dark_Button ≡ light_Button.
    const lightSub = themes1.match(/export const light_Button = \{[^\n]*\}/)?.[0] ?? ''
    const darkSub = themes1.match(/export const dark_Button = \{[^\n]*\}/)?.[0] ?? ''
    expect(lightSub).toMatch(/light\.color/) // references the light base theme…
    expect(darkSub).toMatch(/dark\.color/) //  …and dark_ references the DARK base theme
    expect(lightSub).not.toMatch(/tokens\./) // NOT a raw primitive ref (the drift)
    expect(darkSub).not.toMatch(/tokens\./)
    // and the base themes genuinely differ (overlay present) → dark component values ≠ light
    const lightBase = themes1.match(/export const light = \{[^\n]*\}/)?.[0] ?? ''
    const darkBase = themes1.match(/export const dark = \{[^\n]*\}/)?.[0] ?? ''
    expect(darkBase).not.toBe(lightBase.replace(/\blight\b/, 'dark'))
  })

  it('all outputs carry the GENERATED banner (B5)', () => {
    expect(css1).toMatch(/GENERATED by build-tokens\.mjs/)
    expect(tokens1).toMatch(/GENERATED by build-tokens\.mjs/)
    expect(themes1).toMatch(/GENERATED by build-tokens\.mjs/)
  })
})

// ── DS-2 foundations (B7 parallel dark · B8 4pt grid · B9 aux-namespace routing) ──────────────────────
describe('B8 — 4pt grid (space namespace only, fail loud)', () => {
  it('accepts an on-grid space primitive', () => {
    const s = valid()
    ;(s.primitive as any).space = { '8': { value: 8, type: 'dimension' } }
    expect(() => checkLayers(s)).not.toThrow()
  })

  it('rejects an off-grid space primitive (5 is not a multiple of 4)', () => {
    const s = valid()
    ;(s.primitive as any).space = { '5': { value: 5, type: 'dimension' } }
    expect(() => checkLayers(s)).toThrow(/off-grid spacing|4pt grid/)
  })

  it('does NOT apply the 4pt rule to radius (radius.full = 9999 is legal)', () => {
    const s = valid()
    ;(s.primitive as any).radius = { full: { value: 9999, type: 'dimension' } }
    expect(() => checkLayers(s)).not.toThrow()
  })
})

describe('B7/B9 — real seed outputs', () => {
  let css: string, tokens: string, themes: string, fonts: string
  beforeAll(async () => {
    await build()
    css = read('variables.css')
    tokens = read('tokens.ts')
    themes = read('themes.ts')
    fonts = read('fonts.ts')
  })

  it('B7 — dark is a parallel design: differs from light on color semantics', () => {
    const light = themes.match(/export const light = (\{.*?\})\n/s)?.[1] ?? ''
    const dark = themes.match(/export const dark = (\{.*?\})\n/s)?.[1] ?? ''
    expect(light).not.toBe('')
    expect(dark).not.toBe(light) // parallel dark, not identical placeholder
    expect(light).toContain('"colorSurfacePrimary": tokens.color.white')
    expect(dark).toContain('"colorSurfacePrimary": tokens.color.neutral900')
  })

  it('B9 — aux (font*/shadow) are SKIPPED from tokens.ts createTokens', () => {
    expect(tokens).not.toMatch(/fontSize|fontFamily|fontWeight|lineHeight|letterSpacing|shadow/)
    for (const cat of ['color', 'space', 'size', 'radius', 'zIndex']) {
      expect(tokens).toMatch(new RegExp(`${cat}: \\{`))
    }
  })

  it('B9 — aux ARE emitted to variables.css + fonts.ts', () => {
    expect(css).toMatch(/--fontSize-body:\s*16;/)
    expect(css).toMatch(/--shadow-resting:/)
    expect(fonts).toMatch(/fontSize: \{[^}]*"body": 16/)
    expect(fonts).toMatch(/fontFamily: \{/)
  })

  it('B8 (live) — every space primitive in the real seed is a multiple of 4', () => {
    const spaceVars = [...css.matchAll(/^\s*--space-(\d+):\s*(\d+);/gm)].map((m) => Number(m[2]))
    expect(spaceVars.length).toBeGreaterThan(0)
    for (const v of spaceVars) expect(v % 4).toBe(0)
  })
})

// ── DS-3 motion foundation (B11 motion-as-third-aux-consumer · fonts-isolation · css-vars presence) ────
describe('B11 — motion tokens (duration/easing) routed to CSS + motion.ts, skipped from tokens.ts/themes.ts', () => {
  let css: string, tokens: string, themes: string, fonts: string, motion: string
  beforeAll(async () => {
    await build()
    css = read('variables.css')
    tokens = read('tokens.ts')
    themes = read('themes.ts')
    fonts = read('fonts.ts')
    motion = read('motion.ts')
  })

  it('css-vars presence (positive) — variables.css emits the exact motion lines', () => {
    expect(css).toContain('--duration-fast: 150;')
    expect(css).toContain('--easing-out: cubic-bezier(0, 0, 0.3, 1);')
  })

  it('B11 — motion is ABSENT from tokens.ts createTokens and themes.ts (not a Tamagui category)', () => {
    expect(tokens).not.toMatch(/duration|easing/)
    expect(themes).not.toMatch(/duration|easing/)
  })

  it('fonts-isolation — motion does NOT leak into fonts.ts (narrowed vida/fonts filter)', () => {
    expect(fonts).not.toMatch(/duration|easing/)
    expect(fonts).toMatch(/fontFamily: \{/) // fonts.ts still carries typography
  })

  it('motion.ts exports { duration, easing } as typed const data with every seed value', () => {
    expect(motion).toMatch(/export const motion = \{/)
    expect(motion).toMatch(/\} as const/)
    // durations = unitless numbers (ms; reconciliation → DS-4)
    expect(motion).toMatch(/duration: \{[^}]*"instant": 0[^}]*\}/)
    expect(motion).toMatch(/"fast": 150/)
    expect(motion).toMatch(/"moderate": 250/)
    expect(motion).toMatch(/"slow": 400/)
    // easings = CSS cubic-bezier/linear strings
    expect(motion).toMatch(/easing: \{[^}]*"out": "cubic-bezier\(0, 0, 0\.3, 1\)"/)
    expect(motion).toMatch(/"linear": "linear"/)
  })

  it('B5 — motion.ts carries the GENERATED banner', () => {
    expect(motion).toMatch(/GENERATED by build-tokens\.mjs/)
  })

  it('B4 — a second build leaves motion.ts byte-identical', async () => {
    await build()
    expect(read('motion.ts')).toBe(motion)
  })
})
