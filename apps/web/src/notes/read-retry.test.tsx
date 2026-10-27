// @vitest-environment jsdom
// ============================================================================
// notes-rescope R1 · E-2 / BR-R1-8 — read errors are recoverable in place (PLAN-R1 G8 + IMPL R-2/R-6, test A8).
// Run with the APP's query defaults (`retry: 1`, no refetch on focus) — only `retryDelay: 0`, to keep the test fast.
// Pins: an idle error never re-reads; a Retry that succeeds reads once; one that fails again reads twice (1 + retry);
// while a Retry runs the error branch STAYS (v5 resets a no-data query to pending — R-6) with a busy button.
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, cleanup, fireEvent, render, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { queryClient as appClient } from '../lib/query-client'

const reads = { getPage: 0, listPages: 0, ensureJournal: 0 }
let fail = 0 // how many upcoming reads reject
let gate: Promise<void> | null = null // when set, a SUCCESSFUL read waits on it (to observe the in-flight frame)
const row = {
  id: 'p1', type: 'note', title: 'Kickoff', content: null, is_favorite: false, is_archived: false,
  updated_at: Date.now(), journal_date: null, icon: null, cover_image: null,
}
function read<T>(k: keyof typeof reads, value: T): Promise<T> {
  reads[k] += 1
  if (fail > 0) {
    fail -= 1
    return Promise.reject(new Error('read failed'))
  }
  return gate ? gate.then(() => value) : Promise.resolve(value)
}
vi.mock('../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({
      notes: {
        getPage: () => read('getPage', row),
        listPages: () => read('listPages', [row]),
        ensureJournal: (d: string) => read('ensureJournal', { ...row, id: 'j1', type: 'journal', title: d, journal_date: d }),
        writePageContent: async () => undefined,
      },
    }),
}))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  getRouteApi: () => ({ useParams: () => ({ id: 'p1' }) }),
}))
vi.mock('@vida/editor', () => ({ VidaEditor: () => <div data-testid="editor" />, toMarkdown: () => '' }))

import { useNoteEntity } from './use-note-entity'
import { useNotesRows } from './use-notes-rows'
import { useJournalEntry } from '../home/use-journal-entry'
import { NoteEntity } from './note-entity'
import { NotesSurface } from './notes-surface'
import { JournalPageRegion } from '../home/journal-page-region'

let qc: QueryClient
const appDefaults = () =>
  new QueryClient({ defaultOptions: { queries: { ...appClient.getDefaultOptions().queries, retryDelay: 0 } } })
const wrapper = ({ children }: { children: React.ReactNode }) => createElement(QueryClientProvider, { client: qc }, children)
const renderUI = (ui: React.ReactNode) =>
  render(
    <UIProvider>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </UIProvider>,
  )
const settle = () => act(async () => new Promise((r) => setTimeout(r, 20)))

beforeEach(() => {
  qc = appDefaults()
  reads.getPage = reads.listPages = reads.ensureJournal = 0
  fail = 0
  gate = null
})
afterEach(cleanup)

type SurfaceRead = () => { state: string; retrying: boolean; retry: () => void }
const HOOKS: Array<[string, SurfaceRead, keyof typeof reads]> = [
  ['useNoteEntity', () => useNoteEntity('p1'), 'getPage'],
  ['useNotesRows', () => useNotesRows(), 'listPages'],
  ['useJournalEntry', () => useJournalEntry(), 'ensureJournal'],
]
describe.each(HOOKS)('%s — retry contract', (_name, useHook, key) => {
  it('first load fails (2 reads: 1 + retry) → error; idle → no more reads', async () => {
    fail = 2
    const { result } = renderHook(useHook, { wrapper })
    expect(result.current.state).toBe('loading') // a first load is never the error branch
    await waitFor(() => expect(result.current.state).toBe('error'))
    expect(reads[key]).toBe(2)
    expect(result.current.retrying).toBe(false)
    await settle()
    expect(reads[key]).toBe(2)
  })

  it('Retry that succeeds reads once; the branch never flips to loading (R-6) and is busy meanwhile', async () => {
    fail = 2
    const seen: Array<{ state: string; retrying: boolean }> = []
    const { result } = renderHook(
      () => {
        const r = useHook()
        seen.push({ state: r.state, retrying: r.retrying })
        return r
      },
      { wrapper },
    )
    await waitFor(() => expect(result.current.state).toBe('error'))
    const from = seen.length
    let release: () => void = () => {}
    gate = new Promise<void>((r) => (release = r))
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.retrying).toBe(true)) // busy, held in flight …
    expect(result.current.state).toBe('error') // … on the error branch (R-6)
    release()
    await waitFor(() => expect(result.current.state).toBe('success'))
    const during = seen.slice(from)
    expect(during.some((r) => r.state === 'loading')).toBe(false) // never the loading branch
    expect(reads[key]).toBe(3)
    expect(result.current.retrying).toBe(false)
  })

  it('Retry that fails again reads twice and ends in error, not busy', async () => {
    fail = 4
    const { result } = renderHook(useHook, { wrapper })
    await waitFor(() => expect(result.current.state).toBe('error'))
    act(() => result.current.retry())
    await waitFor(() => expect(reads[key]).toBe(4))
    await waitFor(() => expect(result.current.retrying).toBe(false))
    expect(result.current.state).toBe('error')
    await settle()
    expect(reads[key]).toBe(4)
  })
})

describe.each([
  ['the note page', () => <NoteEntity />, 'Couldn’t load this page.', 'getPage'],
  ['the collection', () => <NotesSurface />, 'Couldn’t load your notes.', 'listPages'],
  ['Home', () => <JournalPageRegion />, 'Couldn’t load today’s page.', 'ensureJournal'],
] as const)('%s — Retry in place (BR-R1-8)', (_n, ui, message, key) => {
  it('shows the polite message + a Retry OUTSIDE the live region; pressing it recovers', async () => {
    fail = 3 // initial + retry, then the first press's attempt fails once → its retry succeeds
    const r = renderUI(ui())
    await waitFor(() => expect(r.getByText(message)).not.toBeNull())
    const status = r.getByText(message).closest('[role="status"]')
    expect(status).not.toBeNull()
    expect(status?.querySelector('button')).toBeNull()
    const button = r.getByRole('button', { name: 'Retry' })
    let release: () => void = () => {}
    gate = new Promise<void>((res) => (release = res))
    fireEvent.click(button)
    await waitFor(() => expect(r.getByRole('button', { name: 'Retry' }).getAttribute('aria-busy')).toBe('true'))
    expect(r.getByRole('button', { name: 'Retry' })).toBe(button) // the same element — focus can't be lost
    release()
    await waitFor(() => expect(r.queryByText(message)).toBeNull())
    expect(reads[key]).toBe(4)
  }, 20_000) // a full-surface Tamagui render: past the 5 s default under suite load (memory: heavy-tamagui-shell-tests-flake)
})
