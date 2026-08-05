# Component Contract: Menu
DS-5 · primitive 7/10 (molecular) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent
A list of **actions/commands** opened from a trigger. **NOT** value selection (→ `Select`, which commits
a form value), **NOT** persistent navigation, **NOT** a modal task (→ `Dialog`). Items *do* things.

## API Contract
```ts
export interface MenuItem {
  id: string
  label: React.ReactNode
  onSelect?: () => void
  disabled?: boolean
  intent?: 'default' | 'danger'   // destructive items
  leading?: React.ReactNode       // icon slot
}
export interface MenuProps {
  trigger: React.ReactNode        // slot (usually a Button)
  items: ReadonlyArray<MenuItem>
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
  placement?: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'
}
// forwardRef<HTMLButtonElement | View, MenuProps> (the trigger). Props exported.
```

## Visual States (menu open/closed · per item)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | open, item resting | surface panel, item text | `menu.background` · `menu.itemText` · `menu.radius` · `zIndex.dropdown` |
| **hover** | pointer/keyboard on item | item highlight fill | `menu.itemBackgroundHover` (`{color.surface.secondary}`) |
| **focus** | roving focus on item | highlight = focus (single active descendant) | `menu.itemBackgroundHover` |
| **active** | item pressed/activated | brief press feedback then close | overlay opacity |
| **disabled** | item `disabled` | muted, skipped in nav | reduced opacity |
| **loading** | — | **N/A** — a menu of commands does not load; a command may open a loading surface elsewhere. |
| **error** | — | **N/A** — items are actions, not validated inputs. |
| **empty** | no items | a muted "No actions" placeholder row | `menu.itemText` @ muted |

Danger items: `intent="danger"` item label → `{color.signal.danger}` (destructive affordance).

## Motion Spec (B12)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| menu open | `duration.fast` | `easing.out` | opacity + transform: scale/translateY from the trigger edge |
Reduced-motion: appears instantly.

## Accessibility Contract [FACT: engineering §XIV]
- **Trigger:** `role="button"`, `aria-haspopup="menu"`, `aria-expanded`. **Panel:** `role="menu"`; items `role="menuitem"` (`menuitemcheckbox`/`radio` variants out of scope). [INTERP: WAI-ARIA per §XIV]
- **Keyboard:** Enter/Space/↓ opens (focus first item); ↑/↓ roving; Enter/Space activates; Esc closes; type-ahead. **Focus returns to the trigger on close** (§XIV).
- Not a form control — no `aria-invalid`/`required`.

## Performance Budget
Panel portals to body; single active-descendant highlight (no per-item focus churn). Closes on select/outside-click.

## Acceptance Criteria
- [ ] button(haspopup)/menu/menuitem roles; Esc closes + returns focus to trigger.
- [ ] Applicable states (loading/error justified N/A); empty→placeholder row; danger items tokened.
- [ ] `zIndex.dropdown`; motion opacity/transform only (B12).
- [ ] `menu.*` tokens resolve through semantic.
