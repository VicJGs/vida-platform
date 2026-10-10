// fe-codec-canvas-editor (#7) · S2 — the CODEC Canvas: Editor composition (apps/web plane).
//
// IR-1: @vida/ui cannot import @vida/editor (editor→ui), so the editor-canvas composition lives HERE, where both
// the frame (@vida/ui CanvasView) and the body (@vida/editor VidaEditor) are importable. This is the drop-in
// ReactNode EntityView #6 mounts in its `editor` slot (IR-5) — a notebook PAGE, not a bordered widget (EC-11).
//
// What it owns: the masthead (via CanvasView) + SyncStatus + the sheet-on-desk page + 8-state threading + a11y.
// What it does NOT own: live data / @vida/core persistence (deferred to the first consumer #27 — S3 ships only the
// pure convention; reconstructed-structure.md:33 homes runtime @vida/core wiring to #13 seams).
import type { ReactNode } from 'react'
import { View, Text } from '@tamagui/core'
import { CanvasView, SyncStatus, EmptyState, type CanvasState } from '@vida/ui'
import { VidaEditor } from '@vida/editor'
import type { EditorDocument } from '@vida/types'
import { ensureCanvasEditorStyles } from './canvas-editor-styles'

export interface CanvasEditorProps {
  /** The page title = the USER-NAMED page (EC-1) — NEVER a filename. Serif H1, names the region. */
  title: string
  /** Entity-type eyebrow (e.g. "Note"). Uppercased via CanvasView. */
  eyebrow?: string
  /** Quiet meta subline (e.g. "Edited 2h ago · 6 blocks"). */
  meta?: ReactNode
  /** Derived save-state → the SyncStatus chip in the masthead actions slot (locked top-right). Omit → no chip. */
  syncState?: 'saved' | 'error'
  /** The 8-state-collapsed canvas state — the app derives + passes (patterns R4). Default 'success'. */
  state?: CanvasState
  /** The editor document (UNCONTROLLED seed — IR-3). */
  doc?: EditorDocument
  /** Change sink → wire to pages.content at the consumer (S3 convention; IR-3/IR-6). */
  onChange?: (doc: EditorDocument) => void
  /** Read-only when false. Default true. */
  editable?: boolean
  'aria-label'?: string
  'aria-labelledby'?: string
}

function PageSkeleton() {
  return (
    <View gap="$12" paddingVertical="$8" aria-hidden>
      {[72, 40, 56, 48, 64].map((w, i) => (
        <View key={i} height={18} width={`${w}%`} backgroundColor="$colorSurfaceSecondary" borderRadius="$sm" />
      ))}
    </View>
  )
}

/**
 * CODEC Canvas: Editor — the shipped <VidaEditor> framed as an editorial notebook page.
 * Presentational, state-as-prop (patterns BR-2). NON-generic (holds no entity data; the host owns the doc).
 */
export function CanvasEditor({
  title,
  eyebrow,
  meta,
  syncState,
  state = 'success',
  doc,
  onChange,
  editable = true,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledby,
}: CanvasEditorProps) {
  ensureCanvasEditorStyles()

  // The editor's accessible name: explicit aria-label, else derived from the page title (IR-7).
  const editorLabel = ariaLabel ?? `${title} editor`

  return (
    // The DESK — a calm surface the page sheet floats on (EC-11). Full-bleed; CanvasView centers the column within.
    <View paddingHorizontal="$16" paddingVertical="$24" minHeight="100%" backgroundColor="$colorSurfaceSecondary">
      <CanvasView
        eyebrow={eyebrow}
        title={title}
        meta={meta}
        actions={syncState ? <SyncStatus state={syncState} /> : undefined}
        state={state}
        empty={
          <EmptyState title="A blank page">
            Start writing — or press “/” for a block. Nothing's required.
          </EmptyState>
        }
        error={
          <View role="status" paddingVertical="$16">
            <Text fontFamily="$body" fontSize="$body" color="$colorTextMuted">
              This page couldn't be opened on this device. Your words are safe — try again in a moment.
            </Text>
          </View>
        }
        aria-label={ariaLabelledby ? undefined : ariaLabel}
        aria-labelledby={ariaLabelledby}
      >
        {state === 'loading' ? (
          <PageSkeleton />
        ) : (
          // The notebook PAGE: an airy sheet on the desk — generous writing margins, soft edge, no widget box
          // (the editor is chrome="bare"; S1 opened its frame).
          <View
            className="vida-canvas-editor-page"
            backgroundColor="$colorSurfacePrimary"
            borderRadius="$md"
            paddingHorizontal="$48"
            paddingVertical="$40"
            minHeight={560}
            shadowColor="$colorBorderDefault"
            shadowRadius={24}
            shadowOpacity={0.5}
            shadowOffset={{ width: 0, height: 6 }}
          >
            <VidaEditor chrome="bare" defaultValue={doc} onChange={onChange} editable={editable} aria-label={editorLabel} />
          </View>
        )}
      </CanvasView>
    </View>
  )
}
