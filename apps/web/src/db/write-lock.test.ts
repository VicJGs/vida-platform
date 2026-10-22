// preferences-rescope R1 (LIF-247) — the app-wide write lock (BR-RT-LOCK). Proves the FIFO mutex + its forwarding rule,
// and that `withTransactionLock` stops drizzle sqlite-proxy transactions from interleaving on the one worker connection.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { sql } from 'drizzle-orm'
import { createDrizzleProxy, type SqliteDriver } from '@vida/core'
import { createWriteLock, withTransactionLock, TransactionLockTimeoutError } from './write-lock'

function deferred<T = void>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** A fake driver that logs every statement the drizzle proxy sends. `failOn` makes a matching `run` reject. */
function fakeDriver(opts: { failOn?: RegExp } = {}) {
  const log: string[] = []
  const driver: SqliteDriver = {
    exec: async () => ({ rows: [], changes: 0 }) as never,
    run: async (s: string) => {
      log.push(s)
      if (opts.failOn?.test(s)) throw new Error(`driver died on: ${s}`)
    },
    query: async () => [],
    values: async (s: string) => {
      log.push(s)
      return []
    },
    batch: async () => {},
    close: async () => {},
  }
  return { driver, log }
}

/** True when every `begin` is followed by its own `commit|rollback` before the next statement block starts. */
function isSerialized(log: string[]): boolean {
  let open = false
  for (const s of log) {
    if (s === 'begin') {
      if (open) return false
      open = true
    } else if (s === 'commit' || s === 'rollback') {
      if (!open) return false
      open = false
    } else if (!open) {
      return false // a statement outside any transaction block in these tests means a foreign statement leaked
    }
  }
  return !open
}

afterEach(() => {
  vi.useRealTimers()
})

describe('createWriteLock', () => {
  it('runs concurrent sections one at a time, in FIFO order', async () => {
    const lock = createWriteLock({ waitTimeoutMs: 1_000 })
    const order: number[] = []
    let active = 0
    await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        lock.runExclusive(async () => {
          active++
          expect(active).toBe(1)
          await Promise.resolve()
          order.push(n)
          active--
        }),
      ),
    )
    expect(order).toEqual([1, 2, 3, 4, 5])
    expect(lock.isIdle()).toBe(true)
  })

  it('releases after a throwing section, so the next caller still runs', async () => {
    const lock = createWriteLock({ waitTimeoutMs: 1_000 })
    const failing = lock.runExclusive(async () => {
      throw new Error('boom')
    })
    const next = lock.runExclusive(async () => 'ran')
    await expect(failing).rejects.toThrow('boom')
    await expect(next).resolves.toBe('ran')
    expect(lock.isIdle()).toBe(true)
  })

  it('rejects a waiter past the timeout with a typed error, without running it', async () => {
    vi.useFakeTimers()
    const lock = createWriteLock({ waitTimeoutMs: 100 })
    const hold = deferred()
    const a = lock.runExclusive(() => hold.promise)
    const body = vi.fn(async () => 'never')
    const b = lock.runExclusive(body)
    const bExpect = expect(b).rejects.toBeInstanceOf(TransactionLockTimeoutError)
    await vi.advanceTimersByTimeAsync(101)
    await bExpect
    expect(body).not.toHaveBeenCalled()
    hold.resolve()
    await a
    expect(lock.isIdle()).toBe(true)
  })

  it('forwards a timed-out waiter’s slot: A holds, B times out, C runs as soon as A releases', async () => {
    vi.useFakeTimers()
    const lock = createWriteLock({ waitTimeoutMs: 100 })
    const hold = deferred()
    const a = lock.runExclusive(() => hold.promise)
    const b = lock.runExclusive(async () => 'b')
    const bExpect = expect(b).rejects.toBeInstanceOf(TransactionLockTimeoutError)
    await vi.advanceTimersByTimeAsync(101) // B times out; C has not been queued yet
    await bExpect
    let cRan = false
    const c = lock.runExclusive(async () => {
      cRan = true
      return 'c'
    }) // queued behind B's (dead) slot
    await vi.advanceTimersByTimeAsync(0)
    expect(cRan).toBe(false) // B's dead slot must NOT let C past A, which still holds the lock
    hold.resolve()
    await a
    await expect(c).resolves.toBe('c')
    expect(lock.isIdle()).toBe(true)
  })

  it('reports isIdle only when nothing is held or queued', async () => {
    const lock = createWriteLock({ waitTimeoutMs: 1_000 })
    expect(lock.isIdle()).toBe(true)
    const hold = deferred()
    const a = lock.runExclusive(() => hold.promise)
    const b = lock.runExclusive(async () => {})
    expect(lock.isIdle()).toBe(false)
    hold.resolve()
    await a
    await b
    expect(lock.isIdle()).toBe(true)
  })

  it('warns with the holder’s stack when the lock is held past holdWarnMs', async () => {
    vi.useFakeTimers()
    const warn = vi.fn()
    const lock = createWriteLock({ waitTimeoutMs: 10_000, holdWarnMs: 50, warn })
    const hold = deferred()
    const a = lock.runExclusive(() => hold.promise)
    await vi.advanceTimersByTimeAsync(51)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/held for/)
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/write-lock holder/)
    expect(String(warn.mock.calls[0]?.[0])).toMatch(/write-lock\.(test\.)?ts/) // a real captured stack frame
    hold.resolve()
    await a
  })
})

