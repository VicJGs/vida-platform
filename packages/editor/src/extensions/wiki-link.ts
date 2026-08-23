// MOD-notes ②c (LIF-131) — the `[[` wiki-link surface. Two extensions:
//   • `WikiLinkMark` — the inline `wikiLink` MARK (the shipped `link`-mark shape, carrying `targetPageId` not `href`).
//     Registered UNCONDITIONALLY so any note content with wiki-links renders (a mark not in the schema is dropped on
//     load). NP-7: the link is stored by id, never resolved by title at render.
//   • `WikiLink` — the `[[` Suggestion surface (the sibling of E4's `SlashCommand`; e4-slash-menu.md:31 homed the
//     `[[wiki-link]]` autocomplete here). GATED on an injected `config` — no config → no plugin (zero cost for editors
//     without a picker). Data is INJECTED (query/onCreate/onSelect) so `@vida/editor` keeps its no-`@vida/core` boundary.
// Spec: docs/specs/features/mod-notes/sessions/{PLAN,IMPLEMENTATION-PLAN}-2026-08-21-02c-editor-mount.md · WL-1…WL-6.
import { Extension, Mark, ReactRenderer, mergeAttributes, type Editor, type Range } from '@tiptap/react'
import { PluginKey, type EditorState } from '@tiptap/pm/state'
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion'
import { WIKI_LISTBOX_ID, WikiLinkMenu, type WikiLinkMenuHandle, type WikiLinkMenuProps } from '../wiki-link-menu'

/** A page (or, forward-compat for the ②d entity variant, an entity) the `[[` picker can link to. */
export interface WikiLinkCandidate {
  id: string
  title: string
  /** ②d forward-compat (G6-tentative entity variant re-enters THIS picker) — unused at M1.0. */
  entityType?: string
  entityId?: string
}

/** The create-on-miss sentinel the popup passes into `command` (WL-3). */
export interface WikiLinkCreateRequest {
  __create: string
}

/** Injected app data (WL-4) — `@vida/editor` never imports `@vida/core`; the app wires these to the Notes service. */
export interface WikiLinkConfig {
  /** Title candidates for `text` (the app's `resolveWikiLink`); `signal` cancels a stale in-flight query. */
  query(text: string, signal: AbortSignal): Promise<WikiLinkCandidate[]>
  /** Create-on-miss (the app's `createPage({type:'note',title})`) → the new candidate. */
  onCreate(text: string): Promise<WikiLinkCandidate>
  /** Persist the page_links row (the app's `createPageLink(currentPageId, candidate.id)`) — WL-2b: this runs BEFORE the mark. */
  onSelect(candidate: WikiLinkCandidate): Promise<void>
}

/** Shared by the Suggestion plugin + `wikiActive` (which reads its `active` state for the host combobox ARIA). */
export const WikiSuggestionPluginKey = new PluginKey('vidaWikiLink')

/** Strip a user-typed trailing `]]` (or stray `]`) from the raw suggestion query — `allowSpaces:true` pulls it into
 *  the match, so the clean title is what the search + the "+ Create" label should use. */
export function stripWikiClose(query: string): string {
  return query.replace(/\]+$/, '')
}

/**
 * Resolve a selection to a candidate (create-on-miss), persist the page_links row, then apply the `wikiLink` mark —
 * IN THAT ORDER (WL-2b): the row is written FIRST (idempotent), the mark SECOND, so content never renders a link with
 * no backing row; if `onSelect`/`onCreate` reject, this throws BEFORE the mark → no partial write. Extracted (not inline
 * in the Suggestion `command`) so the order + failure path are unit-testable without driving the full Suggestion flow.
 */
export async function applyWikiSelection(
  editor: Editor,
  range: Range,
  props: WikiLinkCandidate | WikiLinkCreateRequest,
  cfg: WikiLinkConfig,
): Promise<void> {
  const candidate: WikiLinkCandidate = '__create' in props ? await cfg.onCreate(props.__create) : props // WL-3
  await cfg.onSelect(candidate) // WL-2b — row FIRST; a rejection throws here, before any mark
  // `range` covers the whole `[[query`, incl. any typed closing `]]` (allowSpaces:true → the `]]` is inside the match),
  // so a single deleteRange clears it; then insert the marked text ATOMICALLY (PF#3 — no stored-mark dance).
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent({
      type: 'text',
      text: candidate.title,
      marks: [{ type: 'wikiLink', attrs: { targetPageId: candidate.id, label: candidate.title } }],
    })
    .run()
}

