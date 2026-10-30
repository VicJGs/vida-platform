<!-- Identity — features/knowledge · /documentation Phase 2 · sources: ADR-002 §5.10 (study_topics/topic_reviews) + knowledge_notes DDL L2715-2738 · schema.ts L721-759,L809-825 · CLAUDE.md §7 -->

# Identity — Knowledge (level: Feature / OWN MODULE — extracted from Learning, mirrors Books)

**What it is.** The OS's **knowledge Universe**: the user's lifelong catalog of what he _knows_ — where he
**acquires, transforms, interprets, and creates** knowledge across every life area, and shapes **his own
method** for holding it. Below a **Topic**, the user grows his own hierarchy of knowledge _objects_, of kinds
he defines (the seeded default kinds — **Concept** = a thing to _understand_, **Definition** = a thing to
_memorize_ — come from the Ultralearning method, but nothing is imposed). It is the **most personalizable module in the OS**: object
kinds, containers, study methods, and review curves are all user-shaped, with a working default that ships
for anyone who doesn't want the full builder. `[INTENT: reframe 2026-07-05/06/10; FACT: ADR-002 §5.10 Learning: study_topics L2557-2621; knowledge_notes L2715-2738 (the 3-table base)]`

**The desire behind it.** Education plans _how_ knowledge gets acquired; Knowledge is **the learning itself** —
the place the user actually nurtures and writes down what he understands, and where he **builds his own way of
organizing it** rather than following one imposed by the tool. v1 was minimal and nerfed: Education-only, its
organization hard-coded to the Ultralearning book for Victor's personal needs. v2's intent is **flexible +
personalizable** — interchangeable, interconnected building blocks the user assembles into his own arsenal,
and **sees his progress within each area**. `[INTENT: Victor 2026-07-05/06]`

**The Education↔Knowledge boundary (KN-A).** `[INTENT: Victor 2026-07-06]`

- **Education = planning the acquisition** — steps, goals, objectives, contents needed, homework/assessment
  dates, needed sessions. It structures the _path_ (formal or self-taught), as an institution does.
- **Knowledge = the acquisition + transformation + creation** — holding information, interpreting it, and
  making new knowledge, with the user shaping and creating his own method. This method-shaping + knowledge-
  holding is Knowledge's **sole** role; Education never does it.
- Structural consequence: Education's hierarchy **Topic is an Education _planning_ artifact** (what must be
  learned; curriculum placement); **Knowledge objects are separate entities** (the actual acquired/interpreted
  knowledge) linked to those artifacts via the Education compound set — **two entities, linked, never one
  shared table.** `[INTERP — validated 07-10]`

**Companion to heavy-consumer modules.** Knowledge is a helper to Education, **Skills, Finance, Health,
Languages**, and more — each served by a **compound set** (a tailored partition, the Books→Education pattern
per consumer). An **Area** (e.g. "Statistics") can serve **multiple OS modules** (Finance _and_ Education) at
once. `[INTENT: Victor 2026-07-06]`

**Scope — mostly INTENDED (the v2 FACT base is tiny).** `[INTENT: reframe; FACT: schema-only]`

- **FACT base (3 tables today, 0 logic):** `study_topics`, `topic_reviews`, `knowledge_notes` — Drizzle
  schema exists; `packages/core/src/models/learning.ts` is **empty (0 lines)**. `[FACT: ADR-002 L2557-2621,
L2715-2738; schema.ts L721-759, L809-825; wc -l = 0]`
- **INTENDED (this module's real shape):** a user-extensible **object hierarchy** below Topic + a
  user-definable **kind registry** (each kind carries a **learning-realm**); a **container** organization (Module ⊃ Area ⊃ Subject, many-to-many via the tag
  system); a **compound-set builder** (+ shipped default); **pluggable study methods & personalizable curves**
  at every level; knowledge notes as a **personalizable `pages` type**; first-class **References**; a
  cross-module **link graph**; and the **Knowledge Lab** (generate new knowledge from hypotheses + own-module
  data). `[INTENT: KN-A/B/C + K1/K3/K4/K5 resolutions]`

**No community — reproducible setups only.** Nothing is published from within the OS (user-safety); users
**mimic and follow steps** to rebuild a setup per area/module/subject. The earlier ZK-sharing concern
dissolves — there is no social surface. `[INTENT: Victor 2026-07-06 correction]`

**Terminal states (module-level).** Empty (no objects yet → default kind set + one starter container
shown, anti-lost) · Loading (catalog/graph hydrating) · Error (typed; never silent data loss) · Populated
(objects across containers, methods scheduling reviews, mastery deriving). `[INTENT]`

**Neighbors.** `[[../learning/education/identity]]` (the hub it partitions for) · `[[../books/identity]]`
(reading Universe; shares the "extracted module" precedent + supplies chapters/quotes to objects) ·
`[[../notes-and-pages/identity]]` (knowledge notes live here as a page type) · Flashcards (a study-method
family Knowledge composes) · Skills / Languages / Finance / Health (future consumer compound sets).
