---
Session 3 — 2026-09-27
Goal: build createKnowledgeService ① over DB-4 022_knowledge + the DB-3 review engine (56 legs / 8 slices)
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1)
---

## Accomplished
- **S3 SHIPPED (`9eb57cb`) — review engine ①** (KNO-15..20). Built `packages/core/src/foundation/review/`
  (`createReviewEngine`, populating the reserved stub, D1 — cross-consumed), composed into `createKnowledgeService`
  as the required `review` dep. Methods = the `kind='study_method'` partition of the ONE capability registry
  (empty-envelope `register`, F2/D2 — not a parallel store); curves over `review_curves` (json `params` seam);
  bindings over `method_bindings` (no-FK, not asserted); 2-tier `resolveDefaultMethod` (`default_method_id` else null).
- **S4 SHIPPED (`09e04bf`) — review engine ②** (KNO-21..24). `recordReview` (append-only `review_events`, no mastery
  write), `getDue`/`dueIn` (due-queue from events + bound review-curve interval; never-reviewed ⇒ due now),
  `deriveMastery` (0–100 or null, derive-on-read via `measurement.normalize`), `rollupMastery` (knowledge service,
  walks `parent_object_id` via `measurement.rollup`, visited-set backstop, `[0,1]↔0–100` bridge). `DueItem`→
  `ReviewDueItem` (barrel-collision rename — `services/sessions` owns `DueItem`).
- Each slice: full Entity Delivery Flow — PLAN → gate-1 → Approval 1 → preflight + gate-2 → Approval 2 → implement →
  live-store Verification Gate → independent code-review (both SHIP, 0 bugs) → §XXIX currency. **@vida/core 1389
  green, tsc 0, eslint 0, gitleaks clean.** Currency: `docs/modules/knowledge/current-{spec,business-rules}.md`
  (BR-KN-S3-*/S4-*) + `foundation/review/CLAUDE.md` (stub → built ①+②). 26 new live-store tests (13 per slice).
- Two memories saved: `capability-registry-study-method-partition-mechanics`,
  `mastery-measurement-derivation-is-doc-resolved-not-a-decision`.

## Decisions Made
- **S3 study-method registration = empty privilege envelope** — passes capability BR-2..6 trivially; roles ride
  `config_schema` (S7).
- **S3 gate-1 fold — `resolveDefaultMethod` is 2-tier** (`default_method_id` else null); dropped the invented
  `'spaced_rep'`/`'elaboration'` method ids (No-Guessing — real ids chosen at S7/FC-02; realm tier homed forward).
- **S4 mastery = derive-on-read via `foundation/measurement`, curve-parameterized — NOT a bespoke formula** ("tune the
  curve, not the number", KN-9; internals build-phase, ADR-011:76). Never stored (`recordReview` appends only; override
  slot inert in M1.0). SM-2 is the scheduling axis of `getDue`, a separate concern.
- **S4 `rollupMastery` homes to `services/knowledge`** (walks `knowledge_objects` — the generic engine must not know
  it); `recordReview`/`getDue`/`deriveMastery` stay generic in the engine.

## Open Questions
- none blocking. (S5's `paceVsSyllabus`/`assessmentResults` are deny-safe null signals — Education's entities aren't
  built yet; No-Guessing: null, never invented. That's a known forward-dep, not an open question.)

## Route History (detours this session)
| Step | Detour | Why | Resolved |
| PLAN-s4 | **DRIFT** — framed the mastery 0–100 mapping as an open design decision + ran AskUserQuestion | mis-read the docs; conflated the SM-2 scheduling axis with the mastery (measurement) axis | Victor drift-catch → re-grounded (mastery = derive-on-read via measurement engine, doc-resolved); PLAN-s4 rewritten; memory saved |
| S4 impl | `DueItem` barrel collision with `services/sessions` | both `export *` from the core barrel | renamed to `ReviewDueItem` |

## Next Session
First step: resume at **S5 — Measurement source + Education seams** (KNO-25,26,27,42). `getMasterySource(subjectRef)`
→ `{objectMastery, assessmentResults, paceVsSyllabus}` advertised via the `foundation/measurement` source-registry
(`advertise`/`query` — the M5 seam; gamification uses `measurement.query`). `paceVsSyllabus` + `assessmentResults` =
**deny-safe null signals** (Education's syllabus-as-calendar + assessments NOT built — forward-dep seams). KNO-42 =
flag a cross-module measurement mismatch, never guess.
Context to reload: `docs/modules/knowledge/delivery/decomposition.md` (§S5, lines 76-81), `parts/knowledge.md:40`
(KNO-25), `docs/features/knowledge/business-rules.md` KN-10:51-55, `foundation/measurement/source-registry.ts`
(the advertise/query seam), + `current-{spec,business-rules}.md`. Env: Node 24 via nvm. Same per-slice §XXVI gate
cycle. Branch `mod-knowledge-rebuild`; PR when ① (all 8 slices) completes.
