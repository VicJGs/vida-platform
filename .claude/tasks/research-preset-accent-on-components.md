# Task: research-preset-accent-on-components
# Status: RESOLVED (2026-10-03) — Option A implemented on fe-codec-theme (PR #74); see docs/specs/fixes/preset-accent-component-subthemes/_index.md
# Linear: LIF-227
# Profile: Add Frontend Component (or Design System — token/contract decision)
# Source: fe-codec-theme S3 Visual Gate — the one gap left when S3 shipped

## Problem (one line)
The preset ACCENT does not reach components that own a Tamagui sub-theme (Button/Input/Checkbox/Select/Menu/Tabs/
Dialog/Popover/Toast/Card): they render the **editorial** accent in every preset. Neutrals/surfaces/text/fonts/density
all swap correctly — only the accent-on-component-sub-themes is baked.

## Root cause (established, grounded)
- Components render accent via a **component sub-theme key** (`light_Button.backgroundPrimary → light.colorBrandEmphasis`)
  that chains to the scheme BASE (`light`), not the active preset (`light_reader`). [FACT: themes.ts; packages/ui/src/CLAUDE.md]
- Tamagui **bakes theme values at config-build time** → the attempted emitter fix (emit the key as `var(--colorBrandEmphasis)`
  so it inherits) does NOT work: Tamagui bakes the var-string to the base value (`#1D4ED8`). [FACT: fe-codec S3 Visual-Gate probe]
- The semantic accent var `--colorBrandEmphasis` **DOES inherit the active preset correctly to component scope** (`#9A2A2A`
  reader at the button) via the S3 `body.t_<preset>` nesting. [FACT: fe-codec S3 probe]
- Per-preset component sub-themes (`light_reader_Button`) exist but don't resolve: Tamagui names them combined
  (`t_reader_Button`), while the application produces separate `t_reader`+`t_Button` classes. [FACT: fe-codec S3 probe]

## Candidate resolutions (to gate)
- **A — components consume `$colorBrand*`/`$colorFocusRing` DIRECTLY** for accent (proven to inherit the preset) instead of
  their baked component-sub-theme accent keys. Reaches into shipped UI-1 components + the DS-5 component-token contract
  (~10 components' accent-derived keys: backgroundPrimary/textGhost/focus/checked/indicator/accent). Lead candidate.
- **B — nested-Theme application** so `light_reader_Button` resolves (scheme > preset > component). Needs Tamagui to
  generate+match the 3-level nested selector AND survive body-portals. Higher risk/uncertainty.
- **C — Tamagui theme-builder / templates** — investigate whether Tamagui's theme-builder can express an inheriting
  cross-key reference our hand-authored themes.ts cannot.

## Scope note
This is a DS-5/UI-1 contract question (how components consume the accent), NOT codec-provider scope — which is why S3
shipped without it. The codec mechanism (provider + resolution + density + font + nested theme application) is complete.

## Pickup
Read `docs/ui/token-pipeline/current-business-rules.md` B-codec-3/4/5 + the ⚠ RESEARCH note; `packages/ui/src/provider.tsx`;
`packages/ui/src/themes/build-tokens.mjs` (refBase, line ~244); `packages/ui/src/components/button.tsx` (accent consumption).
