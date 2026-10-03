# Token Pipeline — Current Business Rules (durable · §XXIX promotion target)

> **Context:** `@vida/ui` → `packages/ui/src/themes/`. Built by DS-1 (LIF-81), 2026-07-26. Companion:
> `current-spec.md`. Sources: ADR-001 (Tamagui + Style Dictionary), STANDARDS design.md §II/§XII,
> `docs/specs/components/ds-1-token-pipeline/_index.md`. **No-Guessing:** `[FACT: src]` / `[INTENT]` (owed).

## Invariants the pipeline upholds
1. **[FACT] B1 — Single source.** Every emitted value (CSS var, Tamagui token, theme key) traces to exactly one
   seed entry; no value authored twice; no duplicate path across layers. `[design.md §II; build-tokens.mjs checkLayers]`
2. **[FACT] B2 — Three-layer indirection, never skipped.** primitive = literal; semantic references primitive only;
   component references semantic only. A raw literal in a non-primitive layer, a layer-skip, a dangling reference,
   or an empty layer **fails the build loud** (non-zero exit, cause named). `[design.md §II lines 55–79; checkLayers; proven live]`
3. **[FACT] B3 — Naming, scoped per target.** CSS target: seed path `a/b/c` → `--a-b-c` (design.md §XII). Tamagui
   target: Tamagui's schema (flat category tokens accessed `$name`; theme keys; `light_<Comp>` sub-themes) — NOT the
   CSS-var name. The two targets differ in name shape by design; each is deterministic. `[design.md §XII; @tamagui/core]`
4. **[FACT] B4 — Determinism.** Same seed → byte-identical output per target (tokens sorted by path; no dated header).
   `[build-tokens.mjs; vitest "second build is byte-identical"]`
5. **[FACT] B5 — Generated, never hand-edited.** Every output carries a "GENERATED — DO NOT EDIT" banner; the seed
   is the only editable input. `[build-tokens.mjs BANNER/CSS_BANNER]`
6. **[FACT] B6 — Scale completeness (DS-2).** brand + neutral are 10-step ramps; signals success/danger; type scale
   = 7 sizes; spacing = the 4pt set; radius sm→full; shadow ×3. No arbitrary values. `[design.md §II–V; primitive.json]`
7. **[FACT] B7 — Parallel dark, designed not inverted (DS-2).** semantics that differ in dark have an entry in
   `semantic.dark.json` (→ a primitive); `themes.ts` dark = light + overlay, loaded by filename (not SD source), maps
   1:1 to Figma modes. `[design.md §XI; build-tokens.mjs; vitest B7]`
8. **[FACT] B8 — 4pt grid, `space.*` only (DS-2).** every primitive `space.*` is an integer multiple of 4; build
   fails loud otherwise. Radius (`full:9999`), size, zIndex, line-heights, aux are exempt. `[design.md §IV; checkLayers; vitest B8]`
9. **[FACT] B9 — Aux-namespace routing (DS-2; shadow typed export UI-1).** `fontFamily/fontSize/fontWeight/lineHeight/
   letterSpacing/shadow` are NOT createTokens categories → routed to CSS + a typed export, **skipped** in
   `tokens.ts`/`themes.ts` (incl. aux-referencing semantics); never trip B3. Per-namespace destinations: typography →
   CSS + `fonts.ts`; **shadow → CSS + `shadow.ts`** (the typed `shadow` const of box-shadow literals — added by UI-1
   Card, the first shadow consumer, DEF-U5-e; an aux namespace earns a typed export the moment a TS consumer needs it,
   the `motion.ts` precedent). `[build-tokens.mjs AUX/isAuxPath + vida/shadow; vitest B9 + shadow-emit]`
10. **[FACT] B10 — Contrast is the floor.** semantic text-on-surface pairs meet WCAG AA in both modes (caveat:
    white-on-brand.500 = 4.47 → buttons use brand.600). Verified in the design gate. As of fe-codec-theme S1 this is
    **enforced in-build** by a full-matrix fixture (every rendered pair × preset × mode ≥ 4.5), NOT just the design gate.
    Symmetric caveat (fe-codec S1): the warm `reader`/`quietDesk` **dark** surfaces pin the dark `accent.400`/`neutral.400`
    steps — ghost/muted text there is the tight constraint; tuned to ≥0.4 margin. `[design.md §II; build-tokens.test.ts B10 matrix]`
