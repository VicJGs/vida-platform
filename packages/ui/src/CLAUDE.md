# packages/ui/src — @vida/ui source (Tamagui design system)

The shared universal component library (ADR-001: Tamagui). Composes the token pipeline into a live Tamagui config +
the theme-switch provider. Durable spec: `docs/specs/components/ds-4-tamagui-config-dark-mode/_index.md` +
`docs/ui/token-pipeline/current-*`.

## Files
- `themes/` — the token pipeline (DS-1→DS-3): Style Dictionary seed → GENERATED `tokens.ts`/`themes.ts`/`fonts.ts`/
  `motion.ts`/`variables.css`. See `themes/CLAUDE.md`. **Edit the JSON seed, never the generated files.**
- `tamagui.config.ts` — **DS-4.** `createTamagui` composing the generated outputs (B13, no hand-authored values):
  `createTokens` + two `createFont` (body/display) + light/dark themes + `createAnimations`. Exports `config` +
  `type VidaConfig`. **`createFont` needs a `$true` default** (fonts.ts keys by role, not `$1..$n` — an unstyled
  `<Text>` resolves `size.$true`). **`createFont` `lineHeight` must be ABSOLUTE px**, but `fonts.ts` stores design.md
  RATIOS (§III "1.5 leading") — passing a ratio yields `line-height:1.5px` (a 1.5px line box that clips glyphs under
  `overflow:hidden`). So `lineScale` converts `round(fontSize×lineHeight)` at this Tamagui boundary; the pipeline stays
  ratio-pure (DEF-U4-e, U4). [[tamagui-createfont-lineheight-ratio-is-px]]
- `tamagui.d.ts` — the `declare module '@tamagui/core'` augmentation (typed `$tokens`). **Ambient on purpose:** kept
  OUT of the value module so `typeof config` doesn't self-reference under `declaration:true` (TS2742/circularity).
