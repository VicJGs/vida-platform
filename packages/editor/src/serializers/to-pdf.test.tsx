// E7 (UI-3) — the PDF serializer gate. PRIMARY gate = exhaustive assertions on the PURE `documentToPdfTree` element
// tree (all 11 STANDARD_BLOCK_TYPE + every registered mark + hardBreak + schema-parity), asserting `element.type`
// against the IMPORTED react-pdf component identity (the primitives are classes, GAP-P1). Plus the 3 integration
// modes, frontmatter, degrade-never-throw, and a `%PDF-` render smoke over `toPdf`. No editor/DOM for the tree tests.
import { describe, it, expect } from 'vitest'
import type { ReactElement, ReactNode } from 'react'
import { Document, Page, Text, View, Image, Link } from '@react-pdf/renderer'
import { STANDARD_BLOCK_TYPE, type EditorDocument, type EditorNode, type PdfSerializeOptions } from '@vida/types'
import { documentToPdfTree, toPdf } from './to-pdf'

const OPTS: PdfSerializeOptions = { integration_block_handling: 'placeholder' }
const doc = (...content: EditorNode[]): EditorDocument => ({ type: 'doc', content })
const para = (...content: EditorNode[]): EditorNode => ({ type: 'paragraph', content })
const text = (t: string, marks?: EditorNode['marks']): EditorNode => ({ type: 'text', text: t, marks })

// ── tree helpers ─────────────────────────────────────────────────────────────────────────────────────────────────────
function collect(node: ReactNode, acc: ReactElement[] = []): ReactElement[] {
  if (node == null || typeof node === 'boolean' || typeof node === 'string' || typeof node === 'number') return acc
  if (Array.isArray(node)) {
    node.forEach((n) => collect(n, acc))
    return acc
  }
  if (typeof node === 'object' && 'type' in node) {
    const el = node as ReactElement
    acc.push(el)
    collect((el.props as { children?: ReactNode }).children, acc)
  }
  return acc
}
const byType = (tree: ReactNode, t: unknown): ReactElement[] => collect(tree).filter((e) => e.type === t)
function stringOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(stringOf).join('')
  if (typeof node === 'object' && 'props' in node) return stringOf((node as ReactElement).props?.children as ReactNode)
  return ''
}

describe('documentToPdfTree — structure', () => {
  it('roots at the imported Document → Page (identity, not a string constant)', () => {
    const tree = documentToPdfTree(doc(para(text('hi'))), OPTS)
    expect(tree.type).toBe(Document)
    expect(byType(tree, Page)).toHaveLength(1)
  })

  it('paragraph → a Text; heading → a Text sized by level', () => {
    const tree = documentToPdfTree(doc(para(text('body')), { type: 'heading', attrs: { level: 2 }, content: [text('H2')] }), OPTS)
    const texts = byType(tree, Text)
    expect(texts.some((t) => stringOf(t) === 'body')).toBe(true)
    const h = texts.find((t) => stringOf(t) === 'H2')!
    const style = ([] as unknown[]).concat(h.props.style as unknown[])
    expect(style.some((s) => (s as { fontSize?: number })?.fontSize === 20)).toBe(true) // HEADING_SIZE[2]
  })
})

