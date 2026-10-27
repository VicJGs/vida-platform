// E8 (UI-3) — the DOCX serializer gate. PRIMARY gate = exhaustive deep-equal assertions on the PURE `documentToDocxBlocks`
// descriptor AST (all 11 STANDARD_BLOCK_TYPE + every registered mark + hardBreak + schema-parity + image degradation +
// nested-block-in-container [BR-E8-nested] + integration modes + frontmatter + degradation) — no packing. Plus a `PK`
// zip-magic pack smoke over `toDocx` (the descriptor→docx adapter path) run on the schema-parity kitchen-sink. Pure — no
// editor/DOM. docx primitives hold a private `properties` field (not introspectable) → the descriptor AST is the gate.
import { describe, it, expect } from 'vitest'
import { Packer } from 'docx'
import JSZip from 'jszip'
import { STANDARD_BLOCK_TYPE, type EditorDocument, type EditorNode, type DocxSerializeOptions } from '@vida/types'
import { documentToDocxBlocks, buildDocxDocument, toDocx, type DocxBlock, type DocxRun } from './to-docx'

/** Pack + unzip a fixture's `word/document.xml` — the real OOXML the adapter emitted (the descriptor asserts + the
 *  `PK` smoke can't see it; a .docx is a zip, so `Packer.toString`/`toBuffer` returns zip bytes, not XML). */
async function documentXml(d: EditorDocument, opts: DocxSerializeOptions): Promise<string> {
  const buf = await Packer.toBuffer(buildDocxDocument(d, opts))
  const zip = await JSZip.loadAsync(buf)
  return zip.file('word/document.xml')!.async('string')
}

const OPTS: DocxSerializeOptions = { integration_block_handling: 'placeholder' }
const build = (d: EditorDocument, opts: DocxSerializeOptions = OPTS): DocxBlock[] => documentToDocxBlocks(d, opts)

// ── TipTap-JSON node factories ───────────────────────────────────────────────────────────────────────────────────────
const doc = (...content: EditorNode[]): EditorDocument => ({ type: 'doc', content })
const text = (t: string, marks?: EditorNode['marks']): EditorNode => ({ type: 'text', text: t, marks })
const mark = (type: string, attrs?: Record<string, unknown>): NonNullable<EditorNode['marks']>[number] => ({
  type,
  attrs,
})
const para = (...content: EditorNode[]): EditorNode => ({ type: 'paragraph', content })
const heading = (level: number, ...content: EditorNode[]): EditorNode => ({
  type: 'heading',
  attrs: { level },
  content,
})
const li = (...content: EditorNode[]): EditorNode => ({ type: 'listItem', content })
const bulletList = (...items: EditorNode[]): EditorNode => ({ type: 'bulletList', content: items })
const orderedList = (attrs: Record<string, unknown>, ...items: EditorNode[]): EditorNode => ({
  type: 'orderedList',
  attrs,
  content: items,
})
const taskItem = (checked: boolean, ...content: EditorNode[]): EditorNode => ({
  type: 'taskItem',
  attrs: { checked },
  content,
})
const taskList = (...items: EditorNode[]): EditorNode => ({ type: 'taskList', content: items })
const blockquote = (...content: EditorNode[]): EditorNode => ({ type: 'blockquote', content })
const codeBlock = (code: string): EditorNode => ({ type: 'codeBlock', content: [text(code)] })
const hr = (): EditorNode => ({ type: 'horizontalRule' })
const image = (alt?: string): EditorNode => ({ type: 'image', attrs: alt === undefined ? {} : { alt } })
const cell = (...content: EditorNode[]): EditorNode => ({ type: 'tableCell', content })
const trow = (...cells: EditorNode[]): EditorNode => ({ type: 'tableRow', content: cells })
const table = (...rows: EditorNode[]): EditorNode => ({ type: 'table', content: rows })
const callout = (variant: string, ...content: EditorNode[]): EditorNode => ({
  type: 'callout',
  attrs: { variant },
  content,
})

