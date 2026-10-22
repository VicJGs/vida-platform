// fe-calendar S7 (BR-CAL-S7-7 / PLAN-S7 §5 step 5) — `getServices()` is a build-ONCE singleton: concurrent first callers
// share one construction (one device-id resolution, one lane registration) — the boot layer mocked to a live
// better-sqlite3 vault so no worker/OPFS is needed.
import { describe, expect, it, vi } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@vida/core'
import { createBetterSqlite3Driver } from './test-driver'

const boot = vi.hoisted(() => ({ ready: 0, driver: null as unknown }))
vi.mock('./boot', () => ({
  ensureDbReady: async () => {
    boot.ready++
  },
  getDbClient: () => ({ driver: boot.driver }),
}))

describe('getServices — the composition-root singleton', () => {
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
