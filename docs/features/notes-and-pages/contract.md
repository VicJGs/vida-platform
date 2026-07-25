<!-- Contract — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · note.ts · docs/core/architecture/module-dependency-graph.md -->

# Contract — Notes & Pages  (level: Feature)

> **Status:** the 17 modules are not implemented in code yet — they live in ADR-002 schema + `@vida/types`. This contract is the **designed service interface** harvested from the data model and types, NOT yet-shipped code. `[FACT: docs/README.md manifest Notes]` Each signature below is the intended shape; treat as ⚠ INTENDED until `@vida/core` services exist.

## Exposed surface
Notes & Pages is the **hub (in-degree 14)** — the most-consumed feature. It exposes, via `@vida/core` services, a typed page/link/tag/attachment API operating on its owned tables. `[FACT: module-dependency-graph.md; ADR-002 §5.2]` (⚠ The 6th v2 table, `pomodoro_sessions`, **re-homes to the Sessions realm** — reframe 2026-07-15; the Pomodoro entry below becomes a session-lens. `[[../pomodoro/contract]]`)

- **Page CRUD & queries** (returning `Page` `[FACT: note.ts L87-108]`):
  - `getPage(id)` · `createPage(type, …)` · `updatePage(id, patch)` · `softDeletePage(id)`
  - `getPagesByType(type)` · `getPageByJournalDate(date)` (NP-2 unique) · `getPagesForEntity(entity_type, entity_id)` (the polymorphic note lookup, ADR-002 L95) · `listPages({favorite,archived,tag})`
- **Linking** (`PageLink`, `EntityLink` `[FACT: note.ts L110-127]`):
  - `createPageLink(source, target, context?)` · `createEntityLink(page_id, entity_type, entity_id, context?)`
  - `getBacklinks(entity_type, entity_id)` → merged `page_links` + `entity_links` (G6, tentative)
  - `resolveWikiLink(text)` → candidate pages for the `[[` picker; create-on-miss path (G2)
- **Tags** (⚠ **[INTENT — ADR-006 SP1]:** tagging is the **universal `entity_tags`** primitive; N&P is a **consumer**, not the owner of a page-only junction). The surface becomes tag-a-tag-an-*entity*: `upsertTag(name, color, parent_tag_id?, icon?, description?)` (SP3 nestable) · `tagEntity(entity_type, entity_id, tag_id)` · `getEntitiesByTag(tag_id)` — the retired page-only `tagPage`/`getPagesByTag`/`PageTag` are superseded. `[INTENT: ADR-006 §3.1-3.2]`
- **Attachments** (`NoteAttachment`): `addAttachment(page_id, file)` · `getAttachments(page_id)`
- **Pomodoro** (⚠ reframed 2026-07-15 — a **widget-lens**, not an owned entity): the `/pomodoro` block calls `listFocusEnabledSessions(scope)` and launches a **`focus_sessions`** timer (the `focus` extension of the `sessions` supertype, ADR-004 §3.1) via the Sessions realm; a page links its analytics to that `session_id`. The v2 `startSession/endSession/getSessionsForPage` API is superseded. `[INTENT: ADR-004 §3.1]` `[[../pomodoro/contract]]`
- **Summary aggregation** (the `/summary` block): `buildJournalSummary(date, config)` → reads the enabled sections (see "consumes" below). `[FACT: note.ts JournalSummaryConfig; CLAUDE.md §8 /summary]`

## What it consumes (outside dependencies)
The hub depends on **nothing structurally** (it is Wave-0 foundational), but two capabilities pull **read-only** data from other modules through documented integration points — never direct cross-module table access (constitution §6):

- **`/summary` aggregation** reads dated data from: Habits, Tasks, Routines, Learning (study sessions / class schedule), Finance (transactions), Relationships (interactions, reminders, events), Check-ins, Purpose & Goals, Gamification, Pomodoro. `[FACT: CLAUDE.md §8 daily summary; INTENT G5]`
- **Entity-note seed (NP-8)** reads the parent entity's own local fields to generate the non-blank summary client-side. `[INTENT G4]`
- **Entity links** may point at any **registered** entity type (read-only reference; the link stores `entity_type`+`entity_id` only). **[INTENT — ADR-006 SP2:** the target type is drawn from the **open taggable-type registry**, not the fixed 33-value `EntityLinkTarget` enum (As-is).`]` `[FACT (As-is): note.ts EntityLinkTarget; ADR-002 L1342-1351]` `[INTENT: ADR-006 §3.2]`

## Contract error cases
- `createPage(type='journal', date)` when a journal exists for `date` → typed `JournalExistsError` (NP-2), never overwrite. `[INTERP: NP-2]`
- `createEntityLink` with an **unregistered** `entity_type` → typed `UnregisteredEntityTypeError` (NP-6). **[INTENT — ADR-006:** validated against the open registry; the As-is form rejected via the 33-value CHECK (`InvalidEntityTypeError`).`]` `[INTENT: ADR-006 §3.2]`
- Duplicate `page_link`/`entity_link` → idempotent no-op or typed `DuplicateLinkError` (UNIQUE) (NP-5). `[FACT: ADR-002 UNIQUE]`
- A `/summary` source unavailable → that section returns a typed empty/error result; the call still succeeds for the rest (fail loud, scoped). `[INTENT G5]`

## Completion checklist
- [x] exposed + consumed surface · [x] types/errors cited · [x] integration via documented points (no direct table access) · [x] [FACT] on each claim · [x] not-yet-coded status flagged
