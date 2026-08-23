// Regression guard for docs/specs/fixes/vault-not-initialized-on-boot.
//
// THE BUG: apps/web never called initVault() at startup, so every repository WRITE
// threw `Vault not initialized` at computeSyncHash → hashContent → assertReady().
// It hid because NO web test ever ran the real create path — commands.test.ts mocks
// the service and App.integration/App.test mock ./db/boot. So the fix belongs guarded
// at the BOOT level: ensureDbReady() must leave the vault ready so a write's keyless
// `_sync_hash` (BLAKE2b via hashContent) can be computed. Platform-wide, not notes.
//
// The real worker + OPFS can't run in jsdom (apps/web/src/db/CLAUDE.md), so we mock the
// worker boundary (./client, ./device-id) but keep @vida/core REAL: the actual initVault
// (spied) + the actual hashContent — the exact function that threw. (@vida/core's own
// repository.test.ts proves initVault → repository.create computes _sync_hash end-to-end.)
import { describe, it, expect, vi } from 'vitest'

// Keep @vida/core real; wrap initVault in a spy so we can assert boot CALLS it (the
// precise regression: "boot forgot initVault" → the spy is never called → test fails).
vi.mock('@vida/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vida/core')>()
  return { ...actual, initVault: vi.fn(actual.initVault) }
})

// The worker/OPFS boundary — no real worker in jsdom. open() resolves; driver is inert
// (device-id is mocked, so the driver is never actually used).
vi.mock('./client', () => ({
  WorkerDbClient: class {
    driver = {}
    async open() {}
    terminate() {}
  },
}))
vi.mock('./device-id', () => ({
  getOrCreateDeviceId: vi.fn(async () => 'test-device-id'),
}))

import { ensureDbReady } from './boot'
import { getOrCreateDeviceId } from './device-id'
import { initVault, hashContent } from '@vida/core'

describe('ensureDbReady — vault init precondition (fix: vault-not-initialized-on-boot)', () => {
  it('calls initVault() so a repository write can compute _sync_hash', async () => {
    await ensureDbReady()

    // Boot must initialize libsodium — the missing call that broke every write.
    expect(initVault).toHaveBeenCalled()

    // The exact function that threw pre-fix (hashContent → assertReady) must now work.
    expect(() => hashContent('sync-hash-probe')).not.toThrow()
    expect(hashContent('sync-hash-probe')).toMatch(/^[0-9a-f]{64}$/)
  })

  it('still resolves the device id after the DB opens (ordering preserved)', async () => {
    await ensureDbReady()
    expect(getOrCreateDeviceId).toHaveBeenCalled()
  })
})
