# Decomposition — mod-knowledge (#50, LIF-128) · Entity Delivery Flow Step 3

> Backend ① rebuild. Scope authority: `docs/specs/foundation/backend-intent/decomposition.md:65`
> homes **56 legs** to MOD-knowledge (`FC-01…12` + `KNO-01…43, 45`). Excluded: `KNO-44` (Education
> assessment link) · `KNO-46` (OS automation surface, parked M2+). Deps all Done. Enables MOD-learning-education.
> Baseline: schema-only (7 owned tables `022_knowledge` + 3 review-engine tables `008_knowledge_review`),
> zero service on `main`. Profile: add-backend-component / Default (Entity Delivery Flow v1).

## Headline decomposition decision (P3 call — flagged for the gate)

**D1 — The generic review engine homes to `foundation/review/` (populate the reserved stub), NOT `services/knowledge/`.**
The leg roster flags this as an open P3 call (`backend-intent/parts/knowledge.md:120`: "knowledge-service internals
vs a promoted cross-cutting `review-engine` service"). Grounding for `foundation/review/`:
- The **schema already homed it to foundation** — `schema/foundation/knowledge-review.ts`, not a knowledge-only file.
- A **reserved stub exists** — `foundation/review/CLAUDE.md` (the AR-era substrate skeleton), empty of `.ts`.
- It is **cross-consumed** — flashcards (this build) + future skills/languages/education/finance/health via compound sets
  (`backend-intent/parts/knowledge.md:6-8`; structure-data.md:38 "review engine … stays Knowledge's").
`createKnowledgeService` COMPOSES the engine; the engine is Knowledge-owned but lives in the foundation namespace as a
promoted substrate. **This authors no new schema** (both migrations already shipped) — only service code.

## Slice map (8 slices, dependency-ordered)

| Slice | Name | Legs | Home mix |
|-------|------|------|----------|
| **S1** | Types reconcile + Kinds + Objects + Hierarchy | KNO-01,02,03,04,05,06,07,08,09,41 | 🔨 BUILD |
| **S2** | Containers + References + link/tag cross-cut | KNO-10,11,12,13,14,29,30,45 | 🔨 BUILD + 🧩 entity_links, entity_tags |
| **S3** | Review engine ①: methods registry + curves + bindings | KNO-15,16,17,18,19,20 | 🔨 BUILD (foundation/review) + 🧩 capability registry |
| **S4** | Review engine ②: due + recordReview + derive + rollup | KNO-21,22,23,24 | 🔨 BUILD + 🧩 measurement.rollup |
| **S5** | Measurement source + Education seams | KNO-25,26,27,42 | 🧩 measurement registry + ⏸ Education seams |
| **S6** | Pages-notes + Compound sets + Lab + AI/search/ingestion seams | KNO-28,31,32,33,34,35,36,37,43 | 🔨 BUILD + 🧩 notes/ai/ingestion + ⏸ DB-8 search |
| **S7** | Flashcards sub-service | FC-01…12 | 🔨 BUILD + 🧩 capability, sessions, entity_links/tags, effect rail |
| **S8** | Event fan-out + Journal contribution | KNO-38,39,40 | 🧩 effect rail + journal registry |

Each slice runs the full §XXVI double-gate (PLAN /critique → Approval 1 → /preflight /critique → Approval 2) +
a **blocking Verification Gate** (functional + live-store, Node 24) + an independent code-review, then §XXIX currency.

## Per-slice detail

### S1 — Types reconcile + Kinds + Objects + Hierarchy `[KNO-01,02,03,04,05,06,07,08,09,41]`
- Reconcile `@vida/types/knowledge.ts` row interfaces to the shipped schema (`KnowledgeObject`/`ObjectKind`/
  `KnowledgeContainer`/`Reference`/`CompoundSet`/`KnowledgeLabEntry`/`Flashcard`) via **edit-in-place**, preserving
  every provenance doc-comment (DB-11 reconcile). Zod validators in `validators/knowledge.ts`.
- `createKind` (FLAT registry — schema has no `parent_kind_id`, UNKNOWN resolved), `listKinds`, seed
  topic/concept(understand)/definition(memorize) on first run against `object_kinds` (never a hardcoded enum).
- `createObject`/`updateObject`/`getObject`/`listObjects`; cycle-safe `parent_object_id`; reject broken kind/parent
  refs (KNO-08); KN-2 invariant (never == Education Topic) as a documented boundary; mastery read-only (no setter).
- Typed errors + optimistic-revert semantics (KNO-41, core LF-2).
- **Home:** module-local; Repository (DB-6, `encryptedFields:[]` M1.0); `softDelete:true`.

### S2 — Containers + References + link/tag cross-cut `[KNO-10,11,12,13,14,29,30,45]`
- `createContainer({module|area|subject})`, `listContainers(view)` (query half; render = P6).
- `addReference`/`listReferences` (first-class, replaces `resource_urls`).
- 🧩 `linkObject`/`unlinkObject` + many-book links via **`createBacklinkResolver`** (`entity_links`); never write
  retired `resource_type` (KN-6).
- 🧩 `tagMembership` + migrate tags via **`createAssociationResolver`** (`entity_tags`, ADR-006 SP1); container
  membership = tags, not `parent_id` (KN-7).

### S3 — Review engine ①: methods registry + curves + bindings `[KNO-15,16,17,18,19,20]`
- 🧩 `listMethods`/`registerMethod` = thin wrappers over **`createCapabilityRegistry`** with `kind='study_method'`
  (OPEN vocab, `capability/types.ts:20`) — NOT a parallel store (F2/D2).
- 🔨 `listCurves`/`defineCurve` over `review_curves` (SM-2 = one built-in preset).
- 🔨 `bindMethod` over `method_bindings` (polymorphic target area|subject|unit|topic|kind); `resolveDefaultMethod`
  from the kind's `learning_realm` (memorize→spaced-rep; understand→elaboration) — user-overridable (KN-4).
- **Home:** `foundation/review/` (D1).

### S4 — Review engine ②: due + record + derive + rollup `[KNO-21,22,23,24]`
- 🔨 `getDue(range,{level?})`/`dueIn` — the due-queue provider (read by scheduler + flashcards, SS-7).
- 🔨 `recordReview({objectId|levelRef, methodId, quality|signal})` → append `review_events` row → re-derive mastery.
- 🔨 `deriveMastery` at the leaf — COMPUTED from active methods' events under the bound curve (SM-2 EF/interval/
  repetition for the SM-2 preset; **quality (0–5) is an input to the curve, NOT stored as mastery** — fixes the
  Antigravity scale-conflation bug). Never hand-set.
