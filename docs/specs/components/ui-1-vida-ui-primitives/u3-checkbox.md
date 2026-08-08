# U3 — Checkbox · implementation reconcile (DS-5 contract → Tamagui v2)

DS-5 primitive 3/10 (atomic, last of the atomic tier). Implements
`docs/specs/components/ds-5-primitive-contracts/checkbox.md` against Tamagui v2 in `@vida/ui`.
Gate: §XXVI per-component double-gate + component Visual Gate. Task: ui-1-vida-ui-primitives (LIF-86).

No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X].

---

## 0. Baseline (code-as-is — verified this session)
- **Sub-theme already generated, not yet registered.** `light_Checkbox`/`dark_Checkbox` exist in
  `themes/themes.ts` (keys: `backgroundChecked`, `border`, `borderError`, `checkmark`, `radius`) but
  `tamagui.config.ts` wires only `light_/dark_Button` + `light_/dark_Input`. [FACT: themes.ts:15-16;
  tamagui.config.ts:11,49] → U3 config change is additive: import + add to the `themes:` map.
- **Component tokens** [FACT: component.json.checkbox]: `border → {color.border.default}`,
  `backgroundChecked → {color.brand.emphasis}`, `checkmark → {color.text.inverse}`,
  `borderError → {color.signal.danger}`, `radius → {radius.control}`. All resolve to shipped semantic
  tokens (three-layer intact). White check on brand.emphasis (indigo) — AA-safe per DS-2 contrast rule.
