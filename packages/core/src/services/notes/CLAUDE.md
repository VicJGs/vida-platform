# services/notes — per-module business logic
# Auto-read by Claude when editing this layer. Structural home stood up in Part 2 (ADR-018).

## What this module is
The pages integration hub — linked pages, entity links, backlinks across every module

## Owning ADR / context
ADR-002 §5.2 (notes-and-pages)

## Pattern
Follows the service data-flow pattern GOVERNED by docs/core/architecture/data-flow.md
(validate -> repository -> encrypt-seam -> return). Rides foundation/ substrates; does not re-implement them.

## Status
**MOD-notes ① BUILT (2026-08-21, LIF-131).** `service.ts` (`createNotesService` factory), `types.ts`
(`NotesService` interface + typed errors), `index.ts` barrel. Pages/page_links/note_attachments CRUD +
wiki-resolve + NP-8 seed + `entity_tags` reads; facade → AR-6 `SpacesService` (entity-link/tag writes) +
AR-8 `BacklinkResolver` (entity-link reads). Returns Drizzle Rows. Zod in `validators/note.ts`. 16 tests green.
NOTE: factory-object service — NO `this.` for intra-service calls (breaks on destructure). Increment ② (UI) pending.
