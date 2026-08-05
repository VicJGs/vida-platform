# Component Contract: Tabs
DS-5 · primitive 6/10 (molecular) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent
Switch between **peer views of the same content region**. **NOT** page navigation (→ nav links / router),
**NOT** a sequential flow (→ `Stepper`), **NOT** a menu of actions (→ `Menu`).

## API Contract
```ts
export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  items: ReadonlyArray<{ value: string; label: React.ReactNode; disabled?: boolean }>
  orientation?: 'horizontal' | 'vertical'   // default 'horizontal'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode   // the panels (one visible at a time)
}
// forwardRef<HTMLDivElement | View, TabsProps>. Props exported.
```

## Visual States (per tab)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | unselected | muted label, no indicator; the tablist sits on a 1px baseline rule | `tabs.text` (`{color.text.muted}`) · `tabs.border` (`{color.border.default}`, the strip baseline) |
| **hover** | pointer enters | label strengthens toward active | hover overlay opacity |
| **focus** | `:focus-visible` | 2px ring on the tab | `color.focus.ring` |
| **active** | selected | full-strength label + indicator bar | `tabs.textActive` (`{color.text.primary}`) · `tabs.indicator` (`{color.brand.primary}`) |
| **disabled** | tab `disabled` | muted, skipped in arrow nav | reduced opacity |
| **loading** | panel content pending | panel shows skeleton; tab strip stable; `aria-busy` on panel | (skeleton) |
| **error** | — | **N/A** at the tab level — a failed panel renders its error inside the panel. |
| **empty** | — | **N/A** — Tabs always has ≥1 tab (an empty set renders nothing; guard at the consumer). |

## Motion Spec (B12 — the indicator is the showcase of B12-legal motion)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| indicator moves | `duration.moderate` (250) | `easing.inOut` | **transform: translateX/Y** (never left/width — B12) |
| panel swap | `duration.fast` | `easing.out` | opacity |
Reduced-motion: indicator jumps instantly; panel swaps without fade.

## Accessibility Contract [FACT: engineering §XIV]
- **Roles:** container `tablist`; each tab `tab` with `aria-selected` + `aria-controls`→panel id; each panel `tabpanel` with `aria-labelledby`→tab id. [INTERP: WAI-ARIA per §XIV]
- **Keyboard:** ←/→ (or ↑/↓ vertical) move selection between tabs (roving tabindex); **Tab moves focus into the selected panel**. Home/End jump to first/last.
- **Focus on change:** "**focus moves to the selected tab's panel**" — verbatim §XIV.

## Performance Budget
Only the active panel mounted (or all mounted but inactive hidden with `hidden` — consumer choice); indicator uses a single transform, no per-frame layout.

## Acceptance Criteria
- [ ] tablist/tab/tabpanel roles + `aria-selected`/`aria-controls`/`aria-labelledby`.
- [ ] Arrow-key roving nav; on change focus goes to the panel (§XIV).
- [ ] Indicator animates via transform only (B12); reduced-motion jumps.
- [ ] `tabs.*` tokens resolve through semantic.
