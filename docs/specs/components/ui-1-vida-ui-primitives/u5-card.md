# U5 — Card · implementation reconcile (DS-5 contract → Tamagui v2)

DS-5 primitive 5/10 (molecular, 2nd molecular tier). A **static grouped surface** — the first primitive that is
NOT a form control and (unless `interactive`) not focusable at all. Implements
`docs/specs/components/ds-5-primitive-contracts/card.md` against Tamagui v2 in `@vida/ui`.
Gate: §XXVI per-component double-gate + component Visual Gate. Task: ui-1-vida-ui-primitives (LIF-86).

No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X → §10].
Rev 2 (2026-08-08): revised after the independent plan critique — B1 shadow-var, B2 `onPress`-on-div, M1–M5. See §11.

---

## 0. Baseline (code-as-is — verified this session)

- **Build approach settled by the shipped pattern — no fork.** U1–U4 are hand-built on `@tamagui/core`
  (`styled()` + native render element + injected CSS for what `styled()` can't see; **no new deps**, web-first).
  ADR-001 §9 names _Tamagui_ and core IS Tamagui; UI-1's reason to exist is to **build** these primitives, so a
  card kit is out of scope by definition. [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]]
- **Sub-theme already generated, not yet registered.** `light_Card`/`dark_Card` exist in `themes/themes.ts`
  (keys from `component.json.card`: `background`, `border`, `padding`, `radius`) but `tamagui.config.ts` wires only
  Button/Input/Checkbox/Select. [FACT: themes.ts:12-13; tamagui.config.ts:70-81] → the U5 config change is additive:
  import + add `light_/dark_Card` to `themes:`.
- **Component tokens** [FACT: component.json.card]: `background → {color.surface.primary}`,
  `border → {color.border.default}`, `padding → {space.inset.default}`, `radius → {radius.card}` (= `radius.lg` =
  12px, design.md §V "cards"). All resolve to shipped semantic tokens (three-layer intact). **No `card.*` hover/
  elevation/text token** — elevation reads primitive **shadow** values (§1.2) and text is the consumer's.
- **⚠ Shadow tokens are AUX, CSS-only, with NO typed export, and NOT wired into the app.** [FACT: build-tokens.mjs:31
  `AUX = [...TYPOGRAPHY, 'shadow', ...MOTION]` with the inline comment "shadow → CSS only (no typed export)"; :149
  skips shadow from `createTokens`.] The three values (`shadow.resting` `0 1px 2px 0 rgba(15,23,42,.06)` = Level 1 ·
  `shadow.raised` `0 4px 12px -2px rgba(15,23,42,.10)` = Level 2 · `shadow.overlay` = Level 3, primitive.json:117-120)
  are emitted **only** into `themes/variables.css` (:127-129), which **is not imported anywhere** — `packages/ui/src/
CLAUDE.md` states `variables.css` is "a parallel documentation / Figma-projection artifact, not wired into the app."
  **So `var(--shadow-*)` does NOT resolve at runtime.** [This corrects a Rev-1 overclaim that equated `--shadow-*`
  with the Tamagui-emitted `--placeholder`/`--colorFocusRing` switching vars — those two are runtime theme vars;
  `--shadow-*` is not. See §11 B1.] → U5 adds a typed `shadow.ts` export (§1.2, DEF-U5-e), the exact `motion.ts`
  precedent (an AUX namespace earns a typed export when a TS consumer needs it; U5 is the first shadow consumer).
