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
