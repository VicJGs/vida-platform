<!-- Structure & Data — features/knowledge/flashcards · /documentation Phase 2 · sources: ADR-002 flashcard_decks L2628-2650 / flashcards L2656-2688 / flashcard_reviews L2693-2710 · v1 entities.ts L1250-1297 · ADR-005 · ADR-004 · Knowledge structure-data · docs/intake/flashcards.md -->

# Structure & Data — Flashcards  (level: Feature / Knowledge sub-context)

> ⚠ **Mostly RETIREMENT + one lean entity.** The v2 FACT base is 3 schema-only tables (0 logic); under ADR-005
> two are retired outright and the third shrinks to a content-only entity. This is the sharpest case of the
> foundation-first principle.

## Data model

### FACT base today (3 tables, 0 logic) — mostly RETIRED
- **`flashcard_decks`** `[FACT: ADR-002 L2628-2650]` → **RETIRED.** Grouping → a user-defined Knowledge
  object/container below a Topic (`parent_object_id`); `new_cards_per_day`/`reviews_per_day` → the
  `method_binding`; `resource_type`(course/book/topic CHECK) + `resource_id` → `entity_links` (any resource).
- **`flashcards`** `[FACT: ADR-002 L2656-2688; type knowledge.ts L121]` → **SHRINKS to a content entity.** KEEP
  front/back/hint/explanation (all `[E]`); **RETIRE the SM-2 columns** (`easiness_factor`, `repetitions`,
  `interval_days`, `next_review_date`, `last_reviewed_at`, `times_reviewed`, `times_correct`) → generic
  review-state; `is_mastered` → **derived** (KN-10); `is_suspended` → kept (a card flag).
- **`flashcard_reviews`** `[FACT: ADR-002 L2693-2710]` → **RETIRED** → generic `review_events` (Knowledge).

### INTENDED shape — the one lean entity (→ ADR-002 amendment)
- **`flashcards`** (content-only, Flashcards owns): `id · front[E] · back[E] · hint[E] · explanation[E] ·
  card_type (basic|reversed|cloze|image_occlusion) · media (image/audio refs — restore v1) · is_suspended ·
  sort_order · sync`. Registered as a **reviewable** with Knowledge's engine (no scheduling columns).
  `[INTENT: F6; FACT restore v1 media — entities.ts L1258-1260]`
- **No Flashcards-owned deck / review / schedule tables** — all generic (Knowledge). Tags via the universal
  `page_tags`/tag system; note/source links + grouping via `entity_links`. `[INTENT: ADR-005 §3.1(6), §3.2]`

## Dependencies / graph
- **Position:** a **sub-context under Knowledge** — it does not sit in the dep graph as a standalone; it plugs
  into Knowledge's engine. `[FACT: reframe — Learning drops to Education only]`
- **In-edges:** Knowledge (`study_methods` registration; the engine schedules its cards) · gather sources
  (Knowledge objects, Books quotes, Notes).
- **Out-edges:** `review_events` → Knowledge (mastery) → Education (measurement, KN-10) · `review_session` →
  Sessions (run + Journal/XP effects) · `entity_links`/tags → Notes & Pages. All via documented points (§6).
- **Coupling budget:** by retiring its own tables into the generic engine, Flashcards holds essentially no
  standalone surface — the opposite of a god-feature.

## ADRs / structural decisions
- **[ADR-005 — Study-Method Service framework](../../../core/decisions/ADR-005-study-method-service-framework.md)**
  (Accepted 2026-07-12) — Flashcards is the reference implementation. `[FACT: ADR-005]`
- **[ADR-004 — Session Framework](../../../core/decisions/ADR-004-session-framework.md)** — `review_session`
  run surface.
- **ADR-002 amendment (Flashcards slice)** — retire `flashcard_decks` + `flashcard_reviews` + SM-2 columns;
  keep the lean card content entity. Consolidate with the standing amendment (Knowledge slice already retires
  the fixed SM-2 columns — same decision). `[FACT: knowledge intake — RETIRE fixed SM-2 cols]`

## Single source of truth (constitution §3)
- **Scheduling/curve/mastery/review-log** — Knowledge's generic engine (never duplicated here).
- **Grouping ("deck")** — the user's Knowledge object hierarchy.
- **Tags** — the universal tag system. **Note/source/resource links** — `entity_links`.
- **`card_type` enum** — canonical Zod validator in `@vida/core`, TEXT+CHECK in SQL.

## Completion checklist
- [x] data model (FACT base → retirements + the one lean entity) · [x] dep graph within budget (rides Knowledge) ·
  [x] ADRs (005/004 + ADR-002 amendment) · [x] single source per cross-cutting concept · [x] [FACT]/[INTENT] +
  supersessions flagged loud
