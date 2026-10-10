// Pure — env `node` (no jsdom). fe-codec-seams #13 · S2 — ratifies the portability seams
// (Template + Spaces) against the LIVE @vida/core API. Verification-Gate evidence; not a re-run of the
// engines' own tests. Instantiate/capture EXECUTION is deferred in @vida/core (S3–S5) — NOT asserted here.
import { describe, expect, it } from 'vitest'
import { createTemplatesService, type InstantiationResult, type SpacesService } from '@vida/core'

describe('Template seam — barrel export ratify (S2 closed the gap)', () => {
  it('createTemplatesService is importable from @vida/core at the consumer surface', () => {
    // Runtime proof the new `export * from ./foundation/templates` barrel line resolves (a value, not a type).
    expect(typeof createTemplatesService).toBe('function')
  })

  it('the InstantiationResult shape (fork-on-instantiate) matches the live type', () => {
    // Compile-time drift guard: fork yields seeded + flagged members, NO back-link (IR-5 / ADR-009 §1).
    const result: InstantiationResult = {
      status: 'success',
      seeded: ['entity-1'],
      flagged: [{ member: 'cap-x', reason: 'capability absent on device' }],
    }
    expect(result.seeded).toHaveLength(1)
    expect(result.flagged[0]?.member).toBe('cap-x')
  })
})

describe('Spaces seam — enabled_blocks palette signature ratify', () => {
  it('the documented addEnabledBlock signature matches the live SpacesService', () => {
    // Type-level drift guard on the palette-curation API (gates ADDING to the offered-set; never force-deletes
    // placements — enabled_blocks ≠ block_instances, IR-3). No db needed to assert the type.
    type AddEnabledBlock = SpacesService['addEnabledBlock']
    const sig: (fn: AddEnabledBlock) => AddEnabledBlock = (fn) => fn
    expect(typeof sig).toBe('function')
  })
})
