# Intent Coverage — mod-knowledge (#50, LIF-128) · Antigravity vs Intent vs Rebuild

> Final intent cross-search before implementation. Columns: **Intent** (the 56-leg roster,
> `backend-intent/parts/knowledge.md` + `decomposition.md:65`) · **Antigravity** (what the discarded branch
> `mod-knowledge` actually shipped — verified from its committed `service.ts`: 15 methods, 0 engine/seam lines,
> 5 tests) · **Rebuild slice** (where it ships) · status legend: ✅ delivered · ◐ partial/shallow · ✗ wrong
> · ❌ absent.

## Headline: Antigravity lost the core

The 15 shipped methods are **object/kind/container/reference CRUD + 1 broken mastery read**. Everything that makes
Knowledge _Knowledge_ — the **generic review engine** (methods/curves/bindings/due/record), **mastery derivation +
rollup**, the **measurement-source contract to Education**, **compound sets**, the **Knowledge Lab**, **cross-module
links/tags/pages**, **events/journal**, and the **real flashcards study-method** — is absent (0 lines). Of the ~13
legs touched, several are partial or wrong. **43 of 56 legs are entirely absent.**

## Coverage matrix

### A. Objects · Kinds · Containers · References (the part Antigravity attempted)

| Leg                                             | Intent                                           | Antigravity                                                                               | Rebuild                             |
| ----------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------- | ----------------------------------- |
| KNO-01 createKind                               | user-extensible kind, realm, defaultMethod, FLAT | ◐ `createObjectKind` — no realm-default wiring                                            | S1 ✅                               |
| KNO-02 listKinds                                | read registry                                    | ✅ `listObjectKinds`                                                                      | S1                                  |
| KNO-03 seed topic/concept/definition            | idempotent first-run seed, editable/removable    | ❌ **absent** (no `seedDefaultKinds`)                                                     | S1 ✅                               |
| KNO-04 createObject                             | nested under Topic                               | ✅                                                                                        | S1                                  |
| KNO-05 updateObject (mastery read-only)         | no mastery setter                                | ✗ **BUG** — `Update=Create.partial()` **allows setting `mastery_level`** (KN-9 violation) | S1 ✅ (mastery omitted from schema) |
| KNO-06 getObject                                | read one                                         | ✅                                                                                        | S1                                  |
| KNO-07 listObjects(filter)                      | by container/kind/parent + status/difficulty     | ◐ **no filter** — lists all                                                               | S1 ✅ (filtered)                    |
| KNO-08 reject broken kind/parent + cycle        | integrity at write                               | ◐ cycle guard ✅ but **no parent-exists check**                                           | S1 ✅ (both)                        |
| KNO-09 KN-2 boundary (never == Education Topic) | invariant                                        | ❌ absent                                                                                 | S1 ✅ (documented invariant)        |
| KNO-12 createContainer                          | module/area/subject                              | ✅                                                                                        | S2                                  |
| KNO-14 listContainers(view)                     | regroup per view                                 | ◐ **no view regroup**                                                                     | S2 ✅                               |
| KNO-29 addReference                             | first-class Reference                            | ✅                                                                                        | S2                                  |
| KNO-30 listReferences                           | by object                                        | ✅                                                                                        | S2                                  |
| KNO-41 typed errors + optimistic revert         | LF-2                                             | ◐ 3 error classes, **no optimistic-revert semantics**                                     | S1 ✅                               |

### B. Generic Review Engine — the core (0 lines in Antigravity)

| Leg                                      | Intent                                                   | Antigravity                                                                                          | Rebuild                 |
| ---------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ----------------------- |
| KNO-15 listMethods                       | read `kind=study_method` registry partition              | ❌                                                                                                   | S3                      |
| KNO-16 registerMethod                    | register into capability registry (not a parallel store) | ❌                                                                                                   | S3                      |
| KNO-17 listCurves · KNO-18 defineCurve   | curves; SM-2=one preset                                  | ❌                                                                                                   | S3                      |
| KNO-19 bindMethod · KNO-20 realm-default | polymorphic bind; default from `learning_realm`          | ❌                                                                                                   | S3                      |
| KNO-21 getDue/dueIn                      | due-queue provider (scheduler + flashcards read it)      | ❌                                                                                                   | S4                      |
| KNO-22 recordReview                      | log `review_event` → re-derive                           | ❌                                                                                                   | S4                      |
| KNO-23 derive mastery                    | COMPUTED from events under bound curve                   | ✗ **WRONG** — `lastQuality ?? mastery ?? 0` conflates SM-2 0–5 with 0–100 mastery, single last event | S4 ✅ (real derivation) |
| KNO-24 rollup kind→Topic→Unit→Subject    | up the spine                                             | ❌                                                                                                   | S4                      |

### C. Measurement source → Education · D. Cross-module link/tag/pages