- 🔨 `rollupMastery` `kind→Topic→Unit→Subject` up the `parent_object_id` spine; 🧩 import the **free functions**
  `rollup()` / `assertAcyclic()` from `foundation/measurement/engine.ts` (:38 / :65) — NOT methods on the
  source-registry object.

### S5 — Measurement source + Education seams `[KNO-25,26,27,42]`
- 🧩 `getMasterySource(subjectRef)` → `{objectMastery, assessmentResults, paceVsSyllabus}`; **advertise** via
  `createMeasurementSourceRegistry.advertise(key, resolver)` (the M5 seam habits/S4 used).
- ⏸ `paceVsSyllabus` (KNO-26) + `assessmentResults` (KNO-27) = **deny-safe null signals** — Education's
  syllabus-as-calendar + assessments entities are NOT built (forward-dep seams; No-Guessing: null, never invented).
- 🔨 KNO-42 — flag a cross-module measurement mismatch, never guess.

### S6 — Pages-notes + Compound sets + Lab + seams `[KNO-28,31,32,33,34,35,36,37,43]`
- 🧩 `openObjectNote(objectId)` → a `pages` row (knowledge `entity_type`) via **`createNotesService`**; never a
  `knowledge_notes` insert (table retired, KN-5).
- 🔨 `buildCompoundSet`/`applyDefaultCompoundSet` (builder + shipped default, KN-11 anti-lost).
- 🧩 KNO-33 AI-assist = **`createAiService`** extension-model path (opt-in, consent-gated, deny-safe).
- 🔨 `createLabEntry`/`concludeLabEntry`/`promoteToObject` (hypothesis→conclusion→catalog object).
- ⏸ `searchKnowledge` (KNO-37) = `search-unavailable` seam (FTS5 `fts_knowledge` = DB-8, not built).
- 🧩 KNO-43 auto-population = **`createIngestionGuard`** (opt-in, device-side, deny-safe); source parsers deferred.

