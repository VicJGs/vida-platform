<!-- Contract — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · note.ts · docs/core/architecture/module-dependency-graph.md -->

# Contract — Notes & Pages  (level: Feature)

> **Status:** the 17 modules are not implemented in code yet — they live in ADR-002 schema + `@vida/types`. This contract is the **designed service interface** harvested from the data model and types, NOT yet-shipped code. `[FACT: docs/README.md manifest Notes]` Each signature below is the intended shape; treat as ⚠ INTENDED until `@vida/core` services exist.

## Exposed surface
Notes & Pages is the **hub (in-degree 14)** — the most-consumed feature. It exposes, via `@vida/core` services, a typed page/link/tag/attachment/pomodoro API operating on the 6 owned tables. `[FACT: module-dependency-graph.md; ADR-002 §5.2]`

- **Page CRUD & queries** (returning `Page` `[FACT: note.ts L87-108]`):
  - `getPage(id)` · `createPage(type, …)` · `updatePage(id, patch)` · `softDeletePage(id)`
  - `getPagesByType(type)` · `getPageByJournalDate(date)` (NP-2 unique) · `getPagesForEntity(entity_type, entity_id)` (the polymorphic note lookup, ADR-002 L95) · `listPages({favorite,archived,tag})`
- **Linking** (`PageLink`, `EntityLink` `[FACT: note.ts L110-127]`):
  - `createPageLink(source, target, context?)` · `createEntityLink(page_id, entity_type, entity_id, context?)`
  - `getBacklinks(entity_type, entity_id)` → merged `page_links` + `entity_links` (G6, tentative)
  - `resolveWikiLink(text)` → candidate pages for the `[[` picker; create-on-miss path (G2)
- **Tags** (`Tag`, `PageTag`): `upsertTag(name,color)` · `tagPage(page_id, tag_id)` · `getPagesByTag(tag_id)`
- **Attachments** (`NoteAttachment`): `addAttachment(page_id, file)` · `getAttachments(page_id)`
- **Pomodoro** (`PomodoroSession`): `startSession(page_id?|entity)` · `endSession(id)` · `getSessionsForPage(page_id)`
- **Summary aggregation** (the `/summary` block): `buildJournalSummary(date, config)` → reads the enabled sections (see "consumes" below). `[FACT: note.ts JournalSummaryConfig; CLAUDE.md §8 /summary]`

## What it consumes (outside dependencies)
The hub depends on **nothing structurally** (it is Wave-0 foundational), but two capabilities pull **read-only** data from other modules through documented integration points — never direct cross-module table access (constitution §6):

- **`/summary` aggregation** reads dated data from: Habits, Tasks, Routines, Learning (study sessions / class schedule), Finance (transactions), Relationships (interactions, reminders, events), Check-ins, Purpose & Goals, Gamification, Pomodoro. `[FACT: CLAUDE.md §8 daily summary; INTENT G5]`
- **Entity-note seed (NP-8)** reads the parent entity's own local fields to generate the non-blank summary client-side. `[INTENT G4]`
- **Entity links** may point at any of the **33 `EntityLinkTarget`** entity types (read-only reference; the link stores `entity_type`+`entity_id` only). `[FACT: note.ts EntityLinkTarget; ADR-002 L1342-1351]`

## Contract error cases
- `createPage(type='journal', date)` when a journal exists for `date` → typed `JournalExistsError` (NP-2), never overwrite. `[INTERP: NP-2]`
- `createEntityLink` with an `entity_type` outside the 33-value set → typed `InvalidEntityTypeError` (CHECK rejects) (NP-6). `[FACT: ADR-002 CHECK]`
- Duplicate `page_link`/`entity_link` → idempotent no-op or typed `DuplicateLinkError` (UNIQUE) (NP-5). `[FACT: ADR-002 UNIQUE]`
- A `/summary` source unavailable → that section returns a typed empty/error result; the call still succeeds for the rest (fail loud, scoped). `[INTENT G5]`

## Completion checklist
- [x] exposed + consumed surface · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT] on each claim · [x] not-yet-coded status flagged
