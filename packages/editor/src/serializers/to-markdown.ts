// E6 (UI-3) — the TipTap-JSON → Markdown emitter. Half of the CUSTOM serializer ADR-001 §8 mandates ("custom
// serializer, round-trip lossless"); NO off-the-shelf markdown bridge (@tiptap/markdown / turndown) — see BR-E6-1.
// This side DEFINES the ONE canonical spelling; `from-markdown.ts` is its exact inverse (BR-E6-2), so the round-trip
// grammar is CLOSED and no general-GFM lexer is ever needed (BR-E6-8, the dissolved hazard).
// Pure/headless/deterministic (BR-E6-7): EditorDocument JSON in, string out — no Editor, no DOM.
// Spec: docs/specs/features/ui-3-vida-editor/e6-markdown-serializers.md.
import type { EditorDocument, EditorNode, EditorMark, MarkdownSerializeOptions } from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS } from '../commands'

// ── integration-block metadata (editor-local; the E1 command DATA, BR-E6-8 permits editor-local imports) ──────────────
const INTEGRATION_LABEL = new Map(INTEGRATION_BLOCK_COMMANDS.map((c) => [c.block_type as string, c.label]))
/** The 11 integration node names — anything in this set routes through `integration_block_handling`, not a block handler. */
export const INTEGRATION_NODE_NAMES: ReadonlySet<string> = new Set(
  INTEGRATION_BLOCK_COMMANDS.map((c) => c.block_type as string),
)

// ── inline (marks + text + hardBreak) ────────────────────────────────────────────────────────────────────────────────
// Inline-active characters escaped in every non-code text run so `from-markdown` reads them as literals, not markup.
// The set is exactly the inline markup this emitter can PRODUCE: backslash, emphasis (`*`/`_`), code (`` ` ``), link
// brackets (`[`/`]`), HTML (`<`/`>`), strike/fence (`~`). Block-start markers (`#`/`-`/`+`/`|`/digit.) are guarded
// separately at paragraph line-start (they're only ambiguous there). Symmetric with `unescapeInline` in from-markdown.
const INLINE_ESCAPE = /[\\`*_[\]<>~]/g

function escapeText(s: string): string {
  return s.replace(INLINE_ESCAPE, '\\$&')
}

/** A literal inline code span. Fence = one backtick longer than the longest backtick run inside; pad if it hugs one. */
function codeSpan(text: string): string {
  const longest = (text.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0)
  const fence = '`'.repeat(longest + 1)
  const pad = text.startsWith('`') || text.endsWith('`') || text === '' ? ' ' : ''
  return `${fence}${pad}${text}${pad}${fence}`
}

// Outer→inner nesting order for a text node carrying multiple marks. `code` is handled first (literal span) so the
// others wrap around it; the rest wrap innermost→outermost by this order for a DETERMINISTIC canonical spelling.
const MARK_ORDER = ['link', 'wikiLink', 'bold', 'italic', 'underline', 'strike'] as const

function markRank(type: string): number {
  const i = (MARK_ORDER as readonly string[]).indexOf(type)
  return i === -1 ? MARK_ORDER.length : i
}

function wrapMark(inner: string, mark: EditorMark): string {
  switch (mark.type) {
    case 'bold':
      return `**${inner}**`
    case 'italic':
      // `_` (not `*`) for italic: with bold always the OUTER mark (MARK_ORDER), bold+italic → `**_b_**`, which is
      // unambiguous to the parser — it dissolves the classic `*`/`**` stacking ambiguity (`***b***`). A literal `*`/`_`
      // is always escaped by `escapeText`, so an unescaped `_` is only ever an italic delimiter (BR-E6-2 canonical form).
      return `_${inner}_`
    case 'strike':
      return `~~${inner}~~`
    case 'underline':
      return `<u>${inner}</u>`
    case 'wikiLink':
      // EMIT-ONLY (MOD-notes ②c / WL-6): the display label bracketed. `targetPageId` lives in the JSON (NP-7), NOT in
      // markdown — `from-markdown` has no `[[…]]` rule, so md→JSON reads this as literal text (declared non-identity;
      // markdown is a human/export view). PDF/DOCX likewise degrade to the text.
      return `[[${inner}]]`
    case 'link': {
      // Only `href` round-trips through Markdown; `target`/`rel`/`class` are lossy by construction (BR-E6-3).
      // Escape `)` (and `\`) in the href so a parenthesised URL survives the closed-grammar round-trip (post-impl M2).
      const href = String((mark.attrs?.href as string | undefined) ?? '').replace(/[\\)]/g, '\\$&')
      return `[${inner}](${href})`
    }
    default:
      return inner // unknown mark → drop the mark, keep the text (degrade, never crash — BR-E6-9)
  }
}

