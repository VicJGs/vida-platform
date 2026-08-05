# Component Contract: Toast
DS-5 · primitive 10/10 (overlay) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent
**Transient, non-blocking** feedback about the result of an async action. **NOT** a persistent inline
message (→ `Alert`), **NOT** a decision that blocks (→ `Dialog`). Auto-dismisses; never steals focus.

## API Contract
```ts
export type ToastIntent = 'info' | 'success' | 'danger'
export interface ToastOptions {
  title: React.ReactNode
  description?: React.ReactNode
  intent?: ToastIntent          // default 'info'
  /** ms before auto-dismiss; 0 = sticky (requires manual dismiss). Default 5000. */
  duration?: number
  action?: { label: string; onPress: () => void }  // one optional action
  onDismiss?: () => void
}
// Imperative surface: toast(options) → id; toast.dismiss(id). The element renders in a portal region.
```

## Visual States (per toast; intent is a value dimension)
| State | Trigger | Visual | Token used |
|-------|---------|--------|------------|
| **default** | shown | surface panel, intent accent (left border), title/description, `radiusCard`; stacked bottom/top | `toast.background` · `toast.text` · accent per intent → `toast.accentInfo` \| `toast.accentSuccess` \| `toast.accentDanger` · `zIndex.toast` |
| **hover** | pointer over toast | **auto-dismiss timer pauses**; slight elevation | overlay opacity |
| **focus** | Tab to the action/dismiss | 2px ring on the focusable control (not the toast body) | `color.focus.ring` |
| **active** | action/dismiss pressed | press feedback on that control | overlay opacity |
| **loading** | in-progress toast | spinner + `aria-busy`; sticky until resolved | (spinner) |
| **error** | `intent="danger"` | danger accent; `aria-live="assertive"` | `toast.accentDanger` (`{color.signal.danger}`) |
| **empty** | — | **N/A** — a toast is created with content; no empty state. |
| **disabled** | — | **N/A** — a toast is not a persistent control. |

Intent accents: info → `{color.brand.primary}`, success → `{color.signal.success}`, danger → `{color.signal.danger}`.

## Motion Spec (B12)
| Transition | Duration | Easing | Property |
|-----------|----------|--------|----------|
| enter | `duration.moderate` | `easing.out` | opacity + transform: translateY/X (slide from edge) |
| exit | `duration.fast` | `easing.in` | opacity + transform |
Reduced-motion: appears/disappears instantly — **the message is still conveyed via `aria-live`** (B12(a): communicate state another way).

## Accessibility Contract [FACT: engineering §XIV — verbatim]
- **"Toast appears: announced via `aria-live`, focus NOT moved."** Region: `role="status"` +
  `aria-live="polite"` for info/success; `role="alert"` + `aria-live="assertive"` for `danger`. [FACT: §XIV live regions]
- Action + dismiss are real focusable buttons (keyboard-reachable via a toast-region shortcut, e.g. F6); Esc dismisses the focused toast.
- **Focus is never moved to the toast** on appear (§XIV) — it would interrupt the user's task.
- Auto-dismiss pauses on hover **and** keyboard focus within the toast.

## Performance Budget
Portal region; max N visible (older ones collapse/queue) — `log()` the cap in the impl. One transform per toast; timers cleared on unmount.

## Acceptance Criteria
- [ ] `status`/`polite` (info/success) vs `alert`/`assertive` (danger); **focus not moved** on appear (§XIV).
- [ ] Auto-dismiss (default 5s) pauses on hover/focus; `duration:0` = sticky; action + dismiss focusable.
- [ ] Applicable states (empty/disabled justified N/A); reduced-motion still announces via `aria-live`.
- [ ] `zIndex.toast` (top of the stack); `toast.*` tokens resolve through semantic.
