// services/notes — barrel (mod-notes-and-pages ①)
export { createNotesService } from './service'
export {
  JournalExistsError,
  UnregisteredEntityTypeError,
  type CreatePageInput,
  type NotesService,
  type NotesServiceDeps,
  type UpdatePageInput,
} from './types'
