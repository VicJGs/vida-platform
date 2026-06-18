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

## Resolution `[INTENT: Victor, 2026-06-18]`

> **SCOPE REFRAME:** this is the **complete v1** (the v2 rebuild's first full release), **NOT an MVP**.
> Nothing is deferred. Every page type, every platform block, every summary section is in scope. `[G1]`

**G1 — Scope (full, nothing cut).**
- All **6 page types** in scope: `journal` · `note` · `task_note` · `task_group_note` · `milestone_note` · `deliverable_note`.
- All **12 platform blocks** in scope: `/summary` `/tasks` `/events` `/classes` `/habits` `/timeline` `/chart` `/pomodoro` `/entity-link` `/backlink` `/class-notes` `/milestone` (+ all standard blocks).

**G2 — Wiki-link resolution = picker + create-on-miss (Option B+C).**
- Typing `[[` opens an **autocomplete picker** listing pages as you type; selecting one stores the link by **`target_page_id`** (not by text) → survives renames, no title-ambiguity.
- **Create-on-miss**: picker shows a "+ Create '<typed text>'" entry; choosing it creates a stub `note` page and links to it.

**G3 — Views per type (confirmed).** Journal → Calendar · List · Gallery. Note → List · Gallery · Neural.

**G4 — Entity notes: auto-created (eager) + non-blank seed.**
- `task_note` / `task_group_note` / `milestone_note` / `deliverable_note` are **auto-created with their parent entity** (eager — the page row exists the moment the task/group/milestone/deliverable is created).
- When still unfilled, the system **seeds a short auto-generated summary** describing the entity, so the note is **never blank**.
- **CONSTITUTION CONSTRAINT** `[inherits ZK-* business rules]`: the seed is generated **client-side, deterministically from the entity's own local fields** (title, type, status, dates) — the server never sees it. Any AI-assisted phrasing must run **on-device**; no plaintext leaves the device. (Pin this in business-rules.)

**G5 — Daily summary = full personalization.**
- **All** summary sections are available (the full menu — Habits · Tasks · Routines · Study sessions · Transactions · Interactions · Class schedule · Reminders · Events · Check-in · Goals/Targets · Pomodoro · Gamification); the user **chooses which to show**, **per journal** (toggleable).
- ⚠ **FLAGGED DELTA (rule 8 — spec must not outrun code):** `@vida/types/note.ts` `JournalSummaryConfig` defines only **5** flags today (`showHabits/showTasks/showStudySessions/showTransactions/showInteractions`). The spec records the **intended** full set; expanding the type to the full menu is a **build-phase change + candidate ADR**, NOT current enforced reality. Aspect docs must label the extra sections **INTENDED**, not shipped.

**G6 — Entity-link UX (TENTATIVE — Victor: "leave it open, may change at implementation").**
- Creation via the **`/entity-link` block** and also the **`[[` picker** (both paths list entities alongside pages).
- Backlinks panel = **merged unified list** (page_links + entity_links shown together, grouped by source).
- Marked **tentative**; revisit once implemented and seen in use.

**G7 — Templates = live + user-defined ("the magic of the journal template").**
- A template is a **reusable, user-saved layout** (Option C) that **contains live auto-aggregating blocks** (Option B) — e.g. a journal template holds a live `/summary` + `/tasks` block, not frozen text.
- Applies to **journals and notes**. The template defines arrangement; the live blocks re-aggregate on every open.

**G8 — v1 pain.** None to address now (v1 notes was clean — 3 commits, low churn). Left as-is.

### Intake status: ✅ WHOLE (all gaps resolved or explicitly logged). Open carry-forwards:
1. **G5 type expansion** — `JournalSummaryConfig` 5 → full menu (build-phase + ADR candidate).
2. **G6** — entity-link UX held tentative pending implementation.

## Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-06-10 | documentation-blueprint | intake harvested (v2 + v1); gap map G1–G8 raised |
| 2026-06-18 | documentation-blueprint | gaps resolved (Victor); scope reframed MVP→full v1; G5 type-delta + G6 tentative flagged; intake marked WHOLE |
