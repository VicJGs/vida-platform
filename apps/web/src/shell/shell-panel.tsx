// fe-shell (#14) · S3+S4 (LIF-226) — the macOS/iPadOS-inspector nav panel, in its two placement states:
//   • DOCKED (A, S3): pinned FLUSH at its edge with Content beside it — no scrim, no elevation (the calm grouped look),
//     a <nav>/<aside> landmark.
//   • FLOATING (B, S4): the SAME panel as an edge-anchored MODAL DRAWER — scrim + Level-3 elevation, role="dialog"
//     aria-modal, dismiss (Esc/click-scrim/re-toggle) + focus (capture→in→trap→restore), fail-safe-visible slide motion.
// Content-fit either way (sizes to `children`; vertical body on L/R, horizontal on T/B — EC-5). Two-row CONTAINED header
// (⠿ grip + title + ✕ · Dock|Float mode + 4-edge picker — EC-1/4). Presentational + state-as-prop (BR-2/R5): reads
// `placement`, EMITS intents (onSetMode/onSetEdge/onClose); the app wires the store + the inert background. One consumer ⇒
// lives here, not @vida/ui (ui-4 BR-1). Every value a DS token (EC-10). `[FACT: delivery/sessions/PLAN-s3/s4; seam-contract §B]`
import { useLayoutEffect, useRef, type KeyboardEvent as ReactKeyboardEvent, type ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { GripVertical, PanelBottom, PanelLeft, PanelRight, PanelTop, X, type LucideIcon } from 'lucide-react'
import { Button } from '@vida/ui'
import { panelAxis, type PanelEdge, type PanelId, type PanelMode, type PanelPlacement } from './regions'
import { ensureShellPanelStyles } from './shell-panel-styles'

// Semantic landmark per panel (DOCKED) — `render:'<tag>'` emits a real element (the app-shell `<header>`/`<main>`
// precedent; a runtime `tag` prop is NOT honoured). `modules` is navigation (<nav>); `system` is complementary (<aside>).
const PanelNav = styled(View, { render: 'nav' })
const PanelAside = styled(View, { render: 'aside' })

/** The stable DOM id the bar toggle's `aria-controls` points at — carried in BOTH modes so the toggle resolves. */
export function panelDomId(id: PanelId): string {
  return `shell-panel-${id}`
}

/** The border edge that FACES Content when docked (the only separator — docked has no elevation, EC-2). */
const BORDER_FACING: Record<PanelEdge, 'borderRightWidth' | 'borderLeftWidth' | 'borderBottomWidth' | 'borderTopWidth'> = {
  left: 'borderRightWidth',
  right: 'borderLeftWidth',
  top: 'borderBottomWidth',
  bottom: 'borderTopWidth',
}

/** FLOATING anchor per edge — absolute within the below-strip float layer (already below the reserved strip, EC-7). L/R
 *  = full-height strip (content-fit width); T/B = full-width strip (content-fit height). */
const EDGE_ANCHOR: Record<PanelEdge, { left?: number; right?: number; top?: number; bottom?: number }> = {
  left: { left: 0, top: 0, bottom: 0 },
  right: { right: 0, top: 0, bottom: 0 },
  top: { top: 0, left: 0, right: 0 },
  bottom: { bottom: 0, left: 0, right: 0 },
}

/** The four-edge picker metadata — lucide `Panel*` icons (the module-dock `PanelLeftClose/Open` family; N1). */
const EDGE_META: Record<PanelEdge, { Icon: LucideIcon; label: string }> = {
  left: { Icon: PanelLeft, label: 'Dock left' },
  right: { Icon: PanelRight, label: 'Dock right' },
  top: { Icon: PanelTop, label: 'Dock top' },
  bottom: { Icon: PanelBottom, label: 'Dock bottom' },
}

const EDGE_ORDER: readonly PanelEdge[] = ['left', 'top', 'right', 'bottom']

// Focus-trap helpers (mirror @vida/ui Dialog — apps/web can't import its internals; rule-of-three duplicate-once).
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE))
}

