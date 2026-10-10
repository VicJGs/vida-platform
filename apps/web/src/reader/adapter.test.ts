// Pure — env `node` (no jsdom). Locks the Books↔CanvasReader adapter (S6): the display-resolve mappers (resolveLocation /
// groupAnnotations / mapChapters), the state/position/listen mappers, the toReaderProps assembler, and the intent wiring
// (bindReaderIntents) against a mock BooksReaderPort. The live useReader hook is deferred (see ./CLAUDE.md).
import { describe, expect, it, vi } from 'vitest'
import {
  resolveLocation,
  mapChapters,
  groupAnnotations,
  mapReaderState,
  mapPositionNote,
  mapListen,
  toReaderProps,
  bindReaderIntents,
  createReaderAdapter,
  type ChapterInput,
  type AnnotationInput,
  type BooksReaderPort,
} from './adapter'

const CH: ChapterInput[] = [
  { id: 'c1', chapter_number: 1, title: 'Beginnings', start_page: 1, end_page: 20, is_completed: true },
  { id: 'c2', chapter_number: 2, title: 'The Middle', start_page: 21, end_page: 60, is_completed: false },
  { id: 'c3', chapter_number: 3, title: 'The End', start_page: 61, end_page: null, is_completed: false }, // open-ended
]

describe('resolveLocation — the display-resolve heart (EC-14)', () => {
  it('resolves an in-range page to a "Ch. N · p. P" breadcrumb + chapterId', () => {
    const r = resolveLocation('42', CH)
    expect(r.node).toBe('Ch. 2 · p. 42')
    expect(r.chapterId).toBe('c2')
    expect(r.page).toBe(42)
  })

  it('matches at the chapter boundary (start_page and end_page inclusive)', () => {
    expect(resolveLocation('21', CH).chapterId).toBe('c2') // start
    expect(resolveLocation('60', CH).chapterId).toBe('c2') // end
    expect(resolveLocation('20', CH).chapterId).toBe('c1') // c1 end, not c2
  })

  it('resolves into an open-ended final chapter (end_page null)', () => {
    const r = resolveLocation('999', CH)
    expect(r.chapterId).toBe('c3')
    expect(r.node).toBe('Ch. 3 · p. 999')
  })

  it('parses a leading integer out of a decorated position', () => {
    expect(resolveLocation('42 (loc 1234)', CH).page).toBe(42)
  })

  it('degrades on an unparseable position — the raw string, no chapter, no guessed page', () => {
    const r = resolveLocation('epubcfi(/6/14!/4/2)', CH)
    expect(r.chapterId).toBeUndefined()
    expect(r.page).toBeUndefined()
    expect(r.node).toBe('epubcfi(/6/14!/4/2)')
  })

  it('degrades on a null position to "Location unknown"', () => {
    const r = resolveLocation(null, CH)
    expect(r.node).toBe('Location unknown')
    expect(r.chapterId).toBeUndefined()
  })

  it('a page with no matching chapter → a page-only breadcrumb, no chapterId', () => {
    const r = resolveLocation('500', [CH[0], CH[1]]) // 500 is past c2's end, c3 absent
    expect(r.node).toBe('p. 500')
    expect(r.chapterId).toBeUndefined()
  })

  it('an empty TOC → page-only breadcrumb', () => {
    expect(resolveLocation('7', []).node).toBe('p. 7')
  })
})

describe('mapChapters — the TOC (EC-13)', () => {
  it('maps number/title/pageRef/done and orders by chapter_number', () => {
    const out = mapChapters([CH[2], CH[0], CH[1]])
    expect(out.map((c) => c.number)).toEqual([1, 2, 3])
    expect(out[0]).toMatchObject({ id: 'c1', title: 'Beginnings', pageRef: 'p. 1', done: true, current: false })
  })

  it('marks current only for the chapter whose range holds currentPage', () => {
    const out = mapChapters(CH, 42)
    expect(out.find((c) => c.id === 'c2')?.current).toBe(true)
    expect(out.filter((c) => c.current).length).toBe(1)
  })

  it('omits pageRef when start_page is null', () => {
    const out = mapChapters([{ id: 'x', chapter_number: 1, title: 'No pages', start_page: null, end_page: null, is_completed: false }])
    expect(out[0].pageRef).toBeUndefined()
  })
})

