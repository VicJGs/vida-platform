// @vitest-environment jsdom
// ============================================================================
// notes-rescope R0 · DEV-R0-1 — the B-53 handover regression (test a). A route swap RENDERS the incoming body before
// the outgoing body's unmount flush runs, so the incoming editor must seed from the latest-body overlay written by
// `save()` — not from the (stale) cached page. Real NoteEditorBody, the editor mocked to a probe that records its seed.
// StrictMode. Both hosts mount the SAME NoteEditorBody, so one swap covers note page → Home and Home → note page alike;
// the two real directions (warm + cold reverse) are proven live (PLAN-R0 §4 D, r0-live run 3: 18/18).
// ============================================================================
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StrictMode, useState } from 'react'
import { act, cleanup, render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { UIProvider } from '@vida/ui'
import type { EditorDocument } from '@vida/types'
import type { NoteEntityData } from './use-note-entity'
import { __resetBodyWrites } from './body-writes'

const writeSpy = vi.fn<(id: string, doc: EditorDocument) => Promise<unknown>>()
vi.mock('../db/composition-root', () => ({
  getServices: () =>
    Promise.resolve({ notes: { writePageContent: (id: string, d: EditorDocument) => writeSpy(id, d) } }),
}))

interface Probe {
  label: string
  seed: EditorDocument | undefined
  onChange?: (d: EditorDocument) => void
}
const probes: Probe[] = []
vi.mock('@vida/editor', () => ({
  VidaEditor: (p: { 'aria-label': string; defaultValue?: EditorDocument; onChange?: (d: EditorDocument) => void }) => {
    probes.push({ label: p['aria-label'], seed: p.defaultValue, onChange: p.onChange })
    return null
  },
  toMarkdown: () => '',
}))

import { NoteEditorBody } from './note-editor-body'

const text = (t: string): EditorDocument => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: t }] }],
})
const OLD = text('OLD')
const NEW = text('NEW')

// One journal page, two hosts that both carry the STALE cached copy (content OLD) — exactly what the warm cache holds.
const stale: NoteEntityData = {
  id: 'j1',
  type: 'journal',
  title: 'today',
  content: OLD,
  contentStatus: 'ok',
  rawContent: JSON.stringify(OLD),
  favorite: false,
  archived: false,
  updated: 'now',
  journalDate: '2026-10-26',
  icon: null,
  cover: null,
}

function Swap({ onReady }: { onReady: (go: () => void) => void }) {
  const [host, setHost] = useState<'a' | 'b'>('a')
  onReady(() => setHost('b'))
  return host === 'a' ? <NoteEditorBody key="a" page={stale} /> : <NoteEditorBody key="b" page={stale} />
}

function mount() {
  let go!: () => void
  const qc = new QueryClient()
  render(
    <StrictMode>
      <QueryClientProvider client={qc}>
        <UIProvider>
          <Swap onReady={(g) => (go = g)} />
        </UIProvider>
      </QueryClientProvider>
    </StrictMode>,
  )
  return () => go()
}

beforeEach(() => {
  probes.length = 0
  __resetBodyWrites()
  writeSpy.mockReset()
  writeSpy.mockImplementation(() => new Promise(() => {})) // writes stay in flight — the worst case
})
afterEach(cleanup)

describe('B-53 handover (one body, two hosts)', () => {
  it('the incoming editor seeds the NEW body at its first render, and never writes the stale one', async () => {
    const swap = mount()
    const writer = probes.at(-1)!
    act(() => {
      writer.onChange?.(OLD) // mount echo (deduped)
      writer.onChange?.(NEW) // a real edit, still inside the 500 ms debounce
    })
    const before = probes.length
    act(() => swap()) // one commit: render incoming, then unmount outgoing (its flush)
    const incoming = probes.slice(before)
    expect(incoming.length).toBeGreaterThan(0)
    expect(incoming.every((p) => JSON.stringify(p.seed) === JSON.stringify(NEW))).toBe(true)
    // The incoming editor's echo + a later edit: never the stale body.
    act(() => incoming.at(-1)!.onChange?.(text('NEW + more')))
    await act(async () => {
      await new Promise((r) => setTimeout(r, 700))
    })
    expect(writeSpy.mock.calls.some(([, d]) => JSON.stringify(d) === JSON.stringify(OLD))).toBe(false)
    expect(writeSpy).toHaveBeenLastCalledWith('j1', text('NEW + more'))
  })
})
