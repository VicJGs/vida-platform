# Intake: Notes & Pages
<!-- /documentation Phase 1 (Intake). Harvest from 3 sources → gap map. No-Guessing: every claim cited. -->
Context: features/notes-and-pages (Wave 0 — the integration hub, in-degree 14)
Sources: v2 (ADR-002 §5.2 + @vida/types/note.ts + docs/core/architecture) · v1 (life-os src/features/notes) · user intent (gap map)
Session: 2026-06-10 · documentation-blueprint

## A. WHAT EXISTS — v2 (current, authoritative)
**Data model — 6 tables** `[FACT: ADR-002 §5.2; @vida/types/note.ts]`:
- `pages` — `type` ∈ {journal, note, task_note, task_group_note, milestone_note, deliverable_note}; `title`[E], `content`[E] (TipTap JSON, Yjs-synced), `parent_id` (deliverable→milestone), `entity_type`/`entity_id`, `journal_date` (unique per date), `is_favorite`, `is_archived`, `icon`, `cover_image`[E], `summary_config`[E] (JournalSummaryConfig), `has_pomodoro`, `word_count`, soft-delete + `_sync_*`.
- `page_links` — wiki-style bidirectional (source/target page + `context`[E]).
- `entity_links` — cross-domain backlinks; `entity_type` ∈ **33 targets** (task…achievement) + `context`[E].
- `tags` + `page_tags` — shared tags w/ color.
- `note_attachments` — encrypted blob + thumbnail.
- `pomodoro_sessions` — focus timer linked to page/entity.
**Architecture** `[FACT: docs/core/architecture + architecture.md(legacy)]`: TipTap block editor; platform blocks (`/summary`,`/tasks`,`/events`,`/habits`,`/timeline`,`/chart`,`/pomodoro`,`/entity-link`,`/backlink`,…); journal `/summary` auto-aggregates from Habits/Tasks/Routines/Learning/Finance/Relationships; `[[wiki-links]]` + bidirectional backlinks; neural graph (Sigma.js); views Calendar/List/Gallery + Neural; FTS5 search rebuilt on vault unlock.
**JournalSummaryConfig** `[FACT: note.ts]`: showHabits/showTasks/showStudySessions/showTransactions/showInteractions.

## B. WHAT v1 DID — life-os (legacy, for intent + lessons)
`[FACT: life-os src/types/notes.ts + src/features/notes/*]`
- Entities: `Page` (id, **slug**, title, content JSON, **content_text**, **is_journal** bool, journal_date, is_favorite, icon, cover_image), `PageLink` (wiki), `NoteTag`+`PageTag`, `EntityLink` (**only 6** entity types: task/project/contact/habit/course/book; **no context/position**).
- Features shipped: notes CRUD, TipTap editor (`NoteEditor`), `[[wiki-links]]` resolved by **slug** (`parseLinks`, `WikiLinkExtension/Suggestions`), tags (`TagExtension`, `TagPage`), **templated** daily journal (`journalTemplate.ts`, `DailyJournalPage/Widget`), backlinks panel, knowledge graph (`KnowledgeGraph`, force-directed), views: list (`NotesPage`), detail, tag, graph, daily-journal.
- v1 notes was relatively clean (3 commits, low churn) — not a major failure site.

### Key v1→v2 deltas (what changed, and why it matters for the spec)
1. v1 `is_journal` boolean → v2 **`type` discriminator (6 types)** — v2 adds task/group/milestone/deliverable notes (entity-attached pages). `[INTERP from schemas]`
2. v1 **slug-based** `[[wiki-links]]` → v2 has **no `slug`** (page_links by id). **HOW v2 resolves `[[title]]`→page is unspecified.** ← gap.
3. v1 `content_text` mirror for search → v2 uses **FTS5** (rebuilt on unlock) + `word_count`. 
4. v1 EntityLink **6 types, no context** → v2 **33 types + `context`[E]**.
5. v1 **templated** journal → v2 **auto-aggregating `/summary` block** (JournalSummaryConfig). 
6. v2 adds (no v1 equiv): encryption[E], sync (`_sync_*`/Yjs), `parent_id` hierarchy, `is_archived`, `has_pomodoro`, `pomodoro_sessions`, `note_attachments`, custom platform blocks, neural graph via Sigma (v1 used force-graph), Calendar/Gallery views.

## C. GAP MAP — genuine unknowns (need Victor's intent; not answerable from sources)
G1 — **MVP scope**: which of the 6 page types + which platform blocks are Wave-0 MVP vs deferred?
G2 — **Wiki-link resolution** (v2 dropped slug): how does `[[title]]` resolve to a page — title match, a picker, create-on-miss?
G3 — **Views per type**: confirm the view set per page type (Calendar/List/Gallery/Neural) — v1 had list/detail/graph/journal/tag (no calendar/gallery).
G4 — **Auto vs manual note creation**: for task_note/milestone_note/etc. — auto-created with the entity (opt-out) or on-demand?
G5 — **Daily summary**: are the 5 JournalSummaryConfig sections the full set, default-on, and user-toggleable per journal?
G6 — **Entity-link UX**: how is an entity link created (`/entity-link` block? `[[` picker?) and does the backlinks panel show page_links + entity_links together?
G7 — **Templates**: does v2 want note/journal templates (v1 had a journal template)?
G8 — **v1 pain to fix**: anything about v1's notes you specifically want done differently in v2?

## Resolution
[awaiting Victor's answers — fill, then Transform into the 6 aspect docs]

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-10 | documentation-blueprint | intake harvested (v2 + v1); gap map G1–G8 raised |
