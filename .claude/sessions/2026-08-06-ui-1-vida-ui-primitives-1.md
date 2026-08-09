# Session — 2026-08-06 — ui-1-vida-ui-primitives (U0 + U1)

**Task:** ui-1-vida-ui-primitives (LIF-86, M1.0 #27, Design System) — build the 10 `@vida/ui` primitives against DS-5 contracts, gated per component.
**Goal:** Start UI-1: stand up the component Visual-Gate harness (U0) + build the first primitive, Button (U1).

## Completed
- **Routing:** confirmed UI-1 is the `#`-order head; reconciled the stale `◻`→`✅` DS-5 glyph in `reconstructed-structure.md:77` (commit `5794583`).
- **U0 — Storybook standup** (commit `1e6b33f`): Storybook 9.1.20 (`@storybook/react-vite`) in `packages/ui`; `.storybook/{main,preview}.ts(x)` (UIProvider decorator + light｜dark toolbar), `vite.config.ts` (react plugin, vitest env pinned node), `tsconfig.storybook.json` (type-checks the harness/stories), `_welcome` smoke story, `.gitignore` `storybook-static/`, process-shim `preview-head.html`. `/verify` → plan critique REVISE→fixed → Approval 1 → impl → real-browser verify.
- **U0 triage — "slow load"** (`docs/specs/fixes/ui-1-storybook-slow-load/`): symptom was actually a CRASH — untamed Tamagui reads `process.env.TAMAGUI_*` → `process is not defined` blanked the story. Fixed via `preview-head.html` shim. (First triage wrongly blamed bundle size — measured with Playwright to find the real cause.)
- **U1 — Button** (commit `4f71e7e`, Visual Gate PASS): `button.tsx` + `button.stories.tsx` + `button.test.tsx` (6 jsdom) + `hooks/use-reduced-motion.ts` + `internal/interaction-styles.ts` + `env.d.ts`; barrel export. Against `ds-5-primitive-contracts/button.md`. Full gate: `/verify` (Tamagui v2) → plan critique REVISE→fixed → Approval 1 → post-impl critique REVISE→fixed → real-browser verify → Visual Gate.

## Decisions
- **Component harness = Storybook** (not a preview page) — resolved by `frontend-visual-gate.md:44` render table; I'd wrongly framed it as an open decision (Victor corrected: the docs already answer it).
- **Button hover/press overlay = CSS descendant-hover** (`internal/interaction-styles.ts`), NOT Tamagui `group`. `group` sets `container-type: inline-size` which collapses content-based width — the layout bug the Visual Gate caught.
- **Loading ≠ disabled**: loading stays focusable (`aria-busy`+`aria-disabled`, not native `disabled`); dim keyed only to the real `disabled` prop (Tamagui applies `disabledStyle` on `aria-disabled`, which was dimming loading).
- Font/space/size all tokenized (`$caption/$small/$body`, `$12/$16/$20`, `$32/$40/$48`); a component token (`$padding`) can't drive `paddingHorizontal` (Tamagui resolves space props against the space scale) — verified in-browser.

## Failures hit (all resolved)
- F-U0a: Storybook "slow load" = `process is not defined` crash (untamed Tamagui) → `preview-head.html` shim.
- F-U0b: first triage diagnosed by hypothesis (bundle size), not measurement → wasted a fix cycle. Lesson memory'd.
- F-U1a: **`group` → `container-type:inline-size` collapsed button width**, labels overflowed. → CSS descendant-hover. Memory: [[tamagui-group-breaks-content-width]].
- F-U1b: `aria-disabled` triggered Tamagui `disabledStyle` → loading button dimmed. → manual dim on `disabled` only.
- F-U1c: `$padding` component token rendered 0px for `paddingHorizontal`. → space-scale tokens.

## Verification (real browser, Playwright + system Brave)
- Button: real `<button type=button>`, sub-theme brand.600(light)/brand.300(dark), hover overlay 0→0.08, focus ring, disabled 0.5, loading opacity 1 + spinner + width held, hugs content (no overflow). typecheck 2/2 · @vida/ui 37/37.

## Next session — resume UI-1 at U2 (Input)
1. `pnpm storybook` (harness is set up); resume on branch `ui-1-vida-ui-primitives` (NOT merged — commit only).
2. **U2 — Input** against `docs/specs/components/ds-5-primitive-contracts/input.md`. Same per-component gate. Input has a REAL `error` state (unlike Button). Reuse: sub-theme (`light_/dark_Input` already in `themes.ts`), `interaction-styles.ts` pattern, `use-reduced-motion`, the jsdom test setup.
3. **Carry the U1 lessons:** never use `group` on a content-hugging primitive; the Visual Gate = look at the render (screenshot + measure box-vs-content), not just computed styles.
4. Still-open (DS-2 brand-pass, not U1/U2's): dark-mode overlay direction; filled-`danger` AA gap.
5. Remaining after U2: U3 Checkbox · U4 Select · U5 Card · U6 Tabs · U7 Menu · U8 Dialog · U9 Popover · U10 Toast · UF final gate sweep + PR.
