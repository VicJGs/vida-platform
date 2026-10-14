// DS-4 + fe-codec-theme S3 — the @vida/ui theme provider (the theme-switch MECHANISM; B14).
// The APP (Settings/UX-3/UI-4) owns the theme STATE (Zustand, AR-4), its persistence (user_preferences), and the
// switcher UI; it passes the resolved `{preset,mode,density}` as <UIProvider selection={...}>. A selection change
// re-roots the Tamagui theme (color, via `defaultTheme`) + re-applies the per-preset font vars + toggles density.
import { useLayoutEffect } from 'react'
import { TamaguiProvider, getConfig, getToken, type TamaguiProviderProps } from '@tamagui/core'
import { config } from './tamagui.config'
import { fonts } from './themes/fonts'
import {
  DENSE_SPACE_PX,
  DENSITY_SPACE_BAND,
  DENSE_TYPE_SCALE,
  resolveTheme,
  THEME_DEFAULT,
  type ThemePreset,
  type ThemeSelection,
} from './theme-resolution'

/** Resolved theme values (colors/tokens) for the active theme. A vida-namespaced re-export of Tamagui's `useTheme`
 *  (NOT `@tamagui/next-theme`'s `useThemeSetting`, which owns light/dark/system STATE — that's the app's Zustand).
 *  A direct re-export (not a wrapper) so the inferred type stays nameable under declaration emit (avoids TS2742). */
export { useTheme as useVidaTheme } from '@tamagui/core'
// The codec's typed selection contract + pure resolver + defaults live in theme-resolution.ts; re-export so the
// package barrel's `from './provider'` line (index.ts) keeps resolving them.
export {
  resolveTheme,
  THEME_DEFAULT,
  THEME_PRESETS,
  type ThemeName,
  type ThemePreset,
  type ThemeMode,
  type ThemeDensity,
  type ThemeSelection,
} from './theme-resolution'

export interface UIProviderProps extends Omit<TamaguiProviderProps, 'config' | 'defaultTheme'> {
  /** Resolved active selection, owned by the app (Zustand). Defaults to THEME_DEFAULT (Editorial + light + calm). */
  selection?: ThemeSelection
}

// Per-preset font-family VALUES for the S2 CSS-var seam (createFont bakes `--f-family: var(--vida-font-*, <Spectral>)`).
// editorial = the baked Spectral fallback (no override). Values are the generated fonts.ts strings (imported, R1).
const PRESET_FONTS: Record<Exclude<ThemePreset, 'editorial'>, { body: string; display: string }> = {
  reader: { body: fonts.fontFamily.readerBody, display: fonts.fontFamily.readerDisplay },
  quietDesk: { body: fonts.fontFamily.quietDeskBody, display: fonts.fontFamily.quietDeskDisplay },
  game: { body: fonts.fontFamily.gameBody, display: fonts.fontFamily.gameDisplay }, // fe-gamification G0 — the sans "System" voice
}

const DENSITY_STYLE_ID = 'vida-density-scale'

/** Extract the `--name` from Tamagui's `getToken` web return `"var(--name)"`; null if not a var() string. */
function cssVarName(token: string | undefined): string | null {
  const m = typeof token === 'string' ? token.match(/^var\((--[^,)]+)/) : null
  return m ? m[1] : null
}

// Tamagui's getConfig() does not surface `fontsParsed` on its public type; this local shape describes the runtime
// structure the S3 preflight probe verified (each size/lineHeight entry carries `.variable` = `var(--…)` + `.val` = px).
interface ParsedFontAxis {
  [key: string]: { variable?: string; val?: number } | undefined
}
interface ParsedFont {
  size?: ParsedFontAxis
  lineHeight?: ParsedFontAxis
}

/**
 * Build the dense-density CSS text (A-prime). Density is NOT applied via setProperty on <html> — the generated
 * `:root .font_body` classes redeclare `--f-size-*`/`--f-lineHeight-*` as element-level LITERALS, which would shadow a
 * cascaded html override (Visual-Gate-proven). Instead one injected stylesheet (appended last → wins by source order at
 * equal specificity) redefines the band space vars + the font-scoped type vars under `[data-vida-density="dense"]`:
 *   [data-vida-density="dense"]{ --t-space-8:…  }                                     (space; (0,1,0) ties :root)
 *   [data-vida-density="dense"] .font_body,… .font_display{ --f-size-*:… --f-lineHeight-*:… }  (type; ties :root .font_body)
 * Values from getToken (space) + fontsParsed (type: baked val × scale). Large layout tokens ($32+) stay fixed.
 */
