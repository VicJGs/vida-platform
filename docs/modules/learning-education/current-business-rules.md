<!-- CURRENT-BUSINESS-RULES · module: learning-education · living invariants (§XXIX) · never lags the code -->

# Learning: Education — CURRENT BUSINESS RULES  (`@vida/core` `services/learning-education`)

> The invariants the code enforces, promoted per slice from the slice PLANs. Inherits the CORE constitution
> (ZK-1/2/3, LF-1/2/3). Born at S1 (LIF-130, #52). Source rules: `docs/features/learning/education/business-rules.md`
> (ED-1..16) + `docs/specs/foundation/db-4-learning-education/_index.md` (BR-ED-*) + the delivery interpretation
> (R1..R10).

## Shipped invariants (as of S1 — hierarchy spine + routing)

- **BR-LE-S1-1 (one hierarchy, two modes / ED-2)** — every `Program` parents to an `institution` OR a
  `self_taught` row via `parent_type`+`parent_id`; the two are SEPARATE tables (H2), never one mode flag.
  `[code: service.ts createProgram; schema/learning.ts programs]`
- **BR-LE-S1-2 (parent resolves on create / ED-2, no-FK)** — `createProgram`/`createCurriculum`/`createTerm`
  validate the immediate parent exists and throw the typed `*NotFoundError` (fail-loud, the BookNotFound
  precedent). No FK exists in the DB (ADR-016 §3.4) — integrity is service-enforced; an orphan is never written.
  `[code: service.ts assertParentExists / createCurriculum / createTerm]`
- **BR-LE-S1-3 (terms are hierarchical / ED-12)** — `terms.level` ∈ {year,semester,term}; a `parent_term_id`
  (year ⊃ semester ⊃ term) is optional but, when given, must resolve (`TermNotFoundError`). `[code: service.ts createTerm/updateTerm]`
- **BR-LE-S1-4 (curriculum fork deferred / ED-11)** — `createCurriculum` always sets `forked_from_id:null`
  (a scratch build has no lineage); the fork deep-copy + lineage pointer lands in S3. `is_template` default false.
  `[code: service.ts createCurriculum]`
- **BR-LE-S1-5 (routing primitive / ED-3)** — `resolveParentChain({curriculumId?, termId?})` returns
  `{ok, curriculum, term, program}`. `ok` is true iff every GIVEN ref resolved to a LIVE (non-soft-deleted) row
  AND the chain is consistent (a given termId's `curriculum_id` must equal a given curriculumId). The program is
  resolved via the curriculum; a dangling program ref does NOT flip `ok` (no-FK leaf tolerance). An empty ref ⇒
  `ok:true` with all nulls — S2 owns the "a subject needs ≥1 parent" policy + `UnroutedSubjectError`.
  `[code: service.ts resolveParentChain; tests cover full/curriculum-only/unresolvable/mismatch/empty]`
- **BR-LE-S1-6 (soft-delete + the findWhere filter / R4)** — all 5 hierarchy tables use `softDelete:true`
  (`delete()` soft-deletes; `findById`/`findAll` filter `deleted_at`). The `listXFor` readers use `findWhere`,
  which SKIPS the auto filter, so each adds `isNull(deleted_at)` explicitly. `[code: service.ts listProgramsFor/listCurriculaFor/listTermsFor]`
- **BR-LE-S1-7 (encrypted fields dormant / ED-1, M1.0)** — `name`/`description` are `[E]` but
  `encryptedFields:[]` at M1.0 (pass-through); real field encryption = M3. `[code: service.ts createRepository calls]`
- **BR-LE-S1-8 (DB-11 reconcile started)** — `@vida/types` gained the 5 hierarchy interfaces
  (`Institution`/`SelfTaughtPath`/`Program`/`Curriculum`/`Term`). The `Course`→`Subject` rename + retired-column
  reconcile is S2, not S1. `[code: packages/types/src/learning.ts]`

## Scope guards honored (the C-* negatives — rerun-ratified)
- **C-HIER** — hierarchy shape is DB-4-done; S1 is CRUD only, no schema redesign.
- **C-E2 / C-M5 / C-HW / C-AI4** — not yet touched at S1 (no economy grant, no `advertise()`, no homework table,
  no AI agent); enforced from the slices that introduce those seams (S8/S10).
