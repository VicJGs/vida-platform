// fe-calendar S7 (BR-CAL-S7-7 / PLAN-S7 §5 step 5) — `getServices()` is a build-ONCE singleton: concurrent first callers
// share one construction (one device-id resolution, one lane registration) — the boot layer mocked to a live
// better-sqlite3 vault so no worker/OPFS is needed.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@vida/core'
import { createBetterSqlite3Driver } from './test-driver'

// The first test of the file pays the cold @vida/core import (F008); the calendar-surface.test.tsx:19 precedent.
vi.setConfig({ testTimeout: 15000 })

const boot = vi.hoisted(() => ({ ready: 0, driver: null as unknown, failNext: false }))
vi.mock('./boot', () => ({
  ensureDbReady: async () => {
    boot.ready++
    if (boot.failNext) {
      boot.failNext = false
      throw new Error('DB worker crashed')
    }
  },
  getDbClient: () => ({ driver: boot.driver }),
}))

beforeEach(() => {
  vi.resetModules()
  boot.ready = 0
  boot.failNext = false
})

describe('getServices — the composition-root singleton', () => {
  // LIF-250 — the boot.ts rule: a rejected build is not cached; the next call re-builds and succeeds.
  it('a rejected build is not cached: the next call builds again', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await migrate(driver)
    boot.driver = driver
    boot.failNext = true
    const { getServices } = await import('./composition-root')
    await expect(getServices()).rejects.toThrow(/crashed/)
    const services = await getServices()
    expect(services.notes).toBeDefined()
    expect(boot.ready).toBe(2)
    expect(await getServices()).toBe(services) // and then it is the singleton again
  })

  it('concurrent + repeated callers get the SAME services, built once', async () => {
    const driver = createBetterSqlite3Driver(new Database(':memory:'))
    await migrate(driver)
    boot.driver = driver
    const { getServices } = await import('./composition-root')
    const [a, b] = await Promise.all([getServices(), getServices()])
    const c = await getServices()
    expect(a).toBe(b)
    expect(c).toBe(a)
    expect(boot.ready).toBe(1)
    // the device id was resolved (and persisted) exactly once
    const rows = await driver.query<{ value: string }>("SELECT value FROM app_state WHERE key = 'device_id'")
    expect(rows).toHaveLength(1)
  })
})
