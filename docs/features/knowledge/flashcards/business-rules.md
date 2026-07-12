<!-- Business Rules — features/knowledge/flashcards · /documentation Phase 2 · sources: ADR-002 L2628-2710 · ADR-004 (review_session) · ADR-005 (service framework) · Knowledge KN-4/KN-5/KN-8/KN-10 · docs/intake/flashcards.md -->

# Business Rules — Flashcards  (level: Feature / Knowledge sub-context)

> Inherits the CORE constitution (ZK-1, LF-2), Knowledge's rules (KN-5/KN-8 pluggable methods & curves;
> KN-10 mastery), ADR-004 (Sessions), and **[ADR-005](../../../core/decisions/ADR-005-study-method-service-framework.md)**
> (the Study-Method Service framework — Flashcards is its reference implementation).

## Invariants (what is ALWAYS / NEVER true)

- **FC-1 — Flashcards owns content + interaction only.** Its sole data is the **card content entity** (a
  reviewable). It NEVER owns scheduling, curves, a review log, grouping, or mastery — those are the generic
  foundation's. `[FACT: ADR-005 §3.2]`
- **FC-2 — A card is a reviewable, scheduled by Knowledge's generic engine.** Its due-date/curve state lives
  in the `method_binding` + review-state, not on the card. The user **binds** a curve; **SM-2 is the shipped
  default preset**, swappable (KN-8). `[FACT: knowledge/business-rules.md KN-8]`
- **FC-3 — Three v2 tables are RETIRED (⚠ supersession).** `flashcard_decks` → a user-defined Knowledge
  object/container (grouping) + `method_binding` (caps) + `entity_links` (resource); the **SM-2 columns on
  `flashcards`** → generic review-state; `flashcard_reviews` → generic `review_events`. `[FACT: ADR-002 L2628-2710 superseded by ADR-005]`
- **FC-4 — A "deck" is user-defined, never a fixed entity.** The user designates which entity below a Topic is
  the deck and what it holds (personalization; `parent_object_id`). `[INTENT: Victor 2026-07-12]`
- **FC-5 — A drill is a `review_session`.** The interaction runs as the Session sub-type (ADR-004); its
  outcomes are recorded as generic `review_events`, one per card reviewed. `[FACT: ADR-004]`
- **FC-6 — Flashcards emits, Knowledge derives.** On review it emits outcomes (quality/response) as
  `review_events`; Knowledge **derives** object mastery (KN-10). Flashcards NEVER computes mastery. `[FACT: KN-10]`
- **FC-7 — Gathering is first-class.** Cards may be generated from Knowledge `definition` objects (KN-4), Book
  quotes, and notes; the source is kept as an `entity_links` reference (v1 `source_note_id` generalized).
  `[INTENT: Victor 2026-07-12; FACT: v1 entities.ts L1272]`
- **FC-8 — Cards are universal citizens.** Every card participates in the **universal tag system** and links
  to **notes/pages** via `entity_links`; supports attachments. `[INTENT: Victor 2026-07-12; ADR-005 §3.1(6)]`
- **FC-9 — The due-queue is read from Knowledge's `dueIn`.** The Scheduler (Sessions & Scheduling) reads
  Knowledge's provider; Flashcards does not expose its own queue or own daily caps (those are the
  `method_binding`). `[FACT: ADR-004 SS-7; ADR-005 §3.3]`
- **FC-10 — Flashcards is the reference impl, not the seam.** It implements ADR-005's 6-part anatomy; it does
  not define roles or add integration points (those are ADR-005's, extensible). `[FACT: ADR-005]`

## Validation & edge cases
- Generating a card from a source whose object is later deleted → the card survives; its `entity_links` source
  ref no-ops loudly (never resurrects, never errors the card). `[INTENT]`
- A card bound to no curve → not scheduled; it appears in browse/manage but never in a due-queue until bound
  (explicit, not a silent drop). `[INTENT]`
- Changing the bound curve (SM-2 → other) → future scheduling uses the new curve; past `review_events` are
  immutable history. `[INTENT: KN-8]`
- A `cloze`/`image-occlusion` card with malformed mask → typed validation error at author time; never a broken
  drill. `[INTENT]`

## Terminal states (before any build — constitution §2)
- **A card:** empty (authored, no content yet) · active (bound, scheduled) · suspended (excluded from queues) ·
  mastered (a *derived* Knowledge state, not a card flag). `[FACT: v2 had is_mastered/is_suspended — is_mastered now derived, KN-10]`
- **A drill (`review_session`):** loading (queue resolving) · empty (nothing due → "all caught up", anti-lost) ·
  in_progress · completed (emits `review_events`) · error (typed; a failed emit is retried, never silently lost).
- **Gather/generate:** ok · empty (no eligible source items) · error (source unreadable → explicit, partial
  results surfaced, never a silent no-op).

## Failure behaviour (fail loud — constitution §5)
- A failed `review_event` emit is queued/retried and surfaced; a review is never silently dropped (mastery
  depends on it).
- Flashcards NEVER writes scheduling/mastery to "recover" from an engine gap — it flags the gap (that would
  re-create the rigid model ADR-005 retired).

## Completion checklist
- [x] invariants with [FACT]/[INTENT] · [x] all terminal states enumerated · [x] failure is loud ·
  [x] inherits Knowledge + ADR-004 + ADR-005 · [x] retirements flagged loud
