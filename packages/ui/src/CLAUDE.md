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
  `switch.tsx`, `select.tsx`, `card.tsx` (+ `*.stories.tsx` = the Visual-Gate surface, `*.test.tsx` = jsdom). **Button** — the frame
  carries a per-intent `color` (mirrors ButtonText) so raw `leading`/`trailing` icon slots (lucide `currentColor`) tint
  per intent+theme instead of inheriting document black (invisible in dark); ButtonText still sets its own colour, so
  label text is unchanged (fe-shell-scope #15 S2 Visual-Gate fix — a COLOR prop, resolves against the theme, unlike the
  dimension/sub-theme trap). **`MenuItemRow` got the same treatment** (a resting `color:$colorTextPrimary` so item
  `leading`/`trailing` icons tint; the label keeps its own default/danger colour — #15 S3 dark-portal Visual-Gate fix).
  **Switch** (fe-settings S1, EC-3) is the pill **on/off toggle** — the OS System-specimen's toggle. Mirrors the
  Checkbox recipe EXACTLY: a real `<input type="checkbox" role="switch">` (opacity:0, absolute-filling the track;
  native role/Space/focus/form) inside a `render:'label'` root; state visuals are pure CSS off `:checked`/`:focus-visible`
  (`internal/switch-styles.ts`) → **no re-render on toggle**. **DIRECT semantic tokens, NO sub-theme** (the fe-codec-theme
  accent-fix direction): ON track = injected `var(--colorBrandPrimary)` (preset-flips blue/oxblood/olive), off =
  `$colorSurfaceSecondary`+`$colorBorderDefault`, knob = `$colorSurfacePrimary`, focus ring = `var(--colorFocusRing)`.
  **Knob travel is size-dependent → an inline `--vida-switch-travel` custom prop on the track** (the toast `--vida-toast-from`
  precedent), inherited by the knob; `:checked` does `translateX(var(--vida-switch-travel))` (B12 transform-only, reduced-motion
  `@media` drops it). **⚠ `invalid` uses the BASE token `$colorSignalDanger`, NOT the sub-theme key `$borderError`** — the
  latter exists only in `light_Checkbox/Input/Select` (`themes.ts:19`); Switch has no `light_Switch` theme so `$borderError`
  would resolve to nothing + the danger border silently falls back to default (**Visual-Gate-caught**; tsc + 10 unit tests
  passed over it — sub-theme keys only resolve when a `light_<Name>` theme exists, direct tokens always do). Binary (no
  `indeterminate`), so `ref` goes straight to the input (no callback-merge — the checkbox merge exists only for the imperative
  `indeterminate` DOM prop). Hover = border-strengthen to `$colorTextMuted` (§VIII; no overflow-clipped overlay). Spec:
  `docs/specs/foundation/fe-settings/delivery/s1-switch.md`. Visual Gate PASS (Brave, 3 presets × light/dark: ON-track
  flips blue(37,99,235)/oxblood(178,55,51)/olive(95,110,62) · knob slides 16px · focus ring · disabled 0.5 · invalid
  rgb(239,68,68) · label AA = `$colorTextPrimary` primary pairing · lg 44×24 · axe 0).
  **Select** is the first
  molecular + first floating primitive: a `<button role="combobox">` trigger + a listbox panel PORTALLED to
  `document.body` (react-dom `createPortal`, `zIndex.dropdown`) re-wrapped in `<Theme name="Select">` (the portal
  detaches the `name:'Select'` sub-theme scope; the base light/dark theme still crosses via `<html>`). Focus STAYS on
  the trigger, highlight via `aria-activedescendant` (so close returns focus for free); positioned with a SINGLE `top`
  (Tamagui doesn't clear a stale inline `top`, so top+bottom squished the panel). **Card** is a static container — a
  `<div>` (`role="group"`, or `role="button"` + hand-rolled Enter/keydown/Space-keyup when `interactive`; NEVER a
  native `<button>`, which can't legally contain the focusable `actions`/`footer`). Elevation = the OPACITY of a
  raised-shadow overlay child (B12); the resting shadow **self-cancels in dark** (its colour = the dark surface) so the
  border carries dark elevation (design §V) — no theme detection. Resting elevation is a **2-layer** (ambient+tight)
  low-opacity `shadow.resting` token (Card is its sole consumer; fe-codec P2 BR-C-5). `header`/`footer` are plain
  `<div>` regions (**NOT** `<header>`/`<footer>` — a `<header>` nested in the `<div>` frame is a `banner`/`contentinfo`
  LANDMARK, duplicated N× in a list row; `card.md:6` Intent "not a landmark" governs; **DEF-U5-g**, fe-codec P2 BR-C-11).
  Inset `padding` is the `pad` **variant** (compact/default/spacious → `$space` scale), NOT a variant literally named
  `padding` — that collided with Tamagui's built-in `padding` style prop so `padding="default"` applied 0px (**DEF-U5-h**,
  the shipped Card had no inset until fe-codec P2); public prop stays `padding`, mapped to `pad`. **Alive-hooks** (fe-codec
  P2, all optional, `neutral`/absent = prior render): `status` (`calm`/`warm` = a 3px left `StatusEdge` accent — an
  absolute aria-hidden child, left-corner-radiused, NOT `borderLeftWidth`/no frame `overflow:hidden` so `CardElevation`'s
  raised shadow isn't clipped, toast.tsx:133-135 precedent; `faded` = recessed `$colorSurfaceSecondary` surface + flat
  `vida-card-flat` (no shadow), **text held at full opacity** so AA is the baseline — BR-C-7a, a blanket frame opacity
  dropped muted text below 4.5), `metric` (a non-interactive readout top-right of the header, before `actions`),
  `headerDivider` (a hairline rule). Signal tokens are preset-invariant (`$colorSignalSuccess`/`Danger`). No `loading`
  prop (the contract authors none — loading/empty are consumer-composed: skeleton/empty-state as `children`; DEF-U5-f). **Tabs** is the B12 showcase: a `role="tablist"` of `render:'button'`
  `role="tab"`s (roving tabindex, AUTOMATIC activation, arrows WRAP + skip disabled, Home/End) + a selection
  **indicator** — an absolute bar whose **transform** animates (250/inOut) while its **width/height resize is an
  INSTANT inline-style swap** (the B12 asymmetry: animate transform, never left/width). Measured via the active tab's
  `offsetLeft/Width` relative to the `position:relative` tablist; re-measured on current/orientation/items/**size** +
  `ResizeObserver` + `document.fonts.ready` (all jsdom-guarded); a `ready` flag suppresses the first-mount slide.
  Panels are **`<Tabs.Panel value>`** children (the ARIA contract forces a Tabs-owned `role="tabpanel"` wrapper —
  DEF-U6-a); **only the active panel mounts** (keyed → enter-fade keyframe; no fade-out). `aria-controls` binds only
  to the active tab so every referenced id exists (axe-clean). No `loading` prop (consumer-composed, DEF-U6-c).
  **fe-gamification S1 — scrollable strip:** the horizontal `TabList` is now `overflowX:auto`/`overflowY:hidden` +
  `maxWidth:100%` and each `Tab` is `flexShrink:0`, so when the tabs can't fit (the first 5-tab consumer at 375) the
  **strip scrolls** (a scrollable tab bar) instead of overflowing the viewport — the panel is a sibling, unaffected;
  the indicator tracks (it scrolls with the list); `overflow:auto` only engages when needed, so 2-tab consumers
  (entity-view) never see a scrollbar. Backwards-compatible (Visual-Gate-caught: 5 tabs overflowed 375 → 523px).
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
  from the anchor edge (`transform-origin` inline per resolved side).
  **Toast** is the 3rd/last overlay and the **ONLY imperative primitive** — `toast(options) → id` / `toast.dismiss(id)`
  callable from OUTSIDE the React tree. The bridge is a module-level **external store** (`internal/toast-store.ts`) +
  React 19 **`useSyncExternalStore`** (the sonner/react-hot-toast reducer model, zero-dep — @vida/ui has no zustand):
  `toast()` mutates a records array + `emit()` (reassign the ref ONLY in emit — `getSnapshot` must be ref-stable or
  React loops), the mounted `ToastProvider` subscribes + renders. `ToastProvider` (mounted ONCE near app root; a 2nd
  instance dev-warns — the store is a singleton) portals to `<body>` under `<Theme name="Toast">` and renders **TWO
  persistently-mounted live regions** — `role="status"`/`aria-live="polite"` (info+success) and `role="alert"`/
  `assertive` (danger) — **both present even when empty** (a live region must PRE-EXIST for a screen reader to announce
  an inserted child, §XIV). **Focus is NEVER moved to a toast on appear**; `F6` (document keydown, `preventDefault`)
  focuses into the globally-newest toast; **Esc is item-local** (`onKeyDown`+`stopPropagation` — so it can't leak to an
  overlay behind the toast; the Dialog/Popover precedent). **Cap is STORE-enforced** (per-region, evict-oldest on
  `add` — NOT a render slice, which would drop the oldest the same commit it starts exiting and kill its exit
  animation); the provider renders EVERY record (exiting ones are cap-exempt). `dismissToast` is **idempotent**
  (early-return if already exiting) → `onDismiss` fires exactly once across all paths (timer/dismiss/Esc/eviction).
  **⚠ Timer effect deps = `[id, duration]` ONLY:** a `ToastItem` re-renders on EVERY store `emit()`, so depping the
  auto-dismiss timer on `record` would re-arm it on unrelated sibling emits and a busy screen's toasts would never
  dismiss; pause-on-hover/focus is imperative via refs. Left accent = an absolutely-positioned 3px bar clipped by the
  panel's `overflow:hidden` (no accent-width token, DEF-U10-c). Intent accent + `$text` cross the portal (light_/dark_
  Toast). `borderRadius:'$lg'` via the token scale (DEF-U8-h); no `toast.border` token → base `$colorBorderDefault`.
  No `loading` prop (consumer-composed: `duration:0` + spinner in `description`; `aria-busy` unsettable, DEF-U10-b).
  Motion (B12): enter `moderate`/`out`, exit `fast`/`in`, opacity + translateY slide from the stack edge only.
  **fe-codec-controls-refinement · P4b (LIF-231) — hover "slight elevation"** (the `toast.md:27` contract state, was
  MISSING). A **non-clipping `ToastWrapper`** holds a sibling `aria-hidden` `ToastElevation` overlay (absolute, inset 0,
  `$lg` radius, `box-shadow:shadow.raised`, `opacity:0`) + the existing `ToastPanel` (keeps its `overflow:hidden` for the
  accent bar). `.vida-toast-wrap:hover .vida-toast-elevation{opacity:1}` fades the raised shadow in — **opacity-only
  transition (B12); the shadow is static**; the shadow paints OUTSIDE the panel (wrapper doesn't clip) and the opaque
  panel covers the overlay body (only the drop-shadow shows). The Card overlay-opacity precedent. **Dark:** the raised
  shadow self-cancels (hue = dark surface), so a `ToastPanel` `hoverStyle:{borderColor:'$colorTextMuted'}` border-strengthen
  carries §VIII hover-perceptibility in dark (the `card.tsx:52` precedent). Panel timer/focus/accent/motion/live-region
  behavior UNTOUCHED. Visual Gate PASS (Brave, 3 presets × light/dark: elevation opacity 0→1 on hover all cells · dark
  border-change · `shadow.raised` · reads "slight"). Spec: `…/fe-codec-controls-refinement/phases/P4b-toast-hover-elevation.md`.
  **fe-codec-controls-refinement · P3 (LIF-231) — overlay Level-3 elevation.** The three overlay panels (Dialog · Popover ·
  Menu) gained a **static `box-shadow: shadow.overlay`** (design §V Level 3; first consumer of the `overlay` token) added
  to each panel's base rule in `internal/{dialog,popover,menu}-styles.ts` (the `card-styles.ts` precedent). **Static only**
  — each stylesheet's transition is explicit `opacity,transform` (never `all`), so the shadow never animates (B12). **Dark:
  self-cancels** — `shadow.overlay`'s hue = the dark surface `rgba(15,23,42,·)`, so it blends on the dark scrim/page and
  the 1px border carries elevation (§XI, the Card mechanism; Visual-Gate-confirmed the 0.18 alpha reads as subtle
  elevation, not a halo). RATIFY (already shipped, no work): Dialog title `$display` serif · Menu item hover+active+disabled.
  Visual Gate PASS (Brave, 3 overlays × 3 presets × light/dark: shadow present all 18 cells · light lift · dark self-cancel ·
  axe 0 bar one PRE-EXISTING flag). **⚠ Pre-existing (NOT P3): the danger menu item label `#ef4444` on surface = 3.63
  contrast** (< 4.5) — the provisional ds-2 signal palette; real values land via Figma at M4/P2 (`frontend-source-of-truth.md`).
  Unrelated to the shadow; fixing it = palette-VALUE churn (M4). Spec: `docs/specs/foundation/fe-codec-controls-refinement/phases/P3-overlay-chrome.md`.
  **list-view** is **UI-2 · V1** — the first platform view (`list` VIEW_LAYOUT renderer) and the **DATA-VIEW SPINE**
  V2–V4 reuse. A pure **presentational** generic `ListView<T>`: `items` + `renderItem` + `getKey` → a `role="list"`
  of `role="listitem"` rows. **Row interactivity is NOT list-view's** — the consumer's `renderItem` composes an
  interactive Card when a row is clickable (LV-5), so list-view stays layout-only and doesn't re-solve Card's
  container-vs-button problem. **Four RENDERED terminal states** (BR-2), `state` is a **PROP not derived** (the
  package→app boundary — the app derives via UX-4 `deriveTerminalState` + passes it; `@vida/ui` is a package, can't
  import an app): `loading` → N static `SkeletonRow`s (`$colorSurfaceSecondary`, `$md`, fixed `$24` h, **no shimmer**,
  the UX-4 §3.1 recipe) as aria-hidden listitems + `aria-busy`; `empty`/`error` → a **`role="status"`** message
  region (NOT a `role="list"` with zero items — that trips axe; error is polite/`status`, not assertive `alert` —
  it's a statically-rendered state, not a live insertion, the Toast contrast). The container **role is
  state-dependent** (`list` for list/loading · `status` for empty+error). `state` is a **LOCAL `ViewState` union**
  (`'loading'|'empty'|'error'|'success'`) — `@vida/ui` deps are Tamagui-only, so importing `@vida/core`'s
  `TerminalState` would be a wrong-direction edge; structural typing makes `deriveTerminalState()`'s value assignable
  with no import. **React 19 `ref`-as-prop, NO `forwardRef`** (a generic `forwardRef` erases `<T>`; list-view is
  non-interactive so §111-115's mandate n/a — the Menu `props.ref` precedent). **No sub-theme** (LV-3): dividers
  (`$colorBorderDefault`), skeleton, message use BASE semantic tokens, which resolve on an **unnamed** styled host
  (the `name` prop only scopes component sub-theme keys). `density` = the **between-row GAP** (`$8/$12/$24`), NOT
  per-row padding (a row's inset is its renderItem's — else double-pad with Card). LV-7 dev-warns on state/items
  contradictions + a missing accessible name (card.tsx guard precedent). No motion in V1 (LV-6). Spec:
  `docs/specs/components/ui-2-platform-views/{_index,v1-list-view}.md`.
  **fe-codec-primitives-refinement · P1 (LIF-230)** — editorial polish + alive-hooks, all PRESENTATIONAL (row CONTENT
  stays renderItem's, LV-5): **`sections?`** = `ListSection<T>{id,title,items}` grouped render + eyebrow headers (mirrors
  board's `BoardGroup`; a11y = the board model rotated vertical: outer `role="group"` + per-section eyebrow-`id`'d
  `role="list"` `aria-labelledby` + per-section empty via `resolveDataViewState`; XOR `items`, now optional). **`primaryKey`**
  (+`primaryLabel` eyebrow) = a GENERIC featured-row emphasis; **`activeKey`** = the active-row mark — both an **accent
  LEFT-TICK** (`borderLeft` 3px `$colorBrandPrimary`) via a Tamagui VARIANT (the Toast left-accent precedent; NO bg tint —
  no accent-surface token → token-pure, no palette churn; NO injected CSS). The "one thing" SEMANTIC is the consumer's.
  3 new dev-warns (items⊕sections, primary/active no-match). Visual Gate PASS (Brave, 3 presets × light/dark × calm/dense:
  AA 4.94–6.53 incl. warm-dark · 375 no-overflow · Grouped eyebrow sections + empty-section self-heal · Featured tick+eyebrow).
  **gallery-view** is **UI-2 · V2** — **list-view's spine with a responsive flex-wrap GRID** (the imagery-first /
  vision-board `gallery` layout, ADR-007:61). Reuses `type ViewState` from `./list-view` (intra-package, no 2nd copy)
  + the identical terminal-state switch, `role="list"`/`listitem` + state-dependent role, LV-7 dev-warns, React-19
  ref-prop. Delta = the grid: `GalleryRoot` (`flexDirection:'row'` + `flexWrap:'wrap'` + density→`gap`), tiles sized
  by a per-instance `style={tileStyle}` = `{flexGrow:1, flexBasis/minWidth: minTileWidth, maxWidth: minTileWidth*2}`
  (the tabs `style={indicatorStyle}` precedent — layout numbers, not tokens; **`minWidth` is the enforced FLOOR** —
  `flexBasis` alone collapses under `flexShrink`). Wraps to a single column at 375 with the default 200 (gallery ≈
  list on mobile — expected). Skeleton tiles reuse `tileStyle` + **`aspectRatio:3/2`** (tracks the grown width, no
  jump on load; jsdom CSSOM serializes it `"1.5 / 1"`). **Cover-field degradation is the VIEW ENGINE's**
  (ADR-007:62-64), NOT this renderer. No sub-theme/motion/new-dep. Spec: `…/ui-2-platform-views/v2-gallery-view.md`.
  **fe-codec-primitives-refinement · P4 (LIF-230)** — **`getWeight?(item,index)→number`**, a width-weight so a *featured*
  tile is proportionally bigger within the flex grid (a **ready affordance** — the "which tile is featured" semantic is the
  consumer's, no M1 surface wires it yet; the P1 `primaryKey` precedent). The single memoized `tileStyle` became a per-tile
  `weightStyle(w,minTileWidth)` = `{flexGrow:w, flexShrink:1, flexBasis:w·min, minWidth:min, maxWidth:w·min·2}`; **`minWidth`
  stays the BASE floor** (NOT w·min) so a weighted tile PREFERS w× but SHRINKS to the base on a narrow row. **⚠ `flexShrink:1`
  MUST be explicit** — Tamagui/react-native-web defaults flexShrink to **0** (RN semantics, not CSS's 1), so without it a
  `flexBasis: w·min > viewport` tile can't shrink → **375 overflow** (the Visual Gate caught it; base tiles hid it since
  `min<viewport`). `clampWeight` is a **symmetric** guard — coerces to `[1, MAX_WEIGHT=8]` (+dev-warn; `<1`/non-finite → 1,
  `>8` → 8 [a bogus large weight would starve siblings — review-caught]; absent/null → 1, no warn). **Skeleton tiles stay
  `w=1`** (uniform, data-independent — the board `SKELETON_COLUMNS` precedent). The editorial tile LOOK (framed cover +
  kicker + serif title + tabular caption) + **cover-intelligence (generated covers)** remain the consumer's `renderItem` /
  the **view engine's** (GV-1; ADR-007:62) — NOT built here; **true variable-height masonry is FORECLOSED** by the RN-safe
  flex grid (GV-2 / ADR-001:111 — "not CSS grid"). Visual Gate PASS (Brave, 3 presets × light/dark: editorial tile serif
  title AA 15.84–17.29 + tabular caption/kicker 4.94–6.53 incl. warm-dark · axe 0 · **featured 496px vs base 248px = 2×** on
  desktop · 375 no-overflow [weighted shrinks to fit]). Spec:
  `docs/specs/foundation/fe-codec-primitives-refinement/phases/P4-gallery.md`.
  **timeline** is **UI-2 · V3** — V1's spine laid out as a **CONTINUOUS vertical rail** (the `timeline` layout: temporal
  sequence). **The rail-continuity trick:** `TimelineRoot` has NO gap; the between-row spacing is the Content column's
  `paddingBottom` (skipped on the last row), so the rail columns sit **flush** and their full-height lines meet — an
  absolute line scoped to an item CANNOT cross a root `gap`. The dot is at a FIXED `top:12` (12×12, center=18) so no
  layout measurement is needed; the line is trimmed to the dot at the ends via a **4-branch rule** (`isFirst&&isLast`
  lone → NO line [else a dangling nub]; first `{top:18,bottom:0}`; last `{top:0,height:18}`; middle `{top:0,bottom:0}`).
  The `getLabel` temporal label is **real content** (first in the listitem, NOT aria-hidden); only the rail column
  (line+dot) is `aria-hidden`. Reuses the whole spine via `internal/data-view`. Spec: `…/v3-timeline.md`.
  **fe-codec-primitives-refinement · P3 (LIF-230)** — editorial lift + the now-fulcrum alive-hook, all presentational:
  **date GUTTER** — a 3rd left column `[when | rail | content]` (`When` 80px, right-aligned, `className="vida-timeline-gutter"`),
  rendered only when `getLabel`/`getEyebrow` is given OR the fulcrum renders (else the 2-col layout, back-compat); the
  date (`getLabel`) is **serif `$display` FAMILY at `$small`** (NOT the 36px display SIZE) + **tabular** (`style={{fontVariantNumeric}}`,
  the pomodoro precedent) + an optional **`getEyebrow`** kicker (the P1 SectionHeader recipe). **Hollow resting dot**
  (`RailDot` variant `hollow` = `$colorSurfacePrimary` fill + 2px `$colorTextMuted` border, replacing the old solid fill).
  **`getTemporalState`** (`'past'|'present'|'future'`, consumer-computed — the renderer never reads a clock) tones the
  **rail DOT**: `present` = accent fill + a **soft ring** (a static `box-shadow` composed inline from `useTheme().get('web')`
  — the pomodoro precedent; jsdom/no-web → accent fill, no ring, F2 fallback); `future` = a faded dot (**inline `opacity:0.55`
  on the DOT ONLY** — the date is held at full `$colorTextMuted` so AA holds, the Card **BR-C-7a** "dim the chrome, hold the
  text" pattern; the past/future TITLE tone is the consumer's renderItem, LV-5). **`nowFulcrum`** (+ `nowLabel`, default "now")
  splices ONE accent "now" divider **before the first non-`past` item** (`fulcrumAt`; all-past / no `getTemporalState` →
  no-op + dev-warn); the 4-branch trim runs over the **COMBINED render sequence** (items + a fulcrum pseudo-row, keyed by a
  NUL sentinel `FULCRUM_KEY` so it can't collide with `getKey`) so the rail connects THROUGH the fulcrum; the fulcrum is an
  `aria-hidden` NON-listitem (a decorative boundary, correctly excluded from the list — axe-clean). Fulcrum rail segment =
  **solid accent** (`RailLine` `tone="accent"`), NOT the mock's gradient (off-pipeline). `TemporalState` exported from the
  barrel. Visual Gate PASS (Brave, 3 presets × light/dark: serif date AA 15.84–17.29 · eyebrow AA 4.94–6.53 incl. warm-dark ·
  present accent FLIPS per preset [editorial blue / reader oxblood / quietDesk olive] + ring · future dot 0.55 w/ date held AA ·
  "now" AA 4.95–6.41 · dots=items+1 · axe 0 on editorial+fulcrum · 375 no-overflow). Spec:
  `docs/specs/foundation/fe-codec-primitives-refinement/phases/P3-timeline.md`.
  **V3 also extracted `internal/data-view.tsx`** (rule of three) — the shared `ViewState` type + the `Message`
  default empty/error copy + `resolveDataViewState({state,itemCount,ariaLabel,ariaLabelledby,name})` (role +
  effectiveEmpty + the 3 dev-warns). list-view + gallery-view + timeline all consume it; list-view **re-exports
  `ViewState`** so the barrel is unchanged. Only the shared LOGIC is extracted — each view keeps its own
  container/wrapper/skeleton + the 4-branch body switch (the layout genuinely differs).
  **calendar-view** is **UI-2 · V4** — a **month grid** (`calendar` layout) that buckets dated items onto days.
  **It DIVERGES from the linear-list spine:** a calendar is a 2D date grid → it renders as a **`role="table"`** (day
  cells `role="cell"`, NOT `gridcell`/`list`), and **"empty" is a designed grid-with-no-chips state, NOT a status
  message**. So it reuses the spine's PIECES (`ViewState`, `Message`, `warnMissingName`, ref-prop, base tokens) but
  **NOT `resolveDataViewState`** (its empty→status role is wrong for a calendar). **Pure display:** `month` is
  CONTROLLED (NO `useState`); prev/next nav Buttons render only when `onMonthChange` is given. **⚠ TZ-safe day keying:**
  a `'YYYY-MM-DD'` string is the day key **as-is** (NEVER `new Date(str)` — that's UTC-midnight → an off-by-one in a
  negative-offset zone like UTC−3 [Brasília]; the COMMON path since that's the platform date format); a `Date` →
  `format(d,'yyyy-MM-dd')` (local). Grid = **always exactly 42 cells** (`addDays(gridStart,0..41)` — the
  `endOfWeek(endOfMonth)` interval yields 35 OR 42, so build the fixed 42) for a stable height; weekday headers from
  the first 7 grid days (shift with `weekStartsOn`); today = `$colorBrandPrimary` badge (injected `today?` seam for
  deterministic tests); `maxPerDay` chips + "+K more"; 375-usable via a `minWidth:560` table in an `overflowX:auto`
  wrapper. First view with a **new dep — `date-fns` (^4)** (ADR-001:174; barrel imports, consumer bundler shakes).
  Terminal states: loading→skeleton grid+aria-busy · error→`role="status"` Message · success/empty→the grid. Spec:
  `…/v4-calendar-view.md`. (V4 also extracted **`warnMissingName`** into `internal/data-view` — the accessible-name
  warn shared with `resolveDataViewState`, whose STATE GATE stays put.)
  **fe-codec-primitives-refinement · P5 (LIF-230)** — editorial Layer-1 refinement (chrome only, NO interface/behavior
  change; TZ keying · 42-cell grid · `role="table"` roles UNTOUCHED): serif `$heading`/500/`-0.3` **month title** ·
  **weekday eyebrows** (`textTransform:'uppercase'` **CSS not `.toUpperCase()`** so the `columnheader` DOM name stays
  "Mon" — SR-correct; `letterSpacing:0.8` raw [the `$wide:0.02` token is ~invisible px — `list-view.tsx:106` house
  precedent], left-set) · day number `$caption`→**`$small`** + **tabular** figures (so the date outranks its `$caption`
  chrome) · **today = accent number + a short accent underline** (`TodayMark`: a `borderBottom` under the digit, keeps
  `className="vida-cal-today"` — the test:85 + Gate hook), REPLACING the filled `TodayBadge` blob · **weekend +
  out-of-month = `$colorSurfaceSecondary` paper** via a `tone:{weekend,oos}` variant (the boolean `muted` retired; both
  land on the single secondary step — the mockup's "`$colorSurfaceSecondary` family", `calendar-refinement.html:152`),
  the day-number COLOUR differentiates (oos → `$colorTextMuted`, weekend/in-month → `$colorTextPrimary`; **oos > weekend**
  precedence) · "+K more" eyebrow. **⚠ Today number = `$colorBrandEmphasis`, NOT `$colorBrandPrimary`** — `brandPrimary`
  (accent500/400) fell to **4.39/4.44 < 4.5 AA** on a weekend/oos `$colorSurfaceSecondary` cell (editorial-dark +
  quietDesk-light), **Visual-Gate-caught**; `brandEmphasis` (accent600 light / accent300 dark) is the higher-contrast
  brand step in BOTH modes (no new palette — the ramp's emphasis step, as Button-primary uses) → 5.93–8.89 AA. The chip
  (accent category dot + caption) is the **consumer's `renderItem`** (GV-1/LV-5), shown in the story, NOT renderer code.
  Visual Gate PASS (Brave, 2 stories × 3 presets × light/dark: serif title AA 15.84–17.29 · weekday eyebrow 4.94–6.53 ·
  day-number MIN 4.52–5.22 incl. warm-dark · today number 5.93–8.89 on BOTH paper + secondary · axe 0 · 42 cells · 375
  no-overflow). **⟹ P5 ships the FINAL primitives-refinement phase — all 5 views (list·gallery·timeline·calendar) +
  pomodoro refined.** The living/multi-range calendar is the separate `fe-calendar #19` (NO Layer-2 here). Spec:
  `docs/specs/foundation/fe-codec-primitives-refinement/phases/P5-calendar.md`.
  **fe-calendar #19 · S1 (LIF-203)** — **`hideHeader?: boolean`** (slice-map D4): suppresses the grid's own month
  title + nav so a hosting frame (the #19 `CanvasView` Global Calendar surface) owns the period title ONCE (envision
  EC-2 double-title fix). Default `false` — standalone grids unchanged; grid/roles/states untouched (+1 test, 22).
  **agenda-view** is **UI-2 · V10** (fe-calendar #19 · S2, LIF-203) — the Global Calendar's **Agenda range** renderer
  (a calendar RANGE dispatched by the #19 surface, NOT a `VIEW_LAYOUT`). Presentational read-only lens: `days:AgendaDay[]`
  of **pre-dayparted, pre-ordered** items (the app's `useCalendar` maps dayparts, S7) — it arranges, never derives/sorts.
  **Temporal asymmetry:** ONLY the `today` day (string-equal, no Date math) is grouped Morning→Afternoon→Evening; other
  days are one flat list (the approved mockup + greybox). Rows: 64px gutter (tabular `time` | "ALL DAY" eyebrow) ·
  purpose dot (user-data hex, aria-hidden) · title (`flexShrink:1 minWidth:0`; done = struck + muted) · Must
  (`$colorBrandEmphasis`) / Can (muted) tag. Spine PIECES (`ViewState`/`Message`/`warnMissingName`), NOT
  `resolveDataViewState` (outer `role="group"` of per-day `role="list"`s, names via `aria-labelledby` `[dayId]` or
  `[dayId partId]`, `useId` index-keyed; day keys `${date}-${i}`). **Completion = intent, render-when-handler:** a native
  `<button type="button" role="checkbox">` only when `onToggleItem` AND `done!==undefined` (named by the title's id);
  `focusVisibleStyle` ring + `hoverStyle` are **Tamagui pseudo-styles on the host — no injected sheet** (injected CSS is
  only for cross-element `:has` cases like checkbox-styles). **⚠ Resting border = `$colorTextMuted`, NOT
  `$colorBorderDefault`** — the hairline is 1.2–1.7:1 on the surface, below WCAG 1.4.11's 3:1 for a control boundary
  (Visual-Gate-caught; reuse this for any bordered control). **⚠ Hit-area insets resolve from the PADDING box** — a
  1.5px border shrinks a 20px box's padding box to 17px, so −12 gave 42 (<44); −14 → 46. The HitArea is a
  `render:'span'` (a `<div>` is invalid inside `<button>`). No handler + completable → inert `aria-hidden` box + sr-only
  "(done)" — **a consumer with no wired capability passes NO handler** (a no-op handler = dead focusable checkboxes).
  TZ: date parsed by parts. Narrow reflow = `DayRow flexWrap` + items `minWidth:240` (rail stacks above at 375). Also:
  Chrome snaps a 1.5px border to 1px in `getComputedStyle` (Visual-Gate probes must not match `'1.5px'`). Visual Gate
  PASS (Brave, real CalendarSurface, 3 presets × L/D × 375/768/1440: AA 4.94–6.53 · box 3:1 · 46×46 · ring · real
  Space/Enter toggle · axe 0). 21 tests. Spec: `docs/specs/components/ui-2-platform-views/v10-agenda-view.md`.
  **week-view** is **UI-2 · V11** (fe-calendar #19 · S3, LIF-203) — the Global Calendar's **Week AND Day ranges** (Day =
  `days.length === 1`, one component). Time-column grid: 64px `aria-hidden` hour gutter · headed day columns · ONE
  all-day strip of undated `CalChip`s · `TimedBlock`s positioned by `startHour`/`endHour` at 48px/h. **Geometry is pure
  in `internal/week-layout.ts`** (unit-tested): `formatHour(h, fmt, kind)` (minute-rounded; start ≤23:59, end may be
  24:00; 12h gutter drops ":00") · `normalizeSpan` (absent end → +1h, contradictory end → +1h flagged, start ∉ [0,24) →
  skipped) · `windowFor` (hours = a MINIMUM, auto-extends to fit, clamped [0,24]) · `layoutDay` (late clamp BEFORE
  clustering; drawn-extent transitive clusters; lowest free lane, every lane checked; output in INPUT order). Order:
  validate → renderable set → window → layout (NaN-safe). Lane `left`/`width` go in inline `style` (gallery `tileStyle`
  precedent — Tamagui would atomic-class every fraction). Compact (`h<44 || lanes≥3`) = one row; **short time**
  (`compact || lanes≥2`) = start-only visible time, full range in an sr-only span (D-S3-DEV-1 — a range wrapped in a
  ½-column lane and pushed the title out; screenshot-caught). A contradictory end is never LABELLED (IR-6). A11y: the
  hour-line layer is an `aria-hidden` SIBLING of each column's positioned `role="list"` (never a parent); column lists
  are named by ONE explicit sr-only string ("Thu 8, today") with the visual header `aria-hidden` — jsdom joins inline
  header spans ("Thu8"). Week wraps the grid in a keyboard-reachable `role="region"` (`tabIndex 0`, 2px ring; axe
  scrollable-region-focusable); Day has none. **⚠ `position:relative` on the root + scroll region:** an sr-only
  `position:absolute` span whose containing block is OUTSIDE an `overflow:auto` scroller escapes the clip and widens the
  PAGE (616px at 375, Visual-Gate-caught; jsdom can't see it) — reuse for any horizontal scroller holding sr-only text.
  Empty (explicit or nothing renderable) = the designed empty grid + sr "Nothing scheduled", items never drawn under it.
  `timeFormat` mirrors `user_preferences.time_format`. 45 tests. Visual Gate PASS (Brave, real CalendarSurface, 3 presets
  × L/D × 375/768/1440 + overlap + states + 12h + Sunday: AA min 4.52–5.22 · 0 page overflow · lanes never intersect ·
  ring unclipped · axe 0). Spec: `docs/specs/components/ui-2-platform-views/v11-week-view.md`.
  **year-view** is **UI-2 · V12** (fe-calendar #19 · S4, LIF-203) — the Global Calendar's **Year range**: 12 mini-months of
  activity-density dots (pre-derived `level` 0/1/2 — the renderer never thresholds). Layout = the RN-safe flex-wrap grid
  (`flexBasis:'22%'` caps a row at 4, `minWidth:128` → 2-up at 375). Mini-month = 7-slot rows: leading blanks from
  `weekStartsOn` + TRAILING `aria-hidden` spacers (so a short last row never stretches); square cells (`aspectRatio` in
  `style`), `$8` gap (the greybox governs), no day numbers / weekday row. Dots: has = 4px @ **.75** (the mockup's .55 failed
  3:1 in 4/6 preset×mode — D-S4-DEV-1), busy = 6px solid, `$colorBrandEmphasis`. Today = an absolute `aria-hidden` 2px ring
  in a `position:relative` cell; the current-month accent is computed from the built day keys so it can never appear without
  the ring. A11y: 12 `role="table"` (`aria-colcount=7`, offset-aware `aria-colindex`, cells labelled
  `format(d,'EEEE, d MMMM')` + density + today). Drill-in = a render-when-handler native `<button>` heading (UA chrome reset,
  44px, hover paper, ring) emitting `onPickMonth(0–11)` — a NAVIGATION intent, so the #19 surface wires it in M1. **⚠ accname
  drops a LEADING space inside an sr-only span** ("January2026") — put the space in a SIBLING text node (`{' '}<span sr>`).
  **⚠ jsdom atomic-class prefixes are the long names** (`_minHeight-`, not `_mih-`) — compare against a reference element.
  Geometry pure in `internal/year-layout.ts` (`resolveYear` · `buildYear` · `indexDensity` · `localDate` — `setFullYear` at
  local noon). 19 + 11 tests. Visual Gate PASS (Brave, real CalendarSurface, 29 cells: has 3:1 min 3.54 · busy/ring 5.93 ·
  names 6.47 · 0 page overflow · Tab Jan→Dec · drill focus on "Month grid"). Spec:
  `docs/specs/components/ui-2-platform-views/v12-year-view.md`.
  **living-view** is **UI-2 · V13** (fe-calendar #19 · S5, LIF-203) — the Global Calendar's signature **Living** range:
  ④ purpose budget (accent bars; hours via `internal/living-format.ts` "6h"/"2h05"; 0 → "0h · none yet" in
  `$colorBrandEmphasis` — the greybox red is danger, which fails AA as text; null → "unmeasured", never 0; `stale` → "as of
  last read") · ② habit threads (7 `flex:1` node cells — kept/missed-dotted/today/future@.4, hollow nodes filled — joined by
  the vision's connector, purpose colour @ .33 via `opacity`, never hex maths; each row = one sr sentence) · the 7 day **`Card`s
  via alive-hooks** (past `faded` · today `warm` · future) named by an sr span, inside a keyboard-reachable `role="region"` whose
  inset is sized to `shadow.resting` (+ a negative margin to keep edges aligned) — `tabIndex 0` ALWAYS (the loading skeleton still
  scrolls; axe-caught). Today = ONE ordered `entries[]` (items + the open-time block; button only with `onSlotOpenTime`).
  **⚠ SR suffixes go INSIDE the inline label Text** — a whitespace node between FLEX items gets no box and the browser drops it
  ("Title(done)"; jsdom keeps it, so the test passes anyway — g2-review-caught). Lanes degrade alone (absent = "unavailable
  right now"; `[]` = "No … yet"); an absent lane is never "empty". 26 + 4 tests. Visual Gate PASS (26 cells: text AA ≥ 4.52 ·
  0 page overflow · axe 0). Spec: `docs/specs/components/ui-2-platform-views/v13-living-view.md`.
  **`internal/calendar-shared.ts`** (S5): `SR_ONLY` · `DATE_KEY` · `parseLocalDate` shared by agenda/week/year/living (rule of
  three); `Eyebrow` stays per-file (agenda's lacks the paired line-height).
  **fe-calendar S7 (LIF-203, the entity close) — renderer amendments:** V13 **`color?`** on `PurposeBudget`/`HabitThread` (absent →
  `$colorTextMuted` ink, never a fabricated hex) + **`ThreadState 'off'`** (a 5px solid muted dot, no ring — a different SHAPE from
  the hollow dotted `missed`; SR "rest day"). **CalendarView:** today cell named `d MMMM yyyy, today` (the sibling suffix) + a
  **controlled unfurl** (`expandedDay?` · `onExpandedDayChange?` · `renderExpanded?`): with both, "+K more" is a ≥44 native button
  (`aria-expanded`/`aria-controls`, hairline hover + an `open` pressed variant), the day's full list unfurls in ONE `role="row"` /
  `role="cell" aria-colspan={7}` after its week; Esc / second press collapse, focus stays; no handler ⇒ unchanged static text.
  **`pulseKey?`** on Calendar/Agenda/Week/Year/Living: a new positive key remounts the today mark with the one-shot
  `vida-today-pulse` (`internal/calendar-motion.ts`: scale 1→1.12→1, `slow` 400ms ease-out; reduced-motion `@media` → none; 0 = none,
  never on mount). **`RangeTransition`** (`components/range-transition.tsx`): wraps a range region; a `transitionKey` change remounts it
  with `vida-range-fade` (`moderate` 250ms opacity) — a latch, so the first render never fades but every later switch does.
  ⚠ jsdom atomic prefixes mix forms (`_btc-` vs `_borderLeftColor-`) — compare against a reference element.
  **fe-calendar S4 — `calendar-view` `tabIndex?`** (D-S4-DEV-2): an opt-in programmatic focus target; `CalRoot` carries the
  house 2px ring (renders only when opted in + focused). The surface focuses the Month grid after a Year drill-in.
  **pomodoro-widget** is **UI-2 · V5** — the interactive timer WIDGET `@vida/ui` ships (ADR-008:35). NOT a data-view: a
  self-timing single-interval countdown with a **DEFERRED session-engine seam** — the pomodoro *session*
  (lifecycle/persistence/effects/phase-sequencing) is a `sessions` sub-type owned by MOD-sessions (ADR-004); the widget
  only owns the ephemeral countdown + **emits lifecycle intents** via callbacks (`onStart/onPause/onResume/onReset/
  onSkip/onComplete`). **⚠ Timer structure (the Toast-lesson traps):** timing is **drift-free** from an `endAtRef`
  timestamp; the `setInterval` is **armed IMPERATIVELY in `run()`** (the `toast.tsx arm()` precedent) and the ~250ms
  tick reads `endAtRef.current` + the stable `setRemainingMs` — **NO `useEffect` deps on countdown state** (that
  re-arms every tick). `status` is BOTH state (renders controls) AND a `statusRef` (read synchronously by the tick
  latch); a **single `setStatus(next)` helper writes BOTH** so they never desync. `onComplete` fires **exactly once**
  via a one-way latch (`statusRef!=='running'`→return) in contractual order
  (`setStatus('idle')→clear→setRemainingMs(0)→msg→onComplete() LAST`). A **`durationMs` change** is the phase-advance
  seam — an **atomic idle-guarded reset** (gated on `prevDurationRef`, dev-warns mid-run). Controls swap by status
  (Start·primary → Pause·secondary/Skip·ghost → Resume/Reset/Skip); Skip ≠ onComplete. `role="timer"` (implicit
  aria-live=off, no per-second spam) + a **polite `role="status"` completion one-shot** (cleared on transition-out).
  Self-names (composed aria-label). `mm:ss` via `$display`; progress fill clamped [0,1]. Base tokens, no sub-theme, no
  new dep. Spec: `…/v5-pomodoro-widget.md`.
  **fe-codec-controls-refinement · P1 (LIF-231)** — aesthetic refinement + the v5 §6-deferred progress RING, all
  presentational: **tabular figures** on the countdown (`style={{fontVariantNumeric:'tabular-nums'}}` on `Time` — a v5
  §4:144 spec'd-but-unbuilt invariant now completed; Tamagui forwards the style key, verified at the gate; the DS-wide
  **tabular-numeric convention** for numeric UI — adopt on Select numeric/timeline dates/table cells, extract a shared
  helper only at the rule of three); **eyebrow phase label** (`$caption`·uppercase·`$wide`); **6px hairline track**;
  **resting elevation** (`shadow.resting` inline on `Root`, self-cancels in dark — the Card mechanism). **`progress?:
  'bar' | 'ring'`** (default `'bar'`, non-breaking): `'ring'` renders a local `ProgressRing` (thin two-circle `<svg>`,
  `aria-hidden`, round cap, −90° start, stepped `strokeDashoffset` — no CSS transition) around the time. **⚠ Ring colors
  via `useTheme().get('web')`** — `theme.colorBrandPrimary?.get('web')`/`colorSurfaceSecondary?.get('web')`, the
  **Tamagui-documented SVG call** [getThemeProxied.d.ts ThemeGettable.get]; a `$token` SVG attr renders colorless and a
  hard-coded hex would **reintroduce the Neural-Graph conformance gap** — so the ring stays preset/theme-aware + token-
  pure. Internal `progress` fraction renamed `fraction` (frees the prop name). Timer/latch/controls logic UNTOUCHED.
  Visual Gate PASS (Brave, 3 presets × light/dark: tabular + eyebrow all cells · ring accent FLIPS per preset+mode —
  editorial blue / reader oxblood / quietDesk olive · AA 4.94–6.03 incl. warm-dark · axe 0 · 375 no-overflow). Spec:
  `docs/specs/foundation/fe-codec-controls-refinement/phases/P1-pomodoro-widget.md`.
  **export-dialog** is **UI-2 · V6** — the reusable export modal. **Composes UI-1 `Dialog`** (via its `footer` +
  `description` props — NOT children: `footer` renders the actions in a non-scrolling `<footer>`, `description` wires
  `aria-describedby`) + a **hand-rolled APG `role="radiogroup"`** format picker + `Button`. **PRESENTATIONAL (the V1
  boundary):** `@vida/ui` can't import `@vida/core`'s serializers → the dialog emits **`onExport(format)`** and the APP
  wires serialization + download. `ExportFormat` = a **LOCAL union** `'md'|'pdf'|'docx'` (LV-3a; ≡ `@vida/types`
  EXPORT_FORMAT), no cross-package edge, no new dep. **⚠ The radios are `role="radio"` DIVS** (no native `disabled`), so
  **`busy` drops every radio to `tabIndex=-1`** or the selected one stays a focusable-but-inert member of Dialog's
  focus trap (`[tabindex]:not([tabindex="-1"])`). Roving DOM focus (the Menu model): only the selected radio is
  `tabIndex=0`; ↑↓←→ wrap + Home/End + Space, focus+selection coupled. The **effective selection is DERIVED each
  render** (`formats.includes(sel) ? sel : formats[0]`) so an orphaned sticky state / changed `formats` self-heals.
  Export uses Button `loading={busy}` ("Exporting…"); Export does NOT self-close (the consumer closes after the export
  resolves; failure → Toast, §6). Dev-warns: `defaultFormat∉formats`, empty `formats`. `role="dialog"` focus-into lands
  on the selected radio (it's `focusables[0]` — the radiogroup precedes the footer + roving). Base tokens, no
  sub-theme. Spec: `…/v6-export-dialog.md`.
  **fe-codec-controls-refinement · P2 (LIF-231)** — radio-row refinement, all presentational, logic (ED-2…ED-5) UNTOUCHED:
  **hover state** on `Radio` (`hoverStyle:$colorSurfaceSecondary`; the `disabled` variant cancels it to `transparent`,
  the `select.tsx:82` precedent) — closes a §VIII hover-state gap. **Selected accent = a left BAR, NOT a brand border:**
  removed `borderColor:$colorBrandPrimary` from the `selected` variant (the row border stays neutral `$colorBorderDefault`),
  and an `aria-hidden` absolute 3px `AccentBar` (`$colorBrandPrimary`, `.vida-export-accent`) renders when selected — the
  **Toast accent precedent** (`Radio` `position:relative`+`overflow:hidden`, bar clipped to the radius, NOT the focus
  outline; **no layout shift** — a `borderLeftWidth` 1→3 would jump a bordered box 2px). The bar + filled `Dot` are the
  sole accent (no doubled ~4px edge). Title/description stay Dialog's (→ P3). Visual Gate PASS (Brave, 3 presets ×
  light/dark: hover bg change · accent bar flips per preset+mode [editorial blue / reader oxblood / quietDesk olive] · AA
  4.94–6.53 · axe 0 · 375 fit). Spec: `docs/specs/foundation/fe-codec-controls-refinement/phases/P2-export-dialog.md`.
  **neural-graph** is **UI-2 · V7** (the LAST view) — a **force-directed WebGL graph** (Sigma.js) for the `graph`
  VIEW_LAYOUT. First component with **WebGL + new deps** (`sigma`·`graphology`·`graphology-layout-forceatlas2`).
  PRESENTATIONAL: `nodes`/`edges` are props (AR-8's graph-prep, uncrossable) — own minimal `GraphNode`/`GraphEdge`.
  **⚠ Sigma mounts via a ref+effect (BR-5), WebGL-GUARDED** (`webglAvailable` = `canvas.getContext('webgl')`, false in
  jsdom → effect skips, no crash). **The effect deps on a CONTENT signature `graphKey`** (node-ids + edge-pairs), NOT
  the `nodes`/`edges` array REFS — an equal-content new array (the inline-`.map()` consumer footgun) would otherwise
  `kill()`+rebuild+relayout the WebGL context EVERY render (browsers cap live contexts ~16 → crash; the Toast re-arm
  bug at WebGL scale). Cleanup = `sigma.kill()` (context/renderer/camera/listeners). `forceAtlas2.assign` with
  `barnesHutOptimize` + a deterministic circular seed; **documented node-ceiling** (~hundreds; 10K → §6 webworker).
  **A11y (§XIV MET in V7, not deferred):** the WebGL canvas is `aria-hidden`; a **visually-hidden focusable node
  `<button>` list** (bare `<button>`, sr-only clip style, NOT UI-1 Button) is the accessible equivalent — `onNodeClick`
  fires from BOTH Sigma `clickNode` (mouse) AND the buttons (keyboard/SR + jsdom-testable). The node-list renders in
  success regardless of WebGL (also the no-WebGL data fallback). Sigma canvas is transparent → the frame's
  `$colorSurfacePrimary` flips with the theme. States via the shared `Message`. Dangling edges skipped + dev-warn.
  Lifecycle tested by mocking `sigma`/`forceatlas2` + stubbing `getContext`. Spec: `…/v7-neural-graph.md`.
  **fe-codec-canvas-graph · S1 (LIF-205) — the editorial "ink voice" extension** (#8; EXTEND, no new file). Three
  conformance fixes, all back-compat: **(1) themed node/edge default colours** — node = `$colorBrandPrimary`, edge =
  `$colorBorderDefault` (per-preset: editorial blue · reader oxblood · quietDesk olive), replacing the deleted fixed
  `#6366f1`/`#cbd5e1` ("blue SaaS", surface-map.md:28 WRONG-risk). **⚠ Sigma renders in WebGL — a `var(--x)` is
  uncolorable there**, and a CSS custom property's *computed* value does NOT substitute nested var() refs, so
  `useTheme().get('web')` (which returns `var(--colorBrandPrimary)`) is resolved to a CONCRETE `rgb(...)` via a **probe
  `<span>`**: append to the Sigma host, set a REAL `style.color = token`, read `getComputedStyle(probe).color`
  (`try/finally` removes it) — the browser then applies the full cascade incl. the active preset's `<body>`-class
  override. jsdom (no CSS var engine) → fallback literal. This is the WebGL analogue of the pomodoro-ring SVG
  `stroke="var(…)"` pattern — SVG resolves var() via CSS, WebGL can't. A per-item `GraphNode.color` still overrides.
  The colour tokens are read in the effect but kept OUT of its deps (stale-until-re-topology; NG-2 color-deferral) —
  fine in M1 where the `/graph` route renders empty; surgical live-recolor is a first-consumer follow-up. **(2)
  consumer slots** — `loading?`/`error?`/`empty?: ReactNode` override the default `Message` (`{slot ?? <Message>}`,
  the board/calendar precedent), `content` widened to `ReactNode`; absent → verbatim copy. **(3) reduced-motion** —
  `useReducedMotion()` gates the forceatlas2 iterations (`reduced ? 0 : layoutIterations`; 0 = the deterministic
  circular seed, no force-settling); `reduced` IS in the effect deps. Visual Gate PASS (Brave, 3 presets × light/dark:
  node ink concrete + DISTINCT per preset [blue/oxblood/olive] · edges hairline · canvas mounts · 12-node a11y list ·
  empty/loading/error AA 5.76–6.53 incl. warm reader-dark · slot override · axe 0 · 375 no overflow). @vida/ui 473 tests.
  Spec: `docs/specs/foundation/fe-codec-canvas-graph/`.
  **table-view** is **fe-codec-viewmodes · S1** (LIF-214) — the renderer for the **`table`** VIEW_LAYOUT, extending ui-2
  with the 6th canonical view-mode (G6 reshape: *"add table · board"* — supersedes the 2026-08-09 "table/board = degrade,
  not built" stance). A **READ-ONLY LENS** (quality-bar §4.3: a View renders, a Capability writes) — caller-declared
  `columns: Column<T>[]` ({header · render · width? · align? · sort?}) × generic `items<T>`. **Follows the calendar-view
  `role="table"` divergence**: reuses the spine PIECES (`ViewState`, `Message`, `warnMissingName`, ref-prop, base tokens)
  but **NOT `resolveDataViewState`** — a grid's empty is a **designed row** (spanning cell w/ `aria-colspan`, headers kept),
  not a `role="status"`. `role="table"/row/columnheader/cell`; `aria-sort` is **DISPLAY-only** (reflects `column.sort`, no
  toggle — sort is the Collection shell's, not the renderer's); horizontal-scroll wrapper (`minWidth 560` in `overflowX:auto`)
  for 375 (TV-6); density = cell vertical padding; 4 terminal states (loading skeleton rows + aria-busy · error status ·
  empty designed-row · success). NO write/sort/row-click props (read-only; interactivity composes in `column.render`, LV-5).
  Visual Gate: full-matrix AA (4.94–6.53 incl. warm-dark) · axe-clean · 375 scroll · `aria-colspan` serializes. Spec:
  `docs/specs/components/ui-2-platform-views/v8-table-view.md`. Delivery: `docs/specs/foundation/fe-codec-viewmodes/`.
  **board-view** is **fe-codec-viewmodes · S2** (LIF-214) — the renderer for the **`board`** VIEW_LAYOUT, the **LAST**
  canonical view-mode (completes the 7). A **READ-ONLY LENS** grouped-column (kanban) grid over **PRE-GROUPED** data
  (`groups: BoardGroup<T>[]` = `{id · title · items}`; the provider groups upstream per ADR-007 §3.3 — the renderer
  never groups/filters/sorts). `role="group"` of **columns**, each a titled `role="list"` of cards via `renderCard(item,
  group)` + a header (title + **per-group count = `items.length`**, derived not passed). **HYBRID spine reuse:** each
  COLUMN reuses `resolveDataViewState` (a column IS a list → `role="list"`/`status`, per-column empty); the BOARD level
  owns loading (fixed `SKELETON_COLUMNS`, data-independent — **no `loadingCount` prop**, the deliberate table asymmetry) /
  error (`role="status"`) / board-empty (no groups → `role="status"`, the inverse of table's designed-empty-row — a board's
  columns ARE the data) directly. **⚠ Per-column empty is normal in a success board** — the renderer derives each column's
  `colState = items.length===0 ? 'empty' : 'success'` before `resolveDataViewState`, so an empty column resolves to
  `role="status"` WITHOUT tripping the spine's "pass state=empty" dev-warn. Each column list is named via `aria-labelledby`
  → a **`useId`-prefixed, index-keyed** DOM id (NOT `group.id`, which may hold spaces). **NO write/drag/move props** (the
  interactive move = a Capability, ADR-008/INT-2, homed OUT — O1; card interactivity composes in `renderCard`, LV-5).
  Bordered columns (1px `$colorBorderDefault` + `$lg`) + fixed `COLUMN_WIDTH 280` in `overflowX:auto` for 375; density =
  between-card gap; React-19 ref-prop, no sub-theme, DIRECT semantic tokens. Visual Gate: full-matrix AA (muted 4.94–6.53
  incl. warm-dark) · 375 scroll · 3 board-level terminal states. Spec:
  `docs/specs/components/ui-2-platform-views/v9-board-view.md`.
  **⟹ 8 UI-2 views shipped** (list·gallery·timeline·calendar·pomodoro·export-dialog·neural-graph) **+ table + board**
  (fe-codec-viewmodes S1/S2) + the shared `internal/data-view` spine. **All 7 canonical VIEW_LAYOUT renderers now ship**
  (list·gallery·timeline·calendar·graph·table·board) — the spine is complete.
  **collection-view** is **fe-codec-collection · S1** (LIF-207) — the CODEC **Collection shell** (decomposition.md:29 §1.2,
  "the workhorse"): *a Saved View rendered in a view-mode*. **A SHELL, not a renderer** — it COMPOSES the 7 renderers via a
  consumer **`renderView(layout, state)` render-prop** (so it stays agnostic of the 7 differing prop shapes — table→columns,
  board→groups, graph→nodes… — AND free of any `@vida/core` type), plus a view-mode **switcher** + title/count chrome +
  the threaded 8-state. **NON-GENERIC** (holds no `items` → no `<T>` to erase → a plain component + React-19 ref-as-prop).
  `layout` is a **LOCAL `ViewLayout` union** ≡ `VIEW_LAYOUT` (no `@vida/types` dep — the `ViewState`-local precedent;
  `@vida/ui` is Tamagui-only). **Switcher** = a `role="toolbar"` of inline-**label** toggle `Button`s (active =
  `intent="primary"` + `aria-pressed`; **NOT `Tabs`** — a view-switch re-renders the *same data* in another layout, tabs
  swap *different content*); **condenses to a UI-1 `Menu` below 768** (the shell global-bar control-reflow precedent
  shell-layout.md:67 — NOT wrap, NOT h-scroll which is the wide-data pattern) via **`useTabletUp`**, a render-time
  `matchMedia(min-width:768)` hook (mirrors `use-reduced-motion.ts` — Tamagui's `useMedia()` seeds media at config-import
  so a test matchMedia mock can't move it; this is both browser-correct AND jsdom-testable). **Empty ownership** (the
  resolved contract point): the shell owns a consistent collection-level **`EmptyState`** (teaching-invitation) on
  `state==='empty'` EXCEPT for `DESIGNED_EMPTY_LAYOUTS = ['calendar']`, where it **delegates to `renderView(layout,'empty')`**
  so the calendar grid is kept; a consumer `empty`/`error` prop always overrides; all other states → `renderView` (the
  renderer owns loading/error/success — degrade-never-crash). Region named via `aria-label`/`aria-labelledby`→titleId
  (`warnMissingName`). DIRECT semantic tokens; no sub-theme. **State-as-prop (BR-2)** — the app derives via the 8-state
  machine + passes it. Visual Gate PASS (Brave, 3 presets × light/dark: AA 4.94–6.03 incl. warm-dark · axe 0 · 7 renderers
  dispatch · toolbar `aria-pressed` · 375 condense + table scroll). **S2** added the view-config chrome ENTRY POINTS
  (`onFilter`/`filterActive` badge · `sortLabel`/`onSort` · `onNewView` the `+`, icon-only w/ aria-label) — optional,
  right-aligned, **ACTIVE in every state** (EC-2); entry points ONLY (filter/sort/create logic = the app's/ViewsService's).
  **S3** (next) = the apps/web SavedView↔Collection adapter (type+convention). Spec:
  `docs/specs/components/ui-2-platform-views/collection-view.md`. Delivery: `docs/specs/foundation/fe-codec-collection/`.
  **dashboard-view** is **fe-codec-dashboard · S1** (LIF-208) — the CODEC **Dashboard shell** (decomposition.md:30 §1.2,
  "a grid of integration blocks"), the 2nd archetype shell. Like Collection, a **SHELL not a renderer** — it COMPOSES
  blocks the consumer supplies via a **`renderBlock(block)` render-prop** (the `standalone` integration-block widgets ship
  elsewhere; types-only today — `editor.ts:28-40`), over an **RN-safe flex grid** (the gallery-view precedent:
  `flexDirection:'row'`+`flexWrap:'wrap'`+density→`gap`). **NON-GENERIC** (holds no block data → no `<T>`), React-19
  ref-prop. **`CellSize`** = a LOCAL `sm|md|lg|full` union → a per-cell `SPAN` flex style `{flexGrow, **flexShrink:1
  explicit** (RNW defaults 0), flexBasis %, minWidth FLOOR, maxWidth CAP}`; the **`maxWidth` cap stops a lone non-`full`
  cell growing to full** (EC-6 — gate-proven lg 760 < 1136 grid); `full` has no cap; floors < 375 content width → single
  column at 375 (EC-8). Each cell = a **`Card`** frame (`header` = block title `$subheading` + the `⋯` action SLOT +
  `headerDivider`; body via `renderBlock`). **Per-block state** reuses the intra-package `ViewState` canon, threaded as a
  PROP (BR-2). **⚠ TERMINAL-STATE OWNERSHIP (the pinned contract): the SHELL owns the generic loading/empty/error** —
  uniform skeleton (`aria-busy`), teaching empty, calm **`role="status"` error with MUTED text** (NOT `$colorSignalDanger`
  — fails AA 4.5 in light, the known ds-2 M4 fix; the `Message` precedent) — and `renderBlock` is called **only for
  `success`** (a block is CONTENT, not a self-stated component); per-block `blockLoading`/`blockEmpty`/`blockError` are
  optional overrides (EXTENDS Collection's shell-owned-empty to all 3 generic states). Empty dashboard → a teaching
  `EmptyState` (EC-5). `warnMissingName`+`useId` region name; DIRECT semantic tokens; `data-size`/`.vida-dash-cell` =
  the gate hook. **The `$h3`/`$h4` font tokens DON'T EXIST** (scale = `display/heading/subheading/body/small/caption`) —
  use `$heading`/`$subheading` (collection-view.tsx:170 carries the latent `$h3` defect → M4 sibling fix). Visual Gate
  PASS (Brave, 3 presets × light/dark: heading serif AA 15.84–17.29 · cell text MIN 4.52–5.22 incl. warm-dark · axe 0 ·
  EC-1..EC-8). **S2** (next) = the apps/web placement↔Dashboard adapter (pure `block_instances`→cell mapping + convention,
  live `useDashboard` hook deferred). Spec: `docs/specs/components/ui-2-platform-views/dashboard-view.md`. Delivery:
  `docs/specs/foundation/fe-codec-dashboard/`.
  **entity-view** is **fe-codec-entity-facet · S1** (LIF-209) — the CODEC **Entity shell** (decomposition.md:31 §1.2, "the
  facet system"), the **3rd archetype shell**. A **SHELL not a renderer** — a facet FRAME composing a **Layout facet** (always
  present — the consumer's Title·bio·summary + `DashboardView` #5 + `CollectionView` #4) + an **OPTIONAL Editor facet** (the
  entity's linked page = Canvas: Editor #7, composed later) in a user-chosen **`mode`: merged | tabbed**. **NON-GENERIC**,
  React-19 ref-prop. **`FacetMode`** is a LOCAL union; editor state reuses the shipped intra-package **`ViewState`** (imported
  from `internal/data-view`, NOT a new alias — critique B3). **The "registry-gated editor" resolves in apps/web (S2), NEVER in
  the shell:** `isEntityType()`/`ENTITY_TYPES` live in `@vida/core` (uncrossable), so the gate = **`editor`-slot presence** —
  the shell offers the Editor facet iff an `editor` node is passed (the `collection-view.tsx:179` `onFilter != null`
  precedent). **merged** = Layout + an `aria-hidden` divider + Editor, **each facet a labeled `role="region"`** via `aria-label`
  (`layoutLabel`/`editorLabel`; NOT `aria-labelledby` — no shell-rendered heading; critique B2); **tabbed** = ui-1 **`Tabs`**
  `[Home|Content]`, **only the active panel mounts** — Tabs is correct here because facets are *different content* (the INVERSE
  of collection-view's toolbar-over-Tabs). **Deep-link** to the Editor via `defaultFacet`/`activeFacet`+`onActiveFacetChange`
  (critique B1 — else the active facet is lost on a mode round-trip). **Shell owns the Editor facet's generic terminal states**
  (`editorState`: calm skeleton / teaching-empty / `role="status"` **muted** error — NOT `$colorSignalDanger`, the AA/ds-2
  fix), renders `editor` only for `success`; the Layout composite self-states. **Page-less** (no `editor`) ⇒ Layout rendered
  DIRECTLY (no Tabs/toggle) — **DISTINCT from empty-editor** (`editorState:'empty'` → the Content tab IS shown with a teaching
  body). Mode toggle = a `role="toolbar"` of `aria-pressed` Buttons (collection-view switcher precedent); mode switch is
  INSTANT. `$display` serif H1; DIRECT tokens; `warnMissingName`. Visual Gate PASS (Brave, 3 presets × light/dark: title serif
  AA **15.84** · facet text MIN **5.65–6.03** incl. warm-dark · 3 regions · toolbar aria-pressed · tabbed active-only
  (inactive editor NOT mounted) · page-less no toolbar/tablist · empty-editor≠page-less · loading=aria-busy · error=role=status
  · **axe 0** · 375 no overflow). **S2** (next) = the apps/web entity↔EntityView adapter (`offersEditor` gate + merged/tabbed
  memory convention; live `useEntity` hook deferred). Spec: `docs/specs/components/ui-2-platform-views/entity-view.md`.
  Delivery: `docs/specs/foundation/fe-codec-entity-facet/`.
  **fix-entity-view-header (2026-10-07) — the title-hero canonical header.** `TitleGroup` gained **`gap:'$16'`** (was
  missing → the `$display` title + `$small` subtitle rendered flush; `design.md §IV` 4pt rhythm / §I breathing room).
  The pattern (EC-5, `fe-codec-flow-session/envision.md:53`; the flow shell mirrors it): the serif `$display` title
  **carries alone — NO eyebrow, NO middle-dot meta-string**; `subtitle` = **ONE quiet `$small` muted plain-language
  line** (enforced by the `<Text>` wrap — a block child is invalid), so a **quantity → a `HonestProgress` bar is
  SEPARATE header chrome the consumer composes** (the flow-shell `HeaderAside` precedent), never crammed into the
  subtitle; `$16` title→metadata rhythm (review-2 value; `flow-session-view.tsx:97`, on branch `fe-codec-flow-session`).
  No API change. **EntityView is the only archetype shell with a stacked title+subtitle** → the cram is unique to it:
  `collection-view` has a horizontal title+count `TitleGroup` (`gap:'$8'`, no subtitle) and `dashboard-view` a
  title-only header, so there is nothing to sweep there. The shared convention is the quiet-line subtitle (no dot-pile).
  **flow-session-view** is **fe-codec-flow-session · S1** (LIF-210) — the CODEC **Flow/Session shell**
  (decomposition.md:33 §4.5), the **4th archetype shell**. A flow FRAME for any staged do-this-then-that surface (a session
  run · routine step · wizard · drill · onboarding · check-in entry): a **title-hero header** (serif `$display` + a
  `HonestProgress` **bar** for progress — NOT a text subtitle · a quiet context line **16px** below the title · a saveStatus
  slot + `⋯`) + a **staged progression** over the shipped **`Timeline`** (`getTemporalState` done→past·current→present·
  upcoming→future + `nowFulcrum` = the "current stage" boundary; done ✓/proof collapsed · current emphasized · upcoming
  faded) + a per-stage body **`renderStage` slot** + the **standardized stage affordances** (attach document/photo/audio ·
  mark-done · require-proof — the shell renders these for the CURRENT stage and **EMITS intents**, never a write; the
  pomodoro-widget precedent) + a read-only **effect-rail log** (`ListView`; empty → teaching `EmptyState`). **NON-GENERIC**
  (FlowStage is concrete → React-19 ref-prop), **presentational** (@vida/ui Tamagui-only; all types LOCAL). **State-as-prop
  (BR-2)** — each stage threads its own `loading`/`empty`/`error`/`success`; degrade-never-crash (loading skeleton · errored
  `role="status"` muted). **Typography = the semantic SCALE, no arbitrary px** (`design.md:103`; EC-11): title `$display` ·
  current `$heading` · done/upcoming `$subheading` · body `$body` · labels `$caption`/`$small`; **accent spent in ONE place**
  (the current stage + the bar). **⚠ The affordances live in ONE wrapping `AffordanceRow`** — a nested non-wrapping sub-row
  overflowed the narrow card column at 375 (RNW `flexShrink` defaults to **0** → can't shrink; the gallery-view lesson,
  Visual-Gate-caught). NOT the timer/HUD (#16 + pomodoro V5), NOT the runtime page (#23), NOT the effect WRITES (@vida/core).
  Visual Gate PASS (Brave, 3 presets × light/dark + 375: title serif AA 15.84 · text MIN 4.95–4.96 incl. warm-dark · progress
  bar · current affordances · fulcrum · effect-rail · axe 0 · no overflow). **S2** = the apps/web flow↔FlowSessionView
  adapter (`toFlowProps` + `mapEffectLog` [ADR-004 applied_effects → effect-rail] + `bindFlowIntents` against a
  `SessionsPort`; live `useFlowSession` hook deferred, R3). Spec:
  `docs/specs/components/ui-2-platform-views/flow-session-view.md`. Delivery: `docs/specs/foundation/fe-codec-flow-session/`.
  **fe-gamification S4 — affordances are render-when-handler:** the standardized current-stage affordances (Mark done ·
  Require proof · Attach Document/Photo/Audio) now render PER-HANDLER (each only when its `onMarkDone`/`onRequireProof`/
  `onAttach` is passed; the row is omitted entirely when none are) — the DS `onFilter != null` idiom. A deliverable flow
  passing handlers is unchanged; a NON-deliverable flow (the rule-authoring create-wizard, whose `renderStage` body owns
  its own Back/Next/Create) passes none and gets a clean staged frame instead of dead no-op buttons.
  **canvas-reader** is **fe-codec-canvas-reader · S1** (LIF-206) — the CODEC **Canvas: Reader shell**, the **5th archetype
  shell**. A long-form **read·listen·annotate** FRAME; S1 ships the frame + header + reading column + states (Contents
  panel S2 · margin rail S3 · selection S4 · listen bar S5 EXTEND it). A SHELL (the flow-session pattern) — **NON-GENERIC**
  (React-19 ref-prop), **presentational/state-as-prop (BR-2)**, @vida/ui-only LOCAL types. Header = **title-hero** (serif
  `$display` title alone · ONE plain-language `context` line · a `HonestProgress` reading-% **bar only when `progress` is
  given** — a reader has no stages to derive from · `saveStatus` slot + `⋯`; `TitleGroup gap:'$16'`) + the honest
  **`positionNote`** line (IR-3 not-synced). Body (S1) = the centered **reading column** (serif measure `maxWidth:660`) via
  a **`renderContent` slot** (success-only). **Five states** via local **`ReaderState = ViewState | 'unavailable'`**:
  loading (skeleton `aria-busy`) · empty (teaching `EmptyState`+`emptyAction`) · error (`role=status` MUTED) ·
  **`unavailable` (access — a DISTINCT calm status, NOT empty: physical copy / no openable file, IR-NEEDS-4)** · success.
  DIRECT tokens; region named via `warnMissingName`+`useId`. Visual Gate PASS (Brave, 3 presets × light/dark + 375:
  title-hero · serif column · 5 states unavailable≠empty · accent flips · **AA MEASURED 0-fail incl. warm-dark**).
  **S2** adds the toggleable **Contents panel** (the left zone — realizes the living-margin layout): an "About" `summary`
  slot (the book-level Notes page, decision 1) + a shell-owned **TOC** from `chapters:ReaderChapter[]` (completion ✓ ·
  **current chapter `$colorBrandEmphasis` + `aria-current`** · rows pressable `role=button`+keyboard ONLY when
  `onJumpToChapter` given, the `collection onFilter` precedent) + a "Contents" header toggle (`aria-pressed`, app-owned
  `contentsOpen`). **Header fix (benefits S1 too): `flexWrap` + `TitleGroup minWidth:240` + aside `flexShrink:0`** so the
  serif `$display` title word-wraps at 375 instead of mid-word-breaking (the RNW `min-width:0` flex-collapse; Visual-Gate
  caught). S2 Visual Gate PASS (AA 0-fail incl. warm-dark · 375 panel-stacks + title word-wraps).
  **S3** adds the **margin rail** (the right Body zone — completes the living margin): `annotationGroups:AnnotationGroup[]`
  (`{id,title,annotations}`, **PRE-GROUPED by chapter** — the shell never groups/sorts/parses; the adapter S6 builds them,
  the board-view/list-view `sections` precedent) + `ReaderAnnotation{id,nature,text,location}` (`location` a pre-resolved
  `ReactNode`, IR-8) + `annotationsState:ViewState` (NOT ReaderState — annotations have no access-`unavailable`) + `railOpen`/
  `onToggleRail`/`onAddNote`/`onLinkAnnotation`. **IR-1 shell-enforced BY CONSTRUCTION (EC-5):** `linkable = nature !==
  'highlight'` gates Add-note/Link BEFORE handler presence → a highlight NEVER shows an affordance even if the handlers are
  passed (`AnnotationNotLinkableError` is UI-unreachable dead defence). The **three natures are visually distinct** (EC-6):
  a `$caption` uppercase **nature label** (the non-colour signal) + a per-nature **`NatureMarker`** — a GRAPHICAL object
  (≥3:1, NOT text 4.5): `highlight`=filled block · `bookmark`=outlined · `quote`=accent bar, all `$colorBrandPrimary`
  (the calendar-dot/list-tick graphical token), **token-pure (no accent-surface tint, the list-view P1 lesson)**. Annotations
  **grouped by chapter** with **counts** (total + per-chapter, EC-14); excerpt `numberOfLines={3}` clamped (house idiom;
  the full text lives in the opened note). `RailBody` = the ReadingBody-mirror 4-state switch (loading `aria-busy` · empty
  teaching `EmptyState` `titleLevel=3` · error `role=status` muted · success → grouped lists; success+no-groups degrades to
  empty). A11y: `role="region"` "Annotations" → per-chapter `role="list"` `aria-labelledby` a **`useId`-prefixed index-keyed**
  eyebrow id (NOT `group.id` — spaces, the board-view lesson) → `role="listitem"`; markers `aria-hidden`; affordances = ui-1
  ghost `Button`s. "Annotations" header toggle (`aria-pressed`, beside Contents); Body `justifyContent`→`flex-start` when
  EITHER zone present; the rail stacks below the column at 375/768 (mirrors `ContentsZone`, `borderLeftWidth`+`flexShrink:1`).
  S3 Visual Gate PASS (Brave, 3 presets × light/dark + 390 + 768: IR-1 highlight-no-affordance every cell · text AA 0-fail
  worst 4.52 · **marker 3:1 0-fail 4.95–6.41 incl. warm-dark** · 3 distinct markers · grouped+counts · rail states · stacks
  below at 390/768 · no overflow · axe 0). 26/26 canvas-reader · full @vida/ui 496/496. IR-1 realized (was "shell-enforced
  at S3").
  **S4** adds the **selection affordance** — the way an annotation is born. Because the reading body is the consumer's
  `renderContent` slot the shell can't own/anchor into (IR-NEEDS-3 / EC-12), S4 ships **two exported pieces the consumer
  composes INSIDE `renderContent`** (the 4 `on*Selection` move OFF `CanvasReaderProps`): **`SelectionActions`** — a
  `role="toolbar"` (Tab-stops, the collection-switcher precedent) of **real inline-SVG icon buttons** (Highlight · Quote ·
  Bookmark · Listen-from-here; EC-15 never emoji; `currentColor` → the ghost `$colorBrandPrimary` via `ButtonText`, the
  Button-spinner precedent), each **render-when-handler**, **`size="lg"` (48px ≈ 56×48 ≥ 44×44, §X touch)**, Listen gated by
  `listenAvailable` (IR-7 degrade), emits intents never writes; **`ReaderHighlightMark`** — a **2px accent `borderBottom`**
  inline mark (EC-3) whose font+colour **inherit** from the enclosing paragraph (hold the text), token-pure (no
  accent-surface bg — use inside a `<Text>`). The live selection Range→rect anchoring is the **apps/web consumer's** (S6 /
  fe-books #36) — the shipped `Popover` is trigger-anchored, not Range-anchored. **Barrel also closes the S3 gap** (now
  exports `Nature`/`ReaderAnnotation`/`AnnotationGroup` + the two S4 components + prop types). S4 Visual Gate PASS (Brave,
  3 presets × light/dark + 390: EC-15 SVG 0-emoji · icon 3:1 0-fail 4.95–6.41 incl. warm-dark · 56×48 · mark underline 3:1
  5.63–6.41@2px + mark text AA held 15.84–17.29 · axe 0). 33/33 canvas-reader · full @vida/ui 503/503.
  **S5** adds the slim persistent **listen bar** — book-level chrome (the INVERSE of S4's exported pieces: no `Range` to
  anchor, so it lives ON `CanvasReaderProps` per the seam-contract, NOT a consumer-composed export). `listen?: ListenMode`
  (`'idle'|'playing'|'unavailable'`, LOCAL union, the `ReaderState` precedent) + `listenProgress?`/`listenLabel?`/
  `onListenToggle?`; the `ListenBar` renders between `Header` and `Body` **only when `listen != null`** (the `progress`
  render-when-provided precedent). Three honest EC-7 states: **idle** → `ListenIcon` toggle (reused from S4) + label,
  starts; **playing** → a new `PauseIcon` (S4 icon recipe) toggle + `HonestProgress` shown **only when `listenProgress`
  given** (honest, no fake fill) + `aria-pressed`; **unavailable** → a CALM `role="status"` muted line "Listening isn't
  available on this device", **NO button, never `$colorSignalDanger`** (IR-7, the reading-column `unavailable` precedent).
  The toggle renders on idle/playing only when `onListenToggle` passed (render-when-handler), `size="lg"` (56×48 ≥44×44).
  **A11y: all three states are a `role="group" aria-label="Listen"`** so `unavailable` (no button to carry a name) is never
  an empty-named region. Single `flexWrap` row (375 wrap, RNW `flexShrink:0` default lesson); `$colorSurfaceSecondary` bar
  surface, DIRECT tokens; barrel adds `type ListenMode`. S5 Visual Gate PASS (Brave, 3 presets × light/dark + 375: 3 named
  groups · toggle 56×48 · real SVG 0-emoji · **icon 3:1 4.39–5.27 incl warm-dark** · label AA 4.52–5.22 incl the
  muted-on-secondary line · progressbar in playing · calm unavailable · axe 0 · no overflow). 42/42 canvas-reader · full
  @vida/ui 512/512. **S6 ✅** = the apps/web Books↔Reader adapter (`apps/web/src/reader/adapter.ts`, type+convention): the
  display-resolve mappers (parse `position`→chapter via TOC page-range → "Ch. N · p. P"; Unplaced bucket; degrade-never-crash)
  + `BooksReaderPort` + `bindReaderIntents`; live `useReader` hook deferred to fe-books #36. Verification Gate PASS (28/28).
  **⟹ fe-codec-canvas-reader COMPLETE — all 6 slices.**
  Spec: `docs/specs/components/ui-2-platform-views/canvas-reader.md`. Delivery: `docs/specs/foundation/fe-codec-canvas-reader/`.
  **canvas-view** is **fe-codec-canvas-board · S1** (LIF-204) — the CODEC **Canvas shell** (decomposition.md:32 §1.2,
  "where the soul lives"), the **5th archetype shell**. A read-only, immersive editorial FRAME that hosts exactly ONE
  view-mode renderer at canvas scale; the two worked examples — **Vision-board** (GalleryView over dreams, imagery-first)
  and **Calendar-grid** (shipped month CalendarView) — are consumer compositions (apps/web, S2), and **#19 later drops
  its multi-range renderer into the same frame** (R3 — `children` is renderer-agnostic). A FRAME not a renderer:
  masthead (**`eyebrow`** uppercase-via-CSS · **`title`** REQUIRED serif `$display`, the **user-named surface** NOT the
  month, EC-5/A — so no duplication of the renderer's own month header · **`meta`** `$small` muted · a **`progress`
  SLOT** the consumer fills (board-level meter, EC-3) · a read-only **`actions`** slot, EC-6/R1 · a hairline) + a hosted
  **`children`** region. **NON-GENERIC** (holds no renderer data → no `<T>`), React-19 ref-prop; LOCAL types
  (`CanvasState` = the intra-package `ViewState` alias, no `@vida/core`/`@vida/types`, R6). **⚠ STATE RULE (the pinned
  seam divergence, BR-CB-S1-6): the frame does NOT re-implement states — it SELECTS an optional override slot by `state`,
  else delegates to `children`:** `state==='empty'&&empty → empty` (vision-board teaching) · `state==='error'&&error →
  error` (calm `role="status"` muted) · **else → `children`** (loading/success/un-overridden empty+error show the hosted
  renderer's OWN tuned state — calendar's designed 42-cell grid for empty, R2/R5). The consumer still threads `state` to
  the child. (Divergence from dashboard/entity, which OWN generic states because their bodies are success-only; here the
  hosted renderers carry state.) **Progress is MEASURE-DRIVEN and lives in the consumer `renderItem`, NOT the frame
  (R9/R9a):** a tile's bar STYLE **and** its label/units follow the entity's `measurement_kind` (`milestone`→steps bar ·
  `quantitative`→value/target · `rate`→ratio/streak · `qualitative`→state · **unmeasured→none**) via ADR-011 `progress()`
  — the frame bakes no style (the GV-1 boundary; baking the steps-bar in would break every non-milestone entity).
  **Responsive (BR-CB-S1-12):** the masthead is a `flexWrap` row (title-group · actions) so actions reflow below /
  title-group shrinks at 375 — no collision. `role="region"` named by the title (`useId`+`warnMissingName`); DIRECT
  semantic tokens, no sub-theme. Read-only (R1 — overflow reveal / multi-range = `fe-calendar #19`, parked
  `calendar-vision.md §6`). Visual Gate PASS (Brave, 3 presets × light/dark × 375/768/1440: title serif AA 15.84–17.29 ·
  eyebrow/meta 4.94–6.53 incl. warm-dark · no overflow · empty-teaching vs empty-delegate vs error). **S2** (next) = the
  apps/web `VisionBoardCanvas`/`CalendarGridCanvas` compositions (type+convention; measure-driven reference tile; live
  hooks deferred to first consumer — fe-purposes / #19). Spec:
  `docs/specs/foundation/fe-codec-canvas-board/s1-canvas-view.md` (delivery: `docs/specs/foundation/fe-codec-canvas-board/delivery/`).
  **fe-calendar S1-chrome fix (2026-10-18) — two frame corrections the #19 Visual Gate surfaced:** (1) the **title pairs
  `lineHeight="$display"`** (was the 24px body line box → wrapped titles overlapped; see the Rules line-height entry);
  (2) the **`Actions` slot now `maxWidth:'100%'` + `flexWrap:'wrap'`** (keeps `flexShrink:0`) — before, wide action
  content (the calendar's 6-button 48px toolbar + nav at 768; quietDesk at 375) could never reflow and overflowed the
  page, breaking BR-CB-S1-12's own "no overflow at 375/768/1440". Consumers pass actions as the slot's DIRECT children
  so they wrap below each other. Visual Gate PASS (Victor-reviewed; calendar · CanvasView · CanvasEditor, 3 presets ×
  L/D × 375/768/1440: 0 page overflow · title 36/41 · no wrap overlap · axe 0).
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
  anchor edge; transform/opacity ONLY; transform-origin inline per side; reduced-motion `@media` — reading `motion.ts`),
  `toast-styles.ts` (enter = a mount `@keyframes` slide+fade; exit = a `[data-phase="exiting"]` transition; slide
  direction via inline `--vida-toast-from` per placement; transform/opacity ONLY; reduced-motion `@media`). Toast also
  has `internal/toast-store.ts` — the module-level external store + `toast` singleton (NOT a stylesheet; the
  imperative→React bridge, see the Toast paragraph). **`internal/data-view.tsx`** (UI-2 · V3) is the shared data-view
  spine — `ViewState` + `Message` + `resolveDataViewState` — consumed by list-view/gallery-view/timeline (see the
  timeline paragraph).
  **Rule:** a PROP-driven state (e.g. a
  danger border keyed to `invalid`) belongs in a Tamagui `variant`, NOT injected CSS — injected rules lose the
  specificity race against Tamagui's own atomic classes (learned at U3). Injected CSS is only for pseudo-class/`:has`
  state the styled component can't see.
- `hooks/` — `use-reduced-motion.ts` (**the codec `ReducedMotion` primitive**, fe-codec-patterns S2 RATIFY — gates the
  Tamagui `animation` prop; pairs with the `@media (prefers-reduced-motion)` convention in the `internal/*-styles.ts`).
  `icons/` — v1 stubs.
- **fe-codec-patterns** (the CODEC behavioural pattern-kit, LIF-211) — `components/empty-state.tsx`: **EmptyState** (S3),
  the teaching-invitation empty state (P5) — a presentational `role="group"` named by its `title` (which is ALSO a
  `role="heading"` + `aria-level`, default 2, `titleLevel`-overridable); slots `icon` (aria-hidden) · `children` (body) ·
  `action` (ui-1 Buttons) · `guidedSetup` (opt-in). Fills a data-view `empty?` slot (richer than the default `Message`);
  direct semantic tokens (preset-inheriting, B-codec-6); non-interactive (§VIII applies to the composed Buttons).
  `components/sync-status.tsx`: **SyncStatus** + **HonestProgress** (S4). SyncStatus = a calm `role="status"`
  `aria-live="polite"` pill (dot + label); **honest M1 union `'saved' | 'error'`** — copy says "Saved on this device",
  **never "synced to cloud", no "Saving…"** (writes are instant on-device; P4 copy-honesty). The cloud states
  (synced/pending/offline/conflict) are the **M3 forward seam**, NOT shipped. The dot uses the direct semantic SIGNAL
  tokens (`$colorSignalSuccess`/`$colorSignalDanger`, preset-invariant). HonestProgress = `role="progressbar"`,
  determinate (valuenow/min/max, fill via `transform: scaleX` — B12, never animated `width`) / indeterminate (valuenow
  OMITTED per APG + `aria-valuetext` + the `internal/sync-status-styles.ts` transform-only shimmer, reduced-motion `@media`).
  The 8-state machine itself lives in `apps/web` `state-conventions/interaction-state.ts` (S1 — it imports the
  `@vida/core` canon, so it can't live here per the Tamagui-only boundary).

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
- **⚠ Large type PAIRS its line-height — `fontSize="$<role>"` ⇒ `lineHeight="$<role>"` (fe-calendar S1-chrome fix,
  2026-10-18):** `@tamagui/core`'s `Text` never derives line-height from `fontSize` (its only variants are
  `numberOfLines`/`ellipsis`; no `SizableText` — core-only, ADR-001), so an unpaired `$display`/`$heading`/`$subheading`
  Text falls back to the font's `$true` = BODY line box (**24px**) — a 36px title that wraps overlaps itself (DS-4 §1.1-D
  fixed the `fontSize` convention only; its render assertion checked size, never line-height). The role-keyed `lineScale`
  already holds the paired values (`display` 41 · `heading` 31 · `subheading` 25) — just select them. design.md §III pairs
  every size with its leading. Never a raw px (`lineHeight={40}` breaks "semantic type scale only, no px", decisions.md:57).
  jsdom can't resolve the value: assert the `_lh-` atomic class equals a reference `lineHeight="$<role>"` Text's; measure
  px in the browser. Applied so far: the CanvasView title · the EntityView title (notes-rescope R1 DEV-R1-1 — its title
  row also wraps: `flexBasis:240` title group, the action slot drops below at 375). Remaining unpaired sites = recorded sibling fixes
  (`docs/specs/fixes/ds-type-lineheight-unpaired/`).
- JSX is `react-jsx` + `lib` includes `DOM` (this is the first real JSX in the package); `react` is a peer dep.

## Verify
`pnpm --filter @vida/ui typecheck && pnpm --filter @vida/ui build && pnpm --filter @vida/ui test` (317 tests).
Token visual: `pnpm preview:tokens` → `themes/preview.html`. Component Visual Gate: `pnpm storybook` (or
`build-storybook`) — the decorator paints the theme page surface ($colorSurfacePrimary: white light / navy dark) so
dark mode is reviewable (a bare-on-canvas label would otherwise be invisible on Storybook's white iframe).
