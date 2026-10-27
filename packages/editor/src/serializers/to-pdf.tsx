// E7 (UI-3) — the TipTap-JSON → PDF serializer. Uses @react-pdf/renderer (ADR-001:101 — web/desktop; mobile=expo-print
// is OUT of UI-3 scope). Reuses E6's tree-walk MODEL (to-markdown.ts) but emits react-pdf React ELEMENTS, not strings.
// EMIT-ONLY: no round-trip (BR-5 is E6's) — correctness = every STANDARD_BLOCK_TYPE block + every registered mark +
// hardBreak renders faithfully, degrading never-throwing (BR-E7-2/9). Split for testability (BR-E7-7): a PURE
// `documentToPdfTree` (the react-pdf element tree — exhaustively unit-testable on `element.type`, no bytes) + a thin
// `toPdf` (the only async/IO seam: `pdf(tree).toBlob()`). Spec: docs/specs/features/ui-3-vida-editor/e7-pdf-serializer.md.
import type { ReactElement, ReactNode } from 'react'
import { Document, Page, Text, View, Image, Link, pdf, type DocumentProps } from '@react-pdf/renderer'
import type { EditorDocument, EditorNode, EditorMark, PdfSerializeOptions } from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS } from '../commands'
import { CALLOUT_VARIANT, type CalloutVariant } from '../extensions/callout'
import { styles, PDF_COLORS, PDF_FONTS, CALLOUT_ACCENT, CALLOUT_TINT, HEADING_SIZE } from './pdf-theme'

// ── integration-block metadata (editor-local; the E1 command DATA, the to-markdown.ts:11 precedent) ────────────────────
const INTEGRATION_LABEL = new Map(INTEGRATION_BLOCK_COMMANDS.map((c) => [c.block_type as string, c.label]))
/** The 11 integration node names — anything here routes through `integration_block_handling`, not a block handler. */
const INTEGRATION_NODE_NAMES: ReadonlySet<string> = new Set(
  INTEGRATION_BLOCK_COMMANDS.map((c) => c.block_type as string),
)

function normalizeVariant(value: unknown): CalloutVariant {
  return CALLOUT_VARIANT.includes(value as CalloutVariant) ? (value as CalloutVariant) : 'info'
}

// ── inline (marks + text + hardBreak) ────────────────────────────────────────────────────────────────────────────────
// react-pdf composes marks as a MERGED STYLE OBJECT on one <Text> (NOT E6's delimiter nesting). `link` is the ONE
// element mark → the OUTERMOST <Link> wrapping the styled <Text> (BR-E7-4). `code` folds into the style (Courier).
type InlineStyle = {
  fontWeight?: 'bold'
  fontStyle?: 'italic'
  textDecoration?: 'underline' | 'line-through' | 'underline line-through'
  fontFamily?: string
  backgroundColor?: string
}

function inlineStyleFor(marks: EditorMark[]): InlineStyle {
  const has = (t: string): boolean => marks.some((m) => m.type === t)
  const style: InlineStyle = {}
  if (has('bold')) style.fontWeight = 'bold' // react-pdf auto-resolves the standard Bold variant (Helvetica-Bold / Courier-Bold)
  if (has('italic')) style.fontStyle = 'italic'
  const decos: string[] = []
  if (has('underline')) decos.push('underline')
  if (has('strike')) decos.push('line-through')
  if (decos.length) style.textDecoration = decos.join(' ') as InlineStyle['textDecoration']
  if (has('code')) {
    style.fontFamily = PDF_FONTS.mono
    style.backgroundColor = PDF_COLORS.codeBg
  }
  return style
}

function renderTextNode(node: EditorNode, key: number): ReactNode {
  const text = node.text ?? ''
  if (text === '') return null // PM forbids empty text runs; a defensive skip (the E6 serializeInline precedent)
  const marks = node.marks ?? []
  const styled = (
    <Text key={key} style={inlineStyleFor(marks)}>
      {text}
    </Text>
  )
  const link = marks.find((m) => m.type === 'link')
  if (link) {
    // `href` only (target/rel/class are N/A in a PDF); link wraps the styled Text and is always outermost (BR-E7-4).
    const href = String((link.attrs?.href as string | undefined) ?? '')
    return (
      <Link key={key} src={href} style={{ color: PDF_COLORS.link }}>
        {styled}
      </Link>
    )
  }
  return styled
}

