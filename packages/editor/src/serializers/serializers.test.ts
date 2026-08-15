// E6 (UI-3) — the BR-5 gate: `fromMarkdown(toMarkdown(doc)).document ≡ doc` over the live schema (11 blocks + marks +
// hardBreak), plus the integration-handling modes, frontmatter, and degrade-never-throw. Pure (no editor/DOM).
import { describe, it, expect } from 'vitest'
import type { EditorDocument, MarkdownSerializeOptions } from '@vida/types'
import { toMarkdown } from './to-markdown'
import { fromMarkdown } from './from-markdown'

const COMMENT: MarkdownSerializeOptions = { include_frontmatter: false, integration_block_handling: 'comment' }

const cell = (type: 'tableHeader' | 'tableCell', text: string) => ({
  type,
  attrs: { colspan: 1, rowspan: 1, colwidth: null },
  content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
})

// Canonical TipTap-JSON fixtures — one per block/mark, plus the two hand-rolled-markdown stress cases.
const FIXTURES: Record<string, EditorDocument> = {
  paragraph: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] },
  emptyParagraph: { type: 'doc', content: [{ type: 'paragraph' }] },
  headings: {
    type: 'doc',
    content: [
      { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] },
      { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'Sub' }] },
    ],
  },
  marks: {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'normal ' },
          { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'struck', marks: [{ type: 'strike' }] },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'coded', marks: [{ type: 'code' }] },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'under', marks: [{ type: 'underline' }] },
          { type: 'text', text: ' ' },
          { type: 'text', text: 'link', marks: [{ type: 'link', attrs: { href: 'https://vida.app' } }] },
        ],
      },
    ],
  },
  nestedEmphasis: {
    // stress case #1: 2-level emphasis nesting (bold+italic on one run) → `**_x_**`
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          { type: 'text', text: 'a ' },
          { type: 'text', text: 'bolditalic', marks: [{ type: 'bold' }, { type: 'italic' }] },
        ],
      },
    ],
  },
  escapedMetacharacters: {
    // stress case #2: literal markdown metacharacters survive as text
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'a *b* _c_ ~d~ `e` [f] <g>' }] }],
  },
  bulletNested: {
    type: 'doc',
    content: [
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              { type: 'paragraph', content: [{ type: 'text', text: 'parent' }] },
              {
                type: 'bulletList',
                content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'child' }] }] }],
              },
            ],
          },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'sibling' }] }] },
        ],
      },
    ],
  },
  orderedList: {
    type: 'doc',
    content: [
      {
        type: 'orderedList',
        attrs: { start: 1 },
        content: [
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'first' }] }] },
          { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'second' }] }] },
        ],
      },
    ],
  },
  taskList: {
    type: 'doc',
    content: [
      {
        type: 'taskList',
        content: [
          { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'todo' }] }] },
          { type: 'taskItem', attrs: { checked: true }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'done' }] }] },
        ],
      },
    ],
  },
  blockquote: {
    type: 'doc',
    content: [{ type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'quoted' }] }] }],
  },
  codeBlockLang: {
    type: 'doc',
    content: [{ type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'const x = 1' }] }],
  },
  codeBlockNoLang: {
    type: 'doc',
    content: [{ type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'plain' }] }],
  },
  horizontalRule: { type: 'doc', content: [{ type: 'horizontalRule' }] },
  image: { type: 'doc', content: [{ type: 'image', attrs: { src: 'a.png', alt: 'alt', title: null } }] },
  imageTitle: { type: 'doc', content: [{ type: 'image', attrs: { src: 'a.png', alt: 'alt', title: 'Cap' } }] },
  table: {
    type: 'doc',
    content: [
      {
        type: 'table',
        content: [
          { type: 'tableRow', content: [cell('tableHeader', 'H1'), cell('tableHeader', 'H2')] },
          { type: 'tableRow', content: [cell('tableCell', 'a'), cell('tableCell', 'b')] },
        ],
      },
    ],
  },
  callout: {
    type: 'doc',
    content: [{ type: 'callout', attrs: { variant: 'success' }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'note' }] }] }],
  },
  hardBreak: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'line1' }, { type: 'hardBreak' }, { type: 'text', text: 'line2' }] }],
  },
  integrationTyped: {
    type: 'doc',
    content: [{ type: 'chartBlock', attrs: { chartType: 'bar', dataSource: 'sales', config: {} } }],
  },
  integrationSchemaless: { type: 'doc', content: [{ type: 'eventsBlock' }] },

  // ── post-impl regression fixtures (the 5 gaps the first 29 fixtures missed) ──
  hrLiteralParagraph: {
    // B1: a paragraph whose text is literally `---` must NOT round-trip to a horizontalRule
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: '---' }] }],
  },
  imageWithBrackets: {
    // M1: `]` in alt, `)` in src must survive
    type: 'doc',
    content: [{ type: 'image', attrs: { src: 'x(y).png', alt: 'a]b', title: 'ti)tle' } }],
  },
  linkHrefWithParens: {
    // M2: a parenthesised URL must survive
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'wiki', marks: [{ type: 'link', attrs: { href: 'https://e.com/a(b)c' } }] }] },
    ],
  },
  codeBlockWithFence: {
    // M3: a code body containing a ``` line must not close the block early
    type: 'doc',
    content: [{ type: 'codeBlock', attrs: { language: null }, content: [{ type: 'text', text: 'a\n```\nb' }] }],
  },
  integrationConfigEntities: {
    // m1: config values containing `'`, `--`, and a literal `&#39;` must round-trip
    type: 'doc',
    content: [{ type: 'chartBlock', attrs: { chartType: "x'y--z&#39;w", dataSource: 's', config: {} } }],
  },
}

