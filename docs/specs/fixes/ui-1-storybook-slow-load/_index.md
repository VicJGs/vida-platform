# Fix: UI-1 / U0 — Storybook story blank / "very slow to load"

Type: bug (triage) · Unit: UI-1 U0 (Storybook standup) · Date: 2026-08-06 · Classification: **ISOLATED**

## Symptom

Storybook (`pnpm storybook`, :6006) "very slow to load" — reported twice.

## Two triages (the first was wrong-direction; kept for honesty)

### Triage 1 — INCOMPLETE (diagnosed by hypothesis, not measurement)

Saw `[vite] Re-optimizing dependencies because vite config has changed` in the dev log and assumed the cost
was Vite lazily pre-bundling Tamagui. Fix applied: `viteFinal` → `optimizeDeps.include:['@tamagui/core',
'@tamagui/animations-css']`. **This did not resolve it** — because Tamagui is only 22 KB pre-bundled and was
never the bottleneck. Lesson: measure, don't hypothesize. (The `optimizeDeps.include` is kept — it removes one
real re-optimize pass — but it was not the fix.)

### Triage 2 — ROOT CAUSE (measured in a real browser via Playwright + system Brave)

A headless load of the story showed: `load` event at 2.1s but **network-idle at 32s and the story never
rendered**, with `PAGEERROR: ReferenceError: process is not defined`. So the symptom was **not slowness — it
was a crashed, blank story**; Vite's HMR socket + addon-a11y held the connection open (the false "32s idle").

**Root cause (one sentence):** `@vida/ui` runs Tamagui UNTAMED (no `@tamagui/vite-plugin`, per the DS-4
decision), and `@tamagui/core` reads `process.env.TAMAGUI_LAYOUT_FRAME_SKIP` / `TAMAGUI_ONLAYOUT_PRETRANSFORM`
at runtime — in the browser `process` is undefined → ReferenceError → the story renders blank.

## Classification

**ISOLATED** — a missing browser `process` shim (the vite-plugin normally provides these defines). The untamed
decision still holds; this does not require adopting the compiler.

## Documentation grounding

- Tamagui Vite guide (`docs/guides/vite.mdx`): `config.define` for `process.env` when integrating with Vite.
- Storybook v9: `.storybook/preview-head.html` is the documented injection point for the preview iframe `<head>`.

## Fix

`.storybook/preview-head.html` — `window.process = window.process || { env: { NODE_ENV: 'development' } }`.
A shim (vs defining two specific vars) covers **every** `process.env.*` Tamagui reads across all 10 primitives.

## Verification (real browser — Playwright + Brave, headless)

- **pageerrors: NONE** (crash gone).
- Story renders in **~1.5–1.7s** (was: never).
- `<html>` class switches `t_light ↔ t_dark`; `--colorSurfacePrimary` resolves `#FFFFFF ↔ #0F172A`.
- Smoke card surface paints **white (light) / navy `rgb(15,23,42)` (dark)** and switches with the toolbar —
  the DS-4 theme mechanism confirmed working through Storybook's iframe (the `[C8]` watch-point passes).

## Follow-up

If UI-1's real primitives surface more untamed-Tamagui gaps (react-native aliases, further defines), revisit
adopting `@tamagui/vite-plugin` for the Storybook Vite config as a one-shot replacement for these manual shims.