function renderInline(nodes: EditorNode[] | undefined): ReactNode[] {
  if (!nodes) return []
  const out: ReactNode[] = []
  nodes.forEach((n, i) => {
    if (n.type === 'text') out.push(renderTextNode(n, i))
    else if (n.type === 'hardBreak') out.push(<Text key={i}>{'\n'}</Text>) // inline line-break (BR-E7-4)
    // no other inline nodes in the E1–E5 schema
  })
  return out
}

// ── frontmatter → a page-1 header block (BR-E7-6) ────────────────────────────────────────────────────────────────────
function frontmatterValue(v: unknown): string {
  return Array.isArray(v) ? v.map((x) => String(x)).join(', ') : String(v)
}

function renderHeader(fm: Record<string, unknown>): ReactElement {
  const title = fm.title != null ? frontmatterValue(fm.title) : undefined // via frontmatterValue for array parity (post-impl m2)
  const metaKeys = Object.keys(fm).filter((k) => k !== 'title')
  return (
    <View style={styles.header}>
      {title ? <Text style={styles.headerTitle}>{title}</Text> : null}
      {metaKeys.map((k, i) => (
        <Text key={i} style={styles.headerMeta}>{`${k}: ${frontmatterValue(fm[k])}`}</Text>
      ))}
    </View>
  )
}

// ── blocks ───────────────────────────────────────────────────────────────────────────────────────────────────────────
function clampLevel(v: unknown): number {
  return Math.min(6, Math.max(1, Number(v ?? 1)))
}

function renderChildren(nodes: EditorNode[] | undefined, options: PdfSerializeOptions): ReactNode[] {
  return (nodes ?? []).map((n, i) => renderBlock(n, i, options))
}

function renderListItem(item: EditorNode, marker: string, key: number, options: PdfSerializeOptions): ReactElement {
  return (
    <View key={key} style={styles.listRow}>
      <Text style={styles.listMarker}>{marker}</Text>
      <View style={styles.listContent}>{renderChildren(item.content, options)}</View>
    </View>
  )
}

function renderTable(node: EditorNode, key: number, options: PdfSerializeOptions): ReactElement {
  const rows = node.content ?? []
  return (
    <View key={key} style={styles.table}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.tableRow}>
          {(row.content ?? []).map((cell, ci) => (
            <View key={ci} style={styles.tableCell}>
              {/* A cell's content is `block+` — a paragraph is inline (header-bolded on row 0); any OTHER block
                  (list/heading/quote) recurses through renderBlock so its text SURVIVES (the E6 to-markdown.ts:175 fix;
                  forcing it through the inline-only renderInline dropped it entirely — post-impl M1). */}
              {(cell.content ?? []).map((p, pi) =>
                p.type === 'paragraph' ? (
                  <Text key={pi} style={ri === 0 ? { fontWeight: 'bold' } : undefined}>
                    {renderInline(p.content)}
                  </Text>
                ) : (
                  renderBlock(p, pi, options)
                ),
              )}
            </View>
          ))}
        </View>
      ))}
    </View>
  )
}

function renderCallout(node: EditorNode, key: number, options: PdfSerializeOptions): ReactElement {
  const variant = normalizeVariant(node.attrs?.variant)
  return (
    <View
      key={key}
      style={[styles.callout, { borderLeftColor: CALLOUT_ACCENT[variant], backgroundColor: CALLOUT_TINT[variant] }]}
    >
      {renderChildren(node.content, options)}
    </View>
  )
}

/** Integration atom → the placeholder card (`comment`≡`placeholder`) or nothing (`skip`). Re-implemented as react-pdf
 *  primitives — NOT an import of the Tamagui `IntegrationBlockPlaceholder` (BR-E7-5). No config encoded (emit-only). */
function renderIntegration(node: EditorNode, key: number, options: PdfSerializeOptions): ReactNode {
  if (options.integration_block_handling === 'skip') return null
  const label = INTEGRATION_LABEL.get(node.type) ?? node.type
  return (
    <View key={key} style={styles.placeholder}>
      <Text style={styles.placeholderLabel}>{label}</Text>
      <Text style={styles.placeholderHint}>Available when its module ships</Text>
    </View>
  )
}

