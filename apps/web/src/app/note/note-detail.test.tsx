// @vitest-environment jsdom
// MOD-notes ② · B2 — the note-detail screen: read-axis states, the content codec seam, the single-writer autosave
// (mount-echo dedupe + debounce + coalesce), favorite/archive toggles, and the confirm-gated soft-delete. The data
// hooks + router are mocked (no real service/DB/worker); @vida/editor is stubbed to a deterministic onChange source
// (mounting the real TipTap editor + driving a ProseMirror edit is out of scope for a logic test). Real @vida/ui.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { UIProvider } from '@vida/ui'
import type { PageRow } from '@vida/core'

const nav = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => nav,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
  Link: ({ children, to, ...rest }: any) => (
    <a href={typeof to === 'string' ? to : '#'} {...rest}>
      {children}
    </a>
  ),
}))

// Stub the editor: capture onChange so tests can drive it; reflect `editable` for the corrupt assertion.
const ed = vi.hoisted(() => ({
  onChange: null as null | ((d: unknown) => void),
  editable: undefined as unknown,
}))
vi.mock('@vida/editor', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test stub
  VidaEditor: (props: any) => {
    ed.onChange = props.onChange
    ed.editable = props.editable
    return <div data-testid="editor" aria-label={props['aria-label']} data-editable={String(props.editable)} />
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- passthrough shape gate for the codec used by note-detail
  assertEditorDocument: (j: any) => j,
}))

const h = vi.hoisted(() => ({
  note: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  createLink: vi.fn(),
  createNote: vi.fn(),
  updateMutate: vi.fn(),
  delMutate: vi.fn(),
}))
vi.mock('./use-note', () => ({
  useNote: h.note,
  useUpdateNote: h.update,
  useDeleteNote: h.del,
  useCreatePageLink: h.createLink,
  useCreateNoteFromLink: h.createNote,
  // B4 hooks — the note-detail now imports these (+ renders the link panels). Default them to inert/empty so the B2
  // read-axis/autosave/delete tests keep exercising ONLY B2 (the panels render their empty state).
  useCreateEntityLink: () => ({ mutate: vi.fn(), mutateAsync: vi.fn() }),
  useRemoveEntityLink: () => ({ mutate: vi.fn() }),
  useRemovePageLink: () => ({ mutate: vi.fn() }),
  useBacklinks: () => ({ isPending: false, isError: false, data: { entityLinks: [], pageLinks: [] } }),
  useLinksOut: () => ({ isPending: false, isError: false, data: { pageLinks: [], entityLinks: [] } }),
  useNoteTitle: () => ({ data: null }),
}))

import { NoteDetail, buildWikiConfig } from './note-detail'

const DOC = { type: 'doc', content: [{ type: 'paragraph' }] }
const page = (over: Partial<PageRow> = {}): PageRow =>
  ({
    id: 'n1',
    title: 'Hello',
    content: JSON.stringify(DOC),
    type: 'note',
    is_favorite: false,
    is_archived: false,
    created_at: 1_700_000_000_000,
    updated_at: 1_700_000_000_000,
    word_count: 3,
    ...over,
  }) as unknown as PageRow

const renderDetail = () =>
  render(
    <UIProvider>
      <NoteDetail id="n1" />
    </UIProvider>,
  )

const success = (over: Partial<PageRow> = {}) =>
  h.note.mockReturnValue({ isPending: false, isError: false, data: page(over) })

beforeEach(() => {
  h.update.mockReturnValue({ mutate: h.updateMutate, isPending: false })
  h.del.mockReturnValue({ mutate: h.delMutate, isPending: false })
  h.createLink.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false })
  h.createNote.mockReturnValue({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
  ed.onChange = null
})

describe('NoteDetail read states', () => {
  it('loading → a busy status region', () => {
    h.note.mockReturnValue({ isPending: true, isError: false, data: undefined })
    renderDetail()
    expect(screen.getByText(/loading note/i)).toBeTruthy()
  })
  it('error → a status region with retry', () => {
    h.note.mockReturnValue({ isPending: false, isError: true, data: undefined })
    renderDetail()
    expect(screen.getByText(/couldn.t load this note/i)).toBeTruthy()
    expect(screen.getByRole('button', { name: /retry/i })).toBeTruthy()
  })
  it('null page → a distinct not-found surface', () => {
    h.note.mockReturnValue({ isPending: false, isError: false, data: null })
    renderDetail()
    expect(screen.getByText(/doesn.t exist or was deleted/i)).toBeTruthy()
    expect(screen.getByRole('link', { name: /back to notes/i })).toBeTruthy()
  })
  it('success → the editor mounts (editable) with the title', () => {
    success()
    renderDetail()
    expect(screen.getByTestId('editor').getAttribute('data-editable')).toBe('true')
    expect((screen.getByLabelText('Note title') as HTMLInputElement).value).toBe('Hello')
  })
})

describe('NoteDetail corrupt content (BR-B2-3)', () => {
  it('unparseable content → read-only editor + flag banner', () => {
    success({ content: '{ broken json' })
    renderDetail()
    expect(screen.getByTestId('editor').getAttribute('data-editable')).toBe('false')
    expect(screen.getByText(/read-only/i)).toBeTruthy()
  })
})

