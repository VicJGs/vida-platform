<!-- Identity — features/knowledge/flashcards · /documentation Phase 2 · sources: ADR-002 flashcard_decks L2628-2650 / flashcards L2656-2688 / flashcard_reviews L2693-2710 · types knowledge.ts L106-160 · v1 entities.ts L1250-1297 · ADR-004 · ADR-005 · Knowledge KN-4/KN-5/KN-8/KN-10 · docs/intake/flashcards.md -->

# Identity — Flashcards (level: Feature / Knowledge SUB-CONTEXT — a study-method SERVICE, not a module)

**What it is.** A **study-method service inside Knowledge** — the user _invokes_ it on his knowledge to do
two things: **retention** (spaced-repetition drilling to raise recall) and **gathering** (capturing
information _into_ his knowledge as cards). It is the **reference implementation** of the Study-Method Service
framework `[FACT: ADR-005]` — the first concrete instance of Knowledge's pluggable `study_methods` registry
(KN-8). `[INTENT: reframe Victor 2026-07-12; FACT: knowledge/business-rules.md KN-8]`

**The desire behind it.** The user wants to _use flashcards as a service_, not _manage a flashcards app_.
He organizes his own knowledge; a card is just one way to hold and drill a piece of it. And flashcards is
only the **first** of a family of such services — assessments, self-test, Feynman, and more the user may add
later — all plugging into the same seam. `[INTENT: Victor 2026-07-12]`

**Its irreducible core (why it is small).** Everything a study method _seemed_ to need, the foundation now
provides generically, so Flashcards owns exactly two things: `[INTENT: ADR-005 §3.2]`

- **the card as a reviewable content unit** (front/back/hint/explanation + media + card type + `entity_tags`
  (SP1) + note links via `entity_links`), and
- **the drill interaction**, run as a `review_session` (ADR-004).

Everything else belongs to the foundation:

- **scheduling / curve** → Knowledge's generic engine (`method_bindings` + `review_curves`; SM-2 = the shipped
  default preset, swappable — KN-8).
- **grouping ("deck")** → a **user-defined Knowledge object/container** below a Topic — _he_ decides what a
  deck is and what it holds (personalization); there is no fixed deck entity.
- **review log** → generic `review_events`.
- **mastery** → **derived by Knowledge** (KN-10); Flashcards only emits outcomes.

**The gathering role (first-class).** Cards can be **generated** from OS sources — Knowledge `definition`
objects (memorize seeds, KN-4), Book quotes, and notes — so "make flashcards from this" is a capture path
into knowledge, not just manual authoring. `[INTENT: Victor 2026-07-12; FACT: v1 source_note_id — entities.ts L1272]`

**Universal citizen.** A card participates in the platform's universal systems: the shared **`entity_tags`**
tag primitive (SP1), **notes/pages links** (`entity_links`, SP4), and attachments — never an island. `[INTENT: Victor 2026-07-12; ADR-006 SP1]`

**What it is NOT.** `[INTENT — anti-scope-creep, constitution §1]`

- **Not its own module**, and **not under Learning** — it lives inside Knowledge.
- **Not the review engine.** It does not schedule, does not own curves, does not log reviews as its own rows.
- **Not the SM-2 owner.** SM-2 is one bound preset in Knowledge's pluggable curve system, not a schema.
- **Not a fixed "deck."** Grouping is the user's Knowledge hierarchy.
- **Not the mastery owner.** Knowledge derives mastery from the emitted `review_events`.
- **Not the whole service framework.** It is one instance of it (ADR-005); it does not define the seam, it
  _implements_ it. Future services are out of scope here.

**Terminal states (service-level).** Empty (no cards yet → generate/author prompt, anti-lost) · Loading (cards/
due-queue hydrating from Knowledge's engine) · Error (typed; a failed generate/emit never corrupts the linked
object) · Populated (cards authored/gathered, bound to a curve, drilled via `review_session`, feeding mastery).

**Neighbors.** `[[../identity]]` (Knowledge — owns the generic engine + the `study_methods` seam it plugs
into) · `[[../../sessions-and-scheduling/identity]]` (`review_session` run surface + `dueIn`, ADR-004) ·
`[[../../learning/education/identity]]` (services as measurement sources, KN-10) · `[[../../notes-and-pages/identity]]`
(card note links + tags) · future study-method services (assessments/self-test/Feynman — INTENDED, ADR-005).