- **Dark shadows are border-based by pipeline intent.** [FACT: build-tokens.mjs:201 "dark shadow = border-based
  (design.md §V) → handled in CSS at DS-4, not the theme object" — this was never actually wired at DS-4.] design.md
  §V: "Dark mode: shadows are replaced by subtle borders and background elevation." U5 realizes this **without any
  theme detection** — see §1.2 (the resting-shadow color is literally the dark surface color, so it self-cancels).
- **Reusable, unchanged (verified against the real code):** the Button **overlay-opacity** mechanism
  (`internal/interaction-styles.ts` — an absolute `pointerEvents:none` child whose OPACITY transitions via CSS
  descendant-hover, B12-legal, NOT `group`); the `render:'<tag>'` idiom for semantic elements (`button.tsx:20`
  `render:'button'`, `input.tsx` `render:'input'`, `checkbox.tsx:34` `render:'label'`) → `render:'header'`/`'footer'`;
  `focusVisibleStyle` 2px ring (`button.tsx:30-35`, `select.tsx` both ship it, emits `:focus-visible`); a `hoverStyle`
  **variant** border-strengthen (`select.tsx` hover → `$colorTextMuted`); **dropping the interactive class when
  disabled** (`checkbox.tsx` drops `vida-interactive`); `onClick` on a styled `View` (`select.tsx` options); the
  `NODE_ENV` dev-warn (`button.tsx:169`); `{...rest}` spread-first (N1, `button.tsx:192`); forwardRef; jsdom
  `*.test.tsx`. [FACT: files read] **No shipped primitive uses Tamagui `onPress` on a non-button div** — Select, the
  one hand-keyboard primitive, uses `onClick` (§1, §11 B2).
- **Verify:** `pnpm --filter @vida/ui typecheck && build && test` (currently @vida/ui 92 tests). [FACT: CLAUDE.md]

## 1. Structure — one styled host, three slot regions, an elevation overlay

Card is a **pure container** — no floating layer, no portal, no ARIA widget state machine (its whole difficulty is
**slot composition** + **elevation**, not interaction). It renders a single styled `<div>` with, in order: an
optional **header bar** (`<header>` on the left + `actions` top-right), the **body** (`children`), an optional
**footer** (`<footer>`), plus an absolutely-positioned **elevation overlay** child.

```
<CardFrame                                           // styled(View,{name:'Card'}) → a <div> (default render). forwardRef→HTMLDivElement
   role={interactive ? 'button' : 'group'}           //   [FACT: card.md §A11y]. role=button driven by RAW `interactive` (even if disabled).
   tabIndex={interactive ? (disabled ? -1 : 0) : undefined}
   aria-disabled={interactive && disabled ? true : undefined}
   aria-busy={loading ? true : undefined}
   interactive={interactive && !disabled}            //   the VISUAL variant (hoverStyle/cursor) — gated OFF when disabled
   onClick={interactive && !disabled ? onPress : undefined}   // pointer path = native onClick (Select precedent), NOT Tamagui onPress (§11 B2)
   onKeyDown={interactive && !disabled ? onKeyDown : undefined}  // Enter(keydown)/Space(keyup) → onPress (§2.1)
   className={interactive && !disabled ? 'vida-card vida-card-interactive' : 'vida-card'}>  // drop the interactive class when disabled (checkbox precedent, §11 M3)
  <CardElevation className="vida-card-elevation" aria-hidden />   // absolute inset:0, pointerEvents:none; box-shadow=shadow.raised, opacity 0→1 on hover (B12)
  {(header || actions) && (
    <CardHeader render='header' className="vida-card-header">     // real <header>; header content left, actions right
      <View flex={1}>{header}</View>
      {actions && <View className="vida-card-actions" flexDirection="row" onClick={stop} onKeyDown={stop}>{actions}</View>}
    </CardHeader>)}
  <View className="vida-card-body">                   //   children (body). loading → <Skeleton/> placeholders instead (§2.3)
    {loading ? <Skeleton/> : children}
  </View>
  {footer && <CardFooter render='footer' className="vida-card-footer" onClick={stop} onKeyDown={stop}>{footer}</CardFooter>}
</CardFrame>
// `stop` = (e)=>e.stopPropagation() — nested actions/footer controls activate independently, never firing the card's onClick (§2.1).
```

> **⚠ SUPERSEDED in part by fe-codec-primitives-refinement P2 (DEF-U5-g/h).** This doc is the UI-1 AS-BUILT record;
> two things below changed in P2: (1) **`header`/`footer` no longer `render:'header'`/`'footer'`** — they are plain
> `<div>` regions (a `<header>` nested in the `<div>` frame is a `banner`/`contentinfo` LANDMARK, duplicated in a list;
> `card.md:6` Intent governs — DEF-U5-g). The `<div>` frame + `HTMLDivElement` ref below are UNCHANGED (the fix preserved
> them). (2) **Inset padding is the `pad` variant**, not a variant named `padding` (the latter collided with Tamagui's
> built-in `padding` style prop → 0px inset shipped — DEF-U5-h); the public prop stays `padding`. Also added (additive,
> optional): `status`/`metric`/`headerDivider` + a 2-layer resting shadow. See `card.md` Addendum.

- **Host = `<div>` (default render), `role="group"`|`"button"` by `interactive`; NEVER a native `<button>` even when
  interactive.** [FACT: card.md:21 `forwardRef<HTMLDivElement | View>` fixes the ref to a div.] Also **semantically
  required**: an interactive card contains its `actions` slot + a `footer` with focusable controls, and **nesting
  interactive content inside a native `<button>` is invalid HTML** and breaks activation. So the entirely-clickable
  card is a `<div role="button">` + hand-handled keyboard — the WAI-ARIA "clickable card with independent actions"
  pattern. [INTERP: card.md Intent + §A11y "actions individually focusable"; HTML content model.]
- **`name:'Card'`** puts the frame in the `.t_Card` scope so `$background`/`$border`/`$radius` resolve. **Padding does
  NOT use the sub-theme token** — see §1.1.
- **ARIA vs VISUAL split:** the `role`/`tabIndex`/`aria-disabled` come from the RAW `interactive`/`disabled` props;
  the **visual** `interactive` variant (hover border, cursor) is passed `interactive && !disabled` so a disabled card
  keeps its button role but gains no hover affordance. [INTERP: card.md disabled row "muted, not focusable".]

### 1.1 Padding — space scale, not the `card.padding` sub-theme token (DEF-U5-b)

`padding: 'compact' | 'default' | 'spacious'` needs **three** values, but `card.padding` is a **single** sub-theme
token. Same constraint Button hit: Tamagui resolves space props against the **space token scale**, not a theme
sub-theme (`$padding` rendered 0px — button.tsx:54-56). So padding is a `variant` over the space scale, matching the
semantic `space.inset.*` values the token references: `compact → $8` (inset.compact) · `default → $12` (inset.default
= what `card.padding` points at) · `spacious → $24` (inset.spacious). [FACT: themes.ts:5 inset map; button.tsx
padding lesson] → **DEF-U5-b flagged for DS** (§9).

### 1.2 Elevation — overlay opacity (B12), no theme detection, no unresolved var

`themes/shadow.ts` (**new GENERATED export**, mirrors `motion.ts`): `export const shadow = { resting, raised, overlay
} as const` — the 3 primitive.json box-shadow literals, emitted by a new `vida/shadow` format in `build-tokens.mjs`
(the AUX-namespace-gets-a-typed-export-when-a-consumer-needs-it precedent set by `motion.ts`; updates the line-31
"no typed export" comment). [FACT: motion.ts is the exact structural precedent; primitive.json:117-120 the values.]
→ DEF-U5-e. **This is why `var(--shadow-*)` is never referenced — U5 injects the literal values from `shadow.ts`.**

`internal/card-styles.ts` (new; mirrors `interaction-styles.ts`): idempotent, browser-only injected stylesheet built
from `shadow` + `motion` imports:

- **Resting (both themes):** `.vida-card { box-shadow: <shadow.resting> }`. **In DARK this is invisible by
  construction** — `shadow.resting`'s color is `rgba(15,23,42,.06)`, and `15,23,42` = `neutral900` = the dark surface
  `#0F172A`; a near-transparent dark shadow on a dark surface renders nothing, so the card's **1px `$border` carries
  dark elevation** (design.md §V "dark = border-based"). **No theme class, no hook, no runtime branch needed.**
  [FACT: primitive.json shadow.resting; themes.ts dark.colorSurfacePrimary = neutral900; design.md §V.]
- **Hover raise (interactive) — two coordinated cues, both B12-legal:**
  - _Light-effective (opacity):_ `.vida-card-elevation { box-shadow: <shadow.raised>; opacity: 0; transition: opacity
<fast> <out> }` + `.vida-card-interactive:hover > .vida-card-elevation { opacity: 1 }`. **Only opacity animates**;
    the shadow is static on the overlay → B12 (never animate box-shadow). [FACT: card.md Motion row.]
  - _Dark-effective (instant border):_ the CardFrame `interactive` variant carries `hoverStyle: { borderColor:
'$colorTextMuted' }` — an **instant** border-color swap (the frame has **no `animation` prop**, so Tamagui applies
    hoverStyle as a plain CSS `:hover` with no transition → a state change, not an animation → B12-legal; it does NOT
    animate `border`). Visible in dark where the raised shadow (also dark-on-dark) isn't; a subtle reinforce in light.
    A Tamagui **variant** (not injected CSS) so it wins the specificity race. [FACT: select.tsx hover→$colorTextMuted;
    [[injected-css-loses-to-tamagui-variants]]; B12 forbids _animating_ border, permits an instant swap.]
- **Active/press (interactive):** `.vida-card-interactive:active > .vida-card-elevation { opacity: 1 }` held (same
  raised overlay). **No separate press tint** (a tint = a background change; opacity-of-the-existing-overlay keeps it
  strictly B12). [FACT: card.md active row "pressed overlay"; §11 M-nit / V4.]
- **Disabled:** the `.vida-card-interactive` class is dropped AND the visual `interactive` variant is off → hover/
  active elevation + hover border never fire; plus `opacity: .5` on the frame. [FACT: checkbox.tsx drops the class
  when disabled; §11 M3.]
- **Reduced-motion:** `@media (prefers-reduced-motion: reduce){ .vida-card-elevation{ transition: none } }` — the
  raise appears instantly. [FACT: card.md "Reduced-motion: elevation appears instantly"; motion §IX.]

## 2. Interaction + state visuals

Non-interactive Card has **no interactive state** — a `role="group"` surface; hover/focus/active/disabled read "N/A"
and the elevation overlay never fires (only `.vida-card-interactive` triggers it). All interactive visuals gate on
`interactive && !disabled`.

| Visual                            | Mechanism                                                                                         | Token                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------- |
| resting surface / border / radius | `styled` `name:'Card'` → `$background`/`$border`/`borderWidth:1`/`$radius`                        | `card.*` sub-theme     |
| resting elevation                 | injected `.vida-card` box-shadow = `shadow.resting` (self-cancels in dark → border carries it)    | shadow.resting         |
| hover raise (interactive), light  | elevation overlay opacity 0→1, `duration.fast`/`easing.out` (B12: opacity only)                   | shadow.raised / motion |
| hover raise (interactive), dark   | `hoverStyle` **variant** `borderColor:$colorTextMuted`, **instant** (no transition, B12)          | color.text.muted       |
| focus (interactive)               | `focusVisibleStyle` 2px ring on the frame (`:focus-visible` only, pointer-suppressed)             | `color.focus.ring`     |
| active/press (interactive)        | overlay held raised (opacity only, no tint)                                                       | shadow.raised          |
| disabled (interactive)            | `opacity .5`; interactive class + visual variant dropped → no hover/active; `tabIndex=-1`         | reduced opacity        |
| loading                           | static `<Skeleton/>` in body reserving layout + `aria-busy`; no shimmer (B12/reduced-motion safe) | surface.secondary      |

- **B12 compliance:** only the elevation overlay's **opacity** animates. Resting/raised shadow, the dark hover border,
  the skeleton — all instant state swaps, never transitioned. [FACT: `_index.md §2` B12.]

### 2.1 Interactive event handling

- **Pointer = native `onClick`** on the frame (the `onPress` prop wired to `onClick`; Select-option precedent —
  Tamagui `onPress` has no shipped precedent on a non-button div, so we don't rely on it). Suppressed when
  `disabled`/non-interactive. [FACT: select.tsx onClick on styled View; §11 B2.]
- **Keyboard** (`onKeyDown` on the `<div role="button">` — no native activation): **Enter** activates on keydown
  (guard `e.repeat` to avoid held-repeat); **Space** calls `preventDefault` on keydown (block page scroll) and
  **activates on keyup** — the correct role=button contract (native buttons fire Enter on keydown, Space on keyup).
  [FACT: WAI-ARIA button pattern; §11 M4.]
- **Nested actions/footer controls stay independent:** their container `stopPropagation`s click + keydown so
  activating an action or footer link does NOT also fire the card's `onClick`. [FACT: card.md §A11y actions-focusable.]
- **⚠ ARIA nesting tension** — a `role="button"` containing focusable descendants is discouraged by strict ARIA but is
  exactly what the contract mandates ("entirely-clickable card" + "actions individually focusable"). U5 ships it and
  **verifies axe/SR at impl** (Storybook `addon-a11y` + a VO/NVDA pass); a mis-announcement is a **DS defect**
  (DEF-U5-d), not a silent UI-1 rewrite. [[deliverable-is-the-doc-not-my-discretion]]

### 2.2 Empty + error

- **empty** = **consumer composition, not a Card prop.** The contract's empty row is "consumer's empty-state slot
  rendered in the content area" — Card owns no `empty` prop; it renders whatever `children` are passed. The story
  demonstrates a consumer empty-state inside a Card. [FACT: card.md Visual States empty row.]
- **error** = **N/A, justified by the contract itself.** "a container has no validity; a failed load renders an inline
  error state in `children`." [FACT: card.md Visual States error row — the N/A is the contract's position, not ours.]

### 2.3 Loading skeleton (DEF-U5-a)

No `Skeleton` primitive exists yet. U5 ships a **minimal built-in static skeleton** — a few placeholder bars
(`$colorSurfaceSecondary`, fixed heights) reserving the final layout to avoid shift — rendered in the body when
`loading`, plus `aria-busy` on the frame. **Static, no shimmer** (a shimmer animates `background-position` → violates
B12 + fights reduced-motion). A richer standalone `Skeleton` primitive is future work → **DEF-U5-a** (§9).

## 3. API (exported `CardProps` — verbatim from the contract, FLAT)

[FACT: card.md:10-22 authors this interface FLAT, with a prose "Discriminated-union note".] Per
[[deliverable-is-the-doc-not-my-discretion]] (the U3 lesson), the authored FLAT surface ships **verbatim**; the
"`onPress`/`disabled` only valid when `interactive`" invariant is enforced at **runtime (dev-warn)**, not by
re-shaping the authored interface into a compile-time discriminated union — that would be my discretion over the doc.
Whether to tighten to a union is a **DS decision → DEF-U5-c** (§9); note components §VII _actively mandates_ the union
(its worked example `intent:'danger'`/`confirmLabel` is structurally identical), so this is a true contract-vs-standard
conflict for DS, not a silent gap.

```ts
export interface CardProps {
  header?: React.ReactNode // slot
  footer?: React.ReactNode // slot
  actions?: React.ReactNode // slot (top-right controls)
  /** makes the whole card a single pressable target (adds role=button + keyboard). */
  interactive?: boolean
  onPress?: () => void // only meaningful with interactive; wired internally to onClick + keyboard
  disabled?: boolean // only meaningful with interactive
  padding?: 'compact' | 'default' | 'spacious' // default 'default'
  children: React.ReactNode
}
// + pass-through: aria-label / aria-labelledby / id … onto the frame ({...rest} spread FIRST → N1).
// forwardRef<ComponentRef<typeof CardFrame> (= HTMLDivElement), CardProps>.
```

- **Dev-warn (NODE_ENV-guarded, dead-code-eliminated in prod), two guards:**
  1. `onPress`/`disabled` passed **without** `interactive` → warn (the contract's interactive-only invariant).
  2. `interactive` **and** no accessible name — a `role="button"` computes its name from descendant text, so warn
     only when provably none: no text in `header`/`children` AND no `aria-label`/`aria-labelledby`. Mirrors Button's
     icon-only warn. [FACT: card.md §A11y interactive needs a name; button.tsx:169 precedent.]

## 4. Visual states (contract §Visual States — interactive states apply ONLY when `interactive`)

default (resting surface + border + radius + padding + resting shadow) · hover (**interactive** — elevation raise:
opacity overlay in light, instant border in dark) · focus (**interactive** — `:focus-visible` ring on the frame) ·
active (**interactive** — press held raise) · disabled (**interactive** — muted, `tabIndex=-1`, `aria-disabled`, not
focusable, no hover) · loading (skeleton + `aria-busy`) · **error = N/A** (container has no validity — §2.2) · **empty
= consumer slot** (§2.2). [FACT: card.md §Visual States.]

## 5. Accessibility (contract §A11y)

- **Non-interactive:** `role="group"` by default; a consumer may pass `aria-label`/`aria-labelledby` (e.g. labelling
  by the header) to opt into a `region` landmark. Header/footer are `<header>`/`<footer>` regions inside. [FACT:
  card.md §A11y.]
- **Interactive:** `role="button"`, Tab-reachable (`tabIndex=0`; `-1` when disabled), **Enter (keydown) / Space
  (keyup, preventDefault on keydown) activate**, `aria-disabled` when disabled. Actions/footer controls individually
  focusable and `stopPropagation` (§2.1). [FACT: card.md §A11y.]
- **Name:** interactive card name = descendant text or `aria-label`/`aria-labelledby`; dev-warn if none (§3).
  Storybook `addon-a11y` (axe) clean on both the non-interactive group and the interactive role=button (incl. the
  nested-focusable tension, §2.1 / DEF-U5-d).

## 6. Files

- `packages/ui/src/components/card.tsx` — the primitive (frame + header/body/footer slots + actions + elevation
  overlay + interactive onClick/keyboard + skeleton + dev-warns).
- `packages/ui/src/components/card.stories.tsx` — Visual-Gate surface, all applicable states × light｜dark: default
  (header + body + footer + actions); interactive (hover/focus/active/disabled — real states to hover in-browser);
  loading (skeleton); a consumer empty-state; padding compact/default/spacious; a nested-actions interactive case.
- `packages/ui/src/components/card.test.tsx` — jsdom: `role=group` vs `role=button` per `interactive`; header/footer
  render as `<header>`/`<footer>`; actions render + click `stopPropagation` (card `onPress` not fired); Enter(keydown)
  - Space(keyup) activate, Space keydown `preventDefault`, `e.repeat` guarded; disabled → `tabIndex=-1` +
    `aria-disabled` + `onPress` suppressed + no `vida-card-interactive` class; `aria-busy` + skeleton + children hidden
    when loading; padding variant → padding value; dev-warns (onPress-without-interactive; interactive no-name);
    `{...rest}` spread-first.
- `packages/ui/src/internal/card-styles.ts` — **new** injected elevation stylesheet (resting shadow, raised overlay
  opacity transition, reduced-motion), built from `shadow` + `motion` imports (§1.2).
- `packages/ui/src/themes/shadow.ts` — **new GENERATED** typed shadow export (mirrors `motion.ts`); see build-tokens.
- `packages/ui/src/themes/build-tokens.mjs` — **add** a `vida/shadow` format + `{destination:'shadow.ts'}` config
  entry; update the line-31 "shadow → CSS only (no typed export)" comment + the final console-log file list.
- `packages/ui/src/themes/build-tokens.test.ts` — extend for the `shadow.ts` emit (mirror the `motion.ts` assertions);
  the existing B9 "tokens.ts excludes shadow" test stays green (shadow.ts is a separate file).
- `docs/ui/token-pipeline/current-business-rules.md` + `current-spec.md` — **§XXIX currency:** B9/B11 currently
  document "shadow → CSS only" (distinct from `motion → motion.ts`). DEF-U5-e changes that: shadow now also emits a
  typed `shadow.ts` (first shadow consumer). Amend B9/B11 to "shadow → CSS + `shadow.ts`" and note the `vida/shadow`
  format, so the pipeline's durable docs match the code. [FACT: current-business-rules.md:27-35 the invariant U5 edits.]
- `packages/ui/src/index.ts` — barrel: export `Card` + `CardProps`; re-export `shadow` alongside `motion` (verify the
  barrel is the export site at impl).
- `packages/ui/src/tamagui.config.ts` — import + register `light_/dark_Card` in `themes:`.

## 7. Decisions — with grounding label (FACT = in a doc · INTERP = derived · UNKNOWN = doc silent → §10)

- **D1 — hand-built on `@tamagui/core`, no new dep.** [FACT: U1–U4 pattern; ADR-001 §9; DS-5 UI-1 = the impl.]
  [[dont-manufacture-an-architecture-fork-the-pattern-already-answers]]
- **D2 — host = `<div>` (default render), `role="group"`|`"button"`; NEVER a native `<button>`; pointer via
  `onClick` (not Tamagui `onPress`).** Contract ref = `HTMLDivElement` (:21) AND a native button can't contain the
  focusable `actions`/`footer` (invalid HTML). `onClick` follows the shipped Select precedent (no `onPress`-on-div
  precedent exists — §11 B2). [FACT: card.md:21; select.tsx onClick; HTML content model.]
- **D3 — slots: `header`(`<header>`) + `actions`(top-right, in the header bar) · `children`(body) · `footer`
  (`<footer>`).** Actions justified end in the header row; when no `header`, actions still render top-right. [FACT:
  card.md API + §A11y.]
- **D4 — elevation via overlay OPACITY (B12); values from a new `shadow.ts`; NO theme detection.** Resting
  `shadow.resting` self-cancels in dark (its color = the dark surface) so the border carries dark elevation (design
  §V); hover raise = opacity overlay (light) + an **instant** `hoverStyle` border to `$colorTextMuted` (dark).
  [FACT: card.md Motion; design §V; primitive.json shadow; select.tsx hover-border; §11 B1/M1/M2.] → DEF-U5-e.
- **D5 — padding via the `$space` scale (`$8/$12/$24`), not the single-valued `card.padding` token.** [FACT: 3 options
  vs 1 token; button.tsx:54-56 space-prop lesson.] → DEF-U5-b.
- **D6 — loading = `aria-busy` + a minimal STATIC skeleton** (no shimmer → B12/reduced-motion safe), reserving layout;
  a standalone `Skeleton` primitive is future. [FACT: card.md loading row; no Skeleton primitive exists.] → DEF-U5-a.
- **D7 — ship the contract's FLAT `CardProps` verbatim; enforce the interactive-only invariant via a dev-warn**, not a
  compile-time union (§VII actively conflicts — flag to DS). [FACT: card.md flat + union NOTE; U3 precedent.]
  [[deliverable-is-the-doc-not-my-discretion]] → DEF-U5-c.
- **D8 — `error` justified N/A · `empty` = consumer children slot** (Card owns no `empty` prop). [FACT: card.md.]

## 8. Definition of Done (U5)

- [ ] `CardProps` = the contract interface **verbatim** (flat, D7); `header`/`footer`/`actions`/`children` slots
      compose; `padding` variant drives the space value.
- [ ] `role="group"` (non-interactive) vs `role="button"` (interactive) — jsdom-asserted; header/footer render as
      `<header>`/`<footer>`.
- [ ] Interactive: `tabIndex=0`; **Enter(keydown)+Space(keyup, preventDefault-on-keydown, `e.repeat`-guarded)**
      activate the `onPress` prop via `onClick`/keyboard; nested action/footer click+keydown `stopPropagation` (card
      `onPress` not fired) — jsdom-asserted; disabled → `tabIndex=-1` + `aria-disabled` + `onPress` suppressed + no
      `vida-card-interactive` class; non-interactive fires no interactive state.
- [ ] Elevation animates via **overlay opacity only** (B12); resting `shadow.resting` self-cancels in dark; dark hover
      = **instant** `hoverStyle` border to `$colorTextMuted` (no transition); reduced-motion instant.
- [ ] `loading` → `aria-busy` + static skeleton reserving layout, children hidden; `error` N/A; `empty` via children.
- [ ] Dev-warns: `onPress`/`disabled` without `interactive`; `interactive` with no accessible name.
- [ ] `shadow.ts` emitted by `build-tokens.mjs` (mirrors motion.ts); `tokens:build` green; build-tokens.test extended;
      **B9/B11 in `current-business-rules.md` + `current-spec.md` amended** to "shadow → CSS + shadow.ts" (§XXIX);
      `card.*` tokens resolve through the sub-theme; `light_/dark_Card` registered; typecheck 2/2 · @vida/ui tests
      green · build + build-storybook ✓ · root 10/10.
- [ ] Storybook `addon-a11y` clean on non-interactive group + interactive role=button (incl. nested-focusable, D-U5-d).
- [ ] Component **Visual Gate PASS** (render + measure both themes): resting surface/border/radius/padding; header +
      actions + footer layout; hover raise (light shadow / dark border); focus ring; disabled muted; loading skeleton;
      **dark-mode elevation reads via border, not a visible shadow** — Victor confirms.

## 9. Deferrals + defects (bounded, not silent — flagged for DS / later units)

- **DEF-U5-a — minimal built-in loading skeleton; no standalone `Skeleton` primitive.** U5 ships static placeholder
  bars + `aria-busy` (the contract's "skeleton placeholders" behavior). A reusable `Skeleton` primitive is future work.
- **DEF-U5-b (for DS) — `card.padding` is a single token but the API has 3 `padding` options.** U5 drives padding from
  the `$space` scale on the semantic `space.inset.*` values; `card.padding` remains the documented `default`. DS may
  add `card.padding.{compact,default,spacious}` or record it's intentionally space-scale-direct (as Button's is).
- **DEF-U5-c (for DS) — flat `CardProps` vs the contract's "discriminated-union note" AND components §VII (which
  actively mandates the union with a structurally-identical example).** U5 ships the authored flat interface + a
  runtime dev-warn. DS decides whether to tighten `interactive`/`onPress`/`disabled` into a compile-time union.
  [[deliverable-is-the-doc-not-my-discretion]]
- **DEF-U5-d (verify at impl → DS if it fails) — ARIA nesting: `role="button"` containing focusable `actions`/
  `footer`.** Contract-sanctioned; axe + SR verified at impl; DS reconcile only if it genuinely mis-announces.
- **DEF-U5-e (RESOLVED this unit — new typed pipeline export) — shadow had no typed export.** `shadow` is an AUX
  namespace that was CSS-only + unwired (`var(--shadow-*)` never resolved at runtime). U5, the first shadow consumer,
  adds `themes/shadow.ts` via a new `vida/shadow` build-tokens format — the exact `motion.ts` precedent (AUX→typed
  export on first TS consumer). Pipeline stays the source of truth; no literal duplicated in the component. A
  cross-cutting pipeline touch owned by the consumer unit, like DEF-U4-e. DS may later also decide whether to wire
  `variables.css`'s `--shadow-*` for CSS-side consumers; not needed by U5.

## 10. Verify-at-impl (measure/confirm in-browser or against installed types — not deferrable design work)

- **[V1] `onClick` fires on the styled `<div>` frame** and the keyboard path activates — jsdom-assert + a real hover/
  click in Storybook. (Grounded on select.tsx onClick, but confirm on the Card frame.)
- **[V2] `hoverStyle` border swap is instant (no transition)** given the frame has no `animation` prop — confirm in
  the compiled CSS / by observing no border animation (B12).
- **[V3] Dark resting shadow truly renders nothing** (self-cancel) and the border reads as elevation — Visual Gate,
  dark theme. If a faint shadow is visible, suppress it explicitly (fallback: probe the `<html>` dark theme class).
- **[V4] Press/active cue stays B12** — the active overlay must raise via **opacity only**; no background/border
  animation sneaks in. Visual Gate is B12-aware here, not just aesthetic.
- **[V5] axe/SR** on the interactive role=button with nested focusable actions (DEF-U5-d).

## 8b. Build result + gates (2026-08-08) — IMPLEMENTED, pending Visual Gate

Files: `themes/shadow.ts` (**new GENERATED** — `vida/shadow` format in `build-tokens.mjs`) · `internal/card-styles.ts`
· `components/card.tsx` · `card.stories.tsx` · `card.test.tsx` (**16 jsdom**) · `tamagui.config.ts` (+`light_/dark_Card`)
· `index.ts` (barrel + `shadow` re-export) · `build-tokens.test.ts` (+5 shadow-emit fixtures) · §XXIX currency
(`current-business-rules.md` B9/B11 + `current-spec.md` + both layer CLAUDE.md). typecheck 2/2 · @vida/ui **113/113**
· tokens:build ✓ · build + build-storybook ✓ · root typecheck **10/10**. Sibling primitives unregressed.

Gate trail: plan → independent critique **REVISE (2 blockers + 4 material)** → all fixed (Rev 2) → Approval 1 →
preflight **PASSED** (currency-doc gap folded in) + gate-2 **SHIP** → Approval 2 → implemented. One §XXVIII deviation
during impl: the contract's `CardProps` authors **no `loading` prop**, so the built-in-skeleton plan was dropped for
the verbatim API — loading is consumer-composed like `empty` (DEF-U5-f). **NEXT = component Visual Gate** (Storybook,
both themes) — the gate that caught real bugs on U1/U3/U4; measure §10 V1–V5 (esp. V3 dark elevation = border, not a
visible shadow).

## 9b. DEF-U5-f (surfaced at impl — for DS)

**The §VIII `loading` visual state has no API trigger.** `card.md`'s Visual-States matrix lists `loading` (skeleton +
`aria-busy`), but the authored `CardProps` (card.md:10-20) has **no `loading` prop** — the state can't be set through
the documented API. Per [[deliverable-is-the-doc-not-my-discretion]], U5 ships the flat API verbatim (no `loading`
prop) and realizes loading by **consumer composition** — a skeleton passed as `children` + `aria-busy` via pass-through
— exactly parallel to how the contract's `empty` state works ("consumer's slot in the content area"), and correct in
principle (a container can't render a content-shaped skeleton). **Supersedes DEF-U5-a** (which wrongly assumed a
built-in skeleton). DS decides: add `loading?: boolean` + a `Skeleton` primitive, or record loading as consumer-composed.

## 11. Critique resolutions (Rev 1 → Rev 2)

Independent plan critique verdict REVISE. All addressed:

- **B1 (shadow var non-existent)** → §0, §1.2, §6, DEF-U5-e: `var(--shadow-*)` never resolves (AUX, CSS-only, unwired);
  U5 adds a typed `shadow.ts` (motion.ts precedent) and injects the literal values. The Rev-1 "like `--placeholder`"
  equivalence (O1/O2) is removed — those are runtime theme vars, shadow was not.
- **B2 (`onPress` on a div)** → §1, §2.1, D2: switched to native `onClick` (Select precedent); no `onPress`-on-div
  fact claimed.
- **M1 (dark elevation token + B12)** → §1.2: dark hover = instant `hoverStyle` border to `$colorTextMuted` (named),
  explicitly a non-transitioned swap (B12-legal).
- **M2 (dark theme-class guess)** → §1.2: dissolved — the resting shadow self-cancels in dark by construction, so no
  theme-class/hook detection is needed at all.
- **M3 (disabled still has interactive class)** → §1, §1.2, §8: drop `vida-card-interactive` + gate the visual variant
  when disabled (checkbox precedent).
- **M4 (Space keydown vs keyup)** → §2.1, §5, §8: Enter on keydown (`e.repeat`-guarded), Space `preventDefault` on
  keydown + activate on keyup.
- **M5 (§VII actively mandates the union)** → §3, DEF-U5-c: worded as a true contract-vs-standard conflict for DS.
- **V4 press-tint B12** → §1.2 active row + §10 V4: no tint; opacity-only.
