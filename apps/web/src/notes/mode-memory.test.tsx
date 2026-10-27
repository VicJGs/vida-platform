// @vitest-environment jsdom
// ============================================================================
// notes-rescope R2 · mode memory on the note page (PLAN-R2 §4 B4/B5 · IMPLEMENTATION-PLAN R-3/R-4).
// The real @vida/core app_state accessors run against a fake driver (the app_state rows live in `store`);
// the page reads go through a mocked composition root. "Seeded per-type default while loading" (slice R2).
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'

// ── the app_state fake driver ────────────────────────────────────────────────────────────────────────────────
const store = new Map<string, string>()
let reads = 0
let readGate: Promise<void> | null = null // hold the mode read in flight
let failRead = false
let failWrite = false
const writes: Array<[string, string]> = []
const driver = {
  query: async (sql: string, params: unknown[] = []) => {
    if (!sql.includes('app_state')) return []
    reads += 1
    const prefix = String(params[0])
    const snapshot = [...store].filter(([k]) => k.startsWith(prefix)).map(([key, value]) => ({ key, value }))
    if (readGate) await readGate
    if (failRead) throw new Error('read failed')
    return snapshot // rows as they were when the read STARTED (the in-flight race)
  },
  run: async (sql: string, params: unknown[] = []) => {
    if (failWrite) throw new Error('write failed')
    if (sql.startsWith('INSERT OR REPLACE INTO app_state')) {
      writes.push([String(params[0]), String(params[1])])
      store.set(String(params[0]), String(params[1]))
    }
  },
}
vi.mock('../db/boot', () => ({ ensureDbReady: () => Promise.resolve({ driver }) }))

// ── the page read + route + editor ───────────────────────────────────────────────────────────────────────────
const row = (id: string) => ({
  id, type: 'note', title: `Note ${id}`, content: null, is_favorite: false, is_archived: false,
  updated_at: Date.now(), journal_date: null, icon: null, cover_image: null,
})
vi.mock('../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({ notes: { getPage: async (id: string) => row(id), writePageContent: async () => undefined } }),
}))
let routeId = 'n1'
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
  getRouteApi: () => ({ useParams: () => ({ id: routeId }) }),
}))
vi.mock('@vida/editor', () => ({ VidaEditor: () => <div data-testid="editor" />, toMarkdown: () => '' }))
const notifySpy = vi.fn()
vi.mock('../lib/notify-error', () => ({ notifyError: (...a: unknown[]) => notifySpy(...a) }))

// Full-page Tamagui renders with 1–2 navigations per case: past the 5 s default under suite load (R1 read-retry precedent).
vi.setConfig({ testTimeout: 20_000 })

import { NoteEntity } from './note-entity'
import { __resetEntityModes } from './use-entity-modes'

let qc: QueryClient
function ui(strict = false) {
  const tree = (
    <UIProvider>
      <QueryClientProvider client={qc}>
        <NoteEntity />
      </QueryClientProvider>
    </UIProvider>
  )
  return strict ? <StrictMode>{tree}</StrictMode> : tree
}
const merged = (r: ReturnType<typeof render>) => r.getByRole('button', { name: 'Merged' }).getAttribute('aria-pressed') === 'true'
const settle = () => act(async () => new Promise((res) => setTimeout(res, 20)))
async function go(r: ReturnType<typeof render>, id: string) {
  routeId = id
  r.rerender(ui())
  await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
}

beforeEach(() => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  store.clear()
  writes.length = 0
  reads = 0
  readGate = null
  failRead = failWrite = false
  routeId = 'n1'
  notifySpy.mockReset()
  window.history.replaceState({}, '', '/notes/n1')
})
afterEach(() => {
  cleanup()
  __resetEntityModes()
})

describe('NoteEntity — mode memory (R2)', () => {
  it('seeded per-type default while loading: the page renders tabbed before the mode read returns', async () => {
    let release: () => void = () => {}
    readGate = new Promise((res) => (release = res))
    store.set('entity_mode:note:n1', 'merged')
    const r = render(ui())
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    expect(merged(r)).toBe(false) // the note default (tabbed) while loading
    expect(r.getByRole('tab', { name: 'Note' }).getAttribute('aria-selected')).toBe('true')
    release()
    await waitFor(() => expect(merged(r)).toBe(true)) // the remembered mode once the read returns
  })

  it('a stored merged row → merged once loaded; another note without a row → its default', async () => {
    store.set('entity_mode:note:n1', 'merged')
    const r = render(ui())
    await waitFor(() => expect(merged(r)).toBe(true))
    await go(r, 'n2')
    expect(merged(r)).toBe(false)
  })

  it('a toggle while the read is in flight wins — and survives navigating away and back (R-4)', async () => {
    let release: () => void = () => {}
    readGate = new Promise((res) => (release = res))
    store.set('entity_mode:note:n1', 'tabbed') // the row the in-flight read already snapshotted
    const r = render(ui())
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    fireEvent.click(r.getByRole('button', { name: 'Merged' }))
    expect(merged(r)).toBe(true)
    release()
    await settle()
    expect(merged(r)).toBe(true)
    await go(r, 'n2')
    await go(r, 'n1')
    expect(merged(r)).toBe(true)
    expect(qc.getQueryData<Record<string, string>>(['app_state', 'entity_mode'])?.['entity_mode:note:n1']).toBe('merged')
    expect(writes).toEqual([['entity_mode:note:n1', 'merged']])
  })

  it('a failed read keeps the default: exactly one read, no toast, no re-read on navigation (BR-R2-4)', async () => {
    failRead = true
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = render(ui())
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    await settle()
    expect(merged(r)).toBe(false)
    expect(reads).toBe(1)
    expect(notifySpy).not.toHaveBeenCalled()
    await go(r, 'n2')
    await settle()
    expect(reads).toBe(1)
    errors.mockRestore()
  })

  it('a toggle writes entity_mode:note:<id> once — under StrictMode too; a mere open writes nothing (BR-R2-6)', async () => {
    const r = render(ui(true))
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    await settle()
    expect(writes).toEqual([])
    fireEvent.click(r.getByRole('button', { name: 'Merged' }))
    await settle()
    expect(writes).toEqual([['entity_mode:note:n1', 'merged']])
  })

  it('a write failure → one toast; the mode stays merged for the session, also after navigating back', async () => {
    failWrite = true
    const r = render(ui())
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    await settle()
    fireEvent.click(r.getByRole('button', { name: 'Merged' }))
    await settle()
    expect(notifySpy).toHaveBeenCalledTimes(1)
    expect(notifySpy.mock.calls[0]?.[0]).toBe('remember this page’s layout')
    expect(merged(r)).toBe(true)
    await go(r, 'n2')
    await go(r, 'n1')
    expect(merged(r)).toBe(true)
  })

  it('a failed read, then a toggle → one write, no crash, the mode stays (the old ?? {} path)', async () => {
    failRead = true
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = render(ui())
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    await settle()
    fireEvent.click(r.getByRole('button', { name: 'Merged' }))
    await settle()
    expect(writes).toEqual([['entity_mode:note:n1', 'merged']])
    expect(merged(r)).toBe(true)
    errors.mockRestore()
  })

  it('?sample never touches app_state (B5)', async () => {
    window.history.replaceState({}, '', '/notes/1?sample')
    routeId = '1'
    const r = render(ui())
    await waitFor(() => expect(r.getByRole('button', { name: 'Merged' })).not.toBeNull())
    fireEvent.click(r.getByRole('button', { name: 'Merged' }))
    await settle()
    expect(reads).toBe(0)
    expect(writes).toEqual([])
  })
})
