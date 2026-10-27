// ============================================================================
// NoteEditorBody — the borderless, Notion-clean editor facet (fe-notes-and-pages
// #27, S2; D-S2-1 / EC-4 / EC-23). Composes the shipped `<VidaEditor chrome='bare'>`
// on a writing measure, reusing `ensureCanvasEditorStyles` for the writing-grade
// typography. Shared by the note page AND Home's journal region (one body, two hosts).
//
// Persistence is LIVE: the uncontrolled `doc` seeds the editor; `onChange` persists via `useNoteContent` →
// `NotesService.writePageContent` (content's own path, debounced, NOT the updatePage LWW patch — IR-7).
//
// Data safety (notes-rescope R0, EC-33 / BR-R0-1): a body we can't read is NEVER edited or written. `malformed`
// at load (bad JSON / not a doc) never mounts the editor; a doc the editor's schema rejects (an unknown node/mark)
// switches here via `onInvalidContent`, which locks the write seam in the same callback. Either way the facet shows
// a read-only notice + "Export a copy" (the stored bytes, lossless) and, when the bytes parse, "Export as Markdown".
// ============================================================================
import { useState } from 'react'
import { Text, View } from '@tamagui/core'
import { Button, EmptyState } from '@vida/ui'
import { VidaEditor, toMarkdown } from '@vida/editor'
import { isEditorDocument } from '@vida/core'
import { ensureCanvasEditorStyles } from '../canvas-editor/canvas-editor-styles'
import type { NoteEntityData } from './use-note-entity'
import { useNoteContent, type SaveState } from './use-note-content'
import { copyFilename, downloadText } from './export-copy'

export interface NoteEditorBodyProps {
  page: NoteEntityData
}

/** Honest save-state only (BR-NEU-5) — no fake "synced". Idle renders nothing. */
const SAVE_LABEL: Partial<Record<SaveState, string>> = {
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Couldn’t save',
}

/** Markdown of the stored bytes when they parse to a doc; `null` when they don't or the conversion throws (G8). */
function markdownOf(raw: string | null): string | null {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    // 'comment' keeps each integration block as a marker (least lossy for a rescue copy). BR-E6-9 degrades unknown
    // nodes/marks; the guard is top-level only, so malformed children can still throw here.
    return isEditorDocument(value) ? toMarkdown(value, { include_frontmatter: false, integration_block_handling: 'comment' }) : null
  } catch {
    return null
  }
}

/**
 * EC-33 — the read-only notice that replaces the editor. It can appear AFTER the editor mounted (the editor's own content
 * check), so its sentence is a polite live region — the SENTENCE only: a live region must not hold controls (their labels
 * would be read out as part of the message), so the heading and the export buttons sit outside it.
 */
function UnreadableNotice({ page }: NoteEditorBodyProps) {
  const raw = page.rawContent ?? ''
  const markdown = markdownOf(page.rawContent)
  return (
    <View>
      <EmptyState
        title="This page can’t be opened for editing"
        action={
          <View flexDirection="row" flexWrap="wrap" gap="$8" justifyContent="center">
            <Button
              intent="secondary"
              onPress={() => downloadText(copyFilename(page.title, 'json'), raw, 'application/json')}
            >
              Export a copy
            </Button>
            {markdown != null ? (
              <Button
                intent="ghost"
                onPress={() => downloadText(copyFilename(page.title, 'md'), markdown, 'text/markdown')}
              >
                Export as Markdown
              </Button>
            ) : null}
          </View>
        }
      >
        <Text role="status" fontSize="$body" color="$colorTextMuted" textAlign="center">
          It contains content this version of Vida can’t read. Nothing will be overwritten.
        </Text>
      </EmptyState>
    </View>
  )
}

export function NoteEditorBody({ page }: NoteEditorBodyProps) {
  // Idempotent, browser-only — the canvas-editor.tsx render-body precedent. Scopes to `.vida-canvas-editor-page`.
  ensureCanvasEditorStyles()
  const { save, saveState, lock, seed } = useNoteContent(page)
  // One source for the editor seed and the read-only state (DEV-R0-1): the overlay wins over the (possibly stale) prop.
  const [invalid, setInvalid] = useState(seed.status === 'malformed')
  const label = SAVE_LABEL[saveState]
  return (
    <View className="vida-canvas-editor-page" width="100%" maxWidth={740} marginHorizontal="auto" gap="$8">
      {invalid ? (
        <UnreadableNotice page={page} />
      ) : (
        <>
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
            defaultValue={seed.doc ?? undefined}
            onChange={save}
            onInvalidContent={() => {
              lock() // synchronously, in the callback — no render window where a save could be armed (BR-R0-7)
              setInvalid(true)
            }}
            aria-label={`${page.title} editor`}
          />
        </>
      )}
    </View>
  )
}

export default NoteEditorBody