// ── the `wikiLink` MARK ─────────────────────────────────────────────────────────────────────────────────────────────
export const WikiLinkMark = Mark.create({
  name: 'wikiLink',
  inclusive: false, // typing AFTER a wiki-link is not part of it (the `link`-mark convention)
  addAttributes() {
    return {
      targetPageId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-target-page-id'),
        renderHTML: (attrs) =>
          attrs.targetPageId ? { 'data-target-page-id': attrs.targetPageId as string } : {},
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-label') ?? el.textContent,
        renderHTML: () => ({}), // the label IS the wrapped text; not re-emitted as an attr
      },
    }
  },
  parseHTML() {
    return [{ tag: 'a[data-wikilink]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes({ 'data-wikilink': '', class: 'vida-wikilink' }, HTMLAttributes), 0]
  },
})

// ── host combobox ARIA (merged in editor.tsx's editorProps.attributes — the single `role` writer; the slash precedent) ─
/** Whether the `[[` picker is open (reads the plugin's own state). */
export function wikiActive(state: EditorState): boolean {
  const s = WikiSuggestionPluginKey.getState(state) as { active?: boolean } | undefined
  return !!s?.active
}
/** The editor host's combobox ARIA while the picker is open, else `{}`. Merged INTO editorProps.attributes (a plugin
 *  cannot override the host `role` — first-writer-wins; the slashComboboxAttrs lesson). */
export function wikiComboboxAttrs(active: boolean): Record<string, string> {
  return active
    ? { role: 'combobox', 'aria-expanded': 'true', 'aria-controls': WIKI_LISTBOX_ID, 'aria-haspopup': 'listbox' }
    : {}
}

// ── the Suggestion render lifecycle (a ReactRenderer popup, mirroring E4's createRenderer) ──────────────────────────
type WikiSuggestionProps = SuggestionProps<WikiLinkCandidate, WikiLinkCandidate | WikiLinkCreateRequest>

function toMenuProps(props: WikiSuggestionProps): WikiLinkMenuProps {
  return {
    candidates: props.items,
    command: props.command,
    editor: props.editor,
    query: props.query,
    // @tiptap/suggestion 3.30 exposes `loading` while an async `items` promise is pending.
    loading: (props as unknown as { loading?: boolean }).loading ?? false,
  }
}

function createWikiRenderer() {
  let component: ReactRenderer<WikiLinkMenuHandle, WikiLinkMenuProps> | null = null
  let unmount: (() => void) | null = null
  return {
    onStart: (props: WikiSuggestionProps) => {
      component = new ReactRenderer<WikiLinkMenuHandle, WikiLinkMenuProps>(WikiLinkMenu, {
        props: toMenuProps(props),
        editor: props.editor,
      })
      unmount = props.mount(component.element)
    },
    onUpdate: (props: WikiSuggestionProps) => {
      component?.updateProps(toMenuProps(props))
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === 'Escape') {
        exitSuggestion(props.view, WikiSuggestionPluginKey)
        return true
      }
      if (props.event.key === 'Tab') {
        exitSuggestion(props.view, WikiSuggestionPluginKey) // close, don't trap
        return false
      }
      return component?.ref?.onKeyDown(props) ?? false
    },
    onExit: () => {
      unmount?.()
      unmount = null
      component?.destroy()
      component = null
    },
  }
}

// ── the `[[` Suggestion Extension (gated on an injected config) ─────────────────────────────────────────────────────
export interface WikiLinkOptions {
  config: WikiLinkConfig | null
}

export const WikiLink = Extension.create<WikiLinkOptions>({
  name: 'wikiLinkSuggestion',
  addOptions() {
    return { config: null }
  },
  addProseMirrorPlugins() {
    const cfg = this.options.config
    if (!cfg) return [] // no config → the picker is off (zero cost)
    return [
      Suggestion<WikiLinkCandidate, WikiLinkCandidate | WikiLinkCreateRequest>({
        editor: this.editor,
        pluginKey: WikiSuggestionPluginKey,
        char: '[[', // findSuggestionMatch regex-escapes → `\[\[…`; query = match.slice(2) (WL-1)
        allowSpaces: true,
        startOfLine: false,
        allowedPrefixes: null, // ⚠ default [' '] suppresses mid-word `[[`; null = trigger anywhere (PF#2)
        debounce: 150, // coalesce keystrokes before hitting resolveWikiLink (IMPL-PLAN C2)
        allow: ({ editor }) => !editor.isActive('codeBlock'),
        // `query` includes any typed closing `]]` (allowSpaces:true) → strip trailing `]` so the search + "+ Create"
        // label use the clean title; async + the plugin's own AbortSignal; a failed query degrades to "keep typing".
        items: ({ query, signal }) => cfg.query(stripWikiClose(query), signal).catch(() => []),
        // Fire-and-forget the async apply (Suggestion's command is sync); a rejection is swallowed → no mark, no partial.
        command: ({ editor, range, props }) => {
          void applyWikiSelection(editor, range, props, cfg).catch(() => {})
        },
        render: createWikiRenderer,
      }),
    ]
  },
})

export default WikiLink