function renderBlock(node: EditorNode, key: number, options: PdfSerializeOptions): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return (
        <Text key={key} style={styles.block}>
          {renderInline(node.content)}
        </Text>
      )
    case 'heading': {
      const level = clampLevel(node.attrs?.level)
      return (
        <Text key={key} style={[styles.heading, { fontSize: HEADING_SIZE[level] }]}>
          {renderInline(node.content)}
        </Text>
      )
    }
    case 'bulletList':
      return <View key={key}>{(node.content ?? []).map((li, i) => renderListItem(li, '•', i, options))}</View>
    case 'orderedList': {
      // Guard a non-numeric `start` (the `?? 1` only catches null/undefined — a bad string → `NaN.` markers, post-impl M2;
      // matches clampLevel's defensive coercion).
      const rawStart = Number(node.attrs?.start)
      const start = Number.isFinite(rawStart) ? rawStart : 1
      return (
        <View key={key}>{(node.content ?? []).map((li, i) => renderListItem(li, `${start + i}.`, i, options))}</View>
      )
    }
    case 'taskList':
      return (
        <View key={key}>
          {(node.content ?? []).map((li, i) => renderListItem(li, li.attrs?.checked ? '☑' : '☐', i, options))}
        </View>
      )
    case 'blockquote':
      return (
        <View key={key} style={styles.blockquote}>
          {renderChildren(node.content, options)}
        </View>
      )
    case 'codeBlock': {
      // Verbatim: split the body on `\n` → one <Text> per line (deterministic; no reliance on whitespace layout).
      const code = (node.content ?? []).map((c) => c.text ?? '').join('')
      const lines = code.split('\n')
      return (
        <View key={key} style={styles.codeBlock}>
          {lines.map((line, i) => (
            <Text key={i} style={styles.codeLine}>
              {line}
            </Text>
          ))}
        </View>
      )
    }
    case 'horizontalRule':
      return <View key={key} style={styles.hr} />
    case 'image': {
      // Skip an empty src (BR-E7-9 — never throws on a missing src at build). A present src is the caller's contract
      // (the app resolves encrypted note_attachments URLs before export — BR-E2-5); react-pdf accepts a URL/data-URI.
      const src = String(node.attrs?.src ?? '').trim()
      if (src === '') return null
      return <Image key={key} style={styles.image} src={src} />
    }
    case 'table':
      return renderTable(node, key, options)
    case 'callout':
      return renderCallout(node, key, options)
    default:
      if (INTEGRATION_NODE_NAMES.has(node.type)) return renderIntegration(node, key, options)
      // Unknown node (a future block) → best-effort inline text, never throw (BR-E7-9).
      return (
        <Text key={key} style={styles.block}>
          {renderInline(node.content)}
        </Text>
      )
  }
}

/**
 * Build the react-pdf element tree for an `EditorDocument`. PURE + deterministic (no IO, no `Date.now`/random) — the
 * exhaustively-testable core (assert `element.type` against the imported react-pdf component identity; no bytes). Typed
 * `ReactElement<DocumentProps>` so a missing `<Document>` root fails at compile time + it slots into `pdf()`'s param.
 */
export function documentToPdfTree(doc: EditorDocument, options: PdfSerializeOptions): ReactElement<DocumentProps> {
  // Gate on a NON-EMPTY map — a truthy `{}` would emit a stray empty header divider (post-impl m1).
  const header =
    options.frontmatter && Object.keys(options.frontmatter).length > 0 ? renderHeader(options.frontmatter) : null
  const body = (doc.content ?? []).map((n, i) => renderBlock(n, i, options))
  return (
    <Document>
      <Page style={styles.page}>
        {header}
        {body}
      </Page>
    </Document>
  )
}

/**
 * Serialize a TipTap `EditorDocument` to a PDF `Blob` (web/desktop; ADR-001:101). The ONLY async/IO seam — a thin wrapper
 * over the pure `documentToPdfTree`. Returns `Promise<Blob>` (engine-intrinsic: @react-pdf/renderer renders a byte stream).
 */
export function toPdf(doc: EditorDocument, options: PdfSerializeOptions): Promise<Blob> {
  return pdf(documentToPdfTree(doc, options)).toBlob()
}

export default toPdf
