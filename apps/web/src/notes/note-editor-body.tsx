// ============================================================================
// NoteEditorBody — the borderless, Notion-clean editor facet (fe-notes-and-pages
// #27, S2; D-S2-1 / EC-4 / EC-23). Composes the shipped `<VidaEditor chrome='bare'>`
// on a writing measure, reusing `ensureCanvasEditorStyles` for the writing-grade
// typography — NOT the sheet-on-desk `CanvasEditor` component (the envision's
// continuous Notion page outranks the #7 seam's default, by precedence).
//
// M1 (notes-entity-usability S2, IR-7): content persistence is LIVE. The uncontrolled `doc` seeds the editor;
// `onChange` persists via `useNoteContent` → `NotesService.writePageContent` (content's own path, debounced, NOT
// the updatePage LWW metadata patch). Multi-device CRDT/Yjs merge of `pages.content` stays M4 (sync OFF → M4).
// ============================================================================
import { Text, View } from '@tamagui/core'
import { VidaEditor } from '@vida/editor'
import { ensureCanvasEditorStyles } from '../canvas-editor/canvas-editor-styles'
import type { NoteEntityData } from './use-note-entity'
import { useNoteContent, type SaveState } from './use-note-content'

export interface NoteEditorBodyProps {
  page: NoteEntityData
}

/** Honest save-state only (BR-NEU-5) — no fake "synced". Idle renders nothing. */
const SAVE_LABEL: Partial<Record<SaveState, string>> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Couldn’t save',
}

export function NoteEditorBody({ page }: NoteEditorBodyProps) {
  // Idempotent, browser-only — the canvas-editor.tsx render-body precedent. Scopes to `.vida-canvas-editor-page`.
  ensureCanvasEditorStyles()
  const { save, saveState } = useNoteContent(page.id, page.content)
  const label = SAVE_LABEL[saveState]
  return (
    <View className="vida-canvas-editor-page" width="100%" maxWidth={740} marginHorizontal="auto" gap="$8">
      <View height={18} alignItems="flex-end" justifyContent="center">
        {label ? (
          <Text
            role="status"
            fontSize="$small"
            color={saveState === 'error' ? '$colorTextPrimary' : '$colorTextMuted'}
          >
            {label}
          </Text>
        ) : null}
      </View>
      <VidaEditor
        chrome="bare"
        defaultValue={page.content ?? undefined}
        onChange={save}
        aria-label={`${page.title} editor`}
      />
    </View>
  )
}

export default NoteEditorBody
