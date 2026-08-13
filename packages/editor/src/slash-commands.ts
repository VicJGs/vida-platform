// E4 (UI-3) — the slash-menu command set. A package-LOCAL view-model that unifies two sources without redefining
// `@vida/types.SlashCommand` (BR-7): standard-block commands (authored here, backed by already-registered E1/E2 nodes)
// + the 11 integration-block commands (DERIVED from E1's `INTEGRATION_BLOCK_COMMANDS`, shown DISABLED until E5 lands
// their node-views — the graceful-degradation seam). `@vida/types.SlashCommand.block_type` is `IntegrationBlockType`,
// so it structurally can't describe a standard block — hence this local `SlashMenuItem` (BR-E4-3).
// Spec: docs/specs/features/ui-3-vida-editor/e4-slash-menu.md · BR-E4-3/4/4a/4b/5/7.
// @tiptap/react `export *`s @tiptap/core, and it (not @tiptap/core, which pnpm doesn't expose directly) is the
// codebase's import site for core types (toolbar.tsx precedent) — DEV-1 correction to preflight F5.
import type { Editor, Range } from '@tiptap/react'
import type { IntegrationBlockType, SlashCommandCategory } from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS } from './commands'
import { calloutInsertContent } from './extensions/callout'

/**
 * A single slash-menu entry. `run` dispatches the block insertion/turn-into after the Suggestion plugin hands back the
 * `range` of the typed `/query` (BR-E4-4). A deferred (integration) entry is `available:false` with `run:undefined`:
 * selecting it is a no-op and ↑/↓ skip it (BR-E4-5) — it lights up when E5 registers its node-view.
 */
export interface SlashMenuItem {
  /** Stable identity + React key + the source of the option's DOM id. */
  id: string
  title: string
  description?: string
  /** Lucide icon NAME (a hint for later polish — NOT rendered in E4; title-only rows, no icon dep). */
  icon?: string
  /** Extra case-insensitive filter terms (shortcut alias, abbreviations). */
  keywords: readonly string[]
  /** Grouping bucket (reuses the @vida/types enum). */
  category: SlashCommandCategory
  /** False → a deferred integration block (disabled, unselectable) until its module ships (E5). */
  available: boolean
  /** Dispatch the block. Omitted when `!available`. `range` = the `/query` span to delete first. */
  run?: (editor: Editor, range: Range) => void
}

// ── standard blocks — all backed by a registered E1 (StarterKit) / E2 node, so `run` works TODAY ────────────────────
// Each deletes the `/query` trigger text, then applies the real command (BR-E4-4). Heading/Text use SET semantics
// (turn-INTO), deliberately NOT E3's toggle (BR-E4-4b) — a slash pick chooses a target, it doesn't toggle back.
const STANDARD_ITEMS: readonly SlashMenuItem[] = [
  {
    id: 'text',
    title: 'Text',
    description: 'Plain paragraph.',
    icon: 'pilcrow',
    keywords: ['paragraph', 'p', 'body'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Big section heading.',
    icon: 'heading-1',
    keywords: ['h1', 'title', 'heading'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run(),
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: 'heading-2',
    keywords: ['h2', 'subtitle', 'heading'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run(),
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: 'heading-3',
    keywords: ['h3', 'heading'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run(),
  },
  {
    id: 'bulletList',
    title: 'Bulleted list',
    description: 'A simple bullet list.',
    icon: 'list',
    keywords: ['ul', 'unordered', 'bullet'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    title: 'Numbered list',
    description: 'A list with numbering.',
    icon: 'list-ordered',
    keywords: ['ol', 'ordered', 'number'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    title: 'Task list',
    description: 'A checklist with checkboxes.',
    icon: 'list-checks',
    keywords: ['todo', 'checkbox', 'checklist'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    title: 'Quote',
    description: 'Capture a quotation.',
    icon: 'quote',
    keywords: ['blockquote', 'citation'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    title: 'Code block',
    description: 'A block of formatted code.',
    icon: 'code',
    keywords: ['pre', 'snippet', 'fence'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'A horizontal rule.',
    icon: 'minus',
    keywords: ['hr', 'rule', 'separator', 'horizontal'],
    category: 'basic',
    available: true,
    run: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    id: 'table',
    title: 'Table',
    description: 'A 3×3 table with a header row.',
    icon: 'table',
    keywords: ['grid', 'rows', 'columns'],
    category: 'media',
    available: true,
    run: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    id: 'callout',
    title: 'Callout',
    description: 'A highlighted info panel.',
    icon: 'info',
    keywords: ['note', 'aside', 'admonition', 'panel'],
    category: 'media',
    available: true,
    // E2 shipped no `setCallout` command (the in-source chain augmentation didn't propagate — E3 DEV-1); insert the
    // exact typed payload. The Callout node is `isolating`, so the inserted slice stays a closed container.
    run: (editor, range) => editor.chain().focus().deleteRange(range).insertContent(calloutInsertContent()).run(),
  },
  // Image is intentionally EXCLUDED (BR-E4-4a): `setImage` yields an empty <img> — the attachment pipeline is deferred
  // (BR-E2-5), same reason E3 excluded it. It returns when a URL/upload surface exists.
]

// ── the availability seam (BR-E4-5) ─────────────────────────────────────────────────────────────────────────────
// In M1.0 NO integration block is available (their node-views land in E5 / their MOD-* phases). E5 flips these on by
// populating this set (or replacing it with a runtime BlockRegistry query) — no E4 rewrite needed.
const AVAILABLE_INTEGRATION_BLOCKS: ReadonlySet<IntegrationBlockType> = new Set()

/** Whether an integration block can be inserted yet. Always false in M1.0 (the E5 seam). */
export function isBlockAvailable(type: IntegrationBlockType): boolean {
  return AVAILABLE_INTEGRATION_BLOCKS.has(type)
}

// ── integration blocks — DERIVED from E1's data (BR-E4-3), never duplicated ─────────────────────────────────────────
const INTEGRATION_ITEMS: readonly SlashMenuItem[] = INTEGRATION_BLOCK_COMMANDS.map((cmd) => ({
  id: cmd.name,
  title: cmd.label,
  description: cmd.description,
  icon: cmd.icon,
  keywords: [cmd.shortcut, cmd.name],
  category: cmd.category,
  available: isBlockAvailable(cmd.block_type),
  // run stays undefined while unavailable — Suggestion's command → `item.run?.()` is a no-op (BR-E4-5).
}))

/** The full slash-menu surface: standard blocks (usable now) followed by the 11 integration blocks (deferred). */
export const SLASH_MENU_ITEMS: readonly SlashMenuItem[] = [...STANDARD_ITEMS, ...INTEGRATION_ITEMS]

/**
 * Filter by the query typed after `/` (BR-E4-7): case-insensitive SUBSTRING over title + keywords. Empty query → the
 * full list. Deferred entries stay in the results (dimmed) so searching "summary" still surfaces the coming block.
 */
export function filterSlashItems(
  items: readonly SlashMenuItem[],
  query: string,
): readonly SlashMenuItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    (it) =>
      it.title.toLowerCase().includes(q) || it.keywords.some((k) => k.toLowerCase().includes(q)),
  )
}
