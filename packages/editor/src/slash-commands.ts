// E4 (UI-3) — the slash-menu command set. A package-LOCAL view-model that unifies two sources without redefining
// `@vida/types.SlashCommand` (BR-7): standard-block commands (authored here, backed by already-registered E1/E2 nodes)
// + the 11 integration-block commands (DERIVED from E1's `INTEGRATION_BLOCK_COMMANDS`, shown DISABLED until E5 lands
// their node-views — the graceful-degradation seam). `@vida/types.SlashCommand.block_type` is `IntegrationBlockType`,
// so it structurally can't describe a standard block — hence this local `SlashMenuItem` (BR-E4-3).
// Spec: LIF-88 · BR-E4-3/4/4a/4b/5/7.
// @tiptap/react `export *`s @tiptap/core, and it (not @tiptap/core, which pnpm doesn't expose directly) is the
// codebase's import site for core types (toolbar.tsx precedent) — DEV-1 correction to preflight F5.
import type { Editor, Range } from '@tiptap/react'
import type { IntegrationBlockType, SlashCommandCategory } from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS } from './commands'
import { CALLOUT_VARIANT, calloutInsertContent, type CalloutVariant } from './extensions/callout'
import { AVAILABLE_INTEGRATION_BLOCKS } from './extensions/integration-blocks'

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
  /** The node a module-block entry inserts (module blocks only — the toolbar's Insert menu reads it, LIF-354). */
  blockType?: IntegrationBlockType
  /** False → a deferred integration block (disabled, unselectable) until its module ships (E5). */
  available: boolean
  /** Dispatch the block. Omitted when `!available`. `range` = the `/query` span to delete first. */
  run?: (editor: Editor, range: Range) => void
}

/** Callout labels, shared by the slash menu and the toolbar's Insert menu (LIF-354). */
export const CALLOUT_TITLE: Record<CalloutVariant, string> = {
  info: 'Info callout',
  success: 'Success callout',
  danger: 'Danger callout',
}
const CALLOUT_DESCRIPTION: Record<CalloutVariant, string> = {
  info: 'A highlighted info panel.',
  success: 'A highlighted success panel.',
  danger: 'A highlighted warning panel.',
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
  // LIF-354 — one entry per callout variant (CALLOUT_VARIANT), so inserting a callout chooses info, success or danger.
  ...CALLOUT_VARIANT.map(
    (variant): SlashMenuItem => ({
      id: variant === 'info' ? 'callout' : `callout-${variant}`,
      title: CALLOUT_TITLE[variant],
      description: CALLOUT_DESCRIPTION[variant],
      icon: 'info',
      keywords: ['callout', 'note', 'aside', 'admonition', 'panel', variant],
      category: 'media',
      available: true,
      // E2 shipped no `setCallout` command (the in-source chain augmentation didn't propagate — E3 DEV-1); insert the
      // exact typed payload. The Callout node is `isolating`, so the inserted slice stays a closed container.
      run: (editor, range) =>
        editor.chain().focus().deleteRange(range).insertContent(calloutInsertContent(variant)).run(),
    }),
  ),
  // Image is intentionally EXCLUDED (BR-E4-4a): `setImage` yields an empty <img> — the attachment pipeline is deferred
  // (BR-E2-5), same reason E3 excluded it. It returns when a URL/upload surface exists.
]

// ── the availability seam (BR-E4-5 → closed by E5) ──────────────────────────────────────────────────────────────
// E5 registered a placeholder node-view for every integration type, so the availability set is now `AVAILABLE_INTEGRATION_BLOCKS`
// from `extensions/integration-blocks.ts` (all 11) — "a deferred entry lights up when E5 registers its node-view". The
// backing set is the SINGLE source (owned by the registry, not re-listed here). MOD-notes #31 may later narrow it.
/** Whether an integration block can be inserted yet — true once E5's node-view exists for it (BR-E5-5). */
export function isBlockAvailable(type: IntegrationBlockType): boolean {
  return AVAILABLE_INTEGRATION_BLOCKS.has(type)
}

