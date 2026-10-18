// ============================================================================
// NoteEditorBody — the borderless, Notion-clean editor facet (fe-notes-and-pages
// #27, S2; D-S2-1 / EC-4 / EC-23). Composes the shipped `<VidaEditor chrome='bare'>`
// on a writing measure, reusing `ensureCanvasEditorStyles` for the writing-grade
// typography — NOT the sheet-on-desk `CanvasEditor` component (the envision's
// continuous Notion page outranks the #7 seam's default, by precedence).
//
// M1: content persistence is DEFERRED (IR-7 — `pages.content` is a Yjs CRDT written
// via the editor binding, never an LWW patch). The uncontrolled `doc` seeds the
// editor; the live `onChange → pages.content` wiring lands with the data plane.
// ============================================================================
import { View } from '@tamagui/core'
import { VidaEditor } from '@vida/editor'
import { ensureCanvasEditorStyles } from '../canvas-editor/canvas-editor-styles'
import type { NoteEntityData } from './use-note-entity'

export interface NoteEditorBodyProps {
  page: NoteEntityData
}

export function NoteEditorBody({ page }: NoteEditorBodyProps) {
  // Idempotent, browser-only — the canvas-editor.tsx render-body precedent. Scopes to `.vida-canvas-editor-page`.
  ensureCanvasEditorStyles()
  return (
    <View className="vida-canvas-editor-page" width="100%" maxWidth={740} marginHorizontal="auto">
      <VidaEditor chrome="bare" defaultValue={page.content ?? undefined} aria-label={`${page.title} editor`} />
    </View>
  )
}

export default NoteEditorBody
