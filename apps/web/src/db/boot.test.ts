// @vitest-environment jsdom
// preferences-rescope R1 (LIF-247), R1-BR-8 — teardown only on non-cancelable page-lifecycle events:
// pagehide(persisted) → terminate (a bfcached page must not keep the exclusive OPFS handles) · pageshow(persisted) →
// reload · a normal unload → nothing (the browser discards the dedicated worker). No `beforeunload` (cancelable).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const h = vi.hoisted(() => ({ terminate: vi.fn() }))
vi.mock('./client', () => ({
  // jsdom has no Worker — the real ctor would spawn one (client.ts spawnDefaultWorker).
  WorkerDbClient: class {
    terminate = h.terminate
    driver = {}
  },
}))

/** jsdom lacks PageTransitionEvent in some versions — build an Event carrying `persisted`. */
function pageTransition(type: 'pagehide' | 'pageshow', persisted: boolean): Event {
  const e = new Event(type)
  Object.defineProperty(e, 'persisted', { value: persisted })
  return e
}

beforeEach(() => {
  h.terminate.mockReset()
  vi.resetModules()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('registerTeardown', () => {
  it('terminates the worker when the page enters the bfcache (pagehide, persisted)', async () => {
    const { registerTeardown } = await import('./boot')
    const target = new EventTarget()
    const client = { terminate: vi.fn() }
    const reload = vi.fn()
    registerTeardown(target, client, reload)
    target.dispatchEvent(pageTransition('pagehide', true))
    expect(client.terminate).toHaveBeenCalledTimes(1)
    expect(reload).not.toHaveBeenCalled()
  })

  it('does nothing on a normal unload (pagehide, not persisted) — the browser discards the worker', async () => {
    const { registerTeardown } = await import('./boot')
    const target = new EventTarget()
    const client = { terminate: vi.fn() }
    const reload = vi.fn()
    registerTeardown(target, client, reload)
    target.dispatchEvent(pageTransition('pagehide', false))
    expect(client.terminate).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('reloads when the page is restored from the bfcache (pageshow, persisted)', async () => {
    const { registerTeardown } = await import('./boot')
    const target = new EventTarget()
    const reload = vi.fn()
    registerTeardown(target, { terminate: vi.fn() }, reload)
    target.dispatchEvent(pageTransition('pageshow', true))
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('does not reload on a normal first show (pageshow, not persisted)', async () => {
    const { registerTeardown } = await import('./boot')
    const target = new EventTarget()
    const reload = vi.fn()
    registerTeardown(target, { terminate: vi.fn() }, reload)
    target.dispatchEvent(pageTransition('pageshow', false))
    expect(reload).not.toHaveBeenCalled()
  })
})

describe('getDbClient', () => {
  it('registers pagehide/pageshow on window and never a beforeunload listener', async () => {
    const add = vi.spyOn(window, 'addEventListener')
    const { getDbClient } = await import('./boot')
    getDbClient()
    const types = add.mock.calls.map((c) => c[0])
    expect(types).toContain('pagehide')
    expect(types).toContain('pageshow')
    expect(types).not.toContain('beforeunload')
    window.dispatchEvent(pageTransition('pagehide', true))
    expect(h.terminate).toHaveBeenCalledTimes(1)
  })
})
