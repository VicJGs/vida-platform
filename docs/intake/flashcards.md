# Intake — flashcards  (⭐ REFRAMED 2026-07-12 — a KNOWLEDGE sub-context / study-method SERVICE, not a module)

> ⭐ **REFRAME (Victor 07-12):** Flashcards is NOT its own module and NOT under Learning. It is a **study-method
> service INSIDE Knowledge** — a retention + gathering service the user *invokes* on his knowledge, and the
> **first concrete instance of Knowledge's pluggable study-method framework** (KN-8; future services —
> assessments, self-test, Feynman — INTENDED, not now). Docs live at `docs/features/knowledge/flashcards/`.
> **Consequence:** Learning drops to ONE sub-context (Education). Foundations: Knowledge ✅ (owns the generic
> review engine it plugs into), Sessions & Scheduling ✅ (`review_session` + `dueIn`, ADR-004).
>
> ⭐ **FOUNDATION-FIRST PRINCIPLE (Victor 07-12):** because Knowledge/Sessions are foundations, rigid
> per-feature structures COLLAPSE into generic OS constructs — "keep the seam, retire the instance." Expect
> cascading retirements; they are the vision cohering, not scope-creep. Flashcards is the sharpest case: its
> 3 v2 tables collapse to ONE (the card as reviewable content).

## Current (enforced reality — authoritative source)

Three tables, **schema-only, 0 logic** (`models/learning.ts` wc -l = 0):
- **`flashcard_decks`** `[FACT: ADR-002 L2628-2650]` — `title[E]`, `description[E]`, `resource_type ∈
  {course,book,topic}` + `resource_id` (⚠ polymorphic but **restricted to 3 types** — CLAUDE.md L110 intent
  says "any resource type"), `new_cards_per_day`(20), `reviews_per_day`(100), `is_active`, `total_cards`,
  `mastered_cards`. Type `FlashcardDeck` in **knowledge.ts L106** (moved during Knowledge extraction).
- **`flashcards`** `[FACT: ADR-002 L2656-2688]` — `deck_id` (CASCADE), `front[E]`/`back[E]`/`hint[E]`/
  `explanation[E]`, **hard-coded SM-2** (`easiness_factor` 2.5, `repetitions`, `interval_days`,
  `next_review_date`, `last_reviewed_at`, `times_reviewed`, `times_correct`), `is_mastered`, `is_suspended`.
  Index on `next_review_date WHERE is_suspended=0` (the review queue). Type `Flashcard` knowledge.ts L121.
- **`flashcard_reviews`** `[FACT: ADR-002 L2693-2710]` — per-review log: `flashcard_id` (CASCADE),
  `quality` 0–5, `response_time_ms`, `previous/new_interval`, `previous/new_easiness`, `reviewed_at`. All P.

**Boundaries already fixed by documented foundations:**
- **Knowledge KN-4/KN-8** `[FACT: docs/features/knowledge/*]`: Flashcards = "the **spaced-rep drill method**
  for `memorize`-realm kinds"; it is ONE entry in Knowledge's **pluggable `study_methods` registry**
  (flashcards · Feynman · self-test · …), composable/mixable, bound per level. **Methods & curves are
  pluggable; SM-2 is one preset; mastery is derived** (KN-8). Knowledge **CONSUMES** Flashcards.
- **Sessions & Scheduling / ADR-004** `[FACT: docs/features/sessions-and-scheduling/*]`: a flashcard drill
  runs inside a **`review_session`** sub-type (Flashcards/Knowledge own it); Flashcards is a **`dueIn`
  provider** ("Flashcards SM-2 queue") — it **owns its review queue**, the Scheduler aggregates it (SS-7).
- **Education** `[FACT: education/contract.md L44]`: "Flashcards (decks per subject)" read Education's contract.

## Existing docs incorporated (D5b)
No `.md` documents THIS context yet (manifest ⬜). Incorporation is a no-op. The cross-refs above (Knowledge,
Sessions, Education) constrain this context's contract and are treated as authoritative.

## Legacy (life-os v1 — context only, never a decision)
v1 `Flashcard`/`FlashcardReview` `[FACT: ../life-os/src/types/entities.ts L1250-1297]` were **richer than v2**:
- **Card media:** `front_image_url`, `back_image_url`, `audio_url` + `tags[]` (v2 dropped all).
- **Generation:** `source_note_id` — cards generated FROM a note (v2 dropped).
- `order_index`, `average_quality`; review log had `notes` + full SM-2 snapshot (previous/new easiness/
  interval/repetition). v1 was a single-algorithm (SM-2) Anki-style engine, Learning-scoped.

## GAP MAP (what the code cannot answer — for Victor, one batch)
- [x] **F1 — RESOLVED (Victor 07-12): Knowledge sub-context / study-method SERVICE.** Not own module, not
      Learning. First instance of Knowledge's pluggable study-method framework (KN-8). Role = **retention**
      (drill) + **gathering** (capture info into knowledge). Future method-services INTENDED, not now.
- [x] **F2 — RESOLVED (Victor 07-12): generic pluggable review, NOT hard-coded SM-2.** v1/v2 welded SRS into
      the schema (SM-2 cols on the card + a `flashcard_reviews` table) — violates the OS logic where methods/
      curves are user-organized (KN-5/KN-8). SM-2 becomes ONE **bound preset**; the algorithm is swappable via
      `method_bindings`. → **RETIRE the SM-2 columns on `flashcards`** (Knowledge already decided this).
