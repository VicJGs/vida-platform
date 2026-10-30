# PLAN — mod-learning-education · S7 — Assessments + grade/GPA compute

> **Slice:** S7 of 10 [FACT: slice-map.md:24]. **Unit:** `createLearningEducationService` (append). **Context:**
> `@vida/core` → `packages/core/src/services/learning-education/{service,types}.ts`; `@vida/core/validators` →
> `validators/learning.ts`; `@vida/types` → `packages/types/src/learning.ts` (net-new `Assessment`); composes
> `foundation/measurement/engine` (normalize/rollup). **Gate:** §XXVI (PLAN → /critique → Approval 1 → /preflight →
> /critique → Approval 2 → build) then the per-slice **live-store Verification Gate** (Step 9, blocking) → independent
> code-review → /critique → §XXIX currency. **Baseline:** S1–S6 shipped [FACT: task file Slice log; @vida/core
> 1605/1606, 1 = known vault flake]; front matter + Approval 1 ratified [FACT: slice-map.md; seam-contract.md].
> **No-Guessing:** every claim `[FACT: src]` / `[INTERPRETATION]` / `[UNKNOWN → /preflight]`.

## 1. Objective (S7 only)

Make a Subject's **assessments** real and make **grade + GPA derivable** from them through the S6 grading system,
composing the measurement engine's fractal rollup:
1. **Assessments CRUD** — `createAssessment(subjectId, {type, gradingComponentId?, date?, weight?, maxPoints?,
   modality?, source?})`, `recordResult(assessmentId, score)`, `listAssessments(filter)` over the `assessments` table
   [FACT: seam-contract.md:53-55; schema learning.ts:284-308].
2. **`computeGrade(subjectId) → GradeResult`** — resolve the applicable grading system (subject → program →
   institution), normalize each scored assessment, rollup per component (equal-weight), then rollup components by
   their `weight` (bp). Partial + flagged, never a fabricated number [FACT: slice-map.md:24; business-rules.md:37-38,74,92].
3. **`computeGPA(ref) → GpaResult`** — equal-weight rollup of the per-subject grades across a term (or a curriculum's
   terms' subjects); partial + `flagged` on any mixed/missing system, never fabricated [FACT: contract.md:64;
   business-rules.md:92].

**S7 does NOT:** store a grade column (grade is derived-on-read — BR-LE-S7 below; `subjects.progress` is S8's
measurement override, not touched here), set `education_measurements` / `binding_mode` (S8 — S8's `derived-pull`
pulls `computeGrade`), map a normalized grade to a letter/numeric **label** (the scale-label algorithm is undefined
in the aspect docs → ② / M-later; see BR-LE-S7-6 + §6), emit any effect (S10's dormant `effects?` fan-out), or build
UI (② `fe-learning-education`, P6) [FACT: slice-map.md:24-27,29-32].

## 2. Business Rules (BR-LE-S7-*)

- **BR-LE-S7-1 — An assessment belongs to a Subject; create is fail-loud on the subject + the component.**
  `createAssessment(subjectId,input)` guards the subject exists → `SubjectNotFoundError`, and — when
  `gradingComponentId` is given — guards it resolves to a live `grading_components` row → `GradingComponentNotFoundError`
  (the create-time no-FK integrity convention, BR-LE-S1-2 / the `assertScopeExists` precedent service.ts:862-872)
  [FACT: schema learning.ts:289,291 no-FK; ED-8]. `gradingComponentId` is **nullable** — an unmapped assessment is
  allowed (it just can't be attributed to a weighted component at compute time, BR-LE-S7-4) [FACT: schema
  learning.ts:291 "nullable — which component it counts toward"]. `score` starts `null` (not recorded yet); `source`
  defaults `'manual'` **applied service-side** (`v.source ?? 'manual'`) so the create-echoed row is faithful, not the
  DB column default [FACT: schema learning.ts:300-301; AI6; [[repository-create-returns-input-row-not-db-defaults]]; the
  S5 `addFeed` backfill precedent].
- **BR-LE-S7-2 — `recordResult` sets only the score; the grade is NEVER stored.** `recordResult(assessmentId, score)`
  guards the assessment exists → `AssessmentNotFoundError` (a real throw site — distinct from S4's dropped
  `ClassSessionNotFoundError` which had none), writes `score`, returns the updated `Assessment`. There is no stored
  grade to update: a subject's grade is **derived-on-read** by `computeGrade` [FACT: business-rules.md:37-38 "derived
  … never hand-set as truth"; ED-10 M3 "NULL ⇒ derive, never a NOT NULL DEFAULT 0 counter"; `score` has no range CHECK,
  F6 learning.ts:300]. "grade recomputes" (seam-contract.md:54) = the next `computeGrade` reflects the new score.
