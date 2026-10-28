// E8 (UI-3) — the TipTap-JSON → DOCX serializer. Uses `docx` (ADR-001:102). Reuses E6/E7's total tree-walk MODEL, but
// emits `docx` object-model instances (Paragraph/TextRun/Table/…), not react-pdf elements or Markdown strings.
// EMIT-ONLY: no round-trip (BR-5 is E6's) — correctness = every STANDARD_BLOCK_TYPE block + every registered mark +
// hardBreak renders faithfully, degrading never-throwing (BR-E8-2/9).
//
// TESTABILITY SPLIT (BR-E8-7): `docx`'s core primitives (Paragraph/TextRun/Table) hold a PRIVATE `properties` field —
// they are NOT introspectable the way react-pdf's plain React elements are. So the PURE core (`documentToDocxBlocks`)
// returns a plain intermediate DESCRIPTOR AST (deep-equal testable, no packing); a thin mechanical adapter maps each
// descriptor 1:1 to a `docx` instance; `toDocx` packs it. Spec: docs/specs/features/ui-3-vida-editor/e8-docx-serializer.md.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ExternalHyperlink,
  Table,
  TableRow,
  TableCell,
  LevelFormat,
  type IBordersOptions,
  type IShadingAttributesProperties,
} from 'docx'
import type { EditorDocument, EditorNode, EditorMark, DocxSerializeOptions } from '@vida/types'
import { INTEGRATION_BLOCK_COMMANDS } from '../commands'
import { CALLOUT_VARIANT, type CalloutVariant } from '../extensions/callout'
import {
  DOCX_COLORS,
  DOCX_FONTS,
  HEADING_LEVEL,
  CODE_SHADING,
  HR_BORDER,
  BLOCKQUOTE_BORDER,
  BLOCKQUOTE_INDENT,
  calloutBorder,
  calloutShading,
} from './docx-theme'

// ── integration-block metadata (editor-local; the to-markdown.ts / to-pdf.tsx precedent) ─────────────────────────────
const INTEGRATION_LABEL = new Map(INTEGRATION_BLOCK_COMMANDS.map((c) => [c.block_type as string, c.label]))
const INTEGRATION_NODE_NAMES: ReadonlySet<string> = new Set(
  INTEGRATION_BLOCK_COMMANDS.map((c) => c.block_type as string),
)

function normalizeVariant(value: unknown): CalloutVariant {
  return CALLOUT_VARIANT.includes(value as CalloutVariant) ? (value as CalloutVariant) : 'info'
}

function clampLevel(v: unknown): number {
  return Math.min(6, Math.max(1, Math.trunc(Number(v ?? 1)) || 1))
}

// ── the intermediate descriptor AST (plain data — the exhaustively-testable pure output, BR-E8-7) ─────────────────────
/** An inline run. `break` = a hardBreak (its `text` is ignored). `link` present → wrapped in an ExternalHyperlink. */
export interface DocxRun {
  text: string
  bold?: boolean
  italics?: boolean
  strike?: boolean
  underline?: boolean
  code?: boolean
  link?: string
  break?: boolean
}

export type DocxBlock =
  | { kind: 'paragraph'; runs: DocxRun[] }
  | { kind: 'heading'; level: number; runs: DocxRun[] }
  | { kind: 'listItem'; ordered: boolean; ref: string; level: number; start?: number; runs: DocxRun[] }
  | { kind: 'code'; lines: string[] }
  | { kind: 'hr' }
  | { kind: 'blockquote'; children: DocxBlock[] }
  | { kind: 'callout'; variant: CalloutVariant; children: DocxBlock[] }
  | { kind: 'table'; rows: DocxBlock[][][] } // rows[r][c] = the cell's block list
  | { kind: 'placeholder'; label: string }

// ── inline (marks + text + hardBreak) → runs ─────────────────────────────────────────────────────────────────────────
function runFromText(node: EditorNode): DocxRun {
  const marks = node.marks ?? []
  const has = (t: string): boolean => marks.some((m: EditorMark) => m.type === t)
  const link = marks.find((m: EditorMark) => m.type === 'link')
  const run: DocxRun = { text: node.text ?? '' }
  if (has('bold')) run.bold = true
  if (has('italic')) run.italics = true
  if (has('strike')) run.strike = true
  if (has('underline')) run.underline = true
  if (has('code')) run.code = true
  if (link) run.link = String((link.attrs?.href as string | undefined) ?? '')
  return run
}

function inlineRuns(nodes: EditorNode[] | undefined): DocxRun[] {
  const out: DocxRun[] = []
  for (const n of nodes ?? []) {
    if (n.type === 'text') out.push(runFromText(n))
    else if (n.type === 'hardBreak') out.push({ text: '', break: true })
    // no other inline nodes in the E1–E5 schema
  }
  return out
}

