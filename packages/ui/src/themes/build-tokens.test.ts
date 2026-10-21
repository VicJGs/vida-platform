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
    expect(css1).toMatch(/--color-surface-primary:\s*var\(--color-editorial-neutral-50\);/) // semantic → chains via var() (editorial default)
    expect(css1).toMatch(/--color-editorial-neutral-50:\s*#FBFBFA;/) // primitive → literal
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
    expect(light).toContain('"colorSurfacePrimary": tokens.color.editorialNeutral50') // paper (editorial default)
    expect(dark).toContain('"colorSurfacePrimary": tokens.color.editorialNeutral900') // ink
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

// ── UI-1 shadow typed export (DEF-U5-e — first shadow consumer: Card injects box-shadow literals) ──────
describe('shadow tokens routed to CSS + shadow.ts, still skipped from tokens.ts/themes.ts (B9 intact)', () => {
  let tokens: string, themes: string, motion: string, shadow: string
  beforeAll(async () => {
    await build()
    tokens = read('tokens.ts')
    themes = read('themes.ts')
    motion = read('motion.ts')
    shadow = read('shadow.ts')
  })

  it('B9 — shadow is STILL absent from tokens.ts/themes.ts createTokens (typed export does not re-add it)', () => {
    expect(tokens).not.toMatch(/shadow/)
    expect(themes).not.toMatch(/shadow/)
  })

  it('isolation — shadow does NOT leak into motion.ts (vida/motion filters MOTION only)', () => {
    expect(motion).not.toMatch(/shadow|rgba/)
  })

  it('shadow.ts exports a FLAT { resting, raised, overlay } const with the primitive box-shadow literals', () => {
    expect(shadow).toMatch(/export const shadow = \{/)
    expect(shadow).toMatch(/\} as const/)
    // flattened (single namespace) — no nested `shadow:` key
    expect(shadow).not.toMatch(/shadow: \{/)
    // fe-codec-primitives-refinement P2 (BR-C-5): resting softened to a 2-layer (ambient+tight) low-opacity shadow —
    // still rgba(15,23,42,·) so it self-cancels in dark. Card is resting's sole consumer (DEF-U5-e).
    expect(shadow).toMatch(
      /"resting": "0 1px 2px 0 rgba\(15,23,42,0\.04\), 0 6px 16px -4px rgba\(15,23,42,0\.06\)"/,
    )
    expect(shadow).toMatch(/"raised": "0 4px 12px -2px rgba\(15,23,42,0\.10\)"/)
    expect(shadow).toMatch(/"overlay": "0 12px 32px -4px rgba\(15,23,42,0\.18\)"/)
  })

  it('B5 — shadow.ts carries the GENERATED banner', () => {
    expect(shadow).toMatch(/GENERATED by build-tokens\.mjs/)
  })

  it('B4 — a second build leaves shadow.ts byte-identical', async () => {
    await build()
    expect(read('shadow.ts')).toBe(shadow)
  })
})

// ── fe-codec-theme S1 (B-codec-1 — N preset families × light/dark, SCHEME-FIRST; generalizes B7) ───────
describe('B-codec-1 — preset theme families (scheme-first; Tamagui 2.6.2 law)', () => {
  let themes: string, fonts: string
  beforeAll(async () => {
    await build()
    themes = read('themes.ts')
    fonts = read('fonts.ts')
  })
  const allExports = () => [...themes.matchAll(/^export const ([a-zA-Z_]+) = \{/gm)].map((m) => m[1])
  const bases = () => allExports().filter((n) => !/_[A-Z]/.test(n)) // base themes have no `_<Comp>` segment
  const subs = () => allExports().filter((n) => /_[A-Z]/.test(n))
  const grab = (name: string) => themes.match(new RegExp(`export const ${name} = (\\{.*?\\})\\n`, 's'))?.[1] ?? ''

  it('emits exactly 8 scheme-first base themes', () => {
    expect(new Set(bases())).toEqual(
      new Set(['light', 'dark', 'light_reader', 'dark_reader', 'light_quietDesk', 'dark_quietDesk', 'light_game', 'dark_game']),
    )
  })

  it("Tamagui scheme law — every theme name's first _-segment is light or dark", () => {
    for (const name of allExports()) expect(['light', 'dark']).toContain(name.split('_')[0])
  })

  it('component sub-themes = editorial base only (10 comps × light/dark = 20); per-preset comps retired (accent-inherit fix)', () => {
    // The accent-inherit fix (STRUCTURAL §XXVIII): components read preset color via DIRECT semantic tokens (which inherit
    // the active preset at component scope), so the per-preset `<mode>_<preset>_<Comp>` set is no longer generated — only
    // the editorial base `light_/dark_<Comp>` remain as scoping scaffolding (+ preset-invariant signal keys).
    expect(subs().length).toBe(20)
    expect(subs().filter((n) => /^(light|dark)_[A-Z]/.test(n)).length).toBe(20) // all are editorial bare light_/dark_<Comp>
    expect(subs().filter((n) => /^(light|dark)_(reader|quietDesk)_/.test(n)).length).toBe(0) // no per-preset comp sub-themes
  })

  it('backward-compat — editorial keeps the bare light/dark + the 10 light_/dark_<Comp> the config imports', () => {
    for (const comp of ['Button', 'Input', 'Checkbox', 'Select', 'Card', 'Tabs', 'Menu', 'Dialog', 'Popover', 'Toast']) {
      expect(themes).toMatch(new RegExp(`export const light_${comp} = \\{`))
      expect(themes).toMatch(new RegExp(`export const dark_${comp} = \\{`))
    }
  })

  it("each preset resolves to ITS OWN ramp (not the default's)", () => {
    expect(grab('light')).toContain('editorialNeutral50')
    expect(grab('light_reader')).toContain('readerNeutral50')
    expect(grab('light_reader')).not.toContain('editorialNeutral')
    expect(grab('light_quietDesk')).toContain('quietDeskNeutral50')
  })

  it('per-preset dark overlay applies — dark_reader ≠ light_reader and uses the reader ink ramp', () => {
    expect(grab('dark_reader')).not.toBe(grab('light_reader'))
    expect(grab('dark_reader')).toContain('readerNeutral900') // ink surface in dark
    expect(grab('dark_reader')).not.toContain('editorialNeutral')
  })

  it('per-preset component sub-themes are NOT emitted (accent-inherit fix — they never resolved + are superseded by direct-semantic consumption)', () => {
    expect(themes).not.toMatch(/export const light_reader_Button =/)
    expect(themes).not.toMatch(/export const dark_quietDesk_Card =/)
    // the editorial base comp sub-theme still references ITS base theme key (preset-invariant signal/scaffolding keys)
    const sub = themes.match(/export const light_Button = \{[^\n]*\}/)?.[0] ?? ''
    expect(sub).toMatch(/light\.color/)
    expect(sub).not.toMatch(/tokens\./)
  })

  it('per-preset font-family routes to fonts.ts; shared type scales unchanged', () => {
    expect(fonts).toMatch(/"display": "'Spectral'/) // editorial display (bare)
    expect(fonts).toMatch(/"readerDisplay": "'Fraunces'/)
    expect(fonts).toMatch(/"quietDeskChrome": "'IBM Plex Sans'/)
    expect(fonts).toMatch(/fontSize: \{[^}]*"body": 16/) // shared scale unchanged
  })

  it('every preset overlay entry is a ref resolving to a loaded primitive (no raw literal / dangling — B7)', () => {
    const { byPath } = validate() as { byPath: Map<string, unknown> }
    const files = [
      'semantic.dark.json',
      'semantic.reader.json',
      'semantic.reader.dark.json',
      'semantic.quietDesk.json',
      'semantic.quietDesk.dark.json',
    ]
    const isRef = (v: unknown): v is string => typeof v === 'string' && /^\{[^}]+\}$/.test(v)
    const walk = (node: any, cb: (v: unknown) => void): void => {
      if (node && typeof node === 'object') {
        if ('value' in node) cb(node.value)
        else for (const k of Object.keys(node)) walk(node[k], cb)
      }
    }
    for (const f of files) {
      walk(JSON.parse(read(`tokens/${f}`)).color, (v) => {
        expect(isRef(v)).toBe(true)
        if (isRef(v)) expect(byPath.has(v.slice(1, -1))).toBe(true)
      })
    }
  })

  it('B10 — AA contrast floor on EVERY rendered text pair × preset × MODE (≥ 4.5)', () => {
    // The real semantic→primitive resolution per mode (from semantic*.json overlays + component.json button tokens).
    // Covers light AND dark (the dark pairs are where the warm reader/quietDesk surfaces are the tight constraint).
    const { byPath } = validate() as { byPath: Map<string, { value: string }> }
    const hex = (p: string) => byPath.get(p)!.value
    const lum = (h: string) => {
      const n = h.replace('#', '')
      const ch = [0, 2, 4].map((i) => {
        const c = parseInt(n.slice(i, i + 2), 16) / 255
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
      })
      return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
    }
    const ratio = (fg: string, bg: string) => {
      const [l1, l2] = [lum(fg === 'white' ? '#FFFFFF' : hex(fg)), lum(bg === 'white' ? '#FFFFFF' : hex(bg))].sort((x, y) => y - x)
      return (l1 + 0.05) / (l2 + 0.05)
    }
    // [label, lightFg, lightBg, darkFg, darkBg] — `P` is the preset; paths are primitive refs the semantics resolve to.
    const pairs = [
      ['body  text.primary/surface', 'P.neutral.900', 'P.neutral.50', 'P.neutral.50', 'P.neutral.900'],
      ['muted text.muted/surface', 'P.neutral.500', 'P.neutral.50', 'P.neutral.400', 'P.neutral.900'],
      ['ghost brand.primary/surface', 'P.accent.500', 'P.neutral.50', 'P.accent.400', 'P.neutral.900'],
      ['btnPrimary text.inverse/emphasis', 'white', 'P.accent.600', 'P.neutral.900', 'P.accent.300'],
      ['btnSecondary text.primary/surf.sec', 'P.neutral.900', 'P.neutral.100', 'P.neutral.50', 'P.neutral.800'],
    ] as const
    const sub = (s: string, p: string) => (s === 'white' ? 'white' : `color.${s.replace('P.', p + '.')}`)
    for (const preset of ['editorial', 'reader', 'quietDesk', 'game']) {
      for (const [label, lf, lb, df, db] of pairs) {
        const light = ratio(sub(lf, preset), sub(lb, preset))
        const dark = ratio(sub(df, preset), sub(db, preset))
        expect(light, `${preset} ${label} (light) = ${light.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
        expect(dark, `${preset} ${label} (dark) = ${dark.toFixed(2)}`).toBeGreaterThanOrEqual(4.5)
      }
    }
  })
})
