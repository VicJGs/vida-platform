# Component Contract: Popover
DS-5 · primitive 9/10 (overlay) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent
Contextual, **non-modal** content anchored to a trigger — the app behind stays interactive. **NOT** modal
(→ `Dialog`), **NOT** a list of actions (→ `Menu`), **NOT** hover-only non-interactive help (→ `Tooltip`).

## API Contract
```ts
export interface PopoverProps {
  trigger: React.ReactNode        // slot
  children: React.ReactNode       // popover content (may be interactive)
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: 'top' | 'bottom' | 'left' | 'right' | `${'top'|'bottom'}-${'start'|'end'}`
  offset?: number
  /** accessible name when the content has no heading. */
  'aria-label'?: string
}
// forwardRef<HTMLButtonElement | View, PopoverProps> (the trigger). Props exported.
```

## Visual States (non-modal container)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | open | surface panel, 1px border, `radius`, arrow toward anchor | `popover.background` · `popover.border` · `popover.radius` · `zIndex.overlay` |
| **loading** | async content | skeleton/spinner inside; `aria-busy` | (skeleton) |
| **empty** | no content | consumer empty-state slot | `popover.background` |
| hover · focus · active · disabled · error | — | **N/A at the shell** — live on the trigger + inner controls (their contracts). |

## Motion Spec (B12)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| open | `duration.fast` | `easing.out` | opacity + transform: scale(0.96→1) from the anchor edge |
Reduced-motion: appears instantly.

## Accessibility Contract [FACT: engineering §XIV]
- **Trigger:** `aria-expanded`, `aria-haspopup="dialog"`, `aria-controls`→panel. **Panel:** `role="dialog"`
  (non-modal — no `aria-modal`) with `aria-label`/`aria-labelledby`. [INTERP: WAI-ARIA per §XIV]
- **Focus:** moves into the panel on open; **NOT trapped** (non-modal — unlike `Dialog`); Tab may leave and
  the popover closes. **Esc closes and returns focus to the trigger.** Outside-click closes.
- Background remains interactive and is NOT `inert` (the modal/non-modal distinction from `Dialog`).

## Performance Budget
Portals to body; positioned with a single transform (no layout thrash on scroll — recompute throttled).

## Acceptance Criteria
- [ ] `role=dialog` (non-modal, no `aria-modal`); `aria-expanded` on trigger; labelled.
- [ ] Focus enters on open, **NOT trapped**, Esc/outside-click close + return focus to trigger.
- [ ] `zIndex.overlay` (below modal, above dropdown); motion opacity/transform (B12); reduced-motion instant.
- [ ] `popover.*` tokens resolve through semantic.