describe('NoteDetail autosave (single writer, dedupe, debounce)', () => {
  const useDebounceTimers = () => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })

  it('mount echo (equal normalized content) does NOT write', () => {
    useDebounceTimers()
    success()
    renderDetail()
    act(() => {
      ed.onChange?.(DOC) // the editor's benign mount echo — equals the seeded baseline
      vi.advanceTimersByTime(1000)
    })
    expect(h.updateMutate).not.toHaveBeenCalled()
  })

  it('a real content edit writes once after the debounce', () => {
    useDebounceTimers()
    success()
    renderDetail()
    const edited = { type: 'doc', content: [{ type: 'paragraph' }, { type: 'paragraph' }] }
    act(() => {
      ed.onChange?.(edited)
      vi.advanceTimersByTime(600)
    })
    expect(h.updateMutate).toHaveBeenCalledTimes(1)
    expect(h.updateMutate.mock.calls[0][0]).toEqual({ content: JSON.stringify(edited) })
  })

  it('a title edit writes the title patch', () => {
    useDebounceTimers()
    success()
    renderDetail()
    act(() => {
      fireEvent.change(screen.getByLabelText('Note title'), { target: { value: 'Renamed' } })
      vi.advanceTimersByTime(600)
    })
    expect(h.updateMutate).toHaveBeenCalledTimes(1)
    expect(h.updateMutate.mock.calls[0][0]).toEqual({ title: 'Renamed' })
  })

  it('title + content within one window coalesce into a single write', () => {
    useDebounceTimers()
    success()
    renderDetail()
    const edited = { type: 'doc', content: [{ type: 'heading' }] }
    act(() => {
      fireEvent.change(screen.getByLabelText('Note title'), { target: { value: 'Both' } })
      ed.onChange?.(edited)
      vi.advanceTimersByTime(600)
    })
    expect(h.updateMutate).toHaveBeenCalledTimes(1)
    expect(h.updateMutate.mock.calls[0][0]).toEqual({ title: 'Both', content: JSON.stringify(edited) })
  })

  it('clearing the title persists null (not empty string)', () => {
    useDebounceTimers()
    success()
    renderDetail()
    act(() => {
      fireEvent.change(screen.getByLabelText('Note title'), { target: { value: '' } })
      vi.advanceTimersByTime(600)
    })
    expect(h.updateMutate).toHaveBeenCalledTimes(1)
    expect(h.updateMutate.mock.calls[0][0]).toEqual({ title: null })
  })
})

describe('NoteDetail actions', () => {
  it('favorite toggle writes is_favorite:true', () => {
    success()
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: /note actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /add to favorites/i }))
    expect(h.updateMutate).toHaveBeenCalledTimes(1)
    expect(h.updateMutate.mock.calls[0][0]).toEqual({ is_favorite: true })
  })

  it('favorite reflects the returned row — the menu label flips (BR-B2-9)', () => {
    h.updateMutate.mockImplementation((_patch: unknown, opts?: { onSuccess?: (r: PageRow) => void }) =>
      opts?.onSuccess?.(page({ is_favorite: true })),
    )
    success()
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: /note actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /add to favorites/i }))
    fireEvent.click(screen.getByRole('button', { name: /note actions/i })) // reopen
    expect(screen.getByRole('menuitem', { name: /remove from favorites/i })).toBeTruthy()
  })

  it('delete → non-dismissible confirm → softDelete + navigate to /notes', () => {
    h.delMutate.mockImplementation((_v: unknown, opts?: { onSuccess?: () => void }) => opts?.onSuccess?.())
    success()
    renderDetail()
    fireEvent.click(screen.getByRole('button', { name: /note actions/i }))
    fireEvent.click(screen.getByRole('menuitem', { name: /^delete$/i }))
    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    expect(h.delMutate).toHaveBeenCalledTimes(1)
    expect(nav).toHaveBeenCalledWith({ to: '/notes' })
  })
})

describe('NoteDetail rail toggle (EC-7)', () => {
  it('toggles the detail rail open/closed', () => {
    success()
    renderDetail()
    const toggle = screen.getByRole('button', { name: /show panel|hide panel/i })
    const openAtStart = toggle.getAttribute('aria-expanded') === 'true'
    fireEvent.click(toggle)
    const toggleAfter = screen.getByRole('button', { name: /show panel|hide panel/i })
    expect(toggleAfter.getAttribute('aria-expanded')).toBe(String(!openAtStart))
  })
})

// ── B3 · the `[[` picker app binding (buildWikiConfig) ─────────────────────────────────────────────────────
describe('buildWikiConfig — the [[ picker service binding (B3)', () => {
  const row = (id: string, title: string | null): PageRow => ({ id, title }) as unknown as PageRow

  it('query maps resolveWikiLink rows to candidates AS-IS incl. the current page (no self-filter); null title → Untitled', async () => {
    const resolveWikiLink = vi.fn().mockResolvedValue([row('self', 'Me'), row('p2', null)])
    const cfg = buildWikiConfig({ resolveWikiLink, createNote: vi.fn(), createLink: vi.fn() })
    const candidates = await cfg.query('m', new AbortController().signal)
    expect(resolveWikiLink).toHaveBeenCalledWith('m')
    expect(candidates).toEqual([
      { id: 'self', title: 'Me' },
      { id: 'p2', title: 'Untitled' },
    ])
  })

  it('onCreate delegates to createNote (create-on-miss) and maps the new page to a candidate', async () => {
    const createNote = vi.fn().mockResolvedValue(row('new', 'New Note'))
    const cfg = buildWikiConfig({ resolveWikiLink: vi.fn(), createNote, createLink: vi.fn() })
    expect(await cfg.onCreate('New Note')).toEqual({ id: 'new', title: 'New Note' })
    expect(createNote).toHaveBeenCalledWith('New Note')
  })

  it('onSelect calls createLink with the candidate id (the page_links write)', async () => {
    const createLink = vi.fn().mockResolvedValue(undefined)
    const cfg = buildWikiConfig({ resolveWikiLink: vi.fn(), createNote: vi.fn(), createLink })
    await cfg.onSelect({ id: 'target', title: 'T' })
    expect(createLink).toHaveBeenCalledWith('target')
  })
})
