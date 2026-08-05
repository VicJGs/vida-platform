// ============================================================================
// Sync-queue reader seam (AR-9 · ADR-003 §8.1) — SCAFFOLD-ONLY, inert until M4.
// Consumer-only of DB-6's sync_queue (SY-2). The enqueue-WRITE + UNIQUE dedup/collapse
// are DB-6 (repository.ts), NOT here (SY-5). readPending activates at M4 (AR-9b).
// ============================================================================
import type { SyncQueueItem } from '@vida/types'
import type { DrizzleDb } from '../db/adapter'
import { SyncNotActivated } from './types'

export interface SyncQueueReader {
  /** Read pending items FIFO by created_at (ADR-003 §8.1). Activated at M4 (AR-9b). */
  readPending(): Promise<SyncQueueItem[]>
}

export function createSyncQueueReader(_db: DrizzleDb): SyncQueueReader {
  return {
    readPending(): Promise<SyncQueueItem[]> {
      throw new SyncNotActivated('SyncQueueReader.readPending')
    },
  }
}
