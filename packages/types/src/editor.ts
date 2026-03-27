// ============================================================================
// Editor Types — @vida/types
// TipTap block editor, custom blocks, slash commands, serialization
// architecture.md §3.5 · ADR-001 §8
// ============================================================================

// ---------------------------------------------------------------------------
// Block type enums
// ---------------------------------------------------------------------------

/** Standard TipTap / ProseMirror block types */
export type StandardBlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'codeBlock'
  | 'horizontalRule'
  | 'image'
  | 'table'
  | 'callout'

/** Custom platform integration blocks (slash commands) */
export type IntegrationBlockType =
  | 'dailySummary'
  | 'taskChecklist'
  | 'eventsBlock'
  | 'classesBlock'
  | 'habitsBlock'
  | 'timelineBlock'
  | 'chartBlock'
  | 'pomodoroBlock'
  | 'entityLink'
  | 'backlink'
  | 'milestoneBlock'

export type BlockType = StandardBlockType | IntegrationBlockType

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

export type ExportFormat = 'md' | 'pdf' | 'docx'

// ---------------------------------------------------------------------------
// Daily summary block
// ---------------------------------------------------------------------------

export type DailySummarySectionType =
  | 'habits'
  | 'tasks'
  | 'study'
  | 'transactions'
  | 'interactions'
  | 'routines'

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

export type ChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'radar'

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

export type SlashCommandCategory =
  | 'basic'
  | 'media'
  | 'platform'
  | 'embed'

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
  /** Render integration blocks as HTML comments or skip */
  integration_block_handling: 'comment' | 'skip' | 'placeholder'
}

export interface MarkdownParseResult {
  document: EditorDocument
  frontmatter: Record<string, unknown> | null
  /** Warnings for content that couldn't be parsed */
  warnings: string[]
}
