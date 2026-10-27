# packages/ui/src/themes — Token pipeline (DS-1 plumbing + DS-2 foundations)

The Style Dictionary → Tamagui + CSS-vars token pipeline. Turns the 3-layer JSON seed into the design system's
consumable outputs. Durable spec: `docs/ui/token-pipeline/current-spec.md` + `current-business-rules.md`.
Source model: **code-first** (`docs/specs/foundation/frontend-source-of-truth.md`).

## Files
- `tokens/{primitive,semantic,component}.json` — the **only editable input** (+ `semantic.dark.json`, see below).
  Three layers, strict indirection: primitive = literals · semantic → primitive · component → semantic. Classic
  Style Dictionary format (`{ "value", "type" }`, refs `{group.name}`).
- `tokens/semantic.dark.json` — **dark overlay** (DS-2, B7): only semantics that differ in dark, each → a primitive.
  Loaded BY FILENAME in the themes emitter, **NOT** in the SD `source` list (else it'd be a phantom rank −1 layer).
  Maps 1:1 to Figma variable modes.
- `build-tokens.mjs` — the build. Style Dictionary engine + `checkLayers` (3-layer rule + **B8 4pt-grid on `space.*`**,
  fail-loud) + **6** custom formats. `AUX` namespaces are NOT Tamagui categories → **skipped** in `tokens.ts`/
  `themes.ts` (B9/B11) and routed by destination via three sub-lists: `TYPOGRAPHY` (`fontFamily/fontSize/fontWeight/
  lineHeight/letterSpacing`) → CSS + `fonts.ts` · `shadow` → CSS + **`shadow.ts`** (box-shadow literals; typed export
  added by UI-1 Card, DEF-U5-e — an aux namespace earns a typed export on first TS consumer, the `motion.ts`
  precedent) · `MOTION` (`duration/easing`) → CSS + `motion.ts` (DS-3, B11). `AUX = [...TYPOGRAPHY, 'shadow',
  ...MOTION]`. Exports `checkLayers`/`validate`/`build`/`PipelineError`.
- `variables.css` · `tokens.ts` · `themes.ts` · `fonts.ts` · `motion.ts` · `shadow.ts` — **GENERATED — DO NOT EDIT.**
  `pnpm tokens:build`. `tokens.ts` = createTokens (5 categories) · `themes.ts` = light + parallel dark +
  `light_/dark_<Comp>` · `fonts.ts` = typography data for DS-4 `createFont` · `motion.ts` = duration/easing data for
  DS-4 `createAnimations` · `shadow.ts` = box-shadow literals for injected component CSS (Card elevation) ·
  `variables.css` = design.md §XII vars (incl. aux font*/shadow/motion; dimensions + durations unitless).
- `preview.html` — GENERATED review artifact (gitignored) via `pnpm preview:tokens` — the Frontend Visual Gate render
  (incl. a DS-3 motion section: animated demos per duration × easing, honoring `prefers-reduced-motion`).
- `build-tokens.test.ts` — **31 fixtures** (DS-1's 13 + DS-2 B7/B8/B9 + DS-3 B11/fonts-isolation/css-vars-presence +
  UI-1 shadow-emit ×5).

## Rules
- Never hand-edit a generated file — edit `tokens/*.json` and run `pnpm --filter @vida/ui tokens:build`.
- Never skip a layer or put a raw literal in semantic/component — build fails (B2). Never collide a semantic leaf
  with a primitive group path (e.g. semantic `color.success` vs primitive ramp `color.success.*`) — SD deep-merges
  and drops children; namespace it (`color.signal.success`).
- Space primitives must be integer multiples of 4 (B8, `space.*` only — radius `full:9999`/aux exempt).
- Aux (font*/shadow/motion) never enter `tokens.ts`/`themes.ts` createTokens (B9/B11). Fonts → `createFont`,
  motion (`duration`/`easing`) → `createAnimations`, both at DS-4. **Never add a namespace to `AUX` without also
  giving it a destination sub-list** (`TYPOGRAPHY`/`MOTION`) or its own emitter — else it silently leaks into the
  first matching aux emitter (the fonts↔motion leak DS-3 closed).
- **Motion values (B11)** trace to `standards/motion.md §IX`: durations sit in a band (micro 150–200 / transition
  250–300 / emphasis 350–450); easings are the 3 canonical cubic-beziers + `linear` (progress/data-viz only). No
  arbitrary timing/curve; >500ms needs written justification.
- **Motion contract (B12) — for the component gate (DS-5/UI-*), NOT build-enforced here.** Every animation: (a) ships
  a `@media (prefers-reduced-motion: reduce)` alternative that is an *instant state change* (not the absence of
  motion; if it communicates state, communicate it another way); (b) animates **only** `transform`/`opacity`/
  `clip-path` — never `color`/`background`/`box-shadow`/`border`/`width`/`height`/`top-left-right-bottom`/`margin`/
  `padding`. This layer-doc is B12's enforcement artifact. **Emit (a) through `internal/reduced-motion-css.ts`
  `reducedMotionCss(selectors, declarations)`** — it writes the OS `@media` rule AND the in-app
  `[data-vida-motion="reduce"]` twin (preferences-rescope R4); never hand-write the media query (a guard test fails it).
- Keep it deterministic: sort by path, no timestamps (B4).
- **⚠ Values are a provisional placeholder palette** (indigo/slate/emerald + Space Grotesk/Inter) — NOT Vida's brand
  ([[ds-2-palette-is-provisional-placeholder]]). The architecture is final; a brand pass swaps VALUES only + re-runs
  the Visual Gate. Tamagui app config (`createTamagui`) + dark-mode *mechanism* + CSS-var reconciliation = **DS-4**.

## Verify
`pnpm --filter @vida/ui tokens:build && pnpm --filter @vida/ui typecheck && pnpm --filter @vida/ui test`
Visual: `pnpm preview:tokens` → open `preview.html`.
