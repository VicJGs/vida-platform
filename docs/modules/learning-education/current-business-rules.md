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

## Shipped invariants (as of S2 — subjects + routing enforcement)

- **BR-LE-S2-1 (subjects always routable, routing enforced / ED-3 + A1)** — `createSubject`/`updateSubject`
  validate a GIVEN routing ref (curriculum_id and/or term_id) resolves to a live, consistent chain, else
  `UnroutedSubjectError`. An EMPTY routing (neither given) is **allowed** — a lone subject, organized later.
  Grounding (doc-reconciled): schema `curriculum_id` nullable "per A1 optional depth" (learning.ts:100) + subjects
  "sparse and progressively fillable" (ED-14, identity.md:49-50); the pre-DB-4 "never an orphaned flat list"
  (ED-3) targets the v2 flat-list anti-pattern, not a creation mandate. `[code: service.ts assertRouting]`
- **BR-LE-S2-2 (progress never settable / R2/M3)** — `progress` is absent from `CreateSubjectSchema`/
  `UpdateSubjectSchema` (Zod strips a force-passed value), hardcoded `null` on create, never in the update patch.
  Derivation lands at S8. `[code: service.ts createSubject/updateSubject; validators/learning.ts]`
- **BR-LE-S2-3 (DB-11 `Course`→`Subject` complete)** — `@vida/types` `Course` is REPLACED by `Subject`: inline
  `tags` retired (→ entity_tags, SP1/S9), `progress`→nullable (M3), `total_modules`/`completed_modules`→nullable,
  +`curriculum_id`/`term_id`/`degree_tier`; `course_type` kept as a nullable subject modality (R6). The
  `CourseType`/`CourseStatus` tuples are retained (schema + validators). No remaining `Course` interface consumer.
  `[code: packages/types/src/learning.ts]`
- **BR-LE-S2-4 (metadata defensive parse / R10)** — `subjects.metadata` is a superseded TEXT [E] slot; `toSubject`
  parses it defensively (malformed/non-JSON ⇒ `null`, never throws) and S2 writes no metadata (create sets null).
  `[code: service.ts parseMetadata/toSubject]`
- **BR-LE-S2-5 (listSubjects filter + R4)** — `listSubjects({curriculumId?, termId?, status?})` always filters
  `isNull(deleted_at)` (findWhere skips the auto filter); empty filter = all live subjects. `[code: service.ts listSubjects]`

## Shipped invariants (as of S3 — curriculum fork + lineage, ED-11/A3/H10)

- **BR-LE-S3-1 (fork = deep copy + lineage)** — `forkCurriculum(sourceId, {name?})` creates a NEW curriculum
  (fresh UUIDv7/`_sync_*`/timestamps) with `forked_from_id = sourceId`, `program_id = source.program_id`,
  `name = input.name ?? source.name`, `description = source.description`; it deep-copies the source's LIVE terms
  and LIVE subjects into the new tree. `[code: service.ts forkCurriculum]`
- **BR-LE-S3-2 (base never mutated — by construction)** — the fork writes EXCLUSIVELY new rows; no write path
  targets a source row, so "base never mutated on fork" is a structural invariant, not a runtime guard. `[code: service.ts forkCurriculum — every create targets newCurriculum.id; the one update targets a cloned term id]`
- **BR-LE-S3-2b (`TemplateImmutableError` = exported vocabulary, NOT wired / R9)** — because the base is never
  mutated by construction, there is no M1-reachable site that writes a template, so `TemplateImmutableError` is
  EXPORTED typed vocabulary with no wired throw (the `IntegrationConsentError` precedent). It is NOT wired to
  `updateCurriculum`, child writes, or deletion; `updateCurriculum` is unchanged from S1 (an update on a template
  still succeeds). `[code: types.ts TemplateImmutableError (exported, never thrown); service.ts updateCurriculum unchanged]`
- **BR-LE-S3-3 (the fork is a working instance — `is_template=false`)** — the copy is created with
  `is_template=false` (the F5 structural default "a new curriculum is not a template"; `db-4-learning-education/_index.md:151`);
  `is_template` is immutable on fork — written to neither the base nor `true` on the copy. `[code: service.ts forkCurriculum is_template:false]`
- **BR-LE-S3-4 (term hierarchy remapped)** — two-pass: clone each live term with `parent_term_id:null`, build an
  old→new id map, then set each clone's `parent_term_id` to the CLONED parent via the map. A parent not in the
  live set (soft-deleted/absent) ⇒ clone `parent_term_id` stays `null` (no-FK leaf tolerance, R5). `[code: service.ts forkCurriculum term two-pass]`
- **BR-LE-S3-5 (routing SHAPE preserved; refs remapped; progress reset; metadata preserved)** — a cloned subject
  remaps ONLY refs that were set: `curriculum_id = src.curriculum_id==null ? null : new.id`,
  `term_id = src.term_id==null ? null : map.get(src.term_id) ?? null` (a term-only subject keeps `curriculum_id`
  null; a dangling term ref drops to null). `progress` is reset to `null` (derived override, never cloned, R2/M3);
  `metadata` is preserved verbatim (diverges from `createSubject`'s null). `[code: service.ts forkCurriculum subject create]`
- **BR-LE-S3-6 (the complete subject set)** — a subject belongs to the source curriculum if
  `curriculum_id = source` OR `term_id ∈ {source live term ids}` (a subject may route by term only). Fork gathers
  the union in one `or()` query (each row returned once; empty term set short-circuits `inArray`). `[code: service.ts forkCurriculum subject query]`
- **BR-LE-S3-7 (per-row, eventually-consistent — NOT transactional / R5)** — the deep-copy is a sequence of
  `repository.create`s (curriculum → terms → subjects); no-FK eventually-consistent, no transaction mandated
  (ADR-016 §3.4). `[code: service.ts forkCurriculum]`
- **BR-LE-S3-8 (soft-deleted children excluded)** — only LIVE (`deleted_at IS NULL`) terms/subjects are copied
  (`findWhere` + explicit `isNull(deleted_at)`, R4). `[code: service.ts forkCurriculum term/subject queries]`
- **BR-LE-S3-9 (source must resolve)** — fork on a missing or soft-deleted source throws `CurriculumNotFoundError`
  (`findById` filters `deleted_at`). `[code: service.ts forkCurriculum]`

## Scope guards honored (the C-* negatives — rerun-ratified)
- **C-HIER** — hierarchy + subject shape is DB-4-done; S1/S2 are CRUD only, no schema redesign.
- **C-E2 / C-M5 / C-HW / C-AI4** — not yet touched at S1/S2 (no economy grant, no `advertise()`, no homework table,
  no AI agent); enforced from the slices that introduce those seams (S8/S10).
