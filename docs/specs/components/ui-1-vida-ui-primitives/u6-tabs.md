# U6 — Tabs · forward spec (Step 1, document-first lite) → DS-5 contract → Tamagui v2

DS-5 primitive 6/10 (molecular, 3rd molecular tier). The **B12 showcase primitive** — its selection indicator
is the reference implementation of B12-legal motion (animate `transform` only, never `left`/`width`/`box-shadow`).
Implements `docs/specs/components/ds-5-primitive-contracts/tabs.md` against Tamagui v2 in `@vida/ui`.
Gate: §XXVI per-component double-gate + component Visual Gate. Task: ui-1-vida-ui-primitives (LIF-86).

No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X → §10].
**Rev 1 (2026-08-08) — Step 1 forward capture** (intent · baseline · acceptance).
**Rev 2 (2026-08-08) — Step 2 PLAN** (§12–§14 below): D1–D7 resolved, the mechanism designed against the shipped
Select precedent, the gate-ready structure. Tamagui behaviors are grounded on the **already-context7-verified U4
Select code** (`select.tsx`), not re-queried; the only new mechanisms are DOM-standard (offset measurement,
`ResizeObserver`) → verified in-browser at the Visual Gate (V1). This file is the artifact that grows across the
gates (the U5 `u5-card.md` precedent).
**Rev 3 (2026-08-08) — Gate 1 resolutions** (§17): independent critique REVISE → 2 blockers + 3 material + 4 minor,
all addressed in-place (D2/D3/D4/D5, dev-warns, M1 relabel). **Next: Gate 2 — /preflight.**

---

## 1. Intent [FACT: tabs.md §Intent]

Switch between **peer views of the same content region**. Exactly one panel visible at a time; the tab strip is a
persistent control surface, not a route.

### What it is NOT [FACT: tabs.md §Intent]

- **NOT page navigation** → that is nav links / the router (UX-3), not Tabs.
- **NOT a sequential flow** → that is a `Stepper` (does not exist; out of scope).
- **NOT a menu of actions** → that is `Menu` (U7).

## 2. Baseline (code-as-is — verified this session)

- **Build approach settled by the shipped pattern — no fork.** U1–U5 are hand-built on `@tamagui/core`
  (`styled()` + native `render:'<tag>'` element + injected CSS for what `styled()` can't see; **no new deps**,
  web-first). ADR-001 §9 names _Tamagui_ and core IS Tamagui; UI-1's reason to exist is to **build** these
  primitives. A tabs kit (`@tamagui/tabs` / Radix) is out of scope by definition.
  [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]] [FACT: U1–U5 pattern; ADR-001 §9]
- **Sub-theme already generated, not yet registered.** `light_Tabs`/`dark_Tabs` exist in `themes.ts:33-34`
  (keys from `component.json.tabs`: `text`, `textActive`, `indicator`, `border`) but `tamagui.config.ts` wires
  only Button/Input/Checkbox/Select/Card (`:15-24`, `:75-84`). → the U6 config change is **additive**: import +
  add `light_/dark_Tabs` to the `themes:` object. [FACT: themes.ts:33-34; tamagui.config.ts:15-24,75-84]
- **Component tokens** [FACT: component.json.tabs]: `text → {color.text.muted}`, `textActive →
{color.text.primary}`, `indicator → {color.brand.primary}`, `border → {color.border.default}` (the 1px
  tablist baseline rule). All four resolve to shipped DS-2 semantic tokens (three-layer intact). **No hover/
  disabled/focus component token** — hover = an overlay opacity, focus = `color.focus.ring` (primitive), disabled
  = reduced opacity (contract §Visual States). [FACT: component.json.tabs; tabs.md §Visual States]
- **Motion tokens are typed + wired.** `motion.ts` exports `duration.{instant,fast,moderate,slow}` +
  `easing.{in,out,inOut,linear}` (the DS-3 typed export; consumed by `select.tsx`/`card-styles.ts` injected CSS).
  Tabs' indicator (`moderate`/`inOut`) + panel swap (`fast`/`out`) read straight from it. [FACT: motion.ts; select-styles.ts]
