---
Session 2 — 2026-09-25
Goal: mod-knowledge (#50, LIF-128) ① backend — resume + ship S2 (Containers + References + link/tag cross-cut)
Profile: Add Backend Component / Default (Entity Delivery Flow v1)
---

## Accomplished
- **Shipped S2** (of 8) — committed `bc88904` on branch `mod-knowledge-rebuild`. 12 methods on
  `createKnowledgeService` composing shipped substrates (SpacesService writes / BacklinkResolver reads).
  Legs KNO-10,11,12,13,14,29,30,45. @vida/core **1363/1363**, tsc 0, eslint 0.
  - Containers (KNO-12/14): `createContainer`/`listContainers`/`deleteContainer` over `knowledge_containers`.
  - References (KNO-29/30): `addReference`/`listReferences`/`removeReference` (first-class, replaces resource_urls).
  - Links (KNO-10/11): `linkObject`/`unlinkObject`/`listLinks` — write via `spaces.createLink` (object id =
    `page_id` source anchor), read via `backlinks.getLinksFrom`; many book links; never `resource_type` (KN-6).
  - Tag membership (KNO-13/45): `tagMembership`/`untagMembership`/`listMemberships` — write via `spaces.tagEntity`,
    read via read-only `entityTagRepo`; KN-45 = ratification (inline tags retired in S1).
- Full Entity Delivery Flow: PLAN-s2 → gate-1 REVISE (5 folds) → Approval 1 → preflight PASSED + gate-2 SHIP →
  Approval 2 → implement → Verification Gate (19 S2 live-store tests through real spaces/backlinks) →
  independent code-review SHIP (1 fold) → §XXIX currency. Three independent adversarial passes + pre-ship /critique.
- §XXIX currency promoted: `docs/modules/knowledge/current-{spec,business-rules}.md` (BR-KN-S2-1…10).
- Memory saved: [[spaces-junctions-split-read-write-tagentity-blind-inserts]] (recurring junction trap for S7 + others).

## Decisions Made
- **Compose both substrate halves** — the resolvers are READ-only; `SpacesService` owns all entity_links/entity_tags/
  tag WRITES. `decomposition.md:54,56` ("link/tag via the resolvers") was imprecise; corrected per NotesService.
  Deps grew (+`spaces`,+`backlinks`, required — not deny-safe optional, since linking/tagging is core to S2).
- **Container membership = caller-supplied `scopedTag`** — `knowledge_containers` has no `root_tag_id` column, so the
  binding cannot live in the schema; the doc-fixed `tagMembership(containerId, memberRef, scopedTag)` signature carries it.
- **F1 silent-orphan guard** — `spaces.tagEntity` blind-inserts an unresolved `tag_id`; `tagMembership` asserts the
  scopedTag exists (create-path only; untag stays cleanable). Gate-1 caught this pre-code.
- **F2 listMemberships** — added a tag read (a write leg needs a verifiable read; NotesService getEntitiesByTag precedent).
- **F5 / code-review: `ReferenceNotFoundError`** — distinct from the object error for catch-precision.

## Open Questions
- none blocking. Watch next session: **S3 populates `foundation/review/`** (the reserved empty stub) per decision D1 —
  `listMethods`/`registerMethod` are thin wrappers over `createCapabilityRegistry` (kind='study_method', OPEN vocab),
  NOT a parallel store; `listCurves`/`defineCurve` over `review_curves`; `bindMethod` over `method_bindings`. The
  caller-supplied scopedTag lifecycle (who creates the container's tag) is a documented seam the P6 UI must honor.

## Next Session
First step: `/begin` → resume at **S3 — Review engine ①: methods registry + curves + bindings** (KNO-15,16,17,18,19,20).
Same PLAN → double-gate → Verification Gate → code-review → currency cycle. First slice to build into `foundation/review/`.
Context to reload: `docs/modules/knowledge/delivery/decomposition.md` (§S3 + D1), `current-{spec,business-rules}.md`,
`docs/features/knowledge/business-rules.md` (KN-4/KN-8 realms + method binding), `parts/knowledge.md:120` (the D1 P3 call),
`foundation/capability` + `foundation/measurement` (composed substrates). Use `nvm use 24` for tests.
