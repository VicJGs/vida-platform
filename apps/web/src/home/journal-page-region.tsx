// ============================================================================
// JournalPageRegion — fe-home S2 (the inline-block editor page). Entity Delivery ②.
//
// The Home journal-page entity: a block EDITOR page where the user writes their day
// WITH INLINE integration blocks (ADR-008 `inline` render target: /dailySummary,
// /taskChecklist, …) — "the home page, but as a journal page." DISTINCT from the
// Dashboard's standalone widgets (EC-1).
//
// M1 scope (seam-contract D): a faithful page region — prose + inline-block regions
// + the "/" insert affordance. The real @vida/editor <VidaEditor> mount (with live
// inline block node-views) is the N6 seam, homed downstream (@vida/editor is not an
// apps/web dep). The shell owns the page terminal states (the EntityView EditorBody
// precedent); the body renders only for `success`.
//
// Contract (S2): JournalPageRegion({ editorState?, aria-* })
//   • EC-3 — prose + inline integration-block regions + a "/" insert affordance
//   • EC-8 — DIRECT semantic tokens, serif prose, AA both modes
// ============================================================================
import { styled, Text, View } from '@tamagui/core'
import { EmptyState, type ViewState } from '@vida/ui'

export interface JournalPageRegionProps {
  /** The page's OWN terminal state (BR-2). Shell owns loading/empty/error; body renders only for 'success'. Default 'success'. */
  editorState?: ViewState
  'aria-label'?: string
}

// The editor page frame — base semantic tokens, no sub-theme (the VidaEditor frame precedent, editor.tsx:76).
const PageFrame = styled(View, {
  backgroundColor: '$colorSurfacePrimary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
  borderRadius: '$lg',
  padding: '$24',
  gap: '$16',
})
// An inline integration-block placeholder — the IntegrationBlockPlaceholder analog (editor E5): a calm, labeled region
// carrying the block's identity until its MOD-* ships the real inline node-view. role="note" + accessible name (CB6).
const InlineBlockFrame = styled(View, {
  borderWidth: 1,
  borderColor: '$colorBorderDefault',
  borderRadius: '$md',
  backgroundColor: '$colorSurfaceSecondary',
  padding: '$12',
  gap: '$4',
})
const SkeletonRow = styled(View, { height: 14, borderRadius: '$sm', backgroundColor: '$colorSurfaceSecondary', marginBottom: 8 })

function InlineBlock({ type, title }: { type: string; title: string }) {
  return (
    <InlineBlockFrame role="note" aria-label={`${title} block`}>
      <View flexDirection="row" alignItems="center" justifyContent="space-between">
        <Text fontSize="$small" color="$colorTextMuted" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {title}
        </Text>
        <Text fontSize="$small" color="$colorTextMuted">
          /{type}
        </Text>
      </View>
      <Text fontSize="$small" color="$colorTextMuted">
        Available when its module ships.
      </Text>
    </InlineBlockFrame>
  )
}

function Prose({ children }: { children: React.ReactNode }) {
  return (
    <Text fontFamily="$display" color="$colorTextPrimary" style={{ fontSize: 18, lineHeight: 30 }}>
      {children}
    </Text>
  )
}

/** The journal-page body — prose interleaved with inline integration-block regions + the "/" affordance (EC-3). */
function PageBody() {
  return (
    <>
      <Text fontSize="$small" color="$colorTextMuted" style={{ textTransform: 'uppercase', letterSpacing: '0.18em' }}>
        Today’s thread
      </Text>
      <Prose>Mornings have started to settle. The first hour is for the long project; everything louder waits until the light is fully up.</Prose>
      <InlineBlock type="dailySummary" title="Today so far" />
      <Prose>Before I lose it — the finance import needs a pass, and I owe Mariana a call.</Prose>
      <InlineBlock type="taskChecklist" title="Today’s tasks" />
      <Text fontSize="$small" color="$colorTextMuted">
        Type / to pull in a summary, tasks, a chart, a habit, or a [[ link from any module.
      </Text>
    </>
  )
}

export function JournalPageRegion({ editorState = 'success', 'aria-label': ariaLabel = 'Journal entry' }: JournalPageRegionProps) {
  return (
    <PageFrame role="region" aria-label={ariaLabel}>
      {editorState === 'loading' && (
        <View aria-busy="true">
          <SkeletonRow width="80%" />
          <SkeletonRow width="95%" />
          <SkeletonRow width="60%" />
        </View>
      )}
      {editorState === 'empty' && (
        <EmptyState title="Start today’s entry">
          <Text fontSize="$body" color="$colorTextMuted">
            Write your day, or type / to pull in a block from any module.
          </Text>
        </EmptyState>
      )}
      {editorState === 'error' && (
        <View role="status">
          <Text fontSize="$small" color="$colorTextMuted">
            Couldn’t load today’s page.
          </Text>
        </View>
      )}
      {editorState === 'success' && <PageBody />}
    </PageFrame>
  )
}

export default JournalPageRegion
