// LIF-250 — the DB worker's message handler: the receipt ack for `open`/`migrate` and BR-RT-D5 "opened once".
// The web adapter (wa-sqlite/OPFS, browser-only) and `migrate` are mocked; `self` is a stub worker scope, so the
// real worker.ts module runs in Node. The live OPFS path is the Playwright smoke (e2e + e2e-prod).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({
  opens: 0,
  closes: 0,
  failNextOpen: false,
  release: null as (() => void) | null,
}))

vi.mock('./web-adapter', () => ({
  createWebDatabaseAdapter: () => ({
    async open() {
      h.opens++
      if (h.failNextOpen) {
        h.failNextOpen = false
        throw new Error('vfs boom')
      }
      // Hold the open until the test releases it — a slow first-run open.
      await new Promise<void>((resolve) => {
        h.release = resolve
      })
      return {
        close: async () => {
          h.closes++
        },
      }
    },
    createDrizzle: () => ({ run: async () => undefined }),
    exists: async () => true,
  }),
}))

vi.mock('@vida/core', () => ({ migrate: async () => ({ applied: 0, currentVersion: 33 }) }))

type Posted = { id: number; ok?: boolean; ack?: true; error?: string }

async function loadWorker() {
  const posted: Posted[] = []
  const scope = {
    onmessage: null as ((e: { data: unknown }) => Promise<void>) | null,
    postMessage: (m: Posted) => {
      posted.push(m)
    },
  }
  vi.stubGlobal('self', scope)
  await import('./worker')
  const send = (data: unknown) => {
    if (!scope.onmessage) throw new Error('worker.ts did not install onmessage')
    return scope.onmessage({ data })
  }
  return { posted, send }
}

/** Complete the held adapter.open (fails loud if no open is pending). */
function release(): void {
  if (!h.release) throw new Error('no adapter.open is pending')
  h.release()
}

/** Let the queued microtasks (the adapter promise chain) run. */
const flush = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => {
  vi.resetModules()
  h.opens = 0
  h.closes = 0
  h.failNextOpen = false
  h.release = null
})
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('DB worker — receipt ack (LIF-250)', () => {
  it('acks open on receipt, before the open completes, then sends the final reply', async () => {
    const { posted, send } = await loadWorker()
    const done = send({ id: 1, op: 'open', dbName: 'vida' })
    await flush()
    expect(posted).toEqual([{ id: 1, ack: true }]) // alive, still opening
    release()
    await done
    expect(posted).toEqual([{ id: 1, ack: true }, { id: 1, ok: true }])
  })

  it('acks migrate; never acks a read', async () => {
    const { posted, send } = await loadWorker()
    const opened = send({ id: 1, op: 'open', dbName: 'vida' })
    await flush()
    release()
    await opened
    posted.length = 0
    await send({ id: 2, op: 'migrate' })
    await send({ id: 3, op: 'exists', dbName: 'vida' })
    expect(posted.filter((m) => m.ack)).toEqual([{ id: 2, ack: true }])
  })
})

describe('DB worker — opened once (BR-RT-D5)', () => {
  it('a second open while the first is in flight shares it: one adapter.open, both replies ok', async () => {
    const { posted, send } = await loadWorker()
    const first = send({ id: 1, op: 'open', dbName: 'vida' })
    await flush()
    const retry = send({ id: 2, op: 'open', dbName: 'vida' }) // the boot screen's Retry
    await flush()
    release()
    await Promise.all([first, retry])
    expect(h.opens).toBe(1)
    expect(posted.filter((m) => 'ok' in m)).toEqual([
      { id: 1, ok: true },
      { id: 2, ok: true },
    ])
  })

  it('an open after a completed open does not reopen', async () => {
    const { send } = await loadWorker()
    const first = send({ id: 1, op: 'open', dbName: 'vida' })
    await flush()
    release()
    await first
    await send({ id: 2, op: 'open', dbName: 'vida' })
    expect(h.opens).toBe(1)
  })

  it('a failed open is not cached: the next open re-opens', async () => {
    const { posted, send } = await loadWorker()
    h.failNextOpen = true
    await send({ id: 1, op: 'open', dbName: 'vida' })
    expect(posted.at(-1)).toEqual({ id: 1, ok: false, error: 'vfs boom' })
    const retry = send({ id: 2, op: 'open', dbName: 'vida' })
    await flush()
    release()
    await retry
    expect(h.opens).toBe(2)
    expect(posted.at(-1)).toEqual({ id: 2, ok: true })
  })

  it('close releases the connection; a later open opens again', async () => {
    const { send } = await loadWorker()
    const first = send({ id: 1, op: 'open', dbName: 'vida' })
    await flush()
    release()
    await first
    await send({ id: 2, op: 'close' })
    expect(h.closes).toBe(1)
    const again = send({ id: 3, op: 'open', dbName: 'vida' })
    await flush()
    release()
    await again
    expect(h.opens).toBe(2)
  })
})
