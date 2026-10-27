# U7 — Menu · forward spec (Step 1, document-first lite) → DS-5 contract → Tamagui v2

DS-5 primitive 7/10 (molecular, 4th/last molecular tier). A **floating command list** — the second floating
primitive after Select, reusing Select's portal + hand-rolled positioning, but with the **menu-button focus model**
(real roving DOM focus on items), NOT Select's combobox `aria-activedescendant`.
Implements `docs/specs/components/ds-5-primitive-contracts/menu.md` against Tamagui v2 in `@vida/ui`.
Gate: §XXVI per-component double-gate + component Visual Gate. Task: ui-1-vida-ui-primitives (LIF-86).

No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X → §10].
**Rev 1 (2026-08-08) — Step 1 forward capture** (intent · baseline · acceptance · flagged decisions).
**Rev 2 (2026-08-08) — Step 2 PLAN** (§12–§16): D1–D9 resolved against the shipped `select.tsx` (cited by line) + the
APG menu-button pattern; two net-new mechanisms (roving DOM focus D2; `cloneElement` trigger D9).
**Rev 3 (2026-08-08) — Gate 1 resolutions** (§17): independent critique REVISE → 1 blocker + 4 material + 3 minor, all
addressed in-place (D2/D3/D7/D8/D9 + §13 structure).
**Rev 4 (2026-08-08) — Gate 2**: /preflight **PASSED** (6 bounded assumptions; 1 critical fold: trigger Enter/Space
`preventDefault` to suppress the native-button double-fire) + gate-2 independent critique **SHIP** (all 8 Gate-1 fixes
verified correct in-text; `tabs.tsx:243-249` wrapping stepper confirmed; +transform-origin single-authority pin).
**Rev 5 (2026-08-08) — IMPLEMENTED + Visual Gate PASS** (§18). (The u6-tabs.md precedent — this file grows across the gates.)

---

## 1. Intent [FACT: menu.md §Intent]

A list of **actions/commands** opened from a trigger. Items _do_ things (fire `onSelect`, then the menu closes).

### What it is NOT [FACT: menu.md §Intent]

- **NOT value selection** → that is `Select` (U4), which commits a form value and keeps focus on the trigger.
- **NOT persistent navigation** → that is nav links / the router (UX-3).
- **NOT a modal task** → that is `Dialog` (U8).

## 2. Baseline (code-as-is — verified this session)

- **Build approach settled by the shipped pattern — no fork.** U1–U6 are hand-built on `@tamagui/core`
  (`styled()` + native `render:'<tag>'` + injected CSS for what `styled()` can't see; no new deps, web-first). A menu
  kit (`@tamagui/*` / Radix) is out of scope by definition — UI-1's reason to exist is to **build** these primitives.
  [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]] [FACT: U1–U6 pattern; ADR-001 §9]
- **Sub-theme already generated, not yet registered.** `light_Menu`/`dark_Menu` exist in `themes.ts:24-25` (keys:
  `background`, `border`, `itemBackgroundHover`, `itemText`, `radius`) but `tamagui.config.ts:12-27,74-89` wires only
  Button/Input/Checkbox/Select/Card/Tabs. → the U7 config change is **additive**: import + add `light_/dark_Menu` to
  the `themes:` object (the Select/Card/Tabs precedent). [FACT: themes.ts:24-25; tamagui.config.ts:12-27,74-89]
- **Component tokens** [FACT: tokens/component.json → menu]: `background → {color.surface.primary}` · `border →
{color.border.default}` · `itemText → {color.text.primary}` · `itemBackgroundHover → {color.surface.secondary}`
  (hover/roving highlight fill) · `radius → {radius.control}`. All five resolve to shipped DS-2 semantics (three-layer
  intact). **No component token for:** the **danger** item label (contract §41 reads `{color.signal.danger}` semantic
  directly), the **active/press** overlay (overlay opacity), **disabled** (reduced opacity), or the **empty** muted row
  (`itemText` @ muted = `$colorTextMuted` primitive/semantic). → same shape as Tabs (bg/text/hover only) → **DEF-U7-a**
  candidate (§9): DS may want a `menu.itemTextDanger` token so danger isn't a raw semantic reach. [FACT: component.json;
  menu.md §Visual States + :41]
- **Motion tokens typed + wired.** `motion.ts` exports `duration.{instant,fast,moderate,slow}` +
  `easing.{in,out,inOut,linear}` (DS-3 typed export; consumed by `select-styles.ts`/`tabs-styles.ts` injected CSS). The
  menu-open (`fast`/`out`, opacity + transform) reads straight from it. [FACT: motion.ts; select-styles.ts]
- **Reusable from Select (the floating precedent — verified via `select.tsx` + CLAUDE.md):**
  - Panel **portalled to `document.body`** (react-dom `createPortal`, `zIndex.dropdown`) re-wrapped in
    **`<Theme name="Menu">`** so the `_Menu` sub-theme crosses the portal (base light/dark crosses via `<html>`; the
    `name` scope does not). [FACT: CLAUDE.md → Select; select.tsx portal]
  - Hand-rolled `position:fixed` anchoring with a **single `top`** (Tamagui doesn't clear a stale inline `top` → top+
    bottom squished Select's panel) + flip + close on **Esc / outside-pointerdown / capture-phase scroll**. [FACT:
    CLAUDE.md → Select]
  - `render:'button'` for the semantic native trigger host; `focusVisibleStyle` 2px ring; injected-CSS-reading-`motion.ts`
    for the open animation + reduced-motion `@media`; `use-reduced-motion` hook if a JS branch is needed. [FACT: files]
  - `{...rest}` spread-first (N1); `NODE_ENV` dev-warn precedent; forwardRef; jsdom `*.test.tsx`. [FACT: button.tsx]
