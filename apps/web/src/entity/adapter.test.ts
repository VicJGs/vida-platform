// Pure — env `node` (no jsdom). Locks the entity↔EntityView adapter (S2): the registry-gated `offersEditor`, the
// editor-slot gating in `toEntityProps`, and the merged/tabbed memory convention. The live useEntity hook is deferred
// (see ./CLAUDE.md).
import { describe, expect, it, vi } from 'vitest'
import {
  createAppStateEntityModeStore,
  createEntityAdapter,
  createInMemoryEntityModeStore,
  type EntitySource,
  offersEditor,
  offersPageEditor,
  toEntityProps,
} from './adapter'
import { PAGE_TYPE } from '@vida/types'

const base: EntitySource = {
  title: 'Redesign the onboarding',
  entityType: 'task', // a REGISTERED, page-able type (schema/_registry.ts)
  hasPage: true,
  editorNode: 'EDITOR_NODE',
  layout: 'LAYOUT_NODE',
  mode: 'merged',
  onModeChange: () => {},
}

describe('offersEditor — the registry gate', () => {
  it('true when the type is registered AND a page exists', () => {
    expect(offersEditor('task', true)).toBe(true)
    expect(offersEditor('project', true)).toBe(true)
  })
  it('false when the type is registered but there is NO page', () => {
    expect(offersEditor('task', false)).toBe(false)
  })
  it('false when the type is NOT in the registry (even with a page)', () => {
    expect(offersEditor('not_a_real_entity_type', true)).toBe(false)
    expect(offersEditor('', true)).toBe(false)
  })
})

describe('toEntityProps — editor slot is gated', () => {
  it('passes the editor node through when page-able', () => {
    const p = toEntityProps(base)
    expect(p.editor).toBe('EDITOR_NODE')
    expect(p.layout).toBe('LAYOUT_NODE')
    expect(p.mode).toBe('merged')
  })
  it('drops the editor node when NOT page-able (no page) — the shell then shows no Content tab', () => {
    const p = toEntityProps({ ...base, hasPage: false })
    expect(p.editor).toBeUndefined()
    expect(p.layout).toBe('LAYOUT_NODE') // Layout still renders (page-less → Layout stands alone)
  })
  it('drops the editor node when the type is unregistered', () => {
    const p = toEntityProps({ ...base, entityType: 'nope', hasPage: true })
    expect(p.editor).toBeUndefined()
  })
  it('threads the facet-control props through (deep-link B1)', () => {
    const p = toEntityProps({ ...base, mode: 'tabbed', defaultFacet: 'editor', activeFacet: 'editor' })
    expect(p.mode).toBe('tabbed')
    expect(p.defaultFacet).toBe('editor')
    expect(p.activeFacet).toBe('editor')
  })
})

describe('EntityModeStore — the merged/tabbed memory convention', () => {
  it('returns the default for an unseen entity, then the persisted value', () => {
    const store = createInMemoryEntityModeStore('merged')
    expect(store.readMode('task', 't1')).toBe('merged')
    store.persistMode('task', 't1', 'tabbed')
    expect(store.readMode('task', 't1')).toBe('tabbed')
    expect(store.readMode('task', 't2')).toBe('merged') // per-instance, not global
  })
  it('createEntityAdapter wires the pure gate + mapping + the injected store', () => {
    const store = createInMemoryEntityModeStore('tabbed')
    const a = createEntityAdapter(store)
    expect(a.offersEditor).toBe(offersEditor)
    expect(a.toEntityProps).toBe(toEntityProps)
    expect(a.mode.readMode('habit', 'h1')).toBe('tabbed')
  })
})

describe('offersPageEditor — the page-surface gate (notes-rescope R1, NP-10 / EC-15)', () => {
  it('opens for every PAGE_TYPE member', () => {
    for (const t of PAGE_TYPE) expect(offersPageEditor(t)).toBe(true)
  })
  it('stays closed for anything that is not a page type', () => {
    expect(offersPageEditor('task')).toBe(false)
    expect(offersPageEditor('')).toBe(false)
    expect(offersPageEditor('not_a_page_type')).toBe(false)
  })
  it("toEntityProps gate:'page' passes the editor for a *_note the entity gate rejects", () => {
    const src: EntitySource = { ...base, entityType: 'task_note' }
    expect(toEntityProps({ ...src, gate: 'page' }).editor).toBe('EDITOR_NODE')
    expect(toEntityProps(src).editor).toBeUndefined() // default gate = the entity gate, unchanged
  })
  it('passes the action slot through', () => {
    expect(toEntityProps({ ...base, action: 'ACTION_NODE' }).action).toBe('ACTION_NODE')
  })
})

describe('createAppStateEntityModeStore — app_state-backed memory (notes-rescope R2, B2)', () => {
  const defaultFor = (t: string) => (t === 'habit' ? 'merged' : 'tabbed') as 'merged' | 'tabbed'
  it('reads the stored value by the full key; missing → the per-type default', () => {
    const s = createAppStateEntityModeStore({ 'entity_mode:note:n1': 'merged' }, defaultFor, () => {})
    expect(s.readMode('note', 'n1')).toBe('merged')
    expect(s.readMode('note', 'n2')).toBe('tabbed')
    expect(s.readMode('habit', 'h1')).toBe('merged')
  })
  it('while loading (no rows yet) every read is the seeded per-type default', () => {
    const s = createAppStateEntityModeStore(undefined, defaultFor, () => {})
    expect(s.readMode('note', 'n1')).toBe('tabbed')
  })
  it('an unknown stored value → the default (BR-R2-5)', () => {
    const s = createAppStateEntityModeStore({ 'entity_mode:note:n1': 'sideways' }, defaultFor, () => {})
    expect(s.readMode('note', 'n1')).toBe('tabbed')
  })
  it('persistMode hands the full key + mode to the writer, once', () => {
    const persist = vi.fn()
    const s = createAppStateEntityModeStore({}, defaultFor, persist)
    s.persistMode('task_note', 't1', 'merged')
    expect(persist).toHaveBeenCalledTimes(1)
    expect(persist).toHaveBeenCalledWith('entity_mode:task_note:t1', 'merged')
  })
})

describe('toEntityProps — the rename seam passes through (notes-rescope R3)', () => {
  it('onTitleCommit · titleEditValue · titleRef reach EntityView', () => {
    const onTitleCommit = vi.fn()
    const titleRef = { current: null }
    const p = toEntityProps({ ...base, onTitleCommit, titleEditValue: '', titleRef })
    expect(p.onTitleCommit).toBe(onTitleCommit)
    expect(p.titleEditValue).toBe('')
    expect(p.titleRef).toBe(titleRef)
  })
})

