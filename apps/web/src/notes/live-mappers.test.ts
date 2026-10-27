// ============================================================================
// notes-rescope R0 · BR-R0-4 — the tagged content parse (PLAN-R0 G4, tests 8 + 11).
// `parseContentResult` is the ONE parser; `parseContent` keeps its `EditorDocument | null` contract (fe-calendar).
// ============================================================================
import { describe, expect, it } from 'vitest'
import { parseContent, parseContentResult, toNoteEntity } from './live-mappers'

const para = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] })
const doc = { type: 'doc', content: [para('hi')] }

describe('parseContentResult (BR-R0-4)', () => {
  it.each([
    ['null', null],
    ['empty string', ''],
    ['empty doc (no blocks — lossless → absent)', JSON.stringify({ type: 'doc', content: [] })],
  ])('%s → absent', (_l, raw) => {
    expect(parseContentResult(raw)).toEqual({ status: 'absent' })
  })

  it('a doc → ok, unchanged', () => {
    expect(parseContentResult(JSON.stringify(doc))).toEqual({ status: 'ok', doc })
  })

  it('strips empty text nodes (lossless — the editor schema rejects them)', () => {
    const raw = JSON.stringify({
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: '' }] }, para('x')],
    })
    expect(parseContentResult(raw)).toEqual({
      status: 'ok',
      // No empty `content` key: ProseMirror's toJSON omits it, so the normalized doc equals the editor's own echo and a
      // mere open dedupes (BR-NEU-5 — caught live: `content: []` made the echo differ and rewrote the page).
      doc: { type: 'doc', content: [{ type: 'heading', attrs: { level: 1 } }, para('x')] },
    })
  })

  it('drops an empty `content` array on a non-doc node (the editor never writes one)', () => {
    const raw = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [] }, para('y')] })
    expect(parseContentResult(raw)).toEqual({ status: 'ok', doc: { type: 'doc', content: [{ type: 'paragraph' }, para('y')] } })
  })

  it.each([
    ['bad JSON', '{not json'],
    ['JSON, not a doc', '{"type":"paragraph"}'],
    ['doc without content', '{"type":"doc"}'],
    ['a child without a type', '{"type":"doc","content":[{"text":"x"}]}'],
  ])('%s → malformed, raw kept byte-for-byte', (_l, raw) => {
    expect(parseContentResult(raw)).toEqual({ status: 'malformed', raw })
  })

  it('a shape-valid doc with an unknown node is ok HERE — the editor content check owns schema validity', () => {
    const raw = JSON.stringify({ type: 'doc', content: [{ type: 'futureBlock' }] })
    expect(parseContentResult(raw).status).toBe('ok')
  })

  it('parseContent keeps the null contract: ok → doc, else null', () => {
    expect(parseContent(JSON.stringify(doc))).toEqual(doc)
    expect(parseContent(null)).toBeNull()
    expect(parseContent('{not json')).toBeNull()
    expect(parseContent('{"type":"paragraph"}')).toBeNull()
  })
})

describe('toNoteEntity — contentStatus + rawContent (test 11)', () => {
  const row = (content: string | null) =>
    ({
      id: 'p1', type: 'note', title: 'T', content, is_favorite: false, is_archived: false,
      updated_at: Date.now(), journal_date: null, icon: null, cover_image: null,
    }) as unknown as Parameters<typeof toNoteEntity>[0]

  it('ok', () => {
    const e = toNoteEntity(row(JSON.stringify(doc)))
    expect(e).toMatchObject({ content: doc, contentStatus: 'ok', rawContent: JSON.stringify(doc) })
  })
  it('absent', () => {
    expect(toNoteEntity(row(null))).toMatchObject({ content: null, contentStatus: 'absent', rawContent: null })
  })
  it('malformed keeps the raw bytes for "Export a copy"', () => {
    expect(toNoteEntity(row('{not json'))).toMatchObject({
      content: null,
      contentStatus: 'malformed',
      rawContent: '{not json',
    })
  })
})