function renderTextNode(node: EditorNode): string {
  const text = node.text ?? ''
  const marks = node.marks ?? []
  const hasCode = marks.some((m) => m.type === 'code')
  // code span is the literal core (NOT markdown-escaped — a code span is literal); other marks wrap around it.
  let core = hasCode ? codeSpan(text) : escapeText(text)
  const others = marks.filter((m) => m.type !== 'code').sort((a, b) => markRank(a.type) - markRank(b.type))
  // wrap innermost (highest rank) → outermost (lowest rank)
  for (let i = others.length - 1; i >= 0; i--) core = wrapMark(core, others[i]!)
  return core
}

function serializeInline(nodes: EditorNode[] | undefined): string {
  if (!nodes) return ''
  let out = ''
  for (const n of nodes) {
    // Skip empty text runs — ProseMirror forbids them, but a defensive skip avoids emitting a `[](href)` husk for
    // a mark on a zero-length run (post-impl B2).
    if (n.type === 'text') {
      if ((n.text ?? '') === '') continue
      out += renderTextNode(n)
    } else if (n.type === 'hardBreak') out += '  \n' // GFM hard break: two trailing spaces + newline (BR-E6-3)
    else out += '' // no other inline nodes in the E1–E5 schema
  }
  return out
}

// ── frontmatter (BR-E6-6) ────────────────────────────────────────────────────────────────────────────────────────────
function renderFrontmatterValue(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => String(x)).join(', ')}]`
  return String(v)
}

function renderFrontmatter(fm: Record<string, unknown>): string {
  const lines = Object.entries(fm).map(([k, v]) => `${k}: ${renderFrontmatterValue(v)}`)
  return `---\n${lines.join('\n')}\n---\n\n`
}

// ── blocks ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// A leading token that from-markdown would read as a block start (heading/list/quote/table/HR). `---`/`***`/`___`
// (HR spellings) are included so a paragraph that is literally `---` round-trips as prose, not a horizontalRule
// (post-impl B1); the `-` in `---` isn't in INLINE_ESCAPE, so without this guard it emits raw and re-parses as an HR.
const BLOCK_START_GUARD = /^(---|\*\*\*|___|#{1,6} |[-+] |\d+[.)] |\||> )/

/** A paragraph's inline, each line's leading block-marker escaped so it round-trips as prose, not a block (BR-E6-4). */
function serializeParagraphText(node: EditorNode): string {
  // Guard EVERY line (a paragraph can span lines across a hardBreak, e.g. a `---` after a soft break — probe AA).
  return serializeInline(node.content)
    .split('\n')
    .map((line) => line.replace(BLOCK_START_GUARD, '\\$&'))
    .join('\n')
}

function indent(block: string, prefix: string, firstPrefix = prefix): string {
  const lines = block.split('\n')
  return lines.map((l, i) => (i === 0 ? firstPrefix : prefix) + l).join('\n')
}

function serializeListItemChildren(children: EditorNode[] | undefined): string {
  // A list item's first child is a paragraph (its text); further children (nested lists, extra paragraphs) follow.
  const parts = (children ?? []).map((child) =>
    child.type === 'paragraph' ? serializeParagraphText(child) : serializeBlock(child),
  )
  return parts.join('\n')
}

function serializeCallout(node: EditorNode): string {
  const variant = String((node.attrs?.variant as string | undefined) ?? 'info')
  const inner = (node.content ?? []).map((c) => serializeBlock(c)).join('\n\n')
  return `<div data-type="callout" data-variant="${variant}">\n${inner}\n</div>`
}

/** Escape a JSON payload so it survives inside a single-quoted HTML-comment attr and can't close the comment.
 *  `&` is escaped FIRST (and un-escaped LAST on parse) so a literal `&#39;` in a config value round-trips (post-impl m1). */
function escapeCommentAttr(json: string): string {
  return json.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/--/g, '&#45;&#45;')
}

/** Integration atom → one of the three `integration_block_handling` shapes (BR-E6-5). */
function serializeIntegration(node: EditorNode, options: MarkdownSerializeOptions): string {
  const type = node.type
  const label = INTEGRATION_LABEL.get(type) ?? type
  switch (options.integration_block_handling) {
    case 'skip':
      return '' // omitted (declared-lossy)
    case 'placeholder':
      return `> **[${label}]** — integration block` // visible marker (declared-lossy)
    case 'comment':
    default: {
      // Lossless for the declared schema: config = node.attrs read straight from JSON (no HTML-DOM detour, so the
      // E5 `rendered:false` is a non-issue). `config` omitted when the node is attr-less (the 4 schema-less types).
      const attrs = node.attrs ?? {}
      const hasConfig = Object.keys(attrs).length > 0
      const config = hasConfig ? ` config='${escapeCommentAttr(JSON.stringify(attrs))}'` : ''
      return `<!-- vida:integration type="${type}"${config} -->`
    }
  }
}