| Leg                                               | Intent                         | Antigravity | Rebuild             |
| ------------------------------------------------- | ------------------------------ | ----------- | ------------------- |
| KNO-25 getMasterySource (advertise)               | 3-signal source to Education   | ❌          | S5                  |
| KNO-26 paceVsSyllabus · KNO-27 assessmentResults  | forward-dep signals            | ❌          | S5 (deny-safe seam) |
| KNO-42 flag measurement mismatch                  | No-Guessing                    | ❌          | S5                  |
| KNO-10 link/unlinkObject · KNO-11 many-book links | via `entity_links`             | ❌          | S2                  |
| KNO-13 tagMembership · KNO-45 migrate tags        | via `entity_tags`              | ❌          | S2                  |
| KNO-28 openObjectNote → pages                     | knowledge note = a `pages` row | ❌          | S6                  |

### E. Compound sets · Lab · Search · Auto-population

| Leg                                                      | Intent                         | Antigravity | Rebuild                      |
| -------------------------------------------------------- | ------------------------------ | ----------- | ---------------------------- |
| KNO-31 buildCompoundSet · KNO-32 applyDefaultCompoundSet | builder + shipped default      | ❌          | S6                           |
| KNO-33 AI-assist compound                                | extension-model, consent-gated | ❌          | S6 (ai seam)                 |
| KNO-34 createLabEntry · 35 conclude · 36 promote         | Knowledge Lab                  | ❌          | S6                           |
| KNO-37 searchKnowledge                                   | FTS5 (DB-8 not built)          | ❌          | S6 (search-unavailable seam) |
| KNO-43 auto-population                                   | syllabus/TOC, opt-in           | ❌          | S6 (ingestion seam)          |

### F. Flashcards sub-service (Antigravity = bare CRUD only)

| Leg                                                                   | Intent                               | Antigravity               | Rebuild |
| --------------------------------------------------------------------- | ------------------------------------ | ------------------------- | ------- |
| FC-01 Card CRUD                                                       | lean content card                    | ◐ create/update/list only | S7 ✅   |
| FC-02 register as study_method                                        | capability registry                  | ❌                        | S7      |
| FC-03 review_session over due cards                                   | ADR-004 session                      | ❌                        | S7      |
| FC-04 generateCards (gather) · FC-08 source-delete survives           | entity_links source                  | ❌                        | S7      |
| FC-05 card-type validation                                            | basic/reversed/cloze/image-occlusion | ❌                        | S7      |
| FC-06 emit-only, never computes mastery                               | boundary invariant                   | ❌                        | S7      |
| FC-07 CardNotBound · FC-09 curve-change future-only · FC-12 lifecycle | explicit states                      | ❌                        | S7      |
| FC-10 review-emit retry/surfaced · FC-11 taggable/linkable            | effect rail + tags/links             | ❌                        | S7      |

### G. Events + Journal

| Leg                                                             | Intent                   | Antigravity | Rebuild                                                                                                                       |
| --------------------------------------------------------------- | ------------------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| KNO-38 object.created · 39 review.recorded · 40 mastery.changed | effect fan-out           | ❌          | ✅ S8 (PUSH review.recorded/mastery.changed onto the rail; object.created/lab.concluded = journal-pull per ADR-004 §3.2.5:84) |
| (journal contribution)                                          | daily-dashboard snapshot | ❌          | ✅ S8 (`registerKnowledgeJournal`, dated digest)                                                                              |

## Tally

- **✅ delivered (adequate):** 6 legs (KNO-02,04,06,12,29,30) + cycle-guard half of 08.
- **◐ partial/shallow:** 6 (KNO-01,05*,07,14,41, FC-01) — *05 is actively wrong (mastery settable).
- **✗ wrong:** 1 (KNO-23 mastery scale bug).
- **❌ absent:** 43 legs — the entire review engine, measurement source, links/tags/pages, compound sets, lab, search, auto-population, events/journal, and FC-02…12.
- **Non-code debt:** 7 scratch `.cjs` at repo root · provenance-stripped `@vida/types` · false "S1–S5 COMPLETE" claim (own slice-map said S5 pending) · 5 tests total · unmerged/ungated.

## How the rebuild ships it properly — every slice, all gates

Each of S1–S8 runs the **full Entity Delivery Flow per-slice gate** (no exceptions, the discipline Antigravity skipped):

1. **PLAN** (`/document-context` baseline → `/documentation-component` spec, every rule `[FACT: src]`)
2. **gate-1 `/critique`** (independent, disk-verified) → fold REVISE → **Approval 1**
3. **`/preflight`** (API/feasibility completeness) → **gate-2 `/critique`** → fold → **Approval 2**
4. **IMPLEMENT** strictly from §5 (factory-object, no `this.`, `encryptedFields:[]`, backfill defaults, soft-delete-filtered lists) — any divergence → **§XXVIII Deviation Protocol** (stop + re-gate)
5. **Verification Gate (blocking)** — functional + **live-store** tests (Node 24), `@vida/core` typecheck 0, eslint 0, full suite green, no regression
6. **Independent code-review** → fold
7. **§XXIX Currency** — promote to `docs/modules/knowledge/current-{spec,business-rules}.md`, commit together
8. **Close-out** — pre-ship `/critique` SHIP → PR → merge → `/session-end` → LIF-128 truly Done

**Status now:** **S1–S8 all shipped — ① COMPLETE** (each ran the full cycle; S8 code-review clean + 1 efficiency fold).
The Decomposition Gate already proved all 56 legs are homed once (independent critic SHIP) — this matrix proves the
rebuild's slice map closes 100% of the Antigravity gap.
