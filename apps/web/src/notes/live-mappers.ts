// ============================================================================
// Notes live mappers — PageRow → the notes view types (notes go-live, 2026-10-20).
// The live swap for `useNotesRows`/`useNoteEntity`: the service returns `PageRow`
// (the `pages` table row); the collection/entity surfaces consume the lighter
// view projections. Pure, display-only (dates via Intl — the repo convention).
// ============================================================================
import { isEditorDocument, type NotesService } from '@vida/core'
import type { EditorDocument, EditorNode } from '@vida/types'

/** The `pages` row shape the service returns (PageRow is not re-exported from @vida/core's barrel). */
type PageRow = Awaited<ReturnType<NotesService['listPages']>>[number]
import { pageLabel } from './note-chrome'
import type { NotesRow } from './use-notes-rows'
import type { NoteEntityData } from './use-note-entity'

const rel = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

function relLabel(ms: number): string {
  const min = Math.round((ms - Date.now()) / 60_000)
  if (Math.abs(min) < 60) return rel.format(min, 'minute')
  const hr = Math.round(min / 60)
  if (Math.abs(hr) < 24) return rel.format(hr, 'hour')
  return rel.format(Math.round(hr / 24), 'day')
}

function ymd(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/**
 * The tagged read of a stored `pages.content` (notes-rescope R0, BR-R0-4) — the ONE parser. `malformed` keeps the raw
 * bytes so the surface can refuse to edit (never overwrite) and offer "Export a copy" (EC-33). Two LOSSLESS
 * normalizations, because the editor's always-on schema check rejects both and neither carries content: a doc with no
 * blocks → `absent`; empty text nodes are dropped. Whether the NODES are known is the editor's check (BR-R0-3), not this.
 */
export type ContentParse =
  | { status: 'absent' }
  | { status: 'ok'; doc: EditorDocument }
  | { status: 'malformed'; raw: string }

// Normalize toward the editor's OWN JSON (ProseMirror `toJSON`): no empty text nodes, and no empty `content` key on a
// non-doc node. Then a mere open's mount echo equals the dedupe baseline and nothing is written (BR-NEU-5).
function stripEmptyText(node: EditorNode): EditorNode {
  if (!Array.isArray(node.content)) return node
  const content = node.content.filter((c) => !(c.type === 'text' && c.text === '')).map(stripEmptyText)
  if (content.length === 0 && node.type !== 'doc') {
    const rest: EditorNode = { ...node }
    delete rest.content
    return rest
  }
  return { ...node, content }
}

export function parseContentResult(raw: string | null): ContentParse {
  if (!raw) return { status: 'absent' }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return { status: 'malformed', raw }
  }
  if (!isEditorDocument(value)) return { status: 'malformed', raw }
  const doc = stripEmptyText(value as EditorNode) as EditorDocument
  return doc.content.length === 0 ? { status: 'absent' } : { status: 'ok', doc }
}

/** The null-contract wrapper (fe-calendar's record line): `ok` → the doc, `absent`/`malformed` → null. */
export function parseContent(raw: string | null): EditorDocument | null {
  const parsed = parseContentResult(raw)
  return parsed.status === 'ok' ? parsed.doc : null
}

export function toNotesRow(p: PageRow): NotesRow {
  return {
    id: p.id,
    title: pageLabel({ type: p.type, title: p.title }), // never empty (E-3)
    labelFromType: !p.title?.trim(),
    icon: p.icon ?? null,
    cover: p.cover_image ?? null,
    type: p.type,
    excerpt: '',
    updated: relLabel(p.updated_at),
    date: p.journal_date ?? ymd(p.updated_at),
    favorite: Boolean(p.is_favorite),
  }
}

export function toNoteEntity(p: PageRow): NoteEntityData {
  const parsed = parseContentResult(p.content)
  return {
    id: p.id,
    type: p.type,
    title: p.title ?? '',
    content: parsed.status === 'ok' ? parsed.doc : null,
    contentStatus: parsed.status,
    rawContent: p.content ?? null,
    favorite: Boolean(p.is_favorite),
    archived: Boolean(p.is_archived),
    updated: relLabel(p.updated_at),
    journalDate: p.journal_date ?? null,
    icon: p.icon ?? null,
    cover: p.cover_image ?? null,
  }
}
