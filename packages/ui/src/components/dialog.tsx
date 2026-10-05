import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { createPortal } from 'react-dom'
import { styled, Text, Theme, View } from '@tamagui/core'
import { ensureDialogStyles } from '../internal/dialog-styles'

// UI-1 · Dialog (primitive 8/10, overlay/organism tier 1st of 3) — implements ds-5-primitive-contracts/dialog.md
// against Tamagui v2. Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u8-dialog.md.
// - The first MODAL primitive: a scrim + centered panel PORTALLED to a dedicated body-child <div>, blocking the app.
//   Unlike Select/Menu (floating-but-non-modal): a real focus TRAP (Tab cycles WITHIN the panel), the background is
//   `inert`/`aria-hidden`, and focus RETURNS to whatever was focused before open (§XIV; captured document.activeElement,
//   NOT a trigger ref — Dialog is fully controlled, it owns no trigger).
// - name:'Dialog' scopes the light_/dark_Dialog sub-theme ($background/$radius); the scrim reaches the base semantic
//   $colorSurfaceInverse (no scrim component token — dialog.md:34 flags it, DEF-U8-c). Re-wrapped in <Theme name="Dialog">
//   because the portal detaches the name scope (the Menu/Select precedent; base light/dark still crosses via <html>).
// - Motion (B12): a mount-triggered @keyframes ENTER (scrim opacity, panel opacity+scale/lift), resting base VISIBLE so a
//   missed animation fails safe (internal/dialog-styles.ts). Reduced-motion → instant.
// - Portal root is created in a LAZY useState initializer so it exists during the FIRST render → the panel renders in the
//   first commit → focus/query find it immediately (an effect-created root would be null first render → 2nd-commit panel
//   → the [[portal-open-focus-needs-a-mount-gated-effect-dep]] trap). Only append/remove happen in an effect.

type Size = 'sm' | 'md' | 'lg'

export interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** REQUIRED — the accessible name (aria-labelledby). */
  title: ReactNode
  /** aria-describedby. */
  description?: ReactNode
  /** Slot for actions (rendered as a `<footer>`). */
  footer?: ReactNode
  /** Panel width. Default 'md'. */
  size?: Size
  /** Esc + backdrop click close. Default true; set false for destructive-confirm dialogs. */
  dismissible?: boolean
  children: ReactNode
}

// A single focusable element inside the panel. `:not([tabindex="-1"])` excludes the panel itself (tabIndex=-1).
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function getFocusable(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE))
}

// ── styled parts (name:'Dialog' keeps them in the sub-theme scope under the portal's <Theme>) ────────────
// Full-viewport dimming layer. opacity/animation live in the injected .vida-dialog-scrim (B12).
const DialogScrim = styled(View, {
  name: 'Dialog',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '$colorSurfaceInverse',
})

// Full-viewport flex-centering container ABOVE the scrim; catches backdrop pointerdown (transparent, pointer-active).
const DialogPositioner = styled(View, {
  name: 'Dialog',
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '$16', // viewport margin so the panel never touches the edges
})

const DialogPanel = styled(View, {
  name: 'Dialog',
  position: 'relative',
  width: '100%',
  maxHeight: '100%',
  flexDirection: 'column',
  gap: '$16',
  padding: '$24',
  backgroundColor: '$colorSurfacePrimary',
  // radius.card (lg) via the token scale — the sub-theme `radius` key is inert for dimension props (see CLAUDE.md).
  borderRadius: '$lg',
  variants: {
    // No dialog-size token exists (DEF-U8-e) — provisional maxWidths (brand-pass value review). width:100% shrinks below.
    size: {
      sm: { maxWidth: 400 },
      md: { maxWidth: 512 },
      lg: { maxWidth: 720 },
    },
  } as const,
  defaultVariants: { size: 'md' },
})

// Title = a real <h2> (render:'h2') carrying the generated id so aria-labelledby resolves for ANY ReactNode title.
const DialogTitle = styled(Text, {
  name: 'Dialog',
  render: 'h2',
  fontFamily: '$display',
  fontSize: '$heading',
  fontWeight: '$semibold',
  color: '$colorTextPrimary',
  margin: 0,
})

const DialogDescription = styled(Text, {
  name: 'Dialog',
  render: 'p',
  fontFamily: '$body',
  fontSize: '$small',
  color: '$colorTextMuted',
  margin: 0,
})

const DialogHeader = styled(View, { name: 'Dialog', gap: '$8' })

const DialogFooter = styled(View, {
  name: 'Dialog',
  render: 'footer',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: '$8',
})

// ── ref helper (module-level, pure) ─────────────────────────────────────────────────────────────────────
function assignRef<T>(ref: Ref<T> | undefined, node: T | null): void {
  if (!ref) return
  if (typeof ref === 'function') ref(node)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MutableRefObject.current is readonly in the Ref type; assignment is the documented ref-callback contract
  else (ref as { current: T | null }).current = node
}

