// ============================================================================
// useCreateNote — notes go-live create path (2026-10-20). The write side of the
// live swap: `NotesService.createPage` + invalidate the list key (BR-RT-2/4 —
// invalidate + re-read, NO optimistic; local reads are <10ms). A failure raises the shared error toast (notes-rescope
// R1, F-7 / BR-R1-7).
// ============================================================================
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { PageType } from '@vida/types'
import { getServices } from '../db/composition-root'
import { notifyError } from '../lib/notify-error'

export interface CreateNoteInput {
  type?: PageType
  title?: string
}

export interface CreateNoteResult {
  createNote: (input?: CreateNoteInput) => void
  isPending: boolean
}

export function useCreateNote(): CreateNoteResult {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const mutation = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const { notes } = await getServices()
      return notes.createPage({ type: input.type ?? 'note', title: input.title ?? 'New note' })
    },
    onSuccess: (page) => {
      void qc.invalidateQueries({ queryKey: ['notes', 'pages'] }) // BR-RT-2: re-read the list
      void navigate({ to: '/notes/$id', params: { id: page.id } }) // BR-NEU-2: create-and-open (in place)
    },
    onError: (e) => notifyError('create the note', e), // one danger toast naming the action (F-7 / B-15, R1)
  })
  return { createNote: (input = {}) => mutation.mutate(input), isPending: mutation.isPending }
}
