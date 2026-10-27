// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { renderHook, act, cleanup } from '@testing-library/react'
import { StrictMode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { EditorDocument } from '@vida/types'
import { useNoteContent, type NoteContentPage } from './use-note-content'
import { __resetBodyWrites, latestBody, readAfterWrites } from './body-writes'
import { __resetSaveStatus, getSaveStatus, setSaveStatus, useSaveStatus } from './save-status'

// R1 (G7): a write failure no chip observes raises the shared error toast — spied here.
const notifySpy = vi.fn<(action: string, e: unknown) => void>()
vi.mock('../lib/notify-error', () => ({ notifyError: (a: string, e: unknown) => notifySpy(a, e) }))

/** A loaded page for the hook (R0 signature): content = the dedupe baseline. */
function pg(id: string, content: EditorDocument | null = null, journalDate: string | null = null): NoteContentPage {
  return { id, title: 'T', type: 'note', content, journalDate, contentStatus: content ? 'ok' : 'absent' }
}

const writeSpy = vi.fn<(id: string, doc: EditorDocument) => Promise<unknown>>()

vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { writePageContent: (id: string, doc: EditorDocument) => writeSpy(id, doc) } }),
}))

const doc: EditorDocument = { type: 'doc', content: [] }
// A loaded baseline (the editor's normalized empty seed) vs a real user edit. Using distinct docs makes each
// test exercise the EDIT-writes path, separate from the blank-page mount-echo case (its own test below).
const loaded: EditorDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
const edited: EditorDocument = {
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: 'hi' }] }],
}

let qc: QueryClient
function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(QueryClientProvider, { client: qc }, children)
}

