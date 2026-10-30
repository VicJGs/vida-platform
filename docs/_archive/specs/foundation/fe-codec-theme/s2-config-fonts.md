# fe-codec-theme · S2 — Tamagui config + real font serving (ds-4 extension) · forward spec / PLAN

> **Slice:** S2 of 3 (slice-map.md). **Context:** `@vida/ui` → `packages/ui/src/tamagui.config.ts` + `tamagui.d.ts` +
> font assets; `apps/web` (preload). **Gate:** §XXVI (PLAN → /critique → Approval 1 → /preflight → /critique → Approval 2
> → build). **Baseline:** S1 shipped 6 scheme-first base themes + 60 sub-themes + per-preset `fonts.ts` data
> (`display/body/chrome` editorial-bare + `readerDisplay`/… camel keys). **No-Guessing:** `[FACT: src]`.

## 1. Objective (S2 only)

Make the 6 S1 themes + 3 font families **live in `createTamagui`**, and **self-host the 6 real faces** within a loading
budget. S2 owns: (a) register the 6 base themes + 60 sub-themes in `createTamagui({themes})`; (b) `createFont` per preset
family (3× display/body over the shared role-keyed scale, ratio→px at the boundary per DEF-U4-e); (c) extend the typed
theme-name union in `tamagui.d.ts`; (d) serve the 6 faces (Fraunces · Newsreader · Spectral · Inter · Source Serif 4 ·
IBM Plex Sans) with `font-display: swap` + a preload of the default (Editorial), within the quality-bar font budget.
**S2 does NOT** wire the provider/switcher or apply density — that is **S3** (`provider.tsx`, `App.tsx`).

## 2. Architecture (slice-map-fixed) + the activation seam (→ /preflight)

**Slice-map-fixed [FACT: slice-map.md S2]:** `createFont` **per preset family — 3× display/body pairs** over the shared
role-keyed scale (ratio→px at the DEF-U4-e boundary). So S2 registers **3 preset pairs = 6 font configs**
(editorial/reader/quietDesk × display/body), each differing ONLY by `family` (R1). **chrome is NOT wired at S2** — it
stays `fonts.ts` token data (authored S1) for a later consumer; the slice is "display/body pairs."

**Activation mechanism — RESOLVED at /preflight against installed `@tamagui/core@2.6.2`:** **(b) CSS-var family
indirection.** The resolver bakes a STATIC `font_<key>` CSS class whose `font-family` comes from `createFont` at config
time (`@tamagui/web getSplitStyles.cjs:288` — the `fontFamily` value must be a registered `conf.fontsParsed` key;
`:687-689` — emits `font_${key}` class). **There is NO per-theme/scope font hook** (candidate (a) refuted) — the global-
font/DEF-U8-h reality holds for fonts too. So:

- Register **2 var-driven `createFont` keys** (`body`, `display`) whose `family` is
  `"var(--vida-font-body, 'Spectral', Georgia, serif)"` / `"var(--vida-font-display, …)"`. Tamagui bakes
  `font-family: var(--vida-font-body, …)` into `.font_body`; the browser resolves the var per the cascade at render.
- The **3 preset families live as 3 CSS-var VALUE SETS**, not 3 configs: editorial = the var **fallback** (renders with
  no S3); the provider (S3) sets `--vida-font-body/display` per preset on the theme root (the SAME data-attr/CSS layer as
  density). **This refines the slice-map's "3× configs"** — its internal slicing is Decide-mode/proposed and the font
  mechanism was the flagged open seam; the installed lib makes 2-var-keys + 3-value-sets the correct shape, not 6 configs.
- **Slice-safe:** editorial renders from the fallback with no S3; typecheck green (config-only change). S3 supplies the
  reader/quietDesk var values. `chrome` stays `fonts.ts` data (unwired).

## 3. Config changes (`tamagui.config.ts`)

- **Themes:** replace the 22-key `themes: {light, dark, light_Button…}` literal with a **spread of all S1 exports** —
  `import * as T from './themes/themes'` → `themes: { ...T }` (registers all 66: 6 base + 60 sub). Drops the hand-maintained
  import list (which would otherwise need 40 new lines). Verify the spread's typed shape still augments cleanly (§5/d).
- **Fonts (per the §2 resolution):** keep the single role-keyed `sizeScale`/`lineScale`/`weightScale`/`trackScale`
  (shared — R1: only `family` varies). **2 `createFont` keys** (`body`, `display`), each `family` = a CSS var with the
  editorial family as fallback (`var(--vida-font-body, 'Spectral', Georgia, serif)` etc. — the editorial strings come
  from `fonts.ts` `fontFamily.{body,display}`). **Not** 6 configs — the 3 preset families are 3 var VALUE SETS (S3). **No
  chrome `createFont`.**
