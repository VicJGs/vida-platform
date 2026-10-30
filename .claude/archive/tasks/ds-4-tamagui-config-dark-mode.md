# Task: ds-4-tamagui-config-dark-mode
# Status: done (2026-08-03)
# Profile: Design System
# Scenario: Default
# Linear: LIF-84
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System

## Goal
Assemble the Tamagui configuration from the foundation tokens and wire dark mode as a first-class
theme (not an afterthought). Produces the universal theme object `@vida/ui` primitives consume
across web (and later mobile/desktop).

## Dependencies
- blocked by `ds-2-foundations`
- blocked by `ds-3-motion-foundation`  <!-- added 2026-07-28: createTamagui() takes the animations config at config time; the motion foundation (ds-3) feeds it -->

Note: ds-3 added — the Tamagui config assembles the animation driver from the motion foundation.

## Scenario Path (§XXVII, surfaced + approved 2026-08-03)
1. Baseline + LITE spec · 2. Build config · 3. Verify · 4. Frontend Visual Gate · 5. Currency §XXIX + close. ALL DONE.

## Outcome (2026-08-03) — DONE
`packages/ui/src/tamagui.config.ts` assembles `createTamagui` from the generated DS-1→DS-3 outputs (createTokens +
2× createFont [role keys + `$true` default] + light/dark themes + createAnimations) + `provider.tsx` (`UIProvider`
+ `useVidaTheme`) + ambient `tamagui.d.ts` augmentation. **Animation driver = `@tamagui/animations-css`** per ADR-001
§9 (CSS-on-web + no-extra-dep), consuming `motion.ts` duration+easing losslessly. **First unit to COMPOSE the tokens**
(crossed DS-1's ⊥ DS-4 boundary). @vida/ui **30/30** · root typecheck **10/10** · config imports at runtime with NO
react-native-web. **Frontend Visual Gate PASS** (composed light｜dark theme surface). §XXIX: token-pipeline current-*
deferrals resolved + new `packages/ui/src/CLAUDE.md` layer-doc.
⚠ **Mid-build: RN-driver drift triaged (STRUCTURAL) + corrected** — I'd picked `@tamagui/animations-react-native`
(not in the docs for web; forced react-native-web, violating ADR-001). Diagnosis: `docs/specs/fixes/ds-4-rn-driver-drift/`.
Also this build: `@tamagui/core`+driver pinned `2.6.2` (family alignment); jsx/DOM/react added (first JSX in @vida/ui);
source-model guard scoped to `components/` (was falsely governing the bug-unit).
Spec: `docs/specs/components/ds-4-tamagui-config-dark-mode/_index.md` (implemented). Unblocks DS-5, UI-*, UX-*.
Next: DS-5 (primitive contracts) — the DS track's next head (reconstructed #20, ← DS-4).

## Baseline — Tamagui v2 API verified via context7 (2026-08-03, @tamagui/core@2.5.1)
- `createTamagui({ tokens, themes, fonts, animations, settings, media?, shorthands? })` — `@tamagui/core` exports
  `createTamagui`/`createFont`/`createTokens`/`TamaguiProvider`.
- `createFont({ family, size, lineHeight, weight, letterSpacing })` ← maps from `fonts.ts`.
- **Animation driver is SPLIT (resolves DS-3's `[UNKNOWN: driver-dependent]`):** `@tamagui/animations-css`
  (web, lightest, no spring) `createAnimations({ fast: '<easing> <duration>ms' })` — **consumes `motion.ts`
  directly**; `@tamagui/animations-react-native` (native, spring `{damping,mass,stiffness}` — NO cubic-bezier).
- Theme-switch: `TamaguiProvider defaultTheme` + `addThemeClassName: 'html'|'body'|false` (replaces deprecated
  `disableRootThemeClass`). Vite (non-Next) → theme state in Zustand (already in `@vida/web`, AR-4); no next-theme.
- `settings: { disableSSR: true }` for the Vite SPA; typed module augmentation `declare module '@tamagui/core'`.
- Inputs ready: `tokens.ts` (createTokens 5 cats) · `themes.ts` (light/dark + light_/dark_Button) · `fonts.ts` ·
  `motion.ts`. DS-4 breaks the DS-1 "⊥ DS-4 standalone-typecheck" boundary (first real createTamagui).
