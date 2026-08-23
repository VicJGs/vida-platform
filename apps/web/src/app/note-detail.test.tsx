// @vitest-environment jsdom
// MOD-notes ②c — the note-detail authoring surface. State branches (EM-9), the editable title (EM-6), and the
// editor/save wiring. VidaEditor + the service are stubbed (jsdom can't mount ProseMirror faithfully / pull @vida/core).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { UIProvider } from '@vida/ui'

const { useParams, usePage, updateMutate, useUpdatePage } = vi.hoisted(() => {
  const updateMutate = vi.fn()
  return {
    useParams: vi.fn(() => ({ id: 'p1' })),
    usePage: vi.fn(),
    updateMutate,
    useUpdatePage: vi.fn(() => ({ mutate: updateMutate, isPending: false, isError: false })),
  }
})
vi.mock('@tanstack/react-router', () => ({ useParams }))
vi.mock('./notes/hooks', () => ({ usePage, useUpdatePage }))
vi.mock('../services/notes-service', () => ({ getNotesService: vi.fn() }))
vi.mock('@vida/editor', () => ({
  VidaEditor: (props: { 'aria-labelledby'?: string }) => (
    <div data-testid="editor" aria-labelledby={props['aria-labelledby']} />
  ),
  assertEditorDocument: (j: unknown) => j,
}))

import NoteDetailRoute from './note-detail'

afterEach(() => cleanup())
beforeEach(() => vi.clearAllMocks())

function ui() {
  return render(
    <UIProvider>
      <NoteDetailRoute />
    </UIProvider>,
  )
}

describe('NoteDetailRoute — load states (EM-9)', () => {
  it('loading → a loading affordance, no editor', async () => {
    usePage.mockReturnValue({ data: undefined, state: 'loading' })
    ui()
    expect(await screen.findByText('Loading…')).toBeTruthy()
    expect(screen.queryByTestId('editor')).toBeNull()
  })

  it('a MISSING id → "empty" → "Note not found." (NOT an editor, NOT an error)', async () => {
    usePage.mockReturnValue({ data: null, state: 'empty' })
    ui()
    expect(await screen.findByText('Note not found.')).toBeTruthy()
    expect(screen.queryByTestId('editor')).toBeNull()
  })

  it('error → a message, no editor', async () => {
    usePage.mockReturnValue({ data: undefined, state: 'error' })
    ui()
    expect(await screen.findByText(/Couldn’t load/)).toBeTruthy()
    expect(screen.queryByTestId('editor')).toBeNull()
  })
})

describe('NoteDetailRoute — success surface', () => {
  const page = { id: 'p1', title: 'My note' as string | null, type: 'note', content: null }

  it('mounts the editor labelled by the title, seeded, with a save indicator', async () => {
    usePage.mockReturnValue({ data: page, state: 'success' })
    ui()
    const editor = await screen.findByTestId('editor')
    const title = screen.getByLabelText('Page title') as HTMLInputElement
    expect(title.value).toBe('My note')
    // EM-5: the editor's accessible name points at the title control.
    expect(editor.getAttribute('aria-labelledby')).toBe(title.getAttribute('id'))
    expect(screen.getByText('Saved')).toBeTruthy()
  })

  it('renaming the title persists via updatePage on blur (EM-6)', async () => {
    usePage.mockReturnValue({ data: page, state: 'success' })
    ui()
    const title = await screen.findByLabelText('Page title')
    fireEvent.change(title, { target: { value: 'Renamed' } })
    fireEvent.blur(title)
    expect(updateMutate).toHaveBeenCalledWith({ id: 'p1', patch: { title: 'Renamed' } })
  })
})