- Keep `createTokens` (S1 tokens), `createAnimations`, `media`, `settings` **unchanged**.

## 4. Typed theme-name union (`tamagui.d.ts`)

The ambient augmentation currently rides `VidaConfig = typeof config`; with `themes: {...T}` the theme-name union
**flows automatically** from the config's `themes` key set — confirm no explicit union literal is needed (if Tamagui's
`TamaguiCustomConfig` derives theme names from `keyof typeof config.themes`, S2 adds nothing here; else extend it).
`provider.tsx`'s `ThemeName = 'light'|'dark'` stays **S3's** to widen (it's the provider contract, not the config).

## 5. Font serving + budget

- **Self-host via bundled woff2 + hand-authored `@font-face`** [FACT: slice-map "font assets + `@font-face`"] — **no
  external CDN** (local-first/ZK) and **no new npm font deps** (ADR-001 "no extra dependency" ethos; prefer the manual
  path over 6 `@fontsource` packages — only fall back to `@fontsource` if /preflight shows manual subsetting is
  impractical). woff2 assets in `packages/ui` (or `apps/web/public`); `@font-face` with `font-display: swap`; latin subset.
- **Preload only the Editorial default** (Spectral display+body) in `apps/web/index.html` (`<link rel="preload" as="font"
crossorigin>`); reader/quietDesk faces load when their preset activates (S3).
- **Budget [RESOLVED at /preflight]:** `frontend-quality-bar/_index.md:55` states a font budget _exists_ ("~5 families +
  live swap") but gives **no hard KB** — the governing constraint is **`< 80 KB` initial bundle** (`:58`). So: editorial's
  preloaded face is **Spectral only** (editorial uses Spectral for BOTH display+body; Inter/chrome unwired), latin subset,
  critical weights only; reader/quietDesk faces are OFF the initial critical path (load on preset activation, S3).
  **Measured, not estimated** (engineering §XIII) — report the preloaded woff2 byte total; keep it a small slice of the 80 KB.
- Weights to subset (from `fontWeight`): 400/500/600/700 — subset per face to only those actually used.

## 6. Verification (Step 8–10 for S2)

`pnpm --filter @vida/ui typecheck` 0 · root typecheck green · `config` imports at runtime (the DS-4 config.test.ts B14
runtime assertion still passes; add an assertion that all 6 base theme names resolve on `config.themes`) · the font
payload measured within budget · default face preloaded. **No per-slice Visual Gate at S2** — fonts/themes are not a
rendered surface until the provider feeds them (the rendered presets × density × fonts Visual Gate is **S3**). A
font-rendering smoke (the right family resolves on a node) belongs to S3's live gate.

## 7. Risks / seams

- **Font activation mechanism** (§2) — RESOLVED to (b) CSS-var indirection (no Tamagui per-theme font hook in 2.6.2). S2
  registers 2 var-driven keys; the preset VALUES are S3. A `createFont` family must emit the `var()` verbatim into
  `.font_body` — assert this in the build (inspect generated CSS / config) as the slice's correctness floor.
- **Font asset acquisition** (§5) — the build needs real woff2 for 6 OFL families (Fraunces·Newsreader·Spectral·Inter·
  Source Serif 4·IBM Plex Sans); bundling them is the one external step. Source from the OFL distributions, latin-subset.
- **Themes spread typing** (§3) — `themes: {...T}` must keep the `TamaguiCustomConfig` augmentation + `useTheme` typing
  intact; a widened/looser theme-name type is a regression. Verify typecheck + a theme-name autocomplete probe.
- **Font payload** — `@fontsource` full-family imports balloon the bundle; per-weight + preload-default-only is the guard.
  Measure (engineering §XIII), don't estimate.
- **Slice coupling with S3** — S2 lands the CSS-var seam with the editorial default working; the reader/quietDesk font
  VALUES + the swap are S3. S2 stays runtime-valid on its own (editorial fonts serve; typecheck green).

## 8. §XXIX currency (on S2 done)

Refresh `docs/ui/token-pipeline/current-*` (or a ds-4 context doc) — new rule **B-codec-2**: per-preset font-family via a
provider CSS-var seam (fonts are global in Tamagui, like density); 6 self-hosted faces + preload-default budget. Promote with the code.