describe('groupAnnotations — pre-grouped by chapter + Unplaced (EC-14 / BR-S3-1)', () => {
  const ANN: AnnotationInput[] = [
    { kind: 'bookmark', id: 'b1', text: 'A bookmark', position: '5' }, // c1
    { kind: 'quote', id: 'q1', text: 'A quote', position: '42' }, // c2
    { kind: 'highlight', id: 'h1', text: 'A highlight', position: '45' }, // c2
    { kind: 'bookmark', id: 'b2', text: null, position: 'epubcfi(x)' }, // unplaced + null text
  ]

  it('groups by chapter in TOC order with a trailing Unplaced group', () => {
    const groups = groupAnnotations(ANN, CH)
    expect(groups.map((g) => g.id)).toEqual(['c1', 'c2', 'unplaced'])
    expect(groups.map((g) => g.title)).toEqual(['Beginnings', 'The Middle', 'Unplaced'])
    expect(groups[1].annotations.map((a) => a.id)).toEqual(['q1', 'h1'])
  })

  it('maps nature identity and the per-nature text; null text → empty string', () => {
    const groups = groupAnnotations(ANN, CH)
    const q1 = groups[1].annotations[0]
    expect(q1.nature).toBe('quote')
    expect(q1.text).toBe('A quote')
    expect(q1.location).toBe('Ch. 2 · p. 42')
    const unplaced = groups[2].annotations[0]
    expect(unplaced.text).toBe('') // null → ''
    expect(unplaced.location).toBe('epubcfi(x)')
  })

  it('omits a chapter group with no annotations and omits Unplaced when all resolve', () => {
    const groups = groupAnnotations([{ kind: 'bookmark', id: 'b1', text: 'x', position: '5' }], CH)
    expect(groups.map((g) => g.id)).toEqual(['c1'])
  })

  it('empty input → no groups', () => {
    expect(groupAnnotations([], CH)).toEqual([])
  })
})

describe('state / position / listen mappers', () => {
  it('mapReaderState maps the access outcome only', () => {
    expect(mapReaderState({ status: 'attachment-unavailable' })).toBe('unavailable')
    expect(mapReaderState({ status: 'stored', fileRef: 'r2:abc' })).toBe('success')
  })

  it('mapPositionNote surfaces the IR-3 not-synced line, nothing when synced', () => {
    expect(mapPositionNote({ status: 'not-synced', nativePosition: '42' })).toBe(
      "Reading position isn't synced across formats yet",
    )
    expect(mapPositionNote({ status: 'synced', position: '42', sourceAssetId: 'a1' })).toBeUndefined()
  })

  it('mapListen maps ai-unavailable to the calm unavailable, else undefined (IR-7)', () => {
    expect(mapListen({ status: 'ai-unavailable' })).toBe('unavailable')
    expect(mapListen({ status: 'ready', position: '1', source: 'ai' })).toBeUndefined()
    expect(mapListen(undefined)).toBeUndefined()
  })
})

describe('toReaderProps — the assembler → the shipped CanvasReaderProps surface', () => {
  it('maps the display-resolve outputs and threads passthroughs', () => {
    const props = toReaderProps({
      title: 'The Brothers Karamazov',
      context: 'Chapter 2',
      summary: 'About…',
      chapters: CH,
      annotations: [{ kind: 'quote', id: 'q1', text: 'A quote', position: '42' }],
      currentPage: 42,
      file: { status: 'stored', fileRef: 'r2:x' },
      position: { status: 'not-synced', nativePosition: '42' },
      listenResult: { status: 'ai-unavailable' },
      contentsOpen: true,
      'aria-label': 'Reader',
    })
    expect(props.title).toBe('The Brothers Karamazov')
    expect(props.summary).toBe('About…')
    expect(props.chapters?.find((c) => c.id === 'c2')?.current).toBe(true)
    expect(props.annotationGroups?.[0].id).toBe('c2')
    expect(props.state).toBe('success')
    expect(props.positionNote).toBe("Reading position isn't synced across formats yet")
    expect(props.listen).toBe('unavailable')
    expect(props.contentsOpen).toBe(true)
  })

  it('explicit state overrides the access-derived state; absent file → undefined state', () => {
    expect(toReaderProps({ title: 'T', state: 'loading', file: { status: 'stored', fileRef: 'x' } }).state).toBe('loading')
    expect(toReaderProps({ title: 'T' }).state).toBeUndefined()
  })

  it('explicit listen (runtime idle/playing) wins over the availability map', () => {
    expect(toReaderProps({ title: 'T', listen: 'playing', listenResult: { status: 'ai-unavailable' } }).listen).toBe('playing')
  })
})