### S7 — Flashcards sub-service `[FC-01…12]`
- 🔨 `Card` CRUD over the lean `flashcards` table (front/back/hint/explanation/media/card_type/is_suspended).
- 🔨 FC-05 card-type validation (basic/reversed/cloze/image_occlusion — `InvalidCardType`/`MalformedCloze`).
- 🧩 FC-02 register as a `kind=study_method` capability (roles retention+gathering).
- 🧩 FC-03 run a `review_session` (ADR-004) over due cards via **`createSessionsService`**; one `review_event`/card.
- 🔨+🧩 FC-04 `generateCards` (gather from definition objects/book quotes/notes; source kept as `entity_links` ref);
  FC-08 generated card survives source delete (dangling link no-ops loudly).
- 🔨 FC-06 emit-only — flashcards NEVER computes mastery/schedule (enforces the KNO-23 boundary).
- 🔨 FC-07 `CardNotBound` (unbound card excluded from due-queue, explicit not silent); FC-09 curve-change future-only
  (past events immutable); FC-12 lifecycle states.
- 🧩 FC-10 review-emit retry/surfaced (`ReviewEmitFailed`) via the effect rail + offline queue; FC-11 taggable/
  linkable citizen (entity_tags `entity_type='flashcard'` + entity_links).

### S8 — Event fan-out + Journal contribution `[KNO-38,39,40]`
- 🧩 Guarded, idempotent, **post-commit, emit-only** producer — the habits/S5 fan-out pattern (fires on the
  mutations, rail-idempotent). **Precision (critic MINOR):** `object.created` (KNO-38), `review.recorded` (KNO-39),
  `mastery.changed` (KNO-40), `lab.concluded` are DOMAIN EVENT NAMES → they populate `EffectEvent.transition`
  (+`subjectNaturalKey`), NOT `effectType`. `effectType` MUST be one of the FIXED 12-member `EFFECT_TYPE` catalogue
  (`@vida/types/session.ts:85-100`; `UnknownEffectType` otherwise). Each domain event fans out to catalogue
  `effectType`s (e.g. `surface_journal`, `emit_measurement_signal`, `award_xp`, `surface_notification`) resolved via
  `registry.resolve(effectType)` (dormant guard) — the habits precedent (`services/habits/service.ts:143-148`).
- 🧩 `registerKnowledgeJournal` — a journal contribution snapshot (reviews/objects created today) via the journal
  provider registry (habits/gamification/finance precedent).

