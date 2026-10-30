<!-- Intake — books · /documentation Phase 1 · 2026-07-03 · REFRAMED same day (Victor): Learning sub-context → OWN MODULE
     Renamed learning-books.md → books.md 2026-07-05 (critique item 4, extraction consistency) -->

# Intake — Books  (level: Feature / OWN MODULE — reframed from "Learning sub-context 2/5")

> ⚠⚠ **SCOPE REFRAME (Victor, 2026-07-03)** — v1 Books was "the worst version ever — not even solid on the
> points it was supposed to deliver." Books is **a Module itself, not a Learning sub-extension**, with a
> **partition of its Universe serving Learning** (the Tasks pattern: Tasks↔Projects, Tasks↔Education → now
> **Books↔Education**). See §Reframe below; the original G-series gap map is SUPERSEDED by the B-series.

## Current (enforced reality — authoritative source)

**Schema (designed):** `[FACT: ADR-002 L2409-2439, L2445-2469]`
- `books`: `title`/`author`/`isbn` **[E]** · `format` (`physical|ebook|audiobook`) · `status`
  (`want_to_read|reading|completed|dropped`) · `total_pages` · `current_page` · `progress` (0–100) ·
  `start_date`/`end_date` (YYYY-MM-DD) · `rating` (1–5) · `review` **[E]** · `cover_url` **[E]** ·
  `genre` **[E]** · `tags` **[E]** JSON · soft delete · full `_sync_*`.
- `book_chapters`: `book_id` (CASCADE) · `title` **[E]** · `chapter_number`
  (`UNIQUE(book_id, chapter_number)`) · `start_page`/`end_page` · `estimated_reading_minutes` /
  `actual_reading_minutes` · `is_completed`/`completed_at` · `sort_order`. **No soft delete** (child rows).

**Types:** `Book` + `BookChapter` mirror the schema 1:1. `[FACT: learning.ts L131-171; enums L17-19]`

**Implementation state:** Drizzle tables EXIST (`schema.ts L641-674`); `@vida/core` `models/learning.ts` = **0
lines**, `services/study-planner.ts` = **0 lines** — no book business logic anywhere. `[FACT: wc -l]`

**Cross-context touchpoints (FACT, all inbound — other tables point AT books):**
- Knowledge: `study_topics.linked_book_id` + `reading_chapter_id` + `reading_start_page`/`reading_end_page`;
  topics importable from TOC. `[FACT: ADR-002 L2559-2561, L2586-2587]`
- Study Sessions: `study_sessions.resource_type='book'` + `pages_read`. `[FACT: L2526-2534]`
- Planner: `scheduled_study_sessions.resource_type='book'` + `chapter_id` + `start_page`/`end_page`.
  `[FACT: L2826-2841]`
- Flashcards: `flashcard_decks.resource_type='book'`. `[FACT: L2631]`
- Notes: `entity_links` accepts `'book'` AND `'book_chapter'`; `pages.entity_type` is free TEXT →
  notes-per-book and notes-per-chapter via the polymorphic `pages` pattern. `[FACT: L1342-1346]`
- **No book↔subject junction exists** — `books` has no course/subject FK and `courses` has no book FK.
  `[FACT: schema grep]`

