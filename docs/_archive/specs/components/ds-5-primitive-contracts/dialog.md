# Component Contract: Dialog

DS-5 · primitive 8/10 (overlay) · LIF-85. Shared conventions: `_index.md §2`. Implemented by UI-1.

## Intent

A **modal** surface that blocks the rest of the app until the user completes or dismisses a focused task
or decision. **NOT** transient feedback (→ `Toast`), **NOT** a non-blocking anchored surface (→ `Popover`),
**NOT** a whole route/page.

## API Contract

```ts
export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** REQUIRED — the accessible name (aria-labelledby). */
  title: React.ReactNode
  description?: React.ReactNode // aria-describedby
  footer?: React.ReactNode // slot (actions)
  size?: 'sm' | 'md' | 'lg'
  /** Esc + backdrop click close. Default true; set false for destructive-confirm dialogs. */
  dismissible?: boolean
  children: React.ReactNode
}
// forwardRef<HTMLDivElement | View, DialogProps> (the dialog surface). Props exported.
```

## Visual States (a modal container — interactive states live on its inner controls, not the shell)

| State                                     | Trigger        | Visual                                                                                             | Token used                                                                 |
| ----------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **default**                               | open           | scrim + centered panel, `radiusCard`, inset padding                                                | `dialog.background` · `dialog.radius` · `zIndex.modal` · scrim (see below) |
| **loading**                               | async content  | panel shows skeleton/spinner; `aria-busy`; actions disabled                                        | (skeleton)                                                                 |
| **empty**                                 | no content yet | consumer empty-state in the body                                                                   | `dialog.background`                                                        |
| hover · focus · active · disabled · error | —              | **N/A at the shell** — these live on the Buttons/Inputs _inside_ the dialog (their own contracts). |

**Scrim** ⚠ no dedicated scrim token exists. Convention: `{color.surface.inverse}` at ~0.5 opacity (a
dimming layer), animated via opacity (B12). The exact scrim value/opacity is a DS-2/brand-pass detail —
flagged, not fabricated as a new token here.

## Motion Spec (B12)

| Transition  | Duration            | Easing       | Property                                      |
| ----------- | ------------------- | ------------ | --------------------------------------------- |
| scrim in    | `duration.fast`     | `easing.out` | opacity                                       |
| panel enter | `duration.moderate` | `easing.out` | opacity + transform: scale(0.96→1)/translateY |

Reduced-motion: scrim + panel appear instantly (no scale/translate).

## Accessibility Contract [FACT: engineering §XIV — modal rules verbatim]

- **Role** `dialog`, `aria-modal="true"`, `aria-labelledby`→`title`, `aria-describedby`→`description`.
- **On open: focus moves to the first focusable element inside.** **On close: focus returns to the element that triggered it.** (§XIV)
- **Focus trap:** Tab/Shift+Tab cycle **within** the dialog while open (the one sanctioned trap, §XIV).
- **Esc** closes when `dismissible`; backdrop click closes when `dismissible`. Background is `inert`/`aria-hidden`.

## Performance Budget

Portals to body; mounts on open, unmounts on close (no hidden retained tree). Scrim is one opacity layer.

## Acceptance Criteria

- [ ] `role=dialog` + `aria-modal` + labelled by `title`; `title` required.
- [ ] Focus moves in on open, **returns to trigger on close**, and is trapped while open (§XIV).
- [ ] Esc/backdrop close only when `dismissible`; background inert.
- [ ] `zIndex.modal`; scrim + panel animate via opacity/transform (B12); reduced-motion instant.
- [ ] `dialog.*` tokens resolve through semantic; scrim flagged (no fabricated token).
