// Pure — env `node` (no jsdom). fe-codec-seams #13 · S1 — ratifies the read-consumption seams
// (SavedView + Capability/Block) against the LIVE @vida/core API, and proves the seams barrel
// re-exports the shipped Collection + Dashboard adapters as a single import site (H4; no live hook).
// This is the Verification-Gate evidence: a drift guard pinning #13's seam to the current engine
// API — NOT a re-run of the adapters' own behaviour tests (covered in #4/#5; critique R2).
import { describe, expect, it } from 'vitest'
import { createViewProviderRegistry, type ReadProvider, type ViewFilter, type OfferedSetResolver } from '@vida/core'
import type { RenderTarget } from '@vida/types'
import {
  toCollectionChrome,
  createCollectionAdapter,
  isFilterActive,
  toBlocks,
  isStandalone,
  createDashboardAdapter,
} from './index'

describe('seams barrel — one import site for the composition-seam adapters', () => {
  it('re-exports the shipped Collection + Dashboard adapters', () => {
    expect(typeof toCollectionChrome).toBe('function')
    expect(typeof createCollectionAdapter).toBe('function')
    expect(typeof isFilterActive).toBe('function')
    expect(typeof toBlocks).toBe('function')
    expect(typeof isStandalone).toBe('function')
    expect(typeof createDashboardAdapter).toBe('function')
  })
})

describe('ReadProvider registration convention (SavedView seam) — ratified vs live @vida/core', () => {
  it('registers a ReadProvider into the empty-shipped registry and resolves it by entityType', () => {
    const registry = createViewProviderRegistry()
    expect(registry.list()).toHaveLength(0) // ships EMPTY — modules register at their build (ADR-007 §3.4)
    const provider: ReadProvider = {
      entityType: 'task',
      // degrade-never-crash lives in the ViewEngine (BR-11); a provider just returns its rows.
      list: async (_filter: ViewFilter) => [{ id: 't1' }],
    }
    registry.register(provider)
    expect(registry.get('task')).toBe(provider)
    expect(registry.list()).toHaveLength(1)
  })
})

describe('offered-set → add-menu convention (Capability/Block seam) — compile-time shape ratify', () => {
  it('the documented resolveOfferedSet signature matches the live OfferedSetResolver', () => {
    // Type-level drift guard: if the documented (spaceId, surface)→Promise<CapabilityDefinition[]>
    // shape ever diverges from @vida/core, this assignment stops compiling. No db needed to assert the type;
    // the runtime inline/union vs standalone/palette behaviour is the engine's (offered-set.ts), not the seam's.
    const resolveOfferedSet: OfferedSetResolver['resolveOfferedSet'] = async (
      _spaceId: string,
      _surface: RenderTarget,
    ) => []
    expect(typeof resolveOfferedSet).toBe('function')
  })
})
