// E1 (UI-3) — <VidaEditor>: the @vida/editor spine. A headless Tiptap React editor in a Tamagui frame that
// renders/edits an EditorDocument (TipTap JSON) and emits changes via onChange. Every later unit (blocks E2,
// toolbar E3, slash-menu E4, registry E5, serializers E6–E8) extends this surface.
// Spec: docs/specs/features/ui-3-vida-editor/e1-editor-core.md · BR-E1-1..5.
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
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
  /** Chrome treatment (fe-codec-canvas-editor #7, S1). `'framed'` (default) = the bordered EditorFrame box.
   *  `'bare'` = transparent, no border/radius/padding — the HOST supplies the surface (the Canvas: Editor notebook
   *  page); the focus-ring-on-frame host + writing flow are preserved. Additive + back-compat (omit ⇒ `'framed'`). */
  chrome?: 'framed' | 'bare'
  /** notes-rescope R0 (BR-R0-3). Called ONCE at mount when the stored document fails the editor's schema (an unknown
   *  node/mark, an empty doc, an empty text node). The editor is then read-only and emits NOTHING through `onChange`
   *  for the rest of the mount — TipTap would otherwise load an EMPTY doc and the host would persist it over the real
   *  content. The host decides what to show (e.g. a read-only notice). Optional + additive. */
  onInvalidContent?: (error: Error) => void
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

  // S1 (#7): `chrome` opens the box for a host-supplied page surface. NOT a built-in style-prop name, so the variant
  // resolves (contrast the DEF-U5-h `padding`-variant collision). `bare` zeroes border/bg/radius/padding; the
  // `.vida-editor-frame` class stays, so the injected focus-ring (`:has(.ProseMirror:focus-visible)`) is untouched.
  variants: {
    chrome: {
      framed: {},
      bare: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        borderRadius: 0,
        paddingHorizontal: 0,
        paddingVertical: 0,
      },
    },
  } as const,

  defaultVariants: { chrome: 'framed' },
})

function warnMissingName(ariaLabel?: string, ariaLabelledby?: string): void {
  // Dev-time contract guard (NODE_ENV-replaced by the bundler → dead-code-eliminated in prod, per card.tsx).
  if (process.env.NODE_ENV !== 'production' && !ariaLabel && !ariaLabelledby) {
    // eslint-disable-next-line no-console
    console.warn('[VidaEditor] requires an `aria-label` or `aria-labelledby` for its textbox (BR-6, §XIV).')
  }
}

function VidaEditorImpl(props: VidaEditorProps, ref: React.ForwardedRef<VidaEditorHandle>): React.ReactElement {
  const { defaultValue, onChange, editable = true, toolbar = true, chrome = 'framed', placeholder } = props
  const ariaLabel = props['aria-label']
  const ariaLabelledby = props['aria-labelledby']

  ensureEditorStyles()
  warnMissingName(ariaLabel, ariaLabelledby)

  // onChange is read through a ref so an unstable inline handler never recreates the Tiptap editor (which would
  // reset ProseMirror state + cursor). The editor is created ONCE (default `[]` deps).
  const onChangeRef = useRef(onChange)
  const onInvalidContentRef = useRef(props.onInvalidContent)
  useEffect(() => {
    onChangeRef.current = onChange
    onInvalidContentRef.current = props.onInvalidContent
  })

  // BR-R0-3: set SYNCHRONOUSLY by `onContentError`, which TipTap emits inside the Editor constructor — before any
  // `update` can fire (core binds the listener before createDoc). The ref gates onUpdate; the state re-renders the
  // read-only/toolbar gates.
  const invalidRef = useRef(false)
  const [invalid, setInvalid] = useState(false)

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
    // BR-R0-3 — always on: a doc the schema rejects raises `contentError` instead of TipTap's silent swap to an empty
    // doc (the C-46 data-loss path). The fallback doc is still empty, so the editor must never emit it.
    enableContentCheck: true,
    onContentError: ({ error }) => {
      invalidRef.current = true
      setInvalid(true)
      onInvalidContentRef.current?.(error)
    },
    onUpdate: ({ editor }) => {
      if (invalidRef.current) return // BR-R0-3: an invalid mount never reaches the host's persistence
      // Fires on real keystrokes AND once on mount when Tiptap normalizes the seeded content. The mount emit is a
      // benign, idempotent echo of the initial doc (the app persists the value it just seeded — a no-op re-write, not
      // a loop). Programmatic RESETS are silenced at the source (setContent `emitUpdate:false`, BR-E1-1); consumers
      // should dirty-check/dedupe persistence regardless (BR-E1-2 — the app owns persistence). §8 documents this.
      onChangeRef.current?.(assertEditorDocument(editor.getJSON()))
    },
  })

  // `editable` is applied at creation, then kept in sync imperatively (no editor recreation). The valid path keeps
  // setEditable's DEFAULT update emit — that is the one benign mount echo hosts dedupe against (BR-E1-2). An invalid
  // mount is forced read-only WITHOUT an emit (setEditable(false, false)); onUpdate's ref guard backs it up.
  useEffect(() => {
    const isInvalid = invalid || invalidRef.current
    editor?.setEditable(editable && !isInvalid, !isInvalid)
  }, [editor, editable, invalid])

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
    <EditorFrame className="vida-editor-frame" chrome={chrome}>
      {/* E3 toolbar — rendered ONLY when editor is non-null (useEditor is Editor|null under immediatelyRender:false,
          the null-editor gate, BR-E3-1) and the editor is editable + toolbar-enabled. A sibling ABOVE EditorContent,
          NOT inside the contenteditable (the role=textbox is on the inner .ProseMirror). */}
      {toolbar && editable && !invalid && editor ? (
        <EditorToolbar editor={editor} aria-label={ariaLabel ? `${ariaLabel} formatting` : undefined} />
      ) : null}
      <EditorContent editor={editor} />
    </EditorFrame>
  )
}

export const VidaEditor: ForwardRefExoticComponent<VidaEditorProps & RefAttributes<VidaEditorHandle>> =
  forwardRef(VidaEditorImpl)

export default VidaEditor
