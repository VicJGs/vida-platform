<!-- Conventions — features/knowledge/flashcards · /documentation Phase 2 · sources: ADR-002 L2628-2710 · v1 entities.ts L1250-1297 · ADR-005 · ADR-004 · CLAUDE.md conventions -->

# Conventions — Flashcards (level: Feature / Knowledge sub-context)

> INTENDED (v2 = schema-only, 0 logic). Flashcards is the **reference implementation** of the Study-Method
> Service framework (ADR-005) — build the next service (assessments, self-test) by copying this shape.

## How to build here (= how to build any study-method service, ADR-005)

- **Own content + interaction, nothing else.** Define one **content unit** (the card) + a **run surface**
  (a Session sub-type). Do NOT add scheduling, curve, review-log, deck, or mastery tables — those are the
  generic engine's. If you feel the urge to add a `*_reviews` or `*_decks` table, that is the v1/v2 trap. `[FACT: ADR-005 §3.2]`
- **Register + bind, don't hard-code.** Register the service in Knowledge's `study_methods`; let the user
  **bind** it to objects with a curve (`method_bindings`). SM-2 is a shipped default preset, never a schema. `[FACT: KN-8]`
- **Emit, don't compute.** On review, emit a `review_event`; Knowledge derives mastery (KN-10). Never write a
  mastery/schedule value to "help". `[FACT: KN-10]`
- **Gather via `entity_links`.** When generating cards from a source (object/quote/note), keep the source as
  an `entity_links` reference — that is the capture provenance. `[INTENT: F7]`
- **Wire the universal properties.** Cards get **tags** (via the shared `entity_tags` primitive, SP1) + **note/page links**
  (`entity_links`, SP4) + attachments (media) — for free, like every OS content entity, not a Flashcards feature. `[FACT: ADR-006 SP1; ADR-005 §3.1(6)]`
- **Run through a `review_session`.** All drilling is a Session (ADR-004) so Journal/XP/Scheduler integration
  comes for free. `[FACT: ADR-004]`

## Naming & layout

- The content entity stays `flashcards` (content-only); a review is a generic `review_event` (not
  `flashcard_review`); grouping has **no** table (a user Knowledge object).
- `card_type ∈ {basic, reversed, cloze, image_occlusion}`; media as encrypted attachment refs.
- Follows platform conventions: UUIDv7 TEXT PKs · Unix-ms timestamps · `-- [E]` on card content · `_sync_*`
  on the syncable entity · soft-delete `deleted_at` · tags via the shared `entity_tags` primitive (SP1). `[FACT: CLAUDE.md Conventions; ADR-006 SP1]`

## Landmines / local "never do"

- **The v2 surface is a schema stub — never cite it as behaviour.** `models/learning.ts` is 0 lines. `[FACT: wc -l = 0]`
- **Do NOT preserve the v2 tables.** `flashcard_decks`, `flashcard_reviews`, and the SM-2 columns are
  **retired** — building them back re-creates the rigid model ADR-005 exists to kill. `[FACT: ADR-005 §3.2]`
- **Do NOT weld SRS to the card.** "Spaced repetition" is a bound curve in Knowledge's engine, applicable to
  any reviewable — not a set of columns on `flashcards`. `[FACT: KN-8]`
- **Do NOT invent a "deck" entity.** Grouping is the user's Knowledge hierarchy; a deck is whatever object he
  designates. `[INTENT: Victor 2026-07-12]`
- **Types are in `knowledge.ts`, not `learning.ts`.** `FlashcardDeck`/`Flashcard`/`FlashcardReview` moved there
  during the Knowledge extraction (L106-160) — and `FlashcardDeck`/`FlashcardReview` are being retired. `[FACT]`
- **Views deferred.** The service surface (card view · drill UI · browse/manage · stats) is enumerated at
  intent level; detail is the standing build-time per-module VIEWS pass. Do not fabricate view behaviour. `[INTENT]`

## Completion checklist

- [x] patterns in use (INTENDED, marked; = the ADR-005 service recipe) · [x] naming & layout ·
      [x] landmines (v1/v2 traps) · [x] [FACT]/[INTENT] on each claim