// ── the ordered-list ref allocator (one UNIQUE reference per orderedList node — MINOR-1: a shared ref = shared counter) ─
interface ListCtx {
  n: number
}
function nextRef(ctx: ListCtx): string {
  return `ol-${ctx.n++}`
}

// ── block walk → descriptors (implement the SCHEMA, BR-E8-4; `level` = list nesting depth) ────────────────────────────
function firstParagraph(item: EditorNode): EditorNode | undefined {
  return (item.content ?? []).find((c) => c.type === 'paragraph')
}
function restAfterFirstParagraph(item: EditorNode): EditorNode[] {
  const content = item.content ?? []
  const idx = content.findIndex((c) => c.type === 'paragraph')
  return idx < 0 ? content : [...content.slice(0, idx), ...content.slice(idx + 1)]
}

/** Deep-set bold on every run of a cell's block list (table header row — applied in the pure builder, not the adapter). */
function boldBlocks(blocks: DocxBlock[]): void {
  for (const b of blocks) {
    if (b.kind === 'paragraph' || b.kind === 'heading' || b.kind === 'listItem') b.runs.forEach((r) => (r.bold = true))
    else if (b.kind === 'blockquote' || b.kind === 'callout') boldBlocks(b.children)
  }
}

function buildListItems(
  list: EditorNode,
  ordered: boolean,
  level: number,
  ctx: ListCtx,
  options: DocxSerializeOptions,
): DocxBlock[] {
  const ref = ordered ? nextRef(ctx) : ''
  const rawStart = Number(list.attrs?.start)
  const start = ordered && Number.isFinite(rawStart) ? rawStart : undefined
  const out: DocxBlock[] = []
  for (const item of list.content ?? []) {
    const fp = firstParagraph(item)
    out.push({ kind: 'listItem', ordered, ref, level, start, runs: inlineRuns(fp?.content) })
    // Nested content (nested lists, extra blocks) recurses at level+1 — keeps its text (BR-E8-nested).
    out.push(...buildBlocks(restAfterFirstParagraph(item), ctx, level + 1, options))
  }
  return out
}

function buildTaskItems(list: EditorNode, level: number, ctx: ListCtx, options: DocxSerializeOptions): DocxBlock[] {
  const out: DocxBlock[] = []
  for (const item of list.content ?? []) {
    const fp = firstParagraph(item)
    const glyph: DocxRun = { text: item.attrs?.checked ? '☑ ' : '☐ ' }
    out.push({ kind: 'paragraph', runs: [glyph, ...inlineRuns(fp?.content)] })
    out.push(...buildBlocks(restAfterFirstParagraph(item), ctx, level + 1, options))
  }
  return out
}

function buildTable(node: EditorNode, ctx: ListCtx, options: DocxSerializeOptions): DocxBlock {
  const rows = node.content ?? []
  const rowsDesc: DocxBlock[][][] = rows.map((row, ri) =>
    (row.content ?? []).map((cell) => {
      // A cell is `block+` — recurse through the block handlers so a non-paragraph child KEEPS its text (BR-E8-nested,
      // the E7 M1 fix). docx TableCell children MUST be block-level (Paragraph/Table), never a bare run.
      const cellBlocks = buildBlocks(cell.content, ctx, 0, options)
      if (ri === 0) boldBlocks(cellBlocks) // header row bold (the E7 ri===0 precedent)
      return cellBlocks
    }),
  )
  return { kind: 'table', rows: rowsDesc }
}

