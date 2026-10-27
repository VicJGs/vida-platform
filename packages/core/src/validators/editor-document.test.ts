// ============================================================================
// notes-rescope R0 · BR-R0-6 — the EditorDocument shape guard (PLAN-R0 G5, test 5).
// Colocated per the enums.test.ts convention. The guard mirrors @vida/editor's
// `assertEditorDocument` (doc root · `content` array · each child an object with a string `type`).
// ============================================================================

import { describe, it, expect } from 'vitest'
import { isEditorDocument, isEditorDocumentJson } from './editor'

describe('isEditorDocument (BR-R0-6)', () => {
  it.each([
    ['empty doc', { type: 'doc', content: [] }, true],
    ['doc with a paragraph', { type: 'doc', content: [{ type: 'paragraph' }] }, true],
    ['doc with an unknown node (shape-valid; the EDITOR schema check catches it)', { type: 'doc', content: [{ type: 'futureBlock' }] }, true],
    ['non-doc root', { type: 'paragraph', content: [] }, false],
    ['doc without content', { type: 'doc' }, false],
    ['content not an array', { type: 'doc', content: 'x' }, false],
    ['child without a type', { type: 'doc', content: [{ text: 'x' }] }, false],
    ['child is null', { type: 'doc', content: [null] }, false],
    ['null', null, false],
    ['string', 'doc', false],
  ])('%s → %s', (_label, value, expected) => {
    expect(isEditorDocument(value)).toBe(expected)
  })

  it('isEditorDocumentJson parses then guards; never throws', () => {
    expect(isEditorDocumentJson('{"type":"doc","content":[]}')).toBe(true)
    expect(isEditorDocumentJson('{not json')).toBe(false)
    expect(isEditorDocumentJson('{"type":"paragraph"}')).toBe(false)
    expect(isEditorDocumentJson('')).toBe(false)
  })
})