function densityCssText(): string {
  const space = DENSITY_SPACE_BAND.map((key) => {
    // getToken's name arg is a strict Token union; our band keys are valid space tokens — cast is safe (probe-verified).
    const name = cssVarName(getToken(`$${key}` as Parameters<typeof getToken>[0], 'space'))
    return name ? `${name}:${DENSE_SPACE_PX[key]}px;` : ''
  }).join('')

  // fontsParsed is not on getConfig()'s public type; cast to the probe-verified runtime shape (documented above).
  const fontsParsed = (getConfig() as unknown as { fontsParsed?: Record<string, ParsedFont> }).fontsParsed ?? {}
  const typeVars = new Map<string, number>() // varName → dense px; both font classes share the same var names (dedup)
  for (const font of Object.values(fontsParsed)) {
    for (const axis of [font.size, font.lineHeight]) {
      if (!axis) continue
      for (const entry of Object.values(axis)) {
        const name = cssVarName(entry?.variable)
        if (name && typeof entry?.val === 'number') typeVars.set(name, Math.round(entry.val * DENSE_TYPE_SCALE))
      }
    }
  }
  const type = [...typeVars].map(([n, v]) => `${n}:${v}px;`).join('')

  return (
    `[data-vida-density="dense"]{${space}}` +
    `[data-vida-density="dense"] .font_body,[data-vida-density="dense"] .font_display{${type}}`
  )
}

/** Inject the density stylesheet once (idempotent by id). Inert until an ancestor carries data-vida-density="dense". */
function ensureDensityStylesheet() {
  if (typeof document === 'undefined' || document.getElementById(DENSITY_STYLE_ID)) return
  const el = document.createElement('style')
  el.id = DENSITY_STYLE_ID
  el.textContent = densityCssText()
  document.head.appendChild(el)
}

/** Apply the per-preset font family vars on <html> (reader/quietDesk set; editorial CLEARS → baked Spectral). N1. */
function applyFontFamily(preset: ThemePreset) {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  if (preset === 'editorial') {
    style.removeProperty('--vida-font-body')
    style.removeProperty('--vida-font-display')
  } else {
    style.setProperty('--vida-font-body', PRESET_FONTS[preset].body)
    style.setProperty('--vida-font-display', PRESET_FONTS[preset].display)
  }
}

// The non-default presets that ride a <body> sub-theme class (editorial = the bare scheme base, no class).
// MUST list EVERY non-editorial preset — the cleanup loops below remove exactly these, so an omitted preset
// leaves a STALE `t_<preset>` on <body> after switching away (fe-gamification: `game` was omitted in G0 →
// `t_game` stuck, which the XP-ring preset read would mis-report). Keep in sync with ThemePreset.
const PRESET_CLASSES: ReadonlyArray<Exclude<ThemePreset, 'editorial'>> = ['reader', 'quietDesk', 'game']

/** Put the preset sub-theme class on <body> (editorial clears it). WHY <body> not <html>: Tamagui emits sub-theme vars
 *  under a NESTED selector `:root.t_<mode> .t_<preset>` (an ancestor scheme class + a DESCENDANT preset class), so a flat
 *  `t_<mode>_<preset>` on <html> matches nothing (Visual-Gate-proven). <body> is the one element that is a descendant of
 *  <html> (the scheme, via defaultTheme + addThemeClassName:'html') AND an ancestor of BOTH the app and the body-portals
 *  (Dialog/Menu/…) — so the preset palette reaches portalled surfaces too (and their `${mode}_${preset}_<Comp>` sub-themes). */
function applyPresetClass(preset: ThemePreset) {
  if (typeof document === 'undefined') return
  const cl = document.body.classList
  for (const p of PRESET_CLASSES) cl.remove(`t_${p}`)
  if (preset !== 'editorial') cl.add(`t_${preset}`)
}

/** Clear every codec-owned var/class/marker off <html> + <body> so a provider that unmounts (tests/nested) leaves the
 *  document clean. The injected <style> stays (inert without the attr; idempotent across mounts). */
function clearCodec() {
  if (typeof document === 'undefined') return
  const style = document.documentElement.style
  style.removeProperty('--vida-font-body')
  style.removeProperty('--vida-font-display')
  document.documentElement.removeAttribute('data-vida-density')
  for (const p of PRESET_CLASSES) document.body.classList.remove(`t_${p}`)
}

export function UIProvider({ selection = THEME_DEFAULT, children, ...rest }: UIProviderProps) {
  const { density } = resolveTheme(selection)
  const { preset, mode } = selection

  // Apply the codec layer on selection change. useLayoutEffect = before paint (minimise FOUT). Density stylesheet is
  // injected once; density is a pure attribute toggle; the font-family vars + preset class are idempotent writes.
  // Deps = what the effect consumes. Cleanup clears everything so a provider that unmounts (tests/nested) leaves the
  // document clean. The swap is INSTANT by construction (no transition added) → honours prefers-reduced-motion (B12).
  useLayoutEffect(() => {
    ensureDensityStylesheet()
    applyFontFamily(preset)
    applyPresetClass(preset)
    document.documentElement.setAttribute('data-vida-density', density)
    return clearCodec
  }, [preset, density])

  // SCHEME (light|dark) rides defaultTheme → the t_light|t_dark class on <html> (addThemeClassName:'html'); the PRESET
  // rides the <body> class above. Tamagui's nested sub-theme CSS (`:root.t_<mode> .t_<preset>`) then resolves the preset
  // palette for the whole document incl. portals. A flat defaultTheme={`${mode}_${preset}`} would NOT (Visual-Gate-proven).
  return (
    <TamaguiProvider config={config} defaultTheme={mode} {...rest}>
      {children}
    </TamaguiProvider>
  )
}
