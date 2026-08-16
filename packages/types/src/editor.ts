// ============================================================================
// Editor Types — @vida/types
// TipTap block editor, custom blocks, slash commands, serialization
// architecture.md §3.5 · ADR-001 §8
// ============================================================================

// ---------------------------------------------------------------------------
// Block type enums
// ---------------------------------------------------------------------------

/** Standard TipTap / ProseMirror block types */
export const STANDARD_BLOCK_TYPE = [
  'paragraph',
  'heading',
  'bulletList',
  'orderedList',
  'taskList',
  'blockquote',
  'codeBlock',
  'horizontalRule',
  'image',
  'table',
  'callout',
] as const
export type StandardBlockType = (typeof STANDARD_BLOCK_TYPE)[number]

/** Custom platform integration blocks (slash commands) */
export const INTEGRATION_BLOCK_TYPE = [
  'dailySummary',
  'taskChecklist',
  'eventsBlock',
  'classesBlock',
  'habitsBlock',
  'timelineBlock',
  'chartBlock',
  'pomodoroBlock',
  'entityLink',
  'backlink',
  'milestoneBlock',
] as const
export type IntegrationBlockType = (typeof INTEGRATION_BLOCK_TYPE)[number]

export type BlockType = StandardBlockType | IntegrationBlockType

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

export const EXPORT_FORMAT = ['md', 'pdf', 'docx'] as const
export type ExportFormat = (typeof EXPORT_FORMAT)[number]

// ---------------------------------------------------------------------------
// Daily summary block
// ---------------------------------------------------------------------------

export const DAILY_SUMMARY_SECTION_TYPE = [
  'habits',
  'tasks',
  'study',
  'transactions',
  'interactions',
  'routines',
] as const
export type DailySummarySectionType = (typeof DAILY_SUMMARY_SECTION_TYPE)[number]

export interface DailySummaryBlockAttrs {
  date: string | null
  sections: DailySummarySectionType[]
}

// ---------------------------------------------------------------------------
// Entity link block
// ---------------------------------------------------------------------------

export interface EntityLinkBlockAttrs {
  entityType: string
  entityId: string
  label: string
}

// ---------------------------------------------------------------------------
// Chart block
// ---------------------------------------------------------------------------

export const CHART_TYPE = ['bar', 'line', 'pie', 'doughnut', 'radar'] as const
export type ChartType = (typeof CHART_TYPE)[number]

export interface ChartBlockAttrs {
  chartType: ChartType
  dataSource: string
  config: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Timeline block
// ---------------------------------------------------------------------------

export interface TimelineBlockAttrs {
  entityType: string
  entityIds: string[]
  dateField: string
  labelField: string
}

// ---------------------------------------------------------------------------
// Pomodoro block
// ---------------------------------------------------------------------------

export interface PomodoroBlockAttrs {
  entityType: string | null
  entityId: string | null
  /** Minutes — default 25 */
  work_duration: number
  /** Minutes — default 5 */
  break_duration: number
}

// ---------------------------------------------------------------------------
// Habits block
// ---------------------------------------------------------------------------

export interface HabitsBlockAttrs {
  date: string | null
  /** Filter by time of day */
  filter_time_of_day: string | null
}

// ---------------------------------------------------------------------------
// Task checklist block
// ---------------------------------------------------------------------------

export interface TaskChecklistBlockAttrs {
  /** Filter by project, milestone, or show standalone */
  project_id: string | null
  milestone_id: string | null
  /** Only show tasks due on or before this date */
  due_before: string | null
}

// ---------------------------------------------------------------------------
// Slash command menu
// ---------------------------------------------------------------------------

export interface SlashCommand {
  name: string
  label: string
  description: string
  icon: string
  /** The block type to insert */
  block_type: IntegrationBlockType
  /** Keyboard shortcut hint (e.g. "/summary") */
  shortcut: string
  /** Category for grouping in the menu */
  category: SlashCommandCategory
}

export const SLASH_COMMAND_CATEGORY = ['basic', 'media', 'platform', 'embed'] as const
export type SlashCommandCategory = (typeof SLASH_COMMAND_CATEGORY)[number]

// ---------------------------------------------------------------------------
// Editor state
// ---------------------------------------------------------------------------

/** Serialized TipTap document */
export interface EditorDocument {
  type: 'doc'
  content: EditorNode[]
}

export interface EditorNode {
  type: string
  attrs?: Record<string, unknown>
  content?: EditorNode[]
  marks?: EditorMark[]
  text?: string
}

export interface EditorMark {
  type: string
  attrs?: Record<string, unknown>
}

/** Runtime editor state */
export interface EditorState {
  /** TipTap JSON document */
  content: EditorDocument | null
  /** Yjs binary state for CRDT sync */
  yjs_state: Uint8Array | null
  /** True when local changes haven't been saved to SQLite yet */
  is_dirty: boolean
}

// ---------------------------------------------------------------------------
// Markdown serialization
// ---------------------------------------------------------------------------

export interface MarkdownSerializeOptions {
  /** Include frontmatter (title, date, tags) */
  include_frontmatter: boolean
  /**
   * Emit-side frontmatter values (title/date/tags/…) serialized to the YAML fence when `include_frontmatter` is true.
   * The type owns serialize/parse of the fence, not WHICH keys — the caller supplies them. Symmetric with
   * `MarkdownParseResult.frontmatter` (the parse-side carrier). Additive/optional (E6 · UI-3).
   */
  frontmatter?: Record<string, unknown>
  /** Render integration blocks as HTML comments or skip */
  integration_block_handling: 'comment' | 'skip' | 'placeholder'
}

export interface MarkdownParseResult {
  document: EditorDocument
  frontmatter: Record<string, unknown> | null
  /** Warnings for content that couldn't be parsed */
  warnings: string[]
}

// ---------------------------------------------------------------------------
// PDF serialization (E7 · UI-3)
// ---------------------------------------------------------------------------

export interface PdfSerializeOptions {
  /**
   * How integration blocks render in the PDF. Reuses the Markdown handling literal (no new enum): a PDF has no
   * invisible comment layer, so `'comment'` ≡ `'placeholder'` here (both render the E5 placeholder card); `'skip'`
   * omits the block. Emit-only — no config is encoded (a PDF is never re-imported). Additive (E7 · UI-3).
   */
  integration_block_handling: 'comment' | 'skip' | 'placeholder'
  /**
   * Emit-side header values (title/date/tags/…) rendered as a page-1 header block when present. Symmetric with
   * `MarkdownSerializeOptions.frontmatter` — the caller supplies the keys. Additive/optional.
   */
  frontmatter?: Record<string, unknown>
}