- **BR-LE-S7-3 — The applicable grading system resolves by nearest scope: subject → program → institution.**
  `computeGrade` resolves via `listGradingSystems` at each scope ascending the parent chain: a live subject-scope
  system wins; else the subject's program's; else that program's institution's; else none [FACT: business-rules.md:74
  "A subject with no grading system falls back to the program's/institution's"; S6 listGradingSystems service.ts:928].
  **The institution id is DERIVED from the program, not from the chain resolver** — `ParentChainResolution` exposes
  only `{ok, curriculum, term, program}` (no institution field) [FACT: types.ts:166-173], so the helper walks:
  (a) `resolveParentChain({curriculumId: subject.curriculum_id, termId: subject.term_id})` → `.program`
  [FACT: resolveParentChain resolves `program` via `curriculum.program_id` service.ts; Subject.curriculum_id/term_id
  nullable learning.ts:317-318]; (b) institution scope id = `program.parent_type === 'institution' ? program.parent_id
  : (none)` — a **self_taught-rooted program has NO institution scope** (self_taught ∉ `GRADING_SCOPE`), so inheritance
  stops at program [FACT: Program.parent_type/parent_id learning.ts:247-248; GRADING_SCOPE = institution|program|subject
  learning.ts:157]. **No system anywhere ⇒ `grade: null` + flag `'no-system'`** (grade is still measurable by
  deliverable/goal/manual via S8/ED-10, out of S7) [FACT: business-rules.md:74-75]. **>1 live system at the chosen
  scope** (BR-LE-S6-1 allows it) ⇒ pick the most-recently-created deterministically **and** flag `'ambiguous-system'`
  — the "flagged, never a wrong number" rule surfaces the ambiguity rather than throwing [INTERPRETATION:
  business-rules.md:92; BR-LE-S6-1 "multiple per scope allowed"].
- **BR-LE-S7-4 — `computeGrade` is the engine's two-level rollup; partial, never fabricated.** For the resolved
  system: (a) per assessment with a recorded `score`, normalize to [0,1] via `normalize({kind:'quantitative',
  current: score, baseline: 0, target: maxPoints, isHigherBetter: true})` where `maxPoints = assessment.max_points ??
  component.max_points`; an assessment with **no max anywhere** can't be normalized → excluded + flag `'missing-scale'`
  [FACT: engine.ts:14-22; the call shape is byte-identical to the books precedent books/service.ts:1050]. (b) per component, `rollup(assessments → {progress, weight:null})` = equal-weight average
  of its scored assessments → component progress (null if none) [FACT: engine.ts:38-53]. (c) subject grade =
  `rollup(components → {progress, weight: component.weight})` — weighted by `weight` bp; a null/0 weight ⇒ equal-weight
  (engine default); a component with null progress (no scored assessments) is **excluded** by the engine ("an un-rated
  child cannot drag a parent down") → flag `'incomplete'` if any component was excluded [FACT: engine.ts:41-48,
  business-rules.md:92]. **Grouping is BY THE RESOLVED SYSTEM'S component ids.** An assessment is excluded + flags
  `'unmapped-assessments'` when its `gradingComponentId` is null **OR non-null but ∉ the resolved system's components**
  (a no-FK id can point at a *different* system's component — createAssessment only guards it resolves to *a* live
  component, BR-LE-S7-1, not that it belongs to this system) — never a SILENT drop (B3; the loud-partial rule)
  [FACT: schema learning.ts:291 no-FK nullable; business-rules.md:92]. An all-null/empty set ⇒ `grade: null`
  (unmeasured, BR-2), never 0 [FACT: engine.ts:44]. **`score > maxPoints` (extra credit) clamps to `1.0`** via the
  engine's `clamp01` — a grade caps at 100%, no >100% fabrication; no doc defines extra-credit-over-100%, so the
  engine-governed clamp is the No-Guessing default (N3) [FACT: engine.ts:11,21].
