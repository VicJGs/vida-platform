# PLAN — mod-learning-education ① · S3 — Curriculum fork + lineage

Session: 2026-10-03-mod-learning-education · Slice **S3 of 10** · Legs **ED-11 · A3 · H10**
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1) · Gate: §XXVI (this file = gate 1 = the SPEC)
Branch: `mod-learning-education` (worktree) · Env: Node 24 via nvm
No-Guessing: every claim is `[FACT: source]` / `[INTERP: from fact]` / `[UNKNOWN]`.

> Front Matter (Intake → Baseline → Interpretation → Decomposition Gate / Approval 1) is already GRANTED at the
> entity level (task slice log). This is the per-slice Service-Build-Flow spec for S3 only.

---

## 1. Context (BASELINE — verified current)
`createLearningEducationService` over DB-4 `024_learning_education`. S1 (hierarchy spine + routing) and
S2 (subjects + DB-11 reconcile) shipped. `current-spec.md` / `current-business-rules.md` (2026-10-02) match
`services/learning-education/service.ts` as-is — no drift since S2. `[FACT: service.ts:247-286 createCurriculum; current-spec.md:33-34]`

S3 extends the **curricula** surface only. The schema is finished (no DDL): `curricula.forked_from_id`
(nullable, no-FK lineage) and `curricula.is_template` (boolInt, default false) already exist.
`[FACT: learning.ts:201-202]` `createCurriculum` already hardcodes `forked_from_id:null` and leaves the
fork + lineage to S3. `[FACT: service.ts:257; BR-LE-S1-4]`

## 2. Business Rules (promote to BR-LE-S3-* at §XXIX)

- **BR-LE-S3-1 (fork = deep copy + lineage / ED-11).** `forkCurriculum(sourceId, {name?})` creates a NEW
  curriculum (fresh UUIDv7, fresh `_sync_*`/timestamps) whose `forked_from_id = sourceId`, `program_id =
  source.program_id`, `name = opts.name ?? source.name`, `description = source.description`, and deep-copies
  the source's LIVE terms and LIVE subjects into the new tree. `[FACT: business-rules.md:52-55; contract.md:13,65; slice-map.md:20]`
- **BR-LE-S3-2 (base never mutated — by construction / A3·H10).** The fork writes EXCLUSIVELY new rows; no
  write path in `forkCurriculum` ever targets a source row. "Base never mutated on fork" is therefore a
  structural invariant, not a runtime guard. After a fork the source curriculum + every source term/subject is
  byte-unchanged (ids, counts, `is_template`, `updated_at`). `[FACT: slice-map.md:20 "Base never mutated on fork"; conventions.md:45; business-rules.md:55]`
- **BR-LE-S3-2b (`TemplateImmutableError` = exported vocabulary, NOT a wired throw / R9).** Because the base is
  never mutated by construction (S3-2), there is **no M1-reachable site** that attempts a base/template write.
  Per **R9** (`a typed error with no M1-reachable deny reason = exported-vocabulary forward-seam`, the
  `IntegrationConsentError` / `PositionConflictPending` precedent), `TemplateImmutableError` is **exported typed
  vocabulary with no wired throw** this slice — it is NOT wired to `updateCurriculum`, child writes, or deletion
  (that was the gate-1 drift Victor caught). `[FACT: interpretation.md R9; contract.md:65 "on attempted write"; slice-map.md:20] [[absent-deny-safe-port-write-is-noop-not-new-error]]`
