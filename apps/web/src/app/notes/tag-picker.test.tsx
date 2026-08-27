// @vitest-environment jsdom
// MOD-notes ② · B6 — the TagPicker's pure logic: filterTags (case-insensitive substring, empty→all — the B3
// resolveWikiLink match shape) + hasExactTag (suppresses the "+ Create" row on an exact-name match, BR-B6-5, so the
// picker never mints a duplicate). The Popover interaction is exercised in the ░Visual Gate░.
import { describe, expect, it } from 'vitest'
import type { TagRow } from '@vida/core'
import { filterTags, hasExactTag } from './tag-picker'

const tag = (id: string, name: string): TagRow => ({ id, name }) as unknown as TagRow
const TAGS = [tag('1', 'Work'), tag('2', 'Personal'), tag('3', 'work-log')]

describe('filterTags (BR-B6-5 — search existing)', () => {
  it('empty query → all tags', () => {
    expect(filterTags(TAGS, '')).toHaveLength(3)
    expect(filterTags(TAGS, '   ')).toHaveLength(3)
  })
  it('case-insensitive substring match', () => {
    expect(filterTags(TAGS, 'work').map((t) => t.id)).toEqual(['1', '3']) // Work + work-log
    expect(filterTags(TAGS, 'PERSON').map((t) => t.id)).toEqual(['2'])
  })
  it('no match → []', () => {
    expect(filterTags(TAGS, 'zzz')).toEqual([])
  })
})

describe('hasExactTag (BR-B6-5 — suppress "+ Create" on an exact name, no dup)', () => {
  it('true when the trimmed query exactly equals a tag name (case-insensitive)', () => {
    expect(hasExactTag(TAGS, 'work')).toBe(true)
    expect(hasExactTag(TAGS, '  Personal  ')).toBe(true)
  })
  it('false for a partial match (still offers create)', () => {
    expect(hasExactTag(TAGS, 'wor')).toBe(false)
    expect(hasExactTag(TAGS, 'new tag')).toBe(false)
  })
  it('false for an empty query', () => {
    expect(hasExactTag(TAGS, '')).toBe(false)
  })
})
