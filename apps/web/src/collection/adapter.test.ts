// Pure — env `node` (no jsdom). Locks the SavedView↔Collection adapter (S3): the chrome mapping
// (ResolvedView + SavedView → CollectionView chrome props), the filter-active + sort-label derivations,
// and the view-config writes (ViewsService updateView/cloneView) — proven against a mock ViewsService.
import { describe, expect, it, vi } from 'vitest'
import type { ResolvedView, ViewsService } from '@vida/core'
import {
  type SavedViewLike,
  bindViewConfigWrites,
  createCollectionAdapter,
  isFilterActive,
  sortLabelOf,
  toCollectionChrome,
} from './adapter'

const resolved = (over: Partial<ResolvedView> = {}): ResolvedView => ({
  rows: [{ id: '1' }, { id: '2' }, { id: '3' }],
  groups: [],
  state: 'success',
  degraded: [],
  ...over,
})
const view = (over: Partial<SavedViewLike> = {}): SavedViewLike => ({
  id: 'v1',
  layout: 'list',
  availableLayouts: ['list', 'table', 'board'],
  filter: null,
  sort: null,
  ...over,
})

describe('toCollectionChrome — the chrome mapping', () => {
  it('maps layout/layouts from the view and state/count from the resolved view', () => {
    const chrome = toCollectionChrome(view({ layout: 'table' }), resolved())
    expect(chrome.layout).toBe('table')
    expect(chrome.layouts).toEqual(['list', 'table', 'board'])
    expect(chrome.state).toBe('success')
    expect(chrome.count).toBe(3) // rows.length
  })

  it('threads the engine terminal state (loading/empty/error) straight through', () => {
    for (const state of ['loading', 'empty', 'error', 'success'] as const) {
      expect(toCollectionChrome(view(), resolved({ state })).state).toBe(state)
    }
  })

  it('derives filterActive + sortLabel from the saved view', () => {
    const chrome = toCollectionChrome(view({ filter: { tags: ['x'] }, sort: { field: 'due', dir: 'asc' } }), resolved())
    expect(chrome.filterActive).toBe(true)
    expect(chrome.sortLabel).toBe('due ↑')
  })
})

describe('isFilterActive', () => {
  it('is false for null / empty filters, true for any applied predicate', () => {
    expect(isFilterActive(null)).toBe(false)
    expect(isFilterActive({})).toBe(false)
    expect(isFilterActive({ tags: [] })).toBe(false)
    expect(isFilterActive({ tags: ['a'] })).toBe(true)
    expect(isFilterActive({ entity_types: ['task'] })).toBe(true)
    expect(isFilterActive({ predicates: { done: false } })).toBe(true)
  })

  it('VW-8 counts a non-empty TagClause or where as active, an empty one as inactive', () => {
    const CASES: { name: string; filter: Parameters<typeof isFilterActive>[0]; expect: boolean }[] = [
      { name: 'non-empty TagClause (all)', filter: { entity_types: [], tags: { all: ['t'] } }, expect: true },
      { name: 'non-empty TagClause (any)', filter: { entity_types: [], tags: { any: ['t'] } }, expect: true },
      { name: 'non-empty TagClause (none)', filter: { entity_types: [], tags: { none: ['t'] } }, expect: true },
      { name: 'empty TagClause', filter: { entity_types: [], tags: {} }, expect: false },
      {
        name: 'TagClause of empty lists',
        filter: { entity_types: [], tags: { any: [], all: [], none: [] } },
        expect: false,
      },
      {
        name: 'non-empty where',
        filter: { entity_types: [], where: [{ field: 'status', op: 'eq', value: 'in_progress' }] },
        expect: true,
      },
      { name: 'empty where', filter: { entity_types: [], where: [] }, expect: false },
      // legacy (pre-grammar) shapes still read
      { name: 'legacy tags: []', filter: { tags: [] }, expect: false },
      { name: 'legacy tags: [id]', filter: { tags: ['a'] }, expect: true },
      { name: 'legacy predicates', filter: { predicates: { done: false } }, expect: true },
    ]
    for (const c of CASES) expect(isFilterActive(c.filter), c.name).toBe(c.expect)
  })
})

describe('sortLabelOf', () => {
  it('formats asc/desc with arrows; undefined when no sort', () => {
    expect(sortLabelOf(null)).toBeUndefined()
    expect(sortLabelOf({ field: 'due', dir: 'asc' })).toBe('due ↑')
    expect(sortLabelOf({ field: 'name', dir: 'desc' })).toBe('name ↓')
  })
})

describe('bindViewConfigWrites — view-config writes (NOT entity writes)', () => {
  it('onLayoutChange persists the layout via ViewsService.updateView', async () => {
    const updateView = vi.fn().mockResolvedValue({})
    const views = { updateView } as unknown as ViewsService
    await bindViewConfigWrites(views).onLayoutChange('v1', 'board')
    expect(updateView).toHaveBeenCalledWith('v1', { layout: 'board' })
  })

  it('onNewView clones the saved view into an independent global copy via ViewsService.cloneView', async () => {
    const cloneView = vi.fn().mockResolvedValue({})
    const views = { cloneView } as unknown as ViewsService
    await bindViewConfigWrites(views).onNewView('v1')
    expect(cloneView).toHaveBeenCalledWith('v1', null)
  })
})

describe('createCollectionAdapter', () => {
  it('assembles the chrome mapping + the view-config writes', () => {
    const views = { updateView: vi.fn(), cloneView: vi.fn() } as unknown as ViewsService
    const adapter = createCollectionAdapter(views)
    expect(adapter.toChrome(view(), resolved()).count).toBe(3)
    expect(typeof adapter.onLayoutChange).toBe('function')
    expect(typeof adapter.onNewView).toBe('function')
  })
})
