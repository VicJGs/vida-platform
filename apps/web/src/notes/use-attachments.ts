// ============================================================================
// useAttachments — the note-page attachments DATA seam (fe-notes #27, S6). Same stub
// discipline as useNoteEntity/useBacklinks: M1 DEFAULT = empty (no live apps/web
// NotesService composition root — D-S6-5 / S1-D2). `?sample` (DEV) → sample items.
//
// Live swap (zero signature change):
//   const { data } = useQuery({ queryKey: ['attachments', pageId], queryFn: () => notes.getAttachments(pageId) })
//   attachments = toAttachmentItems(data ?? [])
//   add    → FileReader → NewAttachment{encryptedBlob} → notes.addAttachment(pageId, …)  [pipeline deferred, D-S6-5]
//   remove → notes.removeAttachment(id); both invalidate ['attachments', pageId].
// ============================================================================
import { toAttachmentItems, type AttachmentItem, type NoteAttachmentLike } from './attachments'

export type AttachmentsState = 'loading' | 'error' | 'empty' | 'populated'
export interface AttachmentsResult {
  attachments: readonly AttachmentItem[]
  state: AttachmentsState
  add: () => Promise<void>
  remove: (id: string) => Promise<void>
}

// --- DEV/gate sample (NOT live data) — mixed mime so the file-type icons vary. ---
const SAMPLE_ROWS: readonly NoteAttachmentLike[] = [
  { id: 'att-1', filename: 'project-brief.pdf', mime_type: 'application/pdf', size_bytes: 248_000 },
  { id: 'att-2', filename: 'whiteboard.png', mime_type: 'image/png', size_bytes: 1_540_000 },
]

function devSampleActive(): boolean {
  return (
    process.env.NODE_ENV !== 'production' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('sample')
  )
}

/** M1 default (empty) + the DEV/gate sample. `_pageId` is unused in the stub; the live swap un-prefixes it for
 *  `getAttachments(pageId)` + the `['attachments', pageId]` key (call site unchanged — the S3/S4/S5 convention). */
export function useAttachments(_pageId: string): AttachmentsResult {
  const attachments = devSampleActive() ? toAttachmentItems(SAMPLE_ROWS) : []
  const state: AttachmentsState = attachments.length > 0 ? 'populated' : 'empty'
  // M1: no live store → no-ops (the dev-gate demonstrates the UI, not a live write). `_id` unused in the stub.
  const add = async (): Promise<void> => {}
  const remove = async (_id: string): Promise<void> => {}
  return { attachments, state, add, remove }
}
