// preferences-rescope R2 (LIF-247) — the per-table serial + debounced write queue (PLAN-R2 §4.2).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { createWriteQueue } from './write-queue'

afterEach(() => {
  vi.useRealTimers()
})

function deferred<T>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('createWriteQueue', () => {
  it('batches enqueues within the debounce into ONE write, every caller sharing its result', async () => {
    vi.useFakeTimers()
    const write = vi.fn(async (batch: number[]) => batch.reduce((a, b) => a + b, 0))
    const q = createWriteQueue<number, number>({ debounceMs: 500, write })
    const a = q.enqueue(1)
    await vi.advanceTimersByTimeAsync(200)
    const b = q.enqueue(2)
    await vi.advanceTimersByTimeAsync(200)
    const c = q.enqueue(3)
    expect(write).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    expect(write).toHaveBeenCalledTimes(1)
    expect(write).toHaveBeenCalledWith([1, 2, 3])
    await expect(Promise.all([a, b, c])).resolves.toEqual([6, 6, 6])
    expect(q.isIdle()).toBe(true)
  })

  it('runs batches serially: a patch arriving during an in-flight write becomes a second write, never concurrent', async () => {
    vi.useFakeTimers()
    const inFlight = deferred<string>()
    let active = 0
    let maxActive = 0
    const write = vi.fn(async (batch: string[]) => {
      active++
      maxActive = Math.max(maxActive, active)
      const r = batch[0] === 'a' ? await inFlight.promise : batch.join()
      active--
      return r
    })
    const q = createWriteQueue<string, string>({ debounceMs: 500, write })
    const a = q.enqueue('a')
    await vi.advanceTimersByTimeAsync(500) // batch [a] in flight
    const b = q.enqueue('b')
    await vi.advanceTimersByTimeAsync(500) // batch [b] sealed — must wait for [a]
    expect(write).toHaveBeenCalledTimes(1)
    expect(q.isIdle()).toBe(false)
    inFlight.resolve('A')
    await expect(a).resolves.toBe('A')
    await expect(b).resolves.toBe('b')
    expect(write).toHaveBeenCalledTimes(2)
    expect(maxActive).toBe(1)
    expect(q.isIdle()).toBe(true)
  })

  it('a failing write rejects every caller in its batch, and the queue continues', async () => {
    vi.useFakeTimers()
    const write = vi.fn(async (batch: string[]) => {
      if (batch.includes('bad')) throw new Error('write failed')
      return 'ok'
    })
    const q = createWriteQueue<string, string>({ debounceMs: 100, write })
    const x = q.enqueue('bad')
    const y = q.enqueue('also-in-batch')
    const xe = expect(x).rejects.toThrow('write failed')
    const ye = expect(y).rejects.toThrow('write failed')
    await vi.advanceTimersByTimeAsync(100)
    await xe
    await ye
    const z = q.enqueue('good')
    await vi.advanceTimersByTimeAsync(100)
    await expect(z).resolves.toBe('ok')
  })

  it('flush() writes the open batch immediately, without waiting for the debounce', async () => {
    vi.useFakeTimers()
    const write = vi.fn(async (batch: string[]) => batch.join())
    const q = createWriteQueue<string, string>({ debounceMs: 500, write })
    const a = q.enqueue('a')
    expect(q.isIdle()).toBe(false)
    await q.flush() // no timer advance: the debounce is skipped
    expect(write).toHaveBeenCalledTimes(1)
    await expect(a).resolves.toBe('a')
    expect(q.isIdle()).toBe(true)
  })

  it('flush() with nothing pending resolves at once', async () => {
    const q = createWriteQueue<string, string>({ debounceMs: 500, write: async () => 'x' })
    await expect(q.flush()).resolves.toBeUndefined()
  })

  it('calls onSettled once per batch, after it leaves the queue, with idle reflecting what is still queued', async () => {
    vi.useFakeTimers()
    const settled: Array<{ ok: boolean; idle: boolean; batch: string[] }> = []
    const holdA = deferred<void>()
    const q = createWriteQueue<string, string>({
      debounceMs: 100,
      write: async (batch) => {
        if (batch[0] === 'a') await holdA.promise
        return batch.join()
      },
      onSettled: (outcome, info) => settled.push({ ok: outcome.ok, idle: info.idle, batch: info.batch }),
    })
    const a = q.enqueue('a')
    await vi.advanceTimersByTimeAsync(100) // [a] sealed + running (held)
    const b = q.enqueue('b') // open batch while [a] is still in flight → not idle at [a]'s settle
    holdA.resolve()
    await a
    await vi.advanceTimersByTimeAsync(100)
    await b
    expect(settled).toEqual([
      { ok: true, idle: false, batch: ['a'] },
      { ok: true, idle: true, batch: ['b'] },
    ])
  })
})
