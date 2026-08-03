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
  fail-loud) + **4** custom formats. `AUX` namespaces (`fontFamily/fontSize/fontWeight/lineHeight/letterSpacing/
  shadow`) are NOT Tamagui categories → routed to CSS + `fonts.ts`, **skipped** in `tokens.ts`/`themes.ts` (B9).
  Exports `checkLayers`/`validate`/`build`/`PipelineError`.
- `variables.css` · `tokens.ts` · `themes.ts` · `fonts.ts` — **GENERATED — DO NOT EDIT.** `pnpm tokens:build`.
  `tokens.ts` = createTokens (5 categories) · `themes.ts` = light + parallel dark + `light_/dark_<Comp>` ·
  `fonts.ts` = typography data for DS-4 `createFont` · `variables.css` = design.md §XII vars (incl. aux).
- `preview.html` — GENERATED review artifact (gitignored) via `pnpm preview:tokens` — the Frontend Visual Gate render.
- `build-tokens.test.ts` — **20 fixtures** (DS-1's 13 + DS-2 B7 dark-differs / B8 off-grid-fails / B9 aux-routing).

## Rules
- Never hand-edit a generated file — edit `tokens/*.json` and run `pnpm --filter @vida/ui tokens:build`.
- Never skip a layer or put a raw literal in semantic/component — build fails (B2). Never collide a semantic leaf
  with a primitive group path (e.g. semantic `color.success` vs primitive ramp `color.success.*`) — SD deep-merges
  and drops children; namespace it (`color.signal.success`).
- Space primitives must be integer multiples of 4 (B8, `space.*` only — radius `full:9999`/aux exempt).
- Aux (font*/shadow) never enter `tokens.ts`/`themes.ts` createTokens (B9). Fonts → `createFont` at DS-4.
- Keep it deterministic: sort by path, no timestamps (B4).
- **⚠ Values are a provisional placeholder palette** (indigo/slate/emerald + Space Grotesk/Inter) — NOT Vida's brand
  ([[ds-2-palette-is-provisional-placeholder]]). The architecture is final; a brand pass swaps VALUES only + re-runs
  the Visual Gate. Tamagui app config (`createTamagui`) + dark-mode *mechanism* + CSS-var reconciliation = **DS-4**.

## Verify
`pnpm --filter @vida/ui tokens:build && pnpm --filter @vida/ui typecheck && pnpm --filter @vida/ui test`
Visual: `pnpm preview:tokens` → open `preview.html`.