function serializeTable(node: EditorNode): string {
  const rows = node.content ?? []
  if (rows.length === 0) return ''
  const renderRow = (row: EditorNode): string => {
    const cells = row.content ?? []
    const rendered = cells.map((cell) => {
      // A GFM cell is inline-only: take the inline of the cell's paragraph(s), pipes escaped, newlines flattened.
      const text = (cell.content ?? [])
        .map((p) => (p.type === 'paragraph' ? serializeInline(p.content) : serializeBlock(p)))
        .join(' ')
      return text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    })
    return `| ${rendered.join(' | ')} |`
  }
  const header = rows[0]!
  const colCount = (header.content ?? []).length
  const delimiter = `| ${Array.from({ length: colCount }, () => '---').join(' | ')} |`
  const body = rows.slice(1).map(renderRow)
  return [renderRow(header), delimiter, ...body].join('\n')
}

let currentOptions: MarkdownSerializeOptions = { include_frontmatter: false, integration_block_handling: 'placeholder' }

function serializeBlock(node: EditorNode): string {
  switch (node.type) {
    case 'paragraph':
      return serializeParagraphText(node)
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)))
      return `${'#'.repeat(level)} ${serializeInline(node.content)}`
    }
    case 'bulletList':
      return (node.content ?? [])
        .map((item) => indent(serializeListItemChildren(item.content), '  ', '- '))
        .join('\n')
    case 'orderedList': {
      const start = Number(node.attrs?.start ?? 1)
      return (node.content ?? [])
        .map((item, i) => {
          const marker = `${start + i}. `
          return indent(serializeListItemChildren(item.content), ' '.repeat(marker.length), marker)
        })
        .join('\n')
    }
    case 'taskList':
      return (node.content ?? [])
        .map((item) => {
          const box = item.attrs?.checked ? '- [x] ' : '- [ ] '
          return indent(serializeListItemChildren(item.content), '  ', box)
        })
        .join('\n')
    case 'blockquote': {
      const inner = (node.content ?? []).map((c) => serializeBlock(c)).join('\n\n')
      return inner
        .split('\n')
        .map((l) => (l ? `> ${l}` : '>'))
        .join('\n')
    }
    case 'codeBlock': {
      const lang = node.attrs?.language ? String(node.attrs.language) : ''
      const code = (node.content ?? []).map((c) => c.text ?? '').join('')
      // Fence = one backtick longer than the longest backtick run in the body (min 3), so a ``` line INSIDE the code
      // can't close the block early (CommonMark variable-fence rule; post-impl M3).
      const longest = (code.match(/`+/g) ?? []).reduce((m, r) => Math.max(m, r.length), 0)
      const fence = '`'.repeat(Math.max(3, longest + 1))
      return `${fence}${lang}\n${code}\n${fence}`
    }
    case 'horizontalRule':
      return '---'
    case 'image': {
      // Escape the delimiters so a `]` in alt or a `)`/`"` in src/title survive the round-trip (post-impl M1).
      const src = String(node.attrs?.src ?? '').replace(/[\\)]/g, '\\$&')
      const alt = String(node.attrs?.alt ?? '').replace(/[\\\]]/g, '\\$&')
      const title = node.attrs?.title ? ` "${String(node.attrs.title).replace(/[\\"]/g, '\\$&')}"` : ''
      return `![${alt}](${src}${title})`
    }
    case 'table':
      return serializeTable(node)
    case 'callout':
      return serializeCallout(node)
    default:
      if (INTEGRATION_NODE_NAMES.has(node.type)) return serializeIntegration(node, currentOptions)
      // Unknown node (a future block): best-effort — emit its inline text if any, never throw (BR-E6-9).
      return serializeInline(node.content)
  }
}

/**
 * Serialize a TipTap `EditorDocument` to canonical Markdown. Pure/deterministic. Returns a string (per the typed
 * contract — the emit side has no `warnings` channel; lossiness is either the caller's explicit
 * `integration_block_handling` choice or surfaces as round-trip non-identity, which the BR-5 property test guards).
 */
export function toMarkdown(doc: EditorDocument, options: MarkdownSerializeOptions): string {
  currentOptions = options
  const blocks = (doc.content ?? [])
    .map((n) => serializeBlock(n))
    .filter((s, _i, arr) => !(s === '' && arr.length > 1)) // drop skipped integration blocks; keep a lone empty paragraph
  const body = blocks.join('\n\n')
  const fm = options.include_frontmatter && options.frontmatter ? renderFrontmatter(options.frontmatter) : ''
  return `${fm}${body}\n`
}

export default toMarkdown
