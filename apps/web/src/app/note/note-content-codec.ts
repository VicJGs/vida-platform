// ============================================================================
// Note content codec — MOD-notes ② · B2 (LIF-131). The `pages.content` ⇄
// EditorDocument boundary. `content` is a nullable text() column holding a
// STRINGIFIED TipTap JSON document (or null for a fresh page); `<VidaEditor>`
// speaks EditorDocument objects. The app owns this codec (BR-1: the editor is
// presentational, the app owns persistence).
//
// The ONE doc-mandated try/catch in B2 (business-rules.md:29 "decrypt/parse fail
// → read-only + flag") — a corrupt stored value must NOT crash the surface; it
// degrades the editor to read-only + a flag banner. This is the editor-degrade
// contract, deliberately distinct from the fail-loud convention that governs
// config reads (A7 getSummaryConfig throws on a corrupt value). We reuse the
// editor's own runtime shape gate (assertEditorDocument) so parse + shape are
// validated by ONE function — the same one the editor applies to getJSON().
// ============================================================================

import { assertEditorDocument, type EditorDocument } from '@vida/editor'

/** The canonical empty document — the autosave baseline for a null/empty page (BR-B2-4). */
export const EMPTY_DOC: EditorDocument = { type: 'doc', content: [] }

/**
 * Parse a `pages.content` column value for `VidaEditor.defaultValue`.
 * - `null`/`''` → `{ doc: undefined, corrupt: false }` — a blank, editable page.
 * - valid stringified doc → `{ doc, corrupt: false }`.
 * - present-but-unparseable / wrong-shape → `{ doc: undefined, corrupt: true }` — mount read-only + flag (BR-B2-3).
 */
export function parseContent(raw: string | null): { doc: EditorDocument | undefined; corrupt: boolean } {
  if (raw == null || raw === '') return { doc: undefined, corrupt: false }
  try {
    return { doc: assertEditorDocument(JSON.parse(raw)), corrupt: false }
  } catch {
    return { doc: undefined, corrupt: true }
  }
}

/** Serialize an EditorDocument to the stringified column value for `updatePage({ content })`. */
export function serializeContent(doc: EditorDocument): string {
  return JSON.stringify(doc)
}
