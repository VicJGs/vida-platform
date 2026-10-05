---
Session 2 — 2026-10-03
Goal: fe-codec-theme ② CODEC · ThemeProvider — S3 (provider + resolution + density + app rewire) → ① complete
Profile: Add Frontend Component · Scenario: default (Entity Delivery Flow ②)
---

## Accomplished
- **S3 (`0141fed`)** — `theme-resolution.ts` (pure `resolveTheme` + types + defaults + density tables) + `provider.tsx` (widened `UIProvider({selection})`) + `index.ts` barrel + `App.tsx` rewire. Full §XXVI double-gate (2 approvals) + preflight spike + Tamagui-docs grounding + independent code-review (3 folded).
- **Accent fix (`f247075`, STRUCTURAL §XXVIII)** — the 21 preset-sensitive component-sub-theme-key usages across 10 primitives → DIRECT semantic tokens; per-preset component sub-themes retired (themes 66→26).
- **Blocking Visual Gate** (Storybook codec harness + Playwright/Brave, 12 cells) GREEN: neutrals/surfaces/text · fonts per preset · spacing+type density · per-preset accent (reader oxblood, quietDesk olive) · runtime switch · reduced-motion · full-matrix AA contrast. The gate caught 3 integration bugs tsc + 342 unit tests passed over.
- @vida/ui 342 · apps/web 180 · tsc 0 · lint clean. **PR #74 merged** (`629be16`); ① complete, nothing deferred. LIF-213 → Done.

## Decisions Made
- Preset sub-theme application: scheme on `<html>`, preset on `<body>` (Tamagui sub-theme CSS is nested; `<body>` reaches portals).
- Density = one injected attr-toggled stylesheet (A-prime) — font-size vars are literal-redeclared by `.font_<key>`, shadowing an `<html>` override.
- Components consume DIRECT semantic tokens for preset color (component sub-themes bake to the scheme base; Tamagui bakes theme values at config time → no inheriting var theme values). DS-5 relaxation documented.
- (Full detail: `.claude/docs/decisions.md` rows + the `## fe-codec-theme` section; currency B-codec-1…6; bug-unit `docs/specs/fixes/preset-accent-component-subthemes/`.)

## Open Questions
- none — §8 acceptance fully met; the DS-5 relaxation (component→semantic mapping at the styled layer) is documented and intentional.

## Next Session
First step: next `#`-order frontend surface in the M1.2.* track (the codec was the foundation the other `fe-*` surfaces inherit) — run `/begin` to compute + surface the head.
Context to reload: `docs/ui/token-pipeline/current-*` (B-codec-1…6), `packages/ui/src/{theme-resolution,provider}.tsx`, the next surface's aspect/delivery docs.
