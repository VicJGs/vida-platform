// MOD-notes ② · B3 (LIF-131) — the `[[` wiki-link surface. Two extensions + a pure, testable apply:
//   • `WikiLinkMark` — the inline `wikiLink` MARK carrying `targetPageId` (NP-7: stored by id, never resolved by title
//     at render). Registered UNCONDITIONALLY in editor.tsx so any note content with a wiki-link renders (a mark not in
//     the schema is dropped on load) — the E5 "register so content renders" precedent (BR-B3-4).
//   • `WikiLink` — the `[[` `@tiptap/suggestion` surface, the sibling of E4's `SlashCommand` (e4-slash-menu.md:31 homed
//     the `[[` autocomplete to MOD-notes). GATED on an injected `config` — no config → no plugin (zero cost). Data is
//     INJECTED (query/onCreate/onSelect) so `@vida/editor` keeps its no-`@vida/core` boundary (BR-B3-2).
// Fresh rebuild — the discontinued `1dae63a` impl is REFERENCE ONLY (it swallowed the write error; here the write is
// fail-loud via the app's mutation-hook onError, and `applyWikiSelection` guarantees no-mark-on-reject — BR-B3-5).
// Spec: docs/specs/features/mod-notes/ui-ux/b3-note-link-picker.md · BR-B3-1..12.
import { Extension, Mark, ReactRenderer, mergeAttributes, type Editor, type Range } from '@tiptap/react'
import { PluginKey, type EditorState } from '@tiptap/pm/state'
import Suggestion, {
  exitSuggestion,
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion'
import { WIKI_LISTBOX_ID, WikiLinkMenu, type WikiLinkMenuHandle, type WikiLinkMenuProps } from '../wiki-link-menu'

/** A page the `[[` picker can link to (mapped app-side from a `PageRow`). */
export interface WikiLinkCandidate {
  id: string
  title: string
}

/** The create-on-miss sentinel the popup passes into `command` (BR-B3-6). */
export interface WikiLinkCreateRequest {
  __create: string
}

/** Injected app data (BR-B3-2) — `@vida/editor` never imports `@vida/core`; the app wires these to the Notes service. */
export interface WikiLinkConfig {
  /** Title candidates for `text` (the app's `resolveWikiLink`); `signal` cancels a stale in-flight query. */
  query(text: string, signal: AbortSignal): Promise<WikiLinkCandidate[]>
  /** Create-on-miss (the app's `createPage({type:'note',title})`) → the new candidate (BR-B3-6). */
  onCreate(text: string): Promise<WikiLinkCandidate>
  /** Persist the page_links row (the app's `createPageLink(currentPageId, candidate.id)`) — runs BEFORE the mark (BR-B3-5). */
  onSelect(candidate: WikiLinkCandidate): Promise<void>
}

/** Shared by the Suggestion plugin + `wikiActive` (which reads its `active` state for the host combobox ARIA). */
export const WikiSuggestionPluginKey = new PluginKey('vidaWikiLink')

/** Strip a user-typed trailing `]]` (or stray `]`) from the raw suggestion query (D-5): `allowSpaces:true` pulls it
 *  into the match, so the clean title is what the search + the "+ Create" label should use. */
export function stripWikiClose(query: string): string {
  return query.replace(/\]+$/, '')
}

/**
 * Resolve a selection → persist the `page_links` row → THEN apply the `wikiLink` mark, IN THAT ORDER (BR-B3-5): the row
 * is written first (idempotent, NP-5), the mark second, so content never renders a link with no backing row; if
 * `onSelect`/`onCreate` reject, this THROWS before the mark → no partial write (the app's mutation-hook `onError` Toast
 * surfaces the failure — never swallowed). Extracted from the Suggestion `command` so the order + failure path are
 * unit-testable without driving the full Suggestion flow.
 */