export interface ShellPanelProps {
  /** Which nav panel — drives the landmark (modules=nav, system=aside) + the DOM id. */
  id: PanelId
  /** The panel title (wordmark-adjacent). 'System' | 'Modules'. */
  title: ReactNode
  /** The panel's placement (mode/edge/open) from the store — state-as-prop (BR-2). */
  placement: PanelPlacement
  /** The panel BODY slot — #15 (system) / nav (modules) inject here; empty-but-functional placeholder in #14 (L4). */
  children: ReactNode
  /** Dock ⇄ Float — intent only (R5/IR-5). Both live from S4 (float render shipped). */
  onSetMode?: (m: PanelMode) => void
  /** Rearrange to an edge — intent only; live (onSetEdge→setPanelEdge, BR-S3-11). */
  onSetEdge?: (e: PanelEdge) => void
  /** ✕ / dismiss — intent only; docked returns focus to the bar toggle (N2, app-shell); floating captures+restores (N3). */
  onClose?: () => void
}

/**
 * The nav panel. `mode:'dock'` → inline flush at its edge (content beside, S3). `mode:'float'` → an edge-anchored modal
 * drawer (S4). app-shell renders this only for OPEN panels (docked via `foldDocked`; floating in the below-strip float
 * layer). The header + body `chrome` is shared across both modes.
 */
