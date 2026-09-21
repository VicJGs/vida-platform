// ============================================================================
// XS-ingestion #44 · S4 Verification Gate — public-reference engine (XCU-04/05)
//
// Ports in-memory (the mirror/CDN + real datasets are M2 · U-2). Proves the S4 ledger:
//   • a scoped/subset refresh is refused (whole-set invariant, XCU-04)
//   • M1 deny-safe fetch → fetch_unavailable (no mirror wired)
//   • an unsigned/poisoned dataset fails verify closed (XCU-05)
//   • a signed dataset with a wired fetch + verifier verifies + returns
//   • typed PublicRefDenied(reason)
// ============================================================================

import { describe, it, expect } from 'vitest'
import { createPublicReferenceEngine } from '../public-reference'
import {
  PublicRefDenied,
  type DatasetFetchPort,
  type DatasetVerifierPort,
  type PublicDataset,
} from '../types'

const dataset = (over: Partial<PublicDataset> = {}): PublicDataset => ({
  datasetId: 'br-tax-2026',
  version: '2026.1',
  provenance: 'vida-mirror',
  signature: 'sig-abc',
  payload: { rules: [] },
  ...over,
})
const fetchOK = (ds: PublicDataset): DatasetFetchPort => ({ async fetchWhole() { return ds } })
const verifyTrue: DatasetVerifierPort = { async verify() { return true } }

describe('createPublicReferenceEngine — S4 (XCU-04/05)', () => {
  it('XCU-04: a scoped/subset refresh is refused (re-leaks the category)', async () => {
    const engine = createPublicReferenceEngine()
    await expect(engine.fetchWholeSet({ datasetId: 'br-tax-2026', subset: ['SP'] })).rejects.toMatchObject({
      name: 'PublicRefDenied',
      reason: 'scoped_refresh_refused',
    })
  })

  it('M1 deny-safe fetch: no mirror wired ⇒ fetch_unavailable', async () => {
    const engine = createPublicReferenceEngine() // default deny-safe fetch port
    await expect(engine.fetchWholeSet({ datasetId: 'br-tax-2026' })).rejects.toMatchObject({
      reason: 'fetch_unavailable',
    })
  })

  it('XCU-05: an unverified (poisoned/unsigned) dataset fails closed', async () => {
    // fetch wired, but the default verifier fails closed (returns false).
    const engine = createPublicReferenceEngine({ fetch: fetchOK(dataset()) })
    await expect(engine.fetchWholeSet({ datasetId: 'br-tax-2026' })).rejects.toMatchObject({
      reason: 'unverified_dataset',
    })
  })

  it('XCU-05 verifyDataset standalone: throws on an unverified dataset', async () => {
    const engine = createPublicReferenceEngine()
    await expect(engine.verifyDataset(dataset())).rejects.toBeInstanceOf(PublicRefDenied)
  })

  it('a whole-set fetch of a signed dataset (fetch + verifier wired) verifies + returns', async () => {
    const ds = dataset()
    const engine = createPublicReferenceEngine({ fetch: fetchOK(ds), verifier: verifyTrue })
    const result = await engine.fetchWholeSet({ datasetId: 'br-tax-2026' })
    expect(result).toEqual(ds)
  })
})