- `provider.tsx` — **DS-4.** `<UIProvider theme>` (→ `TamaguiProvider defaultTheme`; theme STATE = app Zustand, AR-4)
  + `useVidaTheme` (a re-export alias of Tamagui `useTheme`, NOT next-theme's `useThemeSetting`).
- `index.ts` — package barrel; re-exports the generated token data + `config`/`UIProvider`/`useVidaTheme` + a
  side-effect import of `tamagui.d.ts` (ships the augmentation to consumers).
- `components/` — **UI-1 primitives** (built against the DS-5 contracts): `button.tsx`, `input.tsx`, `checkbox.tsx`,
  `select.tsx`, `card.tsx` (+ `*.stories.tsx` = the Visual-Gate surface, `*.test.tsx` = jsdom). **Select** is the first
  molecular + first floating primitive: a `<button role="combobox">` trigger + a listbox panel PORTALLED to
  `document.body` (react-dom `createPortal`, `zIndex.dropdown`) re-wrapped in `<Theme name="Select">` (the portal
  detaches the `name:'Select'` sub-theme scope; the base light/dark theme still crosses via `<html>`). Focus STAYS on
  the trigger, highlight via `aria-activedescendant` (so close returns focus for free); positioned with a SINGLE `top`
  (Tamagui doesn't clear a stale inline `top`, so top+bottom squished the panel). **Card** is a static container — a
  `<div>` (`role="group"`, or `role="button"` + hand-rolled Enter/keydown/Space-keyup when `interactive`; NEVER a
  native `<button>`, which can't legally contain the focusable `actions`/`footer`). Elevation = the OPACITY of a
  raised-shadow overlay child (B12); the resting shadow **self-cancels in dark** (its colour = the dark surface) so the
  border carries dark elevation (design §V) — no theme detection. `header`/`footer` are real `<header>`/`<footer>`
  (`render:'header'`/`'footer'`). No `loading` prop (the contract authors none — loading/empty are consumer-composed:
  skeleton/empty-state as `children`; DEF-U5-f). **Tabs** is the B12 showcase: a `role="tablist"` of `render:'button'`
  `role="tab"`s (roving tabindex, AUTOMATIC activation, arrows WRAP + skip disabled, Home/End) + a selection
  **indicator** — an absolute bar whose **transform** animates (250/inOut) while its **width/height resize is an
  INSTANT inline-style swap** (the B12 asymmetry: animate transform, never left/width). Measured via the active tab's
  `offsetLeft/Width` relative to the `position:relative` tablist; re-measured on current/orientation/items/**size** +
  `ResizeObserver` + `document.fonts.ready` (all jsdom-guarded); a `ready` flag suppresses the first-mount slide.
  Panels are **`<Tabs.Panel value>`** children (the ARIA contract forces a Tabs-owned `role="tabpanel"` wrapper —
  DEF-U6-a); **only the active panel mounts** (keyed → enter-fade keyframe; no fade-out). `aria-controls` binds only
  to the active tab so every referenced id exists (axe-clean). No `loading` prop (consumer-composed, DEF-U6-c).
  **Menu** is the second FLOATING primitive (reuses Select's portal + single-`top` positioning + dismiss handlers) but
  the WAI-ARIA **menu-button** model: trigger `role="button"`+`aria-haspopup="menu"`+`aria-expanded`; a `role="menu"`
  panel portalled to body under `<Theme name="Menu">`; items `role="menuitem"` with **ROVING DOM FOCUS** — only the
  active item `tabIndex=0`, real `.focus()` moves down (NOT Select's `aria-activedescendant` — a combobox vs a menu),
  Esc returns focus to the trigger. The `trigger` is a consumer SLOT wired via **`cloneElement`** (injects aria +
  composed onClick/onKeyDown + a merged ref — React 19 `props.ref`). 4 placements (start/end align + vertical flip),
  wrapping arrow nav, type-ahead (string labels). The item highlight is an **`active`-state variant** keyed to
  activeIndex (NOT `:focus-visible` — unreliable for a *programmatically* focused element); **danger** is an `intent`
  variant on the label `<Text>` (NOT the row `View` — a `<Text>` with its own colour doesn't inherit the parent's);
  empty → a disabled "No actions" `menuitem`. **⚠ Portal open commits TWICE** (pos null first → panel unrendered, then
  seeded) — the roving-focus + refine layout effects MUST dep on `pos`/`entered` or the first `.focus()` no-ops
  ([[portal-open-focus-needs-a-mount-gated-effect-dep]]; carries to Dialog/Popover). Accepts `aria-label`/`aria-labelledby`
  for the menu name (DEF-U7-d — contract silent).
  **Dialog** is the first MODAL primitive (overlay/organism tier): a scrim + centered panel PORTALLED to a dedicated
  `<div data-vida-dialog-root>` body child, re-wrapped in `<Theme name="Dialog">`. Fully controlled (`open`/
  `onOpenChange`, no trigger slot). Unlike Select/Menu (floating-but-non-modal): a real focus **TRAP** (Tab/Shift+Tab
  cycle within the panel — explicit 0/1/panel/boundary algorithm), the background body siblings are `inert`+`aria-hidden`
  (excluded from the pass **by node identity**, since `<Theme>` renders a `display:contents` span indistinguishable by
  tag from the app root), and focus **returns to whatever was focused before open** (captured `document.activeElement`,
  guarded restore with `document.contains` + body fallback — Dialog owns no trigger ref). `role="dialog"`+`aria-modal`+
  labelledby(title)+describedby(only when `description`). Esc + backdrop pointerdown close when `dismissible` (default);
  both inert when `dismissible={false}` (destructive-confirm — a deliberate §XIV-Esc deviation, DEF-U8-f + dev-warn when
  no focusable action). Motion = a mount-triggered CSS **keyframe** (scrim opacity, panel opacity+scale/lift) with a
  **visible resting base** so a missed animation fails safe visible (NOT the Menu `.is-open` transition). Portal root is
  a **lazy `useState` init** (exists during first render → panel in the first commit → focus finds it; not the two-commit
  trap). No `loading` prop (consumer-composed, DEF-U8-b). ⚠ **Body layout:** the scrollable body is `flexShrink:1 +
  minHeight:0` (sizes to content, scrolls only when the panel hits maxHeight) — **NOT `flex={1}`** (grow:1/basis:0% +
  minHeight:0 collapses to 0 height in a content-height panel and clips all children; header/footer keep RN's default
  `flexShrink:0`).
  **Popover** is the 2nd overlay — a NON-modal `role="dialog"` anchored surface (the app behind stays interactive: no
  scrim, no focus trap, no `inert` — the Dialog contrast). A genetic HYBRID: **Menu's floating machinery** (trigger
  `cloneElement` with `aria-haspopup="dialog"`, portal-to-body under `<Theme name="Popover">`, `position:fixed`
  seed→refine→reveal, outside-pointerdown/capture-scroll/resize dismiss) + **Dialog's `getFocusable` focus-into** (focus
  MOVES into the panel's first focusable on open) — but NOT trapped. **Trigger opens on `onClick` only** (a dialog
  opener, not a menu — a native `<button>` synthesizes click on Enter/Space, so no `onKeyDown`/arrow-open; this also
  sidesteps the U7 double-fire). **Non-modal close model:** a React `onBlur` (focusout) on the panel closes ONLY when
  `relatedTarget` is a real focusable OUTSIDE panel+trigger (Tab-away); it ignores internal moves + a `null`
  relatedTarget (survive window-blur; the trigger is an allowed target so Esc's `triggerRef.focus()` doesn't re-close).
  Esc closes + returns focus to the trigger. **8 placements via an AXIS-SPLIT:** top/bottom = vertical primary (single
  `top` + horizontal align/flip), left/right = horizontal primary (single `left` + vertical center/flip) — Menu's
  refine is vertical-only, so left/right needed the inverse axis; still ONE side property per axis (`offset` prop,
  default 8). **Arrow toward the anchor** (popover.md:27): a rotated-45° 8px square, `borderWidth:0` FLOOR + only the 2
  OUTER edges set to 1px inline (⚠ `borderStyle:'solid'` with no width → `border-width:medium`≈3px bleeds onto every
  unset edge — Visual-Gate catch; and the `rotate(45deg)` must be applied or it's an axis-aligned square, also a
  Visual-Gate catch), `bg=$background` blends the seam; the arrow's edge/offset is an INSTANT inline swap on flip (NOT
  animated — the Tabs indicator precedent). No `popover.arrow` token → reuses popover.background/border (DEF-U9-b). No
  `loading` prop (consumer-composed, DEF-U9-c). Panel keeps `overflow:visible` so the arrow isn't clipped; scrolling is
  on an inner `flexShrink:1 + minHeight:0` wrapper (the U8 body-layout lesson). Motion (B12): opacity + `scale(0.96→1)`
  from the anchor edge (`transform-origin` inline per resolved side). Remaining v1 stubs (calendar/gallery/list/neural-graph/pomodoro/
  timeline/export-dialog) are pre-Tamagui, migrated by UI-2/UI-3.
- `internal/` — per-primitive injected stylesheets for what Tamagui styled() can't express: `interaction-styles.ts`
  (hover/press overlay via CSS descendant-hover), `input-styles.ts`, `checkbox-styles.ts` (state machine off the
  native input's `:checked`/`:indeterminate`/`:focus-visible` pseudo-classes), `select-styles.ts` (chevron rotate +
  panel enter opacity/translateY + active-option highlight — all reading `motion.ts`, reduced-motion via `@media`),
  `card-styles.ts` (resting + raised elevation shadow → opacity-transition on hover/active, reading `shadow.ts` +
  `motion.ts`), `tabs-styles.ts` (indicator transform-only transition gated on `data-ready`; panel enter-fade
  keyframe; hover label-strengthen; reduced-motion `@media` — reading `motion.ts`), `menu-styles.ts` (panel enter
  opacity + translate from the trigger edge, sign by `data-side`, transform-origin set inline; reduced-motion `@media`
  — reading `motion.ts`; enter-motion ONLY, the item highlight is a Tamagui variant), `dialog-styles.ts` (scrim + panel
  ENTER via mount-triggered `@keyframes` with a visible resting base — fails safe visible; transform/opacity ONLY;
  reduced-motion `@media` — reading `motion.ts`), `popover-styles.ts` (panel ENTER opacity + `scale(0.96→1)` from the
  anchor edge; transform/opacity ONLY; transform-origin inline per side; reduced-motion `@media` — reading `motion.ts`).
  **Rule:** a PROP-driven state (e.g. a
  danger border keyed to `invalid`) belongs in a Tamagui `variant`, NOT injected CSS — injected rules lose the
  specificity race against Tamagui's own atomic classes (learned at U3). Injected CSS is only for pseudo-class/`:has`
  state the styled component can't see.
- `hooks/` — `use-reduced-motion.ts`. `icons/` — v1 stubs.

## Rules
- **Animation driver = per ADR-001 §9, per-platform:** **web = `@tamagui/animations-css`** (CSS-on-web, no
  `react-native-web`; consumes `motion.ts` duration+easing as `'<easing> <duration>ms'`); **native = reanimated**
  (ADR-001:258, when mobile is built). **Never** the web-only `@tamagui/animations-react-native` — it pulls
  `react-native-web` (an extra dep VIOLATING ADR-001). See `docs/specs/fixes/ds-4-rn-driver-drift/`.
- Keep `@tamagui/core` + `@tamagui/animations-css` pinned to the same version (family alignment; a skew breaks the
  `animations` config type).
- **Dark mode = a switchable first-class Theme** (B14), never a runtime inversion. Theme STATE + toggle UI +
  persistence are the APP's (UX-3/UI-4); DS-4 ships the config + provider + hook only.
- **CSS-var reconciliation (resolved):** Tamagui's compiled web CSS vars are authoritative at runtime; the design.md
  `variables.css` is a parallel documentation / Figma-projection artifact, not wired into the app.
- **⚠ Dimension props read the TOKEN SCALE, not the sub-theme (DEF-U8-h — DS-wide, fixed at U8):** Tamagui resolves a
  `$name` on a **dimension** prop (`borderRadius`/`space`/`size`) against that prop's **token scale** (radius = `sm/md/
  lg/xl/full`), and against the **theme only for COLOR props**. So a component sub-theme key like `light_Card.radius`
  is **inert for `borderRadius`** — `borderRadius:'$radius'` resolved to **0px on every primitive** (square corners,
  latent U1→U7, caught by the U8 Visual Gate). Reference the **primitive radius token** the semantic points to instead:
  `radius.control → '$md'` (Button/Input/Checkbox/Select/Menu) · `radius.card → '$lg'` (Card/Dialog/Popover/Toast). This
  is the radius analogue of the space lesson (Card `padding` uses `$8/$12/$24`, not the `card.padding` sub-theme key,
  DEF-U5-b). The three-layer component→semantic indirection is NOT expressible for dimensions through Tamagui theming.
- JSX is `react-jsx` + `lib` includes `DOM` (this is the first real JSX in the package); `react` is a peer dep.

## Verify
`pnpm --filter @vida/ui typecheck && pnpm --filter @vida/ui build && pnpm --filter @vida/ui test` (203 tests).
Token visual: `pnpm preview:tokens` → `themes/preview.html`. Component Visual Gate: `pnpm storybook` (or
`build-storybook`) — the decorator paints the theme page surface ($colorSurfacePrimary: white light / navy dark) so
dark mode is reviewable (a bare-on-canvas label would otherwise be invisible on Storybook's white iframe).
