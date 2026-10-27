// services/notes — barrel (mod-notes-and-pages ①)
export { createNotesService } from './service'
export {
  InvalidPageContentError,
  JournalExistsError,
  PageNotFoundError,
  UnregisteredEntityTypeError,
  type CreatePageInput,
  type EntityNoteSeed,
  type NewAttachment,
  type NotesService,
  type NotesServiceDeps,
  type UpdatePageInput,
} from './types'
