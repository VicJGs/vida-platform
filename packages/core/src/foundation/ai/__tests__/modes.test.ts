// ============================================================================
// XS-ai #45 · S1 Verification Gate — modes · honest-egress disclosure · provenance
// (XCU-18 / XCU-20 / XCU-24 / XCU-17 seam-decl). PURE slice — no live store
// (deterministic, no I/O). Proves the slice-map S1 ledger:
//   • resolveMode returns each of the 2 modes · rejects an unknown mode (fail-loud)
//   • buildAiDisclosure returns the exact ADR-015 §3.2 per-mode honest bound · deterministic
//   • stampAiProvenance sets source='ai' · idempotent · non-mutating
//   • typed-error assertions (UnknownAiMode carries the offending value)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { resolveMode, buildAiDisclosure, stampAiProvenance } from '../modes'
import { AI_MODES, AI_PROVENANCE, UnknownAiMode, type AiMode } from '../types'

describe('XS-ai S1 — resolveMode (XCU-18 two-mode, per-use)', () => {
  it('returns each of the exactly-two modes', () => {
    expect(AI_MODES).toEqual(['on_device', 'cloud'])
    for (const m of AI_MODES) expect(resolveMode(m)).toBe(m)
  })

  it('rejects an unknown mode, fail-loud, carrying the offending value', () => {
    expect(() => resolveMode('hybrid')).toThrowError(UnknownAiMode)
    try {
      resolveMode('hybrid')
    } catch (e) {
      expect(e).toBeInstanceOf(UnknownAiMode)
      expect((e as UnknownAiMode).mode).toBe('hybrid')
    }
  })
})

describe('XS-ai S1 — buildAiDisclosure (XCU-20 honest content-egress bound / XCU-26 on-device residual)', () => {
  it('cloud: names the plaintext content dent, the provider observer, IP/identity + cross-call profile, and no-train-not-guaranteed', () => {
    const d = buildAiDisclosure('cloud')
    expect(d.mode).toBe('cloud')
    // IR-4 — content, not metadata; plaintext to the provider.
    expect(d.whatLeaks.toLowerCase()).toContain('plaintext')
    expect(d.whatLeaks.toLowerCase()).toContain('content')
    expect(d.whatLeaks.toLowerCase()).toContain('cross-call profile')
    // requested, not guaranteed (ADR-015:50).
    expect(d.whatLeaks.toLowerCase()).toContain('not guaranteed')
    expect(d.whoSees.toLowerCase()).toContain('provider')
    // ZK-1 — device→provider direct, server blind.
    expect(d.serverPosture.toLowerCase()).toContain('blind')
    expect(d.serverPosture.toLowerCase()).toContain('device→provider')
  })

  it('on_device: no vault content leaves; residual = model-acquisition; runtime telemetry-off', () => {
    const d = buildAiDisclosure('on_device')
    expect(d.mode).toBe('on_device')
    expect(d.whatLeaks.toLowerCase()).toContain('no vault content')
    expect(d.whatLeaks.toLowerCase()).toContain('telemetry-off')
    expect(d.serverPosture.toLowerCase()).toContain('blind')
  })

  it('is deterministic (same input → identical record)', () => {
    for (const m of AI_MODES) expect(buildAiDisclosure(m)).toEqual(buildAiDisclosure(m))
  })

  it('rejects an unknown mode, fail-loud', () => {
    expect(() => buildAiDisclosure('server' as AiMode)).toThrowError(UnknownAiMode)
  })
})

describe('XS-ai S1 — stampAiProvenance (XCU-24 source=ai)', () => {
  it("sets source='ai'", () => {
    expect(stampAiProvenance({ title: 'draft plan' })).toEqual({ title: 'draft plan', source: AI_PROVENANCE })
    expect(AI_PROVENANCE).toBe('ai')
  })

  it('is idempotent (stamping twice is stable)', () => {
    const once = stampAiProvenance({ id: 'x' })
    expect(stampAiProvenance(once)).toEqual(once)
  })

  it('preserves other fields and does not mutate the input', () => {
    const input = { id: 'x', body: 'hello' }
    const out = stampAiProvenance(input)
    expect(out).toEqual({ id: 'x', body: 'hello', source: 'ai' })
    expect(input).not.toHaveProperty('source') // non-mutating (fresh object)
  })

  it("overwrites a non-ai source with 'ai' (an AI-generated row is authoritative about its own authorship)", () => {
    expect(stampAiProvenance({ source: 'manual' })).toEqual({ source: 'ai' })
  })
})
