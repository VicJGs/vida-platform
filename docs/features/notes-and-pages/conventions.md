<!-- Conventions — features/notes-and-pages · /documentation Phase 2 · sources: CLAUDE.md Conventions · ADR-002/003/006/008/009 · note.ts · intake · ui-3 e4-slash-menu -->
<!-- Restored 2026-10-26 (notes-rescope LIF-245, Documentation Gate) from eaf64f8^ and realigned. Companion backing doc
     (no current-* equivalent). -->

# Conventions — Notes & Pages  (level: Feature)

## How to build here
- **Notes are always pages.** Attach a note to any entity with a `pages` row (`entity_type`/`entity_id`) via
  `ensureEntityNote` — never an inline `notes` column (NP-1).
- **Body vs metadata.** The editor body goes through `writePageContent` (debounced, deduped against the loaded doc so
  mere open never writes); title/favorite/archive/icon/cover go through `updatePage` (NP-4, NP-11).
- **Integration blocks are capability-registry entries** (ADR-008), rendered as `@vida/editor` node-views; an inline
  instance lives inside the page document. Document the block at the components level. `[FACT: ADR-008 §3.1, L120-124]`
- **Wiki-links via a suggestion surface, stored by id.** Typing `[[` opens the picker at the caret; selection inserts
  the inline link and writes a `page_links` row by `target_page_id`; no match offers "+ Create" (create-on-miss →
  `note`); hovering a link shows the preview card. `[FACT: fe-notes PLAN-s4-wikilink-picker.md:132 (F-S4-1); INTENT G2]`
  Built as an `@vida/editor` `@tiptap/suggestion` extension like the `/` menu, not a plain input rule
  `[INTERP: docs/specs/features/ui-3-vida-editor/e4-slash-menu.md:31 "a separate suggestion surface"]`.
- **Templates = live blocks + user-defined** (NP-12); capture never takes accumulated data — the page-doc rule is open (NP-12).
- **Entity-note seed is client-side** (NP-8, ZK-1).
- **Summary degrades per section** (G5); the engine is Journals.
- **Honest local-first UI.** No fake spinners for local writes; M1 save/sync state = `saved` / `error`
  ("saved on this device"); synced/pending/offline/conflict arrive with the sync engine (M4, MVP-PATH.md:34).
  `[FACT: frontend-quality-bar:81-84; decisions.md:289]`
- **Dates are the user's local day.** Build `YYYY-MM-DD` from local calendar fields, never `toISOString().slice(0,10)`.
  `[FACT: settled rule — timezone = the user's location; apps/web/src/home/use-journal-entry.ts:28-33 (todayLocalYmd)]`
- **Hooks are live over `getServices()`** with structured keys, invalidate + re-read; `?sample` fixtures are DEV-only
  for the Visual Gate. `[FACT: golive-replan process.md ELC-4]`

## Naming & layout
- Page kinds = the 6 `PAGE_TYPE` literals; entity attachment uses string `entity_type` + `entity_id`.
- Platform conventions: UUIDv7 TEXT PKs, Unix-ms timestamps, 0/1 booleans, JSON as TEXT, `YYYY-MM-DD` dates, soft
  delete via `deleted_at`, `_sync_*` metadata, `[E]` markers. `[FACT: CLAUDE.md Conventions]`
- Enums: string-literal unions in `@vida/types`, SQL CHECK + Zod in `@vida/core`.

## Local landmines / "never do"
- **Never** add an inline rich-text notes column to another table (NP-1).
- **Never** own a page-only tag junction — tags are the universal `entity_tags` (ADR-006).
- **Never** validate `entity_type` against a fixed enum — use the open registry (NP-6).
- **Never** gate the page editor on `ENTITY_TYPES` — page surfaces gate on page type (NP-10).
- **Never** resolve `[[links]]` by title string (NP-7).
- **Never** create a second journal for a date (NP-2).
- **Never** generate the NP-8 seed or any summary server-side (ZK-1).
- **Never** write `pages.content` through the LWW `updatePage` patch (NP-4).
- **Never** capture accumulated runtime data (journal text, logs) into a template (ADR-009 §3.4; page-doc boundary open, NP-12).
- **Never** hard-delete without the explicit irreversible confirm; user deletes are undoable (NP-9).
- **Never** spec the extra `JournalSummaryConfig` sections as shipped (G5).

## Completion checklist
- [x] patterns in use · [x] naming & layout · [x] landmines · [x] [FACT/INTENT] on each claim
