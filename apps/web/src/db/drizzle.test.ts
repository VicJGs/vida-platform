// MOD-notes ②a — DP-8 whole-transaction serialization. The regression guard for
// the gate-2 blocker: a per-RPC queue would INTERLEAVE transactions; the mutex
// wrapping `db.transaction` must keep each `begin…commit` contiguous. Uses a fake
// base `DrizzleDb` whose `.transaction` yields between begin/commit — so an
// UNGUARDED wrapper would demonstrably interleave, and the mutex must prevent it.
import { describe, it, expect, beforeEach, vi } from 'vitest'

// A per-test-settable fake base that `createDrizzleProxy` returns.
let fakeBase: Record<string, unknown>

vi.mock('@vida/core', () => ({
  createDrizzleProxy: () => fakeBase,
}))
vi.mock('./boot', () => ({
  getDbClient: () => ({ driver: {} }),
}))

import { getDb, resetDbForTest } from './drizzle'

/** A fake base whose `.transaction` records begin/commit with an async gap. */
function makeRecordingBase() {
  const order: string[] = []
  let n = 0
  return {
    order,
    base: {
      async transaction(cb: (tx: unknown) => Promise<unknown> | unknown) {
        const id = ++n
        order.push(`begin${id}`)
        await Promise.resolve() // yield — an unguarded wrapper interleaves here
        await cb({})
        await Promise.resolve()
        order.push(`commit${id}`)
        return id
      },
      select() {
        return 'select-passthrough'
      },
    },
  }
}

describe('getDb — DP-8 transaction serialization', () => {
  beforeEach(() => resetDbForTest())

  it('serializes concurrent transactions — begin…commit stay contiguous (no BEGIN…BEGIN)', async () => {
    const { order, base } = makeRecordingBase()
    fakeBase = base
    const db = getDb()
    await Promise.all([db.transaction(async () => {}), db.transaction(async () => {})])
    // Mutex → each transaction runs to completion before the next begins.
    expect(order).toEqual(['begin1', 'commit1', 'begin2', 'commit2'])
    // Explicit: no begin arrives before the prior commit.
    for (let i = 0; i < order.length; i += 2) {
      expect(order[i]).toMatch(/^begin/)
      expect(order[i + 1]).toMatch(/^commit/)
    }
  })

  it('a rejected transaction does not stall the next one (chain-on-settle)', async () => {
    const order: string[] = []
    fakeBase = {
      async transaction(cb: () => unknown) {
        order.push('run')
        return cb()
      },
    }
    const db = getDb()
    const failing = db.transaction(async () => {
      throw new Error('boom')
    })
    await expect(failing).rejects.toThrow('boom') // caller still sees its rejection
    await expect(db.transaction(async () => 'ok')).resolves.toBe('ok') // queue not stalled
    expect(order).toEqual(['run', 'run'])
  })

  it('non-transaction methods (reads) pass through un-gated', () => {
    fakeBase = { transaction: async () => 0, select: () => 'select-passthrough' }
    const db = getDb() as unknown as { select: () => string }
    expect(db.select()).toBe('select-passthrough')
  })

  it('memoizes a single instance', () => {
    fakeBase = { transaction: async () => 0 }
    expect(getDb()).toBe(getDb())
  })
})
