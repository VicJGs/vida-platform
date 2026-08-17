// @vitest-environment node
// UI-4 · S4 — the marker repo drives a FAKE SqliteDriver (FOLD-1: no jsdom, no worker). Locks the exact SQL +
// params and the read's completed/first-run mapping. `../db/boot` is mocked so no real client/worker loads.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FIRST_RUN_COMPLETE_KEY, FIRST_RUN_COMPLETE_VALUE } from './first-run'

const h = vi.hoisted(() => ({ query: vi.fn(), run: vi.fn() }))
vi.mock('../db/boot', () => ({ getDbClient: () => ({ driver: { query: h.query, run: h.run } }) }))

import { readFirstRunComplete, writeFirstRunComplete } from './first-run-repo'

beforeEach(() => {
  h.query.mockReset()
  h.run.mockReset()
})

describe('readFirstRunComplete', () => {
  it('SELECTs the marker with the reserved key', async () => {
    h.query.mockResolvedValueOnce([{ value: FIRST_RUN_COMPLETE_VALUE }])
    await readFirstRunComplete()
    expect(h.query).toHaveBeenCalledWith('SELECT value FROM app_state WHERE key = ?', [FIRST_RUN_COMPLETE_KEY])
  })

  it('is true only for the completion value', async () => {
    h.query.mockResolvedValueOnce([{ value: FIRST_RUN_COMPLETE_VALUE }])
    expect(await readFirstRunComplete()).toBe(true)
  })

  it('is false when the marker row is absent (fresh device)', async () => {
    h.query.mockResolvedValueOnce([])
    expect(await readFirstRunComplete()).toBe(false)
  })

  it('is false for a non-completion value', async () => {
    h.query.mockResolvedValueOnce([{ value: '0' }])
    expect(await readFirstRunComplete()).toBe(false)
  })
})

describe('writeFirstRunComplete', () => {
  it('upserts the completion marker (INSERT OR REPLACE — idempotent)', async () => {
    h.run.mockResolvedValueOnce(undefined)
    await writeFirstRunComplete()
    expect(h.run).toHaveBeenCalledWith('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [
      FIRST_RUN_COMPLETE_KEY,
      FIRST_RUN_COMPLETE_VALUE,
    ])
  })
})
