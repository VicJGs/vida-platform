# ADR-005: Model study methods as pluggable services on Knowledge's generic review engine, not as bespoke feature tables

**Status:** Accepted
**Date:** 2026-07-12
**Decision Makers:** Victor J.
**Context:** Vida Platform — Knowledge module (study-method services; Flashcards is the reference implementation)
**Tags:** architecture · data model · extensibility
**Builds on:** Knowledge KN-5/KN-8 (pluggable methods & curves) · [ADR-004](ADR-004-session-framework.md) (a service run is a Session sub-type)
**Amends:** ADR-002 — retires `flashcard_decks`, `flashcard_reviews`, and the SM-2 columns on `flashcards`; a reviewable becomes a lean content entity scheduled by the generic engine.
**Amended by:** [ADR-008](ADR-008-capability-block-registry.md) (F2/D2) — `study_methods` is a **typed specialization (`kind=study_method`) of the one OS capability registry**, not a Knowledge-owned parallel registry. A study-method service **is a capability**; Knowledge continues to own the review **engine** (curves · `method_bindings` · `review_events` · mastery). See ADR-008 §3.1/§3.3a.

---

## 1. Summary

A **study-method service** is a pluggable way for the user to work on knowledge — drill it, capture it, be
assessed on it, elaborate it. This ADR locks that services are **thin content + interaction plugins** riding
Knowledge's **generic** review engine, registered through one **seam** — the OS **capability registry** (ADR-008);
`study_method` is a `kind` of it, not a parallel registry (F2/D2) — rather than each re-implementing
scheduling, review logging, grouping, and mastery in its own tables. **Flashcards is the reference
implementation**; future services (assessments, self-test, Feynman, …) plug into the same seam. The set of
roles and integration points is **open — extensible over time**.

## 2. Context — what triggered this

v1/v2 modelled "flashcards" as a **self-contained feature**: `flashcard_decks` (fixed grouping + daily caps +
a 3-type resource CHECK), `flashcards` with **hard-coded SM-2 columns**, and a dedicated `flashcard_reviews`
table. `[FACT: ADR-002 L2628-2710]` That model makes "how do I use spaced repetition?" a single rigid answer
welded to one feature — and it means the **next** study method (an assessment, a self-test) forces **another
whole table set** to re-solve the same problem.

This contradicts the OS's own logic, already established when Knowledge was documented:

- **KN-5/KN-8:** study methods and review curves are **pluggable and user-organized**; SM-2 is one preset;
  mastery is **derived**; the engine is generic (`study_methods` · `review_curves` · `method_bindings` ·
  `review_events`). `[FACT: docs/features/knowledge/business-rules.md KN-8; structure-data.md]`
- **ADR-004:** every timed activity is a **Session** with a shared contract; a drill/test is a `review_session`.
- **Foundation-first principle (Victor 2026-07-12):** when a foundation exists, rigid per-feature structures
  **collapse into generic constructs** — "keep the seam, retire the instance."

The v2 flashcard code is schema-only (0 logic), so this is a structural decision, not a migration.

## 3. Decision

**3.1 A study-method service is a plugin, defined by a 6-part anatomy.**

1. **Content unit** — the _only_ data the service owns (Flashcards: the card; Assessment: the item; Feynman:
   the prompt). Registered as a **reviewable**. The content unit is **data the capability owns, not itself a
   capability**: the study-_method_ is the capability (`kind=study_method`); a card is not (F2/D2).
2. **Run surface** — a **Session sub-type** (ADR-004): a drill, a test. Every run is a first-class Session.
3. **Registration** — the service registers as a **capability of `kind=study_method` in the OS capability registry**
   (ADR-008 — the one composability registry; **`study_methods` is a typed specialization of it, not a parallel
   registry**, F2/D2). The user then **binds** it (`method_bindings`) to any knowledge object/container, choosing a
   curve (KN-8) — the **review-engine specialization** of the `study_method` kind, which stays Knowledge's.
