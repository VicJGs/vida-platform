import { describe, expect, it } from 'vitest'
import {
  groupBySourceModule,
  mergeBacklinks,
  moduleForType,
  type EntityLinkLike,
  type PageLinkLike,
  type ResolveSource,
} from './backlinks'

const page = (source_page_id: string, context: string | null, created_at: number): PageLinkLike => ({
  source_page_id,
  context,
  created_at,
})
const entity = (page_id: string, context: string | null, created_at: number): EntityLinkLike => ({
  page_id,
  context,
  created_at,
})

const resolve: ResolveSource = (id) => {
  const map: Record<string, { id: string; type: string; title: string }> = {
    a: { id: 'a', type: 'note', title: 'Research log' },
    b: { id: 'b', type: 'milestone_note', title: 'Launch' },
    c: { id: 'c', type: 'note', title: 'Alpha notes' },
  }
  return map[id] ?? null
}

describe('moduleForType (EC-6 / D-S3-2)', () => {
  it('maps every PageType to its owning module (grouped collapse: task*→Tasks, *_note→Projects)', () => {
    expect(moduleForType('note')).toBe('Notes')
    expect(moduleForType('journal')).toBe('Journals')
    expect(moduleForType('task_note')).toBe('Tasks')
    expect(moduleForType('task_group_note')).toBe('Tasks')
    expect(moduleForType('milestone_note')).toBe('Projects')
    expect(moduleForType('deliverable_note')).toBe('Projects')
  })

  it('falls back to the raw type for an unknown (defensive — never thrown live)', () => {
    expect(moduleForType('weird')).toBe('weird')
  })
})

describe('mergeBacklinks (BR-S4-4 — the G6 merge the ① defers to the UI)', () => {
  it('empty → []', () => {
    expect(mergeBacklinks({ pageLinks: [], entityLinks: [] }, resolve)).toEqual([])
  })

  it('page-only: one item per source with the snippet', () => {
    const out = mergeBacklinks({ pageLinks: [page('a', 'see the log', 10)], entityLinks: [] }, resolve)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      sourceId: 'a',
      type: 'note',
      title: 'Research log',
      module: 'Notes',
      count: 1,
      snippet: 'see the log',
    })
  })

  it('entity-only: sourced from page_id', () => {
    const out = mergeBacklinks({ pageLinks: [], entityLinks: [entity('b', null, 20)] }, resolve)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ sourceId: 'b', module: 'Projects', count: 1, snippet: null })
  })

  it('D-S3-3: a source linking via BOTH lists dedups to one item, count=2, nothing dropped', () => {
    const out = mergeBacklinks(
      { pageLinks: [page('a', null, 10)], entityLinks: [entity('a', 'via entity link', 30)] },
      resolve,
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ sourceId: 'a', count: 2, snippet: 'via entity link', latest: 30 })
  })

  it('keeps the FIRST non-empty snippet and the MAX created_at across occurrences', () => {
    const out = mergeBacklinks(
      { pageLinks: [page('a', 'first', 5), page('a', 'second', 50), page('a', null, 1)], entityLinks: [] },
      resolve,
    )
    expect(out[0]).toMatchObject({ count: 3, snippet: 'first', latest: 50 })
  })

  it('omits an unresolved source (the honest-empty mechanism — M1 empty resolver → [])', () => {
    const out = mergeBacklinks({ pageLinks: [page('missing', 'x', 1)], entityLinks: [] }, resolve)
    expect(out).toEqual([])
  })
})

describe('groupBySourceModule (EC-6 — grouped by source module)', () => {
  it('groups across modules, modules sorted asc, items recency-desc', () => {
    const items = mergeBacklinks(
      {
        pageLinks: [page('a', null, 10), page('c', null, 99)], // both 'note' → Notes
        entityLinks: [entity('b', null, 50)], // milestone_note → Projects
      },
      resolve,
    )
    const groups = groupBySourceModule(items)
    expect(groups.map((g) => g.module)).toEqual(['Notes', 'Projects']) // asc
    // Notes items recency-desc: c (99) before a (10)
    expect(groups[0].items.map((i) => i.sourceId)).toEqual(['c', 'a'])
    expect(groups[1].items.map((i) => i.sourceId)).toEqual(['b'])
  })

  it('title tie-breaks equal recency', () => {
    const items = mergeBacklinks({ pageLinks: [page('c', null, 7), page('a', null, 7)], entityLinks: [] }, resolve)
    const [notes] = groupBySourceModule(items)
    // equal latest → title asc: 'Alpha notes' (c) before 'Research log' (a)
    expect(notes.items.map((i) => i.title)).toEqual(['Alpha notes', 'Research log'])
  })
})
