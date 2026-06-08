// ============================================================================
// Key Management — Session caching, lifecycle, rotation prep
// ADR-001 §6 · ADR-002 §4 · architecture.md §3.3
//
// The Vault Key lives in memory ONLY while the vault is unlocked.
// This module manages its lifecycle: unlock → use → lock → wipe.
// ============================================================================

import type { KeyChain, VaultState, VaultStatus } from '@vida/types'
import { unlockKeyChain, createKeyChain, zeroKey, initVault } from './vault'

// ---------------------------------------------------------------------------
// In-memory key store (singleton)
// ---------------------------------------------------------------------------

let _vaultKey: Uint8Array | null = null
let _state: VaultState = 'locked'
let _error: string | null = null
let _dbUnlocked = false
let _ftsReady = false

type StatusListener = (status: VaultStatus) => void
const _listeners: Set<StatusListener> = new Set()

function buildStatus(): VaultStatus {
  return {
    state: _state,
    error: _error,
    db_unlocked: _dbUnlocked,
    fts_ready: _ftsReady,
  }
}

function setState(state: VaultState, error?: string): void {
  _state = state
  _error = error ?? null
  const status = buildStatus()
  for (const listener of _listeners) {
    listener(status)
  }
}

// ---------------------------------------------------------------------------
// Public API — status
// ---------------------------------------------------------------------------

/** Get current vault status */
export function getVaultStatus(): VaultStatus {
  return buildStatus()
}

/** Subscribe to vault status changes. Returns unsubscribe function. */
export function onVaultStatusChange(listener: StatusListener): () => void {
  _listeners.add(listener)
  return () => { _listeners.delete(listener) }
}

/** Check if the vault is currently unlocked */
export function isUnlocked(): boolean {
  return _state === 'unlocked' && _vaultKey !== null
}

// ---------------------------------------------------------------------------
// Public API — unlock / lock
// ---------------------------------------------------------------------------

/**
 * Unlock the vault during login.
 * Derives the full key chain and caches the Vault Key in memory.
 *
 * @param password   - User's plaintext password
 * @param accountKey - User's Account Key (from recovery key input)
 * @param salt       - Argon2id salt (from server during SRP challenge)
 * @returns The Vault Key (also cached internally)
 */
export async function unlock(
  password: string,
  accountKey: Uint8Array,
  salt: Uint8Array,
): Promise<Uint8Array> {
  if (_state === 'unlocked' && _vaultKey !== null) {
    return _vaultKey
  }

  setState('unlocking')

  try {
    await initVault()

    const keyChain = unlockKeyChain(password, accountKey, salt)

    // Cache only the vault key — master key is ephemeral
    _vaultKey = keyChain.vault_key

    // Securely wipe the master key from memory
    zeroKey(keyChain.master_key)

    setState('unlocked')
    return keyChain.vault_key
  } catch (err) {
    setState('error', err instanceof Error ? err.message : 'Unlock failed')
    throw err
  }
}

/**
 * Lock the vault — wipe the Vault Key from memory.
 * Call this on app background, session timeout, or explicit user lock.
 */
export function lock(): void {
  if (_vaultKey !== null) {
    zeroKey(_vaultKey)
    _vaultKey = null
  }
  _dbUnlocked = false
  _ftsReady = false
  setState('locked')
}

/**
 * Get the cached Vault Key.
 * Throws if the vault is locked.
 */
export function getVaultKey(): Uint8Array {
  if (_vaultKey === null || _state !== 'unlocked') {
    throw new Error('Vault is locked — call unlock() first')
  }
  return _vaultKey
}

// ---------------------------------------------------------------------------
// Public API — DB & FTS lifecycle flags
// ---------------------------------------------------------------------------

/**
 * Mark SQLCipher database as opened.
 * Called by the database adapter after successfully opening the encrypted DB.
 */
export function markDbUnlocked(): void {
  _dbUnlocked = true
  const status = buildStatus()
  for (const listener of _listeners) {
    listener(status)
  }
}

/**
 * Mark FTS5 tables as rebuilt.
 * Called after decrypted fields have been indexed into FTS virtual tables.
 */
export function markFtsReady(): void {
  _ftsReady = true
  const status = buildStatus()
  for (const listener of _listeners) {
    listener(status)
  }
}

// ---------------------------------------------------------------------------
// Key rotation — password change
// ---------------------------------------------------------------------------

/**
 * Prepare for key rotation when the user changes their password.
 *
 * Returns the OLD vault key (for re-encryption) and the NEW key chain.
 * The caller must:
 *   1. Re-encrypt all L2 (field-level) encrypted fields with the new vault key
 *   2. Re-derive the SQLCipher passphrase and re-key the database
 *   3. Send the new salt + SRP verifier to the server
 *   4. Update the cached vault key via commitKeyRotation()
 *
 * This does NOT automatically re-encrypt anything — it only derives the new keys.
 */
export async function prepareKeyRotation(
  newPassword: string,
): Promise<{
  oldVaultKey: Uint8Array
  newKeyChain: KeyChain
  newSalt: Uint8Array
}> {
  const oldVaultKey = getVaultKey() // throws if locked

  await initVault()
  const { keyChain: newKeyChain, salt: newSalt } = createKeyChain(newPassword)

  return { oldVaultKey, newKeyChain, newSalt }
}

/**
 * Commit the key rotation after all data has been re-encrypted.
 * Replaces the cached vault key and wipes the old one.
 *
 * @param newKeyChain - The new KeyChain from prepareKeyRotation()
 */
export function commitKeyRotation(newKeyChain: KeyChain): void {
  if (_vaultKey !== null) {
    zeroKey(_vaultKey)
  }

  _vaultKey = newKeyChain.vault_key

  // Wipe the master key — only vault key stays in memory
  zeroKey(newKeyChain.master_key)

  setState('unlocked')
}

// ---------------------------------------------------------------------------
// Session timeout
// ---------------------------------------------------------------------------

// Timer functions — available in all target runtimes (web, Node, RN)
declare function setTimeout(fn: () => void, ms: number): number
declare function clearTimeout(id: number): void

let _timeoutId: number | null = null

/**
 * Start an auto-lock timer. Resets on each call.
 * When the timer fires, the vault is locked and keys are wiped.
 *
 * @param ms - Milliseconds of inactivity before auto-lock
 */
export function startAutoLockTimer(ms: number): void {
  clearAutoLockTimer()
  _timeoutId = setTimeout(() => {
    lock()
  }, ms)
}

/** Reset the auto-lock timer (call on user activity) */
export function resetAutoLockTimer(ms: number): void {
  startAutoLockTimer(ms)
}

/** Cancel the auto-lock timer */
export function clearAutoLockTimer(): void {
  if (_timeoutId !== null) {
    clearTimeout(_timeoutId)
    _timeoutId = null
  }
}
