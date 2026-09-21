// ============================================================================
// XS-ingestion #44 · S1 Verification Gate — layer classification + honest-leak
// disclosure (XCU-02 / XCU-03). PURE slice — no live store (deterministic, no I/O).
// Proves the slice-map S1 ledger:
//   • classifyLayer returns each of the 3 layers · rejects an unknown layer (fail-loud)
//   • buildDisclosure returns the exact ADR-014 §3.2 per-layer residual · deterministic
//   • typed-error assertions (UnknownIngestionLayer carries the offending value)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { classifyLayer, buildDisclosure } from '../classification'
import {
  INGESTION_LAYERS,
  UnknownIngestionLayer,
  type IngestionLayer,
  type IngestionSource,
} from '../types'

function source(layer: string): IngestionSource {
  return { integrationId: 'apple-health', layer: layer as IngestionLayer, normalizationContractId: 'health-v1' }
}

describe('classifyLayer (XCU-02) — three-layer classification, not a flat toggle', () => {
  it('classifies each of the 3 owning layers', () => {
    for (const layer of INGESTION_LAYERS) {
      expect(classifyLayer(source(layer))).toBe(layer)
    }
  })

  it('rejects an unknown layer — fail-loud (constitution §5), not a silent pass', () => {
    expect(() => classifyLayer(source('external'))).toThrow(UnknownIngestionLayer)
  })

  it('the typed error carries the offending layer value', () => {
    try {
      classifyLayer(source('flat-toggle'))
      expect.unreachable('should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownIngestionLayer)
      expect((e as UnknownIngestionLayer).layer).toBe('flat-toggle')
    }
  })
})

describe('buildDisclosure (XCU-03) — honest-leak matrix, verbatim ADR-014 §3.2 (:56-60)', () => {
  it('native: only the trusted source sees it; server blind', () => {
    const d = buildDisclosure('native')
    expect(d.layer).toBe('native')
    expect(d.whoSees).toContain('trusted source')
    expect(d.whatLeaks).toContain('a party they already trusted')
    expect(d.serverPosture).toBe('blind')
  })

  it('public-reference: which-item hidden, corpus-use disclosed, mirror is a named observer', () => {
    const d = buildDisclosure('public-reference')
    expect(d.whatLeaks).toContain('which item = hidden')
    expect(d.whatLeaks).toContain('corpus-use')
    expect(d.whatLeaks).toContain('live per-item prices still leak holdings')
    // ZK-1 keeps our relay blind to content, but the Vida mirror is disclosed, not pretended away.
    expect(d.serverPosture).toContain('blind to content')
    expect(d.serverPosture).toContain('a Vida mirror sees which datasets')
  })

  it('user-managed: whatever the user wires up; user-owns-risk; server blind', () => {
    const d = buildDisclosure('user-managed')
    expect(d.whoSees).toContain('endpoint the user wires up')
    expect(d.whatLeaks).toContain('user-owns-risk')
    expect(d.serverPosture).toBe('blind')
  })

  it('is deterministic — same layer, identical disclosure across calls', () => {
    expect(buildDisclosure('public-reference')).toEqual(buildDisclosure('public-reference'))
  })

  it('every layer has a disclosure (no gap in the matrix)', () => {
    for (const layer of INGESTION_LAYERS) {
      const d = buildDisclosure(layer)
      expect(d.whoSees.length).toBeGreaterThan(0)
      expect(d.whatLeaks.length).toBeGreaterThan(0)
      expect(d.serverPosture.length).toBeGreaterThan(0)
    }
  })

  it('rejects an unknown layer — fail-loud', () => {
    expect(() => buildDisclosure('cloud' as IngestionLayer)).toThrow(UnknownIngestionLayer)
  })
})
