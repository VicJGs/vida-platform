// E6 (UI-3) — the Markdown → TipTap-JSON parser. The exact inverse of `to-markdown.ts` over the CLOSED canonical
// grammar the emitter produces (BR-E6-2); arbitrary NON-canonical markdown is not parsed exactly — it DEGRADES
// (never throws, BR-E6-9). Custom serializer per ADR-001 §8 — no off-the-shelf markdown lib (BR-E6-1/BR-E6-8).
// Pure/headless/deterministic (BR-E6-7). Spec: docs/specs/features/ui-3-vida-editor/e6-markdown-serializers.md.
import type { EditorNode, EditorMark, MarkdownParseResult, MarkdownSerializeOptions } from '@vida/types'

const DEFAULTS: MarkdownSerializeOptions = { include_frontmatter: false, integration_block_handling: 'placeholder' }

// ── inline parsing (inverse of serializeInline) ──────────────────────────────────────────────────────────────────────
/** Undo a backslash escape: `\X` → the literal `X`. */
function unesc(s: string): string {
  return s.replace(/\\(.)/g, '$1')
}

/** Index of the next `ch` not preceded by a backslash escape (for link-href `)` / delimiters). */
function indexOfUnescaped(text: string, from: number, ch: string): number {
  for (let i = from; i < text.length; i++) {
    if (text[i] === '\\') {
      i += 1
      continue
    }
    if (text[i] === ch) return i
  }
  return -1
}

