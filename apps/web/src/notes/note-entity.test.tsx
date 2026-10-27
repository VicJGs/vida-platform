// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode, useState } from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { EditorDocument } from '@vida/types'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import { NoteEntityView } from './note-entity'
import { registerOverview } from './overview-registry'

// R1 (BR-R1-7): a write failure the chip shows must NOT also toast — spy the shared toast.
const notifySpy = vi.fn()
vi.mock('../lib/notify-error', () => ({ notifyError: (...a: unknown[]) => notifySpy(...a) }))
import type { NoteEntityData } from './use-note-entity'

// The editor body persists content via the composition root (useNoteContent); mock it (no write in these tests).
const writeSpy = vi.fn<(id: string, d: EditorDocument) => Promise<unknown>>(async () => undefined)
vi.mock('../db/composition-root', () => ({
  getServices: () => Promise.resolve({ notes: { writePageContent: (id: string, d: EditorDocument) => writeSpy(id, d) } }),
}))

// The editor is a probe that records each mount's seed (DEV-R0-1 facet-switch tests); it renders a marker.
const seeds: Array<{
  seed: EditorDocument | undefined
  onChange?: (d: EditorDocument) => void
  onInvalidContent?: (e: Error) => void
}> = []
vi.mock('@vida/editor', () => ({
  VidaEditor: (p: {
    defaultValue?: EditorDocument
    onChange?: (d: EditorDocument) => void
    onInvalidContent?: (e: Error) => void
    'aria-label'?: string
  }) => {
    seeds.push({ seed: p.defaultValue, onChange: p.onChange, onInvalidContent: p.onInvalidContent })
    return <div data-testid="editor-probe" aria-label={p['aria-label']} />
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
  it.each(['task_note', 'task_group_note', 'milestone_note', 'deliverable_note'] as const)(
    'EC-15 / EC-4 — a %s page offers the editor and leads with the Note tab (page gate, NP-10)',
    (type) => {
      const { getByRole, getByTestId } = renderUI(<NoteEntityView page={{ ...notePage, id: `p-${type}`, type }} />)
      expect(getByRole('tab', { name: 'Note' }).getAttribute('aria-selected')).toBe('true')
      expect(getByTestId('editor-probe')).not.toBeNull()
    },
  )

  it('E-3 — an untitled task_note is named "Task note" (H1 + editor accname), never empty', () => {
    const { getByText, getByTestId } = renderUI(<NoteEntityView page={{ ...notePage, id: 't9', type: 'task_note', title: '' }} />)
    expect(getByText('Task note')).not.toBeNull()
    expect(getByTestId('editor-probe').getAttribute('aria-label')).toBe('Task note editor')
  })

  it('EC-19 — merged mode on a task_note renders the Overview sections above the editor', () => {
    const { getByRole, getByText, getByTestId } = renderUI(<NoteEntityView page={{ ...notePage, id: 't8', type: 'task_note' }} />)
    fireEvent.click(getByRole('button', { name: 'Merged' }))
    const attachments = getByText('Attachments')
    const editor = getByTestId('editor-probe')
    expect(attachments.compareDocumentPosition(editor) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('EC-34 / BR-R1-5 — ONE save status ("Saved on this device") in the title row, tabbed AND merged; it survives Overview', () => {
    const { getAllByText, getByRole } = renderUI(<NoteEntityView page={{ ...notePage, id: 's1' }} />)
    expect(getAllByText('Saved on this device')).toHaveLength(1)
    fireEvent.click(getByRole('tab', { name: 'Overview' })) // the editor body unmounts; the chip stays
    expect(getAllByText('Saved on this device')).toHaveLength(1)
    fireEvent.click(getByRole('button', { name: 'Merged' }))
    expect(getAllByText('Saved on this device')).toHaveLength(1)
  })

  it('A5 — tabbed: an edit flushed by switching to Overview fails → the chip reads "Couldn\'t save on this device", no toast', async () => {
    seeds.length = 0
    notifySpy.mockReset()
    writeSpy.mockRejectedValueOnce(new Error('disk busy'))
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { getByRole, findByText } = renderUI(<NoteEntityView page={{ ...notePage, id: 'a5' }} />)
    const edited: EditorDocument = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x' }] }] }
    const echo: EditorDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
    act(() => seeds.at(-1)?.onChange?.(echo)) // a blank page: the first emit is the mount echo, adopted (BR-NEU-5)
    act(() => seeds.at(-1)?.onChange?.(edited)) // the real edit, pending
    fireEvent.click(getByRole('tab', { name: 'Overview' })) // the body unmounts → its flush writes → rejects
    expect(await findByText("Couldn't save on this device")).not.toBeNull()
    expect(notifySpy).not.toHaveBeenCalled() // the chip observes the page → one announcement, no toast
    errSpy.mockRestore()
  })

  it('BR-R1-6 — no ⋯ in R1 (no items yet → no dead affordance)', () => {
    const { queryByRole } = renderUI(<NoteEntityView page={{ ...notePage, id: 's2' }} />)
    expect(queryByRole('button', { name: 'Page actions' })).toBeNull()
  })

  it('EC-33 + BR-R1-5 — a malformed page shows the notice and NO save chip', () => {
    const { queryByText, getByText } = renderUI(
      <NoteEntityView page={{ ...notePage, id: 's3', contentStatus: 'malformed', rawContent: '{"type":"doc"}' }} />,
    )
    expect(getByText('This page can’t be opened for editing')).not.toBeNull()
    expect(queryByText('Saved on this device')).toBeNull()
  })

  it('EC-33 + BR-R1-5 — the editor rejecting the doc after mount hides the chip', () => {
    seeds.length = 0
    const { queryByText, getByText } = renderUI(<NoteEntityView page={{ ...notePage, id: 's4' }} />)
    expect(getByText('Saved on this device')).not.toBeNull()
    act(() => seeds.at(-1)?.onInvalidContent?.(new Error('unknown node')))
    expect(queryByText('Saved on this device')).toBeNull()
  })

  it('IR-R13 / BR-R1-3 — a registered Overview with hooks is mounted as a component (stable across merged ⇄ tabbed)', () => {
    function HookedOverview({ page }: { page: NoteEntityData; mode: 'merged' | 'tabbed' }) {
      const [n] = useState(() => 1)
      return <div data-testid="hooked-overview">{`${page.id}:${n}`}</div>
    }
    registerOverview('task_group_note', HookedOverview)
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    const page: NoteEntityData = { ...notePage, id: 'g1', type: 'task_group_note' }
    const { getByRole, getByTestId } = renderUI(<NoteEntityView page={page} />)
    fireEvent.click(getByRole('tab', { name: 'Overview' }))
    expect(getByTestId('hooked-overview').textContent).toBe('g1:1')
    fireEvent.click(getByRole('button', { name: 'Merged' }))
    expect(getByTestId('hooked-overview').textContent).toBe('g1:1')
    expect(errors.mock.calls.filter((c) => /hook/i.test(String(c[0])))).toEqual([])
    errors.mockRestore()
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
