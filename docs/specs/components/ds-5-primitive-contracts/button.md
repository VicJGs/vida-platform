# Component Contract: Button
DS-5 · primitive 1/10 (atomic) · LIF-85. Governs `components §VII`+`§VIII`. Implemented by UI-1 (`#27`).
No-Guessing: shapes cite `[FACT:]`; genuine gaps flagged, never fabricated.

## Intent
The interactive trigger for an **action** on the current surface. Four emphasis levels via `intent`:
`primary` (the main action), `secondary` (supporting), `ghost` (low-emphasis, toolbars), `danger`
(destructive/irreversible). [FACT: components §VII "Intent Values"]
- **NOT for navigation** — a thing that changes location is a `Link` (renders `<a>`); use `as="a"` only
  when it truly acts as a button.
- **NOT a toggle** — persistent on/off is `Checkbox`/`Switch`.
- **NOT for menus** — a trigger that opens a list is `Menu`/`Select` (which compose a Button internally).

## API Contract
```ts
export interface ButtonProps {
  /** Emphasis level — semantic, resolves to component tokens (§VII). Default 'primary'. */
  intent?: 'primary' | 'secondary' | 'ghost' | 'danger'
  /** Control size. Default 'md'. */
  size?: 'sm' | 'md' | 'lg'
  /** Non-interactive + muted. Not focusable. */
  disabled?: boolean
  /** Shows a spinner, suppresses activation, keeps width stable. */
  loading?: boolean
  /** Stretches to the container inline size. */
  fullWidth?: boolean
  /** Slot before the label (icon/spinner). */
  leading?: React.ReactNode
  /** Slot after the label. */
  trailing?: React.ReactNode
  /** Native button semantics for forms. Default 'button'. */
  type?: 'button' | 'submit' | 'reset'
  /** Activation handler (Tamagui universal press — pointer + keyboard). */
  onPress?: () => void
  children: React.ReactNode
}
// forwardRef<HTMLButtonElement | View, ButtonProps> — REQUIRED (§VII forwardRef). Props exported.
```
Rules honored: semantic props only (no `color`/`style`); `leading`/`trailing` are **slots**, not booleans;
`disabled`/`loading` are booleans, not `enabled={false}`. [FACT: components §VII] A discriminated union is
NOT imposed (Button has no intent-conditional required prop); use one at the call site if a consumer makes
e.g. a confirm label mandatory for `danger`. [INTERP: §VII example is illustrative, not a Button mandate]

## Visual States  (State | Trigger | Visual change (exact) | Token used — all component tokens, §II three-layer)
| State | Trigger | Visual change | Token used |
|-------|---------|---------------|------------|
| **default** | resting | fill + label per intent; `radius` control; `padding` inset-default (h-scales with `size`) | `button.background.{intent}` · `button.text.{intent}` · `button.radius` · `button.padding` |
| **hover** | pointer enters (`:hover`) | fill darkens one step (perceivable beyond color — brightness shift, not hue only) | intent fill + `hoverStyle` overlay (see §Motion) |
| **focus** | keyboard focus (`:focus-visible` only) | 2px solid ring, 2px offset — never suppressed for keyboard | `color.focus.ring` [FACT: components §VIII "Focus Ring"] |
| **active** | pointer down / Space·Enter held | fill darkens a second step; no layout shift | `pressStyle` overlay |
| **disabled** | `disabled` | opacity ↓ (muted), pointer `not-allowed`, removed from tab order, no hover/active | intent fill @ reduced opacity |
| **loading** | `loading` | spinner in `leading` slot, label dimmed, width held, activation suppressed, `aria-busy` | intent fill (unchanged) |
| **error** | — | **N/A** — Button carries no data-validity state; a failed action surfaces via `Toast`, not a Button visual. [FACT: §VIII "all *applicable* states"] |
| **empty** | — | **N/A** — a Button always has a label (`children` required); no empty state. |

Intents (each cites the COMPONENT token → its semantic resolution, §II three-layer):
- **primary** — `button.background.primary` → `{color.brand.emphasis}` (brand.600, **not** brand.500);
  `button.text.primary` → `{color.text.inverse}`. ⚠ brand.600 for AA: white-on-brand.500 = 4.47 < 4.5. [FACT: ds-2 spec:169]