11. **[FACT] B11 — Motion primitives, aux-routed, standard-aligned (DS-3).** `duration.*` (unitless ms numbers) and
    `easing.*` (CSS cubic-bezier/linear strings) are primitives routed to `variables.css` + `motion.ts` and **skipped**
    by both the `tokens.ts` and `themes.ts` emitters (not Tamagui categories — a third aux consumer alongside
    typography→`fonts.ts` and shadow→CSS+`shadow.ts`). Every duration sits in a `motion.md §IX` band; every easing is one of the
    3 canonical cubic-beziers or `linear`. No arbitrary timing/curve; >500ms would need written justification (none).
    `[motion.md §IX; build-tokens.mjs MOTION/AUX; vitest B11 + fonts-isolation + css-vars presence]`
12. **[FACT] B12 — Motion contract, documented + component-gate-enforced (DS-3).** Two rules travel with the motion
    foundation but are **not** build-enforced at the token layer (no component code here): (a) **reduced-motion** —
    every animation ships a `prefers-reduced-motion: reduce` alternative that is an *instant state change* (not the
    absence of motion; if it communicates state, the reduced path communicates it another way); (b) **safe
    properties only** — animate `transform`/`opacity`/`clip-path` only, never `color`/`background`/`box-shadow`/
    `border`/`width`/`height`/`top-left-right-bottom`/`margin`/`padding`. Enforced at the component gate (DS-5/UI-*);
    the themes layer-doc is B12's enforcement artifact. `[motion.md §IX]`

## Rules established by DS-1 (IMPLEMENTED 2026-07-26)
- **[NEW]** design.md §II three-layer architecture is now **enforced mechanically** by the build (B2), not by review
  convention — a layer-skip cannot ship. This is the design-gate "three-layer" item passing *by construction*.
- **[NEW]** design.md §XII CSS-var naming is **enforced** by the CSS formatter (`--<path-with-dashes>`).
- **[NEW]** DS-1 ⊥ DS-4: the Tamagui token/theme modules typecheck **standalone** (no `tamagui.config.ts`), so the
  pipeline is not circularly dependent on the app config DS-4 builds. `[FACT: typecheck green]`

## Rules established by DS-2 (IMPLEMENTED 2026-08-03)
- **[DONE]** Token **values** authored code-first (B6) + **parallel dark** (B7) + **4pt grid enforced** (B8) +
  **aux routing** (B9). ⚠ values are a provisional placeholder palette, not brand ([[ds-2-palette-is-provisional-placeholder]]).
- **[DONE]** Approved via the **Frontend Visual Gate** (`docs/specs/foundation/frontend-visual-gate.md`) — its first run.

## Rules established by DS-3 (IMPLEMENTED 2026-08-03)
- **[DONE]** Motion primitives (B11) — `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) +
  `easing` (out/in/inOut cubic-beziers + linear) added as a **third aux consumer**: `AUX` factored into
  `TYPOGRAPHY`→`fonts.ts` · `shadow`→CSS · `MOTION`→`motion.ts` (leak-proof by set membership, closed the
  fonts↔motion collision by construction). @vida/ui 26/26 (20 DS-2 + 6 DS-3), root typecheck 10/10.
- **[DONE]** Motion contract (B12) recorded — reduced-motion + safe-property obligations documented for the
  component gate (DS-5/UI-*); the render preview demos animate transform+opacity only + honor reduced-motion.
- **[DONE]** Approved via the **Frontend Visual Gate** — its second run (motion demos: 4 durations × 4 easings).

## Rules established by DS-4 (IMPLEMENTED 2026-08-03)
- **[DONE]** `packages/ui/src/tamagui.config.ts` — `createTamagui` composes the generated outputs (B13, no
  hand-authored values): `createTokens` + two `createFont` (body/display, role-keyed + `$true` default) + light/dark
  themes + `createAnimations`. `declare module '@tamagui/core'` augmentation lives in an ambient `tamagui.d.ts`
  (avoids the `typeof config` self-reference cycle under `declaration:true`).
- **[DONE]** Dark = first-class switchable theme (B14): `<UIProvider theme>` → `TamaguiProvider defaultTheme`
  (theme state = app Zustand, AR-4); resolves differently at runtime (`light #FFFFFF ≠ dark #0F172A`).
- **[DONE]** Animation driver **resolved** (was `[UNKNOWN]`): **web = `@tamagui/animations-css`** per ADR-001 §9
  ("CSS variables on web" + "no extra dependency"), consuming `motion.ts` duration **+ easing** losslessly
  (`'cubic-bezier(0,0,0.3,1) 150ms'`); **native = reanimated** (ADR-001:258), deferred to mobile. An RN-driver drift
  was triaged + corrected — `docs/specs/fixes/ds-4-rn-driver-drift/`.
