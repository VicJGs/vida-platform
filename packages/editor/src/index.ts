// @vida/editor — the TipTap block editor (UI-3). E1 ships the package foundation + editor core spine.
export const EDITOR_VERSION = '0.1.0'

// E1 — editor core.
export { VidaEditor, assertEditorDocument, type VidaEditorProps, type VidaEditorHandle } from './editor'

// E1 — the integration-block command type map (BR-E1-4; the enum→command surface E4's slash menu lists).
export { INTEGRATION_BLOCK_COMMANDS, INTEGRATION_BLOCK_COMMAND_COUNT } from './commands'

// Re-export the shared editor document contract (owned by @vida/types; never redefined — BR-7).
export type { EditorDocument, EditorNode, EditorMark, SlashCommand } from '@vida/types'
