// E3 (UI-3) — <EditorToolbar>: the formatting chrome for <VidaEditor>. A `role="toolbar"` row of controls that
// APPLY formatting commands and REFLECT the active marks/block at the current selection. Composes UI-1 Button + Menu
// (BR-4); active-mark state comes from `useToolbarState` (BR-E3-2). Mounted INSIDE VidaEditorImpl (the raw Editor
// never leaks — BR-E3-1); rendered only when `editor != null` (the null-editor gate).
// Spec: docs/specs/features/ui-3-vida-editor/e3-toolbar.md · BR-E3-1..8.
import {
  forwardRef,
  Fragment,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { styled, View } from '@tamagui/core'
import { Button, Menu, type MenuItem } from '@vida/ui'
import type { Editor } from '@tiptap/react'
import { useToolbarState, type BlockTypeKey } from './internal/toolbar-state'
import { calloutInsertContent } from './extensions/callout'

// ── ToolbarButton ─────────────────────────────────────────────────────────────────────────────
// A ghost UI-1 Button wrapped in a frame that carries the toggle "active/pressed" state as a Tamagui VARIANT
// (BR-E3-3) — NOT an injected/inline style, which loses the specificity race against Button's own `ghost` variant
// (the @vida/ui "prop-driven state = variant" rule). The wrapper is always present (only its bg changes), so a
// toggle never resizes the row. `aria-pressed` is set ONLY for real toggles (`toggle`), never for action buttons.
const ToolbarButtonFrame = styled(View, {
  borderRadius: '$md', // control radius token SCALE (DEF-U8-h), not a sub-theme key
  variants: {
    active: { true: { backgroundColor: '$colorSurfaceSecondary' } },
  } as const,
})

interface ToolbarButtonProps {
  'aria-label': string
  onPress: () => void
  children: ReactNode
  /** Toggle button → expose `aria-pressed` + the active-bg. Omit for one-shot action buttons (undo/redo). */
  toggle?: boolean
  active?: boolean
  disabled?: boolean
  /** Roving-tabindex value threaded by EditorToolbar (0 = the single tab stop, -1 = the rest). */
  tabIndex?: number
}

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton(
  { 'aria-label': ariaLabel, onPress, children, toggle, active, disabled, tabIndex },
  ref,
) {
  return (
    <ToolbarButtonFrame active={!!(toggle && active)}>
      <Button
        ref={ref}
        intent="ghost"
        size="sm"
        disabled={disabled}
        onPress={onPress}
        tabIndex={tabIndex}
        aria-label={ariaLabel}
        {...(toggle ? { 'aria-pressed': !!active } : {})}
      >
        {children}
      </Button>
    </ToolbarButtonFrame>
  )
})

// ── EditorToolbar ─────────────────────────────────────────────────────────────────────────────
const ToolbarRow = styled(View, {
  flexDirection: 'row',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '$4',
  paddingVertical: '$4',
  marginBottom: '$8',
  borderBottomWidth: 1,
  borderColor: '$colorBorderDefault',
})

/** Self-descriptive glyphs for the mark toggles (the `aria-label` is the accessible name; the glyph is decorative
 *  affordance — styled so B reads bold, I italic, U underlined, S struck, code monospace). */