describe('useNoteContent (S2 — debounced content write, IR-7)', () => {
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    writeSpy.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('debounces rapid edits to a single write (BR-NEU-3)', async () => {
    const { result } = renderHook(() => useNoteContent(pg('p1', loaded)), { wrapper }) // baseline set
    act(() => {
      result.current.save(edited)
      result.current.save(edited)
      result.current.save(edited)
    })
    expect(writeSpy).not.toHaveBeenCalled() // still within the debounce window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenCalledTimes(1)
    expect(writeSpy).toHaveBeenCalledWith('p1', edited)
  })

  it('a blank-loaded page does NOT write its mount-echo; only a real edit writes (BR-NEU-5)', async () => {
    const { result } = renderHook(() => useNoteContent(pg('p5')), { wrapper }) // initialContent = null (blank page)
    act(() => {
      result.current.save(loaded) // the editor's mount-echo (normalized empty seed) — NOT a user edit
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).not.toHaveBeenCalled() // mere open never writes
    act(() => {
      result.current.save(edited) // now a real keystroke → a genuine change from the adopted baseline
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenCalledTimes(1)
    expect(writeSpy).toHaveBeenCalledWith('p5', edited)
  })

  it('dedupes: a save equal to the loaded content does not write (open-echo guard)', async () => {
    const { result } = renderHook(() => useNoteContent(pg('p4', doc)), { wrapper }) // baseline = doc
    act(() => {
      result.current.save(doc) // identical to the loaded content → must be skipped
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('flushes the pending write on unmount — never drops the last edit', async () => {
    const { result, unmount } = renderHook(() => useNoteContent(pg('p2', loaded)), { wrapper })
    act(() => {
      result.current.save(edited)
    })
    expect(writeSpy).not.toHaveBeenCalled()
    await act(async () => {
      unmount()
      await Promise.resolve()
    })
    expect(writeSpy).toHaveBeenCalledTimes(1)
  })

  it('surfaces a failed write as the page save status "error" (BR-NEU-5 → BR-R1-5)', async () => {
    writeSpy.mockRejectedValue(new Error('boom'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { result } = renderHook(() => useNoteContent(pg('p3', loaded)), { wrapper })
    act(() => {
      result.current.save(edited)
    })
    // waitFor hangs under fake timers — advance + flush the mutation's microtask chain, then assert directly.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(getSaveStatus('p3')).toBe('error')
    expect(notifySpy).toHaveBeenCalledWith('save “T”', expect.any(Error)) // no chip observes p3 here → the toast (G7)
    errSpy.mockRestore()
  })
})

// ── notes-rescope R0 · BR-R0-7/8/8b (PLAN-R0 tests 9, 9b, 9c) ────────────────
describe('useNoteContent — data safety (notes-rescope R0)', () => {
  const flushAll = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
      await Promise.resolve()
      await Promise.resolve()
    })
  }
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    writeSpy.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('flush() writes the pending edit immediately; cancel() drops it', async () => {
    const { result } = renderHook(() => useNoteContent(pg('a', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll()
    expect(writeSpy).toHaveBeenCalledTimes(1)
    writeSpy.mockClear()
    act(() => result.current.save({ type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] }))
    act(() => result.current.cancel())
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('lock() drops the pending edit and makes save a no-op — no unmount write either', async () => {
    const { result, unmount } = renderHook(() => useNoteContent(pg('b', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.lock())
    act(() => result.current.save(edited))
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it('a malformed page starts locked — nothing is ever written (BR-R0-1)', async () => {
    const page: NoteContentPage = { id: 'm', title: 'T', type: 'note', content: null, journalDate: null, contentStatus: 'malformed' }
    const { result, unmount } = renderHook(() => useNoteContent(page), { wrapper })
    act(() => {
      result.current.save(loaded)
      result.current.save(edited)
    })
    unmount()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).not.toHaveBeenCalled()
  })

  it.each([
    ['visibilitychange → hidden', () => {
      Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
    }],
    ['pagehide', () => window.dispatchEvent(new Event('pagehide'))],
  ])('%s flushes the pending edit (E-1)', async (_l, fire) => {
    const { result } = renderHook(() => useNoteContent(pg('c', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => fire())
    await flushAll()
    expect(writeSpy).toHaveBeenCalledWith('c', edited)
  })

  it('a retryable failure re-queues: the next flush retries the same doc', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    writeSpy.mockRejectedValueOnce(new Error('disk busy'))
    const { result } = renderHook(() => useNoteContent(pg('d', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll()
    expect(getSaveStatus('d')).toBe('error')
    act(() => result.current.flush())
    await flushAll()
    expect(writeSpy).toHaveBeenCalledTimes(2)
    expect(writeSpy).toHaveBeenLastCalledWith('d', edited)
    errSpy.mockRestore()
  })

  it('a PageNotFoundError is terminal: no re-queue', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const gone = Object.assign(new Error('Page not found: e'), { name: 'PageNotFoundError' })
    writeSpy.mockRejectedValueOnce(gone)
    const { result } = renderHook(() => useNoteContent(pg('e', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll()
    act(() => result.current.flush())
    await flushAll()
    expect(writeSpy).toHaveBeenCalledTimes(1)
    errSpy.mockRestore()
  })

  it('flush writes the doc THROUGH the cached bodies synchronously (page row + journal entity)', () => {
    qc.setQueryData(['pages', 'j1'], { id: 'j1', content: JSON.stringify(loaded) })
    qc.setQueryData(['journal', '2026-10-26'], { id: 'j1', content: loaded, contentStatus: 'ok', rawContent: 'x' })
    const { result } = renderHook(() => useNoteContent(pg('j1', loaded, '2026-10-26')), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    // No await: the caches already hold the new body before the write settles.
    expect(qc.getQueryData(['pages', 'j1'])).toMatchObject({ content: JSON.stringify(edited) })
    expect(qc.getQueryData(['journal', '2026-10-26'])).toMatchObject({
      content: edited,
      contentStatus: 'ok',
      rawContent: JSON.stringify(edited),
    })
  })

  it('a cold cache is NOT created by the write-through (only warm entries are updated)', () => {
    const { result } = renderHook(() => useNoteContent(pg('k', loaded, '2026-10-26')), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    expect(qc.getQueryData(['pages', 'k'])).toBeUndefined()
    expect(qc.getQueryData(['journal', '2026-10-26'])).toBeUndefined()
  })

  it('a settled journal write invalidates page · list · journal · calendar-journal (BR-R0-8)', async () => {
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useNoteContent(pg('j2', loaded, '2026-10-26')), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll()
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey)
    expect(keys).toEqual([['pages', 'j2'], ['notes', 'pages'], ['journal', '2026-10-26'], ['calendar', 'journal']])
  })

  it('a note (no journal date) invalidates page · list only', async () => {
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => useNoteContent(pg('n1', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll()
    const keys = spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey)
    expect(keys).toEqual([['pages', 'n1'], ['notes', 'pages']])
  })

  it('9c cold cache: a writer unmount-flush → a reader mounting next waits for the write (both directions)', async () => {
    let stored = JSON.stringify(loaded)
    let release!: () => void
    writeSpy.mockImplementation((_id, d) => new Promise((res) => {
      release = () => {
        stored = JSON.stringify(d)
        res(undefined)
      }
    }))
    const writer = renderHook(() => useNoteContent(pg('j3', loaded, '2026-10-26')), { wrapper })
    act(() => writer.result.current.save(edited))
    writer.unmount() // the note page leaves; its flush registers the write in the same tick
    let seen: string | null = null
    const read = readAfterWrites(['journal:2026-10-26'], async () => stored).then((v) => (seen = v))
    await flushAll()
    expect(seen).toBeNull() // Home's read is held while the write is in flight
    release()
    await read
    expect(seen).toBe(JSON.stringify(edited))
    // reverse direction: the id key is registered too (Home writes → the note page reads by id)
    expect(await readAfterWrites(['page:j3'], async () => stored)).toBe(JSON.stringify(edited))
  })

  it('9c: a REJECTED write still releases the waiting reader, which reads what is stored', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let reject!: (e: Error) => void
    writeSpy.mockImplementation(() => new Promise((_res, rej) => (reject = rej)))
    const writer = renderHook(() => useNoteContent(pg('j4', loaded)), { wrapper })
    act(() => writer.result.current.save(edited))
    writer.unmount()
    const read = readAfterWrites(['page:j4'], async () => 'stored-old')
    await flushAll() // the write reaches writePageContent only after getServices() resolves
    reject(new Error('disk'))
    await expect(read).resolves.toBe('stored-old')
    errSpy.mockRestore()
  })
})

// ── DEV-R0-1 · the seed-point overlay + ownership re-save (tests c, d, h, i, j, k) ──
describe('useNoteContent — latest-body overlay (DEV-R0-1)', () => {
  const NEW: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW' }] }] }
  const flushAll = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
      await Promise.resolve()
      await Promise.resolve()
    })
  }
  const strictWrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(StrictMode, null, createElement(QueryClientProvider, { client: qc }, children))
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    writeSpy.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('a real edit sets the overlay synchronously; the seed of the NEXT mount is the overlay, not the stale prop', () => {
    const a = renderHook(() => useNoteContent(pg('s', loaded)), { wrapper })
    act(() => a.result.current.save(NEW))
    expect(latestBody('s')?.doc).toEqual(NEW) // before any timer/flush
    a.unmount()
    const b = renderHook(() => useNoteContent(pg('s', loaded)), { wrapper }) // stale prop: still `loaded`
    expect(b.result.current.seed).toEqual({ doc: NEW, status: 'ok' })
  })

  it('no overlay → the seed is the page content + status', () => {
    const { result } = renderHook(() => useNoteContent(pg('t', loaded)), { wrapper })
    expect(result.current.seed).toEqual({ doc: loaded, status: 'ok' })
  })

  it('(c) an overlay-seeded mount re-saves the overlay ONCE (ownership) — never the stale body', async () => {
    writeSpy.mockImplementation(() => new Promise(() => {})) // the outgoing write stays in flight
    const a = renderHook(() => useNoteContent(pg('c', loaded)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount() // flush #1 (NEW)
    const b = renderHook(() => useNoteContent(pg('c', loaded)), { wrapper })
    act(() => b.result.current.save(NEW)) // the new editor's mount echo of its seed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenCalledTimes(2)
    expect(writeSpy.mock.calls.every(([, d]) => JSON.stringify(d) === JSON.stringify(NEW))).toBe(true)
  })

  it('(d) a BLANK page with an overlay: the echo is not adopted as baseline — it re-saves the overlay', async () => {
    writeSpy.mockImplementation(() => new Promise(() => {}))
    const a = renderHook(() => useNoteContent(pg('d')), { wrapper })
    act(() => a.result.current.save(loaded)) // mount echo → baseline
    act(() => a.result.current.save(NEW)) // real edit
    a.unmount()
    const b = renderHook(() => useNoteContent(pg('d')), { wrapper }) // stale: content null
    expect(b.result.current.seed.doc).toEqual(NEW)
    act(() => b.result.current.save(NEW)) // echo of the seed
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenCalledTimes(2)
    expect(writeSpy).toHaveBeenLastCalledWith('d', NEW)
  })

  it('(h) a retryable failure after unmount, then remount → the re-save succeeds and clears the overlay', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    writeSpy.mockRejectedValueOnce(new Error('disk busy'))
    const a = renderHook(() => useNoteContent(pg('h', loaded)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount()
    await flushAll() // the outgoing write fails into a dead hook
    expect(latestBody('h')?.doc).toEqual(NEW) // kept: retryable
    const b = renderHook(() => useNoteContent(pg('h', loaded)), { wrapper })
    act(() => b.result.current.save(NEW))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    await flushAll()
    expect(writeSpy).toHaveBeenCalledTimes(2)
    expect(latestBody('h')).toBeUndefined()
    errSpy.mockRestore()
  })

  it('(i) gen race: the new mount saves (gen 2) before the outgoing write (gen 1) succeeds → survives gen 1, clears on gen 2', async () => {
    const releases: Array<() => void> = []
    writeSpy.mockImplementation(() => new Promise((res) => releases.push(() => res(undefined))))
    const a = renderHook(() => useNoteContent(pg('i', loaded)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount()
    await flushAll()
    const b = renderHook(() => useNoteContent(pg('i', loaded)), { wrapper })
    const edited2: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW2' }] }] }
    act(() => b.result.current.save(edited2))
    releases[0]!() // gen 1 succeeds
    await flushAll()
    expect(latestBody('i')?.doc).toEqual(edited2)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    releases[1]!() // gen 2 succeeds
    await flushAll()
    expect(latestBody('i')).toBeUndefined()
  })

  it('(j) a repeated mount echo (e.g. StrictMode’s double setEditable effect) still yields exactly one ownership re-save', async () => {
    writeSpy.mockImplementation(() => new Promise(() => {}))
    const a = renderHook(() => useNoteContent(pg('j', loaded)), { wrapper: strictWrapper })
    act(() => a.result.current.save(NEW))
    a.unmount()
    const b = renderHook(() => useNoteContent(pg('j', loaded)), { wrapper: strictWrapper })
    act(() => {
      b.result.current.save(NEW)
      b.result.current.save(NEW) // StrictMode's double setEditable echo
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenCalledTimes(2) // the original + ONE ownership re-save
  })

  it('(k) a terminal InvalidPageContentError on an older gen keeps a newer overlay; PageNotFoundError clears it', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let rejectFirst!: (e: Error) => void
    writeSpy.mockImplementationOnce(() => new Promise((_r, rej) => (rejectFirst = rej)))
    const a = renderHook(() => useNoteContent(pg('k', loaded)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount()
    await flushAll()
    const b = renderHook(() => useNoteContent(pg('k', loaded)), { wrapper })
    const newer: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEWER' }] }] }
    act(() => b.result.current.save(newer))
    rejectFirst(Object.assign(new Error('bad'), { name: 'InvalidPageContentError' }))
    await flushAll()
    expect(latestBody('k')?.doc).toEqual(newer)
    writeSpy.mockRejectedValueOnce(Object.assign(new Error('gone'), { name: 'PageNotFoundError' }))
    act(() => b.result.current.flush())
    await flushAll()
    expect(latestBody('k')).toBeUndefined()
    errSpy.mockRestore()
  })

  it('cancel() / lock() clear this writer’s overlay', () => {
    const { result } = renderHook(() => useNoteContent(pg('l', loaded)), { wrapper })
    act(() => result.current.save(NEW))
    act(() => result.current.cancel())
    expect(latestBody('l')).toBeUndefined()
    act(() => result.current.save(NEW))
    act(() => result.current.lock())
    expect(latestBody('l')).toBeUndefined()
  })
})

// DEV-R0-2 (Victor-approved, pre-existing defect): an edit reverted back to the stored body inside the debounce must NOT
// write the intermediate doc — the stored body is current again, so nothing is written and the overlay is dropped.
describe('useNoteContent — revert within the debounce (DEV-R0-2)', () => {
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    writeSpy.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })
  it('type then undo back to the stored body → nothing is written; the overlay is cleared', async () => {
    const { result } = renderHook(() => useNoteContent(pg('r', loaded)), { wrapper })
    act(() => {
      result.current.save(edited) // pending = edited
      result.current.save(loaded) // undo → equals the stored body
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).not.toHaveBeenCalled()
    expect(latestBody('r')).toBeUndefined()
    expect(getSaveStatus('r')).toBe('saved')
  })
})

// DEV-R0-2 (second window, post-impl critique B1): the dedupe must compare against what the DB WILL hold once queued
// writes settle — not the last CONFIRMED save — or an undo made while a write is in flight is silently skipped.
describe('useNoteContent — undo while a write is in flight (DEV-R0-2)', () => {
  const OLD: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'OLD' }] }] }
  const NEW: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW' }] }] }
  const flushAll = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
      await Promise.resolve()
      await Promise.resolve()
    })
  }
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('(own write) edit → flush starts → undo to the stored body before it settles → the LAST write is the stored body', async () => {
    const releases: Array<() => void> = []
    writeSpy.mockImplementation(() => new Promise((res) => releases.push(() => res(undefined))))
    const { result } = renderHook(() => useNoteContent(pg('w', OLD)), { wrapper })
    act(() => result.current.save(NEW))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600) // the NEW write is in flight
    })
    act(() => result.current.save(OLD)) // undo while it's in flight
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    for (const r of releases) r()
    await flushAll()
    expect(writeSpy).toHaveBeenLastCalledWith('w', OLD)
  })

  it('(overlay-seeded mount) the outgoing NEW write is in flight; the user edits back to the stale stored body → OLD is written last', async () => {
    writeSpy.mockImplementation(() => new Promise(() => {}))
    const a = renderHook(() => useNoteContent(pg('v', OLD)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount() // NEW in flight
    const b = renderHook(() => useNoteContent(pg('v', OLD)), { wrapper }) // stale prop: OLD
    act(() => b.result.current.save(NEW)) // mount echo of the overlay seed
    act(() => b.result.current.save(OLD)) // the user edits back to exactly OLD within the debounce
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
    })
    expect(writeSpy).toHaveBeenLastCalledWith('v', OLD)
  })

  it('an overlay seed never unlocks a page whose CURRENT bytes are malformed (critique #8)', () => {
    const a = renderHook(() => useNoteContent(pg('x', OLD)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount()
    const malformed: NoteContentPage = { id: 'x', title: 'T', type: 'note', content: null, journalDate: null, contentStatus: 'malformed' }
    const b = renderHook(() => useNoteContent(malformed), { wrapper })
    expect(b.result.current.seed.status).toBe('malformed')
  })
})

// Post-impl critique r2 A1 — the ownership re-save survives a type-then-undo inside the debounce: the inherited
// handover is sticky until THIS mount's own write succeeds (the shared overlay entry is overwritten by its first save).
describe('useNoteContent — inherited handover is sticky (DEV-R0-1, critique r2 A1)', () => {
  const NEW: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW' }] }] }
  const NEW2: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW2' }] }] }
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('echo NEW → type NEW2 → undo to NEW (all < 500 ms) still re-saves NEW (covers an outgoing write that fails)', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    writeSpy.mockRejectedValueOnce(new Error('disk busy')) // the OUTGOING write of NEW fails after unmount
    writeSpy.mockResolvedValue(undefined)
    const a = renderHook(() => useNoteContent(pg('z', loaded)), { wrapper })
    act(() => a.result.current.save(NEW))
    a.unmount()
    const b = renderHook(() => useNoteContent(pg('z', loaded)), { wrapper })
    act(() => {
      b.result.current.save(NEW) // echo of the overlay seed
      b.result.current.save(NEW2) // a keystroke
      b.result.current.save(NEW) // undo
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600)
      await Promise.resolve()
    })
    expect(writeSpy).toHaveBeenLastCalledWith('z', NEW)
    expect(writeSpy).toHaveBeenCalledTimes(2) // the failed outgoing + this mount's re-save
    errSpy.mockRestore()
  })
})

// notes-rescope R1 · G6/G7 · BR-R1-5/7 — the writer reports to the per-page store; a failure no chip observes toasts.
describe('useNoteContent → save-status store (R1)', () => {
  const flushAll = async () => {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
      await Promise.resolve()
      await Promise.resolve()
    })
  }
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    __resetBodyWrites()
    __resetSaveStatus()
    notifySpy.mockReset()
    writeSpy.mockReset()
    writeSpy.mockResolvedValue(undefined)
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('a rejected write while a chip observes the page → status error, NO toast; the next success → saved', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const chip = renderHook(() => useSaveStatus('o1'))
    writeSpy.mockRejectedValueOnce(new Error('disk busy'))
    const { result } = renderHook(() => useNoteContent(pg('o1', loaded)), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll()
    expect(chip.result.current).toBe('error')
    expect(notifySpy).not.toHaveBeenCalled()
    act(() => result.current.flush()) // the re-queued doc retries
    await flushAll()
    expect(chip.result.current).toBe('saved')
    errSpy.mockRestore()
  })

  it('a rejection landing AFTER the body unmounted (no chip) → exactly one toast naming the page', async () => {
    let reject: (e: Error) => void = () => {}
    writeSpy.mockImplementationOnce(() => new Promise((_r, j) => (reject = j)))
    const { result, unmount } = renderHook(() => useNoteContent({ ...pg('u1', loaded), title: '' }), { wrapper })
    act(() => result.current.save(edited))
    act(() => result.current.flush())
    await flushAll() // the write starts (getServices resolves) — reject is now bound
    expect(writeSpy).toHaveBeenCalledTimes(1)
    unmount()
    await act(async () => {
      reject(new Error('disk busy'))
      await Promise.resolve()
      await Promise.resolve()
    })
    expect(getSaveStatus('u1')).toBe('error')
    expect(notifySpy).toHaveBeenCalledTimes(1)
    expect(notifySpy).toHaveBeenCalledWith('save “Untitled note”', expect.any(Error))
  })

  it("lock() marks the page 'locked' (the chip hides; sticky against a late write)", async () => {
    const { result } = renderHook(() => useNoteContent(pg('l1', loaded)), { wrapper })
    act(() => result.current.lock())
    expect(getSaveStatus('l1')).toBe('locked')
    setSaveStatus('l1', 'saved')
    expect(getSaveStatus('l1')).toBe('locked')
  })
})
