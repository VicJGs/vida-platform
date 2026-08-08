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
  Remaining v1 stubs (calendar/gallery/list/neural-graph/pomodoro/timeline/export-dialog) are pre-Tamagui, migrated by
  UI-2/UI-3.
- `internal/` — per-primitive injected stylesheets for what Tamagui styled() can't express: `interaction-styles.ts`
  (hover/press overlay via CSS descendant-hover), `input-styles.ts`, `checkbox-styles.ts` (state machine off the
  native input's `:checked`/`:indeterminate`/`:focus-visible` pseudo-classes), `select-styles.ts` (chevron rotate +
  panel enter opacity/translateY + active-option highlight — all reading `motion.ts`, reduced-motion via `@media`),
  `card-styles.ts` (resting + raised elevation shadow → opacity-transition on hover/active, reading `shadow.ts` +
  `motion.ts`), `tabs-styles.ts` (indicator transform-only transition gated on `data-ready`; panel enter-fade
  keyframe; hover label-strengthen; reduced-motion `@media` — reading `motion.ts`). **Rule:** a PROP-driven state (e.g. a
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
- JSX is `react-jsx` + `lib` includes `DOM` (this is the first real JSX in the package); `react` is a peer dep.

## Verify
`pnpm --filter @vida/ui typecheck && pnpm --filter @vida/ui build && pnpm --filter @vida/ui test` (136 tests).
Token visual: `pnpm preview:tokens` → `themes/preview.html`. Component Visual Gate: `pnpm storybook` (or
`build-storybook`) — the decorator paints the theme page surface ($colorSurfacePrimary: white light / navy dark) so
dark mode is reviewable (a bare-on-canvas label would otherwise be invisible on Storybook's white iframe).
