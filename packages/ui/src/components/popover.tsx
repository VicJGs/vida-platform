import {
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { styled, Theme, View } from '@tamagui/core'
import { ensurePopoverStyles } from '../internal/popover-styles'

// UI-1 · Popover (primitive 9/10, overlay/organism tier 2nd of 3) — implements ds-5-primitive-contracts/popover.md
// against Tamagui v2. Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u9-popover.md.
// - A genetic HYBRID: Menu's floating machinery (trigger cloneElement, portal-to-body under <Theme>, position:fixed
//   seed→refine→reveal, outside/scroll/resize dismiss) + Dialog's focus model (role=dialog, focus MOVES into the
//   panel, Esc returns focus to the trigger) — but NON-MODAL: no focus trap, no `inert`, background stays interactive.
// - Trigger: aria-haspopup="dialog" + aria-expanded + aria-controls, opens on CLICK only (a dialog opener, not a
//   menu — a native <button> synthesizes a click on Enter/Space, so no onKeyDown/arrow-open is wired; that also
//   sidesteps the U7 Enter/Space double-fire). The `trigger` is a consumer SLOT wired via cloneElement.
// - Focus is NOT trapped: a React onBlur on the panel closes when focus leaves to a real node outside panel+trigger
//   (Tab-away); it ignores internal moves + a null relatedTarget (survive window-blur; outside-pointerdown owns the
//   empty-click path). Esc closes + returns focus to the trigger.
// - 8 placements with an AXIS-SPLIT: top/bottom = vertical primary (single `top` + horizontal align/flip), left/right
//   = horizontal primary (single `left` + vertical center/flip). Single side property per axis (never top+bottom).
// - Arrow toward the anchor (popover.md:27): a rotated 8px square, border on its 2 OUTER edges, bg=$background so it
//   blends into the panel; repositioned instantly on flip (NOT animated — the Tabs indicator precedent). No
//   `popover.arrow` token → reuses popover.background/border (DEF-U9-b).
// - name:'Popover' scopes the light_/dark_Popover sub-theme ($background/$border); the portal detaches that scope so
//   the panel is re-wrapped in <Theme name="Popover"> (the Menu/Dialog precedent; base light/dark crosses via <html>).
// - Motion (B12): opacity + scale(0.96→1) from the anchor edge (transform-origin inline), internal/popover-styles.ts.

type Side = 'top' | 'bottom' | 'left' | 'right'
type Align = 'start' | 'end'
type Placement = Side | `${'top' | 'bottom'}-${'start' | 'end'}`

export interface PopoverProps {
  /** The opener — a single focusable element (usually a `<Button>`); decorated via cloneElement. */
  trigger: ReactNode
  /** Popover content — may be interactive (the background stays live; this is non-modal). */
  children: ReactNode
  /** Controlled open state. */
  open?: boolean
  /** Uncontrolled initial open state. */
  defaultOpen?: boolean
  /** Fires on every open/close, in both controlled + uncontrolled modes. */
  onOpenChange?: (open: boolean) => void
  /** Anchor placement. Default 'bottom'. Flips to the opposite side when clipped. `-start`/`-end` are top/bottom only. */
  placement?: Placement
  /** Gap between the trigger and the panel, px. Default 8. */
  offset?: number
  /** Accessible name when the content has no heading. A role="dialog" needs a name — provide one of these. */
  'aria-label'?: string
  'aria-labelledby'?: string
}

// Panel dimensions/position after measurement. One side property per axis is derived into `left`/`top`.
type PanelPos = { left: number; top: number; maxWidth: number; maxHeight: number }

const ARROW = 8 // px square (rotated 45° → a caret)
const RADIUS = 12 // radius.card ($lg) — keeps the arrow off the rounded corners
const MARGIN = 8 // viewport margin so the panel never touches the edges

// A single focusable element inside the panel. `:not([tabindex="-1"])` excludes the panel itself (tabIndex=-1).
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function getFocusable(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi))

// ── styled parts (name:'Popover' keeps them in the sub-theme scope under the portal's <Theme>) ────────────
const PopoverPanel = styled(View, {
  name: 'Popover',
  position: 'fixed',
  flexDirection: 'column',
  backgroundColor: '$colorSurfacePrimary',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  // radius.card (lg) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$lg',
  padding: '$12',
  // overflow stays VISIBLE so the arrow (a child at top:-4/etc.) isn't clipped; scrolling lives on the inner wrapper.
})

