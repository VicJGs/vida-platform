# Fix / Bug-unit: preset values don't reach component sub-themes

# Status: RESOLVED (2026-10-03) — Option A implemented on branch fe-codec-theme · Visual-Gate-verified
# Found: fe-codec-theme S3 Visual Gate (2026-10-03) · @tamagui/core 2.6.2
# Classification: STRUCTURAL

## RESOLUTION (Option A, full scope — Victor-approved)
Implemented: the 21 preset-sensitive component-sub-theme-key usages (accent + neutral) across the 10 primitives now
consume DIRECT semantic tokens (which inherit the active preset at component scope — a component sub-theme emits only its
own keys, so `--colorBrand*`/`--colorSurface*`/… still cascade from the `<body>` preset class). Signal keys
(`$accentSuccess`/`$accentDanger`/`$borderError`) stay on the base `light_/dark_<Comp>` sub-themes (preset-invariant). The
emitter now generates component sub-themes for the editorial base schemes only (`['light','dark']`); the 40 per-preset
`<mode>_<preset>_<Comp>` are retired. Themes 66 → 26. **Visual-Gate PASS:** Primary button + ghost/indicator/checked/
focus/info + all neutrals swap per preset (reader oxblood `rgb(154,42,42)` · quietDesk olive `rgb(76,88,50)`, distinct)
across all 12 cells; @vida/ui 342 · apps/web 180 · tsc 0. Currency: `current-business-rules.md` B-codec-6. Shipped in
PR #74 (fe-codec-theme ①).

## Symptom (apparent)
Under a non-editorial preset (reader/quietDesk), components that own a Tamagui sub-theme render the **editorial**
accent — e.g. Primary `Button` is editorial blue `#1D4ED8` in every preset, not reader oxblood / quietDesk olive.

## Root cause (not the symptom)
**The error is caused by the component-token → component-sub-theme indirection BAKING every component-sub-theme value to
the SCHEME-base theme at Tamagui config-build time — NOT by the preset theme failing to apply.** The preset's *semantic*
theme vars DO inherit to component scope (measured: `--colorBrandEmphasis` = `#9A2A2A` reader at the button, via the S3
`body.t_<preset>` nesting). Only the component-sub-theme KEYS are frozen to editorial:

- `themes.ts`: `light_Button = { backgroundPrimary: light.colorBrandEmphasis, backgroundSecondary: light.colorSurfaceSecondary, textGhost: light.colorBrandPrimary, … }` — EVERY key resolves to `light.*` (the editorial base), accent AND neutral. [FACT: themes.ts]
- Component sub-themes chain to the SCHEME base (`light`/`dark`), never the active preset (`light_reader`). The per-preset
  variants (`light_reader_Button`) ARE emitted but never resolve: Tamagui names them combined (`t_reader_Button`) while the
  app produces separate classes (`t_reader` on `<body>` + `t_Button` on the component). [FACT: S3 Visual-Gate probe]
- Tamagui **bakes theme values at config-build time** → emitting `backgroundPrimary: "var(--colorBrandEmphasis)"` to force
  inheritance does NOT work; Tamagui bakes the var-string back to `#1D4ED8`. [FACT: S3 probe, reverted]

## Blast radius (if unfixed)
- **21** component-sub-theme-key usages across the primitives render EDITORIAL values under every preset — glaringly the
  **accent** (Button primary bg + ghost text, Checkbox checked fill, Input focus border, Tabs indicator, Toast info accent)
  and subtly the **neutrals** (secondary/surface/border/text keys baked to the editorial base). [FACT: grep — 21 baked vs 90 direct]
- The codec's core "swappable accent per preset" promise is unmet on **all interactive primitives**; the preset's identity
  (oxblood / olive) never appears on controls. Downstream `fe-*` surfaces inherit the defect.
- Unaffected: the **90** direct-`$semantic` usages (`$colorBrandPrimary` ×6, `$colorFocusRing` ×8, `$colorSurface*`, `$colorText*`) — they inherit the preset correctly (this is the proof-of-mechanism + the lead for the fix).

## Repro
Storybook codec harness (`.storybook/preview.tsx` toolbar: preset=reader) → `Codec/Visual Gate` → Primary button bg is
`rgb(29,78,216)` (editorial) not reader oxblood. Probe: `getComputedStyle(button).--colorBrandEmphasis` = `#9A2A2A` (reader,
inherits) but `--backgroundPrimary` = `#1D4ED8` (baked editorial).

