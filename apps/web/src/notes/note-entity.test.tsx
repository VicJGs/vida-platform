// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { EditorDocument } from '@vida/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { NoteEntityView } from './note-entity'
import type { NoteEntityData } from './use-note-entity'

// The editor body persists content via the composition root (useNoteContent); mock it (no write in these tests).
const writeSpy = vi.fn<(id: string, d: EditorDocument) => Promise<unknown>>(async () => undefined)
vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { writePageContent: (id: string, d: EditorDocument) => writeSpy(id, d) } }),
}))

// The editor is a probe that records each mount's seed (DEV-R0-1 facet-switch tests); it renders a marker.
const seeds: Array<{ seed: EditorDocument | undefined; onChange?: (d: EditorDocument) => void }> = []
vi.mock('@vida/editor', () => ({
  VidaEditor: (p: { defaultValue?: EditorDocument; onChange?: (d: EditorDocument) => void }) => {
    seeds.push({ seed: p.defaultValue, onChange: p.onChange })
    return <div data-testid="editor-probe" />
  },
  toMarkdown: () => '',
}))

afterEach(cleanup)
const renderUI = (ui: React.ReactNode) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <UIProvider>
      <QueryClientProvider client={qc}>{ui}</QueryClientProvider>
    </UIProvider>,
  )
}

const notePage: NoteEntityData = {
  id: '1',
  type: 'note',
  title: 'Project kickoff',
  content: null,
  contentStatus: 'absent',
  rawContent: null,
  favorite: true,
  archived: false,
  updated: '2h ago',
  journalDate: null,
  icon: null,
  cover: null,
}

describe('NoteEntityView (S2 — the note-entity frame)', () => {
  it('renders the EntityView frame with the page title (serif H1)', () => {
    const { getByText } = renderUI(<NoteEntityView page={notePage} />)
    expect(getByText('Project kickoff')).not.toBeNull()
  })

  it('EC-4/EC-5 — a page-able note OFFERS the Editor facet: tabbed default exposes Overview + Note tabs', () => {
    const { getByRole } = renderUI(<NoteEntityView page={notePage} />)
    // Tabs render only when the editor slot is present (offersEditor gate) → proves the Editor facet is offered.
    expect(getByRole('tab', { name: 'Overview' })).not.toBeNull()
    expect(getByRole('tab', { name: 'Note' })).not.toBeNull()
  })

  it('EC-4 — leads with the Editor facet (Note tab selected by default)', () => {
    const { getByRole } = renderUI(<NoteEntityView page={notePage} />)
    expect(getByRole('tab', { name: 'Note' }).getAttribute('aria-selected')).toBe('true')
  })
})

// DEV-R0-1 (b, l) — a tab switch remounts the editor body with the SAME stale `page` prop; within the 500 ms debounce
// the remounted editor must seed from the latest-body overlay. StrictMode (the dev app runs in it).
describe('NoteEntityView — facet remount keeps the unsaved edit (DEV-R0-1)', () => {
  it('type → Overview tab → back to Note within 500 ms → the editor seeds the edit; the next write carries it', async () => {
    seeds.length = 0
    writeSpy.mockClear()
    const OLD: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'OLD' }] }] }
    const NEW: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW' }] }] }
    const page = { ...notePage, id: 'facet-1', content: OLD, contentStatus: 'ok' as const, rawContent: JSON.stringify(OLD) }
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { getByRole } = render(
      <StrictMode>
        <UIProvider>
          <QueryClientProvider client={qc}>
            <NoteEntityView page={page} />
          </QueryClientProvider>
        </UIProvider>
      </StrictMode>,
    )
    act(() => {
      seeds.at(-1)!.onChange?.(OLD) // mount echo
      seeds.at(-1)!.onChange?.(NEW) // unsaved edit
    })
    act(() => {
      fireEvent.click(getByRole('tab', { name: 'Overview' }))
    })
    const before = seeds.length
    act(() => {
      fireEvent.click(getByRole('tab', { name: 'Note' }))
    })
    const remounted = seeds.slice(before)
    expect(remounted.length).toBeGreaterThan(0)
    expect(remounted.every((s) => JSON.stringify(s.seed) === JSON.stringify(NEW))).toBe(true)
    const NEWER: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'NEW!' }] }] }
    act(() => remounted.at(-1)!.onChange?.(NEWER))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })
    expect(writeSpy.mock.calls.some(([, d]) => JSON.stringify(d) === JSON.stringify(OLD))).toBe(false)
    expect(writeSpy).toHaveBeenLastCalledWith('facet-1', NEWER)
  })
})
