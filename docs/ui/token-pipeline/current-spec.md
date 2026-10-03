# Token Pipeline — Current Spec (durable · §XXIX promotion target)

> **Context:** `@vida/ui` → `packages/ui/src/themes/`. **Built** by DS-1 (LIF-81, plumbing) 2026-07-26 + **DS-2**
> (LIF-82, foundation values + aux namespaces + dark overlay) 2026-08-03 + **DS-3** (LIF-83, motion tokens) 2026-08-03.
> Companion: `current-business-rules.md`.
> Forward specs: `docs/specs/components/{ds-1-token-pipeline,ds-2-foundations,ds-3-motion-foundation}/_index.md`.
> **No-Guessing:** `[FACT: src]` / `[INTENT]` (documented direction, not yet built).

## What the token pipeline is
The build that turns a hand-authored **three-layer** token seed (primitive → semantic → component) into the
design system's consumable outputs, from one source. It is the foundation every DS-2…DS-5 and UI-* primitive
inherits. Style Dictionary is the engine (ADR-001). `[FACT: build-tokens.mjs]`

## Topology
```
packages/ui/src/themes/
├── tokens/
│   ├── primitive.json     # raw scales — literals only (color/space/size/radius/zIndex + AUX font*/shadow)
│   ├── semantic.json      # references primitive only  (color/surface/primary → {color.white})
│   ├── semantic.dark.json # DS-2 dark OVERLAY — semantics that differ in dark (loaded by filename, NOT in SD source)
│   └── component.json     # references semantic only    (button/background/primary → {color.brand.primary})
├── build-tokens.mjs       # Style Dictionary build + checkLayers (B2 + B8 4pt-grid) + 5 custom formats + AUX skip (B9/B11)
├── variables.css          # GENERATED — design.md §XII CSS custom properties (var() chain; incl. aux font*/shadow/motion)
├── tokens.ts              # GENERATED — Tamagui createTokens() (5 categories + `true` defaults; aux excluded)
├── themes.ts              # GENERATED — 6 scheme-first base themes (editorial=light/dark · reader/quietDesk=${mode}_${preset}) + 60 ${mode}[_preset]_<Comp> sub-themes (fe-codec S1, B-codec-1)
├── fonts.ts               # GENERATED — typography tokens as typed data for DS-4 createFont (aux not in createTokens)
├── motion.ts              # GENERATED (DS-3) — duration/easing tokens as typed data for DS-4 createAnimations (B11)
└── shadow.ts              # GENERATED (UI-1) — box-shadow literals as typed data for injected component CSS (Card, DEF-U5-e)
```
`tokens.ts`/`themes.ts`/`fonts.ts`/`motion.ts`/`shadow.ts` are re-exported from `packages/ui/src/index.ts`. `[FACT: index.ts]`

**Aux namespaces (DS-2 + DS-3).** Namespaces that are NOT `createTokens` categories are **skipped** in
`tokens.ts`/`themes.ts` (incl. aux-referencing semantics) so they never trip B3, and routed by destination:
`fontFamily/fontSize/fontWeight/lineHeight/letterSpacing` → `variables.css` + `fonts.ts` (typography);
`shadow` → `variables.css` + `shadow.ts` (box-shadow literals; typed export added by UI-1 Card, DEF-U5-e);
**`duration/easing` → `variables.css` + `motion.ts` (motion, DS-3, B11).** `AUX` is
factored `[...TYPOGRAPHY, 'shadow', ...MOTION]` so each emitter filters by its own sub-list (leak-proof).
`createFont`/`createAnimations`/`createTamagui` = DS-4. `[FACT: build-tokens.mjs AUX/TYPOGRAPHY/MOTION/isAuxPath]`

## The three-layer → Tamagui projection (the non-trivial core)
| Seed layer (design.md §II) | → Tamagui construct | Shape |
|---|---|---|
| primitive | `createTokens` categories | flat `color/space/size/radius/zIndex`, each with a `true` default `[FACT: @tamagui/core@2.5.1]` |
| semantic  | base `light`/`dark` theme objects | flat keys (`colorSurfacePrimary`…) whose values reference tokens |
| component | `light_<Comp>`/`dark_<Comp>` sub-themes | scoped theme objects referencing tokens |

design.md's 3 layers do NOT map to 3 flat Tamagui token categories — they map onto Tamagui's tokens → themes →
sub-themes. CSS-var names (arbitrary depth) and Tamagui token keys (flat, category-bounded) intentionally differ.

## Contract (build interface)
- **Invoke:** `pnpm --filter @vida/ui tokens:build` → `node src/themes/build-tokens.mjs`. `build` runs it before `tsc`.
- **Input:** `tokens/{primitive,semantic,component}.json` (classic Style Dictionary format: `{ "value", "type" }`,
  references `{group.name}`). `[FACT: seed files]`
- **Output:** `variables.css` (`a/b/c → --a-b-c`, primitive=literal / semantic·component=`var(--target)`),
  `tokens.ts` (`createTokens`), `themes.ts` (`light`/`dark` + `light_<Comp>`/`dark_<Comp>`). GENERATED banner on all.
