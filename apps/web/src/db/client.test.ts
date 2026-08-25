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
      mockWorker((req) =>
        req.op === 'query' ? { ok: true, rows: [{ value: '3' }] } : { ok: true },
      ),
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
        buffer.push(() =>
          w.onmessage?.({ data: { id: msg.id, ok: true, rows: [{ q: msg.sql }] } } as MessageEvent),
        )
        if (buffer.length === 2) buffer.splice(0).reverse().forEach((f) => f())
      },
      terminate() {},
    }
    const client = new WorkerDbClient(w)
    const [a, b] = await Promise.all([
      client.driver.query('A'),
      client.driver.query('B'),
    ])
    expect(a).toEqual([{ q: 'A' }])
    expect(b).toEqual([{ q: 'B' }])
  })

  it('exists() returns the boolean result for first-run detection', async () => {
    const client = new WorkerDbClient(mockWorker(() => ({ ok: true, result: true })))
    await expect(client.exists('vida')).resolves.toBe(true)
  })

  it('RPCs the worker for values() and returns positional rows (the Drizzle-proxy read path, B1)', async () => {
    const client = new WorkerDbClient(
      mockWorker((req) => (req.op === 'values' ? { ok: true, rows: [[1, 'a']] } : { ok: true })),
    )
    await expect(client.driver.values('SELECT id, name FROM t')).resolves.toEqual([[1, 'a']])
  })

  it('still throws the deferred-seam error for exec/batch (unused by the Drizzle-proxy path)', () => {
    const client = new WorkerDbClient(mockWorker(() => ({ ok: true })))
    expect(() => client.driver.exec('x')).toThrow(/seam/i)
    expect(() => client.driver.batch([])).toThrow(/seam/i)
  })

  it('rejects (does not hang) when the worker never replies (timeout)', async () => {
    vi.useFakeTimers()
    try {
      const client = new WorkerDbClient(silentWorker())
      const p = client.open('vida')
      const assertion = expect(p).rejects.toThrow(/timed out/)
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