export function ShellPanel({ id, title, placement, children, onSetMode, onSetEdge, onClose }: ShellPanelProps) {
  const { mode, edge } = placement
  const titleStr = typeof title === 'string' ? title : id
  // The body axis (EC-5): L/R stack vertically (2–3 col), T/B lay out horizontally (1–4 row).
  const bodyDirection = panelAxis(edge) === 'vertical' ? 'column' : 'row'

  // Shared header + body — identical in both modes (the controls read `mode`/`edge`, emit intents).
  const chrome = (
    <>
      {/* Two-row CONTAINED header (EC-4/EC-7): a content-fit panel is always ≥ its header width, so row 2 never overflows
          into Content. Row 1 = identity + close; row 2 = placement controls. */}
      <View
        flexDirection="column"
        gap="$8"
        paddingVertical="$8"
        paddingHorizontal="$12"
        borderBottomWidth={1}
        borderColor="$colorBorderDefault"
      >
        {/* Row 1 — ⠿ grip (decorative, aria-hidden; signals repositionable, EC-12 feel — rearrange is the picker, N4) +
            title + ✕ close. */}
        <View flexDirection="row" alignItems="center" gap="$8">
          {/* Icon inherits currentColor from the token-set wrapper (the button.tsx:110 spinner pattern) — token-pure. */}
          <View aria-hidden="true" alignItems="center" justifyContent="center" color="$colorTextMuted">
            <GripVertical size={16} />
          </View>
          <Text flex={1} minWidth={0} fontFamily="$display" fontSize="$subheading" color="$colorTextPrimary" userSelect="none">
            {title}
          </Text>
          <Button intent="ghost" size="sm" aria-label={`Close ${titleStr} panel`} onPress={onClose} leading={<X size={16} />} />
        </View>

        {/* Row 2 — Dock | Float mode control + the four-edge picker. Active = intent 'secondary' (a fill/border, a
            non-colour signal per §VIII) + aria-pressed; inactive = ghost. Both mode buttons are live from S4. */}
        <View flexDirection="row" alignItems="center" gap="$8">
          <View role="group" aria-label="Panel mode" flexDirection="row" gap="$8">
            <Button intent={mode === 'dock' ? 'secondary' : 'ghost'} size="sm" aria-pressed={mode === 'dock'} onPress={() => onSetMode?.('dock')}>
              Dock
            </Button>
            <Button intent={mode === 'float' ? 'secondary' : 'ghost'} size="sm" aria-pressed={mode === 'float'} onPress={() => onSetMode?.('float')}>
              Float
            </Button>
          </View>

          <View flex={1} minWidth={0} />

          {/* gap $8 = the §X 8px minimum gap between adjacent touch targets (g2 a11y). */}
          <View role="group" aria-label="Panel edge" flexDirection="row" gap="$8">
            {EDGE_ORDER.map((e) => {
              const { Icon, label } = EDGE_META[e]
              return (
                <Button
                  key={e}
                  intent={edge === e ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-label={label}
                  aria-pressed={edge === e}
                  onPress={() => onSetEdge?.(e)}
                  leading={<Icon size={16} />}
                />
              )
            })}
          </View>
        </View>
      </View>

      {/* Body slot — content-fit (EC-5): the panel sizes to this. #14 = an empty-but-functional placeholder (L4). */}
      <View flexDirection={bodyDirection} gap="$8" padding="$12" data-region="panelBody">
        {children}
      </View>
    </>
  )

  // FLOATING (B, S4) — the modal drawer.
  if (mode === 'float') {
    return (
      <FloatShellPanel id={id} edge={edge} title={titleStr} onClose={onClose}>
        {chrome}
      </FloatShellPanel>
    )
  }

  // DOCKED (A, S3) — inline flush, content beside.
  const Frame = id === 'modules' ? PanelNav : PanelAside
  return (
    <Frame
      id={panelDomId(id)}
      aria-label={titleStr}
      data-panel={id}
      data-edge={edge}
      data-mode="dock"
      flexGrow={0}
      flexShrink={0}
      flexDirection="column"
      backgroundColor="$colorSurfacePrimary"
      {...{ [BORDER_FACING[edge]]: 1 }}
      borderColor="$colorBorderDefault"
    >
      {chrome}
    </Frame>
  )
}

/**
 * The FLOATING drawer frame (S4). Scrim (click-close) + an edge-anchored `role="dialog" aria-modal` panel inside the
 * below-strip float layer (NOT a <body> portal — the top strip stays a live sibling so re-toggle works, G1). Mirrors
 * Dialog's focus algorithm (capture `document.activeElement` → focus-in → Tab TRAP → guarded restore). The `inert`
 * background is app-shell's (it owns the content/docked wrapper). Motion = the fail-safe-visible injected keyframes.
 */
function FloatShellPanel({
  id,
  edge,
  title,
  onClose,
  children,
}: {
  id: PanelId
  edge: PanelEdge
  title: string
  onClose?: () => void
  children: ReactNode
}) {
  ensureShellPanelStyles()
  const panelRef = useRef<HTMLElement | null>(null)

  // Focus moves INTO the panel on open (first focusable, §XIV). Focus-RETURN on dismiss is app-shell's onClose →
  // the bar toggle (reliable for EVERY open path, incl. the in-panel Dock→Float switch where capturing
  // document.activeElement would grab <body> — the unmounted docked frame; g2 S4 #1). So no capture/restore here.
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (panel) {
      const f = getFocusable(panel)
      ;(f[0] ?? panel).focus()
    }
  }, [])

  // Esc closes; Tab cycles WITHIN the panel (the focus trap, §XIV). Mirrors Dialog's algorithm.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      onClose?.()
      return
    }
    if (e.key !== 'Tab') return
    const panel = panelRef.current
    if (!panel) return
    const f = getFocusable(panel)
    if (f.length === 0) {
      e.preventDefault()
      return
    }
    const first = f[0]! // safe: guarded by the `f.length === 0` early-return above (§XV)
    const last = f[f.length - 1]! // safe: same guard — f is non-empty here (§XV)
    const active = typeof document !== 'undefined' ? document.activeElement : null
    if (!e.shiftKey && (active === last || active === panel || !panel.contains(active))) {
      e.preventDefault()
      first.focus()
    } else if (e.shiftKey && (active === first || active === panel || !panel.contains(active))) {
      e.preventDefault()
      last.focus()
    }
  }

  return (
    <>
      {/* Scrim — covers the below-strip region (content + any docked panels), NOT the top strip (G1). Click → close. */}
      <View
        className="vida-shell-scrim"
        aria-hidden="true"
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        backgroundColor="$colorSurfaceInverse"
        onPress={onClose}
      />
      {/* The modal drawer — role="dialog" aria-modal (B4), edge-anchored, content-fit, Level-3 elevation (the injected
          `.vida-shell-panel` box-shadow; dark self-cancels → the border carries it). Painted ABOVE the scrim (DOM order). */}
      <View
        ref={(el) => {
          panelRef.current = (el as unknown as HTMLElement | null) ?? null
        }}
        id={panelDomId(id)}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-panel={id}
        data-edge={edge}
        data-mode="float"
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className={`vida-shell-panel vida-shell-panel-${edge}`}
        position="absolute"
        {...EDGE_ANCHOR[edge]}
        flexDirection="column"
        backgroundColor="$colorSurfacePrimary"
        borderWidth={1}
        borderColor="$colorBorderDefault"
      >
        {children}
      </View>
    </>
  )
}

export default ShellPanel
