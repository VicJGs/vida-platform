# fe-codec-theme — Seam Contract (Decomposition Gate, Step 2)

> The API this codec exposes to **surfaces** (every `fe-*` unit inherits it) and to **apps/web** (owns the state).
> Boundary: the codec owns the **mechanism + presets + resolution**; the **app owns `{preset,mode,density}` STATE,
> its persistence (`user_preferences`), and the switcher UI** [FACT: provider.tsx:1-4; decisions.md:9; interpretation R5].

## Exports (`@vida/ui`)

```ts
// resolved selection the app owns and passes down (app state = Zustand/AR-4; not this codec)
type ThemePreset  = 'reader' | 'editorial' | 'quietDesk'
type ThemeMode    = 'light' | 'dark'
type ThemeDensity = 'calm' | 'dense'
interface ThemeSelection { preset: ThemePreset; mode: ThemeMode; density: ThemeDensity }

const THEME_DEFAULT: ThemeSelection            // { editorial, light, calm } — cold-start (R2/R6)
const THEME_PRESETS: readonly ThemePreset[]    // ['reader','editorial','quietDesk'] — drives the Settings picker later

// pure resolution — selection → the Tamagui theme name + density payload (no React, unit-testable)
function resolveTheme(sel: ThemeSelection): {
  themeName: `${ThemePreset}` | `${ThemePreset}_dark`   // the createTamagui theme key
  density: ThemeDensity                                  // consumed by the provider's density application
}

// provider — extends today's UIProvider; `selection` replaces the `theme?: 'light'|'dark'` prop
interface UIProviderProps extends Omit<TamaguiProviderProps,'config'|'defaultTheme'> {
  selection?: ThemeSelection   // defaults to THEME_DEFAULT
}
function UIProvider(props: UIProviderProps): JSX.Element

export { useVidaTheme }  // unchanged — resolved token values for the active theme
```

## Consumption
- **apps/web (App.tsx) now:** `<UIProvider selection={THEME_DEFAULT}>` (cold-start). Later (Settings): `selection` is fed
  from the Zustand theme store; a store change re-roots the theme (same `defaultTheme` re-root pattern as today).
- **Surfaces:** read tokens via `useVidaTheme()` / Tamagui `$`-tokens as they already do — **no per-surface theme code**.
  Density-aware spacing uses the density-scaled `space.inset` tokens; surfaces never branch on `preset`.
- **Settings unit (later):** owns the picker UI + writes `theme_preset`/`compact_mode`/`font_size` to `user_preferences`;
  consumes `THEME_PRESETS` + `ThemeSelection`. **Not built here.**

## Backward-compat
`theme?: 'light'|'dark'` is replaced by `selection`. One call-site today (`App.tsx:71`) + test wrappers
(`routes.test.tsx`, `shell/test-router.tsx`, etc. — bare `<UIProvider>`); bare usage keeps working via the
`THEME_DEFAULT` fallback. S3 migrates `App.tsx`; test wrappers need no change (default applies).

## Density (the open technical seam → /preflight)
`resolveTheme` returns `density`, but **how density maps to Tamagui tokens is preflight-resolved** against the installed
`@tamagui/core` API (global `space`/`size` tokens are not per-theme): candidate = a provider-applied density-scaled
`space.inset`/type set (data-attr or token swap). Decided at preflight, recorded here before S3. Not a Victor decision.

## Invariants (contract-level)
- No hard-coded palette in any consumer; all color/type via tokens (R1, themes/CLAUDE.md).
- Dark = B7 overlay per preset; never a hand-authored dark theme (R7).
- Swap honours `prefers-reduced-motion` (instant; animate only transform/opacity) (B12, EC-7).
- The codec holds **no state** and does **no persistence** — it is a pure mechanism fed by the app (R5).