- **BR-LE-S7-5 — `computeGPA(ref)` is an equal-weight rollup of per-subject grades; partial + `flagged`.**
  `ref = {type:'term'|'curriculum', id}` (a tagged ref, the `GradingScopeRef` / `setMeasurement` convention — not a
  bare ambiguous string) [INTERPRETATION: seam-contract.md:57 "`computeGPA(termId|curriculumId)`" + the tagged-ref
  convention service.ts GradingScopeRef]. Resolve the subject set: `type:'term'` → subjects with that `term_id`;
  `type:'curriculum'` → subjects where `curriculum_id === id` **OR** `term_id ∈ {terms where term.curriculum_id === id}`
  — the exact S3 `forkCurriculum` subject-union predicate, reused not re-derived [FACT: subjects.curriculum_id/term_id
  learning.ts:317-318; S3 slice log "single-`or()` subject union (curriculum_id OR term_id∈live-terms)"]. Guard the ref
  resolves → `TermNotFoundError` / `CurriculumNotFoundError`. For each subject, `computeGrade`; `gpa =
  rollup(perSubject → {progress: grade, weight:null})` equal-weight (no credit-hours exist in the schema → equal
  weight is the engine default, not a chosen policy) [FACT: engine.ts:48; schema learning.ts — no credits column].
  `flagged = true` iff any subject grade is null OR any per-subject flags are non-empty (partial GPA); an empty/all-null
  subject set ⇒ `gpa: null`, `flagged:true`. **Never a fabricated GPA** [FACT: contract.md:64; business-rules.md:92].
- **BR-LE-S7-6 — Grade is returned normalized [0,1] + scale metadata; the scale-label mapping is NOT S7.**
  `GradeResult.grade` is the normalized [0,1] value; `GradeResult.scaleType` + the parsed `scaleConfig` ride along so
  the display tier can map to A–F / 0–10 / pass-fail. The **letter/numeric boundary algorithm is undefined in the
  aspect docs** (no boundary table anywhere in `docs/features/learning/education/*`) → mapping a normalized grade to a
  label is ② / M-later, not fabricated here (No-Guessing) [FACT: grep clean — scale only named as an enum
  business-rules.md:37; S6 forward-note "scale_config for custom permitted null (S7 grade resolution)" = S7 *reads*
  scale_config, does not invent a mapping]. `[INTERPRETATION → confirm at /critique]`
- **BR-LE-S7-7 — `@vida/types` gains `Assessment` (net-new).** `Assessment extends SyncableEntity` mirroring
  `AssessmentRow` exactly (incl. `deleted_at: number | null`; `score`/`weight`/`max_points` nullable; `source`
  `RecordSource`) [FACT: AssessmentRow learning.ts:366; grep packages/types/src/learning.ts — only `Subject`/grading
  types exist]. `assessments` is `softDelete:true` (`deleted_at` present learning.ts:302).
