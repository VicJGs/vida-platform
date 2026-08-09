import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type CSSProperties,
  type FocusEvent as ReactFocusEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { styled, Text, Theme, View } from '@tamagui/core'
import { Button } from './button'
import { ensureToastStyles } from '../internal/toast-styles'
import {
  dismissToast,
  getServerSnapshot,
  getSnapshot,
  setToastLimit,
  subscribe,
  type ToastIntent,
  type ToastRecord,
} from '../internal/toast-store'

// UI-1 · Toast (primitive 10/10, overlay 3rd of 3) — implements ds-5-primitive-contracts/toast.md against Tamagui
// v2. Reconcile: docs/specs/components/ui-1-vida-ui-primitives/u10-toast.md.
// - The ONLY imperative primitive: consumers call `toast(options)` (re-exported from ./index) — the store
//   (internal/toast-store.ts) bridges that non-React call to THIS mounted region via useSyncExternalStore.
// - ToastProvider is mounted ONCE near the app root. It portals to <body> under <Theme name="Toast"> and renders
//   TWO persistently-mounted live regions (role=status/polite for info+success, role=alert/assertive for danger)
//   — both present even when empty, because a live region must PRE-EXIST for a screen reader to announce an
//   inserted child (§XIV). Focus is NEVER moved to a toast on appear; F6 opts into the region; Esc dismisses the
//   focused toast (item-local, stopPropagation — so it can't leak to an overlay behind the toast).
// - Cap is STORE-enforced (per-region, evict-oldest); the provider renders EVERY record (no slice) so an evicted
//   toast plays its exit animation. Motion (B12): enter moderate/out, exit fast/in, opacity+translateY only.

export { toast } from '../internal/toast-store'
export type { ToastIntent, ToastOptions, ToastHandle } from '../internal/toast-store'

export interface ToastProviderProps {
  /** Max simultaneously VISIBLE toasts PER region; on overflow the oldest is evicted. Default 3. */
  limit?: number
  /** Stack corner. Default 'bottom'. (No position in ToastOptions — the region owns placement.) */
  placement?: 'top' | 'bottom'
}

// A single focusable element inside a toast — for the F6 region shortcut (reused from Dialog/Popover).
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

function getFocusable(node: HTMLElement): HTMLElement[] {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))
}

// info → brand.primary · success → signal.success · danger → signal.danger (the light_/dark_Toast sub-theme keys).
const ACCENT: Record<ToastIntent, string> = {
  info: '$accentInfo',
  success: '$accentSuccess',
  danger: '$accentDanger',
}

// Module-level mounted count — the single-provider invariant (F1): two providers would each subscribe to the
// singleton store and render every toast twice.
let mountedCount = 0

// ── styled parts (name:'Toast' keeps them in the sub-theme scope under the portal's <Theme>) ────────────────
// The fixed geometry strip. pointer-events:none so its empty margins never eat background clicks; each toast
// re-enables auto. left:0/right:0 + alignItems:center centers the stack horizontally without a transform.
const ToastViewport = styled(View, {
  name: 'Toast',
  position: 'fixed',
  left: 0,
  right: 0,
  zIndex: '$toast',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '$8',
  pointerEvents: 'none',
})

// A live-region wrapper (role/aria-live set per instance). Also pointer-events:none (an empty stretched region
// div must not eat clicks, m1); items are auto.
const ToastRegion = styled(View, {
  name: 'Toast',
  width: '100%',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '$8',
  pointerEvents: 'none',
})

// One toast surface. borderRadius:'$lg' via the TOKEN SCALE (the sub-theme `radius` key is inert for dimension
// props, DEF-U8-h); overflow:hidden clips the accent bar to the corner. No toast.border token → the base
// $colorBorderDefault semantic (resolves under any sub-theme). pointer-events:auto re-enables interaction.
const ToastPanel = styled(View, {
  name: 'Toast',
  position: 'relative',
  flexDirection: 'row',
  alignItems: 'flex-start',
  gap: '$12',
  minWidth: 320,
  maxWidth: 360,
  paddingVertical: '$12',
  paddingHorizontal: '$16',
  backgroundColor: '$background',
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  borderRadius: '$lg',
  overflow: 'hidden',
  pointerEvents: 'auto',
})

// The left accent bar (DEF-U10-c: fixed 3px inline, no accent-width token). Absolutely positioned + clipped by the
// panel's overflow:hidden to the rounded corner — NOT borderLeftWidth (which would fight the 1px border + radius).
const ToastAccent = styled(View, {
  name: 'Toast',
  position: 'absolute',
  left: 0,
  top: 0,
  bottom: 0,
  width: 3,
})

