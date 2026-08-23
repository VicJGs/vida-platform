// Notes command-bar provider — MOD-notes ②b (LIF-131). The documented creation
// surface: modules contribute action commands at M1.1+ via the CommandProvider
// seam (command-bar-and-search.md:51). This is NOT a bespoke route button.
//
// ⚠ EAGER-BUNDLE DISCIPLINE (BR-7): this module is imported by the always-mounted
// shell (command-bar.tsx), so it must NOT statically pull the heavy notes-service /
// @vida/core graph. Static imports stay light (the key factory, the already-eager
// queryClient + toast); the service is DYNAMIC-imported inside `run`, so it loads
// only when "New note" actually fires.
//
// ⚠ run-contract: `Command.run(ctx)` is SYNCHRONOUS and `ctx` gives only
// `navigate`. So the create is fire-and-forget: createPage → invalidate → navigate;
// .catch → toast. B-1: the invalidation is MANDATORY — a command runs outside React
// (no useCreatePage), so without it the new note is invisible under staleTime 30s.
import { toast } from '@vida/ui'
import { queryClient } from '../../lib/query-client'
import { notesKeys } from './keys'
import type { Command, CommandProvider } from '../../command-bar/types'

const newNoteCommand: Command = {
  id: 'notes:new-note',
  label: 'New note',
  category: 'action',
  keywords: ['create', 'new', 'note', 'page'],
  run: (ctx) => {
    void (async () => {
      try {
        const { getNotesService } = await import('../../services/notes-service')
        const page = await getNotesService().createPage({ type: 'note' })
        // B-1 — invalidate so the new note is visible on return to /notes.
        void queryClient.invalidateQueries({ queryKey: notesKeys.type('note') })
        void queryClient.invalidateQueries({ queryKey: notesKeys.lists() })
        ctx.navigate(`/note/${page.id}`)
      } catch (e) {
        // Log the error too — a toast-only catch (no console) hid a boot-init bug for
        // a whole debug session (docs/specs/fixes/vault-not-initialized-on-boot).
        console.error('[notes:new-note] createPage failed', e)
        toast({ title: 'Could not create note', intent: 'danger' })
      }
    })()
  },
}

export const notesCommandProvider: CommandProvider = {
  id: 'notes',
  getCommands: () => [newNoteCommand],
}
