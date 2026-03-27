// ============================================================================
// Encryption Types — @vida/types
// ADR-001 §6 · ADR-002 §4 · architecture.md §3.3
// Three-layer model: L1 SQLCipher, L2 field-level libsodium, L3 sync blob
// ============================================================================

// ---------------------------------------------------------------------------
// Key hierarchy
// ---------------------------------------------------------------------------

/** Argon2id parameters for Master Key derivation */
export interface Argon2idParams {
  /** Memory cost in KiB (recommended ≥ 64 MiB = 65536) */
  memory: number
  /** Time cost / iterations (recommended ≥ 3) */
  iterations: number
  /** Degree of parallelism */
  parallelism: number
  /** Output key length in bytes (32 for XChaCha20) */
  key_length: number
  /** Random salt (16 bytes, stored on server with SRP verifier) */
  salt: Uint8Array
}

/** HKDF parameters for Vault Key derivation */
export interface HkdfParams {
  /** Hash function — 'SHA-256' */
  hash: string
  /** Input keying material: Master Key */
  ikm: Uint8Array
  /** Context info: Account Key */
  info: Uint8Array
  /** Output length in bytes (32) */
  length: number
}

/**
 * The key chain derived during account creation / unlock.
 * Master Key and Vault Key NEVER leave the device.
 */
export interface KeyChain {
  /** Derived from password via Argon2id — ephemeral, used only to derive Vault Key */
  master_key: Uint8Array
  /** Random 256-bit key — user's recovery key, shown once as "XXXXX-XXXXX-XXXXX" */
  account_key: Uint8Array
  /** HKDF(Master Key, Account Key) — encrypts/decrypts all data */
  vault_key: Uint8Array
}

/**
 * Stored on server as part of SRP registration.
 * Server never sees the password, Master Key, or Vault Key.
 */
export interface ServerKeyMaterial {
  /** Argon2id salt (sent to client during login for key re-derivation) */
  salt: string
  /** SRP verifier — proves password knowledge without revealing it */
  srp_verifier: string
}

// ---------------------------------------------------------------------------
// L1 — SQLCipher (full database encryption at rest)
// ---------------------------------------------------------------------------

/** SQLCipher configuration per platform */
export interface SqlCipherConfig {
  /** Key derived from Vault Key (or Vault Key itself) */
  passphrase: string
  /** SQLCipher KDF iterations (default 256000) */
  kdf_iter: number
  /** HMAC algorithm — 'HMAC_SHA512' */
  hmac_algorithm: string
  /** Page size — 4096 */
  page_size: number
  /** Plaintext header size — 0 (fully encrypted) */
  plaintext_header_size: number
}

// ---------------------------------------------------------------------------
// L2 — Field-level encryption (libsodium XChaCha20-Poly1305)
// ---------------------------------------------------------------------------

/** A single field-level encrypted value stored in SQLite */
export interface EncryptedField {
  /** Random 24-byte nonce, base64-encoded */
  nonce: string
  /** XChaCha20-Poly1305 ciphertext, base64-encoded */
  ciphertext: string
}

/** Encryption classification for schema fields */
export type FieldClassification = 'plaintext' | 'encrypted'

/**
 * Describes how a specific table's columns are classified.
 * Used by the encryption layer to know which fields to encrypt/decrypt.
 */
export interface TableEncryptionSchema {
  table: string
  fields: Record<string, FieldClassification>
}

// ---------------------------------------------------------------------------
// L3 — Sync blob encryption (in transit + at rest on server)
// ---------------------------------------------------------------------------

/**
 * Full row → LZ4 compress → XChaCha20-Poly1305 encrypt → base64.
 * This is the format stored on R2 and sent over the wire.
 */
export interface EncryptedSyncBlob {
  /** Random 24 bytes, base64-encoded */
  nonce: string
  /** LZ4(JSON.stringify(row)) encrypted with Vault Key */
  ciphertext: string
}

// ---------------------------------------------------------------------------
// Attachment encryption
// ---------------------------------------------------------------------------

/** Max 25 MB per attachment (ADR-003 §4.3) */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

export interface EncryptedAttachment {
  /** Original filename (encrypted separately as field-level) */
  filename: string
  mime_type: string
  size_bytes: number
  /** XChaCha20-Poly1305(VaultKey, nonce, file_bytes) */
  nonce: string
  ciphertext: Uint8Array
  /** Encrypted thumbnail for gallery preview (images only) */
  thumbnail_nonce: string | null
  thumbnail_ciphertext: Uint8Array | null
}

// ---------------------------------------------------------------------------
// FTS rebuild context
// ---------------------------------------------------------------------------

/**
 * FTS5 virtual tables are device-local and rebuilt on vault unlock
 * after decrypting E fields. This tracks rebuild state.
 */
export interface FtsRebuildStatus {
  table: string
  rows_indexed: number
  total_rows: number
  is_complete: boolean
  started_at: number
  completed_at: number | null
}

// ---------------------------------------------------------------------------
// Vault lifecycle
// ---------------------------------------------------------------------------

export type VaultState = 'locked' | 'unlocking' | 'unlocked' | 'error'

export interface VaultStatus {
  state: VaultState
  /** Set when state = 'error' */
  error: string | null
  /** True once SQLCipher DB is opened and Vault Key is in memory */
  db_unlocked: boolean
  /** True once FTS5 tables are rebuilt from decrypted fields */
  fts_ready: boolean
}