function buildBlocks(
  nodes: EditorNode[] | undefined,
  ctx: ListCtx,
  level: number,
  options: DocxSerializeOptions,
): DocxBlock[] {
  const out: DocxBlock[] = []
  for (const node of nodes ?? []) {
    switch (node.type) {
      case 'paragraph':
        out.push({ kind: 'paragraph', runs: inlineRuns(node.content) })
        break
      case 'heading':
        out.push({ kind: 'heading', level: clampLevel(node.attrs?.level), runs: inlineRuns(node.content) })
        break
      case 'bulletList':
        out.push(...buildListItems(node, false, level, ctx, options))
        break
      case 'orderedList':
        out.push(...buildListItems(node, true, level, ctx, options))
        break
      case 'taskList':
        out.push(...buildTaskItems(node, level, ctx, options))
        break
      case 'blockquote':
        out.push({ kind: 'blockquote', children: buildBlocks(node.content, ctx, level, options) })
        break
      case 'codeBlock': {
        const code = (node.content ?? []).map((c) => c.text ?? '').join('')
        out.push({ kind: 'code', lines: code.split('\n') })
        break
      }
      case 'horizontalRule':
        out.push({ kind: 'hr' })
        break
      case 'image': {
        // DEGRADE to a labeled text placeholder (BR-E8-image): docx `ImageRun` needs binary data + pixel dimensions a
        // pure IO-free builder can't obtain; real embedding is deferred to the attachment pipeline (BR-E2-5). Never an ImageRun.
        const alt = String(node.attrs?.alt ?? '')
        out.push({ kind: 'paragraph', runs: [{ text: alt ? `[image: ${alt}]` : '[image]' }] })
        break
      }
      case 'table':
        out.push(buildTable(node, ctx, options))
        break
      case 'callout':
        out.push({
          kind: 'callout',
          variant: normalizeVariant(node.attrs?.variant),
          children: buildBlocks(node.content, ctx, level, options),
        })
        break
      default:
        if (INTEGRATION_NODE_NAMES.has(node.type)) {
          if (options.integration_block_handling !== 'skip') {
            out.push({ kind: 'placeholder', label: INTEGRATION_LABEL.get(node.type) ?? node.type })
          }
        } else {
          // Unknown node (a future block) → best-effort inline text, never throw (BR-E8-9).
          out.push({ kind: 'paragraph', runs: inlineRuns(node.content) })
        }
    }
  }
  return out
}

// ── frontmatter → leading header descriptors (non-empty gate — the E7 m1 fix) ────────────────────────────────────────
function frontmatterValue(v: unknown): string {
  return Array.isArray(v) ? v.map((x) => String(x)).join(', ') : String(v)
}
function headerBlocks(fm: Record<string, unknown> | undefined): DocxBlock[] {
  if (!fm || Object.keys(fm).length === 0) return []
  const out: DocxBlock[] = []
  if (fm.title != null) out.push({ kind: 'paragraph', runs: [{ text: frontmatterValue(fm.title), bold: true }] })
  for (const k of Object.keys(fm).filter((k) => k !== 'title')) {
    out.push({ kind: 'paragraph', runs: [{ text: `${k}: ${frontmatterValue(fm[k])}` }] })
  }
  return out
}

/**
 * Build the plain descriptor AST for an `EditorDocument`. PURE + deterministic (no IO, no `Date.now`/random) — the
 * exhaustively-testable core (deep-equal, no bytes). Frontmatter header prepended (non-empty).
 */
export function documentToDocxBlocks(doc: EditorDocument, options: DocxSerializeOptions): DocxBlock[] {
  const ctx: ListCtx = { n: 0 }
  return [...headerBlocks(options.frontmatter), ...buildBlocks(doc.content ?? [], ctx, 0, options)]
}

// ── adapter: descriptor → docx instances (mechanical 1:1; proven by the pack smoke) ──────────────────────────────────
type ParaDeco = { indent?: { left: number }; border?: IBordersOptions; shading?: IShadingAttributesProperties }

function mergeDeco(a: ParaDeco | undefined, b: ParaDeco): ParaDeco {
  return { indent: b.indent ?? a?.indent, border: { ...a?.border, ...b.border }, shading: b.shading ?? a?.shading }
}
function decoOpts(deco: ParaDeco | undefined): {
  indent?: { left: number }
  border?: IBordersOptions
  shading?: IShadingAttributesProperties
} {
  if (!deco) return {}
  return {
    ...(deco.indent && { indent: deco.indent }),
    ...(deco.border && Object.keys(deco.border).length > 0 && { border: deco.border }),
    ...(deco.shading && { shading: deco.shading }),
  }
}

function runsToChildren(runs: DocxRun[]): (TextRun | ExternalHyperlink)[] {
  return runs.map((r) => {
    if (r.break) return new TextRun({ break: 1 })
    const base = {
      text: r.text,
      bold: r.bold,
      italics: r.italics,
      strike: r.strike,
      underline: r.underline ? {} : undefined,
      font: r.code ? DOCX_FONTS.mono : undefined,
      shading: r.code ? CODE_SHADING : undefined,
    }
    if (r.link) {
      return new ExternalHyperlink({
        link: r.link,
        children: [new TextRun({ ...base, color: DOCX_COLORS.link, underline: {} })],
      })
    }
    return new TextRun(base)
  })
}