- **[DONE]** CSS-var reconciliation **resolved**: Tamagui compiles `createTokens` → its own web CSS vars, which are
  **authoritative at runtime**; the design.md `variables.css` (unitless `--space-*`/`--duration-*`, camelCase
  `--easing-inOut`) is a **parallel documentation / Figma-projection artifact**, not wired into the app. No runtime
  dependency on `variables.css`; the unitless-unit concern dissolves.

## Rules established by fe-codec-theme S1 (IMPLEMENTED 2026-10-02)
- **[NEW] B-codec-1 — N preset families via per-preset overlays (generalizes B7).** The pipeline emits **3 preset
  families** (editorial · reader · quietDesk) **× light/dark = 6 Tamagui base themes + per-theme `<Comp>` sub-themes**
  (10 comps × 6 = 60), each carrying its own palette + font-family. Mechanism = the B7 dark-overlay generalized: a
  reusable `applyOverlay` applies `semantic.<preset>.json` (light remap) then `semantic.<preset>.dark.json` (dark delta)
  over the editorial base, precedence `base < semantic.<preset>.json < semantic.<preset>.dark.json`, per-leaf, fail-loud
  (isRef + resolves-to-loaded-primitive). `[build-tokens.mjs PRESETS/applyOverlay; build-tokens.test.ts B-codec-1]`
- **[NEW] SCHEME-FIRST naming is law (Tamagui 2.6.2).** A theme's light/dark scheme = its **first `_`-segment**, and
  only `light`/`dark` are valid schemes (`@tamagui/core` `useThemeState.cjs:312/317`). So themes are named `${mode}` /
  `${mode}_${preset}` — the **default preset `editorial` keeps the bare `light`/`dark`** (+ `light_<Comp>`/`dark_<Comp>`),
  non-default presets are `light_<preset>`/`dark_<preset>` + `${mode}_${preset}_<Comp>`. A `${preset}_dark` name would read
  as scheme-less and break dark inversion/reset. Per-preset component sub-themes are **required** — the resolver tries one
  `${base}_${componentName}` with no bare-`<Comp>` fallback. `[useThemeState.cjs:377; themes.ts]`
- **[DONE]** editorial's bare names keep `tamagui.config.ts` + `provider.tsx` compiling **unchanged** at S1 (slice-safe;
  config wiring of the 2 net-new presets = S2, provider/density = S3). **Density is NOT a token/theme swap** — Tamagui
  resolves `space`/`size` against the global scale, theme swaps color only (DEF-U8-h) → density = a provider CSS data-attr
  scale (S3); S1 authors no density tokens. Values repoint off the DS-2 placeholder to per-preset ramps anchored on the
  P1 specimen ([[ds-2-palette-is-provisional-placeholder]] still applies — a brand pass refines VALUES, re-runs the B10 matrix).

## Rules established by fe-codec-theme S2 (IMPLEMENTED 2026-10-02)
- **[NEW] B-codec-2 — per-preset font-family rides a CSS-var seam (fonts are global in Tamagui, like density).**
  `@tamagui/core@2.6.2` bakes a STATIC `font_<key>` class whose `font-family` comes from `createFont` at config time —
  there is **no per-theme/scope font hook** (`@tamagui/web getSplitStyles.cjs:288/687`, the DEF-U8-h class for fonts).
  So `createFont` registers **2 var-driven keys** (`body`/`display`) with `family: var(--vida-font-<role>, <editorial
  fallback>)`; the **3 preset families are 3 CSS-var VALUE SETS**, not 3 configs — editorial = the var fallback (renders
  with no provider), the provider (S3) sets `--vida-font-body/display` per preset on the theme root (same CSS layer as
  density). `[tamagui.config.ts bodyFont/displayFont; tamagui.config.test.ts fe-codec S2]`
- **[DONE]** `createTamagui({ themes: {...themes} })` — all 66 generated themes registered via namespace-spread (no
  hand-maintained import list). The theme-name union flows from `typeof config` (tamagui.d.ts unchanged).
- **[DONE]** 4 body/display faces self-hosted as latin-subset woff2 + hand-authored `@font-face` (`apps/web/src/fonts.css`,
  `apps/web/public/fonts/`), `font-display: swap`, **no new npm deps** (ADR-001 ethos). **Only Spectral 400 preloaded**
  (`index.html`) — editorial default; others swap-in on preset activation. Preloaded payload = **21.7 KB** (measured, well
  within the `<80 KB` bundle budget, quality-bar `_index.md:58`). **chrome faces (Inter · IBM Plex Sans) deferred** with
  the chrome role (out of the "display/body pairs" slice scope).