// Inner scroll region. flexShrink:1 + minHeight:0 sizes to content and scrolls only when the panel hits maxHeight —
// NOT flex={1} (grow:1/basis:0% collapses to 0 height in a content-height panel and clips children; the U8 lesson).
const PopoverScroll = styled(View, { name: 'Popover', flexShrink: 1, minHeight: 0 })

// The caret. bg=$background (blends into the panel, hiding the panel border seam beneath it); the 2 OUTER edges get a
// 1px $border via inline widths (per resolved side). Rotated 45° → a point toward the anchor.
const PopoverArrow = styled(View, {
  name: 'Popover',
  position: 'absolute',
  width: ARROW,
  height: ARROW,
  backgroundColor: '$colorSurfacePrimary',
  borderColor: '$colorBorderDefault',
  borderStyle: 'solid',
  // Floor ALL edges to 0 — `borderStyle:'solid'` with no width defaults to `border-width:medium` (~3px) on any edge
  // arrowStyle() doesn't override, painting spurious borders (Visual-Gate catch). arrowStyle sets the 2 outer edges to 1.
  borderWidth: 0,
})

// The two OUTER border edges + the edge offset + the 45° rotation, per resolved side (rotate(45°): top→NE, left→NW,
// bottom→SW, right→SE). `transform` is set here (inline) — the styled base can't express the CSS-string rotate cleanly,
// and it must be present or the caret is an axis-aligned square (Visual-Gate catch).
function arrowStyle(side: Side, offsetPx: number): CSSProperties {
  const half = ARROW / 2
  const rot: CSSProperties = { transform: 'rotate(45deg)' }
  switch (side) {
    case 'bottom': // panel below trigger, caret on the panel's TOP edge pointing UP (NE+NW = top+left borders)
      return { ...rot, top: -half, left: offsetPx, borderTopWidth: 1, borderLeftWidth: 1 }
    case 'top': // panel above, caret on the BOTTOM edge pointing DOWN (SE+SW = right+bottom borders)
      return { ...rot, bottom: -half, left: offsetPx, borderBottomWidth: 1, borderRightWidth: 1 }
    case 'right': // panel right of trigger, caret on the LEFT edge pointing LEFT (NW+SW = left+bottom borders)
      return { ...rot, left: -half, top: offsetPx, borderLeftWidth: 1, borderBottomWidth: 1 }
    case 'left': // panel left of trigger, caret on the RIGHT edge pointing RIGHT (NE+SE = top+right borders)
      return { ...rot, right: -half, top: offsetPx, borderTopWidth: 1, borderRightWidth: 1 }
  }
}

// transform-origin = the anchor edge (nearest the trigger), so the scale grows FROM the trigger.
function originFor(side: Side): CSSProperties['transformOrigin'] {
  return side === 'bottom' ? 'top' : side === 'top' ? 'bottom' : side === 'right' ? 'left' : 'right'
}

// ── ref/handler composition (module-level, pure — the menu.tsx/dialog.tsx copy-per-file precedent) ────────
function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MutableRefObject.current is readonly in the Ref type; assignment is the documented ref-callback contract
  else (ref as { current: T | null }).current = node
}

// Merge the consumer's own handler with ours; ours is skipped if the consumer called preventDefault.
function composeHandlers<E extends { defaultPrevented: boolean }>(
  theirs: ((e: E) => void) | undefined,
  ours: (e: E) => void,
): (e: E) => void {
  return (e: E) => {
    theirs?.(e)
    if (!e.defaultPrevented) ours(e)
  }
}