**CLAUDE.md §7 intent (platform spec):** registration · TOC · progress tracking · **bookmarks** · notes per
book · standalone page with TOC/progress/bookmarks/notes/**URL-or-PDF link to access the book** · **All Books
page** across classes · **book↔class link/unlink with automatic feed of book info to class (reverse on
removal)** · auto-record books from syllabus · auto-linking TOC chapters ↔ class schedule.

## Existing docs incorporated (D5b)
- `docs/features/learning/README.md` (umbrella): Books = `books` + `book_chapters`; **Education is the hub** —
  siblings documented against Education's contract.
- `docs/features/learning/education/contract.md`: lists "Books (book↔subject linking)" as a sibling reading
  Education's contract; identity.md excludes book content from Education scope. No contradiction with code.
- No aspect docs exist yet for Books itself (old empty scaffolds were deleted 07-03). Incorporation beyond the
  umbrella = no-op.

## Legacy (life-os v1 — context only, never decision)
- v1 `Book` was MUCH richer `[FACT: ../life-os/src/types/learning.ts L76-112]`: `publisher` ·
  `publication_year` · **audiobook** `total_duration_minutes`/`current_position_minutes` ·
  `target_completion_date` · `favorite_quotes[]` · `category` (alongside genre) · `skill_ids[]` /
  `purpose_ids[]` · `goodreads_url`/`amazon_url` · `notes` · `summary` · `key_takeaways[]` · `metadata`.
- v1 `BookChapter` had `description` + `notes` fields (v2 dropped both). `[FACT: bookChaptersApi.ts L4-21]`
- **Book↔course link was a `metadata.linked_courses` JSON-array hack** — no junction, no integrity, no reverse
  lookup. `[FACT: BookDetailPage.tsx L89-92]` Classic v1 failure pattern (unenforced relationship).
- v1 BookDetailPage: notes section · TOC-topics section (`BookTopicsSection`) · link-skill modal (via
  `skill_resources` reverse lookup) · link-course modal · reading-progress modal · BookshelfView.
- `TopicImportSource` included `'toc'` — TOC chapters imported as study topics. `[FACT: v1 learning.ts L288]`
- No bookmark entity existed in v1 either.

## SCOPE REFRAME (Victor, 2026-07-03) — the intended module `[INTENT — verbatim-derived]`
1. **Own module, own Universe.** All reading — learning AND enjoyment. A partition serves Learning
   (Books↔Education), mirroring Tasks↔Projects / Tasks↔Education. Not a sub-extension.
2. **Purpose = reading PLAN + reading EXPERIENCE**, consolidating scattered formats: physical, PDF, EPUB,
   audiobook, braille, other digital forms.
3. **In-app reading environment** (safe, distraction-free): read/listen to owned digital files inside the
   platform. Cross-format integrations: PDF/EPUB → text-to-speech (file becomes an audiobook, progress
   recorded) and the reverse (audiobook position ↔ page position). While reading/listening: **highlights** ·
   **bookmarks** · **quotes** · **notes attached to bookmarks/quotes** (capture the idea/epiphany) ·
   **inter-links between bookmarks/quotes themselves**.
4. **Physical books = manual companion:** reading sessions (time tracking), manual bookmarks/quotes,
   daily/weekly page quotas — comfortable, distraction-free.
5. **TOC is a first-class Books feature** (works without owning the file) and is NOT the syllabus — v1
   conflated them because both tried to integrate reading with the schedule. Syllabus = Education; TOC = Books.
6. **Adaptive quota planner:** target = finish chapter / N chapters / N pages by a date, weekday, or
   day-of-month → daily quotas distributed over free time; **recalculates on missed quotas** (day/week/month),
   reshapes, helps make up. (Enhancement expected ~Wave 4.)
7. **Academic pacing via the Education partition:** reads `subject_schedules` + assessment dates so the
   student paces AHEAD of classes/quizzes/presentations/assessments.

## GAP MAP — B-series (post-reframe; G-series superseded 2026-07-03, same day)

<details><summary>Superseded G-series (pre-reframe, for the record)</summary>
G1 scope · G2 subject link · G3 bookmarks · G4 access link · G5 v1 field restore · G6 chapter depth ·
G7 progress semantics · G8 syllabus auto-record · G9 views · G10 reading goals · G11 boundaries · G12 quotes.
Answered by the reframe: G1 (ALL reading), G3/G12 (first-class entities + notes + inter-links), G4 (in-app
reader, not a link), G10 (adaptive quota planner). The rest re-shaped into the B-series below.
</details>

- [x] **B1 — Placement mechanics — CONFIRMED:** docs at `docs/features/books/`, own manifest row (Skills-
      extraction precedent); Learning umbrella → 4 sub-contexts + pointer to Books.
- [x] **B2 — Formats & copies model — CONFIRMED:** `book` = the WORK + per-format ASSET/copy rows, each with
      its own position; unified progress rolls up at book level. Formats: physical · pdf · epub · audiobook ·
      braille · other. PDF is first-class ("the main one these days" — Victor).
- [x] **B3 — Reader & files under ZK — RESOLVED:** encrypted attachments via R2 pipeline (ADR-003); in-app
      reader/player = CORE on all 3 platforms. Planned integrations (TTS, conversions) PERMITTED **with their
      own governing principle** (Books-scoped instance of the extension-model principle — candidate addition
      alongside the Projects-surfaced constitution amendment).
- [x] **B4 — Cross-format position mapping — RESOLVED: AUTOMATIC, not manual.** Mechanism: transcription +
      matching chapter/page information near the stopped timestamp against the TOC (TOC anchors). "Complex but
      doable — more comfort"; manual calibration would break Books being the SOLE tool/alternative. Depends on
      the B3 integration layer (transcription) → ⚠ INTENDED, extension-governed.
- [x] **B5 — Annotation model — CONFIRMED:** three first-class entities — highlight (span in digital content) ·
      bookmark (position marker) · quote (extracted text; manual for physical). Notes attach to bookmarks +
      quotes via the `pages` polymorphic pattern. Inter-links bookmark↔quote: `entity_links` extended with the
      new entity types `[INTERP — mechanism; amendment needed either way]`.
- [x] **B6 — Plan engine vs Study Planner — RESOLVED (initial framing was wrong):** the **Books Plan Engine**
      is solely for a book or multiple books, driven by the user's READING needs — lives entirely in the Books
      Universe (quotas, recalc). The **Study Planner** is a different entity at a different altitude: it plans
      study sessions from the WHOLE work intake of current subjects (books-to-read-by-deadline, homework,
      assessments, schedules) reconciled with external appointments + free time from the FULL calendar (Tasks
      + other modules) — "a turning point in the organization of study life." Planner CONSUMES Books plans/
      deadlines as one input; it never owns reading plans. (Forward dep: global Calendar surface.)
- [x] **B7 — Education partition surface — CONFIRMED, ⚠ INTENDED-IMMATURE:** `book_subjects` junction +
      Books→Education API — Education reads books-per-subject + pace-status vs next class/assessment; Books
      reads `subject_schedules` + assessment dates. Proceed, but flagged not fully mature (Education H9
      precedent: documented now, perfected later).
- [x] **B8 — TOC — RESOLVED:** entry = manual OR ISBN/metadata-lookup integration; **both are deliverables**.
      The lookup runs under the extension governing principle: the user owns the leak risk, the OS provides
      the safety net for a responsible, safe integration. Usable pre-ownership.
      `[INTERP: chapter model stays flat book_chapters until said otherwise — nested-sections question was
      not explicitly answered]`
- [x] **B9 — Quota planner — RESOLVED (as INTENT; ship-scoping is NOT this phase's job — Victor):** the Quota
      Planner is the Books end of a larger system: the **Calendar entity** unites all OS information; in it
      the user RESERVES SLOTS (preset in **Routines**) for specific activities/actions, enabling automatic
      reconciliation. Books' Quota Planner handles its side: goals set MANUALLY or AUTOMATICALLY (calculated
      to finish the book by the target goal; user can set finish dates). Forward deps: Calendar entity (also
      surfaced by Relationships G1) + Routines slot presets (orchestration layer — consistent with the
      Routines re-sequencing rationale).
- [x] **B10 — Sessions — RESOLVED: MODE-ADAPTIVE.** The session's capture depends on how the user reads:
      **manual** (physical) → time, pages read, and it tries to present where the user stopped / is at;
      **audiobook / pdf / epub** → granular position + statistics (also available in manual mode). Plus
      **page-photo capture**: the user photographs the page being read (optional, "better experience") and
      the OS extracts clearer position info and tracks progress closely — on-device capture under the B3
      governing principle. `[INTERP: own Books entity (reading session), not study_session reuse — follows
      B6 Universe framing; Study Planner consumes it. To verify in Phase 3.]`
- [x] **B11 — Book metadata fields — RESOLVED (long-term homes, not columns):**
      · **publisher + genre + category → the TAGS system** on the Books entity — grouping/visualization
        elements (ties into the shared-tags scoping refinement surfaced by Relationships G10).
      · **skill/purpose links → owned by Skills and Purposes respectively**, not by Books — flagged as a
        forward dependency for those modules' documentation; Books exposes itself as a linkable target only.
      · **external URLs → dropped**; the ISBN/metadata-lookup integration IS the middle ground between
        external and internal information — while the user keeps the personalization choice, with the safety
        rule (B3/B8 governing principle) stamped on it.
      · **summary + key_takeaways → notes elements (`pages`)**, each pivoting to a DEDICATED UI per type
        (grouping/viewing experience + personalization within it) — not structured columns.
      · **target_completion_date → kept alive inside the Quota Planner goal** (B9 circumstances), not on the
        book row. `[Note: publication_year not mentioned by Victor — stays dropped unless resurfaced.]`
- [x] **B12 — Views & pages — APPROVED 2026-07-05 (double /critique gate: REVISE→fixed→SHIP):**
      **A. Module surfaces:** Reading Hub (currently-reading, today's quotas w/ on-pace|behind|ahead, resume→
      Reader at last mapped position, recent bookmarks/quotes, statistics, plan alerts w/ recalc proposals) ·
      Bookshelf/All Books (gallery|list|table, tags grouping, status shelves, format filter, TOC-only entries
      first-class) · All Plans + per-plan page (health list; quota distribution, sequenced/parallel, missed-
      quota recalc, target projection, Calendar reconciliation VISIBLY STUBBED) · All Quotes library (group by
      book/tag, search, inter-links, embed locations).
      **B. Book standalone Hub (tabs):** Overview (+link-to-subject affordance when unlinked) · TOC/Chapters ·
      Copies/Assets · Annotations (bookmarks+highlights, work-anchored) · Quotes · Summary · Key Takeaways ·
      Notes · Sessions & Statistics (incl. each session's page-photos — per-book face of the visual journal) ·
      Plan · Education (own tab, appears when ≥1 subject linked).
      **C. Experience surfaces:** the Reader — ONE surface, three modes (read · listen incl. TTS-converted ·
      annotate live in all modes), auto-session tracking, cross-format position indicator, "not synced yet"
      shows native position (never guesses) · Physical companion mode (timer, page entry, photo capture →
      session + daily Journal, manual bookmark/quote, quota ring, end-of-session summary).
      **D. Wizards/system:** Add Book (manual | ISBN lookup + safety-consent step) · Plan wizard (books →
      sequenced|parallel → manual|auto goal) · Conflict prompts in context.
      **E. Preferences & render points:** quote-embed toggles (per-book overrides global), conflict rule,
      reader/companion defaults; renders in Journal `/summary` (quotas) + daily Journal (page-photos = visual
      reading journal) + quote-embed block in all Notes/Pages + Subject Hub (books-per-subject/pace) + Study
      Planner (consumes plans/sessions) + Calendar (forward dep).
      **Rules:** defaults always ship (anti-lost) · sparse renders gracefully · immature = mature core with
      visible stubs. Non-blocking build-phase flags: mobile Reader rides hybrid WebView (ADR-001); companion-
      mode nav entry points = design-phase detail.
- [x] **B13 — Highlights vs quotes — RESOLVED (distinct natures):** highlights stay exactly what the name
      says (span markers in digital content — deliberately lighter: no notes/inter-links). **Quotes are a
      different thing**: words that TALKED with the reader and stand out. Stored per book; linkable; usable
      in notes — the book's own notes/summary AND any other note: a **personalizable quote-embed field in the
      whole Notes/Pages system** ("use quotes from Books" in the editor), toggleable **per book** and
      **globally** (Preferences). Forward dep: editor integration block + preference surface.
- [x] **B14 — Annotation anchoring — RESOLVED: WORK-LEVEL.** Annotations are normalized via the cross-format
      mapping and visible from every asset — "the mapping should interchange information and also the user's
      daily life" (a bookmark made at audiobook minute 52 appears on the mapped PDF page).
- [x] **B15 — Multi-book plan — RESOLVED: USER-ARRANGED.** The user chooses per plan between the two modes:
      sequenced (finish A then B) or parallel (quota split across books).
- [x] **B16(a) — Data clashes — RESOLVED: ASK BY DEFAULT, RULE IF SET.** Any position/progress clash between
      sources (assets, photo capture) is surfaced to the user by default; the user MAY set a resolution rule —
      a chosen source of truth, "last one valid", or "photo valid" — and then resolution follows that rule
      automatically. (Applies to unified progress rollup; per-book/global preference surface.)
- [x] **B16(b) — Page-photo fate — RESOLVED: STORED, a VISUAL READING JOURNAL** — encrypted, and **part of
      the Journal of the day** (the Notes & Journals daily dashboard aggregates it). New cross-module render
      point: reading photos flow into the daily Journal.
- [x] **B10-confirm — Session entity — CONFIRMED: Books' own entity** (reading session), not
      `study_session` reuse. Study Planner consumes it.

## Transform obligations (recorded by /critique 07-05 — Phase 2 may not skip)
1. Identity aspect MUST carry an explicit **"what Books is NOT"** list (constitution rule 1): not the
   syllabus · not the Study Planner · not a Learning sub-extension · not a social/community reading app ·
   not a store.
2. Business rules MUST define the **"mapping not synced yet" degraded state** — cross-format sync is
   automatic (B4) but transcription may be pending/failed: show native position + explicit "not synced"
   state; NEVER silently guess a mapped position (fail-loudly, rule 5).
3. **Braille** asset = physical-like manual position semantics `[INTERP — confirm on any Victor pass]`.
4. Pre-Calendar **auto-goal = arithmetic over days-until-target** (mature core); Calendar-slot
   reconciliation renders visibly stubbed (B9 forward dep).
5. **Quote-embed toggle precedence:** per-book setting overrides global `[INTERP]`.
6. B12 either/or DECIDED (pending Victor amendment): Education = its own Hub tab, shown when ≥1 subject
   linked; unlinked books show a "link to subject" affordance in Overview.

## Status
- [x] intake "whole" — 2026-07-05: B1–B16 all resolved (incl. B16(b) + B10-confirm reopened by /critique);
      B12 approved under double /critique gate. Zero blocking open questions.
- [x] context was not `ambiguous` in Phase 0 — no prose-role resolution needed
