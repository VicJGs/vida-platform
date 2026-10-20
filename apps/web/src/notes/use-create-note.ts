// ============================================================================
// useCreateNote — notes go-live create path (2026-10-20). The write side of the
// live swap: `NotesService.createPage` + invalidate the list key (BR-RT-2/4 —
// invalidate + re-read, NO optimistic; local reads are <10ms).
// ============================================================================
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { PageType } from '@vida/types'
import { getServices } from '../db/composition-root'

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
  const mutation = useMutation({
    mutationFn: async (input: CreateNoteInput) => {
      const { notes } = await getServices()
      return notes.createPage({ type: input.type ?? 'note', title: input.title ?? 'New note' })
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['notes', 'pages'] }) // BR-RT-2: re-read the list
    },
  })
  return { createNote: (input = {}) => mutation.mutate(input), isPending: mutation.isPending }
}
