// E3 (UI-3) — the toolbar's reactive state slice. E1 runs Tiptap v3's default `shouldRerenderOnTransaction:false`,
// so the React tree does NOT re-render per transaction (spec BR-E3-2). The toolbar subscribes to a SELECTED slice via
// `useEditorState({ editor, selector })` — it re-renders ONLY when a reflected value (active mark, active block,
// can-undo) changes, not on every keystroke.
//   ⚠ MAT-2: `useEditorState` gates the RE-RENDER, not the selector COMPUTE. The selector runs on every transaction
//   and does O(controls) `isActive`/`can()` probes (each `can()` builds a throwaway state). Standard Tiptap-toolbar
//   practice, fine for normal docs; if a perf pass shows jank on large docs, narrow/memoize the probe set.
// Spec: docs/specs/features/ui-3-vida-editor/e3-toolbar.md · BR-E3-2/BR-E3-5.
import { useEditorState, type Editor } from '@tiptap/react'

/** The block type at the current selection — drives the block-type Menu's trigger label. */
export type BlockTypeKey =
  | 'paragraph'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'codeBlock'
  | 'callout'

/**
 * Resolve the active block at the current selection. Order matters: check the most specific first (heading level,
 * taskList before the generic list checks — a taskList is a `list` too), falling back to `paragraph`.
 * `taskList` nests inside a `taskItem`, so `isActive('taskList')` reflects the enclosing list, not the item (N3).
 */
export function resolveActiveBlock(editor: Editor): BlockTypeKey {
  if (editor.isActive('heading', { level: 1 })) return 'heading1'
  if (editor.isActive('heading', { level: 2 })) return 'heading2'
  if (editor.isActive('heading', { level: 3 })) return 'heading3'
  if (editor.isActive('taskList')) return 'taskList'
  if (editor.isActive('bulletList')) return 'bulletList'
  if (editor.isActive('orderedList')) return 'orderedList'
  if (editor.isActive('codeBlock')) return 'codeBlock'
  if (editor.isActive('blockquote')) return 'blockquote'
  if (editor.isActive('callout')) return 'callout'
  return 'paragraph'
}

/** Reflected state the toolbar renders from. Flat + primitive so `useEditorState`'s default deepEqual is cheap. */
export interface ToolbarState {
  marks: { bold: boolean; italic: boolean; underline: boolean; strike: boolean; code: boolean }
  can: { bold: boolean; italic: boolean; underline: boolean; strike: boolean; code: boolean; undo: boolean; redo: boolean }
  activeBlock: BlockTypeKey
}

/** Pure selector — exported for unit testing without a React render. */
export function selectToolbarState(editor: Editor): ToolbarState {
  return {
    marks: {
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      strike: editor.isActive('strike'),
      code: editor.isActive('code'),
    },
    can: {
      bold: editor.can().toggleBold(),
      italic: editor.can().toggleItalic(),
      underline: editor.can().toggleUnderline(),
      strike: editor.can().toggleStrike(),
      code: editor.can().toggleCode(),
      undo: editor.can().undo(),
      redo: editor.can().redo(),
    },
    activeBlock: resolveActiveBlock(editor),
  }
}

/** Subscribe the toolbar to the reflected editor-state slice (re-renders only on a reflected-value change). */
export function useToolbarState(editor: Editor): ToolbarState {
  return useEditorState({
    editor,
    selector: ({ editor }) => selectToolbarState(editor),
  })
}
