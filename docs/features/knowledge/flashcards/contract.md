<!-- Contract — features/knowledge/flashcards · /documentation Phase 2 · sources: ADR-002 L2628-2710 · ADR-004 · ADR-005 · Knowledge contract (study_methods/method_bindings/review_events) -->

# Contract — Flashcards (level: Feature / Knowledge sub-context)

> ⚠ INTENDED — the v2 surface is schema-only (0 logic; `models/learning.ts` wc -l = 0). Signatures are the
> documented target, not enforced reality. Flashcards implements the **ADR-005** service anatomy.

## Exposed surface (as a Study-Method Service — ADR-005 anatomy)

1. **Content unit — the card.** `Card` CRUD over the lean content entity (front/back/hint/explanation +
   media + `card_type` + tags + `entity_links`). Registered as a **reviewable** with Knowledge's engine.
   `[INTENT: ADR-005 §3.1(1); FACT: v2 flashcards content cols L2659-2662]`
2. **Service registration.** Flashcards registers in Knowledge's **`study_methods`** registry with role(s)
   `retention` + `gathering`; the user binds it (`method_bindings`) to any object/container with a curve.
   `[FACT: knowledge KN-8; ADR-005 §3.1(3)]`
3. **Run surface.** Starts a **`review_session`** (ADR-004) over the due cards; on completion emits one
   `review_event` per card (quality/response_time). `[FACT: ADR-004; ADR-005 §3.1(2/5)]`
4. **Gather API.** `generateCards(source)` — from Knowledge `definition` objects / Book quotes / notes;
   keeps the source as an `entity_links` ref. `[INTENT: ADR-005 §3.1(4)]`
5. **Card types.** `basic · reversed · cloze · image-occlusion` (each declares how front/back render + how a
   review is scored). `[INTENT: F6]`

## What it consumes (external — via documented integration points, never direct tables)

- **Knowledge (the generic engine):** `study_methods` (register) · `method_bindings` (bind curve + caps) ·
  `review_curves` (SM-2 default) · `review_events` (emit) · mastery derivation (KN-10) · the user's
  object/container hierarchy (grouping) + `entity_links` graph. `[FACT: knowledge/structure-data.md]`
- **Sessions & Scheduling:** `review_session` sub-type (run) + reads Knowledge's `dueIn` for the queue (SS-7).
  `[FACT: ADR-004]`
- **Notes & Pages:** `entity_links` to notes/pages (SP4) · the shared **`entity_tags`** tag primitive (SP1) · attachments (card media).
  `[FACT: notes-and-pages; ADR-006 SP1; ADR-005 §3.1(6)]`
- **Education:** as a **measurement source** — retention outcomes feed object mastery, one of Education's
  3 signals (KN-10). Flashcards emits; Education/Knowledge read. `[FACT: education/contract.md; KN-10]`
- **Gamification / Journal:** via `review_session` effects (XP, daily Journal) — ADR-004, not owned here.

## Contract error cases (typed)

- `CardNotBound` — card has no `method_binding`; excluded from queues until bound (FC-2, not an error state).
- `GenerateSourceUnreadable(source)` — gather failed; partial results surfaced, never a silent no-op.
- `ReviewEmitFailed(card)` — `review_event` emit failed → queued/retried (never dropped; mastery depends on it).
- `InvalidCardType(type)` / `MalformedCloze` — author-time typed validation; never a broken drill.

## Completion checklist

- [x] exposed surface (content · registration · run · gather · types) + consumed (Knowledge/Sessions/Notes/
      Education) · [x] types/errors · [x] integration via documented points, no direct table access (§6) ·
      [x] [FACT]/[INTENT] on each claim
