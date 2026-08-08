# U4 — Select · implementation reconcile (DS-5 contract → Tamagui v2)

DS-5 primitive 4/10 (molecular, first of the molecular tier — and the first floating/portalled primitive).
Implements `docs/specs/components/ds-5-primitive-contracts/select.md` against Tamagui v2 in `@vida/ui`.
Gate: §XXVI per-component double-gate + component Visual Gate. Task: ui-1-vida-ui-primitives (LIF-86).

No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].

---

## 0. Baseline (code-as-is — verified this session)
- **Build approach is settled by the shipped pattern — no fork.** U1–U3 shipped hand-built on `@tamagui/core`
  (native element / `styled()` + injected CSS, **no new deps**, web-first). ADR-001 §9 names *Tamagui* as the
  component library and `@tamagui/core`'s `styled()` IS Tamagui; UI-1's reason to exist (DS-5 `_index.md:38-39`;
  task goal) is to **build** these primitives — so `@tamagui/select`/the kit is out of scope by definition. Select
  is hand-built on core against `select.md`. [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]]
- **Sub-theme already generated, not yet registered.** `light_Select`/`dark_Select` exist in `themes/themes.ts`
  (keys from `component.json.select`: `background`, `border`, `borderError`, `text`, `placeholder`,
  `panelBackground`, `padding`, `radius`) but `tamagui.config.ts` wires only Button/Input/Checkbox. [FACT:
  component.json:35-44; tamagui.config.ts:15-20,63-68] → U4 config change is additive: import + add to `themes:`.
- **Component tokens** [FACT: component.json.select]: `background/panelBackground → {color.surface.primary}`,
  `border → {color.border.default}`, `borderError → {color.signal.danger}`, `text → {color.text.primary}`,
  `placeholder → {color.text.muted}`, `padding → {space.inset.default}`, `radius → {radius.control}`. All resolve
  to shipped semantic tokens (three-layer intact). Note: **no `select.borderFocus`** token (Input has one) — the
  focus ring uses the semantic `color.focus.ring` (via `$colorFocusRing`) directly, like every other primitive.
- **`zIndex.dropdown`** is a PRIMITIVE token consumed directly (no semantic layer — `_index.md §2.1`: z-index is a
  documented exception to three-layer). [FACT: primitive.json zIndex.dropdown] The panel reads it.
- **Reusable, unchanged:** the Input **frame treatment** (`input.tsx` — border/bg/padding/radius, size scale
  `$32/$40/$48`, `hoverStyle` border-strengthen, `invalid` variant precedence) is the visual model for the
  trigger; `internal/interaction-styles.ts` reduced-motion guard shape; the injected-stylesheet-with-real-theme-
  vars pattern (`internal/input-styles.ts`, `checkbox-styles.ts`); inline-SVG icon (checkbox `Check`/`Dash`
  precedent — **no lucide dep**); dev-time accessible-name warn; forwardRef; jsdom `*.test.tsx`. [FACT: files read]
- **Verify:** `pnpm --filter @vida/ui typecheck && build && test` (currently @vida/ui 68 tests). [FACT: session-log 2026-08-07]

## 1. Structure — trigger (button) + portalled listbox panel
Select is the **first primitive that cannot be a pure-CSS-off-native-pseudo-class machine** — there is no native
element that yields a *styled, portalled* listbox with `panelBackground`/roles/motion. So open/highlight are React
state (contract perf budget is "virtualize >100 · portal · no trigger reflow" — NOT "zero re-render"; open-render
is inherent and fine). [FACT: select.md Performance Budget]

