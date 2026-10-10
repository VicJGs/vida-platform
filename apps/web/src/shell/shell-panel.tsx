// fe-shell (#14) · S3 (LIF-226) — the DOCKED nav panel (A), the macOS/iPadOS-inspector docked state (envision M2/EC-2).
// A docked panel is pinned FLUSH at its edge with Content beside it — no scrim, no elevation (the calm grouped look).
// It is content-fit (sizes to `children`; vertical body on L/R, horizontal on T/B — EC-5), and carries a two-row
// CONTAINED header (⠿ grip + title + ✕ · ▣ Dock|⧉ Float mode + ◧⬒◨⬓ four-edge picker — EC-1/4, no overflow).
// Presentational + state-as-prop (BR-2/R5): it reads `placement` and EMITS intents (onSetMode/onSetEdge/onClose); the
// app wires the store. One consumer ⇒ it lives here, NOT @vida/ui (ui-4 BR-1). Every value is a DS token (EC-10).
// The FLOATING render (overlay + scrim + dismiss/focus) is S4; app-shell mounts only docked+open panels in S3.
// `[FACT: delivery/sessions/PLAN-s3-docked-panel.md; seam-contract.md §B; envision.md EC-1/2/4/5]`
import { type ReactNode } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { GripVertical, PanelBottom, PanelLeft, PanelRight, PanelTop, X, type LucideIcon } from 'lucide-react'
import { Button } from '@vida/ui'
import { panelAxis, type PanelEdge, type PanelId, type PanelMode, type PanelPlacement } from './regions'

// Semantic landmark per panel — `render:'<tag>'` emits a real element (the app-shell `<header>`/`<main>` precedent; a
// runtime `tag` prop is NOT honoured). `modules` is navigation (<nav>); `system` is complementary chrome (<aside>).
const PanelNav = styled(View, { render: 'nav' })
const PanelAside = styled(View, { render: 'aside' })

/** The stable DOM id the bar toggle's `aria-controls` points at (app-shell), and the panel frame carries. */
export function panelDomId(id: PanelId): string {
  return `shell-panel-${id}`
}

/** The border edge that FACES Content (the only separator — docked has no elevation, EC-2). */
const BORDER_FACING: Record<PanelEdge, 'borderRightWidth' | 'borderLeftWidth' | 'borderBottomWidth' | 'borderTopWidth'> = {
  left: 'borderRightWidth',
  right: 'borderLeftWidth',
  top: 'borderBottomWidth',
  bottom: 'borderTopWidth',
}

/** The four-edge picker metadata — lucide `Panel*` icons (the module-dock `PanelLeftClose/Open` family; N1). */
const EDGE_META: Record<PanelEdge, { Icon: LucideIcon; label: string }> = {
  left: { Icon: PanelLeft, label: 'Dock left' },
  right: { Icon: PanelRight, label: 'Dock right' },
  top: { Icon: PanelTop, label: 'Dock top' },
  bottom: { Icon: PanelBottom, label: 'Dock bottom' },
}

const EDGE_ORDER: readonly PanelEdge[] = ['left', 'top', 'right', 'bottom']

export interface ShellPanelProps {
  /** Which nav panel — drives the landmark (modules=nav, system=aside) + the DOM id. */
  id: PanelId
  /** The panel title (wordmark-adjacent). 'System' | 'Modules'. */
  title: ReactNode
  /** The panel's placement (mode/edge/open) from the store — state-as-prop (BR-2). */
  placement: PanelPlacement
  /** The panel BODY slot — #15 (system) / nav (modules) inject here; empty-but-functional placeholder in #14 (L4). */
  children: ReactNode
  /** Dock ⇄ Float — intent only (R5/IR-5). app-shell always supplies it so the control is present (EC-1). */
  onSetMode?: (m: PanelMode) => void
  /** Rearrange to an edge — intent only; live in S3 (onSetEdge→setPanelEdge, BR-S3-11). */
  onSetEdge?: (e: PanelEdge) => void
  /** ✕ / toggle-off — intent only; app-shell returns focus to the bar toggle (N2). */
  onClose?: () => void
}

/**
 * The DOCKED nav panel (mode 'dock'). Inline flush at its edge, content-fit, two-row contained header + body slot.
 * Floating (mode 'float') is S4 — app-shell renders this only for docked+open panels, so a non-'dock' placement never
 * reaches here in S3. `flexGrow/flexShrink: 0` keeps it content-fit; app-shell's container owns the cross-axis stretch
 * + the RNW flex-collapse guard (BR-S3-9).
 */
export function ShellPanel({ id, title, placement, children, onSetMode, onSetEdge, onClose }: ShellPanelProps) {
  const { mode, edge } = placement
  const Frame = id === 'modules' ? PanelNav : PanelAside
  // The body axis (EC-5): L/R stack vertically (2–3 col), T/B lay out horizontally (1–4 row).
  const bodyDirection = panelAxis(edge) === 'vertical' ? 'column' : 'row'

  return (
    <Frame
      id={panelDomId(id)}
      aria-label={typeof title === 'string' ? title : id}
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
      {/* Two-row CONTAINED header (EC-4/EC-7): a content-fit panel is always ≥ its header width, so row 2 never
          overflows into Content. Row 1 = identity + close; row 2 = placement controls. */}
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
          <Button
            intent="ghost"
            size="sm"
            aria-label={`Close ${typeof title === 'string' ? title : id} panel`}
            onPress={onClose}
            leading={<X size={16} />}
          />
        </View>

        {/* Row 2 — ▣ Dock | ⧉ Float mode control + the ◧⬒◨⬓ four-edge picker. Active = intent 'secondary' (a fill/border,
            a non-colour signal per §VIII) + aria-pressed; inactive = ghost. */}
        <View flexDirection="row" alignItems="center" gap="$8">
          <View role="group" aria-label="Panel mode" flexDirection="row" gap="$8">
            <Button
              intent={mode === 'dock' ? 'secondary' : 'ghost'}
              size="sm"
              aria-pressed={mode === 'dock'}
              onPress={() => onSetMode?.('dock')}
            >
              Dock
            </Button>
            {/* Float is DISABLED in S3 — the overlay render (scrim/elevation/dismiss/focus) is S4. Showing it
                (disabled) keeps the ▣/⧉ dock⇄float control visible (EC-1) WITHOUT a reachable float dead-end or a
                dishonest `aria-expanded` on a vanished panel (g2 S3, findings 1+2). S4 removes `disabled`. */}
            <Button
              intent={mode === 'float' ? 'secondary' : 'ghost'}
              size="sm"
              disabled
              aria-pressed={mode === 'float'}
              onPress={() => onSetMode?.('float')}
            >
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
    </Frame>
  )
}

export default ShellPanel