- **secondary** — `button.background.secondary` → `{color.surface.secondary}`; `button.text.secondary`
  → `{color.text.primary}`; 1px border `button.border.secondary` → `{color.border.default}`.
- **ghost** — transparent bg (no token — CSS `transparent`); `button.text.ghost` → `{color.brand.primary}`; hover fills `{color.surface.secondary}`.
- **danger** — `button.background.danger` → `{color.signal.danger}`; `button.text.danger` → `{color.text.inverse}`.
  ⚠ **Contrast (provisional-palette item, NOT a DS-5 fix):** white-on-danger.500 = 3.5 < AA 4.5, and since `signal.danger` has no dark
  override the dark pairing is also weak. This is a **placeholder-value** contrast artifact — the palette
  is explicitly provisional and *"the brand pass swaps VALUES… re-runs the Visual Gate"* [FACT: ds-2
  spec §6]. DS-5 states the requirement (danger fill+label ≥ AA); the resolution is a DS-2/brand-pass
  value decision (a `signal.danger` that meets AA against its label, e.g. → danger.600, mirroring the
  brand.600 caveat) — NOT a token DS-5 fabricates. The Visual Gate is the gate that enforces it before UI-1.

## Motion Spec
⚠ **B12 (themes/CLAUDE.md):** animate **only** `transform`/`opacity`/`clip-path` — never `background`/`color`/
`border`. So the hover/active *fill darkens* as a **state** change (instant token swap), and the animated
"feel" is a **hover/press overlay whose opacity transitions** — the fill itself is never a transition target.
| Transition | Duration | Easing | Property (B12-legal) |
|-----------|----------|--------|----------------------|
| default → hover | `duration.fast` (150ms) | `easing.out` | **opacity** of hover overlay (0→~0.08) |
| press (active) | `duration.instant` (0) | — | **opacity** of press overlay (immediate feedback) |
| loading spinner | 800ms loop | `easing.linear` | **transform: rotate** |
[FACT: motion.ts duration{fast:150,instant:0}, easing{out,linear}; B12 themes/CLAUDE.md]
**Reduced motion** (`prefers-reduced-motion`): overlay opacity toggles instantly (no transition); spinner →
static indeterminate glyph. The state is still communicated — just not animated. [FACT: motion.md; B12(a)]

## Accessibility Contract
- **Role:** native `<button>` (web) / `Pressable` role="button" (native). [FACT: engineering §XIV ARIA]
- **Name:** from `children`; icon-only (label via `leading`, no text) REQUIRES `aria-label` (contract-enforced).
- **States:** `disabled`→`disabled`+`aria-disabled`; `loading`→`aria-busy="true"`.
- **Keyboard:** Tab-reachable (except `disabled`); **Enter and Space** activate. [FACT: §XIV keyboard]
- **Focus:** `:focus-visible` ring always visible (pointer-suppressed only). [FACT: §VIII]
- **Screen reader:** announces "{name}, button"; loading → "{name}, busy".
- **Contrast:** label/fill ≥ AA 4.5 small / 3.0 large — the primary/danger notes above enforce this.

## Performance Budget
- Zero runtime style computation on the hot path (Tamagui compiles variants to static styles).
- No layout shift default↔loading (spinner occupies the `leading` slot; width reserved).
- JS: shares the `@vida/ui` primitive bundle; no per-Button dependency.

## Acceptance Criteria
Design:
- [ ] 4 intents render with the tokened fills/text above; primary uses brand.600; secondary has a border.
- [ ] All applicable states present (default/hover/focus/active/disabled/loading); error/empty justified N/A.
- [ ] Focus ring = 2px `color.focus.ring`, 2px offset, `:focus-visible` only.
- [ ] Dark mode inherits via theme tokens (no hardcoded values).
Engineering:
- [ ] `ButtonProps` exported; strict TS; no `any`/`!`; forwardRef.
- [ ] Enter + Space activate; disabled removes from tab order; icon-only requires `aria-label`.
- [ ] `aria-busy` on loading; reduced-motion path implemented.
- [ ] `button.*` component tokens resolve through semantic → primitive (no primitive ref in a component token).
- [ ] Danger AA gap resolved (DS-2 emphasis token) OR filled-danger withheld — never shipped failing AA.