function blockToDocx(desc: DocxBlock, deco?: ParaDeco): (Paragraph | Table)[] {
  switch (desc.kind) {
    case 'paragraph':
      return [new Paragraph({ children: runsToChildren(desc.runs), ...decoOpts(deco) })]
    case 'heading':
      return [
        new Paragraph({ heading: HEADING_LEVEL[desc.level], children: runsToChildren(desc.runs), ...decoOpts(deco) }),
      ]
    case 'listItem': {
      const list = desc.ordered
        ? { numbering: { reference: desc.ref, level: desc.level } }
        : { bullet: { level: desc.level } }
      return [new Paragraph({ ...list, children: runsToChildren(desc.runs), ...decoOpts(deco) })]
    }
    case 'code':
      return desc.lines.map(
        (line) =>
          new Paragraph({
            shading: CODE_SHADING,
            children: [new TextRun({ text: line, font: DOCX_FONTS.mono })],
            ...decoOpts(deco),
          }),
      )
    case 'hr':
      return [new Paragraph({ ...decoOpts(deco), border: { ...decoOpts(deco).border, bottom: HR_BORDER } })]
    case 'placeholder':
      return [
        new Paragraph({ children: [new TextRun({ text: desc.label, bold: true })], ...decoOpts(deco) }),
        new Paragraph({
          children: [new TextRun({ text: 'Available when its module ships', italics: true, color: DOCX_COLORS.muted })],
          ...decoOpts(deco),
        }),
      ]
    case 'blockquote':
      return desc.children.flatMap((c) =>
        blockToDocx(c, mergeDeco(deco, { indent: { left: BLOCKQUOTE_INDENT }, border: { left: BLOCKQUOTE_BORDER } })),
      )
    case 'callout':
      return desc.children.flatMap((c) =>
        blockToDocx(
          c,
          mergeDeco(deco, { shading: calloutShading(desc.variant), border: { left: calloutBorder(desc.variant) } }),
        ),
      )
    case 'table':
      return [
        new Table({
          rows: desc.rows.map(
            (row) =>
              new TableRow({
                children: row.map((cell) => {
                  const kids = cell.flatMap((b) => blockToDocx(b))
                  return new TableCell({ children: kids.length > 0 ? kids : [new Paragraph({})] })
                }),
              }),
          ),
        }),
      ]
  }
}

// ── ordered-list numbering config (one entry per unique ref; MINOR-1 — collected from EVERY container, incl. cells) ────
function collectOrdered(blocks: DocxBlock[], acc: Map<string, Map<number, number>>): void {
  for (const b of blocks) {
    if (b.kind === 'listItem' && b.ordered) {
      const m = acc.get(b.ref) ?? new Map<number, number>()
      m.set(b.level, b.start ?? 1)
      acc.set(b.ref, m)
    } else if (b.kind === 'blockquote' || b.kind === 'callout') {
      collectOrdered(b.children, acc)
    } else if (b.kind === 'table') {
      for (const row of b.rows) for (const cell of row) collectOrdered(cell, acc)
    }
  }
}

function buildNumbering(blocks: DocxBlock[]):
  | {
      config: {
        reference: string
        levels: { level: number; format: (typeof LevelFormat)[keyof typeof LevelFormat]; text: string; start: number }[]
      }[]
    }
  | undefined {
  const acc = new Map<string, Map<number, number>>()
  collectOrdered(blocks, acc)
  if (acc.size === 0) return undefined
  const config = [...acc].map(([reference, levelMap]) => ({
    reference,
    // Define levels 0–8 DECIMAL so any nesting depth resolves; `start` per level from the collected list (default 1).
    levels: Array.from({ length: 9 }, (_, i) => ({
      level: i,
      format: LevelFormat.DECIMAL,
      text: `%${i + 1}.`,
      start: levelMap.get(i) ?? 1,
    })),
  }))
  return { config }
}

/**
 * Assemble the `docx` `Document` model (descriptor AST → adapter → sections + numbering config). Synchronous + pure of
 * IO — exported so tests can render the OOXML via `Packer.toString(buildDocxDocument(...))` and assert adapter
 * correctness (the descriptor asserts don't cover the adapter; the `PK` byte-smoke can't see content). `[BR-E8-7]`
 */
export function buildDocxDocument(doc: EditorDocument, options: DocxSerializeOptions): Document {
  const blocks = documentToDocxBlocks(doc, options)
  const numbering = buildNumbering(blocks)
  const children = blocks.flatMap((b) => blockToDocx(b))
  return new Document({ sections: [{ children }], ...(numbering && { numbering }) })
}

/**
 * Serialize a TipTap `EditorDocument` to a Word `.docx` `Blob` (ADR-001:102). The only async/IO seam — a thin wrapper
 * over `buildDocxDocument`. `Packer` zips OOXML → `Promise<Blob>` (engine-intrinsic).
 */
export function toDocx(doc: EditorDocument, options: DocxSerializeOptions): Promise<Blob> {
  return Packer.toBlob(buildDocxDocument(doc, options))
}

export default toDocx