const firstRun = (blocks: DocxBlock[]): DocxRun => {
  const b = blocks[0]
  if (b && (b.kind === 'paragraph' || b.kind === 'heading' || b.kind === 'listItem')) return b.runs[0]!
  throw new Error(`expected a run-bearing block, got ${b?.kind}`)
}

// ── schema parity: every STANDARD_BLOCK_TYPE covered, produces a descriptor, never throws ─────────────────────────────
describe('schema parity — all 11 STANDARD_BLOCK_TYPE', () => {
  const fixtures: Record<string, { node: EditorNode; expectKind: DocxBlock['kind'] }> = {
    paragraph: { node: para(text('p')), expectKind: 'paragraph' },
    heading: { node: heading(2, text('h')), expectKind: 'heading' },
    bulletList: { node: bulletList(li(para(text('b')))), expectKind: 'listItem' },
    orderedList: { node: orderedList({}, li(para(text('o')))), expectKind: 'listItem' },
    taskList: { node: taskList(taskItem(false, para(text('t')))), expectKind: 'paragraph' },
    blockquote: { node: blockquote(para(text('q'))), expectKind: 'blockquote' },
    codeBlock: { node: codeBlock('x'), expectKind: 'code' },
    horizontalRule: { node: hr(), expectKind: 'hr' },
    image: { node: image('c'), expectKind: 'paragraph' }, // degraded to a text paragraph (BR-E8-image)
    table: { node: table(trow(cell(para(text('c'))))), expectKind: 'table' },
    callout: { node: callout('info', para(text('c'))), expectKind: 'callout' },
  }

  it('covers every enum value (no silent gap)', () => {
    expect(Object.keys(fixtures).sort()).toEqual([...STANDARD_BLOCK_TYPE].sort())
  })

  for (const [type, { node, expectKind }] of Object.entries(fixtures)) {
    it(`${type} → a ${expectKind} descriptor, no throw`, () => {
      const blocks = build(doc(node))
      expect(blocks.some((b) => b.kind === expectKind)).toBe(true)
    })
  }
})

// ── marks (every StarterKit-registered mark + hardBreak) ─────────────────────────────────────────────────────────────
describe('marks + hardBreak', () => {
  it('bold/italic/strike/underline/code map to run flags', () => {
    expect(firstRun(build(doc(para(text('x', [mark('bold')])))))).toEqual({ text: 'x', bold: true })
    expect(firstRun(build(doc(para(text('x', [mark('italic')])))))).toEqual({ text: 'x', italics: true })
    expect(firstRun(build(doc(para(text('x', [mark('strike')])))))).toEqual({ text: 'x', strike: true })
    expect(firstRun(build(doc(para(text('x', [mark('underline')])))))).toEqual({ text: 'x', underline: true })
    expect(firstRun(build(doc(para(text('x', [mark('code')])))))).toEqual({ text: 'x', code: true })
  })

  it('strike + underline combine on one run', () => {
    expect(firstRun(build(doc(para(text('x', [mark('strike'), mark('underline')])))))).toEqual({
      text: 'x',
      strike: true,
      underline: true,
    })
  })

  it('link → the href on the run', () => {
    expect(firstRun(build(doc(para(text('x', [mark('link', { href: 'https://v.io' })]))))).link).toBe('https://v.io')
  })

  it('link with an absent href → empty string (adapter degrades to a plain run, no dangling relationship — m2)', () => {
    expect(firstRun(build(doc(para(text('x', [mark('link')]))))).link).toBe('')
    expect(() => buildDocxDocument(doc(para(text('x', [mark('link')]))), OPTS)).not.toThrow()
  })

  it('hardBreak → a break run (text ignored)', () => {
    const runs = (build(doc(para(text('a'), { type: 'hardBreak' }, text('b'))))[0] as { runs: DocxRun[] }).runs
    expect(runs).toEqual([{ text: 'a' }, { text: '', break: true }, { text: 'b' }])
  })
})

