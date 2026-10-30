# fe-codec-patterns · S3 — EmptyState (PLAN + spec, §XXVI gate)

> **Slice:** S3 of 5 (slice-map.md) · **Plane:** `@vida/ui` rendered component · **Gate:** real-browser **Visual Gate** ·
> **Branch:** `worktree-fe-codec-patterns`.
> **Grounds:** interpretation R3 · seam-contract §B · state-conventions.md:81 §3 (empty) · frontend-quality-bar §84 P5 ·
> p5-discover-own-specimen.html:159-166 (the anatomy) · packages/ui/src/components/card.tsx (house pattern) ·
> internal/data-view.tsx (the `Message`/`role=status` the empty slot sits in).

## §0. Context (BASELINE)

Today the data-views (`list-view`/`gallery`/`timeline`) render empty as a `role="status"` region holding the muted,
centered **`Message`** default copy, via `resolveDataViewState` [FACT: internal/data-view.tsx:15-23,63-66]. The `empty?`
slot accepts a `ReactNode` to replace that default [FACT: list-view.tsx:37]. **No shared teaching empty component
exists** — each surface would hand-roll the P5 teaching-invitation. House pattern = `styled(View,{name,variants})` +
`forwardRef` + slot props + **direct semantic tokens** (which inherit the active preset at component scope, B-codec-6)
[FACT: card.tsx:27-63,94-206].

## §1. What S3 is / is not

**Is:** `EmptyState` — a presentational `@vida/ui` teaching-invitation component a surface drops into its `empty` slot
(or renders standalone): **icon/art · title · teaching body · primary way(s) in · opt-in guided-setup**. The P5 anatomy,
`packages/ui/src/components/empty-state.tsx`.

