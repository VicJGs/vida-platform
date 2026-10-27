// UI-4 · S2 (LIF-89) — the mobile nav drawer's focus/dismiss behavior (S2-BR-f). The drawer is an off-canvas overlay
// (app-shell owns its container + slide transform + scrim); this hook owns the a11y contract from
// state-conventions/keyboard.ts: FOCUS_CONTRACT.overlayOpen (focus the first focusable inside) + overlayClose (return
// focus to the trigger) + OVERLAY_DISMISS.escape.
//
// Focus-restore uses the captured pre-open `document.activeElement` (the hamburger that opened it) — the UI-1 Dialog
// model — so the hook needn't thread the trigger's ref across GlobalBar. Effects gate on `open` (the U7/U8
// mount-gated-focus lesson: a portalled/toggled surface commits before its focus target is reachable).
import { useEffect, useRef } from 'react'
import { OVERLAY_DISMISS } from '../state-conventions/keyboard'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Wires the mobile nav drawer's focus + Escape behavior. Returns a ref to attach to the drawer container.
 * @param open   the drawer open flag (`isMobileNavOpen`)
 * @param onClose called on Escape (app-shell closes the drawer)
 */
export function useNavDrawer(
  open: boolean,
  onClose: () => void,
): {
  drawerRef: React.RefObject<HTMLElement | null>
} {
  const drawerRef = useRef<HTMLElement | null>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  // `inert` while closed (B3): the off-canvas drawer is translated off-screen, NOT unmounted, so its links would stay
  // Tab-focusable — `inert` removes the whole subtree from the tab order + a11y tree. Set imperatively (the DOM
  // property) so it clears BEFORE focus-into. Focus into on open (capturing the pre-open focus for restore); restore
  // on close. On initial mount (open=false) restoreRef is null → no focus move.
  useEffect(() => {
    const el = drawerRef.current
    if (el != null) el.inert = !open
    if (open) {
      restoreRef.current = document.activeElement as HTMLElement | null
      const first = el?.querySelector<HTMLElement>(FOCUSABLE) ?? el
      first?.focus?.()
    } else if (restoreRef.current != null) {
      restoreRef.current.focus?.()
      restoreRef.current = null
    }
  }, [open])

  // Escape closes (OVERLAY_DISMISS.escape) — document-level while open.
  useEffect(() => {
    if (!open || !OVERLAY_DISMISS.escape) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  return { drawerRef }
}
