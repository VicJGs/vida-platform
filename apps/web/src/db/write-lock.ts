// ============================================================================
// Write lock — preferences-rescope R1 (LIF-247), BR-RT-LOCK.
//
// drizzle's sqlite-proxy runs a transaction as separate async calls — `begin` →
// callback → `commit`/`rollback` — with no mutex, and every service shares the
// ONE worker connection. Without this lock two concurrent writes interleave: the
// second `begin` throws ("cannot start a transaction within a transaction") or a
// foreign statement commits/rolls back inside another write's transaction.
//
// Rules (docs/features/preferences/delivery/sessions/PLAN-R1-write-integrity.md):
// - One writer at a time, FIFO; always released in `finally` (R1-BR-1/2).
// - A waiter past `waitTimeoutMs` rejects with TransactionLockTimeoutError, and its
//   slot still FORWARDS the predecessor's release so callers behind it aren't
//   stuck (R1-BR-3). A nested `db.transaction` from inside a callback deadlocks by
//   construction (no async context in the browser) — the timeout makes it loud.
// - Inside a transaction callback use only `tx` / `*InTx` (R1-BR-4). Every other
//   write goes through `db.transaction` or `writeLock.runExclusive` (R1-BR-5).
// - Reads are NOT locked: they may observe uncommitted rows (R1-BR-6, accepted).
// ============================================================================

import type { DrizzleDb } from '@vida/core'

/** A practical bound, not a proof: normal writes are ms-scale (PLAN-R1 §3). */
export const LOCK_WAIT_TIMEOUT_MS = 30_000
/** Dev-only early signal for a stuck holder (e.g. a nested-transaction deadlock). */
export const LOCK_HOLD_WARN_MS = 5_000

export class TransactionLockTimeoutError extends Error {
  constructor(waitedMs: number) {
    super(
      `Write lock not acquired within ${waitedMs}ms — a transaction is stuck, a db.transaction was nested inside ` +
        `another transaction's callback (use tx / *InTx inside callbacks), or the queue ahead exceeded the wait budget.`,
    )
    this.name = 'TransactionLockTimeoutError'
  }
}

export interface WriteLock {
  /** Run `fn` with exclusive write access; FIFO; released in `finally`. */
  runExclusive<T>(fn: () => Promise<T>): Promise<T>
  /** True when nothing holds or waits for the lock. */
  isIdle(): boolean
}

export interface WriteLockOptions {
  waitTimeoutMs: number
  /** When set (with `warn`), warn once if a holder keeps the lock longer than this. */
  holdWarnMs?: number
  warn?: (message: string) => void
}

export function createWriteLock({ waitTimeoutMs, holdWarnMs, warn }: WriteLockOptions): WriteLock {
  let tail: Promise<void> = Promise.resolve()
  let pending = 0

  async function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    let resolveDone!: () => void
    const done = new Promise<void>((resolve) => (resolveDone = resolve))
    const prev = tail
    tail = done
    pending++

    let timer: ReturnType<typeof setTimeout> | undefined
    const timedOut = new Promise<'timeout'>((resolve) => {
      timer = setTimeout(() => resolve('timeout'), waitTimeoutMs)
    })
    const outcome = await Promise.race([prev.then(() => 'acquired' as const), timedOut])

    if (outcome === 'timeout') {
      // Forwarding rule: this slot never runs, but it must still release when its predecessor does.
      void prev.then(resolveDone)
      pending--
      throw new TransactionLockTimeoutError(waitTimeoutMs)
    }

    clearTimeout(timer) // the losing `timedOut` promise stays pending, unreferenced once the race settled → GC'd
    let holdTimer: ReturnType<typeof setTimeout> | undefined
    if (holdWarnMs !== undefined && warn) {
      const holderStack = new Error('write-lock holder').stack ?? ''
      holdTimer = setTimeout(() => warn(`Write lock held for >${holdWarnMs}ms by:\n${holderStack}`), holdWarnMs)
    }
    try {
      return await fn()
    } finally {
      clearTimeout(holdTimer)
      pending--
      resolveDone()
    }
  }

  return { runExclusive, isIdle: () => pending === 0 }
}

/** The app's single write lock (one worker connection → one lock). */
export const writeLock: WriteLock = createWriteLock({
  waitTimeoutMs: LOCK_WAIT_TIMEOUT_MS,
  holdWarnMs: LOCK_HOLD_WARN_MS,
  // DEV-only early signal (the apps/web convention — vite statically replaces process.env.NODE_ENV).
  warn: process.env.NODE_ENV !== 'production' ? (m) => console.warn(m) : undefined,
})

/**
 * Serialize every `db.transaction` on this instance through `lock`. Mutates in place: a spread/copy would lose the
 * prototype methods. The cast keeps drizzle's generic `<T>` signature.
 */
export function withTransactionLock(db: DrizzleDb, lock: WriteLock): DrizzleDb {
  const original = db.transaction.bind(db)
  db.transaction = ((callback, config) => lock.runExclusive(() => original(callback, config))) as typeof db.transaction
  return db
}
