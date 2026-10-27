import { z } from 'zod'
import {
  STANDARD_BLOCK_TYPE,
  INTEGRATION_BLOCK_TYPE,
  EXPORT_FORMAT,
  DAILY_SUMMARY_SECTION_TYPE,
  CHART_TYPE,
  SLASH_COMMAND_CATEGORY,
} from '@vida/types'
import type { EditorDocument } from '@vida/types'

export const StandardBlockTypeSchema = z.enum(STANDARD_BLOCK_TYPE)
export const IntegrationBlockTypeSchema = z.enum(INTEGRATION_BLOCK_TYPE)
export const ExportFormatSchema = z.enum(EXPORT_FORMAT)
export const DailySummarySectionTypeSchema = z.enum(DAILY_SUMMARY_SECTION_TYPE)
export const ChartTypeSchema = z.enum(CHART_TYPE)
export const SlashCommandCategorySchema = z.enum(SLASH_COMMAND_CATEGORY)

// ---------------------------------------------------------------------------
// notes-rescope R0 · BR-R0-6 — the EditorDocument SHAPE guard for body writes.
// Same rule as @vida/editor `assertEditorDocument` (doc root · `content` array · each child an object with a
// string `type`) — core can't import the editor, and @vida/types carries no runtime functions. Shape only: whether
// the editor's SCHEMA accepts the nodes is the editor's own content check (BR-R0-3); a shape-valid doc with an
// unknown node is still refused for editing there, never overwritten.
// ---------------------------------------------------------------------------

export function isEditorDocument(value: unknown): value is EditorDocument {
  if (typeof value !== 'object' || value === null) return false
  const doc = value as { type?: unknown; content?: unknown }
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return false
  return doc.content.every(
    (n) => typeof n === 'object' && n !== null && typeof (n as { type?: unknown }).type === 'string',
  )
}

/** A stored `pages.content` string that parses to a shape-valid EditorDocument. Never throws. */
export function isEditorDocumentJson(text: string): boolean {
  try {
    return isEditorDocument(JSON.parse(text))
  } catch {
    return false
  }
}