- **Reusable, unchanged (verified against the real code):**
  - `render:'button'` for a semantic native button host (`button.tsx:20`, the trigger in `select.tsx`) → each **tab**.
  - `focusVisibleStyle` 2px ring (`button.tsx:30-35`, `select.tsx`, emits `:focus-visible`, pointer-suppressed) → the tab ring.
  - injected-CSS-reading-`motion.ts` for animation the styled layer can't express (`select-styles.ts`, `card-styles.ts`)
    → the indicator transform transition + panel opacity transition + reduced-motion `@media`.
  - `use-reduced-motion` hook (`hooks/use-reduced-motion.ts`) if a JS branch is needed (indicator jump vs animate).
  - a `hoverStyle`/`variant` for hover label-strengthen (`select.tsx` hover → `$colorTextMuted`), won as a Tamagui
    variant not injected CSS ([[injected-css-loses-to-tamagui-variants]]).
  - `{...rest}` spread-first (N1, `button.tsx:192`); `NODE_ENV` dev-warn (`button.tsx:169`); forwardRef; jsdom `*.test.tsx`.
    [FACT: files read]
- **Verify:** `pnpm --filter @vida/ui typecheck && build && test` (currently @vida/ui **113** tests). [FACT: CLAUDE.md]

## 3. API surface (ship verbatim — [[deliverable-is-the-doc-not-my-discretion]]) [FACT: tabs.md:9-20]

```ts
export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  items: ReadonlyArray<{ value: string; label: React.ReactNode; disabled?: boolean }>
  orientation?: 'horizontal' | 'vertical' // default 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode // the panels (one visible at a time)
}
// forwardRef<HTMLDivElement | View, TabsProps>. Props exported.
```

- **Controlled + uncontrolled** in one prop pair (`value` controlled; `defaultValue` seeds internal state). The
  React "controlled-or-uncontrolled" pattern — the mechanism (single source of truth, `onValueChange` always
  fires) is a **Step 2** design item. [INTERP: tabs.md API; React controlled pattern] → §9 D-list.
- **`children` = the panels**, not the tabs. The tab strip is generated from `items`; panels are supplied as
  children and matched to tabs by `value`. How panels declare their `value` (a `Tabs.Panel` sub-component vs a
  `data-value`/keyed convention) is a **Step 2** structural decision — the contract is silent on the wiring.
  [UNKNOWN: tabs.md gives `children: ReactNode` only → §10 V-list; resolve in Step 2 grounded in the ARIA contract]

## 4. Visual states (contract §Visual States — per tab unless noted) [FACT: tabs.md §Visual States]

- **default** — unselected: muted label (`tabs.text`), no indicator; tablist sits on a 1px `tabs.border` baseline.
- **hover** — label strengthens toward active (hover overlay opacity, B12).
- **focus** — `:focus-visible` 2px ring on the tab (`color.focus.ring`), pointer-suppressed.
- **active** — selected: full-strength label (`tabs.textActive`) + the indicator bar (`tabs.indicator`).
- **disabled** — tab `disabled`: muted, **skipped in arrow nav** (reduced opacity).
- **loading** — panel content pending: panel shows a skeleton, tab strip stable, `aria-busy` on the **panel**.
- **error** — **N/A at the tab level** (a failed panel renders its own error inside the panel). [FACT: contract]
- **empty** — **N/A** (Tabs always has ≥1 tab; an empty `items` set renders nothing — guard at the consumer). [FACT: contract]

## 5. Motion (B12 — the indicator is the showcase) [FACT: tabs.md §Motion]

| Transition      | Duration                  | Easing         | Property                                            |
| --------------- | ------------------------- | -------------- | --------------------------------------------------- |
| indicator moves | `duration.moderate` (250) | `easing.inOut` | **transform: translateX/Y only** (never left/width) |
| panel swap      | `duration.fast`           | `easing.out`   | opacity                                             |

- **Reduced-motion:** indicator **jumps** instantly; panel swaps without fade. [FACT: contract; motion §IX]
- ⚠ **The width problem (Step 2 core design):** tabs have different widths, so the indicator must both **resize**
  (per active tab) and **move**. B12 permits animating **transform only** → the resize is an **instant** width/
  scale state-swap and only the **translate** animates. The exact math (measure each tab's offset+width via refs
  in a layout effect; drive `transform: translateX(offset)` + set width instantly) is designed + gated in Step 2.
  [FACT: contract "never left/width — B12"; §Performance "single transform, no per-frame layout"] → §9 D / §10 V.

## 6. Accessibility (contract §A11y — [FACT: engineering §XIV]) [FACT: tabs.md §A11y]