- **BR-LE-S7-8 — Compute methods never throw on missing data; they return a flagged result.** `computeGrade` /
  `computeGPA` throw ONLY on a bad REFERENCE (unknown subject/term/curriculum, fail-loud); a missing system / missing
  score / unmapped assessment is a **flag on the result**, not a throw [FACT: business-rules.md:92 "a flagged partial,
  never a wrong number as truth"]. `GradeResult` / `GpaResult` are result objects, NOT typed errors.

## 3. Architecture / grounding

**No deps growth — the measurement engine is a DIRECT IMPORT, not a dep (B1, re-grounded).** The seam-contract's
`measurement: { engine }` (seam-contract.md:13) is a design-time sketch; the **live repo convention** imports the pure
engine functions directly: `books/service.ts:143` `import { normalize } from '../../foundation/measurement'`,
`gamification/service.ts:20` `import { assertAcyclic, MeasurementCycle } from '../../foundation/measurement'`, and
**no service injects the engine as a dep** (`grep "engine:" services/*/types.ts` → none) [FACT]. The barrel re-exports
both functions (`foundation/measurement/index.ts:7 export * from './engine'`) [FACT]. `LearningEducationServiceDeps`
even lists its own forward-append plan — "spaces, notes, journalRegistry, attachment?, tasks?, ai?, effects?" — with
measurement deliberately absent [FACT: types.ts:98]. → S7 adds `import { normalize, rollup } from
'../../foundation/measurement'` and grows NO deps. (S8 will do the same; the pure engine is never injected.) No new
deny-safe port in S7 (`ics?`/`attachment?`/`tasks?`/`ai?` are S5/S9/S10). This is the "a frozen seam-contract can
itself be drift → re-derive from the live convention" class [[discontinued-impl-and-frozen-decomposition-are-reference-not-authority]].

**Repos:** `assessments` → `createRepository(..., {softDelete:true, encryptedFields:[]})` (`deleted_at` present;
`title`/`description` are `[E]` but the M1.0 set is `[]`) [FACT: schema learning.ts:292-302;
[[m10-repos-use-empty-encryptedfields-seam]]]. `gradingComponentsRepo` / `gradingSystemsRepo` already exist (S6) —
reused for scope resolution + component lookup.

**Scope resolution helper (`resolveGradingSystem(subjectId) → {system, components, scope} | null`):** per BR-LE-S7-3,
(1) `listGradingSystems({type:'subject', id: subjectId})` → nearest; (2) else
`resolveParentChain({curriculumId: subject.curriculum_id, termId: subject.term_id})` → `.program`, then
`listGradingSystems({type:'program', id: program.id})`; (3) else, when `program.parent_type === 'institution'`,
`listGradingSystems({type:'institution', id: program.parent_id})`; (4) else null. Institution is DERIVED from
`program` (the resolver has no institution field) [FACT: ParentChainResolution types.ts:166-173; Program.parent_type/
parent_id learning.ts:247-248]. A self_taught-rooted program stops inheritance at program (self_taught ∉ GRADING_SCOPE)
[FACT: GRADING_SCOPE learning.ts:157].

**Engine composition (the fractal rollup):** two `rollup` levels + one `normalize` per assessment — the exact
"measurability at every scale" the engine is for [FACT: engine.ts:36-37]. `computeGPA` is a THIRD rollup level over
subject grades. No new math is written in the service; the service only groups rows and calls the engine
[INTERPRETATION: compose-the-engine, [[mastery-measurement-derivation-is-doc-resolved-not-a-decision]]].

**N+1 read (deliberate M1 shape):** `computeGPA` calls `computeGrade` per subject, each of which reads assessments +
resolves the system per subject. N is bounded (one user's subjects in a term); a batched read is an S-later
optimization, OUT of S7. Stated, not silently chosen (the S4 N+1 precedent).

**`listAssessments(filter)`:** `{subjectId?, type?, range?}` — `range` filters on `date` (calendar `YYYY-MM-DD` TEXT,
lexicographic compare is date-correct) [FACT: schema learning.ts:296 calendarDate]. `findWhere` skips the soft-delete
filter → add `isNull(deleted_at)` explicitly [FACT: [[repository-findwhere-skips-softdelete-filter]]; S4/S6 precedent].

## 3b. Pinned result shapes (the ② seam surface — build mirrors verbatim, B4)

These are the `computeGrade`/`computeGPA` return types — the `fe-learning-education` (② P6) consumption surface, so
they are fixed here, not invented at build. They compose existing `@vida/types` enums
[FACT: `GradingScaleType` learning.ts:162, `GradingScope` :158, `GradingComponentType` :174].

```ts
type GradeFlag = 'no-system' | 'ambiguous-system' | 'incomplete' | 'unmapped-assessments' | 'missing-scale'

interface GradeResult {
  subjectId: string
  grade: number | null                 // normalized [0,1]; null = unmeasured (BR-LE-S7-4), never 0
  scaleType: GradingScaleType | null   // from the resolved system; null when 'no-system'
  scaleConfig: Record<string, unknown> | null  // parsed [E] JSON (S6 R10); label mapping = ②/M-later (BR-LE-S7-6)
  systemId: string | null              // which system applied; null when 'no-system'
  systemScope: GradingScope | null     // where it resolved (subject|program|institution)
  components: Array<{
    componentId: string
    componentType: GradingComponentType
    weight: number | null              // BasisPoints (the component template weight)
    progress: number | null            // the component's rolled-up [0,1], null if no scored assessment
    assessmentCount: number            // scored assessments that counted toward this component
  }>
  flags: GradeFlag[]
}

interface GpaRef { type: 'term' | 'curriculum'; id: string }

interface GpaResult {
  ref: GpaRef
  gpa: number | null                   // equal-weight rollup of per-subject grades; null = nothing measurable
  flagged: boolean                     // true iff any subject grade null OR any per-subject flags non-empty
  perSubject: Array<{ subjectId: string; grade: number | null; flags: GradeFlag[] }>
}
```

## 4. Acceptance (§4 — the per-slice Verification Gate, blocking)

Done = **all** of:
- `createAssessment` writes a row (score null, source default 'manual'); unknown subject → `SubjectNotFoundError`;
  a given-but-unresolvable `gradingComponentId` → `GradingComponentNotFoundError`; a null `gradingComponentId` is accepted.
- `recordResult` sets `score`, returns the updated `Assessment`; unknown id → `AssessmentNotFoundError`; NO grade column
  is written anywhere.
- `listAssessments` filters by subjectId / type / date range; soft-deleted rows excluded.
- `computeGrade(subjectId)` — a full system with all components scored → weighted [0,1] grade; a component with no
  scored assessment → `grade` from the rest + flag `'incomplete'`; no system → `grade:null` + `'no-system'`; a null OR
  **foreign-component** `gradingComponentId` → `'unmapped-assessments'` (never a silent drop, B3); assessment with no max
  → `'missing-scale'`; `score > maxPoints` → clamps to 1.0 (N3); two systems at scope → `'ambiguous-system'` +
  deterministic pick; empty → `grade:null` (never 0); result shape matches §3b exactly. Inheritance
  subject→program→institution exercised.
- `computeGPA({type:'term',id})` + `({type:'curriculum',id})` — equal-weight rollup; a partial subject set →
  `flagged:true` with `perSubject` detail; unknown term/curriculum → typed NotFound; empty → `gpa:null, flagged:true`.
- `@vida/types` `Assessment` compiles; `tsc --noEmit` 0; `eslint` 0; **enum-parity** green.
- **Live-store Verification Gate** (real store, Node 24, not fixtures): compute exercised end-to-end over real
  assessment + grading rows (the seam a mocked test bypasses) [[visual-gate-catches-worker-rpc-bugs-unit-tests-bypass]];
  full `@vida/core` suite green (≥ prior + new).
- §XXIX currency: `docs/modules/learning-education/current-*` refreshed (BR-LE-S7-1..8), committed with the code.

## 5. Implementation Prompt (§5 — the build steps, strict order)

1. **`@vida/types/learning.ts`** — add `export interface Assessment extends SyncableEntity { subject_id: string; type:
   AssessmentType; grading_component_id: string | null; title: string | null; description: string | null; date: string
   | null; weight: number | null; max_points: number | null; modality: AssessmentModality | null; score: number | null;
   source: RecordSource; deleted_at: number | null }` (mirror `AssessmentRow` exactly). Barrel already re-exports learning.
2. **`validators/learning.ts`** — `CreateAssessmentSchema` (`type: AssessmentTypeSchema`, `gradingComponentId` nullish,
   `date` nullish `YYYY-MM-DD`, `weight`/`maxPoints` nullish int, `modality: AssessmentModalitySchema` nullish,
   `source: RecordSourceSchema.optional()` — **NOT `z.default`**: the default is applied in the SERVICE
   (`v.source ?? 'manual'`), the S1–S4 column-fidelity convention [FACT: validators/learning.ts:150,201-202,208] +
   create-echoes-input backfill [[repository-create-returns-input-row-not-db-defaults]] (the S5 `addFeed` precedent) —
   so the returned row carries `'manual'`, not `undefined`; `title`/`description` nullish); `RecordResultSchema`
   (`score` number int); `ListAssessmentsSchema` (`subjectId`/`type`/`range{start,end}` nullish). Reuse canonical
   `z.enum` wrappers.
3. **`service/types.ts`** — do NOT grow `LearningEducationServiceDeps` (measurement is a direct import, B1). Add input
   types (`CreateAssessmentInput`, `ListAssessmentsFilter`), the result views **exactly as pinned in §3b**
   (`GradeFlag`, `GradeResult`, `GpaRef`, `GpaResult` — mirror verbatim), and the 5 method signatures on
   `LearningEducationService` (`createAssessment`, `recordResult`, `listAssessments`, `computeGrade`, `computeGPA`);
   add `AssessmentNotFoundError`, `GradingComponentNotFoundError`.
4. **`service/service.ts`** — add `import { normalize, rollup } from '../../foundation/measurement'` (B1, the
   books/service.ts:143 convention); add `assessmentsRepo` (softDelete:true); `toAssessment` mapper (`_sync_status`
   cast); private `resolveGradingSystem(subjectId)` (subject→program→institution per BR-LE-S7-3: institution derived
   from `program.parent_type/parent_id`; ambiguous-scope flag); implement the 5 methods (hoisted closures, no `this.`;
   compute = group rows + call `normalize`/`rollup`); add all to the returned object.
5. **`__tests__`** — a live-store suite: assessment CRUD + typed errors; recordResult sets score only; compute happy
   path (weighted), each flag path (no-system / incomplete / unmapped-**null-id** / unmapped-**foreign-component-id**
   (B3) / missing-scale / ambiguous / empty), `score > maxPoints` clamps to 1.0 (N3), the
   **maxPoints fallback-hit** case (assessment `max_points` null, component `max_points` present → normalized, no flag),
   inheritance (subject / program / **self_taught-program-stops-at-program** / institution), GPA term + curriculum
   (union: `curriculum_id === id` OR `term_id ∈ curriculum's live terms`) + partial + empty + unknown-ref.
6. **tsc 0 · eslint 0 · enum-parity green · full suite green** → Verification Gate → code-review → /critique → §XXIX
   currency (promote BR-LE-S7-* into `current-business-rules.md`; update `current-spec.md` surface) in the build commit.

## 6. Risks / open items

- ~~**B1 — measurement as a dep**~~ — RESOLVED: direct import `normalize`/`rollup` from `../../foundation/measurement`,
  the books/service.ts:143 + gamification/service.ts:20 convention; no dep growth [FACT; §3 + step 3/4].
- ~~**B2 — institution via the chain resolver**~~ — RESOLVED: `ParentChainResolution` has no institution field
  [FACT: types.ts:166-173]; institution id = `program.parent_type==='institution' ? program.parent_id : none`
  [FACT: learning.ts:247-248,157]; self_taught stops at program. Now in BR-LE-S7-3 + the §3 helper.
- ~~**`maxPoints` fallback order**~~ — RESOLVED: assessment-specific overrides the component template (more-specific-wins);
  both null ⇒ `'missing-scale'` (BR-LE-S7-4); the fallback-hit case is a named test (step 5). No doc fixes a different
  precedence (grep clean). `[INTERPRETATION]`
- **`'ambiguous-system'` lean (BR-LE-S7-3)** — >1 live system at the chosen scope: pick most-recently-created + flag.
  Grounded in "flagged, never a wrong number" (business-rules.md:92) + BR-LE-S6-1 (multiple allowed); alternative
  (throw) rejected because compute is fail-soft-with-flag by doctrine (BR-LE-S7-8). Carried as the one INTERPRETATION
  for Victor's eye (not a FACT; nothing in the docs forbids it, nothing mandates the pick order).
- **`GradeResult.grade` normalized [0,1], not a label (BR-LE-S7-6)** — the scale-label algorithm is genuinely
  undefined in the aspect docs (grep clean — scale named only as an enum) → ②/M-later, not an S7 omission. `[INTERPRETATION]`
- Verify at /preflight (mechanical): the `@vida/types` barrel re-exports the new `Assessment`;
  `AssessmentModalitySchema`/`RecordSourceSchema`/`AssessmentTypeSchema` exist (confirmed at validators/learning.ts:67-70);
  `rollup` is barrel-exported alongside `normalize` (confirmed foundation/measurement/index.ts:7).
