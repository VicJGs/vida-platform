// E1 (UI-3) — <VidaEditor>: the @vida/editor spine. A headless Tiptap React editor in a Tamagui frame that
// renders/edits an EditorDocument (TipTap JSON) and emits changes via onChange. Every later unit (blocks E2,
// toolbar E3, slash-menu E4, registry E5, serializers E6–E8) extends this surface.
// Spec: docs/specs/features/ui-3-vida-editor/e1-editor-core.md · BR-E1-1..5.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  type ForwardRefExoticComponent,
  type RefAttributes,
} from 'react'
import { styled, View } from '@tamagui/core'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import type { Content } from '@tiptap/react'
import type { EditorDocument } from '@vida/types'
import { ensureEditorStyles } from './internal/editor-styles'
import { STANDARD_BLOCK_EXTENSIONS } from './extensions/standard-blocks'
import { INTEGRATION_BLOCK_EXTENSIONS } from './extensions/integration-blocks'
import { SlashCommand, slashActive, slashComboboxAttrs } from './extensions/slash-command'
import { EditorToolbar } from './toolbar'

export interface VidaEditorProps {
  /** Initial document (UNCONTROLLED — see BR-E1-1). Omit → empty doc. */
  defaultValue?: EditorDocument
  /** Emitted on every change: the current doc as TipTap JSON. Wire to pages.content in the app (BR-1). */
  onChange?: (doc: EditorDocument) => void
  /** Read-only when false. Default true. */
  editable?: boolean
  /** Render the formatting toolbar (E3). Default true. Ignored when `editable` is false (no formatting affordance). */
  toolbar?: boolean
  /** Placeholder text for the empty state. */
  placeholder?: string
  /** Accessible name for the textbox (a11y — BR-6). One of these is REQUIRED. */
  'aria-label'?: string
  'aria-labelledby'?: string
}

/** Imperative handle for external/programmatic content resets (NOT per-keystroke — BR-E1-1). */
export interface VidaEditorHandle {
  setContent(doc: EditorDocument): void
  focus(): void
  getDocument(): EditorDocument
}

const EMPTY_DOC: EditorDocument = { type: 'doc', content: [] }

/**
 * Validate a Tiptap `getJSON()` payload against the @vida/types.EditorDocument structural contract at RUNTIME
 * (top-level `type==='doc'`, `content` an array of `{type: string}`). Tiptap returns `JSONContent`; a bare
 * `as EditorDocument` cast would silence a shape drift that reaches E6/persistence undetected (spec §6). Loud by
 * design — with StarterKit this always holds, so a throw here is a real contract breach, caught in tests, not prod noise.
 */
export function assertEditorDocument(json: unknown): EditorDocument {
  if (
    typeof json !== 'object' ||
    json === null ||
    (json as { type?: unknown }).type !== 'doc' ||
    !Array.isArray((json as { content?: unknown }).content)
  ) {
    throw new Error('[VidaEditor] getJSON() did not return a doc-rooted EditorDocument')
  }
  for (const node of (json as { content: unknown[] }).content) {
    if (typeof node !== 'object' || node === null || typeof (node as { type?: unknown }).type !== 'string') {
      throw new Error('[VidaEditor] EditorDocument child node is missing a string `type`')
    }
  }
  return json as EditorDocument
}

// Base-token chrome frame (BR-E1-5). Unnamed styled host → base semantic tokens resolve directly (no sub-theme
// needed; the list-view LV-3 precedent). `borderRadius:'$md'` uses the radius token SCALE, not a sub-theme key
// (DEF-U8-h). `className` threads the injected-CSS hook onto the DOM node.
const EditorFrame = styled(View, {
  backgroundColor: '$colorSurfacePrimary',
  borderColor: '$colorBorderDefault',
  borderWidth: 1,
  borderRadius: '$md',
  paddingHorizontal: '$12',
  paddingVertical: '$8',
  minHeight: 120,
})

function warnMissingName(ariaLabel?: string, ariaLabelledby?: string): void {
  // Dev-time contract guard (NODE_ENV-replaced by the bundler → dead-code-eliminated in prod, per card.tsx).
  if (process.env.NODE_ENV !== 'production' && !ariaLabel && !ariaLabelledby) {
    // eslint-disable-next-line no-console
    console.warn('[VidaEditor] requires an `aria-label` or `aria-labelledby` for its textbox (BR-6, §XIV).')
  }
}

