// MOD-notes ②b — the "New note" command-bar action. The B-1 regression guard:
// the run MUST invalidate the collection keys (else the new note is invisible
// under staleTime 30s), then navigate — and toast on failure.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Hoisted so the vi.mock factories (themselves hoisted) can reference these safely.
const { createPage, invalidateQueries, toast } = vi.hoisted(() => ({
  createPage: vi.fn(),
  invalidateQueries: vi.fn(),
  toast: vi.fn(),
}))

vi.mock('../../services/notes-service', () => ({ getNotesService: () => ({ createPage }) }))
vi.mock('../../lib/query-client', () => ({ queryClient: { invalidateQueries } }))
vi.mock('@vida/ui', () => ({ toast }))

import { notesCommandProvider } from './commands'

function newNoteRun(navigate: (p: string) => void) {
  const cmd = notesCommandProvider.getCommands().find((c) => c.id === 'notes:new-note')
  if (!cmd) throw new Error('New note command missing')
  cmd.run({ navigate })
}

beforeEach(() => vi.clearAllMocks())

describe('notes command provider — "New note"', () => {
  it('exposes a single "New note" action command', () => {
    const cmds = notesCommandProvider.getCommands()
    expect(cmds).toHaveLength(1)
    expect(cmds[0]).toMatchObject({ id: 'notes:new-note', label: 'New note', category: 'action' })
  })

  it('creates a note, invalidates the collection keys (B-1), then navigates', async () => {
    createPage.mockResolvedValue({ id: 'p1', type: 'note' })
    const navigate = vi.fn()

    newNoteRun(navigate)
    await vi.waitFor(() => expect(navigate).toHaveBeenCalled())

    expect(createPage).toHaveBeenCalledWith({ type: 'note' })
    const keys = invalidateQueries.mock.calls.map((c) => c[0]?.queryKey)
    expect(keys).toContainEqual(['notes', 'type', 'note'])
    expect(keys).toContainEqual(['notes', 'list'])
    expect(navigate).toHaveBeenCalledWith('/note/p1')
  })

  it('toasts (does not throw) when creation fails', async () => {
    createPage.mockRejectedValue(new Error('boom'))
    const navigate = vi.fn()

    newNoteRun(navigate)
    await vi.waitFor(() => expect(toast).toHaveBeenCalled())

    expect(navigate).not.toHaveBeenCalled()
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ intent: 'danger' }))
  })
})
