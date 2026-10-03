# fe-codec-theme — Slice Map (Decomposition Gate, Step 2) · Decide-mode

> **Unit grain is doc-fixed** (Tier-0 §1.3 `ThemeProvider`, G5 unit #1) [FACT: decomposition.md:38; reconstructed-structure.md Wave-0]; the
> **internal slicing below is proposed** (Decide-mode — no doc fixes sub-slices). Mechanism is doc-fixed: **"Tamagui
> sub-themes → N theme families"** [FACT: .claude/docs/decisions.md:9]. All plane = **frontend/shared** (@vida/ui + apps/web).
> Grounds: interpretation.md §6 (R1–R8) · build-tokens.mjs (emitter) · tamagui.config.ts · provider.tsx.

## The axes this codec adds (from interpretation R1–R8)
- **preset** (3): Reader · Editorial(default) · Quiet Desk — each = {neutral ramp (paper/ink) + brand ramp (accent)} + {display, body, chrome font}. Swap = color + font ONLY (R1).
- **mode** (2): light + dark — dark = the mechanical B7 `semantic.dark.json` overlay per preset (R7; not a feel).
- **density** (2): calm / dense — swaps `space.inset` + type-ramp size; = `compact_mode` bool (R8).
- → theme matrix = **preset × mode = 6 Tamagui themes**; density is an orthogonal scale applied by the provider.

## Slices

### S1 — Token families + emitter (ds-2 extension) · frontend
**Does:** restructure the seed `tokens/*.json` to carry the **3 preset palettes** (per-preset neutral + brand primitive
ramps) + **font-family per preset**; add the **density scale** (calm/dense `space.inset` + type-ramp). Extend
`build-tokens.mjs` to emit **N preset base themes × light/dark** (reader/reader_dark/editorial/… via the existing
overlay mechanism, generalized from the single light/dark pair) + **per-preset font data** in `fonts.ts`.
**Touches:** `themes/tokens/*.json`, `themes/semantic.dark.json` (per-preset overlays), `build-tokens.mjs`, generated
`themes.ts`/`fonts.ts`/`variables.css` (DO-NOT-EDIT outputs).
**Invariants kept:** 3-layer indirection (B2), 4pt grid (B8), deterministic (B4), aux-skip (B9), no literals in semantic/component.
**Done when:** `pnpm --filter @vida/ui tokens:build` emits 6 themes + 3 font families; `build-tokens.test.ts` extended (per-preset overlay + N-theme emission fixtures) green; no hard-coded palette.

### S2 — Tamagui config + real font serving (ds-4 extension) · frontend
**Does:** wire the 6 preset themes into `createTamagui({themes})`; `createFont` **per preset family** (3× display/body
pairs over the shared role-keyed scale, ratio→px at the boundary per DEF-U4-e); **self-host the 6 faces** (Fraunces,
Newsreader, Spectral, Inter, Source Serif 4, IBM Plex Sans) with a **font-loading budget** (preload default = Editorial;
`font-display: swap`; subset) [FACT: quality-bar §2.8].
**Touches:** `tamagui.config.ts`, `tamagui.d.ts` (theme-name union), font assets + `@font-face`.
**Done when:** config imports at runtime; typecheck 0; the 6 themes resolve; initial font payload within the budget (measured); default face preloaded.

### S3 — Provider + resolution + density + app rewire · frontend/shared
**Does:** extend `UIProvider` + `ThemeName` → a resolved **`{preset, mode, density}`** contract; a pure **resolution
function** → the **scheme-first** Tamagui theme name (`preset==='editorial' ? mode : \`${mode}_${preset}\``; §2a/seam-contract)
+ the density application via a **provider CSS data-attr scale** (`data-vida-density` rescales `space.inset`/type —
NOT a token swap, DEF-U8-h); **reduced-motion**: preset/mode/density swap is an instant state change, no animated palette (B12);
**rewire `App.tsx`** to feed the cold-start default (Editorial/calm/light) through the new contract (W2 fix — the live
store + switcher UI remain app/Settings-owned per R5).
**Touches:** `provider.tsx`, `apps/web/src/App.tsx`, the typed contract export.
**Done when:** per-slice **Visual Gate** PASS — presets × {light,dark} × {calm,dense} render from the shipped code,
reduced-motion verified, against the P1 specimen; tsc 0; `@vida/ui` + `apps/web` tests green.

## Out of scope (interpretation O1–O3; verified against docs)
- Theme/density **switcher UI + state store + `user_preferences` write** → app/Settings (R5; decisions.md:9 "switcher UI → fe-preferences").
- **Adaptive-by-context density** → P2/P3 (O2).
- **Per-preset component sub-themes (20×3)** — NOT built: the 20 `light_/dark_<Comp>` already resolve to **semantic base keys** (emitter:177-188), so they inherit each preset's palette by construction. Confirm at S1; no per-preset ×20 explosion.

## Envision coverage (gate SATISFIED — interpretation §8)
No per-slice re-greybox owed. Each `structural` P1 fact maps to a slice: EC "3 presets/default"→S1; "density 2-level"→S1/S3; "real fonts"→S2; "reduced-motion swap"→S3; "light-primary/dark-overlay"→S1. The P1 specimen is the Visual-Gate reference at S3.

## Technical seams — RESOLVED at /preflight against @tamagui/core **2.6.2** (installed) — not Victor questions
- **Theme naming = SCHEME-FIRST** (G1): scheme is the first `_`-segment, only light/dark valid (`validSchemes` :312) →
  editorial=bare `light`/`dark`, reader/quietDesk=`${mode}_${preset}`; sub-themes `${mode}[_preset]_<Comp>`. A
  `${preset}_dark` name would break inversion/reset. Per-preset sub-themes CONFIRMED required (resolver :377 = one-shot,
  no bare-`<Comp>` fallback) → ~60 sub-themes (10×3×2). Grounds S1 §2a/§3/§4 + seam-contract `ThemeName`.
- **Density mechanism** (b) — a `<Theme>`-independent **CSS data-attr scale** at the provider; `space`/`size` dimension
  props read the global token scale, theme swaps color only (DEF-U8-h). Built in **S3**; S1 authors no density tokens.
  Captured in seam-contract.md §Density.
