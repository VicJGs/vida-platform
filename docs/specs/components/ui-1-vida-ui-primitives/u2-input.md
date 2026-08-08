# U2 — Input · implementation reconcile (DS-5 contract → Tamagui v2)

Gate: §XXVI double-gate + component Visual Gate. Contract source: `ds-5-primitive-contracts/input.md`
(authoritative on API + states + tokens). This doc reconciles that contract to Tamagui v2 impl reality and
carries the U1 lessons forward ([[tamagui-group-breaks-content-width]]; component token ≠ space-scale token;
"measure the render, don't hypothesize"). **Rev 3** — grounded in Tamagui v2 docs (see below); the ring/border now
use the documented `focusWithinStyle` pseudo-prop (no JS focus state, no injected color CSS — supersedes Rev 2's
workaround). Rev 2 had applied the gate-1 critique (REVISE): local spinner (no reopening shipped Button); fake
"error-text ownership" decision deleted (contract settles it).

## Documentation grounding (Tamagui v2 · /verify /tamagui/tamagui · 2026-08-06)

Verified against `@tamagui/core` 2.6.2 docs (styled.mdx · components/new-inputs/2.0.0.mdx · intro/styles.mdx ·
guides/theme-builder.mdx · guides/how-to-upgrade.mdx). Facts that shape the impl:
- **`render:'input'`** — `styled(View, { render:'<tag>' })` with a string is the documented, compiler-optimized way
  to emit a semantic HTML element on web [FACT: styled.mdx "Render HTML Elements"]. Same family as Button's `render:'button'`.
- **Web-standard event model** — v2 Input uses `onChange={(e)=> …e.target?.value ?? e.nativeEvent?.text ?? ''}`,
  `type`, `readOnly`, `inputMode`, `autoComplete` (RN-era `onChangeText`/`secureTextEntry`/`editable` retired)
  [FACT: how-to-upgrade.mdx]. Our `onChangeText` prop wraps this exact defensive extraction.
- **`focusWithinStyle` IS a documented pseudo-prop** — `<View focusWithinStyle={{ borderColor:'$blue10' }} />`
  [FACT: intro/styles.mdx, alongside focusStyle/focusVisibleStyle/pressStyle/disabledStyle]. → the FRAME shows the
  ring + `borderColor:'$borderFocus'` on the inner input's `:focus-within`, colors via **theme tokens** (theme-correct).
  This removes Rev 2's JS focus state AND the injected-color-CSS Blocker entirely.
- **`hoverStyle` on the frame** — documented [FACT: styles.mdx]; the frame is the hovered element, so the border
  strengthens with no `group` and no injected CSS.
- **Sub-theme by `name`** — `name:'Input'` auto-applies `light_Input`/`dark_Input` when registered [FACT:
  theme-builder.mdx "Component Theme Inheritance"] — confirms the `tamagui.config.ts` registration step.
