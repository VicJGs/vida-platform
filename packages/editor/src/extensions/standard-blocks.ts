// E2 (UI-3) — the standard block extensions BEYOND StarterKit, completing the STANDARD_BLOCK_TYPE set (spec §1).
// E1's StarterKit already provides paragraph/heading/bulletList/orderedList/blockquote/codeBlock/horizontalRule —
// those are NOT re-added here (BR-E2-2: ProseMirror throws on duplicate node names). Spread into the useEditor
// extensions array AFTER StarterKit + Placeholder (editor.tsx).
// Spec: docs/specs/features/ui-3-vida-editor/e2-standard-blocks.md · BR-E2-1/3/5.
import type { Extensions } from '@tiptap/react'
import Image from '@tiptap/extension-image'
import { TaskList, TaskItem } from '@tiptap/extension-list'
import { TableKit } from '@tiptap/extension-table'
import { Callout } from './callout'

/**
 * The four blocks E1's StarterKit does not provide:
 * - `taskList`/`taskItem` — from `@tiptap/extension-list` (already installed; inherits StarterKit's bundled
 *   `listKeymap` for Enter/Tab/Backspace — do NOT disable it, BR-E2-3).
 * - `image` — a presentational node; `allowBase64` is an INTERIM src carrier (a data-URI bloats the per-page sync
 *   blob — BR-E2-5). The encrypted `note_attachments` pipeline that retires it is the app's, deferred.
 * - `table` — `TableKit` bundles `Table`+`TableRow`+`TableCell`+`TableHeader` (one dep); `resizable:false` — column
 *   resizing is an E3 toolbar interaction, out of E2.
 * - `callout` — the bespoke node (`./callout`, BR-E2-6).
 *
 * Type is `Extensions` (a mixed `(Extension|Node|Mark)[]`), not `Extension[]` — Image/TableKit/Callout are Nodes.
 */
export const STANDARD_BLOCK_EXTENSIONS: Extensions = [
  TaskList,
  TaskItem.configure({ nested: true }),
  Image.configure({ inline: false, allowBase64: true }),
  TableKit.configure({ table: { resizable: false } }),
  Callout,
]