- **Reusable, unchanged:** `hooks/use-reduced-motion.ts`; `internal/interaction-styles.ts`
  (`vida-interactive`+`vida-overlay` = the contract's hover/press **overlay** tokens); the
  injected-stylesheet-with-real-theme-vars pattern (`internal/input-styles.ts`); the dev-time
  accessible-name warn; forwardRef; jsdom `*.test.tsx`. [FACT: files read]
- **Verify:** `pnpm --filter @vida/ui typecheck && build && test` (currently @vida/ui 51 tests). [FACT:
  session-log 2026-08-07]

## 1. Structure (native input + styled box + label wrapper)
The accessible checkbox pattern: a **real visually-transparent `<input type="checkbox">`** overlaid by a
styled visual box, both inside a **real `<label>`** (so label + box + text all toggle natively).

```
<label class="vida-checkbox [vida-checkbox-invalid?]"           // = styled(View,{name:'Checkbox', render:'label'})
       name="Checkbox">                                        //   → real <label>, and .t_Checkbox scope for ALL descendants
  <span class="box" (styled View)>                             //   plain styled View (inherits .t_Checkbox scope)
    <input type="checkbox" class="vida-checkbox-input" />      //   real input, absolute-fills the box, opacity:0, focusable
    <span class="vida-overlay" aria-hidden />                  //   hover/press overlay (interaction-styles.ts)
    <svg class="check" aria-hidden />  <svg class="dash" aria-hidden />  // checkmark + indeterminate dash (CSS-driven)
  </span>
  {label && <Text class="label">…</Text>}                      //   slot; focus ring is on .box, NOT the label
</label>
```

- **The `<label>` host is `styled(View,{name:'Checkbox', render:'label'})`** (F#4 fix — the wrapper, not the
  box, carries `name:'Checkbox'`, so the whole control is in the `.t_Checkbox` scope and the sub-theme vars
  `--backgroundChecked`/`--border`/`--checkmark`/`--borderError` resolve on `.box` + the injected CSS).
  `render:'label'` emits a real `<label>` (native click-to-toggle + implicit label association). **Verify at
  impl** that Tamagui v2 core `render:'label'` emits `<label>` (mirrors the U2 in-browser check that core
  `render:'input'` forwards native attrs). [FACT: input.tsx:65 render:'input' precedent]
- **Why native `<input type="checkbox">`** [FACT: checkbox.md §A11y]: it gives role `checkbox`,
  `aria-checked` true/false, **Space-toggles-not-Enter**, `name`/`value` form participation, `required`,
  `disabled` (tab-order removal) — all native, no manual key handling. [INTERP: components §VII forwardRef
  target = HTMLInputElement; contract forwardRef `HTMLInputElement | View`]
- **Focus lands on the input** (visually transparent — `opacity:0`, NEVER `display:none`, so it stays
  focusable); the ring is drawn on `.box` via `.vida-checkbox:has(.vida-checkbox-input:focus-visible) .box` —
  the same `:focus-visible`-lifted-to-a-box pattern shipped for Input, honouring "focus ring on the box, not
  the label". [FACT: input-styles.ts:9-17; checkbox.md §A11y "Focus: ring on the box"]

## 2. State visuals — driven by the native input's CSS pseudo-classes (`internal/checkbox-styles.ts`)
A new injected stylesheet (mirrors `input-styles.ts`: idempotent, browser-only, appended after Tamagui's
sheet, real switching theme vars). The **wrapper `<label>`** is `name:'Checkbox'` (§1), so Tamagui emits the
sub-theme keys as `--backgroundChecked` / `--border` / `--checkmark` / `--borderError` on the `.t_Checkbox`
scope — `.box` and the injected rules below are descendants, so the vars resolve on them.

| Visual | Selector | Declaration (theme var) |
|--------|----------|--------------------------|
| fill on checked | `.vida-checkbox:has(input:checked) .box` | `background:var(--backgroundChecked);border-color:var(--backgroundChecked)` |
| fill on indeterminate | `.vida-checkbox:has(input:indeterminate) .box` | same fill |
| checkmark show | `.vida-checkbox:has(input:checked) .box .check` | `opacity:1;transform:scale(1)` (base: `opacity:0;transform:scale(.8)`) |
| checkmark hide when indeterminate | `.vida-checkbox:has(input:indeterminate) .box .check` | `opacity:0` (dash wins — contract: mutually exclusive) |
| dash show | `.vida-checkbox:has(input:indeterminate) .box .dash` | `opacity:1` (base `opacity:0`) |
| focus ring | `.vida-checkbox:has(input:focus-visible) .box` | `outline:2px solid var(--colorFocusRing);outline-offset:2px` |
| error border | `.vida-checkbox-invalid .box` | `border-color:var(--borderError)` (precedence: after focus-border, danger wins; ring still shows) |

- **Motion (B12)** [FACT: checkbox.md §Motion]: only `transform`(scale) + `opacity` transition, on the
  checkmark/dash, `duration.fast`/`easing.out`. Reduced-motion: `@media (prefers-reduced-motion:reduce)`
  drops the transition → instant. (Same shape as `interaction-styles.ts` reduced-motion guard.)
- **`:indeterminate` is a DOM property, not an attribute** — React can't set it declaratively. A
  `useLayoutEffect` sets `inputEl.indeterminate = indeterminate === true` (via the internal ref); once set
  the CSS `:indeterminate` pseudo-class matches. The mechanism (callback-merged ref, no `!`/`any`) is
  specified in §3. In ADDITION, `aria-checked="mixed"` is set explicitly on the input when `indeterminate`
  (F#6): jsdom does not synthesize `mixed` from the `.indeterminate` property, so the explicit attr makes the
  state deterministic for AT and jsdom-testable; native handles binary checked/unchecked. [FACT: HTML spec;
  checkbox.md API `indeterminate` + §A11y `aria-checked="mixed"`]
- **hover/active** [FACT: checkbox.md hover="overlay opacity", active="press overlay opacity"]: reuse
  `interaction-styles.ts` — `.box` gets `vida-interactive`, the overlay child `vida-overlay`
  (`hover 0.08 / active 0.16`, ink = `$colorTextPrimary`). Perceivable beyond colour (opacity), B12-legal, no
  new tokens. ⚠ **Visual-Gate measurement (F#8):** a dark-ink overlay on the FILLED (indigo `backgroundChecked`)
  box in **dark theme** may be under-perceptible. This is measured in the gate (checked × hover × dark, §6).
  **Fallback if it fails:** strengthen the box **border** on hover (a `border-color`→stronger swap, instant,
  still no animated colour) instead of / in addition to the overlay — a documented fallback, not a silent gloss.

## 3. API (exported `CheckboxProps` — FLAT, exactly as the contract authors it)
[FACT: checkbox.md:11-25 authors `export interface CheckboxProps { … }` FLAT.] The contract is the
authoritative spec for this primitive, so the interface ships **verbatim** — I do not rewrite the authored
API surface at implementation time (deliverable = the doc).

```ts
export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** tri-state: visually a dash; aria-checked="mixed". Mutually exclusive with a checked=true render. */
  indeterminate?: boolean
  disabled?: boolean
  invalid?: boolean          // required-but-unchecked in a submitted form → danger border + aria-invalid
  required?: boolean
  size?: 'sm' | 'md' | 'lg'  // default 'md'
  label?: React.ReactNode    // slot; when omitted, aria-label REQUIRED
  name?: string
  value?: string
}
// + pass-through: aria-label / aria-labelledby / aria-describedby / id / onFocus / onBlur …
```

**§VII discriminated-union tension — flagged, not resolved unilaterally (was F#2, re-grounded).** §VII
(components.md:93) mandates a discriminated union for mutually-exclusive combos, and DS-5 `_index.md §2`
*claims* §VII compliance — yet the checkbox contract authors `checked`/`indeterminate` as independent
optionals. That is an inconsistency **inside DS-5's own docs** (contract vs its parent conventions). Per the
"half-baked spec is triage, not a decision" rule, UI-1 does **not** silently rewrite the contract into a
union (my discretion) nor ship a knowingly §VII-violating API without a word. Instead:
1. **Deliver the flat contract API** (authoritative for this primitive; also the universal ecosystem shape —
   Radix/MUI/React-Aria all keep `checked`+`indeterminate` independent, because a single native `<input>` is
   one element, not a union of two).
2. **Prevent the one invalid combo at runtime** — `indeterminate` render precedence (dash wins, checkmark
   hidden, §2) [FACT: checkbox.md:15 "mutually exclusive with a checked=true render"] **plus** a NODE_ENV dev-warn
   if `checked===true && indeterminate===true` (mirrors the Button/Input icon-only dev-warn precedent).
3. **Flag the doc inconsistency as a defect** for DS to reconcile (union the contract, or waive §VII for it
   with rationale) — recorded in §7 D4 + surfaced at session close. Not UI-1's call to make.

- Controlled (`checked`+`onCheckedChange`) OR uncontrolled (`defaultChecked`) — native `<input>` supports
  both; `onCheckedChange(e.currentTarget.checked)` (mirrors Input's `onChangeText`). [FACT: checkbox.md API]
- **forwardRef → the native input, via a callback-merged ref** (F#3 — internal ref needed to set
  `.indeterminate`; no `!`, no `any`):
  ```ts
  export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(props, ref) {
    const innerRef = useRef<HTMLInputElement | null>(null)
    const setRef = useCallback((node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    }, [ref])
    useLayoutEffect(() => { if (innerRef.current) innerRef.current.indeterminate = props.indeterminate === true })
    …
  })
  ```
  The inner input reuses the Input precedent's typed cast (`NativeInputEl as unknown as
  ForwardRefExoticComponent<… & RefAttributes<HTMLInputElement>>`, input.tsx:109-111) so the DOM ref forwards
  through the styled component. **Verify at impl** the ref resolves to a real `HTMLInputElement` (else the
  `useLayoutEffect` no-ops on `null` — the `if (innerRef.current)` guard makes that safe, not a crash).
- `{...rest}` spread onto the input FIRST so computed a11y props win (N1, carried from Button/Input).
- **Accessible name authority (F#5):** when the `label` slot is present it is the implicit name (native
  `<label>` association); `aria-label` is only needed/used when `label` is omitted. Dev-time warn
  (NODE_ENV-guarded, dead-code-eliminated in prod) fires only when **neither** `label` **nor**
  `aria-label`/`aria-labelledby` is present.

## 4. 8 visual states (contract §Visual States — `loading` justified N/A)
default (unchecked box) · hover (overlay) · focus (`:focus-visible` ring on box) · active (press overlay) ·
disabled (opacity 0.5, native tab-removal, hover suppressed) · **loading = N/A** (contract: a checkbox
toggles instantly) · error (`invalid` → danger border + `aria-invalid`) · empty (unchecked **is** the empty
state). [FACT: checkbox.md §Visual States]

## 5. Accessibility (contract §A11y)
Role `checkbox` (native). `aria-checked` true/false native; **`"mixed"`** via `.indeterminate` property.
Name = `label` slot (native `<label>` association) or `aria-label` (warn if neither). `invalid`→`aria-invalid`
+ pass-through `aria-describedby`; `required`→`aria-required` (+ native `required`); `disabled`→ native
`disabled`. Keyboard: **Space** toggles (native), Tab-reachable, label-click toggles (native). [FACT: checkbox.md §A11y]

## 6. Files
- `packages/ui/src/components/checkbox.tsx` — the primitive.
- `packages/ui/src/components/checkbox.stories.tsx` — Visual Gate surface (states × unchecked/checked/
  indeterminate × light｜dark; sizes; with/without label; invalid; disabled).
- `packages/ui/src/components/checkbox.test.tsx` — jsdom (role, aria-checked incl. mixed, Space toggle,
  controlled/uncontrolled, onCheckedChange, invalid→aria-invalid, disabled, label association, dev-warn).
- `packages/ui/src/internal/checkbox-styles.ts` — the injected pseudo-class stylesheet (§2).
- `packages/ui/src/tamagui.config.ts` — import + register `light_/dark_Checkbox` in `themes:`.
- (barrel `index.ts` if primitives are re-exported there — verify at impl.)

## 7. Decisions — with grounding label (FACT = written in a doc · INTERP = derived · UNKNOWN = doc silent)
- **D1 — box size values `sm 16 · md 20 · lg 24` dp. [INTERP: 4pt grid; contract + design.md SILENT on box
  dimension].** Honest grounding: the contract's Visual-States table (checkbox.md:29-38) cites `checkbox.border/
  backgroundChecked/checkmark/radius` but **no size**; design.md has no checkbox/control box-size spec (line 103
  "no arbitrary pixels" governs the *type scale*; §IV 4pt grid governs spacing). So the only applicable rule is
  the **4pt grid** → 16/20/24 are grid-legal, `$size` (32/40/48) is control-height (too large for a square box).
  **This is my interpretation of a doc gap, not a spec value** — UI-1 does not invent a `checkbox.size` token
  (DS-2/DS-5 own tokens). Flagged for DS to tokenize if it wants exactness (§8 defect list).
- **D2 — indeterminate = native `.indeterminate` property + CSS `:indeterminate` + explicit `aria-checked="mixed"`.**
  [FACT: checkbox.md:48 aria-checked "mixed"; :50 Space/label-toggle/form → native input; HTML spec: `.indeterminate`
  is an IDL property.] Chosen over a `role="checkbox"` div (manual keys, no `name`/`value` form participation).
- **D3 — visuals CSS-driven** (`:checked`/`:indeterminate` via `:has`). [FACT: checkbox.md:53-54 perf budget
  "no re-render of the whole group … checkmark is CSS/SVG"; input-styles.ts precedent.] Rejected: React-state render.
- **D4 — API = FLAT `CheckboxProps` verbatim from the contract** (§3). [FACT: checkbox.md:11-25.] The §VII
  union is NOT adopted — it would rewrite the authored API (discretion). The contract-vs-`_index.md §2`(§VII)
  inconsistency is **flagged as a DS defect** (§8), with the invalid combo prevented at runtime (render
  precedence + dev-warn). Corrects my earlier Approval-1 draft (which had proposed the union).
- **D5 — `<label>` host = `styled(View,{name:'Checkbox', render:'label'})`.** [FACT: Tamagui v2 docs — `render`
  accepts a string HTML tag ('button'/'a'/'nav'…), compiler-optimized for semantic HTML; verified via context7
  2026-08-07.] Satisfies contract §A11y "label click toggles" (checkbox.md:50). Confirm `<label>` in the DOM at impl.

## 8. Definition of Done (U3)
- [ ] `CheckboxProps` = the FLAT contract interface verbatim (D4); `checked`+`indeterminate=true` prevented
      at render (dash wins) + NODE_ENV dev-warn.
- [ ] unchecked/checked/indeterminate render; explicit `aria-checked="mixed"` when indeterminate
      (jsdom-asserted — not relying on UA computation, F#6).
- [ ] Space toggles (not Enter); label-click toggles; focus ring on the box (`:focus-visible`, not the label).
- [ ] All applicable states (loading N/A); `invalid`→danger border+`aria-invalid`; disabled non-focusable.
- [ ] Motion scale+opacity only (B12); reduced-motion instant. `checkbox.*` tokens resolve via sub-theme.
- [ ] `light_/dark_Checkbox` registered; typecheck 2/2 · @vida/ui tests green · build + build-storybook ✓.
- [ ] Component **Visual Gate PASS** (render + measure both themes), incl. the **checked × hover × dark**
      overlay-perceptibility measurement (F#8; border-strengthen fallback if under-perceptible) — Victor confirms.

## 8b. Build result + gates (2026-08-07) — IMPLEMENTED, Visual Gate PASS
Files: `components/checkbox.tsx` · `checkbox.stories.tsx` · `checkbox.test.tsx` (17 jsdom) ·
`internal/checkbox-styles.ts` · `tamagui.config.ts` (+`light_/dark_Checkbox`) · `index.ts` barrel ·
`.storybook/preview.tsx` (canvas paint). typecheck 2/2 · @vida/ui **68/68** · build + build-storybook ✓ · root 10/10.

**Measured in headless Brave (Playwright):** box 16/20/24 · checked indigo fill + check · indeterminate fill + dash
(check hidden) · focus ring 2px `rgb(99,102,241)` on the box · invalid border `rgb(239,68,68)` (wins over checked) ·
checked×hover×dark overlay 0→0.08 (ink adapts) · 0 page errors.

**3 things the Visual Gate caught that typecheck + jsdom passed clean** (why the gate exists):
- **Box missing its `.vida-checkbox-box` class** → every injected fill/ring/error rule no-op'd. Fixed + jsdom guard.
- **Danger border via injected CSS lost the specificity race** vs Tamagui's own border classes → moved to a Tamagui
  `invalid` variant (Input precedent). [[injected-css-loses-to-tamagui-variants]]
- **Storybook canvas stayed white in dark mode** → dark-theme label (correctly light) invisible → decorator now
  paints `$colorSurfacePrimary` (benefits all stories).
Deviations from the plan were additive/corrective (not approach changes) — no §XXVIII re-gate needed.

## 9. Defects raised (for DS, not resolved in UI-1)
- **DEF-U3-a — checkbox.md contract vs `_index.md §2`(§VII) inconsistency.** The contract authors
  `checked`/`indeterminate` as independent optionals; `_index.md §2` claims §VII "discriminated unions for
  exclusive combos." DS to reconcile: union the contract, or record a §VII waiver for it (single native input
  = one element; ecosystem norm is flat). UI-1 ships the flat contract API meanwhile (D4).
- **DEF-U3-b — no checkbox box-size spec.** Neither the contract nor design.md gives a square-control box
  dimension; UI-1 uses 4pt-grid dp 16/20/24 (D1). DS to tokenize (`checkbox.size` or a control-size scale) if
  exactness is wanted.
