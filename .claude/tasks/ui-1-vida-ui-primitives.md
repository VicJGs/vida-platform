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
- [x] U6 — Tabs — DONE 2026-08-08. `tabs.tsx` (+ compound `Tabs.Panel`) + `tabs.stories.tsx` + `tabs.test.tsx`
      (**23 jsdom**) + `internal/tabs-styles.ts`; registered `light_/dark_Tabs` in `tamagui.config.ts`; barrel
      (`Tabs`/`TabsPanel`/`TabsProps`/`TabsPanelProps`). **No pipeline touch** (sub-theme already generated by DS-5).
      The B12 showcase: `role="tablist"` of `render:'button'` tabs (roving tabindex, AUTOMATIC activation, arrows WRAP
      + skip disabled, Home/End) + an indicator whose **transform** animates (250/inOut) while **width/height resize
      is an INSTANT swap** (measured via active-tab `offsetLeft/Width` vs the `position:relative` tablist; re-measure
      on current/orientation/items/size + `ResizeObserver` + `fonts.ready`, jsdom-guarded; `ready` flag suppresses the
      first-mount slide). Panels = `<Tabs.Panel value>` children → Tabs-owned `role="tabpanel"` (DEF-U6-a); only active
      mounts (keyed → enter-fade); `aria-controls` binds only to the active tab (axe-clean id refs). §XXVI double-gate:
      **Gate 1** independent critique REVISE (2 blockers [panel tabIndex APG; disabled-selection clamp+warn D8] + 3
      material [stale-key overclaim relabel; enter-only-fade disclosure; +size dep +fonts.ready remeasure] + 4 minor)
      → all fixed → Approval 1; preflight PASSED + gate-2 SHIP → Approval 2. **Visual Gate PASS** (measured in real
      Brave — the slide+resize is unverifiable in jsdom): indicator under the active tab, `translateX(0)→translateX(118px)`
      + width 118→83, `transition: transform 0.25s inOut` ONLY (B12); auto-activation panel swap; muted vs active label
      colours distinct; disabled muted+0.5+skipped; vertical `translateY` left-edge bar; both themes. typecheck 2/2 ·
      @vida/ui **136/136** · build + build-storybook ✓ · root 10/10. Lessons: [[injected-css-loses-to-tamagui-variants]]
      (hover strengthen as injected `:hover` descendant, beats atomic class); the measure-in-browser gate is the ONLY
      evidence for transform-driven geometry ([[measure-browser-bugs-dont-hypothesize]]). Spec: `ui-1-vida-ui-primitives/u6-tabs.md`.