export const Popover = forwardRef<HTMLButtonElement, PopoverProps>(function Popover(
  {
    trigger,
    children,
    open,
    defaultOpen,
    onOpenChange,
    placement = 'bottom',
    offset = 8,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledby,
  },
  ref,
) {
  ensurePopoverStyles()

  const uid = useId()
  const panelId = `${uid}-popover`

  const isOpenControlled = open !== undefined
  const [innerOpen, setInnerOpen] = useState(defaultOpen ?? false)
  const isOpen = isOpenControlled ? open : innerOpen

  const [pos, setPos] = useState<PanelPos | null>(null)
  const [entered, setEntered] = useState(false)
  const [resolvedSide, setResolvedSide] = useState<Side>('bottom')
  const [arrowOffset, setArrowOffset] = useState(0)

  const triggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)

  // The consumer's element + its own props (onClick to compose, ref to preserve — React 19: ref-as-prop).
  const triggerEl = isValidElement(trigger) ? (trigger as ReactElement<Record<string, unknown>>) : null
  const triggerProps = (triggerEl?.props ?? {}) as {
    onClick?: (e: ReactMouseEvent) => void
    ref?: Ref<HTMLElement>
  }
  const ownRef = triggerProps.ref

  if (process.env.NODE_ENV !== 'production') {
    if (!isValidElement(trigger)) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Popover: `trigger` must be a single valid React element (it receives a ref + ARIA state).',
      )
    }
    if (ariaLabel == null && ariaLabelledby == null) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Popover: provide an `aria-label` or `aria-labelledby` — a role="dialog" needs an accessible name.',
      )
    }
  }

  const setOpenState = useCallback(
    (next: boolean) => {
      if (!isOpenControlled) setInnerOpen(next)
      onOpenChange?.(next)
    },
    [isOpenControlled, onOpenChange],
  )

  const toggle = () => setOpenState(!isOpen)
  // returnFocus=true only for Esc (the trigger is an allowed onBlur target, so this doesn't re-close).
  const closePopover = (returnFocus: boolean) => {
    setOpenState(false)
    if (returnFocus) triggerRef.current?.focus?.()
  }

  // ── open: seed a provisional position (mounts the panel; the refine effect corrects it before paint) ────
  useLayoutEffect(() => {
    if (!isOpen) {
      setPos(null)
      setEntered(false)
      return
    }
    const t = triggerRef.current
    if (!t) return
    const rect = t.getBoundingClientRect()
    setPos(
      (prev) =>
        prev ?? {
          left: rect.left,
          top: rect.bottom + offset, // provisional; refined once the panel measures
          maxWidth: window.innerWidth - 2 * MARGIN,
          maxHeight: window.innerHeight - 2 * MARGIN,
        },
    )
  }, [isOpen, offset])

  // ── refine after the panel mounts: AXIS-SPLIT place (flip + clamp), arrow offset, then reveal. useLayoutEffect
  //    runs BEFORE paint, so the provisional frame is never painted — no flash, even under reduced motion.
  //    `pos` is a dep so this re-runs after the SEED commit mounts the panel (first open commit: panelRef null → early
  //    return; `entered` guard makes the re-entry idempotent — the [[portal-open-focus-needs-a-mount-gated-effect-dep]] trap).
  useLayoutEffect(() => {
    if (!isOpen || entered) return
    const t = triggerRef.current
    const panel = panelRef.current
    if (!t || !panel) return
    const rect = t.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const panelW = panel.offsetWidth
    const panelH = panel.offsetHeight
    const dash = placement.indexOf('-')
    const side = (dash === -1 ? placement : placement.slice(0, dash)) as Side
    const align = dash === -1 ? undefined : (placement.slice(dash + 1) as Align)

    let next: PanelPos
    let rSide: Side
    let aOffset: number

    if (side === 'top' || side === 'bottom') {
      // primary axis = vertical
      const spaceBelow = vh - rect.bottom - offset
      const spaceAbove = rect.top - offset
      let openBottom = side === 'bottom'
      if (side === 'bottom' && panelH > spaceBelow && spaceAbove > spaceBelow) openBottom = false
      if (side === 'top' && panelH > spaceAbove && spaceBelow > spaceAbove) openBottom = true
      rSide = openBottom ? 'bottom' : 'top'
      const top = openBottom ? rect.bottom + offset : rect.top - panelH - offset
      // cross axis = horizontal (start/end/center)
      const left0 =
        align === 'end' ? rect.right - panelW : align === 'start' ? rect.left : rect.left + rect.width / 2 - panelW / 2
      const left = clamp(left0, MARGIN, vw - panelW - MARGIN)
      aOffset = clamp(rect.left + rect.width / 2 - left - ARROW / 2, RADIUS, panelW - RADIUS - ARROW)
      next = {
        left,
        top,
        maxWidth: vw - 2 * MARGIN,
        maxHeight: Math.min(openBottom ? spaceBelow : spaceAbove, vh - 2 * MARGIN),
      }
    } else {
      // primary axis = horizontal (left/right — no start/end per the type)
      const spaceRight = vw - rect.right - offset
      const spaceLeft = rect.left - offset
      let openRight = side === 'right'
      if (side === 'right' && panelW > spaceRight && spaceLeft > spaceRight) openRight = false
      if (side === 'left' && panelW > spaceLeft && spaceRight > spaceLeft) openRight = true
      rSide = openRight ? 'right' : 'left'
      const left = openRight ? rect.right + offset : rect.left - panelW - offset
      // cross axis = vertical, centered on the trigger midpoint
      const top0 = rect.top + rect.height / 2 - panelH / 2
      const top = clamp(top0, MARGIN, vh - panelH - MARGIN)
      aOffset = clamp(rect.top + rect.height / 2 - top - ARROW / 2, RADIUS, panelH - RADIUS - ARROW)
      next = {
        left,
        top,
        maxWidth: Math.min(openRight ? spaceRight : spaceLeft, vw - 2 * MARGIN),
        maxHeight: vh - 2 * MARGIN,
      }
    }

    setResolvedSide(rSide)
    setArrowOffset(aOffset)
    setPos(next)
    setEntered(true) // flips `.is-open` → the injected enter transition
  }, [isOpen, entered, placement, offset, pos])

  // ── focus-into on open (Dialog's getFocusable BODY; Menu's [isOpen, entered] WIRING — the two-commit trap) ──
  useLayoutEffect(() => {
    if (!isOpen || !entered) return
    const panel = panelRef.current
    if (!panel) return
    const f = getFocusable(panel)
    if (f.length > 0) f[0]?.focus()
    else panel.focus() // no focusable child → focus the panel (tabIndex=-1) so focus is never lost
  }, [isOpen, entered])

  // ── dismiss: outside pointerdown · capture-phase scroll (nested containers) · resize ──────────────────────
  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpenState(false)
    }
    const onScroll = () => setOpenState(false)
    const onResize = () => setOpenState(false)
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('scroll', onScroll, { capture: true })
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll, { capture: true })
      window.removeEventListener('resize', onResize)
    }
  }, [isOpen, setOpenState])

  // ── keyboard: Esc closes + returns focus to the trigger (NON-modal → no focus trap, unlike Dialog) ──
  const onPanelKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      closePopover(true)
    }
  }

  // ── focus-leaves-closes (Tab-away). React onBlur = focusout with relatedTarget. NOT trapped. ──
  const onPanelBlur = (e: ReactFocusEvent) => {
    const next = e.relatedTarget as Node | null
    if (next == null) return // focus left to browser chrome / non-focusable click / window-blur → pointerdown owns it
    if (panelRef.current?.contains(next) || triggerRef.current?.contains(next)) return // internal move / Esc-return
    setOpenState(false) // a real focusable outside panel+trigger (Tab-away) → close, no forced focus
  }

  // Compose the consumer's own ref (React 19 ref-as-prop) with the forwarded ref + our internal one.
  const setTriggerRef = useCallback(
    (node: HTMLElement | null) => {
      triggerRef.current = node
      assignRef(ref as Ref<HTMLElement> | undefined, node)
      assignRef(ownRef, node)
    },
    [ref, ownRef],
  )

  const wiredTrigger =
    triggerEl != null
      ? cloneElement(triggerEl, {
          ref: setTriggerRef,
          'aria-haspopup': 'dialog',
          'aria-expanded': isOpen,
          'aria-controls': isOpen ? panelId : undefined,
          onClick: composeHandlers(triggerProps.onClick, toggle),
          // NO onKeyDown: a dialog opener opens on click; a native <button> synthesizes click on Enter/Space (G1).
        })
      : trigger

  return (
    <>
      {wiredTrigger}

      {isOpen &&
        pos != null &&
        typeof document !== 'undefined' &&
        createPortal(
          // <Theme name="Popover"> re-establishes the sub-theme scope the portal detached from `body`.
          <Theme name="Popover">
            <PopoverPanel
              ref={panelRef}
              className={entered ? 'vida-popover-panel is-open' : 'vida-popover-panel'}
              role="dialog"
              id={panelId}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby}
              data-side={resolvedSide}
              tabIndex={-1}
              zIndex="$overlay"
              onKeyDown={onPanelKeyDown}
              onBlur={onPanelBlur}
              style={{
                left: pos.left,
                top: pos.top,
                maxWidth: pos.maxWidth,
                maxHeight: pos.maxHeight,
                // SINGLE transform-origin authority = inline, from the RESOLVED side; popover-styles.ts sets none.
                transformOrigin: originFor(resolvedSide),
              }}
            >
              <PopoverArrow aria-hidden className="vida-popover-arrow" style={arrowStyle(resolvedSide, arrowOffset)} />
              <PopoverScroll style={{ overflowY: 'auto', overflowX: 'hidden' }}>{children}</PopoverScroll>
            </PopoverPanel>
          </Theme>,
          document.body,
        )}
    </>
  )
})