- **BR-LE-S3-3 (the fork is a working instance, not a template — `is_template=false`).** The copy is created
  with `is_template = false`. This is doc-FACT, not interpretation: **F5** classifies `curricula.is_template`
  default 0 as an *"unambiguous-semantic structural boolean default"* (the `ics.is_active`-default class) ⇒
  "a new curriculum is NOT a template"; a fork is a newly-created curriculum, so it takes that default — and the
  same rule **contradicts** an "inherit `true`" reading (a new curriculum is never a template unless explicitly
  made one, which the fork never does). `contract.md:13` reinforces it by modeling the fork as
  `createCurriculum(programId, {fromTemplate?})` — through the default-bearing create path. So "`is_template`
  immutable on fork" = the fork writes the flag to NEITHER the base (untouched, S3-2) NOR `true` on the copy
  (structural default `false`). `[FACT: db-4-learning-education/_index.md:151 (F5) + :109; contract.md:13; slice-map.md:20; service.ts:258 default false]`
- **BR-LE-S3-4 (term hierarchy remapped / ED-12).** Each cloned term gets a fresh id; a source term's
  `parent_term_id` is remapped to the CLONED parent's new id via an old→new id map. A `parent_term_id`
  pointing to a soft-deleted/absent parent (not in the live set) ⇒ `null` on the clone (no-FK leaf
  tolerance, the `resolveParentChain` precedent). `[FACT: learning.ts:215; BR-LE-S1-5 no-FK leaf tolerance]`
- **BR-LE-S3-5 (routing SHAPE preserved; refs remapped; derived state reset).** A deep-copy preserves each
  subject's routing SHAPE — **remap only refs that were SET, leave a null ref null** (do NOT normalize a
  term-only subject to dual routing):
  `curriculum_id = (src.curriculum_id == null ? null : new.id)`;
  `term_id = (src.term_id == null ? null : map.get(src.term_id) ?? null)`.
  A term-only subject (`curriculum_id` null) keeps `curriculum_id` null and still resolves to the new
  curriculum via its remapped term. All other user-content fields copy verbatim (incl. `metadata`, see N1);
  **`progress` is set to `null`, never copied** — derived override (R2/M3), never a stored value to clone.
  `[FACT: service.ts:364 progress:null; BR-LE-S2-1 term-only routing; BR-LE-S2-2; business-rules.md:48-49] (B1 fix)`
- **BR-LE-S3-6 (the complete subject set).** A subject "belongs to" the source curriculum if
  `curriculum_id = sourceId` **OR** `term_id ∈ {source live term ids}` (a subject may route by term only,
  A1). Fork copies the UNION (deduped by id). `[INTERP: learning.ts:100-101 both refs nullable; BR-LE-S2-1 empty/partial routing]`
- **BR-LE-S3-7 (per-row, eventually-consistent — NOT transactional / R5).** The deep-copy is a sequence of
  `repository.create`s in dependency order (curriculum → terms → subjects). **R5** governs: `no FK anywhere;
  cross-table integrity is app-layer; a dangling ref is tolerated (no-FK eventually-consistent)` — so a partial
  fork is a tolerated eventually-consistent state, re-drivable; no transaction is mandated (inventing one was
  gate-1 drift). `[FACT: interpretation.md R5; learning.ts:37]`
- **BR-LE-S3-8 (soft-deleted children excluded).** Only LIVE (`deleted_at IS NULL`) terms/subjects are
  copied (`findWhere` + explicit `isNull(deleted_at)`, R4). `[FACT: BR-LE-S1-6; interpretation.md R4; service.ts:332-336]`
- **BR-LE-S3-9 (source must resolve).** `forkCurriculum` on a missing or soft-deleted source throws
  `CurriculumNotFoundError` (fail-loud; `findById` already filters `deleted_at`). `[FACT: service.ts:277-279]`

### Scope guards (negatives — all doc-grounded, No-Guessing)
- **No fork precondition on `is_template`.** `forkCurriculum` accepts ANY live curriculum as source
  (template or not) — no doc restricts fork to templates. `[INTERP: business-rules.md:52-55 "forks it … or builds from scratch"]`
- **No `updateCurriculum` / child / deletion guard.** S3 touches only `forkCurriculum` (+ exported error). It
  does NOT change `updateCurriculum`, `updateTerm/Subject`, or `deleteCurriculum`. The doc scopes immutability
  to the FORK ("Base never mutated **on fork**"), not to a general template write-lock. Deletion non-cascade
  (`forked_from_id` may dangle tolerantly) is the existing no-FK behavior, unchanged. `[FACT: slice-map.md:20; business-rules.md:76; interpretation.md R5]`