- **Tamagui HAS a first-party `Input`** (`@tamagui/input`, docs new-inputs/2.0.0.mdx) with `placeholderTextColor`
  (ColorTokens), `type` union incl. `'search'`, `selectionColor`, built-in RN keyboard parity — **NOT installed**
  (only core + animations-css). → the base-component fork below (OPEN DECISION #1).

## First-impl VERIFY (the two things docs don't settle for a *core* `render:'input'`)

Docs answered most of Rev 2's spike. If we build on core `render:'input'` (recommended), two items remain to
confirm in-browser as the FIRST implementation action (U1 "measure the render" discipline), before the rest:
1. **Controlled-prop + ref forwarding** — a bare `styled(View,{render:'input'})` forwards `value`/`onChange`/`type`/
   `readOnly`/etc. to the DOM node and `forwardRef` lands on that `<input>` (the web-standard model is documented for
   the *Input component*; confirm it holds for a core styled-view-as-input).
2. **Placeholder color** — does `placeholderTextColor='$placeholder'` apply on core `render:'input'` (it's a documented
   `@tamagui/input` prop; may not be wired on a bare styled view)? If not → the minimal fallback is a `::placeholder`
   rule keyed to the frame's Tamagui-generated class, color from a REAL emitted theme var (never `variables.css`,
   not wired [FACT: packages/ui/src/CLAUDE.md:32]). If BOTH are unclean → adopt `@tamagui/input` (OPEN DECISION #1b).

## Structure (frame + inner native input)

Unlike Button (which WAS the focusable `<button>`), Input is a bordered **frame** wrapping the real `<input>` so
the `leading`/`trailing` slots sit inside the box. The forwarded ref targets the inner input (focus management).

- `InputFrame = styled(View, { name:'Input', variants:{ size } as const, defaultVariants })` — the bordered
  container. `name:'Input'` auto-applies `light_Input`/`dark_Input` [FACT: themes.ts:21-22]. `flexDirection:'row'`,
  `alignItems:'center'`, `gap`, `borderWidth:1`, `borderColor:'$border'`, `backgroundColor:'$background'`,
  `borderRadius:'$radius'`, horizontal padding + height per `size`. Carries `className="vida-input"` (for the
  injected focus-ring / hover / placeholder CSS — see Motion §).
- `NativeInput = styled(View, { name:'Input', render:'input' })` — the real `<input>` (void element, no children,
  no border, transparent bg, `flex:1`, `height:'100%'`, `outlineStyle:'none'`, `color:'$text'`, font from `$body`).
  **`render:'input'`** → a real `<input>` (native text editing, `type`, form participation) — v2 `render`, not v1
  `tag` [FACT: /verify styled.mdx; carried from U1]. It renders no outline of its own — the ring is on the frame.
- `Input = forwardRef<HTMLInputElement, InputProps>(...)` composes `leading` + `NativeInput` + `trailing` inside
  `InputFrame`. Exported `InputProps` (§VII). Ref type = `HTMLInputElement` (web-only now; `| TextInput` when
  mobile is built — the contract's union, RN half deferred) [FACT: input.md:29]. Ref-forwarding target confirmed by
  the spike (step 2).
- **Focus ring on the frame = `focusWithinStyle` (documented).** The frame is a non-focusable `View`, so Button's
  `focusVisibleStyle` (keys off the element's OWN focus, button.tsx:30-35) can't fire on it. Tamagui's
  **`focusWithinStyle`** fires when a *descendant* (the inner `<input>`) is focused [FACT: intro/styles.mdx] — exactly
  our case: `focusWithinStyle={{ outlineColor:'$colorFocusRing', outlineWidth:2, outlineStyle:'solid', outlineOffset:2,
  borderColor:'$borderFocus' }}`. Colors are **theme tokens** → switch light↔dark correctly (no injected hex, no
  `var(--focus-ring)` — resolves critique B1). **Note (§VIII):** `:focus-within` fires on pointer AND keyboard;
  for a *text field* that is the correct, native behavior (the field is active for typing → ring shows), whereas
  §VIII's pointer-suppression is a button concern (a text input's caret already signals activation). Reasoned
  choice, not an oversight.

## Native prop wiring (web `<input>`)

- `onChangeText?: (v)=>void` → `onChange={(e)=> onChangeText?.(e.target?.value ?? e.nativeEvent?.text ?? '')}` — the
  documented v2 web-standard extraction [FACT: how-to-upgrade.mdx], defensive across web/RN. `value`/`defaultValue`
  pass through for controlled/uncontrolled. (Forwarding on a *core* render:'input' = First-impl VERIFY item 1.)
- `type` → native `type` attr, the full 6-value union `'text'|'email'|'password'|'number'|'tel'|'url'` [FACT:
  input.md:23]; `password` masks natively. (A test asserts a non-`password` value, e.g. `type="email"`, reaches the
  DOM `type` attr — password-only proof isn't proof the union forwards.) `readOnly`→`readOnly`+`aria-readonly`; `required`→
  `required`+`aria-required`; `disabled`→native `disabled` (not focusable — no loading/disabled conflict here,
  unlike Button); `invalid`→`aria-invalid="true"`; loading→`aria-busy`. `{...rest}` spread FIRST so computed a11y
  props win (N1, carried from U1) — this also passes through consumer-supplied `aria-label`/`aria-describedby`.

## Token map (all via the Input sub-theme; base tokens cascade through)

| Slot | Token | Source [themes.ts:21] |
|------|-------|------------------------|
| fill | `$background` | `colorSurfacePrimary` |
| border (default) | `$border` | `colorBorderDefault` |
| border (focus) | `$borderFocus` | `colorFocusRing` |
| border (error) | `$borderError` | `colorSignalDanger` |
| text | `$text` | `colorTextPrimary` |
| placeholder | `$placeholder` | `colorTextMuted` |
| radius | `$radius` | `radiusControl` |
| ring | `$colorFocusRing` (base cascades) | — |

`padding` component token = `spaceInsetDefault` = `space.12`; **it can't drive `paddingHorizontal`** (Tamagui
resolves space props against the space scale, not the sub-theme — U1 post-impl fact). So padding uses **space-scale
tokens** (`$12/$16/$20`), same as Button.

## Variants

- `size: sm|md|lg` → height (`$32/$40/$48`) + `paddingHorizontal` (`$12/$16/$20` space tokens) + font size
  (`$caption/$small/$body`) + `gap` for slots (`$8`). `defaultVariants:{ size:'md' }`.

## 8 visual states (per contract §Visual States — error/empty are FULLY live here)

| State | Impl |
|-------|------|
| default | `$background` fill + 1px `$border` + `$text` + `$radius` + padding |
| hover | **border strengthens** via `hoverStyle:{ borderColor: … }` on the frame (the frame IS the hovered element — no `group`, no injected CSS). Which token = OPEN DECISION #1 (no `input.borderHover` token; UI-1 can't add tokens). Instant swap (B12) |
| focus | 2px `$colorFocusRing` ring on the FRAME + `borderColor → $borderFocus`, via documented **`focusWithinStyle`** (fires on the inner input's focus; tokens switch light↔dark). Ring shows whenever the field is active — correct for a text input (see Structure §) |
| active | typing/caret — native caret; visually identical to focus |
| disabled | native `disabled` (not focusable) + muted fill/text via `opacity:0.5` (manual, keyed to `disabled`) + `cursor:'not-allowed'` |
| loading | trailing spinner (LOCAL to input.tsx — see Files) + `aria-busy`; input stays readable/editable |
| error | `invalid` → `borderColor → $borderError` (danger) + `aria-invalid="true"`; forwards `aria-describedby` (see Error ownership §). Error takes precedence over the focus border color when both hold |
| empty | native `placeholder` in `$placeholder` (muted); placeholder is never the value (controlled `value` stays independent) |

## Motion — TRANSCRIBED from the contract [FACT: input.md:44-49; themes/CLAUDE.md B12]

- B12: animate only `transform`/`opacity`; the error-border and focus-border swaps are **instant** (state, not
  animated) [FACT: input.md:48]. Reduced-motion: ring appears instantly [FACT: input.md:49].
- **Colors are Tamagui theme tokens, not injected CSS** (critique B1, resolved). Ring/border/error/hover colors are
  Tamagui styled/pseudo props (`focusWithinStyle` + `hoverStyle` + `borderColor` conditioned on `invalid`), using
  `$borderFocus`/`$borderError`/`$colorFocusRing` + the hover token — all resolve per active theme AND switch
  light↔dark. The `variables.css` `--*` names are a Figma/doc projection, NOT wired at runtime [FACT: CLAUDE.md:32].
- **Placeholder color** = `placeholderTextColor='$placeholder'` (documented `@tamagui/input` prop [FACT:
  new-inputs/2.0.0.mdx]; First-impl VERIFY item 2 confirms it applies on a *core* render:'input'). Fallback = one
  `::placeholder` rule keyed to the frame's Tamagui class, color from a REAL emitted theme var — structural, not a hex.
- **Focus-ring fade (OPEN DECISION #3):** the contract names an opacity fade-in (`duration.fast`/`easing.out`).
  Button shipped an **instant** outline ring (an outline can't animate opacity; a box-shadow ring can, but B12
  forbids animating `box-shadow`) and PASSED the gate. Recommend parity: instant ring here too; the fade is a
  deferred nicety, not a per-component fork.

## Accessibility (contract §A11y)

- Role `textbox` (native `<input>`). **Name is contract-enforced** [FACT: input.md:52 "no unlabeled input"] as a
  dev-time runtime assertion (mirrors Button's icon-only warn, `button.tsx:169`): warn when
  `id == null && aria-label == null && aria-labelledby == null` (no `id` ⇒ no `<label htmlFor>` can target it, and
  no `aria-label`/`aria-labelledby` ⇒ no name). If `id` is present we assume an external label exists (can't verify
  a `<label>` from inside the component). The warn message documents the escape hatch: "provide `aria-label`/
  `aria-labelledby`, or ensure a `<label htmlFor={id}>` exists." Dead-code-eliminated in prod (`process.env.NODE_ENV`).
- `invalid`→`aria-invalid`; `required`→`aria-required`; `readOnly`→`aria-readonly`; loading→`aria-busy`. `:focus-visible`
  ring never suppressed for keyboard.

## Error ownership (contract FACT — not a decision)

The contract settles this; it is stated, not decided (critique S4 — the same mis-framing U1 self-corrected,
u1-button.md:122). `InputProps` has **no `errorText` prop** [FACT: input.md:11-28] and input.md:41 says the error
text sits "below via `aria-describedby`". So Input's error job = set `aria-invalid`, swap to `$borderError`, and
**forward** `aria-describedby` (via `{...rest}`). The **visible error text + the `<label>`** are owned by the
consumer / a future `FormField` wrapper (NOT in UI-1 scope — OUT fence, task:26). "No layout shift default↔error"
[FACT: input.md:58] holds trivially: the border swap doesn't reflow, and the error text lives in the consumer's
reserved space.

## Files

- NEW `packages/ui/src/components/input.tsx` — `InputProps` exported.
- NEW `packages/ui/src/components/input.stories.tsx` — a story per state + an all-states matrix × light｜dark.
- NEW `packages/ui/src/components/input.test.tsx` — jsdom (~7): renders `<input>`; `type="email"` reaches the DOM
  `type` attr (union forwarding, not just password); `type="password"` masks; `disabled` → native disabled (not
  focusable); `invalid`→`aria-invalid`; `readOnly`→`aria-readonly`; `required`→`aria-required`; `onChangeText` fires
  with the typed value; unlabeled → warns / labelled (`aria-label` or `id`) → silent.
- NEW `packages/ui/src/internal/input-styles.ts` — **only if** the spike shows `placeholderTextColor` doesn't map
  (a single `::placeholder` rule reading the real Tamagui theme var). Otherwise not created.
- NEW local spinner in `input.tsx` — a minimal inline SVG spinner (copy of the Button pattern, ~30 lines). Does
  NOT touch the shipped `button.tsx` (critique S3 — don't reopen a gated primitive). A later DRY-extraction to
  `internal/spinner.tsx` is filed as a separate refactor for when the 3rd caller (Select) lands.
- EDIT `packages/ui/src/tamagui.config.ts` — import + register `light_Input, dark_Input` in `themes` (currently
  Button-only — **without this `name:'Input'` resolves nothing**). Then run **typecheck on BOTH configs** (the
  `type VidaConfig = typeof config` change + `tamagui.d.ts` augmentation must still hold; DoD).
- EDIT `packages/ui/src/index.ts` — export `Input` + `InputProps`.

## Open decisions (for Approval) — 3 genuine forks

1. **Input base component** (grounding surfaced this — pattern-setting for Select/Checkbox too). **(a, recommended)**
   core `styled(View,{render:'input'})` — matches the Button precedent (button.tsx), no new dependency, `render` is
   the documented semantic-HTML path; placeholder-color + controlled-forwarding are the two First-impl VERIFY items.
   **(b)** add first-party `@tamagui/input` and wrap its `Input` — gets `placeholderTextColor`, web-standard events,
   and RN keyboard parity documented/built-in, at the cost of a new (version-pinned) dep + divergence from Button.
   Recommend (a): stay consistent, defer the dep until proven necessary; (b) is the documented fallback if the two
   VERIFY items come back unclean. (This is the "right level of complexity for now" call — web-only today.)
2. **Hover border token.** No `input.borderHover` token exists and UI-1 must not add component tokens (DS-5 firmed
   them; task fence:26). Mechanism is settled (frame `hoverStyle`); the open part is WHICH in-fence color: **(a,
   recommended)** hover → `$colorTextMuted` (parent-theme cascade under `name:'Input'`; neutral500 — perceivable,
   distinct from the brand focus border); **(b)** a faint fill overlay; **(c)** defer to the DS-2 brand pass.
   Recommend (a); confirm at the Visual Gate. (Same class as U1's overlay-color item — flagged, not decided ad-hoc.)
3. **Focus-ring fade** → recommend instant ring (U1 parity; an outline can't fade-opacity, a box-shadow ring can't
   under B12). The contract's fade is a deferred nicety, not a per-component fork. (See Motion §.)

*(Dropped from Rev 1: spinner extraction — now local, no fork, per S3. Error-text ownership — a contract FACT, not
a decision, per S4.)*

## Build result + gates (2026-08-06)

- **First-impl VERIFY** (the two doc-unsettled items, measured in jsdom/probe): (1) core `styled(View,{render:'input'})`
  **forwards** value/onChange/type/disabled/readOnly/required/aria-* + `forwardRef` lands on the DOM `<input>` — **PASS**
  → base = **(1a) core render:'input'**, no `@tamagui/input` dep. (2) `placeholderTextColor` is **NOT** consumed on core
  render:'input' (React warns) — **used the fallback:** `internal/input-styles.ts` injects `.vida-input::placeholder{
  color:var(--placeholder)}`; the probe confirmed `--placeholder` is the real Tamagui theme var (light `neutral500` /
  dark `neutral400`) → muted + theme-switching, no hardcoded hex.
- **Post-impl critique** (independent, on the actual code): **SHIP.** Empirically verified (rendered into jsdom): the
  invalid-over-focus/hover border precedence is real (Tamagui's variant merge emits only the winner — not a cascade
  tie), the injected `::placeholder` wins by source order, the `size` variant doesn't leak the HTML `size` attr, and no
  B12 violation (no `animation` prop; border/ring are instant swaps). Applied its 1 actionable nit: a class-level
  precedence-lock test (`input.test.tsx` — invalid frame has `borderError`, not the focus/hover border).
- **Focus-visible reconcile** (Victor: the deliverable = what's documented, not my discretion): replaced the
  `focusWithinStyle` draft with the documented `:focus-visible` via `.vida-input-frame:has(input:focus-visible)` (see
  the Focus-ring section). Probe-verified the theme vars resolve on the frame's inherited `.t_Input` scope.
- **Verify battery:** typecheck both configs ✓ · @vida/ui **51/51** (14 Input) · root typecheck 10/10 ✓ ·
  `build` ✓ · `build-storybook` ✓ (input.stories compiles). Button untouched (6 tests still green).

## Focus ring — delivered AS DOCUMENTED (`:focus-visible`)

The contract mandates `:focus-visible` — input.md:37 (focus trigger), input.md:55 ("`:focus-visible` ring always
visible"), and components §VIII:155 ("always `:focus-visible` for pointer suppression", keyboard focus). An earlier
draft used `focusWithinStyle` (`:focus-within`) — **that was a deviation** (it rings on pointer-click and on a focused
trailing clear/reveal button) and was corrected. The spec is the deliverable.

Delivery: the ring must sit on the FRAME (focus lands on the inner `<input>`, which is inset by padding), and
Tamagui `focusVisibleStyle` can't fire on the never-focused frame. So the DOCUMENTED `:focus-visible` selector is
lifted to the frame via `.vida-input-frame:has(input:focus-visible)` (internal/input-styles.ts) — the §VIII pure-CSS
`:focus-visible { outline… }` pattern, keyed to the inner input. Ring color = `var(--colorFocusRing)`, border→focus =
`var(--borderFocus)` — the REAL Tamagui-emitted theme vars (probe-verified: light `brand500` / dark `brand400`, they
switch), scoped on the `.t_Input` theme wrapper the frame inherits from (probe-verified DOM: `html.t_light → .t_Input
→ .vida-input-frame`). Error precedence: the border-focus rule is guarded `:not(.vida-input-invalid)` so the danger
border wins; the ring still shows on an invalid+focused field. Requires `:has()` (all modern browsers ≥2023; Vida is
a modern-only OPFS SPA). B12: instant swap, no animation.

## Definition of Done (U2)

- `input.tsx` in `components/`; `InputProps` exported; barrel re-exports it; `light_Input`/`dark_Input` registered.
- All 8 states implemented (error/empty live); forwardRef → `HTMLInputElement`; strict TS, no `any`/`!`;
  placeholder ≠ value; `aria-invalid` + `aria-describedby` forwarding; name-assertion dev warn.
- `input.stories.tsx`: per-state + matrix, rendered × light｜dark.
- `@vida/ui` typecheck (both configs) + tests green (incl. `input.test.tsx`; Button untouched, its 6 tests stay green).
- addon-a11y clean on the stories (any AA gap flagged as provisional-palette, not a U2 defect).
- Component **Visual Gate**: Victor approves the 8-state × light｜dark render (measure: ring wraps the frame;
  error border danger; placeholder muted, not the value; password masks; disabled muted + not focusable; hover
  border perceivably strengthens).