- [x] **F3 — RESOLVED (Victor 07-12): drill = `review_session`; outcomes = generic `review_events`.** A drill
      runs as a `review_session` (ADR-004) grouping N reviews, but each review is a generic Knowledge
      **`review_event`**, NOT a flashcard-specific row. → **RETIRE the `flashcard_reviews` table.**
- [x] **F4 — RESOLVED (Victor 07-12): Knowledge's engine schedules; Flashcards does NOT.** The due-queue +
      curve are computed by Knowledge's generic engine (`method_binding` + `review_curves`) over reviewables;
      the Scheduler reads **Knowledge's** `dueIn`. Daily caps (`new_cards_per_day`/`reviews_per_day`) move to
      the `method_binding`. Flashcards owns content only.
- [x] **F5 — RESOLVED (Victor 07-12): a "deck" is NOT a fixed entity.** The user designates WHICH entity in his
      own below-Topic hierarchy "is" the deck and what it's composed of (personalization; Knowledge objects/
      containers, `parent_object_id`). → **RETIRE the `flashcard_decks` table**: grouping → user-defined
      Knowledge object; caps → method_binding; resource link → `entity_links`. ⭐ Instance of the FOUNDATION-FIRST
      principle (header). ⚠ OPEN sub-q: does the CARD stay a Flashcards-owned content entity (my read: yes —
      front/back/media is card-specific, registered as a reviewable) or become a Knowledge object of a card-kind?
- [x] **F-SVC — STUDY-METHOD SERVICE FRAMEWORK. RESOLVED + FORMALIZED (Victor 07-12): → ADR-005.** The generic
      SEAM: what a Knowledge study-method service can do + its anatomy + how it lives in Knowledge + how it
      reaches Education & the OS. Flashcards = reference impl; future services (assessments, self-test, Feynman)
      = INTENDED, not now. ⭐ **EXTENSIBLE by design** — roles + integration points are a STARTING set, not
      closed; Victor may extend later (leave space).
      - **Roles** (open-ended): retention/practice · gathering/capture · assessment/measurement · elaboration · …
      - **Anatomy (6 parts):** (1) a **content unit** (the ONLY data it owns — card/item/prompt); (2) a **run
        surface = a Session sub-type** (ADR-004); (3) **registration in Knowledge `study_methods`** + user
        `method_binding` (KN-8); (4) optional **gather/generate** capability (from objects/notes/quotes);
        (5) **emitted signals** → generic `review_events` → derived mastery; (6) ⭐ **universal properties** —
        content units are first-class OS citizens: **universal tag system** · **pages/notes links** (`entity_links`) ·
        attachments. (Victor 07-12.)
      - **Within Knowledge:** rides the generic engine (schedule/curve/review/mastery/grouping all Knowledge's);
        the service brings content + interaction + its universal-property wiring only — never its own
        scheduling/review/deck tables.
      - **Outward:** Education measurement source (mastery/grade/pace, KN-10) · Sessions (run + `dueIn`) ·
        Journal + Gamification (Session effects) · Tags + Notes/Pages (universal) · domain-agnostic (any
        Area/module Knowledge serves). Future integration points may be added (extensible).
- [x] **F6 — RESOLVED (Victor 07-12): the card content unit.** Card = a **Flashcards-owned content entity**
      (F5 sub-q confirmed — stays a content entity, registered as a reviewable). Fields: front/back/hint/
      explanation + **restore v1 media** (image, audio) + **card TYPES** (basic · cloze · reversed ·
      image-occlusion) + **universal tags** + **page/note links** (`entity_links`, F-SVC part 6).
- [x] **F7 — RESOLVED (Victor 07-12): gather capability = central.** Generate cards from Knowledge `definition`
      objects (memorize seeds, KN-4), Book quotes, notes (v1 `source_note_id` → `entity_links` source ref).
      The "gathering" role is first-class alongside retention.
- [x] **F8 — RESOLVED (Victor 07-12): emits `review_events`; Knowledge derives mastery** (KN-10). Flashcards
      never computes mastery (mirrors Sessions G10 / F-SVC part 5).
- [~] **F9 — Surface (RESOLVED direction; deferred detail).** Card content view · drill UI (a `review_session`) ·
      browse/manage · stats. Subject to the standing build-time per-module VIEWS review flag — enumerated at
      intent level, gaps filled at build.

## Status
- [x] intake "whole" (2026-07-12) — F1–F8 + F-SVC RESOLVED; F9 direction set (view detail deferred to
      build-time views pass). Surfaced: **ADR-005 Study-Method Service framework**.
- [x] context was NOT `ambiguous` in Phase 0 (structural manifest row, not prose) — no role to resolve

## Deferred / surfaced (for Phase 4 + build)
- **ADR-005 Study-Method Service framework** (NEW) — the generic seam (roles · 6-part anatomy · Knowledge
  integration · outward integration · extensible); Flashcards = reference impl. → /adr-new in Accept.
- **ADR-002 amendment (Flashcards slice)** — RETIRE `flashcard_decks` + `flashcard_reviews` + the SM-2 columns
  on `flashcards`; keep a lean **card content entity** (front/back/hint/explanation + media + card_type + tags
  + entity_links) registered as a reviewable; scheduling/curve/review/mastery/grouping → Knowledge's generic
  engine. Consolidate with the standing amendment.
- **Cross-module:** Knowledge (its `study_methods` registry becomes the service seam — light touch at next
  visit) · Education (services as measurement sources) · Sessions (`review_session` run + `dueIn`).
- **G9/views:** Flashcards' surface detail folds into the standing build-time per-module VIEWS pass.
