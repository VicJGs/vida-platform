// notes-rescope R0 · BR-R0-8b — the read-after-write barrier (body-writes.ts).
import { afterEach, describe, expect, it } from 'vitest'
import {
  __resetBodyWrites,
  bodyWriteKeys,
  clearLatestBody,
  latestBody,
  readAfterWrites,
  setLatestBody,
  trackBodyWrite,
} from './body-writes'

function deferred<T = void>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

afterEach(() => __resetBodyWrites())

describe('body-writes barrier', () => {
  it('bodyWriteKeys: id always, journal date when given', () => {
    expect(bodyWriteKeys('p1')).toEqual(['page:p1'])
    expect(bodyWriteKeys('p1', '2026-10-26')).toEqual(['page:p1', 'journal:2026-10-26'])
  })

  it('no write in flight → reads once, immediately', async () => {
    let reads = 0
    await expect(readAfterWrites(['page:p1'], async () => ++reads)).resolves.toBe(1)
  })

  it('a read waits for an in-flight write, then reads post-write data', async () => {
    let stored = 'old'
    const w = deferred()
    trackBodyWrite(
      ['page:p1'],
      w.promise.then(() => (stored = 'new')),
    )
    const read = readAfterWrites(['page:p1'], async () => stored)
    w.resolve()
    await expect(read).resolves.toBe('new')
  })

  it('a REJECTED write releases the reader (never fails or hangs it)', async () => {
    const w = deferred()
    trackBodyWrite(['page:p1'], w.promise)
    const read = readAfterWrites(['page:p1'], async () => 'stored')
    w.reject(new Error('disk'))
    await expect(read).resolves.toBe('stored')
  })

  it('a write registering MID-WAIT forces the reader to wait for it too (gen snapshotted before waiting)', async () => {
    let stored = 'v0'
    const a = deferred()
    const b = deferred()
    trackBodyWrite(
      ['page:p1'],
      a.promise.then(() => (stored = 'vA')),
    )
    const read = readAfterWrites(['page:p1'], async () => stored)
    trackBodyWrite(
      ['page:p1'],
      b.promise.then(() => (stored = 'vB')),
    ) // registers while the reader waits on A
    a.resolve()
    await Promise.resolve()
    b.resolve()
    await expect(read).resolves.toBe('vB')
  })

  it('a write registering MID-READ forces a re-read', async () => {
    let stored = 'v0'
    const gate = deferred()
    const w = deferred()
    let reads = 0
    const read = readAfterWrites(['page:p1'], async () => {
      reads++
      if (reads === 1) {
        trackBodyWrite(
          ['page:p1'],
          w.promise.then(() => (stored = 'v1')),
        )
        const seen = stored
        await gate.promise
        return seen
      }
      return stored
    })
    gate.resolve()
    w.resolve()
    await expect(read).resolves.toBe('v1')
    expect(reads).toBe(2)
  })

  it('an earlier write settling does not clear a later write chain on the same key', async () => {
    let stored = 'v0'
    const a = deferred()
    const b = deferred()
    trackBodyWrite(
      ['page:p1'],
      a.promise.then(() => (stored = 'vA')),
    )
    trackBodyWrite(
      ['page:p1'],
      b.promise.then(() => (stored = 'vB')),
    )
    a.resolve()
    await new Promise((r) => setTimeout(r, 0))
    const read = readAfterWrites(['page:p1'], async () => stored)
    b.resolve()
    await expect(read).resolves.toBe('vB')
  })

  it('a journal-keyed reader waits for a write registered under the page’s journal date (Home ⇄ note page)', async () => {
    let stored = 'old'
    const w = deferred()
    trackBodyWrite(
      bodyWriteKeys('j1', '2026-10-26'),
      w.promise.then(() => (stored = 'new')),
    )
    const read = readAfterWrites(['journal:2026-10-26'], async () => stored)
    w.resolve()
    await expect(read).resolves.toBe('new')
  })
})

// DEV-R0-1 — the latest-body overlay (seed-point handover; test (e)).
describe('latest-body overlay (DEV-R0-1)', () => {
  const doc = (t: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }] })
  const A = Symbol('writer-a')
  const B = Symbol('writer-b')

  it('set → read back; generations increase', () => {
    const g1 = setLatestBody('p', doc('one') as never, 's1', A)
    const g2 = setLatestBody('p', doc('two') as never, 's2', A)
    expect(g2).toBeGreaterThan(g1)
    expect(latestBody('p')).toMatchObject({ serialized: 's2', gen: g2 })
    expect(latestBody('other')).toBeUndefined()
  })

  it('an OLDER write settling (by gen) keeps a newer overlay; the newer write clears it', () => {
    const g1 = setLatestBody('p', doc('one') as never, 's1', A)
    const g2 = setLatestBody('p', doc('two') as never, 's2', B)
    clearLatestBody('p', { gen: g1 })
    expect(latestBody('p')?.serialized).toBe('s2')
    clearLatestBody('p', { gen: g2 })
    expect(latestBody('p')).toBeUndefined()
  })

  it('cancel/lock clear ONLY their own entry (owner token)', () => {
    setLatestBody('p', doc('b') as never, 'sb', B)
    clearLatestBody('p', { owner: A })
    expect(latestBody('p')?.serialized).toBe('sb')
    clearLatestBody('p', { owner: B })
    expect(latestBody('p')).toBeUndefined()
  })

  it("'all' clears unconditionally (a PageNotFoundError)", () => {
    setLatestBody('p', doc('x') as never, 'sx', A)
    clearLatestBody('p', 'all')
    expect(latestBody('p')).toBeUndefined()
  })
})