export async function applyWikiSelection(
  editor: Editor,
  range: Range,
  props: WikiLinkCandidate | WikiLinkCreateRequest,
  cfg: WikiLinkConfig,
): Promise<void> {
  const candidate: WikiLinkCandidate = '__create' in props ? await cfg.onCreate(props.__create) : props // BR-B3-6
  await cfg.onSelect(candidate) // BR-B3-5 — row FIRST; a rejection throws here, before any mark
  // `range` covers the whole `[[query` (incl. a typed closing `]]` — allowSpaces:true pulls it into the match), so a
  // single deleteRange clears it; then insert the marked text ATOMICALLY (no stored-mark dance). NP-7: the mark stores
  // `targetPageId`; the display text is the captured title.
  editor
    .chain()
    .focus()
    .deleteRange(range)
    .insertContent({
      type: 'text',
      text: candidate.title,
      marks: [{ type: 'wikiLink', attrs: { targetPageId: candidate.id } }],
    })
    .run()
}

// ── the `wikiLink` MARK (BR-B3-4) ───────────────────────────────────────────────────────────────────────────────────
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
    }
  },
  // Discriminated by `data-wikilink` so it never claims a plain `<a href>` (StarterKit's `link` mark owns those —
  // disjoint: a wiki-link has no href; the E5 getAttrs-discriminator class, A-2).
  parseHTML() {
    return [{ tag: 'a[data-wikilink]' }]
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', mergeAttributes({ 'data-wikilink': '', class: 'vida-wikilink' }, HTMLAttributes), 0]
  },
})

// ── host combobox ARIA (merged in editor.tsx's editorProps.attributes — the single `role` writer, BR-B3-9) ───────────
/** Whether the `[[` picker is open (reads the plugin's own state). */
export function wikiActive(state: EditorState): boolean {
  const s = WikiSuggestionPluginKey.getState(state) as { active?: boolean } | undefined
  return !!s?.active
}
/** The editor host's combobox ARIA while the picker is open, else `{}`. Merged INTO editorProps.attributes — a plugin
 *  cannot override the host `role` (first-writer-wins; the slashComboboxAttrs lesson). */
export function wikiComboboxAttrs(active: boolean): Record<string, string> {
  return active
    ? { role: 'combobox', 'aria-expanded': 'true', 'aria-controls': WIKI_LISTBOX_ID, 'aria-haspopup': 'listbox' }
    : {}
}

// ── the Suggestion render lifecycle (a ReactRenderer popup — mirrors E4's createRenderer) ────────────────────────────
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

// ── the `[[` Suggestion Extension (gated on an injected config, BR-B3-2) ─────────────────────────────────────────────
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
        char: '[[', // multi-char: findSuggestionMatch regex-escapes → `\[\[…`; query = match.slice(2) (BR-B3-1)
        allowSpaces: true, // titles carry spaces — deliberate divergence from E4's false (D-5)
        startOfLine: false,
        allowedPrefixes: null, // ⚠ default [' '] suppresses mid-word `[[`; null = trigger anywhere
        debounce: 150, // coalesce keystrokes before hitting resolveWikiLink (BR-B3-8); the plugin also aborts stale queries
        allow: ({ editor }) => !editor.isActive('codeBlock'),
        // `query` includes any typed closing `]]` → strip it so the search + "+ Create" label use the clean title;
        // async + the plugin's AbortSignal; a failed query degrades to `[]` ("keep typing" — the ONE doc-sanctioned
        // soft-fail, BR-B3-8).
        items: ({ query, signal }) => cfg.query(stripWikiClose(query), signal).catch(() => []),
        // Suggestion's `command` is sync; fire the async apply. A rejection here is ALREADY surfaced by the app's
        // mutation-hook `onError` Toast (BR-B3-5) — this `.catch` only prevents an unhandled rejection on the
        // already-handled promise; `applyWikiSelection` guarantees no mark was inserted.
        command: ({ editor, range, props }) => {
          void applyWikiSelection(editor, range, props, cfg).catch(() => {})
        },
        render: createWikiRenderer,
      }),
    ]
  },
})

export default WikiLink