## Seam contract (composed substrates — all shipped)
| Substrate | Factory | Slices | Verified present |
|---|---|---|---|
| Repository (DB-6) | `createRepository` | all | ✅ |
| entity_links resolver | `createBacklinkResolver` | S2, S7 | ✅ `services/search/backlink-resolver.ts` |
| entity_tags resolver | `createAssociationResolver` | S2, S7 | ✅ `foundation/spaces` |
| capability registry | `createCapabilityRegistry` | S3, S7 | ✅ `foundation/capability` (kind OPEN) |
| measurement | `createMeasurementSourceRegistry` + `rollup`/`assertAcyclic` | S4, S5 | ✅ `foundation/measurement` |
| pages/notes | `createNotesService` | S6 | ✅ `services/notes` |
| ai (extension-model) | `createAiService` | S6 | ✅ `foundation/ai` |
| ingestion | `createIngestionGuard` | S6 | ✅ `foundation/ingestion` |
| sessions (review_session) | `createSessionsService` | S7 | ✅ `services/sessions/service.ts:177` (foundation/sessions = substrate skeleton) |
| effect rail | `createEffectRail.applyEffect` | S8, S7(FC-10) | ✅ `foundation/effects` |
| journal registry | `createJournalRegistry`/contribution | S8 | ✅ `services/journals` |

## Intent-coverage proof (all 56 homed)
- **🔨 BUILT-in-a-slice:** KNO-01–09,12,14,17,18,19,20,21,22,23,24,**25**,29,30,31,32,34,35,36,41,42 + FC-01,05,06,07,09,12 (module/engine code). _(KNO-25 reclassified 🧩→🔨 at S5, 2026-09-29: the measurement source-registry is a **sync/scalar** seam that cannot carry async/per-subject/struct mastery and has no consumer, so KN-10 is exposed as the `getMasterySource` **method** composing S4's `rollupMastery` — not a substrate binding. See PLAN-s5 headline #1.)_
- **🧩 COMPOSED (bound to a shipped substrate, still slice-homed):** KNO-10,11,13,15,16,28,33,38,39,40,43,45 + FC-02,03,04,08,10,11.
- **⏸ DEFERRED-SEAM (deny-safe, forward-dep):** KNO-26,27 (Education — assessments + syllabus-as-calendar unbuilt; S5 returns `null`, No-Guessing), KNO-37 (DB-8 search). Each homed to a slice as an explicit seam, never a silent gap. _(NB: knowledge seams are visible via return-type + comment; there is no `log()` seam at `services/knowledge` — corrected 2026-09-29, S5.)_
- **⛔ EXCLUDED (not in the 56, accounted):** KNO-44 (Education assessment link), KNO-46 (OS automation surface, parked M2+).
- **Partition check:** 44 KNO (01–43,45) + 12 FC = 56 = decomposition.md:65. 0 unhomed · 0 double-homed · 0 phantom.

## Delivery status
- **S1 ✅ SHIPPED** (2026-09-25) — types reconcile (10 interfaces) + kinds/objects/hierarchy CRUD + cycle guard.
  Double-gated (SHIP/SHIP) + preflight + Verification Gate (22 live-store tests, @vida/core 1344 green, tsc 0,
  eslint 0) + independent code-review (SHIP, 4 MINOR folded). Currency: `current-{spec,business-rules}.md`.
- **S2–S4 ✅ SHIPPED** (2026-09-25…27) — containers/refs/link+tag · review engine ① (methods/curves/bindings) ·
  review engine ② (due/record/derive/rollup). See task file Route History + `current-*`.
- **S5 ✅ SHIPPED** (2026-09-29) — measurement source + Education seams (KNO-25/26/27/42). `getMasterySource` composes
  S4's `rollupMastery`; the two Education signals are deny-safe `null` (forward-dep). Double-gated (REVISE→SHIP folding
  F1 Subject-disambiguation / F2 KNO-42 latency-proof / F3 no-log-claim + preflight PASSED + gate-2 SHIP/2 NITs) +
  Verification Gate (3 live-store tests, @vida/core **1392** green, tsc 0, eslint 0) + independent code-review (SHIP, 0
  findings). PLAN: `PLAN-s5.md`.
- S6–S8: pending.

## Open decision for the gate
- **D1 review-engine home** (`foundation/review/` vs `services/knowledge/`) — grounded above; the critic should confirm.
- **Slice count (8)** matches the finance scale; the module is the largest MOD (56 legs). Multi-session by design.