// ── heading level clamp ──────────────────────────────────────────────────────────────────────────────────────────────
describe('heading level clamp 1–6', () => {
  it('clamps out-of-range + non-numeric', () => {
    expect((build(doc(heading(9, text('x'))))[0] as { level: number }).level).toBe(6)
    expect((build(doc(heading(0, text('x'))))[0] as { level: number }).level).toBe(1)
    expect(
      (build(doc({ type: 'heading', attrs: { level: 'nope' }, content: [text('x')] }))[0] as { level: number }).level,
    ).toBe(1)
  })
})

// ── lists ────────────────────────────────────────────────────────────────────────────────────────────────────────────
describe('lists', () => {
  it('bulletList → level-0 unordered items; nested → level 1', () => {
    const blocks = build(doc(bulletList(li(para(text('a')), bulletList(li(para(text('b')))))))) as Extract<
      DocxBlock,
      { kind: 'listItem' }
    >[]
    expect(blocks[0]).toMatchObject({ kind: 'listItem', ordered: false, level: 0 })
    expect(blocks[1]).toMatchObject({ kind: 'listItem', ordered: false, level: 1 })
  })

  it('two separate ordered lists get UNIQUE refs (no shared counter — MINOR-1)', () => {
    const blocks = build(doc(orderedList({}, li(para(text('a')))), orderedList({}, li(para(text('b')))))) as Extract<
      DocxBlock,
      { kind: 'listItem' }
    >[]
    const refs = blocks.map((b) => b.ref)
    expect(refs[0]).not.toBe(refs[1])
    expect(new Set(refs).size).toBe(2)
  })

  it('orderedList.start honored; non-numeric → undefined', () => {
    const good = build(doc(orderedList({ start: 5 }, li(para(text('a'))))))[0] as Extract<
      DocxBlock,
      { kind: 'listItem' }
    >
    const bad = build(doc(orderedList({ start: 'x' }, li(para(text('a'))))))[0] as Extract<
      DocxBlock,
      { kind: 'listItem' }
    >
    expect(good.start).toBe(5)
    expect(bad.start).toBeUndefined()
  })

  it('taskList → paragraph with a checkbox glyph prefix per checked', () => {
    const blocks = build(doc(taskList(taskItem(true, para(text('done'))), taskItem(false, para(text('todo'))))))
    expect((blocks[0] as { runs: DocxRun[] }).runs[0]).toEqual({ text: '☑ ' })
    expect((blocks[1] as { runs: DocxRun[] }).runs[0]).toEqual({ text: '☐ ' })
  })
})

// ── nested-block-in-container (the E7 M1 regression — BR-E8-nested) ──────────────────────────────────────────────────
describe('nested-block-in-container keeps its text (BR-E8-nested)', () => {
  it('a list inside a blockquote keeps its items', () => {
    const bq = build(doc(blockquote(bulletList(li(para(text('inner')))))))[0] as Extract<
      DocxBlock,
      { kind: 'blockquote' }
    >
    expect(bq.children.some((c) => c.kind === 'listItem' && c.runs[0]?.text === 'inner')).toBe(true)
  })

  it('a heading inside a callout keeps its text', () => {
    const co = build(doc(callout('info', heading(3, text('title')))))[0] as Extract<DocxBlock, { kind: 'callout' }>
    expect(co.children.some((c) => c.kind === 'heading' && c.runs[0]?.text === 'title')).toBe(true)
  })

  it('a list inside a table cell keeps its items (never a bare run into a cell)', () => {
    const t = build(doc(table(trow(cell(bulletList(li(para(text('cellitem')))))))))[0] as Extract<
      DocxBlock,
      { kind: 'table' }
    >
    const cellBlocks = t.rows[0]![0]!
    expect(cellBlocks.some((c) => c.kind === 'listItem' && c.runs[0]?.text === 'cellitem')).toBe(true)
  })
})

