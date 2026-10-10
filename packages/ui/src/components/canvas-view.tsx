import { useId, type ReactNode, type Ref } from 'react'
import { styled, Text, View } from '@tamagui/core'
import { warnMissingName, type ViewState } from '../internal/data-view'

// ============================================================================
// CanvasView — the CODEC Canvas shell (fe-codec-canvas-board S1).
// The immersive archetype (decomposition.md:32 §1.2): a read-only, editorial
// frame that hosts exactly ONE view-mode renderer at canvas scale. The two
// worked examples (Vision-board = GalleryView over dreams · Calendar-grid =
// month CalendarView) are consumer compositions (apps/web, S2); #19 later drops
// its multi-range renderer into the same frame (R3). A FRAME, not a renderer —
// it owns the masthead + the body region; `children` is the hosted renderer.
// Presentational, state-as-prop (BR-2); @vida/ui is Tamagui-only, so CanvasState
// is a LOCAL alias of the intra-package ViewState canon (no @vida/core/@vida/types).
// Spec: docs/specs/foundation/fe-codec-canvas-board/s1-canvas-view.md.
//
// NON-GENERIC: holds no renderer data (the hosted renderer owns it) → no <T> →
// React-19 ref-as-prop (no forwardRef).
//
// STATE RULE (BR-CB-S1-6, the pinned seam divergence): the frame does NOT
// re-implement the renderer's states — it only SELECTS an optional override slot
// by `state`, else delegates to `children`:
//   state==='empty' && empty → empty · state==='error' && error → error · else → children
// So loading/success/un-overridden empty+error fall through to `children`, and the
// hosted renderer shows its OWN tuned state (calendar's designed grid, etc.). The
// consumer still threads the same `state` to the child renderer. (Divergence from
// the dashboard shell, which OWNED generic states because its blocks are success-only.)
// READ-ONLY: the frame renders no write affordance; `actions` is a caller slot (R1).
// ============================================================================

/** The canvas terminal state — a LOCAL alias of the intra-package ViewState canon (R6; no @vida/core/@vida/types). */
export type CanvasState = ViewState

export interface CanvasViewProps {
  /** Archetype label (e.g. "Vision board" | "Calendar"). Uppercased via CSS — the DOM keeps the word for SR. */
  eyebrow?: string
  /** REQUIRED. The user-named surface (saved-view / Space name) — NEVER the month, never hard-coded (EC-5/A). Serif H1. */
  title: string
  /** Quiet $small muted subline under the title (e.g. "Today · Mon 10 Aug"). Text-like. */
  meta?: ReactNode
  /** Board-level progress SLOT — consumer-filled (e.g. a realized meter). The frame owns the slot, not its content (EC-3). */
  progress?: ReactNode
  /** Read-only action SLOT (top-right). Month nav etc. NO write affordances (EC-6/R1). */
  actions?: ReactNode
  /** Resolved state (app derives + passes — R4). Default 'success'. Selects an override slot ONLY (BR-CB-S1-6);
   *  the consumer still threads the same state to the child renderer. */
  state?: CanvasState
  /** Teaching-empty override — shown when state==='empty' AND provided (vision-board); else `children` render (EC-4). */
  empty?: ReactNode
  /** Calm error override — shown when state==='error' AND provided; else `children` render. */
  error?: ReactNode
  /** The hosted renderer (GalleryView | CalendarView | a #19 range renderer). Renderer-agnostic so #19 drops in (R3). */
  children: ReactNode
  /** Accessible name for the region (defaults to the visible title via aria-labelledby). */
  'aria-label'?: string
  'aria-labelledby'?: string
  /** React-19 ref-as-prop → the region element. */
  ref?: Ref<HTMLDivElement>
}

// ── styled hosts (unnamed → base theme; no sub-theme — the LV-3 convention) ──────────────────────────────
const CanvasRoot = styled(View, {
  flexDirection: 'column',
  gap: '$16',
  width: '100%',
  maxWidth: 1136, // content cap (the dashboard/entity marginHorizontal:'auto' precedent)
  marginHorizontal: 'auto',
})
// A flex-wrap row so `actions` reflow BELOW the title-group when the row can't hold both (375), never colliding
// (BR-CB-S1-12). `rowGap` spaces the wrapped actions; `columnGap` spaces them from the title-group on one line.
const MastheadRow = styled(View, {
  flexDirection: 'row',
  flexWrap: 'wrap',
  alignItems: 'flex-end',
  justifyContent: 'space-between',
  columnGap: '$16',
  rowGap: '$8',
})
const TitleGroup = styled(View, { flexGrow: 1, flexShrink: 1, flexBasis: 'auto', minWidth: 220, gap: '$4' })
const Actions = styled(View, { flexDirection: 'row', alignItems: 'center', gap: '$8', flexShrink: 0 })
const Hairline = styled(View, { height: 1, backgroundColor: '$colorBorderDefault', marginTop: '$12' })

export function CanvasView({
  eyebrow,
  title,
  meta,
  progress,
  actions,
  state = 'success',
  empty,
  error,
  children,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
  ref,
}: CanvasViewProps) {
  // The visible heading names the region when no explicit name is given (the data-view accessible-name convention).
  const titleId = useId()
  const resolvedLabelledby = ariaLabelledby ?? (ariaLabel == null ? titleId : undefined)
  if (process.env.NODE_ENV !== 'production') warnMissingName('CanvasView', ariaLabel, resolvedLabelledby)

  // State rule (BR-CB-S1-6): select an override slot, else delegate to the hosted renderer.
  const body = state === 'empty' && empty ? empty : state === 'error' && error ? error : children

  return (
    <CanvasRoot ref={ref} role="region" aria-label={ariaLabel} aria-labelledby={resolvedLabelledby}>
      <View>
        <MastheadRow className="vida-canvas-masthead">
          <TitleGroup>
            {eyebrow ? (
              <Text
                className="vida-canvas-eyebrow"
                fontFamily="$body"
                fontSize="$caption"
                fontWeight="700"
                letterSpacing={1}
                color="$colorTextMuted"
                style={{ textTransform: 'uppercase' }}
              >
                {eyebrow}
              </Text>
            ) : null}
            <Text id={titleId} className="vida-canvas-title" fontFamily="$display" fontSize="$display" fontWeight="500" color="$colorTextPrimary">
              {title}
            </Text>
            {meta != null ? (
              <Text className="vida-canvas-meta" fontFamily="$body" fontSize="$small" color="$colorTextMuted" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {meta}
              </Text>
            ) : null}
            {progress ?? null}
          </TitleGroup>
          {actions != null ? <Actions className="vida-canvas-actions">{actions}</Actions> : null}
        </MastheadRow>
        <Hairline />
      </View>
      <View className="vida-canvas-body" minHeight={240}>
        {body}
      </View>
    </CanvasRoot>
  )
}
