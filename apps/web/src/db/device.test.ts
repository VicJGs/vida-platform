// @vitest-environment node
// MOD-notes ② · B1 — device.ts drives a FAKE SqliteDriver (no jsdom, no worker); `./boot` + `@vida/core` uuidv7
// are mocked. Locks the exact app_state SQL, the gen-once-on-fresh path, the memo, and the pre-boot throw. Each
// test re-imports the module (vi.resetModules) so the module-scope memo starts clean.
import { beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ query: vi.fn(), run: vi.fn(), uuid: vi.fn() }))
vi.mock('./boot', () => ({ getDbClient: () => ({ driver: { query: h.query, run: h.run } }) }))
vi.mock('@vida/core', () => ({ uuidv7: h.uuid }))

beforeEach(() => {
  vi.resetModules() // reset device.ts's module-scope memo between tests
  h.query.mockReset()
  h.run.mockReset()
  h.uuid.mockReset()
})

describe('ensureDeviceId', () => {
  it('SELECTs the persisted device_id and returns it (existing device — no write, no gen)', async () => {
    h.query.mockResolvedValueOnce([{ value: 'existing-device-id' }])
    const { ensureDeviceId } = await import('./device')
    expect(await ensureDeviceId()).toBe('existing-device-id')
    expect(h.query).toHaveBeenCalledWith('SELECT value FROM app_state WHERE key = ?', ['device_id'])
    expect(h.run).not.toHaveBeenCalled()
    expect(h.uuid).not.toHaveBeenCalled()
  })

  it('generates a UUIDv7 and upserts it on a fresh device (INSERT OR REPLACE — idempotent)', async () => {
    h.query.mockResolvedValueOnce([]) // no row
    h.uuid.mockReturnValueOnce('new-uuid-v7')
    const { ensureDeviceId } = await import('./device')
    expect(await ensureDeviceId()).toBe('new-uuid-v7')
    expect(h.run).toHaveBeenCalledWith('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', [
      'device_id',
      'new-uuid-v7',
    ])
  })

  it('memoizes — a second call does not re-query', async () => {
    h.query.mockResolvedValueOnce([{ value: 'memoized-id' }])
    const { ensureDeviceId } = await import('./device')
    await ensureDeviceId()
    await ensureDeviceId()
    expect(h.query).toHaveBeenCalledTimes(1)
  })
})

describe('getDeviceId', () => {
  it('throws before ensureDeviceId has resolved (boot-ordering guard)', async () => {
    const { getDeviceId } = await import('./device')
    expect(() => getDeviceId()).toThrow(/before ensureDeviceId/)
  })

  it('returns the resolved id after ensureDeviceId', async () => {
    h.query.mockResolvedValueOnce([{ value: 'resolved-id' }])
    const { ensureDeviceId, getDeviceId } = await import('./device')
    await ensureDeviceId()
    expect(getDeviceId()).toBe('resolved-id')
  })
})