function VidaEditorImpl(props: VidaEditorProps, ref: React.ForwardedRef<VidaEditorHandle>): React.ReactElement {
  const { defaultValue, onChange, editable = true, toolbar = true, placeholder } = props
  const ariaLabel = props['aria-label']
  const ariaLabelledby = props['aria-labelledby']

  ensureEditorStyles()
  warnMissingName(ariaLabel, ariaLabelledby)

  // onChange is read through a ref so an unstable inline handler never recreates the Tiptap editor (which would
  // reset ProseMirror state + cursor). The editor is created ONCE (default `[]` deps).
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  // Host attributes are a FUNCTION of state (not a static object) so the E4 slash menu can flip the host `role`
  // textbox→combobox while it is open (post-impl B1). editorProps.attributes is the SINGLE `role` writer — a plugin
  // cannot override it (ProseMirror consumes view._props before plugins, first-writer-wins), so the combobox ARIA MUST
  // merge here. The base (role=textbox + aria-multiline + name) is the E1 a11y contract; `slashComboboxAttrs` overrides
  // `role`→combobox + adds aria-expanded/controls/haspopup only while the menu is open (`{}` otherwise).
  const baseName: Record<string, string> = {}
  if (ariaLabel) baseName['aria-label'] = ariaLabel
  if (ariaLabelledby) baseName['aria-labelledby'] = ariaLabelledby
  const attributes = (state: import('@tiptap/pm/state').EditorState): Record<string, string> => ({
    role: 'textbox',
    'aria-multiline': 'true',
    ...baseName,
    ...slashComboboxAttrs(slashActive(state)),
  })

  const editor = useEditor({
    // StarterKit + Placeholder (E1 spine) + the E2 standard blocks beyond StarterKit (taskList/image/table/callout).
    // codeBlock/horizontalRule stay owned by StarterKit — never re-added (BR-E2-2, duplicate-node guard).
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? '' }),
      ...STANDARD_BLOCK_EXTENSIONS,
      // E5 — the 11 platform integration nodes (ADR-008 `inline` render surface). Each renders a placeholder node-view
      // until its module body ships (BR-E5-1/4); registering them makes any doc containing an integration block render
      // safely AND flips E4's disabled slash-entries on.
      ...INTEGRATION_BLOCK_EXTENSIONS,
      // E4 — the `/`-triggered slash menu (BR-E4-1). Inert until `/` is typed; a read-only editor can't type, so no
      // editable gate is needed (contrast the always-visible E3 toolbar's render-gate).
      SlashCommand,
    ],
    content: (defaultValue ?? undefined) as Content,
    editable,
    // Defer the first render to a post-mount effect — avoids a StrictMode double-mount render footgun even in our
    // Vite SPA (spec §2). Tests must waitFor(editor.isEditable) before asserting the first onChange.
    immediatelyRender: false,
    editorProps: { attributes },
    onUpdate: ({ editor }) => {
      // Fires on real keystrokes AND once on mount when Tiptap normalizes the seeded content. The mount emit is a
      // benign, idempotent echo of the initial doc (the app persists the value it just seeded — a no-op re-write, not
      // a loop). Programmatic RESETS are silenced at the source (setContent `emitUpdate:false`, BR-E1-1); consumers
      // should dirty-check/dedupe persistence regardless (BR-E1-2 — the app owns persistence). §8 documents this.
      onChangeRef.current?.(assertEditorDocument(editor.getJSON()))
    },
  })

  // `editable` is applied at creation, then kept in sync imperatively (no editor recreation).
  useEffect(() => {
    editor?.setEditable(editable)
  }, [editor, editable])

  useImperativeHandle(
    ref,
    (): VidaEditorHandle => ({
      setContent: (doc) => {
        // `emitUpdate:false` — a programmatic reset is NOT a user edit, so it must not echo through onChange
        // (BR-E1-1: setContent is the external-reset path, distinct from edit emits). Tiptap v3 defaults
        // emitUpdate:true, which would fire onChange on every load and, at M4, feed a Yjs→JSON snapshot straight
        // back to the persistence wire (the BR-2 dead-end). Only real keystrokes should surface as changes.
        editor?.commands.setContent(doc as Content, { emitUpdate: false })
      },
      focus: () => {
        editor?.commands.focus()
      },
      getDocument: () => assertEditorDocument(editor?.getJSON() ?? EMPTY_DOC),
    }),
    [editor],
  )

  return (
    <EditorFrame className="vida-editor-frame">
      {/* E3 toolbar — rendered ONLY when editor is non-null (useEditor is Editor|null under immediatelyRender:false,
          the null-editor gate, BR-E3-1) and the editor is editable + toolbar-enabled. A sibling ABOVE EditorContent,
          NOT inside the contenteditable (the role=textbox is on the inner .ProseMirror). */}
      {toolbar && editable && editor ? (
        <EditorToolbar editor={editor} aria-label={ariaLabel ? `${ariaLabel} formatting` : undefined} />
      ) : null}
      <EditorContent editor={editor} />
    </EditorFrame>
  )
}

export const VidaEditor: ForwardRefExoticComponent<VidaEditorProps & RefAttributes<VidaEditorHandle>> =
  forwardRef(VidaEditorImpl)

export default VidaEditor
