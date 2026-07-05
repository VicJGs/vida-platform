<!-- Structure & Data — features/books · /documentation Phase 2 · sources: ADR-002 §Books · learning.ts · schema.ts · docs/intake/books.md -->

# Structure & Data — Books  (level: Feature / own module)

## Data model — FACT base: 2 tables `[FACT: ADR-002 L2409-2469; schema.ts L641-674; learning.ts L131-171]`

| Table | Purpose | `[E]` fields | Key constraints |
|---|---|---|---|
| `books` | the work (today: work+copy merged) | title, author, isbn, review, cover_url, genre, tags | `format` CHECK(3); `status` CHECK(4); `progress` 0-100; `rating` 1-5; soft delete |
| `book_chapters` | flat TOC | title | `book_id` CASCADE; **UNIQUE(book_id, chapter_number)**; est/actual reading minutes; `is_completed`; no soft delete |

- ⚠ Three FACT columns are **superseded by the reframe** (reconcile in the amendment): `books.format` (single →
  per-asset), `books.current_page`/`progress` (single position → derived from assets, BK-3), `books.genre`/
  `tags` (columns → shared scoped tags, BK-16). `[INTENT B2/B11]`

### ⚠ INTENDED model (module extraction — 2nd-largest ADR-002 amendment after Education) `[INTENT: B1–B16]`
| New entity | Role | Key points |
|---|---|---|
| `book_assets` | per-format copies | 0..n per book; format ∈ {physical, pdf, epub, audiobook, braille, other}; digital → encrypted file ref (R2) + native position (page · location · timestamp); physical/braille → manual position (BK-2) |
| mapping/anchor data | cross-format sync | transcription + TOC-anchor matches per asset-pair; states: synced · pending · failed (BK-4); design pass required |
| `book_bookmarks` | position markers | work-anchored (BK-5); label; notes via `pages`; inter-links (BK-6) |
| `book_highlights` | light span markers | digital content spans; deliberately no notes/inter-links (BK-6) |
| `book_quotes` | first-class quotes | per book; text `[E]`; position?; notes via `pages`; inter-links; embeddable platform-wide under toggles (BK-7) |
| `reading_sessions` | Books' own entity | mode-adaptive capture (BK-10); time, pages/position delta, statistics; photo attachments (encrypted → daily Journal) |
| `reading_plans` (+ plan↔books) | the Quota Planner | arrangement sequenced\|parallel (BK-11); goal manual\|auto; target date·weekday·day-of-month; quota distribution + recalculation state; holds target_completion_date (B11) |
| `book_subjects` | Education partition junction | many-to-many; replaces v1's `metadata.linked_courses` hack (BK-13) |
| conflict/resolution state | BK-8 | pending clashes + preset rule (rule itself lives in Preferences) |

- ⚠ Cross-cutting at build: `entity_links` gains annotation entity types; quote-embed block in `@vida/editor`;
  `pages` targets for bookmark/quote notes; Preferences keys (toggles, conflict rule, reader defaults).

## State management map `[FACT: ADR-001 State]`
- **React Query** owns work/asset/TOC/annotation/plan/session reads + optimistic writes; **derived** unified
  progress (invalidate on any asset-position/session write); quota computations + projections; conflict queue.
- **Zustand** owns ephemeral UI: reader state (mode, open asset, playback), companion session draft (timer,
  photo queue), hub tab + view/grouping per surface, plan-wizard draft.
- Unified progress, pace-status, and quota state are **derived** (BK-3/BK-11/BK-13) — never hand-maintained.

## Page / route map `[INTENT B12 — approved 2026-07-05, double-critique gate]`
- **Reading Hub** — currently-reading, today's quotas (on-pace|behind|ahead), resume→Reader, recent
  bookmarks/quotes, statistics, plan alerts (recalc proposals).
- **Bookshelf / All Books** — gallery|list|table; tags grouping; status shelves; format filter; TOC-only
  entries first-class.
- **All Plans + per-plan** — health list; distribution, arrangement, recalculation, projection; Calendar
  reconciliation stubbed.
- **All Quotes library** — group by book/tag, search, inter-links, embed locations.
- **Book Hub (tabs):** Overview (+link-to-subject affordance) · TOC/Chapters · Copies/Assets · Annotations ·
  Quotes · Summary · Key Takeaways · Notes · Sessions & Statistics (incl. page-photos) · Plan · Education
  (appears when ≥1 subject linked; ⚠ immature).
- **The Reader** — one surface, three modes (read · listen incl. TTS-converted · annotate live); position
  indicator + "not synced yet" state. ⚠ Mobile rides the hybrid WebView pattern. `[FACT: ADR-001 mobile]`
- **Physical companion mode** — timer, page entry, photo capture, manual bookmark/quote, quota ring,
  end-of-session summary.
- **Wizards:** Add Book (manual | lookup + consent step) · Plan (books → arrangement → goal) · conflict
  prompts in context.

## Dependencies / graph
- **Own module (extracted from Learning 2026-07-03).** In-edges: Knowledge (topic↔book/chapter `[FACT:
  L2559-2561]`), Flashcards (decks `[FACT: L2631]`), Study Planner (consumes plans/sessions), daily Journal
  (quotas + photos), Education Subject Hub (partition), Calendar *(forward dep)*, Skills/Purposes *(theirs)*.
  Out-edges: Notes/pages + entity_links, shared tags, R2 attachments, Preferences, Education contract
  (schedules/assessments via partition), extension layer (BK-14). No direct cross-module table reads (§6).

## Single source of truth (constitution §3)
- **Native position:** each asset owns exactly one; **unified progress** derives (BK-3) — the conflict rule
  (BK-8) arbitrates, never a second stored truth.
- **Quotes:** stored once per book; every embed references (BK-7) — never copied text.
- **Targets/pace:** live in the plan (BK-11), not on the book row.
- **TOC:** one flat chapter list per book (BK-9); mapping anchors point at it, never duplicate it.
- **Homework-style pattern:** pace-status derives from Education's schedule data via the partition — never a
  cached copy of Education rows (BK-13).
- Enums as string-literal unions + CHECK + Zod, declared once. `[FACT: learning.ts; conventions]`

## ADRs / structural decisions
- **ADR-002 §Books** — FACT base. **ADR-001** — RQ+Zustand, R2, hybrid mobile editor/reader. **ADR-003** —
  LWW + attachment pipeline.
- ⚠ **Surfaced:** (1) the Books entity-family amendment (assets, annotations ×3, sessions, plans, junction,
  mapping — 2nd-largest yet); (2) **cross-format mapping design pass** (transcription/TOC anchors); (3) the
  **Books governing principle** → joins the extension-model constitution amendment; (4) quote-embed block
  spec (Notes & Pages side). `[INTENT]`

## Completion checklist
- [x] data model (FACT 2 + INTENDED family) · [x] dep graph (own module) · [x] state + route map · [x] ADRs · [x] single source per concern · [x] [FACT/INTENT/INTERP] each claim