// ── ToastItem — one toast: accent, text, optional action, dismiss; pausable timer; item-local Esc ────────────
function ToastItem({
  record,
  placement,
  nodeRef,
}: {
  record: ToastRecord
  placement: 'top' | 'bottom'
  nodeRef?: (node: HTMLElement | null) => void
}) {
  const { id, title, description, intent = 'info', duration, action, phase } = record

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const remainingRef = useRef<number>(duration ?? 5000)
  const startedRef = useRef<number | null>(null)

  const clear = () => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }
  const arm = useCallback((ms: number) => {
    startedRef.current = Date.now()
    timerRef.current = setTimeout(() => dismissToast(id), ms)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- id is stable for a given toast (arm is called from the [id,duration] effect + handlers)
  }, [])

  // ⚠ Arming effect deps = [id, duration] ONLY (u10 §3.4 / gate-2 B1). A ToastItem re-renders on EVERY store
  // emit() (any add/dismiss anywhere → useSyncExternalStore → provider re-render → all items re-render); depping
  // on `record` would re-arm the timer on unrelated sibling emits and a busy screen's toasts would NEVER dismiss.
  // Pause/resume mutate the refs imperatively in the handlers below — never by re-running this effect.
  useEffect(() => {
    if (duration === 0) return // sticky
    remainingRef.current = duration ?? 5000
    arm(remainingRef.current)
    return clear
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally [id, duration] only (see comment); refs are stable
  }, [id, duration, arm])

  const pause = () => {
    if (duration === 0 || timerRef.current == null) return
    clear()
    if (startedRef.current != null) remainingRef.current -= Date.now() - startedRef.current
  }
  const resume = () => {
    if (duration === 0 || timerRef.current != null) return
    if (remainingRef.current <= 0) {
      dismissToast(id)
      return
    }
    arm(remainingRef.current)
  }
  // Resume only when focus actually LEAVES the toast (relatedTarget outside) — not on internal control-to-control moves.
  const onBlur = (e: ReactFocusEvent<HTMLElement>) => {
    const next = e.relatedTarget as Node | null
    if (next != null && e.currentTarget.contains(next)) return
    resume()
  }
  // Esc dismisses THIS toast; stopPropagation so it can't leak to a Dialog/Popover behind the toast (u10 §3.3/B2).
  const onKeyDown = (e: ReactKeyboardEvent<HTMLElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      dismissToast(id)
    }
  }

  // Slide direction per placement: bottom → from +16px (slides up into place), top → from −16px.
  const fromVar = placement === 'bottom' ? '16px' : '-16px'

  return (
    <ToastPanel
      ref={nodeRef}
      className="vida-toast"
      data-phase={phase}
      tabIndex={-1}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocus={pause}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      style={{ ['--vida-toast-from' as keyof CSSProperties]: fromVar } as CSSProperties}
    >
      <ToastAccent aria-hidden backgroundColor={ACCENT[intent]} />

      <View flexGrow={1} flexShrink={1} minWidth={0} gap="$4">
        <Text fontFamily="$body" fontSize="$small" fontWeight="600" color="$text">
          {title}
        </Text>
        {description != null && (
          <Text fontFamily="$body" fontSize="$caption" color="$colorTextMuted">
            {description}
          </Text>
        )}
      </View>

      {action != null && (
        <Button intent="ghost" size="sm" onPress={action.onPress}>
          {action.label}
        </Button>
      )}

      <Button intent="ghost" size="sm" aria-label="Dismiss" onPress={() => dismissToast(id)}>
        ✕
      </Button>
    </ToastPanel>
  )
}

// ── ToastProvider — the mounted region (subscribes to the store, renders every record) ───────────────────────
export function ToastProvider({ limit = 3, placement = 'bottom' }: ToastProviderProps) {
  ensureToastStyles()
  const records = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const newestNodeRef = useRef<HTMLElement | null>(null)

  // Register the per-region cap, log() it (perf budget), and enforce the single-provider invariant (F1).
  useEffect(() => {
    setToastLimit(limit)
    // eslint-disable-next-line no-console -- log() the visible cap per the performance budget (toast.md:52)
    console.info(`[vida/ui] Toast: max ${limit} visible per region.`)
    mountedCount += 1
    if (process.env.NODE_ENV !== 'production' && mountedCount > 1) {
      // eslint-disable-next-line no-console
      console.warn(
        '[vida/ui] ToastProvider: more than one instance is mounted — the store is a singleton, so every toast would render in each. Mount exactly one.',
      )
    }
    return () => {
      mountedCount -= 1
    }
  }, [limit])

  // F6 → focus into the GLOBALLY newest visible toast across BOTH regions (gate-2 M1) — one ref (§3.2/F3).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F6') return
      const node = newestNodeRef.current
      if (node == null) return
      e.preventDefault()
      const f = getFocusable(node)
      if (f.length > 0) f[0]?.focus()
      else node.focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  if (typeof document === 'undefined') return null

  // Partition by intent → region. The globally newest non-exiting record (max id = last appended) gets the F6 ref.
  const assertive = records.filter((r) => r.intent === 'danger')
  const polite = records.filter((r) => r.intent !== 'danger')
  const newestId = [...records].reverse().find((r) => r.phase !== 'exiting')?.id

  const positionStyle: CSSProperties = placement === 'bottom' ? { bottom: 16 } : { top: 16 }

  const renderItem = (r: ToastRecord) => (
    <ToastItem
      key={r.id}
      record={r}
      placement={placement}
      nodeRef={r.id === newestId ? (node) => (newestNodeRef.current = node) : undefined}
    />
  )

  return createPortal(
    // <Theme name="Toast"> re-establishes the sub-theme scope the body portal detached ($background/$text/$accent*).
    <Theme name="Toast">
      <ToastViewport style={positionStyle}>
        {/* Assertive first (danger surfaces above info). Both regions are ALWAYS mounted (even empty) so a screen
            reader announces an inserted toast (§XIV live regions). aria-atomic=false → the inserted subtree is the
            changed node, announced in full (F6-fold). */}
        <ToastRegion role="alert" aria-live="assertive" aria-atomic="false">
          {assertive.map(renderItem)}
        </ToastRegion>
        <ToastRegion role="status" aria-live="polite" aria-atomic="false">
          {polite.map(renderItem)}
        </ToastRegion>
      </ToastViewport>
    </Theme>,
    document.body,
  )
}