4. **Gather capability (optional)** — how it _creates_ content units from OS sources (Knowledge objects, book
   quotes, notes) — the "gathering" role, first-class alongside retention.
5. **Emitted signals** — outcomes recorded as generic **`review_events`**; Knowledge **derives** mastery
   (KN-10). The service never computes mastery.
6. **Universal properties** — content units are **first-class OS citizens**: the **universal tag system**,
   **pages/notes links** via `entity_links`, and attachments. A service is never an island.

**3.2 The generic engine owns everything except content + interaction.** Scheduling, curves, the review log,
mastery, and grouping are Knowledge's — never re-implemented per service. Consequently, for Flashcards:

- **RETIRE `flashcard_decks`** — grouping is a **user-defined Knowledge object/container** below a Topic
  (`parent_object_id`); daily caps move to the `method_binding`; the resource link is `entity_links`.
- **RETIRE the SM-2 columns on `flashcards`** — scheduling state lives in the generic `method_binding` +
  review-state; SM-2 is a bound default curve.
- **RETIRE `flashcard_reviews`** — a review is a generic `review_event`.
- **KEEP** a lean **card content entity** (front/back/hint/explanation + media + `card_type` + tags +
  `entity_links`), registered as a reviewable.

**3.3 Outward integration (extensible).** A service reaches the OS through documented seams: **Education**
(measurement source — mastery/grade/pace, KN-10), **Sessions & Scheduling** (run + `dueIn` queue via
Knowledge), **Journal + Gamification** (Session effects), **Tags + Notes/Pages** (universal). New integration
points (e.g. Purpose, Duties, Routines) may be added later — the set is **not closed**.

**What this does NOT do:** it does not build the future services (assessments, self-test, Feynman — INTENDED,
not now) and does not design the service view surfaces (build-time views pass).

## 4. Options Considered

### Option A — Pluggable services on the generic engine (CHOSEN)

- **Rationale:** a new method defines only its _content unit + role_; body (Session), schedule (curve), review
  log, mastery, grouping, and universal properties come free. Matches KN-8, ADR-004, and the foundation-first
  principle. Extensible by design.
- **Tradeoffs accepted:** more indirection (a service is spread across Knowledge's engine + Sessions + its own
  content table); the generic engine must be robust enough to serve every service.

### Option B — Self-contained feature per method (v1/v2) (REJECTED)

- **Why rejected:** every method re-implements scheduling/review/grouping in its own tables; adding a service
  means a new table set; "spaced repetition" is welded to flashcards. This is the rigidity that triggered the ADR.

### Option C — One monolithic "study" table for all methods (REJECTED)

- **Why rejected:** methods have genuinely different content units (card vs assessment item vs prompt);
  collapsing them yields nullable sprawl / opaque JSON and a god-table — the same failure ADR-004 rejected.

## 5. Consequences

**Easier:**

- A new study-method service is small: define its content unit + role; everything else is inherited.
- One review engine, one mastery derivation, one grouping model — consistent across all services.
- Services are automatically taggable, note-linkable, schedulable, and Journal-visible.

**Harder:**

- Logic for one service spans several owners (its content table + Knowledge's engine + Sessions); no single
  table tells the whole story.
- Knowledge's generic engine carries more responsibility and must not leak method-specific assumptions.

**Explicitly accepted tradeoffs:**

- Indirection + a heavier generic engine, in exchange for extensibility and the end of per-method table sprawl.
- Retiring three shipped v2 tables (they were schema-only) to honor the foundation.

## 6. Review Date / trigger

Reconsider when the **second** study-method service (assessments) is documented — it is the real test of the
seam; if it cannot be expressed as (content unit + role + bindings) without engine changes, revisit the anatomy.
Assessments is now _also_ the test of the F2/D2 is-a: if it cannot be expressed as a `kind=study_method`
capability (ADR-008 §3.3a crosswalk) without forcing review-engine assumptions into the generic registry, revisit
the specialization.
