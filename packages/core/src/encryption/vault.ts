// ============================================================================
// Vault — Key derivation, encrypt/decrypt, account key generation
// ADR-001 §6 · ADR-002 §4 · architecture.md §3.3
//
// Key hierarchy:
//   1. User chooses password
//   2. Master Key  = Argon2id(password, salt)
//   3. Account Key = random 256-bit (shown once as recovery key)
//   4. Vault Key   = BLAKE2b-256(Master Key ‖ Account Key)
//   5. Vault Key encrypts/decrypts all data (XChaCha20-Poly1305)
// ============================================================================

import sodium from 'libsodium-wrappers-sumo'
import type { KeyChain, EncryptedField } from '@vida/types'

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

let _ready = false

/** Ensure libsodium WASM is loaded. Call once at app startup. */
export async function initVault(): Promise<void> {
  if (_ready) return
  await sodium.ready
  _ready = true
}

function assertReady(): void {
  if (!_ready) {
    throw new Error('Vault not initialized — call initVault() first')
  }
}

// ---------------------------------------------------------------------------
// Constants — standardized libsodium values (hardcoded for WASM compatibility)
// ---------------------------------------------------------------------------

const KEY_LENGTH = 32             // crypto_secretbox_KEYBYTES
const NONCE_LENGTH = 24           // crypto_secretbox_NONCEBYTES
const SALT_LENGTH = 16            // crypto_pwhash_SALTBYTES
const ACCOUNT_KEY_LENGTH = 32     // 256-bit

/** Argon2id: OWASP recommended for interactive logins */
const ARGON2_OPS_LIMIT = 2        // crypto_pwhash_OPSLIMIT_INTERACTIVE
const ARGON2_MEM_LIMIT = 67108864 // crypto_pwhash_MEMLIMIT_INTERACTIVE (64 MiB)
const ARGON2_ALGORITHM = 2        // crypto_pwhash_ALG_ARGON2ID13

// ---------------------------------------------------------------------------
// Key derivation
// ---------------------------------------------------------------------------

/**
 * Derive a Master Key from a password using Argon2id.
 *
 * @param password  - User's plaintext password (UTF-8)
 * @param salt      - 16-byte random salt (stored on server with SRP verifier)
 * @returns 32-byte Master Key
 */
export function deriveMasterKey(password: string, salt: Uint8Array): Uint8Array {
  assertReady()

  if (salt.length !== SALT_LENGTH) {
    throw new Error(`Salt must be ${SALT_LENGTH} bytes, got ${salt.length}`)
  }

  return sodium.crypto_pwhash(
    KEY_LENGTH,
    password,
    salt,
    ARGON2_OPS_LIMIT,
    ARGON2_MEM_LIMIT,
    ARGON2_ALGORITHM,
  )
}

/**
 * Derive the Vault Key from Master Key + Account Key using BLAKE2b-256.
 *
 * VaultKey = BLAKE2b-256(key=MasterKey, message=AccountKey)
 *
 * This replaces HKDF — BLAKE2b is libsodium-native, faster, and equally
 * secure for this use case (combining two high-entropy keys).
 */
export function deriveVaultKey(masterKey: Uint8Array, accountKey: Uint8Array): Uint8Array {
  assertReady()

  if (masterKey.length !== KEY_LENGTH) {
    throw new Error(`Master key must be ${KEY_LENGTH} bytes`)
  }
  if (accountKey.length !== ACCOUNT_KEY_LENGTH) {
    throw new Error(`Account key must be ${ACCOUNT_KEY_LENGTH} bytes`)
  }

  return sodium.crypto_generichash(KEY_LENGTH, accountKey, masterKey)
}

/**
 * Generate a random salt for Argon2id.
 * Stored on server alongside the SRP verifier.
 */
export function generateSalt(): Uint8Array {
  assertReady()
  return sodium.randombytes_buf(SALT_LENGTH)
}

// ---------------------------------------------------------------------------
// Account key generation
// ---------------------------------------------------------------------------

/**
 * Generate a random 256-bit Account Key.
 * Shown to the user ONCE as a recovery key (e.g. "XXXXX-XXXXX-XXXXX-XXXXX-XXXXX").
 */
export function generateAccountKey(): Uint8Array {
  assertReady()
  return sodium.randombytes_buf(ACCOUNT_KEY_LENGTH)
}

/**
 * Format an Account Key as a human-readable recovery string.
 * Groups of 5 uppercase base32-like characters separated by dashes.
 */