**Pattern = WAI-ARIA 1.2 APG "Select-Only Combobox"** [FACT: WAI-ARIA APG; select.md §A11y names combobox/listbox/
option + activedescendant, which IS the 1.2 select-only pattern]. **Button-vs-role resolution (was ambiguous):** the
contract fixes the ref target as `HTMLButtonElement` (:22), so the trigger IS a real `<button>` (`render:'button'`)
for focusability + form adjacency — but **keyboard is 100% hand-handled** (§2.1), so `role="combobox"` authoritatively
overrides the button's implicit role and native Enter/Space activation is *not* relied on (the button buys focus, not
key semantics). ⚠ The APG notes `role=combobox` on a native `<button>` can mis-announce on some SRs; since the
contract mandates the button ref, U4 ships it and **verifies SR announcement at impl** (Storybook `addon-a11y` + a
manual NVDA/VO pass) — if it fails, that is a **DS defect** (button-ref vs combobox-role) to reconcile, not a silent
UI-1 rewrite. [FACT: select.md:22 ref = HTMLButtonElement; [[deliverable-is-the-doc-not-my-discretion]]]

**Per-instance ids via `React.useId()`** (React 19, [FACT: CLAUDE.md React 19]) — never index-only (collides across
multiple Selects on a page): ``const uid = useId(); const listboxId = `${uid}-listbox`; const optId = (i) => `${uid}-opt-${i}` ``.

```
<SelectTrigger>                                     // styled(View,{name:'Select',render:'button'}) → real <button>, forwardRef→HTMLButtonElement
   role="combobox" aria-haspopup="listbox"          //   [FACT: select.md §A11y]. Keyboard hand-handled (§2.1); native button activation NOT relied on.
   aria-expanded={open} aria-controls={listboxId}
   aria-activedescendant={open ? optId(activeIndex) : undefined}
   aria-invalid aria-required                        //   invalid/required
   {...accessibleName}                               //   aria-label / aria-labelledby (mirrored to the listbox below)
   className="vida-select-trigger [vida-select-invalid]">
  <Text>{selectedLabel ?? <placeholder muted>}</Text>   //   value text (select.text) OR placeholder (select.placeholder = text.muted)
  <ChevronSvg aria-hidden />                             //   trailing chevron, inline SVG (no dep), rotates on open (transform, B12)
</SelectTrigger>
{open && createPortal(                               // react-dom portal → document.body (web). zIndex.dropdown.
  <Theme name="Select">                              // RE-ESTABLISH the sub-theme scope across the portal (§1, mandated — not verify-at-impl)
  <SelectPanel role="listbox" id={listboxId}         // styled(View,{name:'Select'}); $panelBackground resolves under <Theme name="Select">
     aria-multiselectable="false"                    //   explicit single-select (APG)
     {...accessibleName}                             //   listbox mirrors the trigger's name (SR hears the list name on entry)
     style={fixed position from trigger rect} className="vida-select-panel">
    {options.map((o,i) =>
      <Option role="option" id={optId(i)} aria-selected={o.value===value}
        aria-disabled={o.disabled} className={"vida-select-option" + (i===activeIndex ? " is-active" : "")}
        onPointerMove={()=>setActive(i)} onClick={()=>!o.disabled && commit(o.value)}>
        {o.label}{o.value===value && <CheckSvg aria-hidden />}
      </Option>)}
  </SelectPanel>
  </Theme>, document.body)}
```

- **Trigger = `styled(View,{name:'Select', render:'button'})`** — `render:'button'` emits a real `<button>`
  (native focus, Enter/Space activation, focusable, form-adjacent). `name:'Select'` puts it in the `.t_Select`
  scope so `$background`/`$border`/`$borderError`/`$text`/`$radius` resolve. Reuses U1 Button's `render:'button'`
  precedent (verify ref→HTMLButtonElement at impl, per button.tsx). [FACT: button.tsx render:'button']
- **Focus ring on the trigger directly** — unlike Input (focus on an inner input → `:has` lift), the trigger IS
  the focusable element, so `focusVisibleStyle={{ outlineWidth:2, outlineStyle:'solid', outlineColor:'$colorFocusRing',
  outlineOffset:2 }}` fires on its own `:focus-visible`. [FACT: select.md focus row; §VIII:155 `:focus-visible`.]
  **Verify at impl** Tamagui core `focusVisibleStyle` emits `:focus-visible` (reference button.tsx — U1 shipped a
  button focus ring); injected `.vida-select-trigger:focus-visible` is the documented fallback.
