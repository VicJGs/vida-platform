// ============================================================================
// Sync Protocol Types — @vida/types
// ADR-002 §3, §4.5 · ADR-003 §4–§6
// ============================================================================

import type { Id, Timestamp, BaseEntity } from './common'

// ---------------------------------------------------------------------------
// Row-level sync metadata (mixin on every syncable table)
// ---------------------------------------------------------------------------

export type SyncStatus = 'pending' | 'synced' | 'conflict'
export type SyncOperation = 'create' | 'update' | 'delete'

/** Present on every syncable row in SQLite */
export interface SyncMetadata {
  /** Stable sync identifier (UUIDv4) */
  _sync_id: string
  /** Incremented on each local write */
  _sync_version: number
  /** Device that last modified this row */
  _sync_device_id: string
  /** Logical timestamp for LWW resolution */
  _sync_lww_ts: Timestamp
  _sync_status: SyncStatus
  /** SHA-256 of row content for change detection */
  _sync_hash: string | null
}

/** Utility — adds sync columns to any entity type */
export type Syncable<T> = T & SyncMetadata

/** Base for all syncable entities (id + timestamps + sync columns) */
export interface SyncableEntity extends BaseEntity, SyncMetadata {}

// ---------------------------------------------------------------------------
// Sync blob (transport wire format — ADR-003 §4.1)
// ---------------------------------------------------------------------------

/** Plaintext envelope — server CAN read for routing/indexing */
export interface SyncBlobHeader {
  table: string
  row_id: string
  sync_version: number
  sync_lww_ts: Timestamp
  sync_device_id: string
  operation: SyncOperation
  /** Per-field LWW timestamps for field-level merge */
  field_timestamps: Record<string, Timestamp>
}

/** Encrypted payload — server CANNOT read */
export interface SyncBlobPayload {
  /** Random 24 bytes */
  nonce: Uint8Array
  /** base64 XChaCha20-Poly1305(VaultKey, nonce, LZ4(JSON(row))) */
  ciphertext: string
}

export interface SyncBlob {
  header: SyncBlobHeader
  payload: SyncBlobPayload
}

// ---------------------------------------------------------------------------
// Yjs CRDT sync unit (per-page editor content — ADR-003 §4.2)
// ---------------------------------------------------------------------------

/** Separate sync unit for pages.content — handled by Yjs, not LWW */
export interface YjsSyncUnit {
  page_id: Id
  /** Yjs binary state: Y.encodeStateAsUpdate(ydoc) */
  state: Uint8Array
  /** Encrypted with same XChaCha20-Poly1305 scheme */
  encrypted_state: string | null
}

// ---------------------------------------------------------------------------
// Sync queue (device-local, NOT synced)
// ---------------------------------------------------------------------------

export type SyncQueueStatus = 'pending' | 'in_flight' | 'failed'

export interface SyncQueueItem {
  id: Id
  table_name: string
  row_id: string
  operation: SyncOperation
  /** JSON snapshot of the row at time of change */
  payload: string | null
  status: SyncQueueStatus
  retry_count: number
  error_message: string | null
  created_at: Timestamp
}

// ---------------------------------------------------------------------------
// App state (device-local key-value store, NOT synced)
// ---------------------------------------------------------------------------

export interface AppState {
  key: string
  value: string
}

// ---------------------------------------------------------------------------
// Sync engine runtime types
// ---------------------------------------------------------------------------

/** Tracks the last successful sync point per table */
export interface SyncCursor {
  table: string
  last_lww_ts: Timestamp
  last_pulled_at: Timestamp
}

/** Debounce configuration per sync channel */
export interface SyncTriggerConfig {
  /** Structured data: debounce ms after last write (default 2000) */
  structured_debounce_ms: number
  /** Yjs content: interval ms for periodic flush (default 5000) */
  yjs_interval_ms: number
  /** Yjs content: also flush on editor blur */
  yjs_flush_on_blur: boolean
}

/** Summary returned after a push/pull cycle */
export interface SyncResult {
  pushed: number
  pulled: number
  conflicts: number
  errors: string[]
  duration_ms: number
}
