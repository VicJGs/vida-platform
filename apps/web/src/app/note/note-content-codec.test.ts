// @vitest-environment jsdom
// MOD-notes ② · B2 — the content codec (the risk surface). Uses the REAL @vida/editor assertEditorDocument so the
// shape gate is exercised end-to-end (parse + shape), not a stub.
import { describe, expect, it } from 'vitest'
import type { EditorDocument } from '@vida/editor'
import { EMPTY_DOC, parseContent, serializeContent } from './note-content-codec'

describe('parseContent', () => {
  it('null → blank, not corrupt', () => {
    expect(parseContent(null)).toEqual({ doc: undefined, corrupt: false })
  })
  it('empty string → blank, not corrupt', () => {
    expect(parseContent('')).toEqual({ doc: undefined, corrupt: false })
  })
  it('valid stringified doc → parsed, not corrupt', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph' }] }
    expect(parseContent(JSON.stringify(doc))).toEqual({ doc, corrupt: false })
  })
  it('malformed JSON → corrupt (degrade, never throw)', () => {
    expect(parseContent('{ not json')).toEqual({ doc: undefined, corrupt: true })
  })
  it('valid JSON but wrong shape → corrupt (assertEditorDocument gate)', () => {
    expect(parseContent(JSON.stringify({ type: 'notdoc', content: [] }))).toEqual({ doc: undefined, corrupt: true })
    expect(parseContent(JSON.stringify({ foo: 1 }))).toEqual({ doc: undefined, corrupt: true })
    expect(parseContent(JSON.stringify({ type: 'doc', content: [{ noType: true }] }))).toEqual({
      doc: undefined,
      corrupt: true,
    })
  })
})

describe('serializeContent', () => {
  it('round-trips a doc (serialize → parse ≡ original)', () => {
    const doc: EditorDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
    expect(parseContent(serializeContent(doc))).toEqual({ doc, corrupt: false })
  })
})

describe('EMPTY_DOC', () => {
  it('is a doc-rooted empty document', () => {
    expect(EMPTY_DOC).toEqual({ type: 'doc', content: [] })
  })
})