// ── table header bold ────────────────────────────────────────────────────────────────────────────────────────────────
describe('table', () => {
  it('bolds row-0 cells, not later rows', () => {
    const t = build(doc(table(trow(cell(para(text('H')))), trow(cell(para(text('D')))))))[0] as Extract<
      DocxBlock,
      { kind: 'table' }
    >
    const header = t.rows[0]![0]![0] as { runs: DocxRun[] }
    const body = t.rows[1]![0]![0] as { runs: DocxRun[] }
    expect(header.runs[0]!.bold).toBe(true)
    expect(body.runs[0]!.bold).toBeUndefined()
  })
})

// ── callout variant normalization ────────────────────────────────────────────────────────────────────────────────────
describe('callout', () => {
  it('normalizes an out-of-set variant to info', () => {
    const bad = build(doc(callout('nope', para(text('x')))))[0] as Extract<DocxBlock, { kind: 'callout' }>
    const ok = build(doc(callout('danger', para(text('x')))))[0] as Extract<DocxBlock, { kind: 'callout' }>
    expect(bad.variant).toBe('info')
    expect(ok.variant).toBe('danger')
  })
})

// ── image degradation ────────────────────────────────────────────────────────────────────────────────────────────────
describe('image degrades to a text placeholder (BR-E8-image)', () => {
  it('with alt → [image: alt]; without → [image]; never an image kind', () => {
    expect(firstRun(build(doc(image('a cat'))))).toEqual({ text: '[image: a cat]' })
    expect(firstRun(build(doc(image())))).toEqual({ text: '[image]' })
    expect(build(doc(image('x'))).every((b) => b.kind !== ('image' as DocxBlock['kind']))).toBe(true)
  })
})

// ── integration blocks ───────────────────────────────────────────────────────────────────────────────────────────────
describe('integration blocks per handling', () => {
  const intg: EditorNode = { type: 'dailySummary', attrs: {} }
  it("'placeholder'/'comment' render a placeholder with a label; 'skip' omits", () => {
    const ph = build(doc(intg), { integration_block_handling: 'placeholder' })
    expect(ph[0]).toMatchObject({ kind: 'placeholder' })
    expect((ph[0] as Extract<DocxBlock, { kind: 'placeholder' }>).label.length).toBeGreaterThan(0)
    expect(build(doc(intg), { integration_block_handling: 'comment' })[0]).toMatchObject({ kind: 'placeholder' })
    expect(build(doc(intg), { integration_block_handling: 'skip' })).toEqual([])
  })
})

// ── frontmatter ──────────────────────────────────────────────────────────────────────────────────────────────────────
describe('frontmatter → a leading header (non-empty gate)', () => {
  it('present → a bold title + key:value meta paragraphs; empty/absent → none', () => {
    const withFm = build(doc(para(text('body'))), {
      integration_block_handling: 'skip',
      frontmatter: { title: 'My Note', date: '2026-08-16', tags: ['a', 'b'] },
    })
    expect(withFm[0]).toEqual({ kind: 'paragraph', runs: [{ text: 'My Note', bold: true }] })
    expect(withFm.some((b) => b.kind === 'paragraph' && b.runs[0]?.text === 'date: 2026-08-16')).toBe(true)
    expect(withFm.some((b) => b.kind === 'paragraph' && b.runs[0]?.text === 'tags: a, b')).toBe(true)
    expect(build(doc(para(text('x'))), { integration_block_handling: 'skip', frontmatter: {} })[0]).toEqual({
      kind: 'paragraph',
      runs: [{ text: 'x' }],
    })
    expect(build(doc(para(text('x'))), OPTS)[0]).toEqual({ kind: 'paragraph', runs: [{ text: 'x' }] })
  })
})

