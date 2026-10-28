// @vitest-environment jsdom
// AR-4 D5 — the main↔worker client. Verifies {id} request/response correlation,
// error propagation, first-run detection, and the deferred seam — all against an
// INJECTED mock worker (jsdom has no real `Worker`; live OPFS → Playwright/LIF-103).
import { describe, it, expect, vi } from 'vitest'
import { WorkerDbClient, type WorkerLike } from './client'

/** A controllable mock worker; `handler` maps a request → the reply body. */
function mockWorker(handler: (req: any) => Record<string, unknown>): WorkerLike {
  const w: WorkerLike = {
    onmessage: null,
    onerror: null,
    postMessage(msg: any) {
      queueMicrotask(() => {
        const body = handler(msg)
        w.onmessage?.({ data: { id: msg.id, ...body } } as MessageEvent)
      })
    },
    terminate() {},
  }
  return w
}

/** A worker that never replies — for the no-reply / crash liveness paths. */
function silentWorker(): WorkerLike {
  return { onmessage: null, onerror: null, postMessage() {}, terminate() {} }
}

describe('WorkerDbClient', () => {
  it('resolves open() and returns query rows through the driver', async () => {
    const client = new WorkerDbClient(
      mockWorker((req) => (req.op === 'query' ? { ok: true, rows: [{ value: '3' }] } : { ok: true })),
    )
    await expect(client.open('vida')).resolves.toBeUndefined()
    const rows = await client.driver.query('SELECT value FROM app_state')
    expect(rows).toEqual([{ value: '3' }])
  })

  it('rejects when the worker replies { ok: false }', async () => {
    const client = new WorkerDbClient(mockWorker(() => ({ ok: false, error: 'boom' })))
    await expect(client.open('vida')).rejects.toThrow(/boom/)
  })

  it('correlates concurrent requests by id even when replies arrive out of order', async () => {
    // Reply to the SECOND request before the first: buffer, flush in reverse.
    const buffer: Array<() => void> = []
    const w: WorkerLike = {
      onmessage: null,
      onerror: null,
      postMessage(msg: any) {
        buffer.push(() => w.onmessage?.({ data: { id: msg.id, ok: true, rows: [{ q: msg.sql }] } } as MessageEvent))
        if (buffer.length === 2)
          buffer
            .splice(0)
            .reverse()
            .forEach((f) => f())
      },
      terminate() {},
    }
    const client = new WorkerDbClient(w)
    const [a, b] = await Promise.all([client.driver.query('A'), client.driver.query('B')])
    expect(a).toEqual([{ q: 'A' }])
    expect(b).toEqual([{ q: 'B' }])
  })

  it('exists() returns the boolean result for first-run detection', async () => {
    const client = new WorkerDbClient(mockWorker(() => ({ ok: true, result: true })))
    await expect(client.exists('vida')).resolves.toBe(true)
  })

  it('RPCs exec/values/batch to the worker (the landed data-plane-wiring seam)', async () => {
    const client = new WorkerDbClient(
      mockWorker((req) => {
        if (req.op === 'values') return { ok: true, result: [[1, 'a']] }
        if (req.op === 'exec') {
          return { ok: true, result: { rows: [{ n: 1 }], changes: 1, lastInsertRowId: 7 } }
        }
        return { ok: true } // batch (+ anything else) → void
      }),
    )
    // values → positional arrays (the Drizzle sqlite-proxy read path)
    await expect(client.driver.values('SELECT a, b FROM t')).resolves.toEqual([[1, 'a']])
    // exec → RawQueryResult
    await expect(client.driver.exec('INSERT INTO t ...')).resolves.toEqual({
      rows: [{ n: 1 }],
      changes: 1,
      lastInsertRowId: 7,
    })
    // batch → void
    await expect(client.driver.batch([{ sql: 'UPDATE t SET a = 1' }])).resolves.toBeUndefined()
  })

  it('rejects (does not hang) when the worker never replies to a read (timeout)', async () => {
    vi.useFakeTimers()
    try {
      const client = new WorkerDbClient(silentWorker())
      const p = client.driver.query('SELECT 1')
      const assertion = expect(p).rejects.toThrow(/timed out after 15000ms/)
      await vi.advanceTimersByTimeAsync(15_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  // LIF-250 — `open` runs every pending migration (BR-RT-BOOT), so its deadline covers RECEIPT, not completion.
  it('open() rejects (does not hang) when the worker never acknowledges it', async () => {
    vi.useFakeTimers()
    try {
      const client = new WorkerDbClient(silentWorker())
      const p = client.open('vida')
      let settled = false
      p.catch(() => {}).finally(() => (settled = true))
      await vi.advanceTimersByTimeAsync(15_000)
      expect(settled).toBe(false) // the old 15 s read budget no longer applies to open
      const assertion = expect(p).rejects.toThrow(/not acknowledged within 60000ms/)
      await vi.advanceTimersByTimeAsync(45_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('an acknowledged open() that takes longer than every budget still resolves (slow first-run migrate)', async () => {
    vi.useFakeTimers()
    try {
      const w = silentWorker()
      const client = new WorkerDbClient(w)
      const p = client.open('vida')
      w.onmessage?.({ data: { id: 1, ack: true } } as MessageEvent) // alive, migrating
      await vi.advanceTimersByTimeAsync(120_000)
      w.onmessage?.({ data: { id: 1, ok: true } } as MessageEvent)
      await expect(p).resolves.toBeUndefined()
    } finally {
      vi.useRealTimers()
    }
  })

  it('an acknowledged open() still rejects when the worker crashes or replies an error', async () => {
    const w = silentWorker()
    const client = new WorkerDbClient(w)
    const crashed = client.open('vida')
    w.onmessage?.({ data: { id: 1, ack: true } } as MessageEvent)
    w.onerror?.(new Error('kaboom'))
    await expect(crashed).rejects.toThrow(/crashed/)

    const failed = client.open('vida')
    w.onmessage?.({ data: { id: 2, ack: true } } as MessageEvent)
    w.onmessage?.({ data: { id: 2, ok: false, error: 'migration 33 failed' } } as MessageEvent)
    await expect(failed).rejects.toThrow(/migration 33 failed/)
  })

  it('an ack never settles a request, and an ack for a read does not stop its 15 s clock', async () => {
    vi.useFakeTimers()
    try {
      const w = silentWorker()
      const client = new WorkerDbClient(w)
      const p = client.driver.query('SELECT 1')
      w.onmessage?.({ data: { id: 1, ack: true } } as MessageEvent)
      const assertion = expect(p).rejects.toThrow(/timed out after 15000ms/)
      await vi.advanceTimersByTimeAsync(15_000)
      await assertion
    } finally {
      vi.useRealTimers()
    }
  })

  it('rejects all pending requests when the worker crashes (onerror)', async () => {
    const w = silentWorker()
    const client = new WorkerDbClient(w)
    const p = client.open('vida')
    w.onerror?.(new Error('kaboom'))
    await expect(p).rejects.toThrow(/crashed/)
  })

  it('ignores an id-less reply and stays usable for the next request', async () => {
    // A malformed (id-less) reply must not throw in the handler or corrupt state.
    let onmsg: ((e: MessageEvent) => void) | null = null
    const w: WorkerLike = {
      get onmessage() {
        return onmsg
      },
      set onmessage(fn) {
        onmsg = fn
      },
      onerror: null,
      postMessage(msg: any) {
        // First: a bad reply with no id (ignored). Then the real reply.
        onmsg?.({ data: { ok: true } } as MessageEvent)
        onmsg?.({ data: { id: msg.id, ok: true, result: true } } as MessageEvent)
      },
      terminate() {},
    }
    const client = new WorkerDbClient(w)
    await expect(client.exists('vida')).resolves.toBe(true)
  })
})