- **Divergence from Select (do NOT copy wholesale):** Select is a **combobox** — focus stays on the trigger,
  highlight via `aria-activedescendant`. Menu is a **menu button** — the panel + items take **real DOM focus** (roving
  tabindex), Esc **returns focus to the trigger**. See §6 + D2. [FACT: menu.md §A11y "roving", "focus returns to the
  trigger"; WAI-ARIA APG menu-button vs combobox]
- **Verify:** `pnpm --filter @vida/ui typecheck && build && test` (currently @vida/ui **136** tests). [FACT: CLAUDE.md]

## 3. API surface (ship verbatim — [[deliverable-is-the-doc-not-my-discretion]]) [FACT: menu.md:9-27]

```ts
export interface MenuItem {
  id: string
  label: React.ReactNode
  onSelect?: () => void
  disabled?: boolean
  intent?: 'default' | 'danger' // destructive items (narrower than the global intent set — correct for a menu)
  leading?: React.ReactNode // icon slot
}
export interface MenuProps {
  trigger: React.ReactNode // slot (usually a Button)
  items: ReadonlyArray<MenuItem>
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' // default 'bottom-start' [INTERP]
}
// forwardRef<HTMLButtonElement | View, MenuProps> (the trigger). Props exported.
```

- **Controlled + uncontrolled open** in one prop pair (`open` controlled; `defaultOpen` seeds internal state;
  `onOpenChange` always fires). The Select/Tabs controlled-or-uncontrolled precedent → §12 D1. [INTERP: menu.md API]
- **`trigger` is a slot ReactNode**, but the trigger must carry `role="button"`/`aria-haspopup="menu"`/`aria-expanded`
  - the open handler + the forwarded ref. How Menu attaches those onto a consumer-supplied node (`cloneElement` onto
    the slot vs wrapping it in a focusable host) is a **Step 2** structural decision — the contract is silent on the
    wiring. [UNKNOWN: menu.md gives `trigger: ReactNode` + `forwardRef→trigger` → §10 V; resolve in Step 2] → §12 D9.

## 4. Visual states (contract §Visual States — menu open/closed · per item) [FACT: menu.md:29-39]

- **default** — open, item resting: surface panel (`menu.background`, `menu.radius`, `zIndex.dropdown`), item text
  (`menu.itemText`).
- **hover** — pointer on an item: highlight fill (`menu.itemBackgroundHover`).
- **focus** — roving focus on an item: **highlight = focus** (a single item is focused at a time;
  `menu.itemBackgroundHover`). [FACT: menu.md:34]
- **active** — item pressed/activated: brief press feedback (overlay opacity) then **close**.
- **disabled** — item `disabled`: muted (reduced opacity), **skipped in keyboard nav**.
- **loading** — **N/A** (justified): a menu of commands does not load; a command may open a loading surface elsewhere.
- **error** — **N/A** (justified): items are actions, not validated inputs.
- **empty** — no items: a muted **"No actions"** placeholder row (`menu.itemText` @ muted), non-interactive.
- **Danger items:** `intent="danger"` → label in `{color.signal.danger}` (destructive affordance). [FACT: menu.md:41]

## 5. Motion (B12) [FACT: menu.md:43-48]

| Transition | Duration              | Easing       | Property                                                     |
| ---------- | --------------------- | ------------ | ------------------------------------------------------------ |
| menu open  | `duration.fast` (150) | `easing.out` | opacity + transform (scale/translateY from the trigger edge) |

- **Reduced-motion:** appears instantly. [FACT: menu.md:48; motion §IX]
- Injected CSS reading `motion.ts` (the Select panel-enter precedent); B12-legal (transform + opacity only). The
  transform-origin follows `placement` (top vs bottom → grows from the trigger edge). [INTERP: menu.md "from the
  trigger edge" + select-styles.ts] → §12.

## 6. Accessibility (contract §A11y — [FACT: engineering §XIV]) [FACT: menu.md:49-52]

- **Roles:** trigger `role="button"` + `aria-haspopup="menu"` + `aria-expanded`; panel `role="menu"`; items
  `role="menuitem"` (`menuitemcheckbox`/`radio` variants out of scope). `useId` id wiring (Select precedent).
- **Keyboard:** **Enter/Space/↓** open (focus **first** item); **↑/↓** roving; **Enter/Space** activate (→ `onSelect`
  - close); **Esc** closes; **type-ahead** (first-letter jump); **disabled items skipped**. **Focus returns to the
    trigger on close** (§XIV). [FACT: menu.md:51]
- **Focus model = roving DOM focus** (the menu-button pattern): the panel/items take real focus (only the active item
  is `tabIndex=0`, rest `-1`, `.focus()` moves down), NOT `aria-activedescendant`. This is the Select **divergence**
  (§2). [INTERP: menu.md "roving" + "focus returns to the trigger"; WAI-ARIA APG menu button] → §12 D2.
- Not a form control — no `aria-invalid`/`required`. [FACT: menu.md:52]

## 7. Performance budget [FACT: menu.md:54-55]

Panel **portals to body**; single active item focused at a time (no per-item focus churn); closes on select/outside-
click. Panel mounts only while open (enter animation on mount; the Select `.is-open` precedent). [INTERP: menu.md +
select.tsx]

## 8. Definition of Done (U7) — acceptance

- [ ] `MenuProps` + `MenuItem` = the contract interfaces **verbatim**; `intent` on items is `default|danger`.
- [ ] Controlled (`open`) + uncontrolled (`defaultOpen`) both work; `onOpenChange` always fires on open/close.
- [ ] Roles: trigger `button` + `aria-haspopup="menu"` + `aria-expanded`; panel `role="menu"`; items `role="menuitem"`
      — jsdom-asserted; Storybook `addon-a11y` (axe) clean, both themes.
- [ ] Keyboard: **Enter/Space/↓ open → focus first item**; ↑/↓ roving (**disabled skipped, WRAPS**); Enter/Space
      activate → `onSelect` + close; **Esc closes + returns focus to the trigger**; type-ahead (matches **string**
      labels only — inert, no error, when every label is a non-string `ReactNode`) — jsdom-asserted.
- [ ] **Roving DOM focus** (not `aria-activedescendant`): only the active item `tabIndex=0`; real `.focus()` moves.
- [ ] Item states: hover/focus highlight (`menu.itemBackgroundHover`); **danger** label tokened (`signal.danger`);
      disabled muted + skipped; **empty → "No actions" muted row**; loading/error justified **N/A**.
- [ ] Panel portals to body under `<Theme name="Menu">`; `zIndex.dropdown`; positioned per `placement` (4 corners) with
      flip; closes on select / outside-pointerdown / Esc / capture-scroll.
- [ ] Motion: open = opacity + transform (`fast`/`out`) from the trigger edge; **reduced-motion instant**; B12-legal.
- [ ] `menu.*` tokens resolve through the sub-theme; `light_/dark_Menu` registered in `tamagui.config.ts`.
- [ ] typecheck 2/2 · @vida/ui tests green · build + build-storybook ✓ · root 10/10; siblings unregressed.
- [ ] Component **Visual Gate PASS** (render + measure both themes): panel under the trigger per placement; item
      hover/focus highlight; danger label red; disabled muted + skipped; empty row; open animation (transform/opacity,
      measured); Esc returns focus to the trigger; **dark theme** correct — Victor confirms.

## 9. Decisions to make in Step 2 (planning) — flagged, not yet decided

- **D1** — controlled/uncontrolled **open** state machine (`open`/`defaultOpen`/`onOpenChange` semantics; Select/Tabs
  precedent).
- **D2** — **focus model**: roving DOM focus on `menuitem`s (the menu-button pattern) — panel takes focus on open,
  `.focus()` first item, ↑/↓ move real focus, Esc restores to trigger. Explicitly **not** Select's activedescendant.
- **D3** — **positioning for 4 placements** (`bottom-start|bottom-end|top-start|top-end`) + flip: generalize Select's
  single-`top` hand-rolled anchor to a start/end horizontal alignment + top/bottom vertical, with flip when clipped.
- **D4** — **open/close interaction wiring**: what opens (trigger click, Enter/Space/↓), what closes (select, Esc,
  outside-pointerdown, capture-scroll), and focus restoration to the trigger on every close path.
- **D5** — **type-ahead** over item labels (first-letter jump, skipping disabled — the Select closed-type-ahead
  precedent, adapted to roving focus).
- **D6** — **motion**: transform-origin per placement (grow from trigger edge); injected CSS reading `motion.ts`;
  reduced-motion instant. Panel enter on mount (Select `.is-open` flip).
- **D7** — **empty state**: render the "No actions" muted row when `items` is empty (non-interactive, still
  `role="menu"` with no `menuitem`s or a single `aria-disabled` note).
- **D8** — **danger item** rendering: label `{color.signal.danger}` — via a Tamagui `intent` variant (won as a variant,
  not injected CSS — [[injected-css-loses-to-tamagui-variants]]) vs a raw semantic reach; ties to DEF-U7-a.
- **D9** — **trigger slot wiring**: `cloneElement` onto the consumer's `trigger` node to inject
  `aria-haspopup`/`aria-expanded`/`onClick`/ref, vs wrapping it in a focusable host. Grounded in `forwardRef→trigger`.

## 10. Verify-at-impl (measure/confirm in-browser or against installed types — Step 2/impl)

- **[V1]** Panel portals + the `_Menu` sub-theme crosses the portal (`$background` resolves) — Visual Gate both themes.
- **[V2]** Roving DOM focus: ↑/↓ move real focus between `menuitem`s; disabled skipped; Esc returns focus to trigger —
  jsdom (`document.activeElement`) + a real keyboard pass in Storybook.
- **[V3]** `placement` (4 corners) anchors correctly + flips when clipped — Visual Gate (measure panel rect vs trigger).
- **[V4]** Open animation is transform/opacity only (B12), reduced-motion instant — compiled CSS + Visual Gate.
- **[V5]** `cloneElement` trigger wiring forwards aria + ref onto a consumer `<Button>` (V3 combobox-trigger precedent).
- **[V6]** Type-ahead jumps to the first matching enabled item — jsdom + Storybook.

## 11. Files (planned — confirmed in Step 2)

- `packages/ui/src/components/menu.tsx` — the primitive (trigger slot wiring + portalled `role="menu"` panel + items
  from `items` + open state machine + roving focus + keyboard + type-ahead + positioning).
- `packages/ui/src/components/menu.stories.tsx` — Visual-Gate surface: all applicable states × light｜dark; the 4
  placements; a danger item; a disabled item; an empty menu; leading icons; a long list.
- `packages/ui/src/components/menu.test.tsx` — jsdom: roles/aria wiring; open/close paths; roving focus + disabled-skip;
  Esc-returns-focus; Enter/Space activate → `onSelect` + close; type-ahead; controlled vs uncontrolled; empty row.
- `packages/ui/src/internal/menu-styles.ts` — **new** injected stylesheet: panel enter (opacity + transform from the
  trigger edge), item press overlay, reduced-motion `@media`; built from `motion.ts`.
- `packages/ui/src/tamagui.config.ts` — import + register `light_/dark_Menu` in `themes:`.
- `packages/ui/src/index.ts` — barrel: export `Menu` + `MenuProps` + `MenuItem`.
- `packages/ui/src/CLAUDE.md` — §XXIX currency (Menu + the menu-button roving-focus divergence from Select + test count).

---

# STEP 2 — PLAN (Rev 2) — gate-ready

Grounded on the shipped `select.tsx` (read this session, cited by line) + `button.tsx` + the WAI-ARIA APG **menu
button** pattern. The floating scaffolding (portal, `<Theme>` re-wrap, single-`top` positioning, dismiss handlers,
type-ahead, enabled-nav helpers) is the **Select mechanism reused**; the two net-new mechanisms are **roving DOM focus**
(D2) and **the `cloneElement` trigger slot** (D9), both DOM-standard → verified in-browser at the Visual Gate + jsdom.

## 12. Decisions resolved (D1–D9 → grounded)

- **D1 — controlled/uncontrolled `open` = the Select `value` mechanism, applied to a boolean.**
  `isOpenControlled = open !== undefined`; `[innerOpen, setInnerOpen] = useState(defaultOpen ?? false)`;
  `isOpen = isOpenControlled ? open : innerOpen`. A single `setOpenState(next)` helper sets `innerOpen` only when
  uncontrolled and **always** fires `onOpenChange?.(next)` (both modes) — the exact shape of `select.tsx:188-196`
  (`commit`), transposed from a value to a boolean. Every open/close path (§D4) routes through `setOpenState`.
  [FACT: select.tsx:136-138,188-196.]

- **D2 — focus model = roving DOM focus on `menuitem`s (the menu-button pattern), NOT `aria-activedescendant`.**
  This is the deliberate divergence from Select (a combobox). Mechanism:
  - `itemEls = useRef<(HTMLElement|null)[]>([])` (the `select.tsx:156` option-ref array, narrowed via the
    `select.tsx:404-406` callback-ref pattern). Each `menuitem` is `tabIndex={i === activeIndex ? 0 : -1}` (roving).
  - **On open**, `activeIndex` is seeded (first-enabled for Down/Enter/Space/**click**; last-enabled for ArrowUp), and a
    **`useLayoutEffect` on `[isOpen, activeIndex]`** calls `itemEls.current[activeIndex]?.focus?.()` (optional-call,
    jsdom-guarded like `scrollIntoView?.` at `select.tsx:303`) → real DOM focus lands on the item. Arrow keys move
    `activeIndex`; the same effect re-focuses. So `document.activeElement` is always the active `menuitem` while open.
  - **`.focus?.()` also `scrollIntoView?.({block:'nearest'})`** for long lists (the `select.tsx:302-304` effect).
  - **No `aria-activedescendant`** anywhere. The panel/menu is NOT `tabIndex`-focusable itself; focus lives on items.
  - **Highlight is driven by `activeIndex` STATE, NOT `:focus-visible` [Gate1 #2].** `:focus-visible` is a browser
    heuristic that is NOT reliably applied to a **programmatically** focused element — on open-by-pointer (trigger
    _click_ → seed → `.focus()`), the last modality was a pointer, so Chromium may not paint `:focus-visible` on the
    first item and the required "highlight = focus" (menu.md:34) would be **absent on the most common open path**. So the
    fill is a Tamagui variant keyed to `i === activeIndex` (the `select.tsx:407` `.is-active` + `select-styles.ts`
    precedent — a state class, jsdom-assertable), **not** `focusVisibleStyle`. `focusVisibleStyle` carries ONLY the 2px
    outline ring. [FACT: :focus-visible programmatic-focus heuristic; select.tsx:407; menu.md:34.]
    [FACT: menu.md:34,50-51 "roving", "focus returns to the trigger"; WAI-ARIA APG menu button; select.tsx:156,302-304,404-406.]

- **D3 — positioning: generalize Select's single-`top` two-phase anchor to 4 placements + flip + clamp.**
  `PanelPos = { left: number; top: number; minWidth: number; maxWidth: number; maxHeight: number }` — the
  `select.tsx:124` shape, still a **single `top`** (never top+bottom — Tamagui keeps a stale inline `top`,
  `select.tsx:122-124`). Two phases (the Select structure, `select.tsx:198-212` + `271-298`):
  1. **On open** (`openMenu`): read `trigger.getBoundingClientRect()`; provisional pos from `placement`'s **vertical**
     side (bottom → `top = rect.bottom + gap`; top → measured after mount) and **start** horizontal (`left = rect.left`).
     `minWidth = 0` (a menu hugs its content, unlike Select's `minWidth = rect.width`) — [INTERP: a command menu is
     content-sized, not trigger-width-matched]; `maxWidth = vw - 8 - left`.
  2. **`useLayoutEffect` on `[isOpen, placement]`**: measure `panel.offsetWidth/Height`, then:
     - **vertical flip:** bottom placement whose `natural > spaceBelow && spaceAbove > spaceBelow` flips to top (and
       symmetric) — the `select.tsx:283-296` logic, parameterized by the requested side.
     - **horizontal align:** `start` → `left = rect.left`; `end` → `left = rect.right - panelWidth`. Then **clamp**
       `left ∈ [8, vw - panelWidth - 8]` (the `select.tsx:289` clamp, both edges).
     - `maxHeight = min(<cap>, openUp ? spaceAbove : spaceBelow)`; set `entered=true` → triggers the enter transition.
       `<cap>` = **none by default** (a menu is short); if it exceeds viewport, `maxHeight` + `overflowY:auto` (Select's 320
       cap pattern is available if needed). [FACT: select.tsx:122-124,198-212,271-298.] → D3 is Select's math, 4-corner-ized.
  - **No first-paint flash for `end` placement [Gate1 #6].** Phase 1 renders start-aligned (`left = rect.left`) at
    `opacity:0`; phase 2 corrects `left` for `end`. Because phase 2 is a **`useLayoutEffect`** it runs **synchronously
    before the browser paints** (its whole purpose vs `useEffect`) — the provisional (wrong-x) frame is _never painted_,
    so there is no flash **even under reduced-motion** (where `.is-open` sets `opacity:1` instantly). The `opacity:0`→
    `is-open` gate is belt-and-suspenders; the pre-paint layout effect is the real guarantee. The content-hug width is
    identical in both phases (content doesn't change), so the measured `offsetWidth` equals the painted width. Confirm at
    the Visual Gate specifically under reduced-motion (V4). [FACT: React useLayoutEffect-before-paint; select.tsx:271-298.]

- **D4 — open/close interaction wiring (every close restores focus to the trigger where APG requires).**
  | Path | Trigger | Effect |
  |------|---------|--------|
  | open | trigger click / Enter / Space / ↓ | `openMenu(firstEnabled)`; ↑ → `openMenu(lastEnabled)` |
  | activate | Enter / Space / click on an item | `item.onSelect?.()` → `setOpenState(false)` → **`trigger.focus()`** |
  | dismiss | **Esc** | `setOpenState(false)` → **`trigger.focus()`** (APG: Esc returns focus — `select.tsx:249-252`) |
  | dismiss | outside pointerdown | `setOpenState(false)` (focus follows the click; do NOT force it back — APG) |
  | dismiss | capture-scroll / resize | `setOpenState(false)` (`select.tsx:314-315`) |
  | dismiss | **Tab / Shift+Tab** | `setOpenState(false)`, let native Tab move focus (`select.tsx:253-254`) |
  The outside-pointerdown / capture-scroll / resize listeners are the `select.tsx:307-324` effect **verbatim** (guards on
  `triggerRef`/`panelRef` `.contains`). [FACT: select.tsx:249-254,307-324; menu.md:51.]

- **D5 — type-ahead over item labels, roving-focus variant.** The `select.tsx:262-268` buffer (accumulate chars, reset
  ~500ms, case-insensitive prefix over **enabled** items) — but the match sets `activeIndex` **and focuses** the item
  (D2) rather than `aria-activedescendant`. `label` may be a `ReactNode`, so type-ahead matches only items whose
  `label` is a `string` (guard `typeof it.label === 'string'`); non-string labels are skipped (documented). [FACT:
  select.tsx:262-268; menu.md:51 "type-ahead".] → dev nicety, not a correctness gate.

- **D6 — motion: injected CSS reading `motion.ts`, transform-origin per placement (B12).** New `internal/menu-styles.ts`
  (the `select-styles.ts` precedent): `.vida-menu-panel { opacity:0; transform: translateY(±4px) scale(0.98);
transition: opacity <fast> <out>, transform <fast> <out>; transform-origin: <edge> }` and `.vida-menu-panel.is-open {
opacity:1; transform:none }`. **Sign + origin by placement:** bottom → `translateY(-4px)`, `transform-origin: top`;
  top → `translateY(4px)`, `transform-origin: bottom` (grows "from the trigger edge", menu.md:46). The `is-open` class
  flips post-mount via the `entered` flag (`select.tsx:143,297,376`). Reduced-motion `@media (prefers-reduced-motion:
reduce)` → `transition:none` (instant). Item hover/press/focus fills are **instant** state swaps (B12-legal). [FACT:
  select-styles.ts; motion.ts; menu.md:43-48.]

- **D7 — empty state: a DISABLED "No actions" `menuitem` inside `role="menu"` [Gate1 #4].** When `items.length === 0`,
  the panel renders (`role="menu"`, `aria-label` from the accessible name) containing a single **`role="menuitem"
aria-disabled="true"`** row with muted text "No actions" (`$colorTextMuted`). NOT `aria-hidden` on a `View`: a
  `role="menu"` with zero `menuitem` descendants + only `aria-hidden` content is an empty-composite-widget that axe /
  screen readers flag (and DoD requires axe-clean), whereas a real disabled, non-actionable `menuitem` is announceable
  and matches the contract's "placeholder **row**" (menu.md:39). It is `tabIndex=-1`, skipped by nav (it's disabled).
  Keyboard: arrows/type-ahead no-op (no enabled items → `firstEnabled() === -1`, helpers return `-1`/stay); Esc closes.
  With nothing focusable, focus stays on the trigger; dev-warn #3 fires (empty menu = usually a bug). [FACT: menu.md:39;
  select.tsx:178-186 helpers return -1; WAI-ARIA empty-menu axe.]

- **D8 — danger item = a Tamagui `intent` VARIANT on the LABEL `<Text>`, not the row `<View>` [Gate1 #1].** A Tamagui
  `<Text>` that sets its own `color` does **not** inherit the parent `View`'s `color` — so putting `color:
'$colorSignalDanger'` on the row `View` while the label is a child `<Text color="$itemText">` would render the label
  **primary, not red** (exactly why `button.tsx:66-78` colors `ButtonText` itself and `select.tsx:415` sets `color` on
  the option's own `<Text>`). So the danger decision lives on a **`styled(Text)` item label** with a variant:
  `MenuItemLabel = styled(Text, { name:'Menu', color:'$itemText', variants: { intent: { default:{}, danger:{
color:'$colorSignalDanger' } } } })`. The row `View` keeps only `disabled` (opacity) + the `is-active`/hover FILL
  variants (D2). `$colorSignalDanger` resolves under `<Theme name="Menu">` via the base-theme cascade (verified:
  themes.ts `colorSignalDanger → danger500`; Select uses base `$colorTextMuted`/`$colorFocusRing` under `name:'Select'`
  the same way). Prop-driven color MUST be a variant, not injected CSS — [[injected-css-loses-to-tamagui-variants]] (the
  U3 lesson), on the RIGHT element. [FACT: button.tsx:66-78; select.tsx:415; themes.ts colorSignalDanger.] → **DEF-U7-a** (§15).

- **D9 — trigger slot = `React.cloneElement` injecting aria + handlers + a composed ref onto the consumer's element.**
  The contract's `trigger: ReactNode` is "usually a Button" and `forwardRef→trigger` — so Menu does NOT own a host
  element; it decorates the consumer's. Mechanism (the Radix `asChild`/`Slot` pattern, minimal form):
  - Require a **single valid element**: `isValidElement(trigger)` else **dev-warn #1** + render `trigger` raw (no
    wiring) — a fragment/string/array can't receive a ref or aria. [FACT: menu.md:26 "usually a Button".]
  - `cloneElement(trigger, { ref: composedTriggerRef, 'aria-haspopup': 'menu', 'aria-expanded': isOpen, 'aria-controls':
isOpen ? menuId : undefined, onClick: compose(trigger.props.onClick, toggle), onKeyDown: compose(trigger.props.
onKeyDown, onTriggerKeyDown) })`. `compose(theirs, ours)` calls the consumer's handler first, then ours unless
    `defaultPrevented` (standard event-merge). Button spreads `{...rest}` FIRST so these computed a11y props win
    (`button.tsx:186,191`) and forwards `ref` to the native `<button>` (`button.tsx:151` forwardRef + render:'button').
  - **`composedTriggerRef`** merges three refs: Menu's internal `triggerRef` (for positioning/focus), the **forwarded**
    `ref` (MenuProps forwardRef → the trigger, contract §26), and the consumer element's **own** ref if present. The
    monorepo is **React 19 exclusively** (CLAUDE.md), where an element's ref is a regular prop read at
    **`trigger.props.ref`** — read that **one** path only, NOT a `props.ref ?? (trigger as any).ref` fallback (a
    both-paths read risks a double-assign under any React-18 interop — [Gate1 #8]). A `mergeRefs(...)` util assigns all
    three (each: call if fn, else `.current =`). [FACT: button.tsx:151,186,191; React 19 ref-as-prop; CLAUDE.md React 19.]
    → **[V8]:** jsdom-assert all three receive the node; context7 only if the `props.ref` read is `undefined`. Do NOT set
    `role="button"` (a `<Button>` already is one; forcing it onto a non-button trigger is the consumer's contract — documented).

## 13. Structure (the gate target)

```
<>
  {cloneElement(trigger, {                          // D9 — decorate the consumer's element (usually <Button>)
     ref: composedTriggerRef, 'aria-haspopup':'menu', 'aria-expanded':isOpen,
     'aria-controls': isOpen ? menuId : undefined,
     onClick: compose(trigger.props.onClick, toggle),
     onKeyDown: compose(trigger.props.onKeyDown, onTriggerKeyDown) })}

  {isOpen && pos && typeof document !== 'undefined' && createPortal(
    <Theme name="Menu">                             {/* re-establish the _Menu scope across the portal (select.tsx:373) */}
      <MenuPanel ref={panelRef} className={entered ? 'vida-menu-panel is-open' : 'vida-menu-panel'}
                 role="menu" id={menuId} aria-label={accessibleName['aria-label']}
                 aria-labelledby={accessibleName['aria-labelledby']}
                 position="fixed" zIndex="$dropdown" backgroundColor="$background"
                 borderWidth={1} borderColor="$border" borderRadius="$radius" paddingVertical="$4"
                 style={{ left:pos.left, top:pos.top, minWidth:pos.minWidth, maxWidth:pos.maxWidth,
                          maxHeight:pos.maxHeight, overflowY:'auto', overflowX:'hidden',
                          transformOrigin: originFor(placement) }}   // SINGLE origin authority = inline style (from the RESOLVED/flipped placement); menu-styles.ts sets NO transform-origin [gate2 polish #3]
                 onKeyDown={onMenuKeyDown}>
        {items.length === 0
          ? <MenuItemRow role="menuitem" aria-disabled="true" tabIndex={-1} disabled     // D7 empty = a DISABLED menuitem [Gate1 #4]
              ><MenuItemLabel>No actions</MenuItemLabel></MenuItemRow>
          : items.map((it, i) => (
              <MenuItemRow key={it.id} ref={setItemRef(i)}                 // callback ref → itemEls[i] (HTMLElement)
                 role="menuitem" id={itemId(i)}
                 tabIndex={i === activeIndex ? 0 : -1}                     // ROVING DOM focus (D2), not activedescendant
                 aria-disabled={it.disabled || undefined}
                 active={i === activeIndex}                                // FILL variant off state, NOT :focus-visible [Gate1 #2]
                 disabled={it.disabled}                                    // muted-opacity variant
                 onPointerMove={() => !it.disabled && focusItem(i)}        // hover follows pointer (select.tsx:412)
                 onClick={() => !it.disabled && activate(i)}>
                {it.leading != null && <View className="vida-menu-leading">{it.leading}</View>}
                <MenuItemLabel intent={it.intent ?? 'default'} numberOfLines={1}>{it.label}</MenuItemLabel>
              </MenuItemRow>                                               {/* danger color on the LABEL (D8 [Gate1 #1]) */}
            ))}
      </MenuPanel>
    </Theme>, document.body)}