export function formatAccountKey(accountKey: Uint8Array): string {
  assertReady()
  const hex = sodium.to_hex(accountKey).toUpperCase()
  // Split into groups of 5 characters
  const groups: string[] = []
  for (let i = 0; i < hex.length; i += 5) {
    groups.push(hex.slice(i, i + 5))
  }
  return groups.join('-')
}

/**
 * Parse a human-readable recovery string back into an Account Key.
 */
export function parseAccountKey(formatted: string): Uint8Array {
  assertReady()
  const hex = formatted.replace(/-/g, '').toLowerCase()
  return sodium.from_hex(hex)
}

// ---------------------------------------------------------------------------
// Full key chain — account creation & unlock
// ---------------------------------------------------------------------------

/**
 * Create a full key chain during account registration.
 * Returns the KeyChain + salt (salt must be sent to server).
 */
export function createKeyChain(password: string): { keyChain: KeyChain; salt: Uint8Array } {
  assertReady()

  const salt = generateSalt()
  const masterKey = deriveMasterKey(password, salt)
  const accountKey = generateAccountKey()
  const vaultKey = deriveVaultKey(masterKey, accountKey)

  return {
    keyChain: { master_key: masterKey, account_key: accountKey, vault_key: vaultKey },
    salt,
  }
}

/**
 * Reconstruct the key chain during login / device setup.
 * The user provides their password + Account Key (recovery key).
 * The salt is fetched from the server during SRP handshake.
 */
export function unlockKeyChain(
  password: string,
  accountKey: Uint8Array,
  salt: Uint8Array,
): KeyChain {
  assertReady()

  const masterKey = deriveMasterKey(password, salt)
  const vaultKey = deriveVaultKey(masterKey, accountKey)

  return { master_key: masterKey, account_key: accountKey, vault_key: vaultKey }
}

// ---------------------------------------------------------------------------
// Encrypt / Decrypt — XChaCha20-Poly1305 (L2 field-level)
// ---------------------------------------------------------------------------

/**
 * Encrypt a plaintext string with the Vault Key.
 * Returns an EncryptedField (nonce + ciphertext, both base64).
 */
export function encryptField(plaintext: string, vaultKey: Uint8Array): EncryptedField {
  assertReady()

  const nonce = sodium.randombytes_buf(NONCE_LENGTH)
  const ciphertext = sodium.crypto_secretbox_easy(plaintext, nonce, vaultKey)

  return {
    nonce: sodium.to_base64(nonce),
    ciphertext: sodium.to_base64(ciphertext),
  }
}

/**
 * Decrypt an EncryptedField back to plaintext.
 * Throws if the key is wrong or the data is tampered.
 */
export function decryptField(encrypted: EncryptedField, vaultKey: Uint8Array): string {
  assertReady()

  const nonce = sodium.from_base64(encrypted.nonce)
  const ciphertext = sodium.from_base64(encrypted.ciphertext)
  const decrypted = sodium.crypto_secretbox_open_easy(ciphertext, nonce, vaultKey)

  return sodium.to_string(decrypted)
}

/**
 * Encrypt arbitrary bytes (for attachments, blobs).
 * Returns nonce + ciphertext as raw Uint8Arrays.
 */
export function encryptBytes(
  data: Uint8Array,
  vaultKey: Uint8Array,
): { nonce: Uint8Array; ciphertext: Uint8Array } {
  assertReady()

  const nonce = sodium.randombytes_buf(NONCE_LENGTH)
  const ciphertext = sodium.crypto_secretbox_easy(data, nonce, vaultKey)

  return { nonce, ciphertext }
}

/**
 * Decrypt raw bytes.
 */
export function decryptBytes(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  vaultKey: Uint8Array,
): Uint8Array {
  assertReady()
  return sodium.crypto_secretbox_open_easy(ciphertext, nonce, vaultKey)
}

// ---------------------------------------------------------------------------
// Hashing — SHA-256 for sync content hashing
// ---------------------------------------------------------------------------

/**
 * Compute a SHA-256 hash of a string (for _sync_hash).
 * Uses BLAKE2b (libsodium-native) with 32-byte output — functionally
 * equivalent to SHA-256 for content fingerprinting.
 */
export function hashContent(content: string): string {
  assertReady()
  return sodium.crypto_generichash(32, content, null, 'hex')
}

// ---------------------------------------------------------------------------
// Memory safety
// ---------------------------------------------------------------------------

/**
 * Securely zero a key from memory when no longer needed.
 * Call this on master_key after deriving the vault_key.
 */
export function zeroKey(key: Uint8Array): void {
  assertReady()
  sodium.memzero(key)
}