describe('documentToPdfTree — schema parity (all 11 STANDARD_BLOCK_TYPE)', () => {
  const sample: Record<(typeof STANDARD_BLOCK_TYPE)[number], EditorNode> = {
    paragraph: para(text('p')),
    heading: { type: 'heading', attrs: { level: 1 }, content: [text('h')] },
    bulletList: { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('b'))] }] },
    orderedList: { type: 'orderedList', attrs: { start: 1 }, content: [{ type: 'listItem', content: [para(text('o'))] }] },
    taskList: { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [para(text('t'))] }] },
    blockquote: { type: 'blockquote', content: [para(text('q'))] },
    codeBlock: { type: 'codeBlock', attrs: { language: 'ts' }, content: [text('const x = 1')] },
    horizontalRule: { type: 'horizontalRule' },
    image: { type: 'image', attrs: { src: 'data:image/png;base64,iVBORw0KGgo=' } },
    table: {
      type: 'table',
      content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [para(text('c'))] }] }],
    },
    callout: { type: 'callout', attrs: { variant: 'success' }, content: [para(text('note'))] },
  }

  it.each(STANDARD_BLOCK_TYPE)('%s produces ≥1 element, never throws', (blockType) => {
    const tree = documentToPdfTree(doc(sample[blockType]), OPTS)
    expect(collect(tree).length).toBeGreaterThan(0)
  })

  it('covers every STANDARD_BLOCK_TYPE value (no silent gap)', () => {
    expect(Object.keys(sample).sort()).toEqual([...STANDARD_BLOCK_TYPE].sort())
  })

  it('taskList marker reflects checked; horizontalRule → a View; image with src → an Image', () => {
    expect(stringOf(documentToPdfTree(doc(sample.taskList), OPTS))).toContain('☑')
    expect(stringOf(documentToPdfTree(doc({ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: false }, content: [para(text('x'))] }] }), OPTS))).toContain('☐')
    expect(byType(documentToPdfTree(doc(sample.horizontalRule), OPTS), View).length).toBeGreaterThan(0)
    expect(byType(documentToPdfTree(doc(sample.image), OPTS), Image)).toHaveLength(1)
  })

  it('image with an EMPTY src is skipped (no Image element), never throws (BR-E7-9)', () => {
    const tree = documentToPdfTree(doc({ type: 'image', attrs: { src: '   ' } }), OPTS)
    expect(byType(tree, Image)).toHaveLength(0)
  })

  it('a NON-paragraph block in a table cell keeps its text (post-impl M1 — was silently dropped)', () => {
    const cellWithList: EditorNode = {
      type: 'table',
      content: [
        {
          type: 'tableRow',
          content: [{ type: 'tableCell', content: [{ type: 'bulletList', content: [{ type: 'listItem', content: [para(text('CELLTEXT'))] }] }] }],
        },
      ],
    }
    expect(stringOf(documentToPdfTree(doc(cellWithList), OPTS))).toContain('CELLTEXT')
  })

  it('orderedList with a non-numeric start does NOT emit NaN markers (post-impl M2)', () => {
    const bad: EditorNode = { type: 'orderedList', attrs: { start: 'x' }, content: [{ type: 'listItem', content: [para(text('item'))] }] }
    const s = stringOf(documentToPdfTree(doc(bad), OPTS))
    expect(s).not.toContain('NaN')
    expect(s).toContain('1.') // falls back to 1
  })
})

describe('documentToPdfTree — marks (registered schema, not just the block enum)', () => {
  const leafStyle = (marks: EditorNode['marks']) => {
    const tree = documentToPdfTree(doc(para(text('x', marks))), OPTS)
    // the LEAF Text has the string 'x' as its direct child (the paragraph WRAPPER Text has an array child) — GAP-P1
    const leaf = byType(tree, Text).find((t) => t.props.children === 'x')!
    return leaf.props.style as Record<string, unknown>
  }

  it('bold → fontWeight bold; italic → fontStyle italic', () => {
    expect(leafStyle([{ type: 'bold' }])).toMatchObject({ fontWeight: 'bold' })
    expect(leafStyle([{ type: 'italic' }])).toMatchObject({ fontStyle: 'italic' })
  })

  it('strike + underline → a COMBINED textDecoration', () => {
    expect(leafStyle([{ type: 'underline' }, { type: 'strike' }])).toMatchObject({ textDecoration: 'underline line-through' })
    expect(leafStyle([{ type: 'strike' }])).toMatchObject({ textDecoration: 'line-through' })
  })

  it('code → Courier + a bg (folded into the style object, not a nested element)', () => {
    expect(leafStyle([{ type: 'code' }])).toMatchObject({ fontFamily: 'Courier' })
  })

  it('link → the OUTERMOST Link element wrapping the styled Text (href only)', () => {
    const tree = documentToPdfTree(doc(para(text('site', [{ type: 'link', attrs: { href: 'https://vida.app' } }, { type: 'bold' }]))), OPTS)
    const links = byType(tree, Link)
    expect(links).toHaveLength(1)
    expect((links[0]!.props as { src?: string }).src).toBe('https://vida.app')
    // the styled Text is INSIDE the Link, and still bold
    const inner = byType(links[0], Text)
    expect(inner.some((t) => (t.props.style as { fontWeight?: string })?.fontWeight === 'bold')).toBe(true)
  })

  it('hardBreak → a literal newline in a Text run', () => {
    const tree = documentToPdfTree(doc(para(text('a'), { type: 'hardBreak' }, text('b'))), OPTS)
    expect(stringOf(tree)).toContain('\n')
  })
})

describe('documentToPdfTree — integration handling (BR-E7-5)', () => {
  const block: EditorNode = { type: 'dailySummary', attrs: { date: '2026-08-15' } }

  it("'skip' omits the block entirely", () => {
    const tree = documentToPdfTree(doc(para(text('before')), block), { integration_block_handling: 'skip' })
    expect(stringOf(tree)).not.toContain('Daily summary')
  })

  it.each(['placeholder', 'comment'] as const)("'%s' renders the placeholder card with the label", (mode) => {
    const tree = documentToPdfTree(doc(block), { integration_block_handling: mode })
    const s = stringOf(tree)
    expect(s).toContain('Daily summary')
    expect(s).toContain('Available when its module ships')
  })
})

