# U1 — Button · implementation reconcile (DS-5 contract → Tamagui v2)

Gate: §XXVI double-gate + component Visual Gate. Contract source: `ds-5-primitive-contracts/button.md`
(authoritative on API + states + tokens). This doc reconciles that contract to Tamagui v2 impl reality.
/verify grounding: `/tamagui/tamagui` component-themes, styled/variants, pseudo-state styles (2026-08-06).

## Structure (⟳ REVISE-applied: `render` not `tag`; `group`; intent-driven text; spinner)

- `ButtonFrame = styled(View, { name:'Button', render:'button', group:'button', variants:{...} as const, defaultVariants })`.
  `name:'Button'` → auto-applies `light_Button`/`dark_Button` [FACT: themes.mdx]. **`render:'button'`** → real
  `<button>` (native Enter/Space, `type`, form submit, role) — Tamagui v2 renamed `tag`→`render` [FACT: /verify
  how-to-upgrade.mdx + styled.mdx; `tag` is v1 and would render a `<div>`]. `group:'button'` → lets the overlay
  child react to the frame's hover/press [FACT: /verify button/2.0.0.mdx `$group-btn-hover`].
- `ButtonText = styled(Text, { name:'Button', variants:{ intent: { primary:{color:'$textPrimary'},
secondary:{color:'$textSecondary'}, ghost:{color:'$textGhost'}, danger:{color:'$textDanger'} } } as const })`.
  Text color is **intent-driven** — `light_Button` has no generic `color` key, only `text<Intent>` [FACT:
  themes.ts:9; critique #5]. The wrapper passes `intent` to both frame and text.
- **Spinner (loading)** — no spinner primitive exists (`components/` are 0-byte stubs, `icons/` empty, `@tamagui/core`
  has none) [FACT: critique #3]. Build a minimal inline SVG spinner INSIDE button.tsx: a `<circle>` arc with SMIL
  `<animateTransform type="rotate" dur="0.8s" repeatCount="indefinite">` (self-contained, no global keyframe, no
  new dep). Reduced-motion → static arc glyph (no SMIL).
- `Button = forwardRef<HTMLButtonElement | View, ButtonProps>(...)` [FACT: button.md:37 — literal signature]
  wraps ButtonFrame, composes `leading`/`trailing` slots + `loading` spinner + `children` label. Exported
  `ButtonProps` (per components §VII). No discriminated union — the contract explicitly does not impose one
  [FACT: button.md:40 "A discriminated union is NOT imposed"].

## Token map (all via the Button sub-theme; base tokens cascade through)

| Intent    | bg                     | text             | border                                   |
| --------- | ---------------------- | ---------------- | ---------------------------------------- |
| primary   | `$backgroundPrimary`   | `$textPrimary`   | —                                        |
| secondary | `$backgroundSecondary` | `$textSecondary` | 1px `$borderSecondary`                   |
| ghost     | transparent            | `$textGhost`     | — (hover fills `$colorSurfaceSecondary`) |
| danger    | `$backgroundDanger`    | `$textDanger`    | —                                        |

Shape: `borderRadius:'$radius'`, padding from `$padding` scaled by `size`. Focus: `$colorFocusRing` (base, cascades).

## Variants

- `size: sm|md|lg` → height (`$32/$40/$48`) + horizontal padding (`$12/$16/$20` space tokens — see Post-impl:
  a component token can't drive `paddingHorizontal`) + font size (`$caption/$small/$body`).
- `intent: primary|secondary|ghost|danger` → bg/text/border per table above. `defaultVariants:{intent:'primary',size:'md'}`.

## 8 visual states (per contract §Visual States)

| State    | Impl                                                                                                                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| default  | intent fill + text + radius + padding                                                                                                                                                                            |
| hover    | opacity overlay (see Motion §, `button.md:76`); ghost → fill `$colorSurfaceSecondary` [FACT: button.md:61]                                                                                                       |
| focus    | `focusVisibleStyle={{ outlineColor:'$colorFocusRing', outlineWidth:2, outlineStyle:'solid', outlineOffset:2 }}` (`:focus-visible` only) [FACT: styles.mdx focusVisibleStyle]                                     |
| active   | overlay opacity → higher step, `duration.instant`                                                                                                                                                                |
| disabled | `disabledStyle`/prop: opacity ↓, `tabIndex=-1` + `disabled` attr (removed from tab order), no hover/press                                                                                                        |
| loading  | spinner + **width held** (critique #4): content (leading/label/trailing) stays in flow at `opacity:0` to reserve its exact width; spinner absolutely-centered over the frame; activation suppressed; `aria-busy` |
| error    | **N/A** — Button carries no data-validity (contract): justified                                                                                                                                                  |
| empty    | **N/A** — `children` required: justified                                                                                                                                                                         |

## Motion — TRANSCRIBED from the contract (no invention) [FACT: button.md:71–81; themes/CLAUDE.md B12]

- B12: animate only `transform`/`opacity`/`clip-path`; never `background`/`color`/`border` [FACT: button.md:71].
- The intent **fill darkens as a STATE change (instant token swap)**; the fill is never a transition target
  [FACT: button.md:72–73]. The animated feel is a **hover/press overlay whose opacity transitions**.
- Transitions [FACT: button.md:76–78]:
  | Transition | Duration | Easing | Property |
  |---|---|---|---|
  | default → hover | `duration.fast` (150ms) | `easing.out` | overlay **opacity 0 → ~0.08** |
  | press (active) | `duration.instant` (0) | — | overlay **opacity** (immediate) — "a second step" [FACT: button.md:50] |
  | loading spinner | 800ms loop | `easing.linear` | `transform: rotate` [FACT: button.md:78] |
  Impl = a shared overlay child (`View`, absolute inset 0, `borderRadius` inherit, `pointerEvents:'none'`,
  `animation="fast"`), opacity 0 default. It reacts to the FRAME via the **group** mechanism (critique #2 —
  `hoverStyle`/`pressStyle` apply to their own element, so a child can't read the parent's hover; `$group-*`
  can): `$group-button-hover={{ opacity: 0.08 }}`, `$group-button-press={{ opacity: 0.16 }}` [FACT: /verify
  button/2.0.0.mdx]. Press "second step" ~0.16 [INTERP: button.md:50], confirmed at the Visual Gate.
- Reduced motion [FACT: button.md:80]: overlay opacity toggles **instantly** (no transition); spinner → static
  indeterminate glyph. Impl `animation={reduceMotion ? undefined : 'fast'}` via a `prefers-reduced-motion` hook
  [FACT: motion.md:60–63 "instant state change, both versions designed"].

## Accessibility (contract §A11y)

- `<button>` tag → role + Enter/Space + `type` (default 'button') [FACT: button.md:84,87].
  `disabled`→`disabled`+`aria-disabled`; `loading`→`aria-busy` [FACT: button.md:86]. Icon-only (only `leading`,
  no `children`) **REQUIRES `aria-label`** — **contract-enforced** = a dev-time runtime assertion
  [FACT: button.md:85,105]; NOT a discriminated union [FACT: button.md:40]. Focus ring never suppressed for
  keyboard (`:focus-visible` only) [FACT: button.md:88].

## Definition of Done (U1)

- `button.tsx` in `packages/ui/src/components`; `ButtonProps` exported; barrel re-exports it.
- All applicable states implemented; error/empty justified N/A; forwardRef; strict TS, no `any`/`!`.
- `button.stories.tsx`: a story per state + an all-intents grid, rendered × light｜dark (8-state matrix).
- `@vida/ui` typecheck (both configs) + tests green (incl. `button.test.tsx`, jsdom).
- addon-a11y clean on the stories **except** the known filled-`danger` AA gap (`button.md:63-68`) — a
  provisional-palette item deferred to the DS-2 brand pass, not a U1 defect. Documented in the stories.
- Component **Visual Gate**: Victor approves the 8-state × light｜dark render.

## Visual Gate — PASS (2026-08-06)

Caught 2 layout bugs that all code-level checks (typecheck, tests, attribute/color probes) passed clean over —
the reason the Visual Gate exists ("code right ≠ visual right"):

1. **Content overflow.** The `group` prop (added for the hover overlay's `$group-*`) sets
   `container-type: inline-size`; inline-size containment makes width content-independent → buttons collapsed to
   their padding, labels overflowing. Fixed: overlay opacity now driven by **plain CSS descendant-hover**
   (`internal/interaction-styles.ts`), no `group`. [[tamagui-group-breaks-content-width]] — applies to all 10 primitives.
2. **Loading dimmed.** Tamagui applies `disabledStyle` on `aria-disabled` too → the loading button (aria-disabled)
   faded. Fixed: removed `disabledStyle`; the disabled dim is manual, keyed only to the real `disabled` prop.
   Real-browser confirmed: buttons hug content (no overflow), loading opacity 1 (solid + spinner), disabled 0.5,
   hover overlay 0→0.08, both themes. Victor approved.

## Post-impl critique (REVISE → applied)

Independent gate-2 critique found: **B1** loading wrongly native-disabled a busy button (removed it from the
a11y tree) → fixed: loading now stays focusable with `aria-busy`+`aria-disabled`, native `disabled` reserved
for the real `disabled` prop, `type` forced to `button` while loading to block native submit (locked by
`button.test.tsx`). **B2** padding hardcoded → space-scale tokens; discovered in-browser that a _component_
token (`button.padding`) can't drive `paddingHorizontal` (Tamagui resolves space props against the space
scale, not the theme sub-theme — `$padding` rendered 0px), so md uses `$16`. **S1/S2** fontSize/height/gap →
`$caption/$small/$body`, `$32/$40/$48`, `$8/$12/$16/$20` tokens. **N1** `{...rest}` spread first so computed
a11y props win. **N2** impl uses bare `group` + `$group-hover/$group-press` (not the named `group:'button'`
in the earlier draft) — browser-verified working on 2.6.2. **S3** overlay = `$colorTextPrimary` → darkens in
light, lightens in dark (contract says "darkens") — the flagged Visual-Gate item; may need a DS-2 `color.scrim`.

## Resolved by the contract (I had mis-framed these as open decisions — corrected)

1. Hover/press mechanism → opacity overlay, `0→~0.08` hover / instant press, reduced-motion instant toggle —
   fully specified [FACT: button.md:71–81]. Not a fork.
2. Icon-only a11y → runtime `aria-label` assertion, NO discriminated union [FACT: button.md:40, 85, 105].
3. Ref type → `HTMLButtonElement | View` [FACT: button.md:37].

## One genuine open detail (grounded, not a fork)

- **Overlay color token.** The contract fixes the overlay's _opacity_ (0→~0.08) and says the fill "darkens"
  [FACT: button.md:48,50,76], but names **no color token** for the overlay, and DS-2's semantic set has no
  `scrim`/`overlay` token [FACT: semantic.json — surface/text/brand/focus/border/signal only]. Faithful reading
  = a dark scrim ("darkens", literal). Impl transcribes that; the exact color + whether dark-mode should darken
  or lighten is a **Visual-Gate** confirmation (the gate exists to judge the feel), and may surface a DS-2
  `color.scrim` token gap. This is flagged, not decided ad-hoc.
