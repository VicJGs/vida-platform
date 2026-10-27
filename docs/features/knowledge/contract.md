<!-- Contract — features/knowledge · /documentation Phase 2 · sources: ADR-002 §5.10 Learning (study_topics L2557-2621, knowledge_notes L2715-2738) · learning.ts · intake -->

# Contract — Knowledge (level: Feature / own module)

> **Status:** the FACT base has schema only — `study_topics`, `topic_reviews`, `knowledge_notes` exist in
> Drizzle; `@vida/core/models/learning.ts` is an **empty placeholder (0 lines)** — no service. Everything below
> the object/kind/container/method/compound-set model is ⚠ INTENDED (no schema). Signatures are the **designed
> interface**. `[FACT: schema.ts L721-759, L809-825; wc -l models/learning.ts = 0]`

## Exposed surface (via `@vida/core`)

**Objects & kinds (⚠ INTENDED):**

- `createKind({name, learningRealm, defaultMethodId?, parentKindId?})` · `listKinds()` — the user's
  extensible kind **registry**; seeds **topic / concept / definition** on first run, editable (KN-3/KN-4).
  `parentKindId?` is `[INTERP]` (flat registry may suffice).
- `createObject({kindId, parentObjectId?, title, description?})` · `updateObject` · `getObject(id)` ·
  `listObjects(filter)` — objects nest under a Topic via `parent_object_id` (**the stated hierarchy**, K1).
  Mastery is **read-only / derived** (KN-9).
- `linkObject(objectId, targetRef)` / `unlinkObject(...)` — cross-module via `entity_links` (KN-6); **no**
  `resource_type` writes.

**Containers (⚠ INTENDED):**

- `createContainer({type: module|area|subject, name})` · `tagMembership(containerId, memberRef, scopedTag)` —
  many-to-many via the `entity_tags` primitive (ADR-006 SP1, scoped; KN-7); `listContainers(view)` regroups per
  view. An Area may join multiple OS-modules.

**Study methods, curves & review (⚠ INTENDED):**

- `listMethods()` / `registerMethod(spec)` — **thin wrappers over the one OS capability registry** (ADR-008), _not_ a
  parallel store: `registerMethod` registers a `kind=study_method` capability; `listMethods()` reads the
  `kind='study_method'` partition (F2/D2). · `listCurves()` / `defineCurve(spec)` (SM-2 = a built-in preset).
- `bindMethod({targetLevel: area|subject|unit|topic|kind, targetId, methodId, curveId?})` (KN-8) — default
  resolved from the target kind's `learning_realm` (KN-4).
- `getDue(range, {level?})` → items due across levels/methods · `recordReview({objectId|levelRef, methodId,
quality|signal})` → logs a `review_event`, **re-derives mastery** (KN-9). Generalizes v1's review tab +
  `topic_reviews`.

**Notes & references (⚠ INTENDED):**

- Knowledge note = a `pages` entity (KN-5): `openObjectNote(objectId)` → creates/returns a `pages` row of the
  knowledge `entity_type` (personalizable render); **never** a `knowledge_notes` insert.
- `addReference(objectId, {title, source, type})` · `listReferences(objectId)` — first-class References (K6),
  replacing the `resource_urls` array.

**Compound sets (⚠ INTENDED):**

- `buildCompoundSet(consumerModule, spec)` / `applyDefaultCompoundSet(consumerModule)` (KN-11) — the builder +
  the shipped default. AI-assist is an **extension-model** call (opt-in, consent-gated). `[INTENT KN-C]`

**Knowledge Lab (⚠ INTENDED):**

- `createLabEntry({hypothesis, dataRefs[]})` · `concludeLabEntry(id, conclusion)` → optionally
  `promoteToObject(entryId)` — new knowledge from own-module data. `[INTENT 07-06]`

**Search (⚠ INTENDED):** `searchKnowledge(query)` over `fts_knowledge` (K11) — absent today. `[FACT: L3641-3670]`

## Consumed / provided contracts (cross-module)

- **PROVIDES → Education (KN-10):** `getMasterySource(subjectRef)` → `{objectMastery, assessmentResults,
paceVsSyllabus}` compounded signal. Education owns the rollup + the **syllabus-as-calendar** entity (forward
  dep). Knowledge never writes Education's measurement. `[[../learning/education/contract]]`
- **CONSUMES ← Books:** chapters/quotes referenced by objects via `entity_links` / `reading_chapter_id`; book
  annotations & quotes remain **Books-owned** (never duplicated here). `[FACT: books/contract.md L49]`
- **CONSUMES ← Notes & Pages:** the knowledge note page type + `entity_links` graph. `[[../notes-and-pages/contract]]`
- **HOSTS → Flashcards** (study-method sub-context, [flashcards/](flashcards/), documented 2026-07-12): the
  spaced-rep drill + gather method for `memorize`-realm kinds (KN-4/KN-8). It is the **reference implementation
  of the Study-Method Service framework** — Knowledge's `study_methods` (a **typed specialization, `kind=study_method`,
  of the one OS capability registry, ADR-008**, not a parallel registry — F2/D2) is that seam; Flashcards brings
  content+drill only, and rides Knowledge's generic **review engine** (schedule/curve/review/mastery/grouping), which
  stays Knowledge's. Future services (assessments/self-test/Feynman) plug in identically.
  `[FACT: ADR-005; ADR-008 §3.1/§3.3a; flashcards/contract.md]`
- **FUTURE consumers:** Skills · Languages · Finance · Health — each via its own `compound_set`.

## Events emitted (⚠ INTENDED)

`object.created` · `review.recorded` (→ mastery re-derive → Gamification/Journal) · `mastery.changed`
(→ Education measurement source) · `lab.concluded` (→ new object). `[INTENT]`

## Error modes

Typed errors only; optimistic writes revert on failure (LF-2, never silent loss). Broken parent-kind /
parent-object refs rejected at write. A cross-module measurement mismatch is **flagged, not guessed**
(No-Guessing). `[INTENT; FACT: ADR-003 offline queue]`
