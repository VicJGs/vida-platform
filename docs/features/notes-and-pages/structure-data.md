<!-- Structure & Data — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · ADR-003/004/006/007/016 · schema/notes.ts · migrations/033_notes.ts · note.ts -->
<!-- Restored 2026-10-26 (notes-rescope LIF-245, Documentation Gate) from eaf64f8^ and realigned: the FACT floor now
     states the REBUILT schema (033_notes, 3 owned tables, no FKs); the pre-teardown 6-table floor is history
     (git show eaf64f8^:docs/features/notes-and-pages/structure-data.md). -->

# Structure & Data — Notes & Pages (level: Feature)

> **Subject to:** ADR-006 (universal tags + open taggable-type registry) · ADR-004 (sessions) · ADR-007 (views) ·
> ADR-009 (templates) · ADR-002/003 (data model + sync) · ADR-016 (DDL in SQL migrations).

## As-is (FACT floor) — 3 owned tables `[FACT: packages/core/src/db/schema/notes.ts; migrations/033_notes.ts]`

| Table              | Purpose                                | `[E]` fields                                        | Key constraints                                                                                                                                                              |
| ------------------ | -------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pages`            | the polymorphic page (6 `type` values) | `title`, `content`, `cover_image`, `summary_config` | `type` CHECK (6, fixed); partial UNIQUE `journal_date` where `type='journal' AND deleted_at IS NULL`; `entity_type` OPEN (registry, no CHECK); `parent_id` plain TEXT, no FK |
| `page_links`       | page↔page wiki link                    | `context`                                           | `UNIQUE(source_page_id, target_page_id)` (full — revive on re-link)                                                                                                          |
| `note_attachments` | file blobs + thumbnail                 | `filename`, `encrypted_blob`, `thumbnail_blob`      | addressed by `page_id`, no FK                                                                                                                                                |

- **No SQL foreign keys** reference `pages` (cascade is app-layer, NP-9). `[FACT: migrations/033_notes.ts:14]`
- **Consumed, not owned:** `entity_links`, `entity_tags`, `tags` = the AR-6 Spaces substrate (ADR-006 §3.1 — N&P is a
  consumer). `pomodoro_sessions` is retired → Sessions `focus_sessions` (ADR-004 §3.1). `[FACT: NOT header; ADR-006:8]`
- Sync metadata on every table; soft delete via `deleted_at`. `pages.content` is the one column that will merge as a
  Yjs CRDT (M4); everything else LWW. `[FACT: CLAUDE.md Conventions; ADR-003]`
- Notable plain columns: `is_favorite`, `is_archived`, `icon`, `word_count`, `has_pomodoro`, `journal_date`,
  `entity_type`/`entity_id`. `[FACT: schema/notes.ts:42-73]`
- **Full-text search:** FTS5 over decrypted content, rebuilt on unlock — DB-8 (not built). There is no stored plaintext
  mirror (`content_text` was retired). `[FACT: intake:27 (eaf64f8^); NOT-45/50]`

## Derived data (no column)

- **Excerpt** — no column exists `[FACT: ADR-002 L1297-1329]`; derived client-side from the decrypted `content`
  `[INTERP: performance-strategy.md:203 sketches an `extractPlainText` for FTS; no such function exists in code]`. Exact rule
  (length / first block): `[UNKNOWN — homed: the collection-card slice PLAN (notes-rescope)]`.
- **Row date** for date-keyed layouts — `journal_date`, else the **local** calendar day of `updated_at`.
  `[FACT: PLAN-s1:36-37; NP-2 local-day rule]`

## Collection views (ADR-007)

- One Notes collection (`/notes`) — List · Gallery · Neural (EC-1 re-pinned 2026-10-26: journals left `/notes`; `surface-map.md:48`'s
  Calendar is stale). `[FACT: intake G3 :55; fe-notes envision §Re-pins]`
- **Availability by type** `[INTENT G3]`: **Note** → List · Gallery · Neural (no Calendar); **Journal** → Calendar · List · Gallery,
  rendered by the Journals module (journal views, JR-1), not by `/notes`.
  `*_note` pages are reached from their parent entity's page, not as a standalone collection. `[INTERP: NP-8 + CLAUDE.md]`
- `/notes` default = `note` pages, not archived (Archived = a filter predicate); journals are not part of `/notes` — journal
  views (Calendar/List/Gallery) are the Journals module's (JR-1; `intake/journals.md:25-26`). **RESOLVED (delivery/interpretation.md §5 #2).**
- **Field declarations (XCU-14):** calendar needs a date, gallery a cover/image, neural the link graph; a layout whose
  field is absent is **degraded** (declared, non-error), never a crash. The declarations are renderer knowledge
  (RATIFY into the views slice-map). `[FACT: ADR-007 §3.3; xcut-views:27; views interpretation.md:64-74; debt-plan.md:22]`
- Renderer selection by a saved `views` row: ADR-007; default view seed per type = ADR-009 templates → `createView`
  (XCU-06). `[FACT: decisions.md:895]`

## State management map

- **React Query (v5)** owns DB-derived state: page lists `['notes','pages']`, a page `['pages',id]`, journal
  `['journal',date]`, backlinks, summary, search — invalidate + re-read on local writes, no optimistic patch.
  `[FACT: apps/web/src/notes/use-notes-rows.ts:52-64; use-note-entity.ts:129-140; home/use-journal-entry.ts:67;
state-conventions.md:121-127]`
- **Ephemeral UI state** (`useState`/Zustand): picker open, editor focus, active layout.
- **Editor document** is held by TipTap/ProseMirror (Yjs at M4), not Zustand.
- **Mode memory** (merged/tabbed, EC-5): per-type default, remembered per instance, persisted (anything that must
  survive a session lives in SQLite). Convention `readMode`/`persistMode(entityType, entityId)` from
  fe-codec-entity-facet O4. `[FACT: frontend-quality-bar:129; entity-facet seam-contract.md:86-89; data-flow.md:431,466]`
  **RESOLVED (delivery/interpretation.md §5 #3):** storage = `app_state` KV (`entity_mode:<type>:<id>`, device-local); per-type defaults =
  OS constants — `note` = tabbed, editor active (EC-4); `journal` = Home's arrangement (journals-rescope); `*_note` = their
  RIDE owners. Storage needs no new schema (sync OFF in M1). ADR-006 per-instance-memory append owed (Step 5).

## Page / route map

- `/notes` collection · `/notes/$id` any page · Home `/` = today's journal (same editor body). `[FACT: apps/web/src/routes.tsx:76-87;
information-architecture.md:102]`

## Dependencies / graph

- In-degree 14; structural out-degree 0 beyond the Spaces foundation beneath it. `[FACT: module-dependency-graph.md:252;
docs/README.md:36]`

## Single source of truth

- `PAGE_TYPE` (6) + `JournalSummaryConfig` declared once in `@vida/types/note.ts`; SQL CHECK mirrors `PAGE_TYPE`;
  Zod validators in `@vida/core/validators/note.ts`. `entity_type` = the open registry (`_registry.ts`), not a fixed
  enum here. `[FACT: note.ts:23-31,79; _registry.ts]`

## Completion checklist

- [x] FACT floor = the rebuilt schema · [x] consumed vs owned · [x] derived data · [x] per-type views + degraded ·
      [x] state map · [x] UNKNOWNs homed