describe('E6 markdown serializers — BR-5 round-trip identity (JSON→md→JSON)', () => {
  for (const [name, doc] of Object.entries(FIXTURES)) {
    it(`round-trips: ${name}`, () => {
      const md = toMarkdown(doc, COMMENT)
      const result = fromMarkdown(md, COMMENT)
      expect(result.document).toEqual(doc)
    })
  }

  it('covers every STANDARD_BLOCK_TYPE across the fixtures (no silent gap)', () => {
    const seen = new Set<string>()
    const walk = (n: { type: string; content?: unknown[] }): void => {
      seen.add(n.type)
      ;(n.content as { type: string; content?: unknown[] }[] | undefined)?.forEach(walk)
    }
    Object.values(FIXTURES).forEach((d) => d.content.forEach((n) => walk(n as never)))
    for (const t of ['paragraph', 'heading', 'bulletList', 'orderedList', 'taskList', 'blockquote', 'codeBlock', 'horizontalRule', 'image', 'table', 'callout']) {
      expect(seen.has(t)).toBe(true)
    }
  })
})

describe('E6 — integration_block_handling modes (BR-E6-5)', () => {
  const doc: EditorDocument = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'before' }] },
      { type: 'chartBlock', attrs: { chartType: 'bar', dataSource: 's', config: {} } },
    ],
  }

  it("'comment' round-trips the node + attrs losslessly", () => {
    const md = toMarkdown(doc, { include_frontmatter: false, integration_block_handling: 'comment' })
    expect(md).toContain('<!-- vida:integration type="chartBlock"')
    expect(fromMarkdown(md).document).toEqual(doc)
  })

  it("'skip' omits the block", () => {
    const md = toMarkdown(doc, { include_frontmatter: false, integration_block_handling: 'skip' })
    expect(md).not.toContain('chartBlock')
    expect(md).toContain('before')
  })

  it("'placeholder' emits a visible marker line", () => {
    const md = toMarkdown(doc, { include_frontmatter: false, integration_block_handling: 'placeholder' })
    expect(md).toContain('— integration block')
    expect(md).not.toContain('<!-- vida:integration')
  })
})

describe('E6 — frontmatter (BR-E6-6)', () => {
  const doc: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'body' }] }] }

  it('emits + parses a YAML fence when include_frontmatter is true', () => {
    const md = toMarkdown(doc, { include_frontmatter: true, frontmatter: { title: 'T', tags: ['a', 'b'] }, integration_block_handling: 'comment' })
    expect(md.startsWith('---\n')).toBe(true)
    const res = fromMarkdown(md)
    expect(res.document).toEqual(doc)
    expect(res.frontmatter).toEqual({ title: 'T', tags: ['a', 'b'] })
  })

  it('no fence + null frontmatter when the flag is false', () => {
    const md = toMarkdown(doc, { include_frontmatter: false, integration_block_handling: 'comment' })
    expect(md.startsWith('---')).toBe(false)
    expect(fromMarkdown(md).frontmatter).toBeNull()
  })
})

describe('E6 — degrade, never throw (BR-E6-9)', () => {
  it('returns a valid document + never throws on arbitrary non-Vida markdown', () => {
    const res = fromMarkdown('just **unclosed and <weird> text with | pipes')
    expect(res.document.type).toBe('doc')
    expect(res.document.content.length).toBeGreaterThan(0)
    expect(Array.isArray(res.warnings)).toBe(true)
  })

  it('empty input yields a single empty paragraph', () => {
    expect(fromMarkdown('').document).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('toMarkdown on an unknown node type does not throw', () => {
    const doc = { type: 'doc', content: [{ type: 'futureBlock', content: [{ type: 'text', text: 'x' }] }] } as unknown as EditorDocument
    expect(() => toMarkdown(doc, COMMENT)).not.toThrow()
  })
})