- **Panel = `styled(View,{name:'Select'})` portalled to `document.body`** via react-dom `createPortal` (`react-dom`
  is present — apps render with it; web-first is the established UI-1 scope, like the native `<input>`/injected CSS
  of U1–U3). **The base light/dark theme crosses the portal** (Tamagui puts the theme class on `<html>` via
  `addThemeClassName`, an ancestor of `document.body` — [FACT: tamagui.config.ts addThemeClassName setting]) **but
  the `_Select` SUB-theme does NOT** — it is applied by `name:'Select'` at the component node, which the portal
  detaches from `body`. So the panel is wrapped in **`<Theme name="Select">` (mandated, not verify-at-impl)** to
  re-establish the `.t_Select` scope on the portalled subtree, so `$panelBackground`/`$border`/`$radius` resolve.
  `Theme` is a `@tamagui/core` export. [FACT: select.md active row `select.panelBackground`, `zIndex.dropdown`;
  critique finding #7 — this is a known sub-theme×portal consequence, adopted as primary not deferred.]

### 1.1 Positioning (hand-rolled, no floating-ui dep)
On open: `rect = triggerRef.current.getBoundingClientRect()`; panel is `position:fixed` (viewport coords, no
scroll math) at `top: rect.bottom + 4`, `left: rect.left`, `minWidth: rect.width`.
- **Vertical flip:** if `rect.bottom + panelH > innerHeight` and `rect.top >= panelH`, open upward
  (`bottom: innerHeight - rect.top + 4`).
- **Horizontal clamp (finding #6):** `maxWidth: innerWidth - rect.left - 8`; and if `rect.left + panelW > innerWidth`,
  shift the anchor left so the panel stays in-viewport. A long option label never overflows the right edge.
- **Long lists:** panel `maxHeight: min(available space, ~320px)` + `overflowY:auto` — this is where the story's
  "long list (scroll)" scroll comes from (§6). Combined with the active-option `scrollIntoView` (§2.1).
- **Dismiss:** outside `pointerdown` + `Esc` + **scroll with `{ capture: true }`** —
  `window.addEventListener('scroll', close, { capture: true })` (capture phase catches scrolls in NESTED overflow
  containers too; a plain bubbling `window` scroll listener misses them and the fixed panel detaches — finding #5,
  load-bearing). Recompute position on `resize`. [INTERP: contract "no reflow of the trigger on open" + "portals to
  body" — a fixed portal satisfies both.]

Full scroll-**follow** / collision engine is a **Popover-era (#9) generalization**, explicitly deferred (YAGNI — a
Select panel is short-lived and closes on scroll). §9 DEFER-U4-c.

## 2. Interaction + state visuals
State machine is React (`open`, `activeIndex`, and value controlled/uncontrolled) — the panel mounts/unmounts, so
CSS-only won't do. Injected stylesheet `internal/select-styles.ts` (mirrors `input-styles.ts`: idempotent,
browser-only, appended after Tamagui's sheet, real switching theme vars) carries what `styled()` can't express.

| Visual | Mechanism | Token |
|--------|-----------|-------|
| trigger default/hover/focus/invalid/disabled | reuse Input frame: `hoverStyle` border-strengthen (`$colorTextMuted`), `focusVisibleStyle` ring, `invalid` **variant** → `$borderError` (Tamagui variant, NOT injected — U3 lesson), `disabled` variant opacity .5 + hover suppressed | `select.*` sub-theme |
| chevron rotate on open | `transform: rotate(180deg)` on `.vida-select-trigger[aria-expanded=true] svg`, `duration.fast`/`easing.out` (B12: transform only) | motion vars |
| option active (highlight) | `.vida-select-option.is-active` → `background:var(--colorSurfaceSecondary)` (instant swap, B12-legal — a fill state change, not animated) | surface.secondary |
| option selected | `aria-selected=true` → a check glyph (inline SVG) + `font-weight` shift; not colour-only | — |
| option disabled | `aria-disabled=true` → opacity .5, `pointer-events:none`, skipped in nav | — |
| panel open motion | `opacity 0→1` + `transform: translateY(-4px)→0`, `duration.fast`/`easing.out` | motion vars |

- **Panel enter motion — primary = Tamagui `animation="fast"` + `enterStyle={{ opacity:0, y:-4 }}`** (consumes
  DS-4's `createAnimations`; `animation="fast"` maps to `easing.out` per tamagui.config.ts — the sanctioned motion
  path). **Verify at impl** core + `@tamagui/animations-css` fires `enterStyle` on the portalled mount; if not,
  fallback = injected CSS transition toggled by a mount `useLayoutEffect` (the `interaction-styles.ts` precedent) —
  **the fallback MUST also use `easing.out` + `duration.fast`** (finding #9), not the CSS default ease. **Enter-only**
  — the contract's Motion table lists only "panel open"; exit = instant unmount (`@tamagui/animate-presence` is NOT
  installed — no exit animation without a new dep; enter-only satisfies the contract). [FACT: select.md Motion Spec
  — single "panel open" row]
- **Active option `scrollIntoView` (finding #8):** on `activeIndex` change while open, the active option calls
  `el.scrollIntoView({ block: 'nearest' })` — else ↑/↓ nav on a scrolled long list moves an invisible highlight.
  (`block:'nearest'` never scrolls the whole page, only the panel's `overflowY:auto` viewport.)
- **Reduced-motion (mechanism, not just outcome):** the injected-CSS rules (chevron rotate, fallback panel
  transition) are dropped by a `@media (prefers-reduced-motion:reduce)` block; **the Tamagui `animation`/`enterStyle`
  path is gated by the existing `hooks/use-reduced-motion.ts`** — `animation={reduced ? undefined : 'fast'}` and no
  `enterStyle` when `reduced` (the CSS driver would otherwise emit the transition regardless of the media query).
  Reuses the hook Button already consumes. [FACT: select.md "Reduced-motion: panel appears instantly"; motion §IX
  reduced-motion mandatory; hooks/use-reduced-motion.ts exists]
- **B12 compliance:** only `transform`/`opacity` animate (chevron rotate, panel translateY+opacity). Border/bg/
  highlight changes are **instant state swaps**, never transitioned. [FACT: `_index.md §2` B12]

### 2.1 Keyboard + type-ahead (WAI-ARIA combobox + aria-activedescendant)
Focus **stays on the trigger** the whole time; the highlighted option is tracked by `activeIndex` and surfaced via
`aria-activedescendant` on the trigger → the active option's `id`. This makes "**focus returns to the trigger on
close**" automatic (focus never left) and avoids a focus-trap/FocusScope. [FACT: select.md §A11y "Focus returns to
the trigger on close"; INTERP: WAI-ARIA combobox+activedescendant pattern.]

| Key | Closed | Open |
|-----|--------|------|
| Enter / Space / ↓ | open (↓ → first enabled active) | Enter/Space → commit active; ↓ → next enabled |
| ↑ | open (last enabled) | previous enabled |
| Esc | — | close (focus stays on trigger) |
| Home / End | — | first / last enabled |
| type char(s) | **type-ahead in place** — buffer chars (reset ~500ms), match option-label prefix (case-insensitive), **commit that value + fire `onValueChange` WITHOUT opening** (native `<select>` / APG behaviour, finding #3) | type-ahead: buffer chars (reset ~500ms), match prefix, set active (does not commit until Enter) |
| Tab | native focus move | close, then native Tab (do not trap) |

- **No wrap (finding #4):** ↓ at the last enabled option is a no-op; ↑ at the first enabled is a no-op (APG listbox
  convention). Home/End jump to first/last enabled. **PageUp/PageDown = out of scope** for a short closed list.
- Disabled options are skipped by every move (and by type-ahead matching). `commit(v)`: set value (uncontrolled) /
  call `onValueChange` (both modes), close (if open), keep focus on the trigger.

## 3. API (exported `SelectProps<T>` — verbatim from the contract, generic default `string`)
[FACT: select.md:9-23 authors this interface FLAT + generic.] The contract is authoritative; ship it verbatim
(deliverable = the doc — do not rewrite the authored surface).

```ts
export interface SelectProps<T extends string = string> {
  value?: T
  defaultValue?: T
  onValueChange?: (v: T) => void
  options: ReadonlyArray<{ value: T; label: string; disabled?: boolean }>
  placeholder?: string
  disabled?: boolean
  invalid?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'   // default 'md'
  name?: string
}
// + pass-through: aria-label / aria-labelledby / aria-describedby / id …
```

- **Controlled (`value`+`onValueChange`) OR uncontrolled (`defaultValue`)** — internal `useState` seeded by
  `defaultValue`, bypassed when `value !== undefined`. `onValueChange` fires in both modes (mirrors Input
  `onChangeText` / Checkbox `onCheckedChange`). `commit(v)` sets the internal state (uncontrolled only) AND always
  calls `onValueChange(v)`. [FACT: select.md API]
- **Displayed label** = `options.find(o => o.value === current)?.label`; when `current` is undefined/absent →
  render `placeholder` in `select.placeholder` (muted). The size scale (`$32/$40/$48` height, `$caption/$small/$body`
  text) mirrors `input.tsx` variants verbatim. [FACT: input.tsx:40-44,74-79]
- **forwardRef → the trigger (`HTMLButtonElement`).** [FACT: select.md:22 "forwardRef<HTMLButtonElement | View>
  (the trigger)". The `| View` is the RN branch; web = HTMLButtonElement.]
- **Generic-through-forwardRef (D-generic):** `React.forwardRef` erases the type parameter. Implement internally at
  `T=string`, export `SelectProps<T>`, and **cast the wrapped component to a generic-preserving call signature**
  intersected with the exotic type so it stays usable as a component AND narrows `T`:
  `Select as unknown as (ForwardRefExoticComponent<SelectProps & RefAttributes<HTMLButtonElement>> & <T extends
  string = string>(p: SelectProps<T> & { ref?: Ref<HTMLButtonElement> }) => ReactElement)` — so `onValueChange:(v:T)`
  narrows to the `options` value union at the call site while `displayName`/exotic-assignability are preserved.
  Same **technique family** as the Input `NativeInputEl as unknown as ForwardRefExoticComponent<…>` cast
  (input.tsx:109-111) — but a distinct target (Input's is non-generic); no `any`, one commented `as unknown`.
  [finding #10 — own it as a distinct valid cast, don't overclaim it "mirrors" Input.]
- **`{...rest}` spread onto the trigger FIRST** so computed a11y props (`role`/`aria-*`) win (N1, carried from
  Button/Input/Checkbox).
- **Accessible name (dev-warn):** a combobox needs a name. Warn (NODE_ENV-guarded, dead-code-eliminated in prod)
  only when there is provably none: no `id` (nothing an external `<label htmlFor>` could target) AND no
  `aria-label`/`aria-labelledby`. Mirrors Input's warn. [FACT: select.md §A11y "Name: <label>/aria-label"]

## 4. 8 visual states (contract §Visual States — `loading` = slot-deferred)
default (closed, value shown) · hover (trigger border strengthens) · focus (`:focus-visible` ring on the button) ·
active (**open** — trigger focused + panel visible, `aria-expanded=true`) · disabled (muted, not focusable —
`disabled` on the button removes it from tab order) · **loading** (async options → spinner in trigger + `aria-busy`
— the contract marks this a **slot**; U4 exposes the seam via `aria-busy` support + the trailing area, but async
option loading has no consumer yet → the spinner render is a documented deferral, §9) · error (`invalid` → danger
border + `aria-describedby` pass-through + `aria-invalid`) · empty (no value → placeholder, `select.placeholder` =
`text.muted`). [FACT: select.md §Visual States]

## 5. Accessibility (contract §A11y — the gated core of this primitive)
- **Roles:** trigger `role="combobox"` + `aria-haspopup="listbox"` + `aria-expanded` + `aria-controls`→listbox id
  + `aria-activedescendant`→active option id (when open). Panel `role="listbox"` + **`aria-multiselectable="false"`**
  (explicit single-select, APG). Each option `role="option"` + `aria-selected`. Per-instance ids via `useId()` (§1
  — never index-only, finding #2). [FACT: select.md §A11y]
- **Name:** external `<label htmlFor={id}>` or `aria-label`/`aria-labelledby` (warn if none). **The listbox MIRRORS
  the trigger's accessible name** (`aria-label`/`aria-labelledby`) so SR users hear the list's name on entry
  (finding #11). **State:** `invalid`→`aria-invalid` (+ `aria-describedby` pass-through for the error text);
  `required`→`aria-required`.
- **Keyboard:** §2.1 table — Enter/Space/↓ open; ↑/↓ move; Enter selects; Esc closes; Home/End; type-ahead;
  **focus returns to the trigger on close** (automatic — focus never leaves it). [FACT: select.md §A11y]
- Storybook `addon-a11y` must be clean on the trigger + open panel (axe: combobox/listbox/option wiring).

## 6. Files
- `packages/ui/src/components/select.tsx` — the primitive (trigger + portalled panel + state/keyboard/type-ahead + positioning).
- `packages/ui/src/components/select.stories.tsx` — Visual Gate surface: all 8 states × light｜dark; sizes sm/md/lg;
  empty (placeholder) / selected; open (panel visible) with active + selected + disabled options; invalid; disabled;
  a long list (scroll) + an above-flip case.
- `packages/ui/src/components/select.test.tsx` — jsdom: combobox/listbox/option roles, `aria-expanded`/`-selected`/
  `-activedescendant`, open via Enter/↓, ↑/↓ nav skipping disabled, Enter commit, Esc close + focus-returns-to-trigger,
  type-ahead, controlled vs uncontrolled, `onValueChange`, invalid→`aria-invalid`, required→`aria-required`, disabled
  not focusable, outside-pointerdown close, dev-warn.
- `packages/ui/src/internal/select-styles.ts` — injected pseudo-class + motion stylesheet (§2), real theme vars.
- `packages/ui/src/tamagui.config.ts` — import + register `light_/dark_Select` in `themes:`.
- `packages/ui/src/index.ts` — barrel export `Select` + `SelectProps` (verify barrel is the export site at impl).

## 7. Decisions — with grounding label (FACT = in a doc · INTERP = derived · UNKNOWN = doc silent)
- **D1 — hand-built on `@tamagui/core`, no new dep** (not `@tamagui/select`/the kit). [FACT: U1–U3 shipped pattern;
  ADR-001 §9 "Tamagui = the library" + core IS Tamagui; DS-5 `_index.md:38-39` UI-1 = the implementation.] The
  earlier "kit vs hand-build" framing was a drift Victor corrected; the pattern + task purpose already answer it.
- **D2 — trigger = a real `<button>` (`render:'button'`) carrying `role="combobox"`; NOT a native `<select>`.**
  [FACT: select.md mandates a styled portalled `role=listbox` panel with `panelBackground`, motion, `aria-expanded`,
  type-ahead — a native `<select>` can express none of these.] Contract-forced, not discretion.
- **D3 — WAI-ARIA 1.2 APG select-only combobox: focus stays on the trigger; highlight via `aria-activedescendant`**
  (not roving focus into the panel / FocusScope). Trigger is a real `<button>` (contract ref = HTMLButtonElement)
  but keyboard is 100% hand-handled — `role=combobox` is authoritative; native button activation is not relied on.
  SR-announcement of combobox-on-button verified at impl (else a DS defect). [FACT: select.md "Focus returns to the
  trigger on close" + :22 ref; WAI-ARIA APG; critique findings #1, #11.]
- **D4 — panel = `position:fixed` portal to `document.body` under `<Theme name="Select">`, hand-rolled anchor
  (top/left from `getBoundingClientRect`, vertical flip + horizontal clamp + maxHeight/overflow), close on Esc /
  outside-pointerdown / capture-phase scroll.** [FACT: select.md "portals to body", "no reflow of the trigger on
  open", `zIndex.dropdown`; critique findings #5, #6, #7.] No floating-ui (new dep). Collision/scroll-follow =
  Popover #9 generalization (§9 DEFER-U4-c).
- **D8 — per-instance ids via `React.useId()`** for `listboxId`/`optId` (React 19), never index-only — else
  `aria-controls`/`aria-activedescendant` collide across multiple Selects on a page. [FACT: CLAUDE.md React 19;
  critique finding #2.]
- **D5 — panel enter motion via Tamagui `animation`+`enterStyle`** (primary; consumes DS-4 createAnimations),
  injected-CSS fallback; **enter-only** (no `animate-presence` dep → instant unmount on exit). [FACT: select.md
  Motion single "panel open" row; B12.] Verify enterStyle-on-portal-mount at impl.
- **D6 — generic `SelectProps<T>` shipped verbatim; forwardRef cast to a generic call-signature** to preserve `T`
  narrowing at the call site (Input cast precedent). [FACT: select.md:9 generic; React.forwardRef erases generics.]
- **D7 — value display + selected check + chevron = inline SVG** (checkbox `Check`/`Dash` precedent), no lucide dep
  even though ADR-001 §9 lists lucide-react — it is not installed and U1–U3 used inline SVG. [FACT: checkbox.tsx SVG]

## 8. Definition of Done (U4)
- [ ] `SelectProps<T>` = the contract interface verbatim (D6); controlled + uncontrolled both drive `onValueChange`.
- [ ] Roles: trigger `combobox`+`aria-haspopup=listbox`+`aria-expanded`+`aria-controls`+`aria-activedescendant`;
      panel `listbox`+`aria-multiselectable=false` + name mirrored from trigger; options `option`+`aria-selected`;
      **ids via `useId()`** (collision-safe across instances) (jsdom-asserted).
- [ ] Keyboard: Enter/Space/↓ open; ↑/↓ skip disabled + **no-wrap** (no-op at ends); Enter commit; Esc close **+
      focus returns to trigger** (jsdom-asserted); Home/End; type-ahead (open=highlight, **closed=commit-in-place**);
      Tab does not trap; active option `scrollIntoView` on nav.
- [ ] **7 states rendered + `loading` seam:** default·hover·focus·active(open)·disabled·error·empty rendered;
      `loading` = `aria-busy` seam, spinner render deferred (§9 DEFER-U4-b). `invalid`→danger border +
      `aria-invalid` + `aria-describedby`; empty→placeholder (`select.placeholder`).
- [ ] Panel portals to `document.body` under **`<Theme name="Select">`**, uses `zIndex.dropdown`, does not reflow
      the trigger; closes on Esc / outside-pointerdown / **scroll (capture-phase)**; flips up when no room below;
      **horizontal clamp** + `maxHeight`+`overflowY:auto` for long lists.
- [ ] Motion: panel opacity+translateY, chevron rotate — `transform`/`opacity` only (B12); reduced-motion instant;
      injected-CSS fallback (if used) honours `easing.out`+`duration.fast`.
- [ ] `select.*` tokens resolve through the sub-theme (incl. `panelBackground` across the portal via `<Theme>` —
      measured); `light_/dark_Select` registered; typecheck 2/2 · @vida/ui tests green · build + build-storybook ✓ · root 10/10.
- [ ] Storybook `addon-a11y` clean on trigger + open panel (combobox/listbox/option wiring).
- [ ] Component **Visual Gate PASS** (render + measure both themes): open panel, active-highlight, selected check,
      disabled option, invalid border, placeholder, flip-up, horizontal clamp, dark-mode panel elevation — Victor confirms.

## 8b. Build result + gates (2026-08-08) — IMPLEMENTED, Visual Gate PASS
Files: `components/select.tsx` · `select.stories.tsx` · `select.test.tsx` (24 jsdom) · `internal/select-styles.ts` ·
`tamagui.config.ts` (+`light_/dark_Select`, + the DEF-U4-e line-height fix) · `index.ts` barrel. typecheck 2/2 ·
@vida/ui **92/92** · build + build-storybook ✓ · root 10/10.

**Measured in headless Brave (Playwright), both themes:** panelBackground crosses the portal (light `#FFFFFF` / dark
`#0F172A` via `<Theme name="Select">`) · border `#E2E8F0`/`#334155` · `zIndex 1000` · `radius 8px` · 5 options ·
selected Cherry → check · active/hover highlight `#F8FAFC`/`#1E293B` · invalid border `#EF4444` · placeholder muted
`#64748B`/`#94A3B8` · flip-up (panelY 520 < triggerY 622) · 0 page errors.

**Two things the Visual Gate caught that typecheck + 92 tests passed clean** (why the gate exists):
- **Flip mixed top+bottom** → panel squished to 10px. Tamagui's `style` does NOT clear a stale inline `top` when a
  later render omits it → the fixed panel got both. Fixed: position with a **single `top`** (compute the flipped top
  from the measured height), never top+bottom together.
- **Text clipped to a 1.5px line box** (option/value text invisible). Root: `createFont` was fed the font **ratios**
  (`1.5`) as `lineHeight`, which Tamagui applies as `1.5px`; `numberOfLines`→`overflow:hidden` clipped the glyphs.
  Latent on EVERY primitive (glyphs overflowed a too-short box). Fixed at the Tamagui boundary — **ratio→px**
  (`round(fontSize×lineHeight)`) in `tamagui.config.ts` — pipeline stays ratio-pure. [DEF-U4-e; verified Button +
  Checkbox unregressed.] [[tamagui-createfont-lineheight-ratio-is-px]]
Deviations were corrective bug-fixes (not approach changes) — no §XXVIII re-gate needed.

## 9. Deferrals + defects (bounded, not silent — flagged for DS / later units)
- **DEFER-U4-a — option virtualization (contract "virtualized above ~100 items").** U4 renders all options.
  Justification: the contract's own Intent fences Select to a "known, **closed** list" and explicitly excludes
  large/async search ("NOT large async search → `Combobox`"), so a >100-option Select is out of the component's
  intended use. A windowing seam is documented; revisit if a real 100+ consumer appears. [FACT: select.md Intent +
  Performance Budget] — a **documented bound, not a silent cap**.
- **DEFER-U4-b — async-options loading spinner.** The `loading`/`aria-busy` **seam** ships (state supported); the
  actual async-load spinner render is deferred (no async-option consumer yet; the contract marks loading a "slot").
- **DEFER-U4-c — full scroll-follow / collision positioning → Popover (#9).** U4 closes on scroll + does a simple
  vertical flip; the reusable floating engine is generalized when Popover is built (YAGNI now).
- **DEF-U4-d (for DS) — no `select.borderFocus` token** though Input has `input.borderFocus`. U4 uses semantic
  `color.focus.ring` directly (every primitive's focus ring does). DS may add `select.borderFocus` for parity, or
  record that the ring is intentionally semantic-direct. Not UI-1's call.
- **DEF-U4-e (RESOLVED this unit) — `createFont` received font `lineHeight` RATIOS as px.** `tamagui.config.ts` passed
  `fonts.ts`'s ratios (`1.5`) straight to `createFont`, which applies numeric line-heights as px → a `1.5px` line box
  (latent on all text; clipped only under `overflow:hidden`). Fixed at the Tamagui boundary: `lineScale` now =
  `round(fontSize[k] × lineHeight[k])` px (pipeline/`fonts.ts` stay ratio-pure — Figma/CSS-var projection may want the
  ratio). Cross-cutting but corrective; Button + Checkbox re-verified unregressed. A DS may later choose to also emit a
  px line-height in the pipeline; the Tamagui-adapter conversion is the correct minimal home meanwhile.