</>
```

- **Styled defs:** `MenuItemRow = styled(View, { name:'Menu', flexDirection:'row', alignItems:'center', gap:'$8',
cursor:'pointer', paddingVertical:'$8', paddingHorizontal:'$12', borderRadius:'$radius',
focusVisibleStyle:{ outlineColor:'$colorFocusRing', outlineWidth:2, outlineStyle:'solid', outlineOffset:-2 },
hoverStyle:{ backgroundColor:'$itemBackgroundHover' }, variants: { active:{ true:{ backgroundColor:'$itemBackgroundHover' } },
disabled:{ true:{ opacity:0.5, cursor:'not-allowed', hoverStyle:{ backgroundColor:'transparent' } } } } })` — the
  **row layout is explicit** (the `select.tsx:89-98` option precedent) [Gate1 #5]; the FILL is the `active` variant
  (state, D2) + `hoverStyle` (pointer), both **instant** swaps (B12-legal); `focusVisibleStyle` carries ONLY the outline
  ring. `MenuItemLabel = styled(Text, { name:'Menu', fontFamily:'$body', color:'$itemText', variants:{ intent:{
default:{}, danger:{ color:'$colorSignalDanger' } } } })` (D8).
- **`toggle` seeds `activeIndex` [Gate1 #3]:** `toggle = () => isOpen ? close() : openMenu(firstEnabled())` — click-open
  routes through the **same seeded `openMenu`** as the keyboard paths (a bare boolean flip would leave `activeIndex=-1`
  and the layout effect would focus nothing). `openMenu(active)` sets `activeIndex=active`, computes provisional `pos`,
  `setOpenState(true)`; the `[isOpen,activeIndex]` effect then `.focus()`es item `active`. So **every** open path (click,
  Enter, Space, ↓) lands focus on the first enabled item; ↑ lands on the last. [FACT: menu.md:51; select.tsx:198-212,326-330.]
- **`activate(i)`** = `items[i].onSelect?.()` → `setOpenState(false)` → `triggerRef.current?.focus()` (D4 activate row).
- **`focusItem(i)`** = `setActiveIndex(i)` (the layout effect does the actual `.focus()` — single focus authority, D2).
- **`onTriggerKeyDown`** (on the trigger, D4 open row): `ArrowDown`/`Enter`/`Space` → `preventDefault` +
  `openMenu(firstEnabled())`; `ArrowUp` → `preventDefault` + `openMenu(lastEnabled())`. Other keys fall through (native).
  - **`preventDefault` on Enter/Space is REQUIRED, not cosmetic [preflight fold].** The trigger is _usually_ a native
    `<button>` (a `<Button>`, `render:'button'`), which synthesizes a **`click` on Enter-keydown / Space-keyup**. Without
    `preventDefault` in `onTriggerKeyDown`, Enter would fire BOTH my keydown handler (→ `openMenu`) AND the native click
    (→ my composed `onClick` → `toggle` → immediately close) = a double-fire that opens-then-closes. `preventDefault` on
    keydown suppresses the native activation, so exactly one path runs (open). [FACT: native button Enter/Space →
    synthetic click; `preventDefault` suppresses it.] jsdom-assert: Enter on the trigger opens exactly once.
- **`onMenuKeyDown`** (on the panel): `ArrowDown`→`focusItem(stepWrap(activeIndex,1))`; `ArrowUp`→`stepWrap(-1)`;
  `Home`→`firstEnabled`; `End`→`lastEnabled`; `Enter`/`Space`→`activate(activeIndex)`; `Escape`→ close + `trigger.focus()`;
  `Tab`→ close (no trap); single printable char → type-ahead (D5). All nav keys `preventDefault`.
- **`stepWrap` WRAPS [Gate1 #7]:** impl the **Tabs-style modulo-wrapping** `stepIdx` (`tabs.tsx` wrapping helper), NOT a
  copy of Select's no-wrap `step` (`select.tsx:183-186`, which returns `from` at the ends). A menu is a short closed
  ring where wrap is expected (APG menu). `firstEnabled`/`lastEnabled` are Select's verbatim; only the stepper wraps —
  do not copy-paste Select's `step`. [INTERP: APG menu wraps vs listbox no-wrap; tabs.tsx wrap precedent.]
- **Tokens under `name:'Menu'`:** `$background` (panel), `$border`, `$itemText` (label default), `$itemBackgroundHover`
  (the `active` + hover FILL), `$radius`. Danger label = base `$colorSignalDanger` (cascade, D8). Outline ring = base
  `$colorFocusRing` via `focusVisibleStyle`. **No `:focus-visible` FILL** — the highlight is the `active`-state variant
  ([Gate1 #2]).
- **Accessible name:** the panel needs `aria-label`/`aria-labelledby` (menu.md A11y). Menu accepts them via `...rest`
  (the `select.tsx:159-173` pattern) + a dev-warn if absent → **dev-warn #2**.

## 14. Dev-warns (NODE_ENV-guarded, DCE'd in prod — Button/Select precedent, `select.tsx:165-173`)

1. `trigger` is not a valid single element (`!isValidElement`) — can't receive ref/aria; rendered raw, unwired.
2. No accessible name (`aria-label`/`aria-labelledby`) for the menu panel.
3. `items` is empty (renders the "No actions" row — usually a bug at the call site).
4. Two `items[].id` collide (ids must be unique for `itemId(i)` / test targeting) — [INTERP: `MenuItem.id` is the key].

## 15. Deferrals + defects (bounded, flagged — not silent)

- **DEF-U7-a (for DS) — no `menu.itemTextDanger` component token.** Danger reads the base semantic `{color.signal.
danger}` directly (D8), breaking the three-layer "item colors come from a `menu.*` token" convention that
  `itemText`/`itemBackgroundHover` follow. DS may add `menu.itemTextDanger → {color.signal.danger}`. (Parallel to the
  Tabs/Select token-gap DEFs.) [FACT: component.json menu has no danger key; menu.md:41 reaches the semantic.]
- **DEF-U7-b (for DS) — no `menuitemcheckbox`/`menuitemradio`.** The contract fences them out of scope (menu.md:50); a
  stateful/checkable menu is a later DS extension. Not built.
- **DEF-U7-c (verify at impl) — submenus / nested menus** are not in the API (`items` is flat). Out of scope; a nested
  `Menu` is a future composition. [FACT: menu.md API is a flat `items` array.]

## 16. Verify-at-impl (adds to §10)

- **[V7]** `compose(theirs, ours)` event-merge respects `defaultPrevented` (consumer can veto open) — jsdom.
- **[V8]** `mergeRefs` assigns internal + forwarded + the consumer's own trigger ref (React 19 `props.ref`) — jsdom
  (assert all three receive the node); context7 the ref-as-prop read if `undefined`.
- **[V9]** Focus authority is single: only the `[isOpen,activeIndex]` layout effect calls `.focus()` (no double-focus
  race between open-seed and arrow) — jsdom (`document.activeElement` after each key).

## 17. Gate 1 — independent critique resolutions (REVISE → all addressed)

Fresh adversarial subagent; verdict **REVISE (1 blocker + 4 material + 3 minor)**. It independently verified the token
cascade under `name:'Menu'` (Select uses base tokens the same way), every cited `select.tsx` line, the Button
`{...rest}`/ref passthrough (cloneElement-onto-`<Button>` wires correctly), `zIndex.dropdown`, B12 legality, the
single-`top` discipline, and the verbatim API. Resolutions (all in-plan, Rev 3):

- **B(#1) — danger color on the wrong element** → **D8** rewritten: danger is a variant on a `styled(Text)`
  **`MenuItemLabel`**, not the row `View` (a `<Text>` with its own `color` doesn't inherit the View's — `button.tsx:66-78`/
  `select.tsx:415` precedent). §13 label is now `<MenuItemLabel intent=…>`.
- **M(#2) — `:focus-visible` highlight is racy for programmatic focus** → **D2** + §13: the highlight FILL is an
  `active`-state Tamagui variant keyed to `i === activeIndex` (the `select.tsx:407` `.is-active` precedent, jsdom-
  assertable), NOT `focusVisibleStyle`; the ring stays on `:focus-visible`. Removes the pointer-open-no-highlight bug.
- **M(#3) — open-on-click didn't seed `activeIndex`** → §13 `toggle` now routes click-open through the seeded
  `openMenu(firstEnabled())` (not a bare boolean flip), so every open path lands focus on an item.
- **M(#4) — empty row `aria-hidden` in `role="menu"` = axe risk** → **D7** + §13: the empty row is a real
  `role="menuitem" aria-disabled="true"` (announceable, axe-clean), matching the contract's "placeholder row".
- **M(#5) — row layout omitted + type-ahead-inert undocumented** → §13 `MenuItemRow` styled def now spells out the
  `flexDirection:'row'`/`alignItems:'center'` layout (select.tsx:89-98); §8 DoD documents type-ahead is string-only + inert on all-non-string labels.
- **m(#6) — `end` first-paint flash under reduced-motion** → **D3**: clarified phase-2 is a `useLayoutEffect` (runs
  before paint), so the provisional start-aligned frame is never painted even under reduced-motion; opacity gate is
  belt-and-suspenders; verify at V4.
- **m(#7) — `step` wrap copy-paste trap** → §13: impl the **Tabs** modulo-wrapping `stepWrap`, explicitly NOT Select's
  no-wrap `step`; only `firstEnabled`/`lastEnabled` are Select-verbatim.
- **m(#8) — `mergeRefs` double-assign under React-18 interop** → **D9**: read the consumer ref from **one** path
  (`trigger.props.ref`, React 19 exclusive per CLAUDE.md), no `?? (trigger as any).ref` fallback.

**Rev 3 (2026-08-08) — Gate 1 resolutions (§17 above): all 8 addressed in-place. Next: Gate 2 — /preflight + gate-2 critique.**

## 18. Build result + gates (2026-08-08) — IMPLEMENTED, Visual Gate PASS

Files: `components/menu.tsx` (+ `MenuItem`/`MenuProps`) · `menu.stories.tsx` · `menu.test.tsx` (**24 jsdom**) ·
`internal/menu-styles.ts` (**new** — panel enter opacity+transform from the trigger edge, reduced-motion, reading
`motion.ts`) · `tamagui.config.ts` (+`light_/dark_Menu`) · `index.ts` (barrel: `Menu`, `MenuProps`, `MenuItem`).
**No pipeline touch** — `light_/dark_Menu` were already generated by DS-5. typecheck 2/2 · @vida/ui **160/160** ·
build + build-storybook ✓ · root typecheck **10/10**. Siblings unregressed.

Gate trail: Step 1 forward spec → Step 2 PLAN (D1–D9) → **Gate 1** independent critique REVISE (1 blocker + 4 material

- 3 minor) → all fixed (Rev 3, §17) → **Approval 1** → **Gate 2** /preflight **PASSED** (1 critical fold: trigger
  Enter/Space `preventDefault`) + gate-2 critique **SHIP** → **Approval 2** → implemented → **Component Visual Gate PASS**
  (Victor confirmed, both themes).

**Impl bug caught by jsdom (the focus-authority test earned its keep):** on open, React commits TWICE before the panel
is focusable — first with `pos=null` (panel unrendered), then after the seed effect sets `pos`. The roving-focus + the
refine layout effects didn't re-run across that second commit, so the first `.focus()` no-op'd and never re-fired
(2 focus tests red). Fix: thread `pos`/`entered` through the effect deps so **reveal → measure → focus** chains
correctly. [[portal-open-focus-needs-a-mount-gated-effect-dep]] — carries to U8 Dialog / U9 Popover (same open-then-focus).

**Visual Gate — measured in real Brave** (Playwright; the flip/slide/colour are unverifiable in jsdom, `getBoundingClientRect`=0):

- **B12 motion:** panel `transition: opacity 0.15s cubic-bezier(0,0,0.3,1), transform 0.15s cubic-bezier(0,0,0.3,1)` —
  **transform + opacity ONLY** (no bg/color/width). ✓
- **Danger distinct:** light label `rgb(239,68,68)` vs default `rgb(15,23,42)`; dark `rgb(239,68,68)` vs `rgb(248,250,252)`.
- **Roving highlight = active item** (first item focused on open; fill light `rgb(248,250,252)` / dark `rgb(30,41,59)`);
  2×ArrowDown = `Open→Rename→[skip disabled Share]→Remove` (disabled skipped). **Esc returns focus to the trigger.**
- **Placement:** `bottom-start` under+left-aligned; `bottom-end` right-aligns (menu right edge = trigger right edge);
  `top-start` opens **upward** (`data-side:"top"`) and **flips** to bottom when the space above is too small. Both themes.
- **Empty:** a single disabled `role="menuitem"` "No actions" row (`aria-disabled=true`), axe-clean.

**Deferrals stand (for DS):** DEF-U7-a (`menu.itemTextDanger` component token — danger reaches the raw semantic) ·
DEF-U7-b (`menuitemcheckbox`/`radio` out of scope) · DEF-U7-c (submenus/nested — flat `items`) · DEF-U7-d (contract
silent on the menu's accessible-name source → Menu accepts `aria-label`/`aria-labelledby`). **NEXT = U8 Dialog**
(`dialog.md`; first overlay/organism — cites `zIndex.overlay`/`zIndex.modal`; focus TRAP + scrim; reuse `light_/dark_Dialog`).
