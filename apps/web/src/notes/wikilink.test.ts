import { describe, expect, it, vi } from 'vitest'
import { createAndLink, createRowFor, toCandidates, type PageRowLike } from './wikilink'

const row = (id: string, title: string | null, type = 'note', icon: string | null = null): PageRowLike => ({
  id,
  title,
  type,
  icon,
})

describe('toCandidates (NP-7 id-bound title-LIKE candidates)', () => {
  it('maps rows → candidates, carrying id/type/title/icon', () => {
    const out = toCandidates([row('a', 'Research log', 'note', '📓'), row('b', 'Launch', 'milestone_note')])
    expect(out).toEqual([
      { id: 'a', type: 'note', title: 'Research log', icon: '📓' },
      { id: 'b', type: 'milestone_note', title: 'Launch', icon: null },
    ])
  })

  it('defensively drops null/blank titles', () => {
    expect(toCandidates([row('a', null), row('b', '   '), row('c', 'Kept')])).toEqual([
      { id: 'c', type: 'note', title: 'Kept', icon: null },
    ])
  })
})

describe('createRowFor (NOT-19 — explicit create-on-miss row)', () => {
  it('blank query → no create row', () => {
    expect(createRowFor('')).toBeNull()
    expect(createRowFor('   ')).toBeNull()
  })
  it('non-blank query → a trimmed create row', () => {
    expect(createRowFor('  New idea ')).toEqual({ query: 'New idea' })
  })
})

describe('createAndLink (IR-4 — explicit two-call compose, ordered)', () => {
  it('creates a note THEN links to it, returning the new id', async () => {
    const order: string[] = []
    const createPage = vi.fn(async (input: { type: 'note'; title: string }) => {
      order.push(`create:${input.title}`)
      return { id: 'new-1' }
    })
    const createPageLink = vi.fn(async (src: string, tgt: string) => {
      order.push(`link:${src}->${tgt}`)
    })
    const id = await createAndLink(createPage, createPageLink, 'src-1', 'My note')
    expect(id).toBe('new-1')
    expect(createPage).toHaveBeenCalledWith({ type: 'note', title: 'My note' })
    expect(createPageLink).toHaveBeenCalledWith('src-1', 'new-1')
    expect(order).toEqual(['create:My note', 'link:src-1->new-1']) // ordered: create THEN link
  })

  it('a failed create never links (typed error propagates, not swallowed — IR-8)', async () => {
    const createPage = vi.fn(async () => {
      throw new Error('JournalExistsError')
    })
    const createPageLink = vi.fn(async () => {})
    await expect(createAndLink(createPage, createPageLink, 'src-1', 'dup')).rejects.toThrow('JournalExistsError')
    expect(createPageLink).not.toHaveBeenCalled()
  })

  it('a failed link propagates (after the page was created)', async () => {
    const createPage = vi.fn(async () => ({ id: 'new-2' }))
    const createPageLink = vi.fn(async () => {
      throw new Error('link failed')
    })
    await expect(createAndLink(createPage, createPageLink, 'src-1', 'x')).rejects.toThrow('link failed')
    expect(createPage).toHaveBeenCalledOnce()
  })
})