export const Dialog = forwardRef<HTMLDivElement, DialogProps>(function Dialog(
  { open, onOpenChange, title, description, footer, size = 'md', dismissible = true, children },
  ref,
) {
  ensureDialogStyles()

  const uid = useId()
  const titleId = `${uid}-title`
  const descId = `${uid}-desc`

  const panelRef = useRef<HTMLDivElement | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)

  // Portal root — created DURING first render (lazy init) so createPortal has a target in the first commit.
  const [portalRoot] = useState<HTMLDivElement | null>(() =>
    typeof document !== 'undefined' ? document.createElement('div') : null,
  )

  if (process.env.NODE_ENV !== 'production') {
    if (title == null || title === '') {
      // eslint-disable-next-line no-console
      console.warn('[vida/ui] Dialog: `title` is required — it is the dialog’s accessible name (aria-labelledby).')
    }
  }

  // ── attach the portal root to <body> (append/remove ONLY — creation is the lazy init above). Runs before the focus
  //    effect (declaration order) so the panel is in the document when focus queries it. ──
  useLayoutEffect(() => {
    if (!portalRoot || typeof document === 'undefined') return
    portalRoot.setAttribute('data-vida-dialog-root', '')
    document.body.appendChild(portalRoot)
    return () => {
      portalRoot.remove()
    }
  }, [portalRoot])

  // ── focus: capture the previously-focused element BEFORE moving focus in; on close, restore it (guarded) ──
  useLayoutEffect(() => {
    if (!open) return
    prevFocusRef.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    if (!panel) return
    const focusables = getFocusable(panel)
    if (focusables.length > 0) focusables[0]?.focus()
    else panel.focus() // no focusable child → focus the panel itself (tabIndex=-1) so focus is never lost

    if (process.env.NODE_ENV !== 'production' && dismissible === false && focusables.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] Dialog: a non-dismissible dialog has no focusable action — Esc is disabled, so a keyboard user is trapped. Add a Cancel/Confirm action to `footer`/`children` (DEF-U8-f).',
      )
    }

    return () => {
      const prev = prevFocusRef.current
      if (prev && document.contains(prev) && typeof prev.focus === 'function') prev.focus()
      else document.body?.focus?.() // fallback: the trigger unmounted while open — don't throw, don't strand focus
    }
  }, [open, dismissible])

  // ── background inert: mark every body sibling (NOT the dialog's own portal root, excluded by identity) inert +
  //    aria-hidden while open; restore prior values on close. `inert` set via attribute (framework-typing-agnostic). ──
  useEffect(() => {
    if (!open || !portalRoot || typeof document === 'undefined') return
    const siblings = Array.from(document.body.children).filter((c) => c !== portalRoot) as HTMLElement[]
    const prev = siblings.map((el) => ({
      el,
      ariaHidden: el.getAttribute('aria-hidden'),
      hadInert: el.hasAttribute('inert'),
    }))
    siblings.forEach((el) => {
      el.setAttribute('aria-hidden', 'true')
      el.setAttribute('inert', '')
    })
    return () => {
      prev.forEach(({ el, ariaHidden, hadInert }) => {
        if (ariaHidden === null) el.removeAttribute('aria-hidden')
        else el.setAttribute('aria-hidden', ariaHidden)
        if (!hadInert) el.removeAttribute('inert')
      })
    }
  }, [open, portalRoot])

  // ── keyboard: Esc (when dismissible) + the focus TRAP (Tab/Shift+Tab cycle within the panel, §XIV) ──
  const onPanelKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      if (dismissible) {
        e.stopPropagation()
        onOpenChange(false)
      }
      return
    }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const f = getFocusable(panel)
    if (f.length === 0) {
      e.preventDefault() // nothing to move to — swallow Tab, focus stays on the panel
      return
    }
    const first = f[0]! // safe: guarded by the `f.length === 0` early-return above
    const last = f[f.length - 1]! // safe: same guard — f is non-empty here
    if (f.length === 1) {
      e.preventDefault() // one element — keep focus on it, never let Tab escape
      first.focus()
      return
    }
    const active = document.activeElement
    if (!e.shiftKey) {
      if (active === last || active === panel || !panel.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    } else {
      if (active === first || active === panel || !panel.contains(active)) {
        e.preventDefault()
        last.focus()
      }
    }
  }

  // ── backdrop dismiss (pointerdown outside the panel, when dismissible — the Menu outside-dismiss precedent) ──
  const onBackdropPointerDown = (e: ReactPointerEvent) => {
    if (!dismissible) return
    if (panelRef.current?.contains(e.target as Node)) return
    onOpenChange(false)
  }

  const setPanelRef = useCallback(
    (node: HTMLDivElement | null) => {
      panelRef.current = node
      assignRef(ref, node)
    },
    [ref],
  )

  if (!open || portalRoot == null) return null

  return createPortal(
    // <Theme name="Dialog"> re-establishes the sub-theme scope the portal detached from `body`.
    <Theme name="Dialog">
      <DialogScrim className="vida-dialog-scrim" aria-hidden zIndex="$overlay" />
      <DialogPositioner zIndex="$modal" onPointerDown={onBackdropPointerDown}>
        <DialogPanel
          ref={setPanelRef}
          className="vida-dialog-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description != null ? descId : undefined}
          tabIndex={-1}
          size={size}
          onKeyDown={onPanelKeyDown}
        >
          <DialogHeader>
            <DialogTitle id={titleId}>{title}</DialogTitle>
            {description != null && <DialogDescription id={descId}>{description}</DialogDescription>}
          </DialogHeader>

          {/* Body sizes to content (flexBasis auto), shrinks + scrolls ONLY when the panel hits maxHeight (flexShrink 1
              + minHeight 0). NOT flex={1} (grow:1/basis:0%) — that collapses to 0 height in a content-height panel and
              clips the children (Visual-Gate catch). Header/footer keep RN's default flexShrink:0. */}
          <View flexShrink={1} minHeight={0} style={{ overflowY: 'auto' }}>
            {children}
          </View>

          {footer != null && <DialogFooter>{footer}</DialogFooter>}
        </DialogPanel>
      </DialogPositioner>
    </Theme>,
    portalRoot,
  )
})
