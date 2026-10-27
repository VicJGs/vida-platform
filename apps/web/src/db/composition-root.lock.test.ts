// preferences-rescope R1 (LIF-247) — the composition root applies the app-wide write lock (BR-RT-LOCK). Without this
// test nothing would catch the wrapper being dropped from `build()`: two concurrent service writes must not interleave.
import { describe, it, expect, vi } from 'vitest'

const h = vi.hoisted(() => ({ log: [] as string[] }))

vi.mock('./boot', () => ({
  ensureDbReady: () => Promise.resolve(),
  getDbClient: () => ({
    driver: {
      exec: async () => ({ rows: [], changes: 0 }),
      run: async (s: string) => {
        h.log.push(s.split(' ')[0]!.toLowerCase())
      },
      // The device_id read (composition-root resolveDeviceId) — an existing id, so no raw write at boot.
      query: async () => [{ value: 'dev-1' }],
      values: async () => [],
      batch: async () => {},
      close: async () => {},
    },
  }),
}))

describe('composition root — the write lock (BR-RT-LOCK)', () => {
  it('serializes concurrent service writes through the write lock', async () => {
    const { getServices } = await import('./composition-root')
    const services = await getServices()
    expect(services.preferences).toBeDefined() // ELC-3 — preferences-rescope R2
    await Promise.all([
      services.notes.createPage({ type: 'note', title: 'a' }),
      services.notes.createPage({ type: 'note', title: 'b' }),
    ])
    // Each createPage = one transaction (pages insert + sync_queue insert). Blocks must never overlap.
    const blocks: string[][] = []
    let current: string[] | null = null
    for (const s of h.log) {
      if (s === 'begin') {
        expect(current).toBeNull() // a second begin before commit = interleaved
        current = []
      } else if (s === 'commit' || s === 'rollback') {
        expect(current).not.toBeNull()
        blocks.push(current!)
        current = null
      } else {
        expect(current).not.toBeNull() // no statement outside a transaction block
        current!.push(s)
      }
    }
    expect(current).toBeNull()
    expect(blocks).toHaveLength(2)
  }, 30_000) // cold @vida/core import + libsodium (initVault) exceed the 5 s default
})