/** Scan from `i` for the next unescaped `delim`, skipping backtick code spans (so a `**` inside code isn't matched). */
function findClose(text: string, from: number, delim: string): number {
  let i = from
  while (i < text.length) {
    const ch = text[i]!
    if (ch === '\\') {
      i += 2
      continue
    }
    if (ch === '`') {
      // skip a code span: a run of n backticks … matching run of n backticks
      const fence = /^`+/.exec(text.slice(i))![0]
      const close = text.indexOf(fence, i + fence.length)
      i = close === -1 ? text.length : close + fence.length
      continue
    }
    if (text.startsWith(delim, i)) return i
    i += 1
  }
  return -1
}

/**
 * Parse an inline string into `EditorNode[]` (text runs + marks + hardBreak). `marks` = the marks inherited from
 * enclosing delimiters. Recursive: each delimiter recurses on the content between it and its match, adding one mark.
 */
function parseInline(text: string, marks: EditorMark[] = []): EditorNode[] {
  const out: EditorNode[] = []
  let buf = ''
  const flush = (): void => {
    if (buf) {
      out.push(marks.length ? { type: 'text', text: buf, marks } : { type: 'text', text: buf })
      buf = ''
    }
  }
  let i = 0
  while (i < text.length) {
    const rest = text.slice(i)
    // 1. hard break: two+ spaces then newline (or a bare newline in our closed output)
    const hb = /^ *\n/.exec(rest)
    if (hb && (rest.startsWith('  \n') || rest.startsWith('\n'))) {
      flush()
      out.push({ type: 'hardBreak' })
      i += hb[0].length
      continue
    }
    const ch = text[i]!
    // 2. escape
    if (ch === '\\' && i + 1 < text.length) {
      buf += text[i + 1]
      i += 2
      continue
    }
    // 3. code span (literal; strip one hugging pad space if present)
    if (ch === '`') {
      const fence = /^`+/.exec(rest)![0]
      const close = text.indexOf(fence, i + fence.length)
      if (close !== -1) {
        flush()
        let inner = text.slice(i + fence.length, close)
        if (inner.startsWith(' ') && inner.endsWith(' ') && inner.trim() !== '') inner = inner.slice(1, -1)
        out.push({ type: 'text', text: inner, marks: [...marks, { type: 'code' }] })
        i = close + fence.length
        continue
      }
    }
    // 4. underline <u>…</u>
    if (rest.startsWith('<u>')) {
      const close = text.indexOf('</u>', i + 3)
      if (close !== -1) {
        flush()
        out.push(...parseInline(text.slice(i + 3, close), [...marks, { type: 'underline' }]))
        i = close + 4
        continue
      }
    }
    // 5. link [label](href) — href reads to the first UNESCAPED `)` and is un-escaped (post-impl M2)
    if (ch === '[') {
      const labelEnd = findClose(text, i + 1, ']')
      if (labelEnd !== -1 && text.startsWith('](', labelEnd)) {
        const hrefEnd = indexOfUnescaped(text, labelEnd + 2, ')')
        if (hrefEnd !== -1) {
          flush()
          const href = unesc(text.slice(labelEnd + 2, hrefEnd))
          out.push(...parseInline(text.slice(i + 1, labelEnd), [...marks, { type: 'link', attrs: { href } }]))
          i = hrefEnd + 1
          continue
        }
      }
    }
    // 6. bold ** … **
    if (rest.startsWith('**')) {
      const close = findClose(text, i + 2, '**')
      if (close !== -1) {
        flush()
        out.push(...parseInline(text.slice(i + 2, close), [...marks, { type: 'bold' }]))
        i = close + 2
        continue
      }
    }
    // 7. strike ~~ … ~~
    if (rest.startsWith('~~')) {
      const close = findClose(text, i + 2, '~~')
      if (close !== -1) {
        flush()
        out.push(...parseInline(text.slice(i + 2, close), [...marks, { type: 'strike' }]))
        i = close + 2
        continue
      }
    }
    // 8. italic _ … _
    if (ch === '_') {
      const close = findClose(text, i + 1, '_')
      if (close !== -1) {
        flush()
        out.push(...parseInline(text.slice(i + 1, close), [...marks, { type: 'italic' }]))
        i = close + 1
        continue
      }
    }
    // 9. plain char
    buf += ch
    i += 1
  }
  flush()
  return out
}

function inlineContent(text: string): EditorNode[] | undefined {
  const nodes = parseInline(text)
  return nodes.length ? nodes : undefined
}

// ── frontmatter (inverse of renderFrontmatter) ───────────────────────────────────────────────────────────────────────
function parseFrontmatter(lines: string[]): { fm: Record<string, unknown>; warnings: string[] } {
  const fm: Record<string, unknown> = {}
  const warnings: string[] = []
  for (const line of lines) {
    const m = /^([^:]+):\s*(.*)$/.exec(line)
    if (!m) {
      warnings.push(`frontmatter: unparsed line "${line}"`)
      continue
    }
    const key = m[1]!.trim()
    const raw = m[2]!.trim()
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1).trim()
      fm[key] = inner === '' ? [] : inner.split(',').map((s) => s.trim())
    } else {
      fm[key] = raw
    }
  }
  return { fm, warnings }
}

// ── block parsing ────────────────────────────────────────────────────────────────────────────────────────────────────
function parseCommentAttr(s: string): string {
  // Inverse order of escapeCommentAttr: entities first, `&amp;` LAST (post-impl m1).
  return s.replace(/&#45;&#45;/g, '--').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
}

interface Ctx {
  warnings: string[]
}

/** Parse a contiguous run of already-dedented lines into block nodes. */
function parseBlocks(lines: string[], ctx: Ctx): EditorNode[] {
  const blocks: EditorNode[] = []
  let i = 0
  while (i < lines.length) {
    let line = lines[i]!
    // blank line → block separator
    if (line.trim() === '') {
      i += 1
      continue
    }

    // fenced code block (variable-length fence — matches the emitter's longest-run+1 fence; post-impl M3)
    const fence = /^(`{3,}|~{3,})(.*)$/.exec(line)
    if (fence) {
      const marker = fence[1]!
      const lang = fence[2]!.trim()
      const body: string[] = []
      i += 1
      while (i < lines.length && !lines[i]!.startsWith(marker)) {
        body.push(lines[i]!)
        i += 1
      }
      i += 1 // closing fence
      const node: EditorNode = { type: 'codeBlock', attrs: { language: lang || null } }
      if (body.length) node.content = [{ type: 'text', text: body.join('\n') }]
      blocks.push(node)
      continue
    }

    // integration comment
    const comment = /^<!-- vida:integration type="([^"]+)"(?: config='([^']*)')? -->$/.exec(line.trim())
    if (comment) {
      const type = comment[1]!
      const node: EditorNode = { type }
      if (comment[2] !== undefined) {
        try {
          const parsed = JSON.parse(parseCommentAttr(comment[2]))
          // Only a plain object is a valid attrs bag; anything else (a bare number/array) → warn, don't corrupt (post-impl m2).
          if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) node.attrs = parsed
          else ctx.warnings.push(`integration block "${type}": config is not an object`)
        } catch {
          ctx.warnings.push(`integration block "${type}": unparseable config`)
        }
      }
      blocks.push(node)
      i += 1
      continue
    }

    // callout HTML block <div data-type="callout" ...> … </div>
    const calloutOpen = /^<div data-type="callout"(?: data-variant="([^"]*)")?>$/.exec(line.trim())
    if (calloutOpen) {
      const variant = calloutOpen[1] ?? 'info'
      const inner: string[] = []
      i += 1
      let depth = 1
      while (i < lines.length && depth > 0) {
        const l = lines[i]!
        if (/^<div /.test(l.trim())) depth += 1
        if (l.trim() === '</div>') {
          depth -= 1
          if (depth === 0) break
        }
        inner.push(l)
        i += 1
      }
      i += 1 // closing </div>
      const content = parseBlocks(inner, ctx)
      blocks.push({ type: 'callout', attrs: { variant }, content: content.length ? content : [{ type: 'paragraph' }] })
      continue
    }

    // horizontal rule
    if (/^(---|\*\*\*|___)$/.test(line.trim())) {
      blocks.push({ type: 'horizontalRule' })
      i += 1
      continue
    }

    // heading
    const heading = /^(#{1,6}) (.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', attrs: { level: heading[1]!.length }, content: inlineContent(heading[2]!) })
      i += 1
      continue
    }

    // image (whole-line, block image). Escape-aware: alt may hold `\]`, src/title `\)`/`\"` (post-impl M1).
    const image = /^!\[((?:\\.|[^\]])*)\]\((.*)\)$/.exec(line.trim())
    if (image) {
      const alt = unesc(image[1]!)
      const dest = image[2]!
      const titleMatch = / "((?:\\.|[^"])*)"$/.exec(dest)
      const title = titleMatch ? unesc(titleMatch[1]!) : null
      const src = unesc(titleMatch ? dest.slice(0, titleMatch.index) : dest)
      blocks.push({ type: 'image', attrs: { src, alt, title } })
      i += 1
      continue
    }

    // table (a `|` header line followed by a `| --- |` delimiter)
    if (line.trim().startsWith('|') && i + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[i + 1]!.trim())) {
      const rowLines: string[] = []
      while (i < lines.length && lines[i]!.trim().startsWith('|')) {
        rowLines.push(lines[i]!)
        i += 1
      }
      blocks.push(parseTable(rowLines))
      continue
    }

    // blockquote (contiguous `>`-prefixed lines)
    if (/^> ?/.test(line)) {
      const quoted: string[] = []
      while (i < lines.length && /^>/.test(lines[i]!)) {
        quoted.push(lines[i]!.replace(/^> ?/, ''))
        i += 1
      }
      blocks.push({ type: 'blockquote', content: parseBlocks(quoted, ctx) })
      continue
    }

    // task list (checkbox char in group 0, text in group 1)
    if (/^- \[[ xX]\] /.test(line)) {
      const items = collectListItems(lines, i, /^- \[([ xX])\] (.*)$/)
      blocks.push({ type: 'taskList', content: items.nodes.map((it) => taskItem(it, ctx)) })
      i = items.next
      continue
    }

    // bullet list (text in the only group)
    if (/^- /.test(line)) {
      const items = collectListItems(lines, i, /^- (.*)$/)
      blocks.push({ type: 'bulletList', content: items.nodes.map((it) => listItem(it, ctx)) })
      i = items.next
      continue
    }

    // ordered list (text in the only group)
    const ordered = /^(\d+)[.)] /.exec(line)
    if (ordered) {
      const items = collectListItems(lines, i, /^\d+[.)] (.*)$/)
      const start = Number(ordered[1])
      blocks.push({ type: 'orderedList', attrs: { start }, content: items.nodes.map((it) => listItem(it, ctx)) })
      i = items.next
      continue
    }

    // paragraph: this line + following non-blank, non-block lines (hard breaks keep them together)
    const para: string[] = [line]
    i += 1
    while (i < lines.length && lines[i]!.trim() !== '' && !isBlockStart(lines[i]!)) {
      para.push(lines[i]!)
      i += 1
    }
    // leading-marker guard is undone by unescape inside parseInline
    line = para.join('\n')
    blocks.push({ type: 'paragraph', content: inlineContent(line) })
  }
  return blocks
}