- **Roles:** container `tablist`; each tab `tab` with `aria-selected` + `aria-controls`→panel id; each panel
  `tabpanel` with `aria-labelledby`→tab id. `useId`-based id wiring (collision-safe, the Select precedent).
- **Keyboard:** ←/→ (↑/↓ when `orientation="vertical"`) move selection between tabs via **roving tabindex**
  (only the active tab is `tabIndex=0`, the rest `-1`); **Home/End** jump to first/last; **disabled tabs skipped**.
  **Tab moves focus INTO the selected panel** (panel is `tabIndex=0` or contains the first focusable).
- **Focus on change:** "focus moves to the selected tab's panel" — verbatim §XIV. (Selection-follows-focus vs
  manual-activation is a **Step 2** decision grounded in the WAI-ARIA tabs pattern + this verbatim line.) → §9 D.

## 7. Performance budget [FACT: tabs.md §Performance]

Only the active panel mounted, **or** all mounted with inactive ones `hidden` (consumer choice — Step 2 picks the
default + whether it's configurable); indicator uses a **single transform**, no per-frame layout.

## 8. Definition of Done (U6) — acceptance

- [ ] `TabsProps` = the contract interface **verbatim**; controlled (`value`) + uncontrolled (`defaultValue`) both
      work; `onValueChange` always fires on change; `items` drives the strip, `children` supply the panels.
- [ ] Roles: `tablist` / `tab` (`aria-selected` + `aria-controls`) / `tabpanel` (`aria-labelledby`); `useId` wiring —
      jsdom-asserted.
- [ ] **Roving tabindex**: only the active tab `tabIndex=0`; ←/→ (↑/↓ vertical) move + wrap-or-clamp (Step 2),
      Home/End jump, **disabled tabs skipped**; **Tab moves focus into the panel** — jsdom-asserted.
- [ ] Indicator animates **via transform only** (B12); width/resize is an instant swap; **reduced-motion jumps**;
      panel swap = opacity `fast`/`out`, reduced-motion no fade.
- [ ] `orientation="vertical"` re-maps arrow keys (↑/↓) + lays the strip + indicator on the cross axis.
- [ ] `size` (sm/md/lg) drives tab padding/label size off the `$space`/type scale (Button/Select precedent).
- [ ] `tabs.*` tokens resolve through the sub-theme; `light_/dark_Tabs` registered in `tamagui.config.ts`.
- [ ] Storybook `addon-a11y` (axe) clean on the tablist pattern, both themes.
- [ ] typecheck 2/2 · @vida/ui tests green · build + build-storybook ✓ · root 10/10; siblings unregressed.
- [ ] Component **Visual Gate PASS** (render + measure both themes): baseline rule; muted vs active label; indicator
      under the active tab; indicator **slides** on change (transform, measured — not left/width); focus ring;
      disabled muted + skipped; vertical orientation; **dark theme** correct — Victor confirms.

## 9. Decisions to make in Step 2 (planning) — flagged, not yet decided

- **D1** — controlled/uncontrolled state machine (single source of truth; `onValueChange` semantics).
- **D2** — how panels bind to tabs by `value` (sub-component `Tabs.Panel` vs keyed children vs `data-value`) — the
  contract is silent (§3); resolve grounded in the `aria-controls`/`aria-labelledby` id wiring.
- **D3** — indicator measurement + transform math (resize instant, translate animated; layout effect + refs;
  re-measure on resize/orientation/items change) — the B12 showcase (§5).
- **D4** — selection-follows-focus vs manual activation (grounded in WAI-ARIA tabs + the verbatim §XIV line).
- **D5** — panel mount strategy default (only-active vs all-hidden) + whether configurable (§7).
- **D6** — `size` scale mapping; `orientation` axis mapping (arrow keys + indicator axis).
- **D7** — arrow-key edge behavior: wrap vs clamp (WAI-ARIA allows either; pick + document).

## 10. Verify-at-impl (measure/confirm in-browser or against installed types — Step 2/impl)

- **[V1]** Indicator translates (not left/width) and **resizes instantly** — confirm in compiled CSS + Visual Gate slide.
- **[V2]** Roving tabindex + arrow/Home/End + disabled-skip + Tab-into-panel — jsdom + a real keyboard pass in Storybook.
- **[V3]** `render:'button'` tab forwards the needed props/ref inside a `tablist` container (Select-trigger precedent).
- **[V4]** Panel↔tab id wiring resolves (`aria-controls`/`aria-labelledby` point at real ids) — axe + jsdom.
- **[V5]** Vertical orientation re-maps keys + axis correctly — Visual Gate + jsdom.

## 11. Files (planned — confirmed in Step 2)

- `packages/ui/src/components/tabs.tsx` — the primitive (tablist + tabs from `items` + indicator + panels + state
  machine + roving tabindex + keyboard).
- `packages/ui/src/components/tabs.stories.tsx` — Visual-Gate surface: all applicable states × light｜dark; a live
  indicator-slide case; vertical orientation; sizes; a disabled tab; a loading panel (skeleton + `aria-busy`).
- `packages/ui/src/components/tabs.test.tsx` — jsdom: roles/aria wiring; roving tabindex; arrows/Home/End/disabled-skip;
  Tab-into-panel; controlled vs uncontrolled; `onValueChange`; orientation key re-map.
- `packages/ui/src/internal/tabs-styles.ts` — **new** injected stylesheet: indicator transform transition, panel
  opacity transition, hover overlay, reduced-motion `@media`; built from `motion.ts`.
- `packages/ui/src/tamagui.config.ts` — import + register `light_/dark_Tabs` in `themes:`.
- `packages/ui/src/index.ts` — barrel: export `Tabs` + `TabsProps`.
- `packages/ui/src/CLAUDE.md` — §XXIX currency (Tabs + the indicator transform/resize B12 rule + test count).

---

# STEP 2 — PLAN (Rev 2) — gate-ready

## 12. Decisions resolved (D1–D7 → grounded)

- **D1 — controlled/uncontrolled state = the Select mechanism verbatim.** `isControlled = value !== undefined`;
  `innerValue` seeded per **D8** (`defaultValue` iff it names an enabled tab, else `firstEnabledValue` — a tablist
  always has a selection, contract "≥1 tab");
  `current = isControlled ? value : innerValue`; `select(v)` sets `innerValue` only when uncontrolled and **always**
  fires `onValueChange` (both modes). [FACT: select.tsx:136-138,188-196 — exact precedent] → no new pattern.
- **D2 — panels bind via a compound `Tabs.Panel` sub-component (the ARIA contract forces a wrapper).** The contract
  gives `children: ReactNode` + mandates each panel be a `role="tabpanel"` with `aria-labelledby`→tab id and the tab's
  `aria-controls`→panel id (§6). _Something_ must carry the value→panel mapping AND let Tabs own the wrapper element —
  so Tabs exports `Tabs.Panel` (`{ value: string; children: ReactNode }`); Tabs collects panels with
  **`React.Children.toArray(children)`** (flattens fragments, drops `null`/`false`/conditional children) then keeps
  only `isValidElement(c) && c.type === Tabs.Panel` before reading `c.props.value` (a non-Panel or a
  `{cond && <Tabs.Panel/>}` that evaluated false never throws) — matches `current`, and renders each into a
  Tabs-owned `role="tabpanel"` wrapper (id/`aria-labelledby`/`hidden`). [M4] **`TabsProps.children` stays `ReactNode`
  verbatim** — the sub-component is the _shape_ of those children,
  not a change to the authored interface. Derived from §6 ARIA, not invented (the U5-slots precedent). [INTERP: tabs.md
  §6 + APG tabs pattern] → **DEF-U6-a** (§15): the contract should formalize the panel API; DS decides `Tabs.Panel`
  vs a `panels` prop. **Consumer contract:** every `Tabs.Panel.value` should match an `items[].value`; a dev-warn
  fires on an orphan panel or a tab with no panel (§14 dev-warns).
- **D3 — indicator = absolute bar in a `position:relative` tablist; measured via `offsetLeft/Top` + `offsetWidth/
Height`; ONLY transform animates (B12).** Because the tablist is `position:relative` and the indicator + tabs are
  its children, a tab's `offsetLeft`/`offsetTop` is relative to the tablist (the offsetParent) — the value the
  indicator needs directly. A `useLayoutEffect` reads the active tab element (ref array, callback-ref narrowed to
  `HTMLElement` — select.tsx:404-406 precedent) and stores `{ start, size }`. **Re-measure deps** (all four matter —
  each changes tab geometry): `current`, `orientation`, `items`, **`size`** [M3]; plus **`ResizeObserver` on the
  tablist** (label reflow / container resize, jsdom-guarded like Select's `scrollIntoView?.`) and
  **`document.fonts?.ready.then(remeasure)`** [M3] (web-font swap changes label widths — the classic mis-measure; also
  jsdom-guarded). Indicator inline style: horizontal → `transform: translateX(start)px; width: size px; height: 2px;
bottom: 0`; vertical → `transform: translateY(start)px; height: size px; width: 2px; insetInlineStart: 0`. **Both
  `transform` AND `width`/`height` are written every render** — they are **independent** style properties (not the
  mutually-exclusive `top`/`bottom` pair), each must reflect the measured tab; the general principle that Tamagui does
  not clear a stale inline style still applies, so writing them explicitly every render is correct hygiene. [INTERP:
  the top/bottom stale-key bug at select.tsx:122-124 is a *different* failure mode (alternating exclusive props) — it
  does NOT apply here; cited only for the "Tamagui keeps stale inline styles" principle, M1.] The injected
  `.vida-tabs-indicator{transition:transform <moderate> <inOut>}` transitions **transform only**; width/height carry no
  transition → **instant resize, animated slide** (the B12 asymmetry). A `ready` state flag starts `false` and flips
  `true` after the first layout effect so the **first placement is instant** (no slide-from-0 on mount); reduced-motion
  forces instant always. [FACT: tabs.md §5/§7; select.tsx measurement + injected-CSS precedent; B12] → the showcase.
  **jsdom note:** `offset*` are `0` in jsdom, so the slide math is asserted **only in-browser** (Visual Gate V1); jsdom
  tests assert the Indicator **element mounts and carries the active tab's measured style object** (in jsdom that is
  `translateX(0)`/`width:0`) — not pixel position [m3].
- **D4 — automatic activation (selection follows focus).** The contract says arrows "**move selection** between tabs"
  (§6, verbatim) and "focus moves to the selected tab's panel" — i.e. arrow ⇒ change `current` ⇒ indicator moves +
  panel swaps, focus on the new tab; then **Tab** moves focus into the panel. This is also the APG-recommended default
  for tabs whose panels display without latency (only-active-mounted, D5, is instant). [FACT: tabs.md §6 "move
  selection"; WAI-ARIA APG tabs]. (Not manual activation — that would contradict "arrows move selection".)
- **D5 — only the active panel mounts (default + only behavior in the verbatim API).** Contract §7 offers "only active"
  **or** "all mounted + `hidden`" as _consumer choice_, but `TabsProps` authors **no mount-strategy prop** — so U6
  ships the performance-budget default (**only active panel mounted**, matching "one visible at a time" + "only the
  active panel mounted") and does not invent a knob. [FACT: tabs.md §7; verbatim API has no such prop] → **DEF-U6-b**
  (§15): DS adds `keepMounted?: boolean` if state-preservation is later needed (exact parallel to U5's DEF-U5-f — a
  documented §-behavior with no API trigger). With auto-activation + only-active-mounted, an arrow unmounts the old
  panel and mounts the new — cheap, correct.
  - **Panel transition is enter-only, disclosed [M2].** Because the outgoing panel is **synchronously unmounted**, it
    cannot fade out — so the "panel swap … opacity" motion (tabs.md:38) is realized as an **enter fade** on the
    incoming panel (opacity 0→1, `fast`/`out`, the Select `.is-open` post-mount class-flip precedent), **not** a
    symmetric cross-fade. This satisfies the contract's loose "opacity" swap (a swap is perceived; no fade-out is
    specified) and is the honest consequence of only-active-mount. Reduced-motion drops the enter fade. [FACT:
    select-styles.ts:24-25; tabs.md §Motion.]
- **D8 — selection is clamped to ENABLED tabs; a disabled selection is a dev-warn [B2].** A `value`/`defaultValue`
  naming a **disabled** tab would make that tab simultaneously `aria-selected` and `aria-disabled` (a contradiction)
  and put `tabIndex=0` on a tab the arrow nav skips. So: the **uncontrolled** seed is `defaultValue` **iff it names an
  enabled tab**, else `firstEnabledValue`. For a **controlled** `value` naming a disabled tab, U6 does **not** override
  the consumer (respect the single source of truth) but fires **dev-warn #4** (§14). Home/End/arrow nav already skip
  disabled via the `step`/`firstEnabled`/`lastEnabled` helpers. [FACT: tabs.md §Visual States "disabled … skipped";
  select.tsx:177-186 helpers.]
- **D6 — `size` → padding + label size variant; `orientation` → axis + arrow-key remap.** `size` (Select precedent,
  a Tamagui `variant`, `defaultVariants:{size:'md'}`): `sm → py $8 / px $12 / $caption` · `md → py $12 / px $16 /
$small` · `lg → py $16 / px $20 / $body`. `orientation`: `horizontal` (default) → tablist `flexDirection:'row'`,
  baseline on `borderBottom`, indicator on the bottom edge, ←/→ keys; `vertical` → `flexDirection:'column'`, baseline
  on `borderInlineStart`, indicator on the inline-start edge, ↑/↓ keys. [FACT: tabs.md API + §6; select.tsx size
  variant] → a `variant` for size, a plain prop-branch for orientation (axis choices are structural, not a theme key).
- **D7 — arrow keys WRAP (tablist convention), disabled tabs skipped, Home/End clamp to first/last enabled.** APG's
  tabs pattern wraps (last→first); a tablist is a short closed ring where wrap is expected. This **intentionally
  differs from Select's no-wrap** (select.tsx:186) — a _listbox_ is a long scrollable list where wrap is disorienting;
  a _tablist_ is not. Documented, not silent. Reuse Select's `firstEnabled`/`lastEnabled`/`step` helpers but make
  `step` **wrap** at the ends. [FACT: WAI-ARIA APG tabs (wrap) vs listbox (no-wrap); select.tsx:177-186]

## 13. Structure (the gate target)

```
<TabsRoot ref={ref} orientation={orientation}>                        // styled(View,{name:'Tabs'}) → <div> (no role; the tablist child carries it). forwardRef→HTMLDivElement. {...rest} FIRST (N1) [m1]
  <TabList role="tablist" aria-orientation={orientation}               // aria-orientation = APG addition beyond the literal §6 (intentional) [m2]. position:relative; flexDirection row|column; baseline border on the trailing edge ($border)
           onKeyDown={onKeyDown}>
    {items.map((it, i) => (
      <Tab key={it.value} render='button' name='Tabs'                  // <button role="tab">
           ref={setTabRef(i)}                                          // callback ref → tabEls[i] (HTMLElement, for focus + measure)
           id={tabId(i)} role="tab"
           aria-selected={it.value === current}
           aria-controls={panelId(it.value)}
           aria-disabled={it.disabled || undefined}
           tabIndex={it.value === current ? 0 : -1}                    // ROVING: only the active tab is tabbable
           selected={it.value === current} disabled={it.disabled}      // VISUAL variants (color/opacity)
           size={size}
           onClick={() => !it.disabled && activate(i)}>                // pointer path = native onClick (Select precedent)
        {it.label}
      </Tab>
    ))}
    <Indicator className="vida-tabs-indicator" aria-hidden               // absolute bar; transform+width|height inline (§12 D3)
               style={indicatorStyle} data-ready={ready} />              // backgroundColor $indicator
  </TabList>

  {panels.map(p => (                                                    // panels = toArray+isValidElement+type-guard from <Tabs.Panel value> (§12 D2, M4)
    <TabPanel key={p.value} role="tabpanel"
              id={panelId(p.value)} aria-labelledby={tabId(indexOf p)}
              tabIndex={0}                                              // Tab moves focus INTO the panel (§6). See [B1] on the focusable-content case.
              hidden={p.value !== current}                             // only active shown; only active MOUNTED (§12 D5)
              className="vida-tabs-panel">
      {p.value === current ? p.children : null}
    </TabPanel>
  ))}
</TabsRoot>
```

- **`activate(i)`** = focus `tabEls[i]` + `select(items[i].value)` (auto-activation, D4). Used by click + all key nav.
- **Panel `tabIndex` [B1] — always `0`, documented tradeoff.** APG makes a `tabpanel` focusable so keyboard users
  reach _static_ panel content; it also notes a panel that _already contains_ a focusable element does not strictly
  need `tabIndex=0` (the inner control is the Tab stop). U6 sets `tabIndex={0}` **unconditionally** — the shipped
  norm (Radix `Tabs.Content`, Reach) — rather than runtime-inspecting each panel for focusable descendants: it
  guarantees the contract's "Tab moves focus into the panel" for _every_ panel (incl. read-only ones), and the only
  cost is one extra (harmless, correctly-labelled) Tab stop before a focusable child. This is a deliberate,
  grounded choice, not an oversight; if a consumer finds the extra stop undesirable it is a DS refinement, not a UI-1
  bug. [FACT: WAI-ARIA APG tabs; Radix/Reach precedent.]
- **Keyboard (`onKeyDown` on the tablist):** map by orientation — H: `ArrowRight`→next, `ArrowLeft`→prev; V:
  `ArrowDown`→next, `ArrowUp`→prev; `Home`→first-enabled, `End`→last-enabled; each `preventDefault` + `activate`.
  `next/prev` = the **wrapping** `step` over enabled tabs (D7). Non-arrow/Home/End keys fall through (Tab is native).
- **Tokens under `name:'Tabs'`:** `$text` (default label) · `$textActive` (selected) · `$indicator` (bar) · `$border`
  (baseline). Focus ring = global `$colorFocusRing` via `focusVisibleStyle` (Button/Select precedent). Hover =
  `hoverStyle:{ color:'$textActive' }` on non-selected/non-disabled tabs — an **instant** swap (B12-legal, U5 dark-
  border precedent), a Tamagui variant (wins specificity — [[injected-css-loses-to-tamagui-variants]]).
- **Panel enter** (`.vida-tabs-panel`): opacity 0→1, `duration.fast`/`easing.out`, via injected CSS keyed on a mount
  flag (Select `.is-open` precedent); reduced-motion drops it. [FACT: select-styles.ts]

## 14. Dev-warns (NODE_ENV-guarded, DCE'd in prod — Button/Select precedent)

1. A `Tabs.Panel` whose `value` matches no `items[].value` (orphan panel) — warn.
2. An `items[]` entry with no matching `Tabs.Panel` — warn (a tab that controls nothing).
3. `value`/`defaultValue` not matching any `items[].value` — warn (unreachable selection).
4. `value`/`defaultValue` naming a **disabled** tab — warn [B2] (selection contradicts `aria-disabled`; uncontrolled
   falls back to first-enabled per D8, controlled left to the consumer).
   [FACT: button.tsx:169 dev-warn precedent; the D2 consumer contract; §12 D8.]

## 15. Deferrals + defects (bounded, flagged — not silent)

- **DEF-U6-a (for DS) — the panel API is unspecified.** Contract gives `children: ReactNode`; the ARIA wiring forces a
  wrapper, so U6 introduces the compound `Tabs.Panel`. DS decides whether to formalize `Tabs.Panel` or switch to a
  `panels` prop. [[deliverable-is-the-doc-not-my-discretion]]
- **DEF-U6-b (for DS) — §7 "consumer choice" of mount strategy has no API trigger.** U6 ships only-active-mounted; DS
  adds `keepMounted?: boolean` if state-preservation is needed later. (Parallel to U5 DEF-U5-f.)
- **DEF-U6-c (verify at impl) — `loading` panel state has no API trigger either.** The contract's `loading` row puts a
  skeleton + `aria-busy` **on the panel**; with panels as consumer `children`, loading is **consumer-composed**
  (skeleton as the panel's children + `aria-busy` via pass-through on `Tabs.Panel`) — same resolution as U5. Story
  demonstrates it. [FACT: tabs.md §Visual States loading row; U5 DEF-U5-f precedent.]

## 16. Verify-at-impl (adds to §10)

- **[V6]** `ResizeObserver` re-measures the indicator when a label reflows / container resizes — Visual Gate (resize
  the frame, indicator tracks). jsdom-guarded so tests don't throw.
- **[V7]** First mount places the indicator **without** a slide (the `ready` flag) — Visual Gate on load.
- **[V8]** Auto-activation: arrow changes selection AND the panel — jsdom (selection) + Visual Gate (panel swap).

## 17. Gate 1 — independent critique resolutions (REVISE → all addressed)

Fresh adversarial subagent; verdict REVISE (2 blockers + 3 material + 4 minor). It independently confirmed the token
grounding (component.json:tabs + themes.ts:33-34), the additive config change, the verbatim `TabsProps`, B12 legality
of the transform/width asymmetry, and the D1/D6/D7 precedent citations. Resolutions:

- **B1 (panel `tabIndex={0}` vs focusable-content APG case)** → §13 panel note: unconditional `tabIndex={0}` is a
  deliberate, grounded choice (Radix/Reach norm; guarantees "Tab into panel" for read-only panels; cost = one harmless
  extra stop) — not an oversight; a consumer-tunable extra-stop is a DS refinement.
- **B2 (disabled selection not clamped/warned)** → **D8** + **dev-warn #4**: uncontrolled seed clamps to first-enabled;
  controlled disabled selection warns (consumer not overridden).
- **M1 (stale-inline-key overclaim)** → D3 relabelled: the top/bottom bug is a different failure mode; both indicator
  props written every render as independent-property hygiene, tag downgraded FACT→INTERP.
- **M2 (enter-only fade, not a cross-fade)** → D5 disclosure: outgoing panel unmounts (can't fade out); enter fade only,
  which satisfies the loose "opacity swap".
- **M3 (missing re-measure triggers)** → D3: added `size` to the layout-effect deps + `document.fonts?.ready` remeasure
  (both jsdom-guarded).
- **m1** `role={undefined}` dropped (§13). **m2** `aria-orientation` noted as an intentional APG addition (§13).
  **m3** jsdom claim reworded to "element mounts + carries the measured style object" (D3). **m4** children collection
  hardened to `toArray` + `isValidElement` + `type===Tabs.Panel` (D2).

## 18. Build result + gates (2026-08-08) — IMPLEMENTED, Visual Gate PASS

Files: `components/tabs.tsx` (+ compound `Tabs.Panel`) · `tabs.stories.tsx` · `tabs.test.tsx` (**23 jsdom**) ·
`internal/tabs-styles.ts` (**new** — indicator transform transition + panel enter keyframe + hover strengthen +
reduced-motion, reading `motion.ts`) · `tamagui.config.ts` (+`light_/dark_Tabs`) · `index.ts` (barrel: `Tabs`,
`TabsPanel`, `TabsProps`, `TabsPanelProps`). **No pipeline touch** — `light_/dark_Tabs` were already generated by
DS-5 (unlike U5's shadow.ts). typecheck 2/2 · @vida/ui **136/136** · build + build-storybook ✓ · root typecheck
**10/10**. Siblings unregressed.

Gate trail: Step 1 forward spec → Step 2 PLAN (D1–D7) → **Gate 1** independent critique REVISE (2 blockers + 3
material + 4 minor) → all fixed (Rev 3, §17) → **Approval 1** → **Gate 2** /preflight **PASSED** (5 bounded
assumptions, 2 folded in: indicator thickness; indicator-in-tablist axe-verify) + gate-2 **SHIP** → **Approval 2** →
implemented → **Component Visual Gate PASS** (Victor confirmed, both themes).

**Visual Gate — measured in real Brave** (Playwright; the B12 showcase is unverifiable in jsdom where `offset*`=0):

- **Indicator sits under the active tab + slides via transform, resizes instantly:** before `{x:32,w:118}` = active
  tab; after ArrowRight `{x:150,w:83}` = the new tab; `transform: translateX(0)→translateX(118px)`, width 118→83,
  `transition: transform 0.25s cubic-bezier(0.4,0,0.6,1)` — **transform ONLY** (no width/left in the transition). B12 ✓.
- **Auto-activation:** ArrowRight swapped the panel text A→B. **Label colours distinct** (measured): light active
  `rgb(15,23,42)` vs muted `rgb(100,116,139)`; dark active `rgb(248,250,252)` vs muted `rgb(148,163,184)` — the
  `selected` variant applies (no U3-style silent collapse). **Disabled** = muted + `opacity:0.5` + skipped by arrows.
  **Vertical** = `translateY`, 2px left-edge bar under the active tab. Baseline rule spans the strip; both themes correct.

**Resolved assumptions (from preflight):** indicator thickness **2px** / baseline **1px** — confirmed clean. The
indicator-in-tablist axe question: `aria-hidden` decorative child; `aria-controls` binds only to the ACTIVE tab's
(mounted) panel so every referenced id exists (axe-clean by construction) — no restructure needed.

**Deferrals stand (for DS):** DEF-U6-a (formalize the `Tabs.Panel` API vs a `panels` prop) · DEF-U6-b (`keepMounted?`
if state-preservation needed) · DEF-U6-c (loading = consumer-composed skeleton + `aria-busy`, no `loading` prop —
demonstrated in the LoadingPanel story). **NEXT = U7 Menu** (`menu.md`; 4th molecular; reuse `light_/dark_Menu`).
</content>
</invoke>
