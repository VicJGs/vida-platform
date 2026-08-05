# Component Contract: Checkbox
DS-5 · primitive 3/10 (atomic) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent
Binary (or tri-state) selection within a form/list. **NOT** mutually-exclusive choice (→ `Radio`), **NOT**
an action (→ `Button`), **NOT** an immediate-effect setting (→ `Switch`). Supports `indeterminate` for
parent-of-partial-children.

## API Contract
```ts
export interface CheckboxProps {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** tri-state: visually a dash; aria-checked="mixed". Mutually exclusive with a checked=true render. */
  indeterminate?: boolean
  disabled?: boolean
  invalid?: boolean       // required-but-unchecked in a submitted form
  required?: boolean
  size?: 'sm' | 'md' | 'lg'
  label?: React.ReactNode // slot; when omitted, aria-label REQUIRED
  name?: string
  value?: string
}
// forwardRef<HTMLInputElement | View, CheckboxProps> — REQUIRED. Props exported.
```

## Visual States (× value: unchecked · checked · indeterminate)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | resting | unchecked: 1px border box, transparent fill; checked: filled + checkmark; indeterminate: filled + dash | `checkbox.border` · `checkbox.backgroundChecked` · `checkbox.checkmark` · `checkbox.radius` |
| **hover** | pointer enters | border/fill strengthens (beyond color) | hover overlay opacity |
| **focus** | `:focus-visible` | 2px ring, 2px offset | `color.focus.ring` |
| **active** | Space / pointer down | brief press overlay | press overlay opacity |
| **disabled** | `disabled` | muted, not focusable | reduced opacity |
| **loading** | — | **N/A** — a checkbox toggles instantly; async work belongs to the surrounding form, not the box. |
| **error** | `invalid` | border → danger; message via `aria-describedby` | `checkbox.borderError` (`{color.signal.danger}`) |
| **empty** | unchecked (initial) | the unchecked visual **is** the empty state | `checkbox.border` |

## Motion Spec (B12: transform/opacity only)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| check appears | `duration.fast` | `easing.out` | **transform: scale** (0.8→1) + **opacity** of the checkmark |
| indeterminate dash | `duration.fast` | `easing.out` | opacity |
Reduced-motion: checkmark/dash appears instantly (no scale/fade).

## Accessibility Contract
- **Role:** `checkbox`. **aria-checked:** `true`/`false`/**`"mixed"`** (indeterminate). **Name:** `label` slot or `aria-label`.
- **States:** `invalid`→`aria-invalid`+`aria-describedby`; `required`→`aria-required`; `disabled`→`aria-disabled`.
- **Keyboard:** **Space** toggles (never Enter — Enter submits the form); Tab reachable; label click toggles.
- **Focus:** ring on the box (not the label).

## Performance Budget
No re-render of the whole group on one box's toggle (memoized rows). Checkmark is CSS/SVG, no image.

## Acceptance Criteria
- [ ] unchecked/checked/indeterminate render; `aria-checked="mixed"` for indeterminate.
- [ ] All applicable states (loading justified N/A); Space toggles; label association or `aria-label`.
- [ ] Motion is scale+opacity only (B12); reduced-motion instant.
- [ ] Focus ring = 2px `color.focus.ring`. `checkbox.*` tokens resolve through semantic.