describe('bindReaderIntents — intents → writes via the port (BR-S6-7)', () => {
  function mockPort() {
    return {
      openReader: vi.fn(),
      convertToSpeech: vi.fn(),
      openAnnotationNote: vi.fn().mockResolvedValue({}),
      linkAnnotations: vi.fn().mockResolvedValue({}),
      addBookmark: vi.fn().mockResolvedValue({}),
      addHighlight: vi.fn().mockResolvedValue({}),
      addQuote: vi.fn().mockResolvedValue({}),
      endSession: vi.fn().mockResolvedValue({}),
    } satisfies BooksReaderPort
  }
  const ctx = { bookId: 'bk1', assetId: 'as1', natureById: { q1: 'quote' as const, b1: 'bookmark' as const } }

  it('onAddNote opens the note with the resolved nature', () => {
    const port = mockPort()
    bindReaderIntents(port, ctx).onAddNote('q1')
    expect(port.openAnnotationNote).toHaveBeenCalledWith({ kind: 'quote', id: 'q1' })
  })

  it('onAddNote no-ops (never throws) on an unknown id', () => {
    const port = mockPort()
    expect(() => bindReaderIntents(port, ctx).onAddNote('nope')).not.toThrow()
    expect(port.openAnnotationNote).not.toHaveBeenCalled()
  })

  it('onLinkAnnotation delegates to the consumer picker flow', () => {
    const port = mockPort()
    const onLink = vi.fn()
    bindReaderIntents(port, ctx, { onLink }).onLinkAnnotation('q1')
    expect(onLink).toHaveBeenCalledWith('q1')
    expect(port.linkAnnotations).not.toHaveBeenCalled()
  })

  it('onLinkAnnotation / onListenToggle no-op (never throw) without opts', () => {
    const port = mockPort()
    const b = bindReaderIntents(port, ctx)
    expect(() => b.onLinkAnnotation('q1')).not.toThrow()
    expect(() => b.onListenToggle()).not.toThrow()
  })

  it('onListenToggle delegates to the consumer playback flow', () => {
    const port = mockPort()
    const onListenToggle = vi.fn()
    bindReaderIntents(port, ctx, { onListenToggle }).onListenToggle()
    expect(onListenToggle).toHaveBeenCalledTimes(1)
  })

  it('the selection writes hit the right port methods with the right ids', () => {
    const port = mockPort()
    const b = bindReaderIntents(port, ctx)
    b.onHighlight({ captured_text: 'x', position: '5' })
    b.onQuote('a quote')
    b.onBookmark('5')
    expect(port.addHighlight).toHaveBeenCalledWith('as1', { captured_text: 'x', position: '5' })
    expect(port.addQuote).toHaveBeenCalledWith('bk1', 'a quote')
    expect(port.addBookmark).toHaveBeenCalledWith('bk1', '5')
  })
})

describe('createReaderAdapter — the convention', () => {
  it('exposes every mapper + the assembler + the intent wiring', () => {
    const a = createReaderAdapter()
    expect(typeof a.resolveLocation).toBe('function')
    expect(typeof a.groupAnnotations).toBe('function')
    expect(typeof a.toReaderProps).toBe('function')
    expect(typeof a.bindReaderIntents).toBe('function')
  })
})
