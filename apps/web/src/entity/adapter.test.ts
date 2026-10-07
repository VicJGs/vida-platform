// Pure — env `node` (no jsdom). Locks the entity↔EntityView adapter (S2): the registry-gated `offersEditor`, the
// editor-slot gating in `toEntityProps`, and the merged/tabbed memory convention. The live useEntity hook is deferred
// (see ./CLAUDE.md).
import { describe, expect, it } from 'vitest'
import {
  createEntityAdapter,
  createInMemoryEntityModeStore,
  type EntitySource,
  offersEditor,
  toEntityProps,
} from './adapter'

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
