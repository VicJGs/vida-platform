// Pure — env `node` (no jsdom). Locks the placement↔Dashboard adapter (S2): the config parse (title/size), the
// standalone gate, the per-row cell mapping, and `toBlocks` (resolve defs via a mock registry → filter standalone →
// thread state → preserve order → degrade unresolvable). The live useDashboard hook is deferred (see ./CLAUDE.md).
import { describe, expect, it, vi } from 'vitest'
import type { CapabilityRegistry } from '@vida/core'
import type { RenderTarget } from '@vida/types'
import {
  type BlockInstanceLike,
  type CapabilityDefLike,
  createDashboardAdapter,
  isStandalone,
  parseBlockConfig,
  toBlocks,
  toCellDescriptor,
} from './adapter'

const inst = (over: Partial<BlockInstanceLike> & Pick<BlockInstanceLike, 'id'>): BlockInstanceLike => ({
  capability_def_id: over.capability_def_id ?? 'cap.summary',
  config: over.config ?? null,
  ...over,
})
const def = (render_targets: RenderTarget[], id = 'cap.summary'): CapabilityDefLike => ({ id, render_targets })

// a mock registry whose get() resolves a def by a provided map (mirrors CapabilityRegistry.get → Promise<def>).
function mockRegistry(defs: Record<string, CapabilityDefLike>): CapabilityRegistry {
  return {
    get: vi.fn(async (id: string) => {
      const d = defs[id]
      if (d == null) throw new Error(`no def ${id}`)
      return d as unknown as Awaited<ReturnType<CapabilityRegistry['get']>>
    }),
  } as unknown as CapabilityRegistry
}

describe('parseBlockConfig', () => {
  it('returns {} for a null config', () => {
    expect(parseBlockConfig(inst({ id: 'a', config: null }))).toEqual({})
  })
  it('returns {} for malformed JSON (degrade-never-crash)', () => {
    expect(parseBlockConfig(inst({ id: 'a', config: '{not json' }))).toEqual({})
  })
  it('extracts a string title + a valid CellSize, ignoring other fields', () => {
    expect(parseBlockConfig(inst({ id: 'a', config: JSON.stringify({ title: 'Stats', size: 'lg', x: 1 }) }))).toEqual({
      title: 'Stats',
      size: 'lg',
    })
  })
  it('drops an invalid size (not a CellSize)', () => {
    expect(parseBlockConfig(inst({ id: 'a', config: JSON.stringify({ size: 'huge' }) }))).toEqual({ size: undefined })
  })
})

describe('isStandalone', () => {
  it('true iff render_targets includes standalone', () => {
    expect(isStandalone(def(['standalone']))).toBe(true)
    expect(isStandalone(def(['inline', 'standalone']))).toBe(true)
    expect(isStandalone(def(['inline']))).toBe(false)
  })
})

describe('toCellDescriptor', () => {
  it('maps id + config title/size + the passed state', () => {
    const b = toCellDescriptor(
      inst({ id: 'b1', config: JSON.stringify({ title: 'Reading', size: 'lg' }) }),
      def(['standalone']),
      'success',
    )
    expect(b).toEqual({ id: 'b1', title: 'Reading', size: 'lg', state: 'success' })
  })
  it('falls back to the def id for title and md for size when config is empty', () => {
    const b = toCellDescriptor(
      inst({ id: 'b2', capability_def_id: 'cap.habits' }),
      def(['standalone'], 'cap.habits'),
      'loading',
    )
    expect(b).toEqual({ id: 'b2', title: 'cap.habits', size: 'md', state: 'loading' })
  })
})

describe('toBlocks', () => {
  const registry = mockRegistry({
    'cap.summary': def(['standalone'], 'cap.summary'),
    'cap.inlineOnly': def(['inline'], 'cap.inlineOnly'),
    'cap.habits': def(['standalone'], 'cap.habits'),
  })

  it('resolves defs, threads per-block state, and defaults missing state to loading', async () => {
    const blocks = await toBlocks(
      [
        inst({ id: 'a', capability_def_id: 'cap.summary', config: JSON.stringify({ size: 'full' }) }),
        inst({ id: 'b', capability_def_id: 'cap.habits' }),
      ],
      registry,
      { a: 'success' },
    )
    expect(blocks).toEqual([
      { id: 'a', title: 'cap.summary', size: 'full', state: 'success' },
      { id: 'b', title: 'cap.habits', size: 'md', state: 'loading' },
    ])
  })

  it('skips an inline-only (non-standalone) placement', async () => {
    const blocks = await toBlocks(
      [inst({ id: 'a', capability_def_id: 'cap.summary' }), inst({ id: 'x', capability_def_id: 'cap.inlineOnly' })],
      registry,
      {},
    )
    expect(blocks.map((b) => b.id)).toEqual(['a']) // the inline-only x is dropped
  })

  it('degrades (skips) an unresolvable def without crashing, preserving order of the rest', async () => {
    const blocks = await toBlocks(
      [
        inst({ id: 'a', capability_def_id: 'cap.summary' }),
        inst({ id: 'gone', capability_def_id: 'cap.missing' }),
        inst({ id: 'b', capability_def_id: 'cap.habits' }),
      ],
      registry,
      {},
    )
    expect(blocks.map((b) => b.id)).toEqual(['a', 'b']) // the missing-def row is skipped, order held
  })
})

describe('createDashboardAdapter', () => {
  it('exposes toBlocks', () => {
    const a = createDashboardAdapter()
    expect(typeof a.toBlocks).toBe('function')
  })
})
