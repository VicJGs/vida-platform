// @vitest-environment node
// UI-4 · S4 — the marker repo drives a FAKE SqliteDriver (FOLD-1: no jsdom, no worker). Locks the exact SQL +
// params and the read's completed/first-run mapping. `../db/boot` is mocked so no real client/worker loads.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIRST_RUN_COMPLETE_KEY, FIRST_RUN_COMPLETE_VALUE } from './first-run'

const h = vi.hoisted(() => ({ query: vi.fn(), run: vi.fn() }))
vi.mock('../db/boot', () => ({ getDbClient: () => ({ driver: { query: h.query, run: h.run } }) }))

import { readFirstRunComplete, writeFirstRunComplete } from './first-run-repo'
import { writeLock } from '../db/write-lock'

beforeEach(() => {
  h.query.mockReset()
  h.run.mockReset()
})

describe('readFirstRunComplete', () => {
  it('OB-3 SELECTs the marker with the reserved key', async () => {
    h.query.mockResolvedValueOnce([{ value: FIRST_RUN_COMPLETE_VALUE }])
    await readFirstRunComplete()
    expect(h.query).toHaveBeenCalledWith('SELECT value FROM app_state WHERE key = ?', [FIRST_RUN_COMPLETE_KEY])
  })

  it('OB-3 is true only for the completion value', async () => {
    h.query.mockResolvedValueOnce([{ value: FIRST_RUN_COMPLETE_VALUE }])
    expect(await readFirstRunComplete()).toBe(true)
  })

  it('OB-3 is false when the marker row is absent (fresh device)', async () => {
    h.query.mockResolvedValueOnce([])
    expect(await readFirstRunComplete()).toBe(false)
  })

  it('OB-3 is false for a non-completion value', async () => {
    h.query.mockResolvedValueOnce([{ value: '0' }])
    expect(await readFirstRunComplete()).toBe(false)
  })
})

describe('writeFirstRunComplete', () => {
  it('OB-5 upserts the completion marker (INSERT OR REPLACE — idempotent)', async () => {
    h.run.mockResolvedValueOnce(undefined)
    await writeFirstRunComplete()
    expect(h.run).toHaveBeenCalledWith('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [
      FIRST_RUN_COMPLETE_KEY,
      FIRST_RUN_COMPLETE_VALUE,
    ])
  })

  it('OB-5 waits for an in-flight exclusive write before writing the marker (BR-RT-LOCK, R1-BR-5)', async () => {
    h.run.mockResolvedValue(undefined)
    let release!: () => void
    let acquired!: () => void
    const isHeld = new Promise<void>((r) => (acquired = r))
    const held = writeLock.runExclusive(
      () =>
        new Promise<void>((r) => {
          release = r
          acquired()
        }),
    )
    await isHeld // the "open transaction" now holds the lock
    const marker = writeFirstRunComplete()
    await new Promise((r) => setTimeout(r, 10))
    expect(h.run).not.toHaveBeenCalled() // still queued behind the open transaction
    release()
    await held
    await marker
    expect(h.run).toHaveBeenCalledTimes(1)
  })
})