// ── integration blocks — DERIVED from E1's data (BR-E4-3), never duplicated ─────────────────────────────────────────
/** The display order of the category groups (one header each — LIF-354). */
export const SLASH_CATEGORY_ORDER: readonly SlashCommandCategory[] = ['basic', 'media', 'platform', 'embed']

/** Stable sort into category groups, so each header renders once (the menu draws a header on every category change). */
function groupByCategory<T extends { category: SlashCommandCategory }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => SLASH_CATEGORY_ORDER.indexOf(a.category) - SLASH_CATEGORY_ORDER.indexOf(b.category))
}

/** The module blocks, shared by the slash menu and the toolbar's Insert menu (LIF-354 — one list, two entry points). */
export const MODULE_BLOCK_ITEMS: readonly SlashMenuItem[] = groupByCategory(
  INTEGRATION_BLOCK_COMMANDS.map((cmd) => {
    const available = isBlockAvailable(cmd.block_type)
    return {
      id: cmd.name,
      blockType: cmd.block_type,
      title: cmd.label,
      description: cmd.description,
      icon: cmd.icon,
      keywords: [cmd.shortcut, cmd.name],
      category: cmd.category,
      available,
      // Available → insert the placeholder node by type (its config attrs fill from their declared defaults — BR-E5-5).
      // Unavailable → `run` stays undefined; Suggestion's command → `item.run?.()` is a no-op.
      ...(available
        ? {
            run: (editor: Editor, range: Range) =>
              editor.chain().focus().deleteRange(range).insertContent({ type: cmd.block_type }).run(),
          }
        : {}),
    }
  }),
)

/** The full slash-menu surface, grouped by category: standard blocks, then the 11 module blocks. */
export const SLASH_MENU_ITEMS: readonly SlashMenuItem[] = groupByCategory([...STANDARD_ITEMS, ...MODULE_BLOCK_ITEMS])

/**
 * How well an item matches `q` (lower = better; `null` = no match). A module block's own shortcut wins (`/task` is the
 * start of `/tasks` → Task checklist), then a title prefix, then a keyword prefix, then any substring (LIF-354).
 */
function matchRank(item: SlashMenuItem, q: string): number | null {
  const title = item.title.toLowerCase()
  const keywords = item.keywords.map((k) => k.toLowerCase())
  if (keywords.some((k) => k.startsWith('/') && k.slice(1).startsWith(q))) return 0
  if (title.startsWith(q)) return 1
  if (keywords.some((k) => k.startsWith(q))) return 2
  if (title.includes(q) || keywords.some((k) => k.includes(q))) return 3
  return null
}

/**
 * Filter by the query typed after `/` (BR-E4-7): case-insensitive SUBSTRING over title + keywords. Empty query → the
 * full list. Results are ranked (`matchRank`) and stay grouped: the group holding the best match comes first, so the
 * top row is the best match and each category header appears once (LIF-354).
 */
export function filterSlashItems(items: readonly SlashMenuItem[], query: string): readonly SlashMenuItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  const ranked = items.flatMap((item, index) => {
    const rank = matchRank(item, q)
    return rank == null ? [] : [{ item, index, rank }]
  })
  const groupRank = new Map<SlashCommandCategory, number>()
  for (const r of ranked) groupRank.set(r.item.category, Math.min(groupRank.get(r.item.category) ?? r.rank, r.rank))
  const groupOf = (c: SlashCommandCategory) => [groupRank.get(c) ?? 0, SLASH_CATEGORY_ORDER.indexOf(c)] as const
  return ranked
    .sort((a, b) => {
      const [ga, oa] = groupOf(a.item.category)
      const [gb, ob] = groupOf(b.item.category)
      return ga - gb || oa - ob || a.rank - b.rank || a.index - b.index
    })
    .map((r) => r.item)
}
