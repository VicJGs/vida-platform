# Component Contract: Card
DS-5 · primitive 5/10 (molecular) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent
A grouped surface for related content. **NOT** a button (an entirely-clickable card sets `interactive`
and gains button semantics), **NOT** a modal (→ `Dialog`), **NOT** a page section landmark by default.

## API Contract
```ts
export interface CardProps {
  header?: React.ReactNode   // slot
  footer?: React.ReactNode   // slot
  actions?: React.ReactNode  // slot (top-right controls)
  /** makes the whole card a single pressable target (adds role=button + keyboard). */
  interactive?: boolean
  onPress?: () => void       // only meaningful with interactive
  disabled?: boolean         // only meaningful with interactive
  padding?: 'compact' | 'default' | 'spacious'
  children: React.ReactNode
}
// forwardRef<HTMLDivElement | View, CardProps>. Discriminated-union note: onPress/disabled only valid when interactive.
```

## Visual States (a container — interactive states apply ONLY when `interactive`)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | resting | surface fill, 1px border, `radiusCard`, inset padding | `card.background` · `card.border` · `card.radius` · `card.padding` |
| **hover** | interactive + pointer | subtle elevation (overlay opacity) | overlay opacity |
| **focus** | interactive + `:focus-visible` | 2px ring | `color.focus.ring` |
| **active** | interactive + press | pressed overlay | overlay opacity |
| **disabled** | interactive + `disabled` | muted, not focusable | reduced opacity |
| **loading** | content pending | skeleton placeholders inside; `aria-busy` | (skeleton) |
| **error** | — | **N/A** — a container has no validity; a failed load renders an inline error state in `children`. |
| **empty** | no children/data | consumer's empty-state slot rendered in the content area | `card.background` |

## Motion Spec (B12)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| hover elevation (interactive) | `duration.fast` | `easing.out` | opacity of elevation overlay (never box-shadow — B12) |
Reduced-motion: elevation appears instantly.

## Accessibility Contract [FACT: engineering §XIV]
- **Non-interactive:** `role="group"` (or `region` + `aria-label`/`aria-labelledby`→header when it's a landmark).
- **Interactive:** `role="button"`, Tab-reachable, Enter/Space activate, `aria-disabled` when disabled. [INTERP: §XIV "correct role"]
- Header/footer are `<header>`/`<footer>` regions inside; actions are individually focusable.

## Performance Budget
Static styles (no runtime shadow computation). Skeleton reserves final layout to avoid shift.

## Acceptance Criteria
- [ ] Interactive states present only when `interactive`; error justified N/A; empty via content slot.
- [ ] Elevation animates via opacity overlay (B12), not box-shadow.
- [ ] `role=group` vs `role=button` per `interactive`; keyboard when interactive.
- [ ] `card.*` tokens resolve through semantic (`radiusCard`, `surface.primary`, `border.default`).