## 3. Contract (append to `LearningEducationService`)

```ts
// types.ts
export interface ForkCurriculumInput { name?: string }
export class TemplateImmutableError extends Error { /* exported vocabulary (R9) — see note below */ }

// interface — ONE new method; updateCurriculum/delete/child methods UNCHANGED
forkCurriculum(sourceId: string, input?: ForkCurriculumInput): Promise<Curriculum>
```
- `forkCurriculum` returns the NEW `Curriculum` view (the copied tree is reachable via `listTermsFor(new.id)`
  / `listSubjects({curriculumId:new.id})`). `[INTERP: seam-contract.md:34]`
- Validator: `ForkCurriculumSchema = z.object({ name: z.string().min(1).optional() })` in `validators/learning.ts`.
- **`TemplateImmutableError` is EXPORTED typed vocabulary with NO wired throw this slice (R9 / BR-LE-S3-2b)** —
  the base is never mutated by construction, so there is no M1-reachable write site to throw at (the
  `IntegrationConsentError` books-S10 precedent: exported, not wired). `CurriculumNotFoundError` (reused) is the
  only error `forkCurriculum` actually throws.
- No `@vida/types` change (Curriculum/Term/Subject exist); no schema/migration change; no `updateCurriculum` change.

## 4. Acceptance (live-store, Node 24 — the blocking Verification Gate)
1. **Deep copy** — source (2 terms incl. 1 nested + 3 subjects) → new curriculum: `forked_from_id=source`,
   `is_template=false`, 2 fresh terms, 3 fresh subjects.