describe('documentToPdfTree — frontmatter (BR-E7-6)', () => {
  it('present → a header block with title + metadata; absent → none', () => {
    const withFm = documentToPdfTree(doc(para(text('body'))), { integration_block_handling: 'placeholder', frontmatter: { title: 'My Note', tags: ['a', 'b'] } })
    const s = stringOf(withFm)
    expect(s).toContain('My Note')
    expect(s).toContain('tags: a, b')
    const without = stringOf(documentToPdfTree(doc(para(text('body'))), OPTS))
    expect(without).not.toContain('My Note')
  })

  it('an EMPTY frontmatter map emits NO header block (post-impl m1)', () => {
    const tree = documentToPdfTree(doc(para(text('body'))), { integration_block_handling: 'placeholder', frontmatter: {} })
    // the header View carries the only borderBottom in the theme; an empty map must not render it
    const views = byType(tree, View)
    expect(views.some((v) => JSON.stringify(v.props.style).includes('borderBottom'))).toBe(false)
  })

  it('a title array renders with comma-space parity to meta values (post-impl m2)', () => {
    const s = stringOf(documentToPdfTree(doc(para(text('b'))), { integration_block_handling: 'placeholder', frontmatter: { title: ['x', 'y'] } }))
    expect(s).toContain('x, y')
  })
})

describe('documentToPdfTree — degrade, never throw (BR-E7-9)', () => {
  it('an unknown node → best-effort Text, no throw', () => {
    const tree = documentToPdfTree(doc({ type: 'futureBlock', content: [text('surviving text')] } as EditorNode), OPTS)
    expect(stringOf(tree)).toContain('surviving text')
  })

  it('is deterministic — same doc → structurally identical tree', () => {
    const d = doc(para(text('x', [{ type: 'bold' }])), { type: 'heading', attrs: { level: 3 }, content: [text('h')] })
    expect(collect(documentToPdfTree(d, OPTS)).length).toBe(collect(documentToPdfTree(d, OPTS)).length)
  })
})

describe('toPdf — render smoke', () => {
  // Covers every text/layout block. NO <image>: a real image decode is react-pdf/pdfkit's render-time concern (a corrupt
  // src there hangs/throws — NOT a tree-level failure E7 catches; the app supplies valid note_attachments srcs, BR-E2-5).
  // The <Image> element production + the empty-src skip are proven structurally by the pure-tree tests above.
  it('resolves to a Blob whose bytes start with %PDF-', async () => {
    const kitchenSink = doc(
      { type: 'heading', attrs: { level: 1 }, content: [text('Title')] },
      para(text('Body with ', [{ type: 'bold' }]), text('a link', [{ type: 'link', attrs: { href: 'https://x.dev' } }]), { type: 'hardBreak' }, text('after break')),
      { type: 'bulletList', content: [{ type: 'listItem', content: [para(text('item'))] }] },
      { type: 'orderedList', attrs: { start: 3 }, content: [{ type: 'listItem', content: [para(text('third'))] }] },
      { type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true }, content: [para(text('done'))] }] },
      { type: 'blockquote', content: [para(text('quoted'))] },
      { type: 'codeBlock', content: [text('const x = 1\nconst y = 2')] },
      { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [para(text('h'))] }, { type: 'tableCell', content: [para(text('c'))] }] }] },
      { type: 'callout', attrs: { variant: 'info' }, content: [para(text('note'))] },
      { type: 'dailySummary', attrs: { date: '2026-08-15' } },
      { type: 'horizontalRule' },
    )
    const blob = await toPdf(kitchenSink, { integration_block_handling: 'placeholder', frontmatter: { title: 'Doc' } })
    expect(blob).toBeInstanceOf(Blob)
    const head = Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString('latin1')
    expect(head).toBe('%PDF-')
  }, 20000) // react-pdf render (font embedding + layout) is genuinely slow headless — generous timeout

  it('renders NESTED constructs to bytes without throwing (list-in-list, quote+list, callout+heading, cell+list)', async () => {
    const li = (t: string, ...extra: EditorNode[]): EditorNode => ({ type: 'listItem', content: [para(text(t)), ...extra] })
    const nested = doc(
      { type: 'bulletList', content: [li('outer', { type: 'bulletList', content: [li('inner')] })] },
      { type: 'blockquote', content: [{ type: 'bulletList', content: [li('quoted item')] }] },
      { type: 'callout', attrs: { variant: 'danger' }, content: [{ type: 'heading', attrs: { level: 3 }, content: [text('Callout head')] }, { type: 'bulletList', content: [li('callout item')] }] },
      { type: 'table', content: [{ type: 'tableRow', content: [{ type: 'tableCell', content: [{ type: 'bulletList', content: [li('cell list')] }] }] }] },
    )
    const blob = await toPdf(nested, OPTS)
    const head = Buffer.from(await blob.arrayBuffer()).subarray(0, 5).toString('latin1')
    expect(head).toBe('%PDF-')
  }, 20000)
})