describe('withTransactionLock (drizzle sqlite-proxy)', () => {
  const twoTransactions = (db: ReturnType<typeof createDrizzleProxy>) =>
    Promise.all([
      db.transaction(async (tx) => {
        await tx.run(sql.raw('insert-a'))
      }),
      db.transaction(async (tx) => {
        await tx.run(sql.raw('insert-b'))
      }),
    ])

  it('regression proof: WITHOUT the wrapper, concurrent transactions interleave', async () => {
    const { driver, log } = fakeDriver()
    await twoTransactions(createDrizzleProxy(driver))
    expect(isSerialized(log)).toBe(false)
  })

  it('WITH the wrapper, every begin…commit block runs alone', async () => {
    const { driver, log } = fakeDriver()
    await twoTransactions(withTransactionLock(createDrizzleProxy(driver), createWriteLock({ waitTimeoutMs: 1_000 })))
    expect(isSerialized(log)).toBe(true)
    expect(log).toEqual(['begin', 'insert-a', 'commit', 'begin', 'insert-b', 'commit'])
  })

  it('a throwing callback rolls back and releases the lock', async () => {
    const { driver, log } = fakeDriver()
    const lock = createWriteLock({ waitTimeoutMs: 1_000 })
    const db = withTransactionLock(createDrizzleProxy(driver), lock)
    await expect(
      db.transaction(async () => {
        throw new Error('callback failed')
      }),
    ).rejects.toThrow('callback failed')
    expect(log).toEqual(['begin', 'rollback'])
    expect(lock.isIdle()).toBe(true)
  })

  it('worker death mid-transaction: the caller rejects, the lock releases, a queued transaction then runs', async () => {
    const dead = fakeDriver({ failOn: /^insert-a$|^rollback$/ })
    const lock = createWriteLock({ waitTimeoutMs: 1_000 })
    const db = withTransactionLock(createDrizzleProxy(dead.driver), lock)
    const first = db.transaction(async (tx) => {
      await tx.run(sql.raw('insert-a'))
    })
    const second = db.transaction(async (tx) => {
      await tx.run(sql.raw('insert-b'))
    })
    // drizzle's rollback also hits the dead driver and replaces the original error — assert the rejection only.
    await expect(first).rejects.toThrow()
    await expect(second).resolves.toBeUndefined()
    expect(lock.isIdle()).toBe(true)
  })

  it('a nested db.transaction inside a callback fails loudly (typed timeout), never hangs', async () => {
    vi.useFakeTimers()
    const { driver } = fakeDriver()
    const warn = vi.fn()
    const lock = createWriteLock({ waitTimeoutMs: 30_000, holdWarnMs: 5_000, warn })
    const db = withTransactionLock(createDrizzleProxy(driver), lock)
    const outer = db.transaction(async () => {
      await db.transaction(async () => {}) // the forbidden pattern (R1-BR-4)
    })
    const outerExpect = expect(outer).rejects.toBeInstanceOf(TransactionLockTimeoutError)
    await vi.advanceTimersByTimeAsync(30_000)
    await outerExpect
    expect(lock.isIdle()).toBe(true)
  })
})