2. **Hierarchy remap** — the nested term's `parent_term_id` on the clone = the cloned parent's NEW id (not source's).
3. **Subject routing remap** — cloned subjects' `curriculum_id` = new id; `term_id` = remapped new term id.
4. **Fresh identity** — no cloned row shares an id with any source row; `_sync_*`/timestamps regenerated.
5. **Base untouched** — source curriculum/terms/subjects unchanged (ids, counts, `is_template`) post-fork.
6. **progress reset** — cloned subjects have `progress = null`.
7. **Term-only subject** (curriculum_id null, term_id set) is copied with `curriculum_id` STILL null
   (shape preserved, B1) + `term_id` = remapped new term id (BR-LE-S3-5/6).
8. **Soft-deleted children excluded** — a soft-deleted source term/subject is NOT copied (BR-LE-S3-8).
9. **Dangling parent** — a term whose `parent_term_id` references a soft-deleted parent ⇒ clone `parent_term_id=null`.
10. **name** — `{name:'X'}` ⇒ `new.name='X'`; omitted ⇒ `new.name=source.name`.
11. **Not found** — `forkCurriculum(missing)` and `forkCurriculum(soft-deleted)` ⇒ `CurriculumNotFoundError`.
12. **Fork a template** — source `is_template=true` forks fine; copy `is_template=false`; base template byte-unchanged (S3-3).
13. **Empty source** (N2) — fork a curriculum with zero terms/subjects → new curriculum copied, empty tree, no crash.
14. **`TemplateImmutableError` exported** — importable from the barrel as typed vocabulary (R9); no wired throw
    (the `IntegrationConsentError` export-test precedent). `updateCurriculum` on a template still succeeds (UNCHANGED).
+ Gate: `tsc` 0 · full `@vida/core` green (1557 + new) · eslint 0 · gitleaks clean.

## 5. Implementation Prompt (strict build sequence)
1. **types.ts** — add `ForkCurriculumInput`, `forkCurriculum` to the interface, and `TemplateImmutableError`
   (exported vocabulary per R9 — define the class; do NOT wire it to any throw site).
2. **validators/learning.ts** — add `ForkCurriculumSchema`.
3. **service.ts — `updateCurriculum` is UNCHANGED** (no template guard — that was gate-1 drift; R9/BR-LE-S3-2b).
4. **service.ts — `forkCurriculum(sourceId, input)`** (writes ONLY new rows; never touches the source, S3-2):
   a. `const src = await curriculaRepo.findById(sourceId)`; `!src` → `CurriculumNotFoundError`.
   b. parse `ForkCurriculumSchema`; create new curriculum (program_id=src, name=input.name??src.name,
      description, `forked_from_id:sourceId`, `is_template:false`, deleted_at:null).
   b′. parse input defensively: `ForkCurriculumSchema.parse(input ?? {})` (optional param → `{}`, A2).
   c. live terms = `termsRepo.findWhere(and(isNull(terms.deleted_at), eq(curriculum_id, sourceId)))`.
      Pass 1 — create each new term under new.id with `parent_term_id:null`, copying `level`/`name`/
      `start_date`/`end_date` verbatim (the createTerm field set, A1); build `Map<oldId,newId>`.
      Pass 2 — for terms whose src `parent_term_id` is in the map, `termsRepo.update(newId,{parent_term_id:map.get})`;
      a src `parent_term_id` NOT in the map (soft-deleted/absent parent) stays `null` (S3-4, no-FK tolerance).
   d. live subjects = one query `findWhere(and(isNull(deleted_at), or(eq(curriculum_id,sourceId),
      inArray(term_id, termIds))))`; `termIds=[]` short-circuits the `inArray` (N2/A3); dedupe by id.
      Create each under new.id, building the `CreateInput`
      **field-by-field from the source Row — never spread the Row** (it carries id/`_sync_*`; `satisfies` guards
      but state it, N1): `curriculum_id: src.curriculum_id == null ? null : new.id` (SHAPE-preserving, B1),
      `term_id: src.term_id == null ? null : map.get(src.term_id) ?? null`, `metadata: src.metadata` (raw text,
      PRESERVED — diverges from createSubject's null, N1), `progress: null`, deleted_at:null, all other fields verbatim.
   e. return `toCurriculum(newCurriculumRow)`.
5. **index.ts** — export `TemplateImmutableError` + `ForkCurriculumInput` if the barrel re-exports slice types.
6. **tests** — `__tests__/…S3*.test.ts`, the 14 cases in §4, live-store (better-sqlite3, Node 24).
7. **§XXIX currency** — promote BR-LE-S3-1..9 (incl. 2b) → `current-business-rules.md`; add `forkCurriculum` +
   the exported `TemplateImmutableError` (vocabulary, not wired — R9) to `current-spec.md`.

## 6. Decisions / UNKNOWNs
**None.** The three apparent decisions from the first gate-1 draft (fork atomicity · `TemplateImmutableError`
scope · one-way template lock) were **drift — all doc-resolved**, re-grounded per Victor's catch:
- **Atomicity → R5** (`no-FK eventually-consistent`, per-row; no transaction mandate). `[FACT: interpretation.md R5]`
- **`TemplateImmutableError` scope → slice-map + R9** (scoped to the FORK; base never mutated BY CONSTRUCTION ⇒
  error is EXPORTED vocabulary, not wired; no `updateCurriculum`/child/delete guard). `[FACT: slice-map.md:20; interpretation.md R9]`
- **"one-way lock" → does not exist** in any doc (invention; removed). `is_template` stays a normal flag S1 already handles.

Residual now doc-FACT (Victor's catch — ground it, don't carry as INTERP): copy `is_template=false` is settled by
**F5** (`_index.md:151` structural-default rule ⇒ "a new curriculum is not a template", which also rules out
inherit-`true`) + `contract.md:13` (fork = create-from-template path) — see BR-LE-S3-3. Subject routing SHAPE
preserved on copy = FACT per BR-LE-S2-1 (BR-LE-S3-5). `[[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]]`