/** True if a line begins a non-paragraph block (so a paragraph accumulator must stop before it). */
function isBlockStart(line: string): boolean {
  const t = line.trim()
  return (
    /^(#{1,6}) /.test(line) ||
    /^(```|~~~)/.test(line) ||
    /^(---|\*\*\*|___)$/.test(t) ||
    /^- /.test(line) ||
    /^\d+[.)] /.test(line) ||
    /^>/.test(line) ||
    line.startsWith('|') ||
    t.startsWith('<div data-type="callout"') ||
    t.startsWith('<!-- vida:integration') ||
    /^!\[[^\]]*\]\([^)]*\)$/.test(t)
  )
}

interface ListItemRaw {
  /** The marker's capture groups (last = item text; for tasks, [0]=checkbox char, [1]=text). */
  groups: string[]
  /** Continuation lines (dedented 2 spaces) — nested lists / extra blocks. */
  rest: string[]
}

/** Group indented continuation lines under each list marker. Returns per-item dedented line blocks. */
function collectListItems(lines: string[], start: number, marker: RegExp): { nodes: ListItemRaw[]; next: number } {
  const nodes: ListItemRaw[] = []
  let i = start
  while (i < lines.length) {
    const m = marker.exec(lines[i]!)
    if (!m) break
    const groups = m.slice(1)
    const rest: string[] = []
    i += 1
    // continuation = lines indented by 2 spaces (the emitter's nested-list indent)
    while (i < lines.length && (lines[i]!.startsWith('  ') || lines[i]!.trim() === '')) {
      rest.push(lines[i]!.trim() === '' ? '' : lines[i]!.slice(2))
      i += 1
    }
    nodes.push({ groups, rest })
  }
  return { nodes, next: i }
}

function listItem(it: ListItemRaw, ctx: Ctx): EditorNode {
  const text = it.groups[it.groups.length - 1]!
  const content: EditorNode[] = [{ type: 'paragraph', content: inlineContent(text) }]
  if (it.rest.some((l) => l.trim() !== '')) content.push(...parseBlocks(it.rest, ctx))
  return { type: 'listItem', content }
}

function taskItem(it: ListItemRaw, ctx: Ctx): EditorNode {
  const checked = it.groups[0] === 'x' || it.groups[0] === 'X'
  const text = it.groups[1]!
  const content: EditorNode[] = [{ type: 'paragraph', content: inlineContent(text) }]
  if (it.rest.some((l) => l.trim() !== '')) content.push(...parseBlocks(it.rest, ctx))
  return { type: 'taskItem', attrs: { checked }, content }
}

function parseTable(rowLines: string[]): EditorNode {
  const splitCells = (l: string): string[] => {
    const trimmed = l.trim().replace(/^\|/, '').replace(/\|$/, '')
    // split on unescaped pipes
    const cells: string[] = []
    let cur = ''
    for (let k = 0; k < trimmed.length; k++) {
      if (trimmed[k] === '\\' && k + 1 < trimmed.length) {
        cur += trimmed[k]! + trimmed[k + 1]!
        k += 1
        continue
      }
      if (trimmed[k] === '|') {
        cells.push(cur.trim())
        cur = ''
        continue
      }
      cur += trimmed[k]
    }
    cells.push(cur.trim())
    return cells
  }
  const headerCells = splitCells(rowLines[0]!)
  const bodyRows = rowLines.slice(2) // skip header + delimiter
  const cellNode = (text: string, header: boolean): EditorNode => ({
    type: header ? 'tableHeader' : 'tableCell',
    attrs: { colspan: 1, rowspan: 1, colwidth: null },
    content: [{ type: 'paragraph', content: inlineContent(text.replace(/\\\|/g, '|')) }],
  })
  const rows: EditorNode[] = [
    { type: 'tableRow', content: headerCells.map((c) => cellNode(c, true)) },
    ...bodyRows.map((r) => ({ type: 'tableRow', content: splitCells(r).map((c) => cellNode(c, false)) }) as EditorNode),
  ]
  return { type: 'table', content: rows }
}

/**
 * Parse canonical Markdown to a TipTap `EditorDocument`. Never throws — unrecognized input degrades to paragraphs
 * (BR-E6-9). `options.integration_block_handling` is unused on parse (the `<!-- vida:integration -->` shape is
 * self-describing); it's accepted for signature symmetry.
 */
export function fromMarkdown(markdown: string, _options: MarkdownSerializeOptions = DEFAULTS): MarkdownParseResult {
  const ctx: Ctx = { warnings: [] }
  let frontmatter: Record<string, unknown> | null = null
  let src = markdown.replace(/\r\n/g, '\n')

  // frontmatter pre-pass: a leading `---` … `---` fence
  const fm = /^---\n([\s\S]*?)\n---\n?/.exec(src)
  if (fm) {
    const parsed = parseFrontmatter(fm[1]!.split('\n'))
    frontmatter = parsed.fm
    ctx.warnings.push(...parsed.warnings)
    src = src.slice(fm[0].length)
  }

  const lines = src.replace(/\n+$/, '').split('\n')
  let content: EditorNode[]
  try {
    content = parseBlocks(lines, ctx)
  } catch (e) {
    ctx.warnings.push(`parse error, degraded to plain text: ${(e as Error).message}`)
    content = [{ type: 'paragraph', content: inlineContent(src) }]
  }
  if (content.length === 0) content = [{ type: 'paragraph' }]

  return { document: { type: 'doc', content }, frontmatter, warnings: ctx.warnings }
}

export default fromMarkdown
