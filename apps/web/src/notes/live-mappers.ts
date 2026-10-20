// ============================================================================
// Notes live mappers — PageRow → the notes view types (notes go-live, 2026-10-20).
// The live swap for `useNotesRows`/`useNoteEntity`: the service returns `PageRow`
// (the `pages` table row); the collection/entity surfaces consume the lighter
// view projections. Pure, display-only (dates via Intl — the repo convention).
// ============================================================================
import type { NotesService } from '@vida/core'
import type { EditorDocument } from '@vida/types'

/** The `pages` row shape the service returns (PageRow is not re-exported from @vida/core's barrel). */
type PageRow = Awaited<ReturnType<NotesService['listPages']>>[number]
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

function parseContent(c: string | null): EditorDocument | null {
  if (!c) return null
  try {
    return JSON.parse(c) as EditorDocument
  } catch {
    return null
  }
}

export function toNotesRow(p: PageRow): NotesRow {
  return {
    id: p.id,
    title: p.title ?? '(untitled)',
    type: p.type,
    excerpt: '',
    updated: relLabel(p.updated_at),
    date: p.journal_date ?? ymd(p.updated_at),
    favorite: Boolean(p.is_favorite),
  }
}

export function toNoteEntity(p: PageRow): NoteEntityData {
  return {
    id: p.id,
    type: p.type,
    title: p.title ?? '',
    content: parseContent(p.content),
    favorite: Boolean(p.is_favorite),
    archived: Boolean(p.is_archived),
    updated: relLabel(p.updated_at),
    journalDate: p.journal_date ?? null,
    icon: p.icon ?? null,
    cover: p.cover_image ?? null,
  }
}
