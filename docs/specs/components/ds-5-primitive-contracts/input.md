# Component Contract: Input
DS-5 · primitive 2/10 (atomic) · LIF-85. Shared conventions: `_index.md §2` (semantic props · slots · TS ·
forwardRef · 8-state · B12 motion · contrast). Implemented by UI-1.

## Intent
Single-line text entry. **NOT** multi-line (→ `Textarea`), **NOT** option selection (→ `Select`), **NOT**
a value with unit steppers (→ `NumberField`). Composed by `Select`/`Combobox` as their text surface.

## API Contract
```ts
export interface InputProps {
  value?: string
  defaultValue?: string
  onChangeText?: (v: string) => void
  placeholder?: string
  /** semantic error state (§VII) — drives the error visual + aria-invalid */
  invalid?: boolean
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  /** input mode; 'password' masks. */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url'
  leading?: React.ReactNode   // slot (icon/prefix)
  trailing?: React.ReactNode  // slot (icon/clear/reveal)
  name?: string
  id?: string
}
// forwardRef<HTMLInputElement | TextInput, InputProps> — REQUIRED. Props exported.
```

**Amendment (notes-rescope R3, 2026-10-27):** a fourth size, **`display`** — the in-place editor for a `$display` title
(EntityView rename): `fontFamily`/`fontSize`/`lineHeight` = `$display`, auto height. **DEV-R3-1:** the native element is a
Tamagui `Text` host (`render:'input'`) — as a `View` it dropped every font prop, so all sizes rendered in the browser's
default input font; the size tokens above now apply.

## Visual States (State | Trigger | Visual | Token used — component tokens, §II)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | resting w/ value | surface fill, 1px border, text; `radius`/`padding` | `input.background` · `input.border` · `input.text` · `input.radius` · `input.padding` |
| **hover** | pointer enters | border strengthens (perceivable beyond color) | `input.border` + hover overlay opacity |
| **focus** | focus (`:focus-visible`) | 2px ring, 2px offset; border → focus | `color.focus.ring` · `input.borderFocus` |
| **active** | typing/caret | caret visible; identical to focus | (focus tokens) |
| **disabled** | `disabled` | muted fill+text, not focusable, `not-allowed` | `input.background` @ reduced opacity |
| **loading** | async validate | trailing spinner; input remains readable, `aria-busy` | (trailing slot) |
| **error** | `invalid` | border → danger; error text below via `aria-describedby` | `input.borderError` (`{color.signal.danger}`) |
| **empty** | no value | `placeholder` shown in muted text (never as the value) | `input.placeholder` (`{color.text.muted}`) |

## Motion Spec (B12: transform/opacity only)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| focus ring in | `duration.fast` | `easing.out` | opacity of ring |
| error border | `duration.instant` | — | state (border color is an instant swap, not animated — B12) |
Reduced-motion: ring appears instantly.

## Accessibility Contract
- **Role:** `textbox` (native `<input>`). **Name:** associated `<label htmlFor>` or `aria-label` (contract-enforced — no unlabeled input).
- **States:** `invalid`→`aria-invalid="true"` + `aria-describedby` → the error text id; `required`→`aria-required`; `readOnly`→`aria-readonly`; loading→`aria-busy`.
- **Keyboard:** standard text editing; Tab in/out; Esc clears when a `trailing` clear affordance is present.
- **Focus:** `:focus-visible` ring always visible.

## Performance Budget
Controlled value updates debounced by the consumer, not per-keystroke re-render of siblings. No layout shift default↔error (error text reserves space or uses a live region).

## Acceptance Criteria
- [ ] All 8 states present (error/empty fully live here); placeholder ≠ value; error text linked via `aria-describedby`.
- [ ] Focus ring = 2px `color.focus.ring`. Dark mode via tokens.
- [ ] `InputProps` exported; strict TS; forwardRef; labelled or `aria-label` enforced.
- [ ] `input.*` tokens resolve through semantic → primitive.