- **Exit:** `0` success · non-zero on layer-skip / raw-literal-in-non-primitive / dangling-ref / empty-layer, cause named.

## Status (2026-07-26 — DS-1 IMPLEMENTED · 2026-08-03 — DS-2 + DS-3 IMPLEMENTED)
- **DS-1** (plumbing): typecheck green standalone (⊥ DS-4); build deterministic; B2 fail-loud proven. `[FACT: DS-1 session]`
- **DS-2** (foundation values + extensions): real scales authored — indigo brand / slate neutral / emerald+red
  signals (10-step ramps), 4pt space + size, radius sm→full, zIndex, type scale (7 sizes + families/weights/
  line-heights), shadow ×3, `semantic.dark.json` (10 parallel dark overrides). Pipeline: `source`→explicit 3-file
  list, aux-skip both emitters, `fonts.ts`, B8 (`space.*`), dark-overlay loader, `tokenRef` bracket-notation.
  **Verify:** `tokens:build` deterministic · **`@vida/ui` 20/20** (13 + B7/B8/B9) · **root typecheck 10/10** ·
  contrast AA both modes. Visual Gate: **PASS (provisional)** — ⚠ palette is a placeholder, not brand
  ([[ds-2-palette-is-provisional-placeholder]]). `[FACT: DS-2 session]`
- **DS-3** (motion foundation): `duration` (instant 0/fast 150/moderate 250/slow 400, unitless ms) + `easing`
  (out/in/inOut cubic-beziers + linear) primitives added as a **third aux consumer** (`motion.ts`, mirroring
  `fonts.ts`); `AUX` refactored into `TYPOGRAPHY`/`shadow`/`MOTION` sub-lists; `vida/fonts` filter narrowed to
  typography (closed the fonts↔motion leak by construction); `vida/motion` format + `motion.ts` registration + index
  re-export; B11/B12. Values trace to `motion.md §IX` bands/curves. **Verify:** `tokens:build` deterministic ·
  **`@vida/ui` 26/26** (20 + B11/fonts-isolation/css-vars-presence) · **root typecheck 10/10** · preview render adds a
  motion section (4 durations × 4 easings; animate transform+opacity only; honors `prefers-reduced-motion`).
  Visual Gate: **PASS (provisional)** — its second run. `[FACT: DS-3 session]`
- Deps: `style-dictionary@5.5.0` (devDep) · `@tamagui/core@2.5.1` (dep) · `vitest@3.2.4` (devDep). `[FACT: package.json]`

## Source model (direction shaped 2026-08-03 — supersedes the DS-1 "Figma → Tokens Studio" assumption)
The source of truth for the frontend (DS/UI/UX) is the **documented intent** (ADRs, specs, design.md), realized
**code-first**: the hand-authored `tokens/*.json` seed is the authored source during M1. The shareable,
community-forkable **Figma file is built later** — once products/components exist — as a faithful reflection,
synced via **Figma MCP + a custom scripter + documentation**. **NOT Tokens Studio** (its heavy-task sync is
paid-only). Kept aligned per-unit, so "Figma-later" is a projection, not a reconciliation. `[DIRECTION: Victor 2026-08-03]`

## Known limitations / deferrals
- **⚠ Token VALUES are a provisional placeholder palette** (indigo/slate/emerald + Space Grotesk/Inter), NOT Vida's
  brand — replaced when brand identity is defined; the token ARCHITECTURE is final. `[FACT: DS-2; [[ds-2-palette-is-provisional-placeholder]]]`
- **`light`/`dark` are now PARALLEL-designed** (DS-2 `semantic.dark.json`, 10 overrides; design.md §XI, not an
  inversion), modeled to map 1:1 to Figma variable **modes**. The dark-mode **mechanism** (theme-switch) is
  **[RESOLVED — DS-4]**: `<UIProvider theme>` → `TamaguiProvider defaultTheme` (state = app Zustand). `[FACT: DS-2; DS-4]`
- **CSS dimension + duration vars are unitless** (`--space-16: 16`, `--duration-fast: 150`, not `16px`/`150ms`)
  because Tamagui tokens want raw numbers. **[RESOLVED — DS-4]** Tamagui compiles `createTokens` → its own web CSS
  vars, authoritative at runtime; `variables.css` (unitless + the camelCase `--easing-inOut`) is a parallel
  documentation / Figma-projection artifact, not wired into the app — so no runtime unit reconciliation is needed.
  `[FACT: DS-4 tamagui.config.ts; DS-3]`
- **No Figma wiring yet** — seed is hand-authored; the Figma community file + MCP-scripter bridge come later
  (release-gated M4 P2-⑦). `[FACT]` `[DIRECTION: Victor 2026-08-03]`
- **Contrast caveat → DS-5:** white-on-brand.500 = 4.47 (< AA 4.5 small text); filled buttons use brand.600. `[FACT: DS-2]`
