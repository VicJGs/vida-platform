// ============================================================================
// attachments — the pure core for the note-page attachments list (fe-notes #27, S6).
// Maps `note_attachments` rows (getAttachments) → a view-model + a human-readable
// size. PURE: no React, no @vida/core. The `filename`/blobs are [E] (M1 pass-through);
// the file→blob UPLOAD pipeline is deferred (D-S6-5).
// ============================================================================

/** Structural projection of a `NoteAttachmentRow` (the PageLike precedent). */
export interface NoteAttachmentLike {
  id: string
  filename: string
  mime_type: string
  size_bytes: number
}

export interface AttachmentItem {
  id: string
  filename: string
  mime: string
  sizeBytes: number
}

export function toAttachmentItems(rows: readonly NoteAttachmentLike[]): AttachmentItem[] {
  return rows.map((r) => ({ id: r.id, filename: r.filename, mime: r.mime_type, sizeBytes: r.size_bytes }))
}

const KB = 1024
const MB = 1024 * 1024

/** Human-readable byte size: "0 B" · "900 B" · "1.5 KB" · "2.3 MB" (1 decimal above 1 KB). */
export function formatBytes(n: number): string {
  if (n < KB) return `${n} B`
  if (n < MB) return `${(n / KB).toFixed(1)} KB`
  return `${(n / MB).toFixed(1)} MB`
}
