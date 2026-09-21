// ============================================================================
// foundation/ingestion — public-reference engine (S4 · XCU-04/05)
//
// Public datasets (legal rule-packs, prices/FX, ISBN, food-DB) fetch the WHOLE set
// (bundle/mirror/CDN) and are queried from a LOCAL copy — never the user's subset
// (a scoped refresh re-leaks the category, ADR-014 §3.2). Every dataset carries
// provenance + version + an integrity signature verified before it is trusted (a
// poisoned/unsigned rule-pack is rejected, XCU-05). M1 ports are deny-safe (no
// mirror wired · U-2) / fail-closed (verify false); M2 wires the real mirror.
// ============================================================================

import {
  PublicRefDenied,
  type DatasetFetchPort,
  type DatasetVerifierPort,
  type PublicDataset,
  type PublicReferenceEngine,
  type PublicRefFetch,
} from './types'

// M1 deny-safe fetch: no dataset source/mirror is wired at M1 (U-2), so any whole-set fetch is refused.
const FETCH_UNAVAILABLE: DatasetFetchPort = {
  async fetchWhole() {
    throw new PublicRefDenied('fetch_unavailable')
  },
}
// M1 fail-closed verifier: nothing verifies until a real signature verifier is wired (XCU-05 fail-closed).
const FAIL_CLOSED_VERIFIER: DatasetVerifierPort = {
  async verify() {
    return false
  },
}

export function createPublicReferenceEngine(ports?: {
  fetch?: DatasetFetchPort
  verifier?: DatasetVerifierPort
}): PublicReferenceEngine {
  const fetchPort = ports?.fetch ?? FETCH_UNAVAILABLE
  const verifier = ports?.verifier ?? FAIL_CLOSED_VERIFIER

  // XCU-05 — provenance/signature/version verify; fails closed. A poisoned/unsigned dataset is rejected.
  async function verifyDataset(ds: PublicDataset): Promise<void> {
    const ok = await verifier.verify(ds)
    if (!ok) throw new PublicRefDenied('unverified_dataset', ds.datasetId)
  }

  async function fetchWholeSet(request: PublicRefFetch): Promise<PublicDataset> {
    // XCU-04 — whole-set only: a scoped/subset refresh re-leaks the category → refused before any fetch.
    if (request.subset && request.subset.length > 0) {
      throw new PublicRefDenied('scoped_refresh_refused', request.datasetId)
    }
    const ds = await fetchPort.fetchWhole(request.datasetId) // M1 deny-safe → fetch_unavailable
    await verifyDataset(ds) // XCU-05 — never trust an unverified dataset
    return ds
  }

  return { fetchWholeSet, verifyDataset }
}
