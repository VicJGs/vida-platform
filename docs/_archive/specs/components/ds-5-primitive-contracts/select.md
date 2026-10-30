# Component Contract: Select

DS-5 · primitive 4/10 (molecular) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent

Choose **one** value from a known, closed list. **NOT** free text (→ `Input`), **NOT** multi-value tags
(→ `MultiSelect`), **NOT** action commands (→ `Menu`), **NOT** large async search (→ `Combobox`).

## API Contract

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
  size?: 'sm' | 'md' | 'lg'
  name?: string
}
// forwardRef<HTMLButtonElement | View, SelectProps> (the trigger). Props exported.
```

## Visual States

| State        | Trigger                | Visual                                         | Token used                                                                                 |
| ------------ | ---------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **default**  | closed, has value      | trigger like Input; value text                 | `select.background` · `select.border` · `select.text` · `select.radius` · `select.padding` |
| **hover**    | pointer enters trigger | border strengthens                             | hover overlay opacity                                                                      |
| **focus**    | `:focus-visible`       | 2px ring                                       | `color.focus.ring`                                                                         |
| **active**   | open                   | trigger focus + panel visible; `aria-expanded` | `select.panelBackground` · `zIndex.dropdown`                                               |
| **disabled** | `disabled`             | muted, not focusable                           | reduced opacity                                                                            |
| **loading**  | async options          | spinner in trigger; `aria-busy`                | (slot)                                                                                     |
| **error**    | `invalid`              | border → danger; `aria-describedby`            | `select.borderError` (`{color.signal.danger}`)                                             |
| **empty**    | no value               | placeholder (muted)                            | `select.placeholder` (`{color.text.muted}`)                                                |

## Motion Spec (B12)

| Transition | Duration        | Easing       | Property                              |
| ---------- | --------------- | ------------ | ------------------------------------- |
| panel open | `duration.fast` | `easing.out` | opacity + transform: translateY/scale |

Reduced-motion: panel appears instantly.

## Accessibility Contract [FACT: engineering §XIV]

- **Trigger role** `combobox`, `aria-expanded`, `aria-controls`→listbox, `aria-haspopup="listbox"`.
  **Panel role** `listbox`; **option role** `option` with `aria-selected`. [INTERP: WAI-ARIA per §XIV "correct role: combobox/listbox"]
- **Name:** `<label>`/`aria-label`. **State:** `invalid`→`aria-invalid`; `required`→`aria-required`.
- **Keyboard:** Enter/Space/↓ opens; ↑/↓ move; Enter selects; Esc closes; type-ahead. **Focus returns to the trigger on close** (§XIV modal-like close).

## Performance Budget

Options virtualized above ~100 items. Panel portals to body (z-order); no reflow of the trigger on open.

## Acceptance Criteria

- [ ] combobox/listbox/option roles + `aria-selected`; Esc closes and returns focus to trigger.
- [ ] All 8 states; error via `aria-describedby`; empty→placeholder.
- [ ] Panel uses `zIndex.dropdown`; motion is opacity/transform only (B12).
- [ ] `select.*` tokens resolve through semantic.
