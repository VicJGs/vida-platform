# Task: ui-1-vida-ui-primitives
# Status: in-progress
# Linear: LIF-86
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Source: docs/roadmap.md → Phase 1.0 ③ Design System · reconstructed-structure.md #27
# Profile: Design System
# Scenario: Default (design-system/scenarios/default.md)

## Goal
Build the 10 Vida UI primitives in `@vida/ui` against the DS-5 contracts
(`docs/specs/components/ds-5-primitive-contracts/`): Button, Input, Checkbox, Select,
Card, Tabs, Menu, Dialog, Popover, Toast. Each primitive implements its authored API +
the applicable 8 visual states, registers its `light_/dark_<Comp>` sub-theme in
`tamagui.config.ts`, and passes the component **Visual Gate** (deferred here by DS-5 per
the frontend-visual-gate render table). Gated **per component** (§XXVI double-gate each).

## Dependencies
- blocked by `ds-5-primitive-contracts` (contracts + component.json tokens — DONE, merged PR #7)

## Scope fences
- IN: the 10 primitive `.tsx` in `packages/ui/src/components`, their stories (8 states ×
  light｜dark), the 9 `light_/dark_<Comp>` sub-theme registrations in `tamagui.config.ts`,
  standing up the component render harness (Visual Gate mechanism).
- OUT: platform views calendar/gallery/list/graph/timeline (UI-2 #28); the editor (UI-3 #29);
  new token VALUES (DS-2) or new component TOKENS (DS-5 — already firmed); app shell/routes (UX-3).

## Build order (atomic → molecular → overlay) — per DS-5 §3
0. Component render harness (Visual Gate mechanism) standup — prerequisite
1. Button  2. Input  3. Checkbox        (atomic)
4. Select  5. Card   6. Tabs   7. Menu   (molecular)
8. Dialog  9. Popover  10. Toast         (overlay/organism — each cites its zIndex token)

## Build Steps  (each U1–U10 = one §XXVI double-gate + component Visual Gate)
- [x] U0 — Storybook standup (`pnpm storybook`) — DONE 2026-08-06. SB 9.1.20 + react-vite +
      addon-a11y; UIProvider decorator + light｜dark toolbar; tsconfig.storybook.json (new files
      type-checked); process-shim (untamed-Tamagui `process is not defined` triage, ISOLATED).
      Verified real-browser: renders ~1.5s, card white↔navy on toggle, 0 pageerrors, 31/31, both
      typechecks green, build-storybook OK. Victor confirmed fast + toggle. Fix doc: docs/specs/fixes/ui-1-storybook-slow-load/.
- [x] U1 — Button — DONE 2026-08-06. `button.tsx` + `button.stories.tsx` + `button.test.tsx` (6 jsdom) +
      `hooks/use-reduced-motion.ts` + `internal/interaction-styles.ts` + `env.d.ts`. /verify → plan critique
      (REVISE: tag→render, group) → post-impl critique (REVISE: B1 a11y, token bypass, tests). **Visual Gate
      caught 2 layout bugs** the code-checks missed: `group`→`container-type:inline-size` collapsed width
      (→ CSS descendant-hover, [[tamagui-group-breaks-content-width]]); `aria-disabled`→disabledStyle dimmed
      loading (→ manual dim). Real-browser verified: hugs content, hover overlay, loading solid+spinner,
      disabled muted, both themes. typecheck 2/2 · 37/37 tests. **Visual Gate PASS.**
- [x] U2 — Input — DONE 2026-08-07. `input.tsx` (frame + inner `render:'input'`, leading/trailing slots, forwardRef→
      HTMLInputElement) + `input.stories.tsx` + `input.test.tsx` (14 jsdom) + `internal/input-styles.ts`; registered
      `light_/dark_Input` in `tamagui.config.ts`. /verify → Tamagui v2 docs grounding (context7): `render:'input'`,
      web-standard event model, sub-theme-by-name. plan critique (REVISE: injected-color-var Blocker, spike, spinner,
      fake-decision) → post-impl critique (SHIP, empirically verified precedence+placeholder). **Two doc-unsettled
      items measured in-browser:** core `render:'input'` forwards controlled props+ref (PASS → no @tamagui/input dep);
      `placeholderTextColor` NOT consumed on core → fixed via injected `::placeholder{color:var(--placeholder)}` (real
      switching theme var). **Focus reconcile (Victor):** deliver `:focus-visible` AS DOCUMENTED (input.md:37,55 + §VIII)
      — replaced a `:focus-within` draft with `.vida-input-frame:has(input:focus-visible)`; probe-verified vars resolve
      on the inherited `.t_Input` scope, error precedence via `:not(.vida-input-invalid)` guard. typecheck 2/2 · @vida/ui
      51/51 · root 10/10 · build + build-storybook ✓. **Visual Gate PASS.**
- [x] U3 — Checkbox — DONE 2026-08-07. `checkbox.tsx` (real <label> via render:'label' → box + opacity:0 native
      <input type=checkbox>; CSS-driven state off `:checked`/`:indeterminate`/`:focus-visible` via `:has`;
      `.indeterminate` DOM property set in a layout effect w/ callback-merged ref; explicit `aria-checked="mixed"`) +
      `checkbox.stories.tsx` + `checkbox.test.tsx` (17 jsdom) + `internal/checkbox-styles.ts`; registered
      `light_/dark_Checkbox`; `.storybook/preview.tsx` paints the theme canvas. §XXVI double-gate: plan critique
      (REVISE→3 blockers: §VII union, merged-ref, <label> host) → Victor grounding challenge → RECONCILED to the
      **flat contract API** (union was my discretion; contract is authoritative) + defects flagged. typecheck 2/2 ·
      @vida/ui 68/68 · **Visual Gate PASS** (Victor confirmed). Spec: ui-1-vida-ui-primitives/u3-checkbox.md.
      **Decisions/lessons (carry to U4–U10):**
      - **Prop-driven state (e.g. `invalid` danger border) → Tamagui `variant`, NOT injected CSS** — injected rules
        lose the specificity race vs Tamagui's own atomic border classes. [[injected-css-loses-to-tamagui-variants]]
      - **Deliver the contract's authored API verbatim; don't rewrite it for a standard** — flag the contract-vs-§VII
        inconsistency as a DS defect (DEF-U3-a), don't silently union it. [[deliverable-is-the-doc-not-my-discretion]]
      - Native `<input type=checkbox>` + CSS pseudo-classes = the whole state machine, zero re-render on toggle;
        only `.indeterminate` (a DOM property) needs React (layout effect + merged ref).
      - Visual Gate caught a missing className (rules no-op'd) + the injected-border loss + a dark-canvas harness gap
        that typecheck + 68 jsdom tests all passed clean over. [[measure-browser-bugs-dont-hypothesize]]
      - Defects for DS: DEF-U3-a (§VII union vs flat contract), DEF-U3-b (no checkbox box-size token → dp 16/20/24);
        observation: `radius.control` reads round on a 16px box (DS-2 value review, provisional palette).
- [x] U4 — Select — DONE 2026-08-08. `select.tsx` (first molecular + first FLOATING primitive: `<button role=combobox>`
      trigger + listbox panel PORTALLED to `document.body` via react-dom `createPortal`, `zIndex.dropdown`, re-wrapped in
      `<Theme name="Select">` so the sub-theme crosses the portal) + `select.stories.tsx` + `select.test.tsx` (24 jsdom) +
      `internal/select-styles.ts`; registered `light_/dark_Select`. WAI-ARIA 1.2 select-only combobox — focus stays on
      the trigger, highlight via `aria-activedescendant` (close returns focus for free), full keyboard + type-ahead
      (closed=commit-in-place), no-wrap, hand-rolled fixed positioning (flip-up + h-clamp, close-on-capture-scroll).
      §XXVI double-gate: independent critique REVISE→**12 findings all fixed** (ARIA-1.2 pattern, `useId` ids, closed
      type-ahead, portal-theme wrapper, capture-scroll, scrollIntoView…) → Approval 1; preflight PASSED + gate-2 SHIP →
      Approval 2. **Visual Gate caught 2 bugs** typecheck+92-tests were blind to: (1) flip mixed top+bottom (Tamagui
      doesn't clear stale inline `top`) → single-`top` positioning; (2) **text clipped to a 1.5px line box** — root =
      `createFont` fed lineHeight RATIOS as px (latent on ALL primitives); fixed ratio→px at the Tamagui boundary
      (`tamagui.config.ts`, **DEF-U4-e**), Button/Checkbox re-verified unregressed. typecheck 2/2 · @vida/ui **92/92** ·
      build + build-storybook ✓ · root 10/10. **Visual Gate PASS** (Victor confirmed, both themes). Spec:
      `ui-1-vida-ui-primitives/u4-select.md`. **Lessons:** [[tamagui-createfont-lineheight-ratio-is-px]];
      [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]] (hand-build-on-core vs kit was a drift).
- [x] U5 — Card — DONE 2026-08-08. `card.tsx` (static container; a `<div>` — `role="group"` | `role="button"` +
      hand-rolled Enter-keydown/Space-keyup when `interactive`; NEVER a native `<button>`, which can't legally contain
      the focusable `actions`/`footer`) + `card.stories.tsx` + `card.test.tsx` (16 jsdom) + `internal/card-styles.ts`;
      registered `light_/dark_Card`. **Slot composition** (header `<header>` + actions top-right · body · footer
      `<footer>` via `render:'<tag>'`) + **elevation = opacity of a raised-shadow overlay (B12)**; the resting shadow
      **self-cancels in dark** (its colour = the dark surface) so the border carries dark elevation (design §V) — no
      theme detection, no hook. §XXVI double-gate: independent plan critique **REVISE (2 blockers + 4 material)** — B1
      `var(--shadow-*)` never resolves (shadow was AUX/CSS-only/unwired) → added typed **`shadow.ts`** (`vida/shadow`
      format, the `motion.ts` precedent, DEF-U5-e); B2 `onPress`-on-div → native `onClick` (Select precedent); M1/M2
      dark elevation dissolved via the self-cancel; M3 disabled drops the interactive class; M4 Space keyup/`e.repeat`
      → all fixed → Approval 1; preflight PASSED (folded in the §XXIX currency-doc gap) + gate-2 SHIP → Approval 2.
      **§XXVIII deviation at impl:** contract authors **no `loading` prop** → shipped verbatim, loading/empty are
      consumer-composed (skeleton/empty-state as `children`), **DEF-U5-f**. typecheck 2/2 · @vida/ui **113/113** ·
      tokens:build ✓ · build + build-storybook ✓ · root 10/10. **Visual Gate PASS** (Victor, both themes — dark
      elevation reads via border). Spec: `ui-1-vida-ui-primitives/u5-card.md`. **Lessons (carry to U6–U10):**
      - **Ground [FACT:] tags in token VALUES / emitted output, not names** — `--shadow-*` *looked* like the runtime
        `--placeholder` but was only in an unwired `variables.css`. An independent critic greps; a self-review trusts
        its own tag. [[independent-critique-catches-overclaims]]
      - **A state matrix can outrun the API** — §VIII demanded `loading`, the contract's `CardProps` had no prop for
        it. Deliver the API verbatim, render the state by composition (like `empty`), flag the gap for DS (DEF-U5-f).
        [[deliverable-is-the-doc-not-my-discretion]]
      - **Dark elevation for free:** a shadow whose colour IS the dark surface renders nothing on dark → the border
        carries it (design §V). The best fix to a fragile theme-class guess was deleting the mechanism.
      - **AUX namespace → typed export on first TS consumer** (`shadow.ts` mirrors `motion.ts`); pipeline stays the
        single source, no literals duplicated in the component.
- [ ] U6 — Tabs
- [ ] U7 — Menu
- [ ] U8 — Dialog
- [ ] U9 — Popover
- [ ] U10 — Toast
- [ ] UF — final consolidated gate sweep + version/changelog + §XXIX currency + PR

## Open questions
- OQ-1 [RESOLVED via docs, 2026-08-06]: Visual Gate render mechanism = **Storybook**
  (`pnpm storybook`). The frontend-visual-gate.md render table (:44) names Storybook as the
  Components-row mechanism and states it "stands up at DS-5/UI-1"; the DS-5 spec calls it the
  "Components/Storybook row" (_index.md:3,:39). Not a live fork — the "(or a preview page)"
  parenthetical is a fallback, superseded by the named artifact + `pnpm storybook` command.
  U0 stands up Storybook on Tamagui + React 19 (`packages/ui` gets its first bundler config).