**Is not:** a state machine (that's S1 — EmptyState _is_ the `empty`/`idle→empty` render target, `renderKindFor → 'empty-state'`);
interactive itself (the §VIII 8-state matrix applies to the composed `Button`s, not to EmptyState); the data-view default
`Message` (unchanged — EmptyState is the richer opt-in that fills the slot).

## §2. Business rules (invariants)

- **BR-S3-1 Teaching-invitation, never "No data available."** Title says what it is; body teaches how to fill it +
  "nothing's required"; a primary action is the way in [FACT: state-conventions.md:81; p5 specimen:159-166].
- **BR-S3-2 Composition over config (§VII).** Variable content = slots (`icon`, `children`, `action`, `guidedSetup`), not
  booleans/enums. `action` holds one or more ui-1 `Button`s (the specimen's primary + ghost).
- **BR-S3-3 Guided setup is opt-in, never a wall.** `guidedSetup` is an optional slot, visually secondary [FACT: p5 specimen:165-166].
- **BR-S3-4 Tokens only — no hard-coded palette/spacing.** Direct semantic tokens ($colorText*, $colorSurface*) +
  the $space/$radius scale; inherits the preset per B-codec-6 [FACT: card.tsx:33-36; current-business-rules.md B-codec-6].
- **BR-S3-5 Accessible.** Container `role="group"` named by its title via `aria-labelledby` (the Card non-interactive
  precedent); **the title is also a heading** — `role="heading"` + `aria-level` (default **2**, overridable prop) so SR
  users find it by heading-navigation (the P5 `h3` intent) WITHOUT a native `<hN>` that would pollute the outline at an
  arbitrary placement depth; the icon/art is decorative (`aria-hidden`); composed `Button`s carry their own §VIII states +
  focus ring. Sits validly inside the data-view `role="status"` region (group-in-status is valid ARIA). EmptyState does
  **not** self-wrap in `role="status"` — the data-view owns that live region; standalone use = static page content
  [FACT: card.tsx:173; data-view.tsx:63-65].
- **BR-S3-6 Readable measure.** Body text capped to the 45–75ch measure (typography §III) via `maxWidth`.
- **BR-S3-7 Reduced-motion.** Any entrance is opacity/transform-only + honours the ratified `useReducedMotion`/`@media`
  (S2); default is **static** (no animation needed) [FACT: motion.md §IX; S2 R5].

## §3. The design (API + anatomy + tokens)

```ts
export interface EmptyStateProps extends Omit<GetProps<typeof EmptyFrame>, 'children'> {
  title: string // the headline — "what this is" (sentence-case, VoiceCopy). string → drives aria-labelledby.
  titleLevel?: number // aria-level for the title heading (default 2) — overridable per placement depth
  icon?: ReactNode // optional art/glyph — decorative (aria-hidden)
  children?: ReactNode // teaching body — why it's empty / how to fill it
  action?: ReactNode // the primary way(s) in — slot (one or more ui-1 Buttons)
  guidedSetup?: ReactNode // optional opt-in setup link — secondary, never a wall
}
```

Anatomy (centered column, `role="group"` + `aria-labelledby`): `icon` (decorative) → **title** (`$heading` fontSize,
`$colorTextPrimary`, `role="heading"` + `aria-level={titleLevel ?? 2}`, carries the labelledby id) → **body**
(`$body` or `$small`, `$colorTextMuted`, `maxWidth: '60ch'`, centered) → **action** row (gap, wraps) → **guidedSetup**
(`$small`, `$colorTextMuted`). Spacing from `$space` (`$8/$12/$16/$24`); vertical padding `$24`. Fontsize tokens are the
real role keys (`$display/$heading/$body/$small/$caption` — **no `$subheading`**). All color via direct semantic tokens
(preset-inheriting, B-codec-6).

## §4. Acceptance (Visual Gate — real browser, the blocking per-slice gate)

- [ ] Renders the P5 anatomy: icon? · title · body? · action? · guidedSetup? — each slot optional, title required (BR-S3-1/2/3).
- [ ] **Visual Gate (Storybook + Playwright/Brave):** minimal (title only) + full (all slots) variants, each × **light|dark**
      × **375·768·1440** — teaching layout holds, tokens swap with mode + preset, measure capped, no hard-coded color. Screenshots captured.
- [ ] **a11y sweep:** container is a named `role="group"` (aria-labelledby → title); **title is a `role="heading"` with
      `aria-level` (default 2, `titleLevel`-overridable)** reachable by SR heading-navigation; icon `aria-hidden`; composed
      `Button`s keyboard-reachable with a visible focus ring; renders validly inside a `role="status"` empty region (BR-S3-5).
- [ ] Reduced-motion: static by default; `prefers-reduced-motion` honoured for any entrance (BR-S3-7).
- [ ] `tsc` 0 · eslint 0 · `@vida/ui` suite green (+ `empty-state.test.tsx`); exported from `index.ts`.
- [ ] §XXIX currency: `packages/ui/src/CLAUDE.md` gains the EmptyState entry; interaction-state render map `'empty-state'` wired note.

## §5. Implementation prompt (type-first, then states)

1. `packages/ui/src/components/empty-state.tsx` — `EmptyFrame = styled(View,{name:'EmptyState', flexDirection:'column',
alignItems:'center', gap, padding, direct semantic tokens})`; sub-frames for title/body/guided (styled `Text`);
   `forwardRef<ComponentRef<typeof EmptyFrame>, EmptyStateProps>`; a generated `useId()` for the aria-labelledby; dev-warn
   if `title` empty (card.tsx guard precedent). Named export (repo convention — card/button are named-only).
2. `packages/ui/src/index.ts` — `export { EmptyState, type EmptyStateProps } from './components/empty-state'`.
3. `packages/ui/src/components/empty-state.stories.tsx` — minimal + full variants (icon + primary/ghost `Button` + guided),
   for the Visual Gate harness (the fe-codec-theme Storybook + Playwright/Brave precedent).
4. `packages/ui/src/components/empty-state.test.tsx` — slots render; title required + dev-warn; role=group + aria-labelledby;
   icon aria-hidden; no raw hex.
5. `packages/ui/src/CLAUDE.md` — add the EmptyState entry (§XXIX).

**On divergence:** §XXVIII. **Done:** §4 all checked → Visual Gate PASS → S3 commit → S4.