## Why STRUCTURAL (not isolated)
Same root cause in MULTIPLE components × MULTIPLE keys (accent + neutral); it's a wrong-layer issue (the component-token
VALUE layer bakes at the scheme base, incompatible with per-preset theming). Fixing one key/one component leaves the rest;
the fix spans the emitter + the component.json contract + the components. Fixing the symptom (one button) exposes the next.

## Fix plan — options (confirm before implementing)

**Option A — move the component→semantic mapping from the baked THEME layer to the COMPONENT (styled) layer [RECOMMENDED].**
The 21 baked component-sub-theme-key usages switch to the DIRECT semantic tokens they ultimately point at (which inherit the
preset, proven + already the dominant pattern at 90 uses): `$backgroundPrimary`→`$colorBrandEmphasis`,
`$textGhost`→`$colorBrandPrimary`, `$backgroundChecked`→`$colorBrandEmphasis`, `$borderFocus`→`$colorFocusRing`,
`$indicator`→`$colorBrandPrimary`, `$accentInfo`→`$colorBrandPrimary`, and the neutral keys →`$colorSurface*/$colorText*/$colorBorder*`.
The component still expresses "primary = brand emphasis" — just in the styled() component, not a baked theme key. The
component sub-theme VALUE layer (and the per-preset `<mode>_<preset>_<Comp>` set, 40 themes) is retired; registration/naming
can stay only if a renderer still needs the scope.
- Pro: proven mechanism; aligns with the existing 90-use direct-semantic pattern; removes the baking entirely; emitter + theme count simplify (66 → ~6 base).
- Con: DS-5 relaxation — the component-token value indirection moves to the component (the 3-layer token mapping becomes component→semantic at the styled layer, not theme→primitive). Touches ~10 primitives + component.json + the emitter. Re-gate (the full 12-cell Visual Gate, now asserting accent + neutral per component).
- Gate: run under Design System / add-frontend-component with the §XXVI double-gate; re-run the S3 Visual Gate matrix extended to assert per-component accent + neutral.

**Option B — make component sub-themes resolve to the preset variant (`light_reader_Button`) via nested-Theme application.**
Keep the component-token layer; fix the application so Tamagui resolves the 3-level `:root.t_<mode> .t_<preset> .t_<Comp>`.
- Pro: preserves the DS-5 component-token value indirection.
- Con: HIGH risk — Tamagui emits combined-class selectors (`t_reader_Button`) that don't match our separate `t_reader`+`t_Button` classes; needs theme-registration/naming rework + must survive body-portals; may not be solvable cleanly in 2.6.2. Investigate before committing.

**Option C — Tamagui theme-builder / `templates`.** Investigate whether Tamagui's theme-builder can express an inheriting
cross-key reference our hand-authored `themes.ts` cannot. Research spike; unknown payoff.

**Recommendation: Option A.** It is the only option proven to work, it matches the codebase's dominant pattern, and it
removes the config-time baking that is the root cause. The component-token value layer was designed pre-preset; per-preset
theming makes a baked-at-scheme-base component value an anti-pattern. Confirm scope (all 10 primitives vs accent-only first)
before implementing.

## Ordered steps (Option A, on confirmation)
1. Spec/contract: amend `tokens/component.json` + DS-5 note — component accent/neutral keys resolve at the styled layer via
   semantic tokens (not a baked theme key). Record the DS-5 relaxation + rationale.
2. Emitter (`build-tokens.mjs`): stop emitting the per-preset `<mode>_<preset>_<Comp>` sub-themes; reduce/retire the
   component sub-theme VALUE layer (keep only what a renderer scope needs). Regen; update `build-tokens.test.ts` fixtures.
3. Components: replace the 21 baked `$<compKey>` usages with the direct `$colorBrand*/$colorFocusRing/$colorSurface*/…`
   semantic tokens (Button, Checkbox, Input, Tabs, Toast + audit the rest). Keep danger/signal (shared, not preset-sensitive).
4. Verify: tsc 0 · @vida/ui + apps/web tests green · the **full 12-cell Visual Gate** re-run, now asserting per-component
   accent AND neutral swap across all 3 presets × light/dark × calm/dense + full-matrix AA contrast.
5. §XXIX currency: update `docs/ui/token-pipeline/current-*` (supersede the B-codec-3 RESEARCH flag with the resolution).
