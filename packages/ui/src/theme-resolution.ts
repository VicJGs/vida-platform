// fe-codec-theme S3 — pure theme resolution (no React, unit-testable).
// The codec's typed selection contract + the scheme-first name resolver + density value tables. The provider
// (provider.tsx) consumes these; the app owns the SELECTION state + persistence + switcher UI (R5, seam-contract.md).

/** A swappable token family = {palette + accent + display/body font-family} (R1). */
export type ThemePreset = 'reader' | 'editorial' | 'quietDesk' | 'game'
/** Light is primary; dark is the mechanical B7 overlay per preset (R7). */
export type ThemeMode = 'light' | 'dark'
/** Two "airs" — calm (base) / dense (tighter spacing + type). Maps to compact_mode + font_size (R8). */
export type ThemeDensity = 'calm' | 'dense'

/** The resolved selection the app owns and passes to <UIProvider selection>. */
export interface ThemeSelection {
  preset: ThemePreset
  mode: ThemeMode
  density: ThemeDensity
}

/**
 * The createTamagui theme key — SCHEME-FIRST (Tamagui 2.6.2 law: a theme's scheme = its first `_`-segment, and only
 * `light`/`dark` are valid schemes; a `${preset}_dark` name reads as scheme-less and breaks dark inversion/reset).
 * Default preset `editorial` keeps the bare `light`/`dark`; non-default presets prefix `${mode}_${preset}`.
 */
export type ThemeName = ThemeMode | `${ThemeMode}_reader` | `${ThemeMode}_quietDesk` | `${ThemeMode}_game`

/** Cold-start default (R2/R6): The Editorial + light + calm. */
export const THEME_DEFAULT: ThemeSelection = { preset: 'editorial', mode: 'light', density: 'calm' }

/** Drives the Settings picker later; editorial is the default (listed first is not significant — the picker labels it). */
export const THEME_PRESETS: readonly ThemePreset[] = ['reader', 'editorial', 'quietDesk', 'game']

/**
 * Pure resolution: selection → the Tamagui theme name + the density payload.
 * editorial → bare `mode`; reader/quietDesk → `${mode}_${preset}`. Exhaustively maps the 6 (preset×mode) inputs to the
 * 6 base theme names registered on config.themes (themes.ts). Density is passed through for the provider's CSS layer.
 */
export function resolveTheme(sel: ThemeSelection): { themeName: ThemeName; density: ThemeDensity } {
  const themeName: ThemeName = sel.preset === 'editorial' ? sel.mode : `${sel.mode}_${sel.preset}`
  return { themeName, density: sel.density }
}

// ── Density value tables (pure data; Visual-Gate-tunable — BR-codec-3) ───────────────────────────────────────────────
// Density rescales only the INSET BAND of the space scale + the type ramp; large layout tokens ($32…$128) stay fixed so
// page structure does not collapse. The provider reads each token's runtime CSS var name (getToken) and applies these
// values via setProperty on <html> when density==='dense' (calm → removeProperty = the base scale). See provider.tsx.

/** The space token keys density rescales (the inset band). Matches tokens.ts space keys. */
export const DENSITY_SPACE_BAND = ['8', '12', '16', '24'] as const

/** calm = base (no override); dense = tighter px per band key. Raw CSS px (not JSON tokens → B8's 4pt rule doesn't bind). */
export const DENSE_SPACE_PX: Record<(typeof DENSITY_SPACE_BAND)[number], number> = {
  '8': 6,
  '12': 8,
  '16': 12,
  '24': 16,
}

/** dense scales font-size AND line-height by this factor (subtle, readability-preserving). Visual-Gate-tunable.
 *  Applied by the provider over every role read from the live font config (fontsParsed), so no role list is hardcoded. */
export const DENSE_TYPE_SCALE = 0.92
