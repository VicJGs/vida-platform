<!-- Structure & Data — features/notes-and-pages · /documentation Phase 2 · sources: ADR-002 §5.2 · note.ts · ADR-003 · REPO.md -->

# Structure & Data — Notes & Pages  (level: Feature)

## Data model — 6 owned tables `[FACT: ADR-002 §5.2 L1266-1458; note.ts]`

| Table | Purpose | Encrypted `[E]` fields | Key constraints |
|---|---|---|---|
| `pages` | the polymorphic page (6 `type` values) | `title`, `content`, `cover_image`, `summary_config` | `type` CHECK (6); partial UNIQUE `journal_date` where `type='journal'`; `parent_id`→pages SET NULL |
| `page_links` | wiki-style bidirectional page↔page | `context` | `UNIQUE(source_page_id, target_page_id)`; both FKs CASCADE |
| `entity_links` | page→entity cross-domain backlink | `context` | `entity_type` CHECK (33); `UNIQUE(page_id, entity_type, entity_id)`; `page_id` CASCADE |
| `tags` + `page_tags` | shared tags with color | `tags.name` (UNIQUE) | `page_tags` PK `(page_id, tag_id)`, both CASCADE |
| `note_attachments` | encrypted file blobs + thumbnail | `filename`, `encrypted_blob`, `thumbnail_blob` | `page_id` CASCADE |
| `pomodoro_sessions` ⚠ re-homes to **Sessions realm** (reframe 2026-07-15) | focus timer — becomes the `focus`-sub-type runtime keyed by `session_id` | — (all structural/numeric) | v2: `page_id`→pages SET NULL; `entity_type` CHECK (5) — both superseded at build (`session_id` FK). `[[../pomodoro/structure-data]]` |

- Every table carries the standard sync metadata (`_sync_id` UNIQUE, `_sync_version`, `_sync_device_id`, `_sync_lww_ts`, `_sync_status`, `_sync_hash`) and soft-delete where applicable. `[FACT: ADR-002 §5.2; CLAUDE.md Conventions]`
- `pages.content` is the only Yjs-CRDT-synced column; all other columns sync via LWW. `[FACT: ADR-003; note.ts L91]`
- **Indexes** `[FACT: ADR-002 L1305-1309, L1333, L1367, L1426, L1456-1457]`: `idx_pages_{type,journal_date,entity,deleted}`, `idx_pages_journal_unique` (partial), `idx_page_links_target`, `idx_entity_links_entity`, `idx_attachments_page`, `idx_pomodoro_{page,entity}`.
- **Full-text search**: `fts_pages` FTS5 virtual table, rebuilt on vault unlock (content is encrypted at rest, so the index is local + ephemeral). `[FACT: ADR-002 L3641 CREATE VIRTUAL TABLE fts_pages; ADR-002 §FTS5]`

## State management map `[INTERP: ADR-001 state decision — modules not yet coded]`
- **React Query (v5)** owns DB-derived async state: page lists, a single page, backlinks, summary results, search results — keyed by `(type|id|entity|journal_date)`; invalidated on local writes. `[FACT: ADR-001 State; REPO.md]`
- **Zustand** owns ephemeral client UI state: active page id, editor selection/focus, open view (calendar/list/gallery/neural), pomodoro timer tick, `[[`-picker open state. `[FACT: ADR-001 State]`
- Editor document state is held by **TipTap/ProseMirror + Yjs doc**, not Zustand — the CRDT is the source of truth for `content`. `[FACT: ADR-003; ADR-001 Editor]`

## Page / route map `[FACT: REPO.md apps; CLAUDE.md §8 views]`
- Per-page routes: journal → `journal/[date]`, any page → `note/[id]` (mobile confirmed: `app/journal/[date].tsx`, `app/note/[id].tsx`).
- Collection views: List · Gallery · Calendar · Neural Graph. View availability by type `[INTENT G3]`: **Journal** → Calendar · List · Gallery; **Note** → List · Gallery · Neural. Entity-attached notes (`task_note`, …) are reached from their parent entity's page, not a standalone collection. `[INTERP: NP-8 + CLAUDE.md]`

## Dependencies / graph
- **In-degree 14** — the hub; 14 modules link into it. **Out-degree (structural): 0** — foundational, documented first per fill order. `[FACT: docs/core/architecture/module-dependency-graph.md; docs/README.md fill order]`
- Read-only consumption of other modules for `/summary` and the NP-8 seed flows through documented integration points, not FK ownership (see contract.md). Respects the coupling budget — no direct cross-module table access (constitution §6). `[FACT: core business-rules §6]`

## Single source of truth (constitution §3)
- `PageType` (6), `EntityLinkTarget` (33), `PomodoroType`/`PomodoroStatus`/`PomodoroEntityType`, `JournalSummaryConfig` — declared **once** in `@vida/types/note.ts`; SQL CHECK mirrors them; canonical Zod validators live in `@vida/core`. Never re-declared per app. `[FACT: note.ts; packages/types/src/CLAUDE.md; CLAUDE.md Conventions]`

## ADRs / structural decisions
- **ADR-002 §5.2** — the data model above (authoritative). **ADR-003** — Yjs CRDT for `content`, LWW for structured columns. **ADR-001** — TipTap editor, Zustand+React Query state, Sigma.js neural graph.
- ⚠ **Surfaced decision (G5):** expanding `JournalSummaryConfig` from 5 → the full personalizable section set is a type/schema change — candidate for `/adr-new` in Phase 4. `[INTENT G5]`

## Completion checklist
- [x] data model (6 tables) · [x] dep graph (within budget) · [x] state + route map · [x] ADRs · [x] single source per cross-cutting concern · [x] [FACT/INTERP/INTENT] on each claim
