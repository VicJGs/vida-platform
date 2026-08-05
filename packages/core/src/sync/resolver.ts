// ============================================================================
// Field-level LWW resolver seam (AR-9 · ADR-003 §6.1) — SCAFFOLD-ONLY, inert until M4.
// No HLC clock, no merge logic — that is "the build edit that introduces the HLC"
// (DB-2 columns + AR-9b), NOT AR-9. [ADR-003 §6.1 "Interim state"]
// ============================================================================
import type { SyncBlob } from '@vida/types'
import { SyncNotActivated } from './types'

export interface FieldLWWResolver {
  /** Merge two field-level-LWW blobs (ADR-003 §6.1). Activated at M4 (AR-9b). */
  merge(local: SyncBlob, remote: SyncBlob): SyncBlob
}

export function createFieldLWWResolver(): FieldLWWResolver {
  return {
    merge(_local: SyncBlob, _remote: SyncBlob): SyncBlob {
      throw new SyncNotActivated('FieldLWWResolver.merge')
    },
  }
}