// ── degradation: unknown node → best-effort text, never throw ────────────────────────────────────────────────────────
describe('degrade, never throw (BR-E8-9)', () => {
  it('an unknown node → a best-effort paragraph of its inline text', () => {
    const unknown: EditorNode = { type: 'someFutureBlock', content: [text('kept')] }
    expect(() => build(doc(unknown))).not.toThrow()
    expect(firstRun(build(doc(unknown)))).toEqual({ text: 'kept' })
  })
})

// ── determinism ──────────────────────────────────────────────────────────────────────────────────────────────────────
describe('purity/determinism (BR-E8-7)', () => {
  it('same doc → structurally identical descriptors', () => {
    const d = doc(para(text('a')), orderedList({ start: 2 }, li(para(text('b')))))
    expect(build(d)).toEqual(build(d))
  })
})

// ── pack smoke: the descriptor→docx adapter path over the schema-parity kitchen-sink ─────────────────────────────────
describe('pack smoke — PK zip magic (adapter-path coverage)', () => {
  const kitchenSink = doc(
    para(
      text('plain '),
      text('bold', [mark('bold')]),
      text(' '),
      text('link', [mark('link', { href: 'https://v.io' })]),
    ),
    heading(1, text('Title')),
    bulletList(li(para(text('bullet')))),
    orderedList({ start: 3 }, li(para(text('one')))),
    taskList(taskItem(true, para(text('done')))),
    blockquote(bulletList(li(para(text('quoted list'))))),
    codeBlock('const x = 1\nconst y = 2'),
    hr(),
    image('cat'),
    table(
      trow(cell(para(text('H'))), cell(bulletList(li(para(text('cell list')))))),
      trow(cell(para(text('D'))), cell(para(text('E')))),
    ),
    callout('danger', para(text('note')), heading(4, text('sub'))),
    { type: 'dailySummary', attrs: {} },
  )

  it('toDocx resolves to a Blob whose leading bytes are PK (a zipped .docx)', async () => {
    const blob = await toDocx(kitchenSink, OPTS)
    expect(blob).toBeInstanceOf(Blob)
    const bytes = new Uint8Array(await blob.arrayBuffer())
    expect(bytes[0]).toBe(0x50) // 'P'
    expect(bytes[1]).toBe(0x4b) // 'K'
    expect(bytes.length).toBeGreaterThan(100)
  })

  it('an empty doc packs without throwing', async () => {
    const blob = await toDocx(doc(), { integration_block_handling: 'skip' })
    expect(blob).toBeInstanceOf(Blob)
  })

  // The descriptor asserts don't cover the adapter; `PK` bytes emit even for malformed input. So unzip the real
  // OOXML (`word/document.xml`) and assert the adapter produced the right structure (post-impl m1).
  it('the adapter renders correct OOXML (document.xml content assertions)', async () => {
    const xml = await documentXml(kitchenSink, OPTS)
    expect(xml).toContain('>bold</w:t>') // a bold run's text survives
    expect(xml).toContain('cell list') // a list nested in a cell keeps its text (BR-E8-nested)
    expect(xml).toContain('☑') // task checkbox glyph
    expect(xml).toContain('[image: cat]') // image degraded to a text placeholder (BR-E8-image), no ImageRun
    expect(xml).not.toContain('<pic:pic') // ... and NO embedded image element
    expect(xml).toContain('<w:hyperlink') // link → a real hyperlink element
    expect(xml).toContain('<w:numId') // ordered list → a resolved numbering reference (no pack-time throw)
    expect(xml).toContain('Available when its module ships') // integration placeholder rendered
  })

  it('a table row with two cells keeps BOTH (the M1 ragged-drop regression)', async () => {
    const twoCol = doc(table(trow(cell(para(text('D'))), cell(para(text('E'))))))
    const xml = await documentXml(twoCol, OPTS)
    expect((xml.match(/<w:tc>/g) ?? []).length).toBe(2) // two cells, not one
    expect(xml).toContain('>D</w:t>')
    expect(xml).toContain('>E</w:t>')
  })
})
