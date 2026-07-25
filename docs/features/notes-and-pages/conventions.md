<!-- Conventions — features/notes-and-pages · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002 · note.ts · intake -->

# Conventions — Notes & Pages  (level: Feature)

## How to build here
- **Notes are always pages.** To attach a note to any entity, insert a `pages` row with `entity_type`/`entity_id` — never add an inline `notes` column to that entity's table (NP-1). `[FACT: ADR-002 L91; CLAUDE.md Conventions]`
- **Editor content is TipTap JSON in `pages.content`.** Standard blocks are ProseMirror nodes; the 12 platform blocks (`/summary`, `/tasks`, …) are **custom TipTap extensions in `@vida/editor`** (`extensions/`), with serializers in `@vida/editor/serializers/`. Document the block itself at the components level, not here. `[FACT: REPO.md @vida/editor; CLAUDE.md §8]`
- **Wiki-links via picker, stored by id.** Typing `[[` opens the autocomplete picker; selection writes a `page_links` row by `target_page_id`; a no-match offers "+ Create" (create-on-miss → stub `note`). Never resolve a link by matching title text at render time. `[INTENT G2; FACT: ADR-002 page_links]`
- **Templates = live blocks + user-defined.** A template is a reusable, user-saved page layout that *contains* live auto-aggregating blocks (e.g. a journal template holds a live `/summary`), not frozen text. The live blocks re-aggregate on every open. `[INTENT G7]`
- **Entity-note seed is client-side.** When auto-creating `*_note` pages (NP-8), generate the placeholder summary on-device from the parent entity's local fields; no server round-trip, no plaintext egress (ZK-1). `[INTENT G4; FACT: core business-rules ZK-1]`
- **Summary degrades per section.** Build `/summary` so a missing source renders that section's empty/error state and leaves the rest intact (fail loud, scoped). `[INTENT G5]`

## Naming & layout
- Page kinds are the 6 `pages.type` literal values; entity-attachment uses string `entity_type` + `entity_id`. `[FACT: note.ts PageType]`
- Platform-wide conventions apply: UUIDv7 TEXT PKs (client-generated), Unix-ms INTEGER timestamps, booleans as `0/1`, JSON stored as TEXT, calendar dates as `YYYY-MM-DD`, monetary values in integer cents, soft delete via `deleted_at`, `_sync_*` on every syncable table, `[E]` comment marking encrypted fields. `[FACT: CLAUDE.md Conventions; docs/core/conventions.md]`
- Enums: string-literal unions in `@vida/types`, SQL CHECK + canonical Zod in `@vida/core` (never TS `enum`). `[FACT: packages/types/src/CLAUDE.md]`

## Local landmines / "never do"
- **Never** add an inline `notes`/`description`-as-rich-text column to another table — route through `pages` (NP-1). `[FACT: ADR-002 L91]`
- **Never** tag through a page-only junction — tagging is the **universal `entity_tags`** primitive (`tag_id, entity_type, entity_id`); N&P is a **consumer**, not the owner of a `page_tags` table. Tags are nestable (`parent_tag_id`). `[INTENT: ADR-006 §3.1-3.2]`
- **Never** validate `entity_links.entity_type` against a fixed CHECK enum — the target type comes from the **open taggable-type registry** (a type must be *registered*), not a hard-coded 33-value list. `[INTENT: ADR-006 §3.2]`
- **Never** resolve `[[links]]` by title string — titles are not unique; use `target_page_id` (NP-7). `[INTENT G2]`
- **Never** create a second journal for an existing date — enforce the partial unique index (NP-2). `[FACT: ADR-002 L1309]`
- **Never** generate the NP-8 seed (or any summary) server-side — it would break zero-knowledge. `[FACT: ZK-1]`
- **Never** write `pages.content` through LWW — it must go through the Yjs doc (NP-4). `[FACT: ADR-003]`
- **Never** spec the extra `JournalSummaryConfig` sections as shipped — they are ⚠ INTENDED until the type expands (G5). `[INTENT G5]`

## Completion checklist
- [x] patterns in use (enforced, not aspiration) · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] on each claim