- [x] U7 — Menu — DONE 2026-08-08. `menu.tsx` (+ `MenuItem`/`MenuProps`) + `menu.stories.tsx` + `menu.test.tsx`
      (**24 jsdom**) + `internal/menu-styles.ts`; registered `light_/dark_Menu` in `tamagui.config.ts`; barrel
      (`Menu`/`MenuProps`/`MenuItem`). Second FLOATING primitive (reuses U4 Select's portal + single-`top` positioning +
      dismiss handlers) but the WAI-ARIA **menu-button** model — trigger role=button+aria-haspopup=menu+aria-expanded;
      `role="menu"` panel portalled to body under `<Theme name="Menu">`; items `role="menuitem"` with **ROVING DOM
      FOCUS** (only the active item tabIndex=0, real `.focus()`; NOT Select's `aria-activedescendant`), Esc returns
      focus to the trigger. `trigger` is a consumer SLOT wired via **`cloneElement`** (aria + composed handlers + merged
      ref — React 19 `props.ref`). 4 placements (start/end + flip), type-ahead (string labels), wrapping arrow nav.
      Danger = an `intent` variant on the **label** `<Text>` (not the row). Empty = a disabled "No actions" menuitem.
      §XXVI double-gate: **Gate 1** independent critique REVISE (1 blocker [danger colour on the wrong element] + 4
      material [`:focus-visible` highlight racy → `active`-state variant; click-open didn't seed activeIndex; empty-row
      aria-hidden axe risk; row layout omitted] + 3 minor) → all fixed (Rev 3) → Approval 1; preflight PASSED (1 fold:
      trigger Enter/Space `preventDefault` vs native double-fire) + gate-2 SHIP → Approval 2. **Visual Gate PASS**
      (measured in real Brave, both themes): B12 transform+opacity-only transition; danger red + distinct; roving
      highlight on the active item; disabled skipped; Esc→trigger; bottom-end right-aligns; top-start opens up + flips;
      empty row. typecheck 2/2 · @vida/ui **160/160** · build + build-storybook ✓ · root 10/10. **No pipeline touch.**
      Spec: `ui-1-vida-ui-primitives/u7-menu.md` (§18). **Impl bug jsdom caught:** portal open commits TWICE (pos null
      first) → focus/refine layout effects must dep on `pos`/`entered` or the first `.focus()` no-ops
      ([[portal-open-focus-needs-a-mount-gated-effect-dep]] — carries to U8/U9). DEF-U7-a (danger token), DEF-U7-d
      (accessible-name source) flagged for DS.
- [x] U8 — Dialog — DONE 2026-08-08. `dialog.tsx` (+ `DialogProps`) + `dialog.stories.tsx` + `dialog.test.tsx`
      (**25 jsdom**) + `internal/dialog-styles.ts`; registered `light_/dark_Dialog` in `tamagui.config.ts`; barrel.
      First MODAL/overlay primitive: scrim + centered panel PORTALLED to a dedicated `<div data-vida-dialog-root>` under
      `<Theme name="Dialog">`; fully controlled (no trigger slot). Focus **TRAP** (Tab/Shift+Tab cycle within; explicit
      0/1/panel/boundary algo) + background `inert`/`aria-hidden` (excluded by node identity — `<Theme>` is a
      `display:contents` span) + focus **return** to captured `document.activeElement` (guarded). Esc/backdrop close when
      `dismissible` (default); both inert when false (destructive-confirm, DEF-U8-f + dev-warn). Motion = mount-triggered
      CSS **keyframe** with a VISIBLE resting base (fails safe visible, not the Menu `.is-open` transition). Portal root =
      lazy `useState` init → panel in the first commit (avoids the two-commit focus trap). §XXVI double-gate: Gate-1
      independent critique REVISE (2 blockers [inert-hits-own-`<Theme>`-span; rAF reveal → permanent-invisible risk] + 4
      material + 3 minor) → all fixed → Approval 1; Gate-2 /preflight PASSED + 2nd critique REVISE (portal-root lazy-init
      contradiction; 2 test-plan corrections) → fixed → Approval 2. **Visual Gate PASS in real Brave (Victor, both
      themes)** — panel 12px/centered, scrim 0.5, focus-first, trap (5 tabs held), inert bg, Esc/backdrop, non-dismissible
      ignores both, long-content scrolls w/ pinned header+footer, B12 clean (0 violations). **The gate caught 2 bugs
      typecheck+185-tests+6 prior reviews missed:** (1) **DS-WIDE square corners** — `borderRadius:'$radius'` (sub-theme
      key) is inert for dimension props on ALL 8 primitives → 0px; root-fixed to the token scale (`$md` control / `$lg`
      card), DEF-U8-h; (2) Dialog **body collapse** — `flex={1}` (grow:1/basis:0%)+minHeight:0 shrank the body to 0px and
      clipped children → `flexShrink:1`/minHeight:0. typecheck 2/2 · @vida/ui **185/185** · build + build-storybook ✓ ·
      root 10/10. Spec: `ui-1-vida-ui-primitives/u8-dialog.md`. DEFs flagged: U8-a…h. Lesson:
      [[injected-css-loses-to-tamagui-variants]] family — Tamagui reads the theme for COLOR props only; dimension props
      (radius/space) must reference the token scale ([[portal-open-focus-needs-a-mount-gated-effect-dep]] did NOT bite —
      lazy-init keeps Dialog single-commit).
- [x] U9 — Popover — DONE 2026-08-09. `popover.tsx` (+ `PopoverProps`) + `popover.stories.tsx` + `popover.test.tsx`
      (**18 jsdom**) + `internal/popover-styles.ts`; registered `light_/dark_Popover` in `tamagui.config.ts`; barrel.
      2nd overlay — a NON-modal `role="dialog"` anchored surface (no scrim/trap/`inert`; app stays interactive). A
      HYBRID: Menu's floating machinery (trigger `cloneElement` aria-haspopup="dialog", portal under `<Theme
      name="Popover">`, fixed seed→refine→reveal, outside/scroll/resize dismiss) + Dialog's `getFocusable` focus-into
      (NOT trapped). Trigger opens on **onClick only** (dialog opener, not menu → no arrow-open, sidesteps U7
      double-fire). **Non-modal close:** React `onBlur` closes only when `relatedTarget` is a real focusable outside
      panel+trigger (Tab-away); ignores internal moves + null relatedTarget (survive window-blur) + the trigger
      (Esc-return carve-out). Esc closes + returns focus. **8 placements via AXIS-SPLIT** (top/bottom vertical primary,
      left/right horizontal primary — Menu's refine was vertical-only; single side property per axis + `offset`). **Arrow
      toward anchor** (rotated-45° square, `borderWidth:0` floor + 2 outer edges 1px, bg blends; instant swap on flip).
      §XXVI double-gate: Gate-1 critique REVISE (3 blockers [left/right positioning hand-waved; focusout relatedTarget
      gating; Esc/focusout race] + 4 material) → fixed → Approval 1; Gate-2 /preflight PASSED (3 folds: onClick-only
      open, onBlur mechanism, jsdom-defers-geometry) + 2nd critique **SHIP** → Approval 2. **Visual Gate PASS in real
      Brave (Victor confirmed, both themes)** — measured: role=dialog/no-aria-modal, z=1200, radius=12px, B12
      transition=[opacity,transform]@0.15s, theme-crossing bg, focus-into=input, all 8 placements+flip, arrow direction
      per side, reduced-motion=none. **The gate caught 2 arrow bugs typecheck+203-tests+2 critiques missed:** missing
      `rotate(45deg)` (axis-aligned square) + `border-style:solid` w/ no width → `border-width:medium`≈3px bleed on unset
      edges (→ `borderWidth:0` floor). typecheck 2/2 · @vida/ui **203/203** · build + build-storybook ✓ · root 10/10.
      **§XXVIII deviation (mechanical):** spec said "no tamagui.config.ts change" — wrong, the sub-theme needs
      registering in `createTamagui` for the `ThemeName` type; corrected in code + spec. DEFs U9-a…e flagged for DS.
      Spec: `ui-1-vida-ui-primitives/u9-popover.md`. Lessons: [[measure-browser-bugs-dont-hypothesize]] (gate caught 2
      pure-visual bugs); [[deliverable-is-the-doc-not-my-discretion]] (arrow: contract-specified → build it, don't
      escalate a fork — Victor corrected a manufactured "implement or defer?" AskUserQuestion).
- [x] U10 — Toast — DONE 2026-08-09. `toast.tsx` (`ToastProvider` + internal `ToastItem`) + `internal/toast-store.ts`
      (external store + `toast` singleton) + `internal/toast-styles.ts` + `toast.stories.tsx` + `toast.test.tsx`
      (**16 jsdom**, `vi.useFakeTimers`); registered `light_/dark_Toast` in `tamagui.config.ts`; barrel (`toast`/
      `ToastProvider`/`ToastProviderProps`/`ToastIntent`/`ToastOptions`/`ToastHandle`). The 3rd/last overlay + the
      **ONLY imperative primitive**: `toast(options)→id` callable from OUTSIDE React, bridged to the mounted
      `ToastProvider` via a module-level **external store** + React 19 `useSyncExternalStore` (the sonner/react-hot-toast
      reducer model, zero-dep). Two persistently-mounted live regions (status/polite · alert/assertive — both present
      when empty so an inserted toast announces). **Focus never moved on appear**; F6 → globally-newest; **Esc item-local**
      (`stopPropagation`, no overlay leak). Cap **store-enforced, per-region, evict-oldest** (not a render slice → the
      evicted toast plays its exit). `dismissToast` idempotent → `onDismiss` once. **Timer effect deps `[id,duration]`
      ONLY** (a store emit re-renders all items; `record`-dep would re-arm + never dismiss); pause-on-hover/focus via refs.
      §XXVI double-gate: **Gate 1** critique REVISE (2 blockers [queued-timer; Esc/F6 document-leak] + 7 material + 4 minor)
      → fixed → Approval 1; **/preflight PASSED + 6 folds** (single-provider, action-no-dismiss, F6 target, geometry,
      harness, atomic); **Gate 2** critique REVISE — confirmed all gate-1/preflight fixes landed + caught **2 NEW gaps the
      edits opened** (timer effect deps under store-emit re-render; `.slice(-limit)` vs exit-animation contradiction) →
      resolved by moving the cap to the STORE (evict-oldest), which also dissolved the "queued" state → Approval 2.
      **Visual Gate PASS measured in real Brave** (Victor, both themes): radius 12px (DEF-U8-h avoided), theme crosses the
      portal, accents distinct per intent (info/success/danger), zIndex 1400, regions correct, enter `vida-toast-in` /
      reduced-motion none, B12 clean (opacity/transform only), top/bottom placement, dismiss = real button. typecheck 2/2 ·
      @vida/ui **219/219** (+16) · build + build-storybook ✓ · root 10/10. DEFs U10-a…f flagged for DS. Spec:
      `ui-1-vida-ui-primitives/u10-toast.md`. Lessons: **an external store re-renders ALL subscribers on every emit** — a
      per-item timer/effect must dep only on stable per-item keys, not the record; **enforce a visible cap in the store
      (evict), not a render slice** (a slice kills exit animations). [[measure-browser-bugs-dont-hypothesize]] (gate
      re-targeted the measurement from panel→title to avoid a false dark-mode-text bug).
- [x] UF — DONE 2026-08-09. **Consolidated 4-gate sweep** (design·components·motion·engineering — 4 independent
      adversarial audits across all 10 primitives): **all PASS**. Design: zero hardcoded colors, radius/spacing
      consistent, dark mode a true parallel Theme. Components: all 10 deliver their contract API, props+types
      exported (barrel complete), forwardRef on every interactive one, 8-state matrix covered/justified. Motion:
      only transform/opacity animated, every animation has a reduced-motion path, all timing from `motion.ts`.
      Engineering: focus/ARIA/listener-hygiene correct, shared helpers byte-identical + 1 Material (repo-wide
      tsconfig, deferred) + 4 Minor (`!` comments). **In-scope fixes applied:** §XV justification comments on the 4
      provably-safe non-null `!` (select · dialog×2 · toast-store); named `ToastAction` export (API consistency).
      **Version:** @vida/ui 0.0.0→**0.1.0** (`UI_VERSION` + package.json) + `packages/ui/CHANGELOG.md`. **DEF register:**
      `docs/specs/components/ui-1-vida-ui-primitives/DEF-register.md` (DEF-U3-a…U10-f + UF-1 → DS-5 owner). **Follow-up
      filed:** `tsconfig-strict-index-access` (repo-wide `noUncheckedIndexedAccess`/`noImplicitReturns` §XV gap —
      cascade-risk, its own gate, NOT folded in). typecheck 2/2 · @vida/ui **219/219** · build + build-storybook ✓ ·
      root 10/10. Commits `0fcfb6b` (U10) + `4fa6fe5` (UF) on branch `ui-1-vida-ui-primitives`; **PR #8 ready to
      merge** (direct merge-to-main denied by the safety classifier — Victor merges). Post-merge: `/task-complete` +
      `--sync` (LIF-86→Done).

## Open questions
- OQ-1 [RESOLVED via docs, 2026-08-06]: Visual Gate render mechanism = **Storybook**
  (`pnpm storybook`). The frontend-visual-gate.md render table (:44) names Storybook as the
  Components-row mechanism and states it "stands up at DS-5/UI-1"; the DS-5 spec calls it the
  "Components/Storybook row" (_index.md:3,:39). Not a live fork — the "(or a preview page)"
  parenthetical is a fallback, superseded by the named artifact + `pnpm storybook` command.
  U0 stands up Storybook on Tamagui + React 19 (`packages/ui` gets its first bundler config).