const MARK_GLYPH: Record<string, { text: string; style: CSSProperties }> = {
  bold: { text: 'B', style: { fontWeight: 700 } },
  italic: { text: 'I', style: { fontStyle: 'italic' } },
  underline: { text: 'U', style: { textDecoration: 'underline' } },
  strike: { text: 'S', style: { textDecoration: 'line-through' } },
  code: { text: '</>', style: { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.85em' } },
}

/** Human labels for the block-type Menu trigger + items. */
const BLOCK_LABEL: Record<BlockTypeKey, string> = {
  paragraph: 'Paragraph',
  heading1: 'Heading 1',
  heading2: 'Heading 2',
  heading3: 'Heading 3',
  bulletList: 'Bullet list',
  orderedList: 'Numbered list',
  taskList: 'Task list',
  blockquote: 'Quote',
  codeBlock: 'Code block',
  callout: 'Callout',
}

export interface EditorToolbarProps {
  /** The live Tiptap editor (NON-NULL — the mount site gates on `editor != null`, BR-E3-1). Internal. */
  editor: Editor
  'aria-label'?: string
}

/** A roving-tabindex control descriptor — unifies toggle buttons, Menu triggers, and action buttons. */
interface Control {
  id: string
  enabled: boolean
  render: (opts: { tabIndex: number; ref: (el: HTMLButtonElement | null) => void }) => ReactNode
}

export function EditorToolbar({
  editor,
  'aria-label': ariaLabel = 'Formatting',
}: EditorToolbarProps): React.ReactElement {
  const state = useToolbarState(editor)
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  const [rovingId, setRovingId] = useState('bold')

  const run = (fn: (chain: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>): void => {
    fn(editor.chain().focus()).run()
  }

  const mark = (
    id: string,
    label: string,
    active: boolean,
    enabled: boolean,
    cmd: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>,
  ): Control => ({
    id,
    enabled,
    render: ({ tabIndex, ref }) => (
      <ToolbarButton
        ref={ref}
        tabIndex={tabIndex}
        toggle
        active={active}
        disabled={!enabled}
        onPress={() => run(cmd)}
        aria-label={label}
      >
        <span style={MARK_GLYPH[id]!.style}>{MARK_GLYPH[id]!.text}</span>
      </ToolbarButton>
    ),
  })

  const blockItems: MenuItem[] = [
    { id: 'paragraph', label: 'Paragraph', onSelect: () => run((c) => c.setParagraph()) },
    { id: 'heading1', label: 'Heading 1', onSelect: () => run((c) => c.toggleHeading({ level: 1 })) },
    { id: 'heading2', label: 'Heading 2', onSelect: () => run((c) => c.toggleHeading({ level: 2 })) },
    { id: 'heading3', label: 'Heading 3', onSelect: () => run((c) => c.toggleHeading({ level: 3 })) },
    { id: 'bulletList', label: 'Bullet list', onSelect: () => run((c) => c.toggleBulletList()) },
    { id: 'orderedList', label: 'Numbered list', onSelect: () => run((c) => c.toggleOrderedList()) },
    { id: 'taskList', label: 'Task list', onSelect: () => run((c) => c.toggleTaskList()) },
    { id: 'blockquote', label: 'Quote', onSelect: () => run((c) => c.toggleBlockquote()) },
    { id: 'codeBlock', label: 'Code block', onSelect: () => run((c) => c.toggleCodeBlock()) },
  ]

  const insertItems: MenuItem[] = [
    {
      id: 'table',
      label: 'Table',
      onSelect: () => run((c) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true })),
    },
    // Callout insert via insertContent (DEV: the setCallout node-command augmentation didn't propagate to the
    // toolbar's ChainedCommands type in this pnpm monorepo — see callout.ts); this is the exact payload it would run.
    // Disabled inside a callout (callout is isolating/block+, so it WOULD nest — unwanted).
    {
      id: 'callout',
      label: 'Callout',
      disabled: state.activeBlock === 'callout',
      onSelect: () => run((c) => c.insertContent(calloutInsertContent())),
    },
    { id: 'divider', label: 'Divider', onSelect: () => run((c) => c.setHorizontalRule()) },
  ]

  const controls: Control[] = [
    mark('bold', 'Bold', state.marks.bold, state.can.bold, (c) => c.toggleBold()),
    mark('italic', 'Italic', state.marks.italic, state.can.italic, (c) => c.toggleItalic()),
    mark('underline', 'Underline', state.marks.underline, state.can.underline, (c) => c.toggleUnderline()),
    mark('strike', 'Strikethrough', state.marks.strike, state.can.strike, (c) => c.toggleStrike()),
    mark('code', 'Inline code', state.marks.code, state.can.code, (c) => c.toggleCode()),
    {
      id: 'blockType',
      enabled: true,
      render: ({ tabIndex, ref }) => (
        <Menu
          aria-label="Turn into"
          trigger={
            <Button
              ref={ref}
              tabIndex={tabIndex}
              intent="ghost"
              size="sm"
              aria-label={`Block type: ${BLOCK_LABEL[state.activeBlock]}`}
            >
              {`${BLOCK_LABEL[state.activeBlock]} ▾`}
            </Button>
          }
          items={blockItems}
        />
      ),
    },
    {
      id: 'insert',
      enabled: true,
      render: ({ tabIndex, ref }) => (
        <Menu
          aria-label="Insert"
          trigger={
            <Button ref={ref} tabIndex={tabIndex} intent="ghost" size="sm" aria-label="Insert block">
              Insert ▾
            </Button>
          }
          items={insertItems}
        />
      ),
    },
    {
      id: 'undo',
      enabled: state.can.undo,
      render: ({ tabIndex, ref }) => (
        <ToolbarButton
          ref={ref}
          tabIndex={tabIndex}
          disabled={!state.can.undo}
          onPress={() => run((c) => c.undo())}
          aria-label="Undo"
        >
          ↶
        </ToolbarButton>
      ),
    },
    {
      id: 'redo',
      enabled: state.can.redo,
      render: ({ tabIndex, ref }) => (
        <ToolbarButton
          ref={ref}
          tabIndex={tabIndex}
          disabled={!state.can.redo}
          onPress={() => run((c) => c.redo())}
          aria-label="Redo"
        >
          ↷
        </ToolbarButton>
      ),
    },
  ]

  // Roving tabindex over the LIVE ENABLED set (M3): a single tab stop, and it must never land on a disabled control
  // (that would make the toolbar unreachable). If the remembered control disabled, fall back to the first enabled.
  const enabledIds = controls.filter((c) => c.enabled).map((c) => c.id)
  const effectiveRoving = enabledIds.includes(rovingId) ? rovingId : (enabledIds[0] ?? controls[0]!.id)

  // Reconcile the roving STATE to the effective tab stop when the remembered control leaves the enabled set (post-impl
  // MAT-A/B). Without this, `rovingId` stays a lie (a disabled/absent id), and if that control re-enables the single
  // tab stop teleports back to it. If a toolbar control still OWNS focus, keep focus on a valid stop; NEVER pull focus
  // from the editor (BR-E3-1 / §5 "focus is never stolen") — so only refocus when the active element is a toolbar control.
  useEffect(() => {
    if (effectiveRoving === rovingId) return
    const active = typeof document !== 'undefined' ? document.activeElement : null
    const ownsFocus = !!active && Object.values(refs.current).some((el) => el === active)
    if (ownsFocus) refs.current[effectiveRoving]?.focus()
    setRovingId(effectiveRoving)
  }, [effectiveRoving, rovingId])

  // The roving controller owns ONLY Left/Right/Home/End (M2). ArrowDown/Up are LEFT ALONE — the Menu triggers bind
  // them to open (menu.tsx); consuming them here would swallow the menu-open key.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    const { key } = e
    if (key !== 'ArrowRight' && key !== 'ArrowLeft' && key !== 'Home' && key !== 'End') return
    if (enabledIds.length === 0) return
    const cur = Math.max(0, enabledIds.indexOf(effectiveRoving))
    let next: number
    if (key === 'Home') next = 0
    else if (key === 'End') next = enabledIds.length - 1
    else next = (cur + (key === 'ArrowRight' ? 1 : -1) + enabledIds.length) % enabledIds.length
    e.preventDefault()
    const nextId = enabledIds[next]!
    setRovingId(nextId)
    refs.current[nextId]?.focus()
  }

  return (
    <ToolbarRow role="toolbar" aria-label={ariaLabel} aria-orientation="horizontal" onKeyDown={onKeyDown}>
      {controls.map((c) => (
        <Fragment key={c.id}>
          {c.render({
            tabIndex: c.id === effectiveRoving ? 0 : -1,
            ref: (el) => {
              refs.current[c.id] = el
            },
          })}
        </Fragment>
      ))}
    </ToolbarRow>
  )
}

export default EditorToolbar