## Rules established by fe-codec-theme S3 (IMPLEMENTED 2026-10-03 — ① shipped)

The provider is the codec MECHANISM; the app owns the `{preset,mode,density}` STATE (R5). `packages/ui/src/theme-resolution.ts`
(pure) + `provider.tsx` (effect) + `apps/web/src/App.tsx` (fed `THEME_DEFAULT`). Visual-Gate-verified (Storybook codec
harness: `preview.tsx` 3 toolbar globals + `_codec-gate.stories.tsx`) across all 12 cells (3 presets × light/dark × calm/dense).

- **[NEW] B-codec-3 — scheme on `<html>`, preset on `<body>` (nested sub-theme application).** Tamagui emits sub-theme
  color vars under a **nested** selector `:root.t_<mode> .t_<preset>` — a flat `defaultTheme="<mode>_<preset>"` (one
  `t_<mode>_<preset>` class) matches NOTHING (Visual-Gate-proven). So the provider sets `defaultTheme={mode}` (scheme class
  on `<html>` via `addThemeClassName:'html'`) and puts `t_<preset>` on **`<body>`** (an ancestor of the app AND the
  body-portals Dialog/Menu/…, so the preset palette + `${mode}_${preset}_<Comp>` reach portalled surfaces). editorial =
  the bare scheme base, no `<body>` class. `[provider.tsx applyPresetClass]`
- **[NEW] B-codec-4 — density = one injected, attribute-toggled stylesheet (A-prime, §XXVIII).** Space tokens are
  var-referenced (`padding:'$8'` → `var(--t-space-8)`, overridable) but font-size vars are **redeclared as literals** by
  Tamagui's `.font_body`/`.font_display` classes, shadowing any `<html>` override (Visual-Gate-proven). So density is a
  single `<style id="vida-density-scale">` (appended last → wins by source order at equal specificity) redefining the
  inset-band space vars + the font-scoped size/line-height vars under `[data-vida-density="dense"]`; the provider just
  toggles the `data-vida-density` attribute. Values from `getToken('$N','space')` + `getConfig().fontsParsed` (baked val ×
  `DENSE_TYPE_SCALE`, round). Space band `$8/$12/$16/$24`; large layout tokens `$32+` fixed. Type co-scales size AND
  line-height. `[provider.tsx densityCssText/ensureDensityStylesheet; theme-resolution.ts DENSE_SPACE_PX/DENSE_TYPE_SCALE]`
- **[NEW] B-codec-5 — per-preset font-family set on `<html>` via the S2 var seam.** The provider `setProperty`s
  `--vida-font-body/display` per preset (editorial clears → baked Spectral fallback); the swap is INSTANT (no transition →
  reduced-motion safe, B12). `[provider.tsx applyFontFamily]`
- **[DONE]** full-matrix AA contrast re-verified in-browser (muted text 5.65–6.03 on the warm dark surfaces, all ≥ 4.5);
  runtime selection-change (no reload) + reduced-motion verified.
- **[⚠ RESEARCH — known gap, flagged 2026-10-03]** **The preset ACCENT does not reach components that own a sub-theme**
  (Button/Input/etc. render the editorial accent in every preset). Root cause: those components consume a **baked**
  component-sub-theme key (`light_Button.backgroundPrimary → light.colorBrandEmphasis`) that chains to the scheme BASE, not
  the active preset; Tamagui **bakes theme values at config-build time**, so the attempted emitter-inherit fix
  (`var(--colorBrandEmphasis)` theme value) does NOT work — Tamagui bakes the var-string. The semantic accent var
  (`--colorBrandEmphasis`) DOES inherit the preset correctly to component scope (proven), so the likely resolution =
  components consume `$colorBrand*`/`$colorFocusRing` DIRECTLY (a DS-5/UI-1 contract change) or a nested-Theme application.
  **Tracked as a research unit; neutrals/surfaces/text/fonts/density all swap correctly.** `[Victor 2026-10-03: ship now, research later]`

## Boundaries (what the pipeline does NOT own — owed downstream)
- **[INTENT: DS-5]** component-token expansion + the white-on-brand.500 contrast caveat (buttons → brand.600) +
  semantic transition presets (enter/exit ease refinements via `enterStyle`/`exitStyle`) + `createFont`
  weight/letterSpacing key ergonomics as components firm up.
- **[INTENT: later / M4 P2-⑦]** Figma community file + MCP-scripter bridge (NOT Tokens Studio). `[DIRECTION: Victor 2026-08-03]`
