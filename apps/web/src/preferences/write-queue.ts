// ============================================================================
// Write queue — preferences-rescope R2 (LIF-247), PLAN-R2 R2-BR-5.
//
// One queue per singleton table. Enqueues within `debounceMs` batch into ONE
// `write(batch)` (PR-4: auto-save, batched 500 ms); sealed batches run strictly
// serially (no lost update, no first-write double-create — IR-10). Every caller
// of a batch shares its result or its error. `onSettled` runs once per batch,
// after the batch leaves the in-flight count (so `idle` truly means "nothing
// else queued") and before its callers resolve — the writer's cache sync hook.
// R1's write lock serializes each write's transaction; this owns read-then-write.
// ============================================================================

export type WriteOutcome<R> = { ok: true; value: R } | { ok: false; error: unknown }

export interface WriteQueueOptions<P, R> {
  debounceMs: number
  write: (batch: P[]) => Promise<R>
  onSettled?: (outcome: WriteOutcome<R>, info: { batch: P[]; idle: boolean }) => void
}

export interface WriteQueue<P, R> {
  /** Add to the open batch (re-arming the debounce); resolves/rejects with that batch's write. */
  enqueue(item: P): Promise<R>
  /** Seal the open batch now (skip the debounce) and wait until everything queued has settled. */
  flush(): Promise<void>
  /** No open batch and nothing sealed in flight. */
  isIdle(): boolean
  /** Drop the open batch's timer (tests/teardown) — its callers never settle. */
  dispose(): void
}

interface OpenBatch<P, R> {
  items: P[]
  promise: Promise<R>
  resolve: (v: R) => void
  reject: (e: unknown) => void
}

export function createWriteQueue<P, R>({ debounceMs, write, onSettled }: WriteQueueOptions<P, R>): WriteQueue<P, R> {
  let open: OpenBatch<P, R> | null = null
  let timer: ReturnType<typeof setTimeout> | undefined
  let tail: Promise<void> = Promise.resolve()
  let inFlight = 0

  function seal(): void {
    clearTimeout(timer)
    timer = undefined
    if (!open) return
    const batch = open
    open = null
    inFlight++
    const run = tail.then(async (): Promise<WriteOutcome<R>> => {
      try {
        return { ok: true, value: await write(batch.items) }
      } catch (error) {
        return { ok: false, error }
      }
    })
    tail = run.then(
      (outcome) => {
        inFlight--
        try {
          onSettled?.(outcome, { batch: batch.items, idle: open === null && inFlight === 0 })
        } catch {
          // a hook failure must never strand this batch's callers or poison the serial tail
        }
        if (outcome.ok) batch.resolve(outcome.value)
        else batch.reject(outcome.error)
      },
      () => {}, // `run` never rejects (the write's error is captured as an outcome)
    )
  }

  return {
    enqueue(item) {
      if (!open) {
        let resolve!: (v: R) => void
        let reject!: (e: unknown) => void
        const promise = new Promise<R>((res, rej) => {
          resolve = res
          reject = rej
        })
        // Callers may ignore the returned promise (fire-and-forget saves); never surface an unhandled rejection —
        // the writer reports failures through its own state.
        promise.catch(() => {})
        open = { items: [], promise, resolve, reject }
      }
      open.items.push(item)
      clearTimeout(timer)
      timer = setTimeout(seal, debounceMs)
      return open.promise
    },
    async flush() {
      seal()
      await tail
    },
    isIdle: () => open === null && inFlight === 0,
    dispose() {
      clearTimeout(timer)
      timer = undefined
      open = null
    },
  }
}
