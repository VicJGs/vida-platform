// ============================================================================
// Per-page Yjs CRDT seam (AR-9 · ADR-003 §4.2) — SCAFFOLD-ONLY, inert until M4.
// Dependency-free: NO `yjs` import until activation (AR-9b adds the dependency).
// ============================================================================
import type { YjsSyncUnit } from '@vida/types'
import { SyncNotActivated } from './types'

export interface YjsSyncSeam {
  /** Encode a page's Yjs state to a binary update (ADR-003 §4.2). Activated at M4. */
  encode(unit: YjsSyncUnit): Uint8Array
  /** Apply a remote Yjs update to a page's state (ADR-003 §4.2). Activated at M4. */
  apply(unit: YjsSyncUnit, update: Uint8Array): void
}

export function createYjsSyncSeam(): YjsSyncSeam {
  return {
    encode(_unit: YjsSyncUnit): Uint8Array {
      throw new SyncNotActivated('YjsSyncSeam.encode')
    },
    apply(_unit: YjsSyncUnit, _update: Uint8Array): void {
      throw new SyncNotActivated('YjsSyncSeam.apply')
    },
  }
}
