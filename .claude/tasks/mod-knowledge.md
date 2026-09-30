# Task: mod-knowledge
# Status: in_progress
# Linear: LIF-128
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)
# Profile: Add Backend Component
# Scenario: add-backend-component / Default (Entity Delivery Flow v1)

## Goal
Knowledge (+ generic review engine, Flashcards svc) — the `createKnowledgeService` ①
backend over DB-4 group #10 (`022_knowledge`: 7 owned tables) + the DB-3 review engine
(`review_curves`/`method_bindings`/`review_events`). 56 legs homed per decomposition.md:65.

## Route History
- 2026-09-25: REBUILD started. The prior Antigravity branch `mod-knowledge` (2 ungated
  commits, ~14 of 56 legs, no review engine / no cross-module seams, S5 self-marked Pending,
  7 scratch `.cjs` at repo root, blind rewrite of shared `@vida/types/knowledge.ts`) is kept
  as SHAPE-reference only — discarded, never merged. Building fresh from docs under the full
  §XXVI / Entity Delivery Flow gate on branch `mod-knowledge-rebuild` off main. Linear LIF-128
  reverted to planned (erroneously pushed Done). [Victor: rebuild via Claude Code + reconcile now]
- 2026-09-25: **S1 SHIPPED** (of 8 slices) — types reconcile (10 interfaces, provenance preserved) + kinds/objects/
  hierarchy CRUD + cycle guard + typed errors. Full Entity Delivery Flow: PLAN → gate-1 SHIP → Approval 1 →
  preflight PASSED → gate-2 SHIP → Approval 2 → implement → Verification Gate (22 live-store tests, @vida/core
  1344 green, tsc 0, eslint 0) → independent code-review SHIP (4 MINOR folded) → §XXIX currency. Fixed the KN-9
  mastery-settable bug + the json<T> serialization seam Antigravity missed. Committed `a433a3d`.
- 2026-09-25: **S2 SHIPPED** — containers + references + link/tag cross-cut (KNO-10,11,12,13,14,29,30,45). 12 methods
  composing SpacesService (writes) + BacklinkResolver (reads); the **key interpretation catch**: both resolvers are
  read-only, so decomposition.md:54,56 was imprecise — S2 composes both halves (NotesService precedent). Full flow:
  PLAN-s2 → gate-1 REVISE→5 folds (F1 scopedTag silent-orphan guard · F2 listMemberships read · F3 local
  KnowledgeEntityRef · F4 remove-path guards · F5 companions) → Approval 1 → preflight PASSED + gate-2 SHIP (2 tidy-
  ups) → Approval 2 → implement → Verification Gate (19 S2 live-store tests, round-trips through real spaces/backlinks)
  → independent code-review SHIP (1 MINOR: ReferenceNotFoundError folded) → §XXIX currency. @vida/core 1363 green,
  tsc 0, eslint 0. Added `KnowledgeContainerNotFoundError`/`ReferenceNotFoundError`; deps grew (+spaces,+backlinks).

- 2026-09-26: **S3 SHIPPED** — review engine ① (KNO-15..20): the generic scheduling substrate built into
  `foundation/review/` (`createReviewEngine`, D1 — cross-consumed), composed into `createKnowledgeService` as the
  required `review` dep. Methods = the `kind='study_method'` partition of the ONE capability registry (empty-envelope
  register, F2/D2 — not a parallel store); curves over `review_curves` (json `params` stringify/parse seam recurs);
  bindings over `method_bindings` (no-FK refs not asserted, BR-S3-6); 2-tier `resolveDefaultMethod` (default_method_id
  else null — realm tier homed forward to S7). Full flow: PLAN-s3 → **gate-1 REVISE→3 folds** (F1 dropped invented
  `'spaced_rep'`/`'elaboration'` method ids = No-Guessing violation → 2-tier resolver; F2 `seedPresetCurves`→S4;
  F3 citation) → Approval 1 → preflight PASS + **gate-2 SHIP** (2 NITs folded: deps-shape, top-level barrel) →
  Approval 2 → implement → Verification Gate (**13 new tests**, live-store) → independent code-review **SHIP** (0
  findings) → §XXIX currency. @vida/core **1376 green**, tsc 0, eslint 0, gitleaks clean. Not yet committed at log
  time.

- 2026-09-27: **S4 SHIPPED** — review engine ② (KNO-21..24): `recordReview` (append-only `review_events`, no mastery
  write), `getDue`/`dueIn` (due-queue from events + bound review-curve interval; never-reviewed ⇒ due now),
  `deriveMastery` (0–100 or null, derive-on-read via `foundation/measurement.normalize` — generic engine verb), and
  `rollupMastery` (knowledge service, walks `parent_object_id` via `measurement.rollup`, visited-set backstop, [0,1]↔0–100
  bridge). **A DRIFT happened + was corrected:** I first framed the mastery 0–100 mapping as an open design decision
  needing intent/ADR + ran AskUserQuestion; Victor: "clear drift, the documentation states how this works." Re-grounded:
  mastery = derive-on-read via the measurement engine, curve-parameterized ("tune the curve, not the number", KN-9),
  internals build-phase (ADR-011:76) — no formula to decide. Memory [[mastery-measurement-derivation-is-doc-resolved-not-a-decision]].
  Full flow after correction: PLAN-s4 → gate-1 REVISE→3 folds+3 NITs (F1 named the events→normalize reduction; F2
  citation provenance to KN-9; F3 narrowed the measurement precedent = first service consumer) → Approval 1 → preflight
  PASS + gate-2 SHIP → Approval 2 → implement (`DueItem`→`ReviewDueItem` barrel-collision rename) → Verification Gate
  (13 new tests incl. 3-level rollup + cycle-backstop) → independent code-review **SHIP** (0 bugs; race ruled out —
  parent_object_id is single-parent) → §XXIX currency. @vida/core **1389 green**, tsc 0, eslint 0, gitleaks clean.

- 2026-09-29: **S5 SHIPPED** — measurement source + Education seams (KNO-25/26/27/42). `getMasterySource(subjectRef)`
  → `{objectMastery, assessmentResults, paceVsSyllabus}` composing S4's `rollupMastery` for `objectMastery`; the two
  Education signals (`assessmentResults` KNO-27, `paceVsSyllabus` KNO-26) are **deny-safe `null`** — Education's
  assessments + syllabus-as-calendar entities are unbuilt (forward-dep; No-Guessing, never fabricated). **Key grounded
  resolution:** the KN-10 exposure is the service **method**, NOT a scalar `measurement.advertise` — the source-registry
  resolver is sync/scalar (`() => number|null`) and mastery is async/per-subject/struct, plus no consumer exists (KNO-25
  reclassified 🧩→🔨). Subject = the spine `knowledge_object` (`structure-data.md:28-30`), NOT the `container_type=
  'subject'` container; Subject-level-ness is positional (no level attribute) → ref trusted from caller. Full Entity
  Delivery Flow: PLAN-s5 → gate-1 **REVISE→3 folds** (F1 Subject-disambiguation · F2 KNO-42 latency PROVEN [positional
  spine → level-mismatch unvalidatable; signal-vs-signal needs ≥2 present signals] · F3 dropped unbacked `log()`-visible
  claim, grep-verified no logger seam) → Approval 1 → preflight PASSED (barrel-clean, guard transitive) + gate-2 **SHIP
  →2 NITs** (concrete-value test not tautological · decomposition.md:133 reclassification) → Approval 2 → implement →
  Verification Gate (3 live-store tests, @vida/core **1392** green, tsc 0, eslint 0) → independent code-review **SHIP**
  (0 findings). No schema, no new dep, no `@vida/types` change. **[Victor drift-guard: "ground it on the documentation"
  ×2 — every fold cited a doc line.]** One pre-existing full-suite timing flake (self-resolved on clean re-run; not S5).

- 2026-09-29: **S6 SHIPPED** — pages-notes + compound sets + lab + AI/search/ingestion seams (KNO-28,31,32,33,34,35,36,
  37,43). 10 methods, 4 validators, 3 lab errors, 4 service-layer result types, 3 deps (`notes` required; `ai?`/
  `ingestion?` optional deny-safe). **No schema, no new dep, no `@vida/types` change** (both owned tables `compound_sets`/
  `knowledge_lab_entries` ship in `022_knowledge`; interfaces authored at S1). `openObjectNote`→`ensureEntityNote('note',
  'knowledge_object')` (idempotent, never `knowledge_notes`, KN-5); `buildCompoundSet`/anti-lost idempotent
  `applyDefaultCompoundSet` (`spec` opaque JSON boundary — @vida/types keeps it `string`, not re-parsed); `createLabEntry`→
  `concludeLabEntry`→`promoteToObject` (concluded+un-promoted guards; `lab.concluded` event = S8); deny-safe seams
  `assistCompoundSet` (ai `AiDenied`→ai-unavailable), `searchKnowledge` (DB-8 search-unavailable), `autoPopulate`
  (ingestion permitted→parser-unavailable / denied→refused). Full Entity Delivery Flow: **gate-1 REVISE→3 blockers folded**
  (B1 the real catch — `autoPopulate` mis-composed a phantom `checkIngestion` shape + a mediator-deny that never fires;
  re-grounded: `checkIngestion` returns `IngestionDecision{permitted}`, never touches the mediator, permitted-act→
  parser-unavailable is the real M1 seam · B2 `askModel` throws AiDenied · B3 `PageRow` from `db/schema/notes`) → Approval 1
  → **preflight PASSED** → **gate-2 REVISE→1** (the permitted-act happy path is grant-gated → mapping tests use stub
  `IngestionGuard`s, parity with the ai throwing-stub) → Approval 2 → implement → **Verification Gate** (one live-gate
  catch: `ensureEntityNote` folds `seed.title` into page CONTENT not the title column → §XXVIII test+BR correction, code
  was right) → **@vida/core 1413 green (+21)**, tsc 0, eslint 0, gitleaks clean → independent code-review **SHIP** (0
  blocking, 1 NIT: promote non-atomicity = accepted no-FK eventual-consistency convention, one-line note added) → §XXIX
  currency. **[Victor: "ground everything in the documentation" — every fold cited a doc/code line.]** PLAN: `PLAN-s6.md`.

- 2026-09-29: **S7 SHIPPED** — Flashcards sub-service (FC-01…12), the ADR-005 reference study-method service. NET-NEW
  `services/flashcards/` (`createFlashcardsService`), 13 methods, 5 errors, 3 validators. **No schema, no new dep, no
  `@vida/types` change** (flashcards table + Flashcard interface ship from `022_knowledge`/S1). **Card→engine model
  (gate-confirmed doc-forced, headline #1):** a card REVIEWS a `knowledge_object` (binding lives on the object —
  `METHOD_BINDING_TARGET_TYPE` has no card level); the reviewed `objectId` is supplied EXPLICITLY per card (a card has
  many links → no reverse-resolution). Emit-only (FC-6): `completeReview` → one `review_event`/card via direct
  `recordReview`, never computes mastery/schedule. Full Entity Delivery Flow: **gate-1 REVISE→3 folds** (B1 wiring-fatal:
  the `review` sub-type must register with an EMPTY effect envelope — the shipped ceiling is `{attach_pomodoro,log_time}`,
  so XP/Journal-on-drill defers to a foundation-envelope seam · B2 thread `objectId` explicitly · B3 decomposition drift
  on FC-10 "via effect rail" → recordReview has no rail dep, re-homed to co-tx + ADR-003/M4) → preflight PASSED →
  gate-2 **SHIP** (all folds executable) → implement → **Verification Gate** (2 live-gate fixes: `create()` generates its
  own id so the tag-seed must use `spaces.createTag`; §XXVIII: CardNotBound = an exclusion CONDITION not a thrown error
  per `contract.md:36`) → **@vida/core 1424 green (+11)**, tsc 0, eslint 0, gitleaks clean → independent code-review
  **SHIP** (0 blocking, 4 NITs; folded FC-10 retry-idempotency comment + strengthened the FC-08 dangling-ref test) →
  §XXIX currency. **[Victor: "ground everything in the documentation" — every fold + the CardNotBound reclassification
  cited a doc line.]** PLAN: `PLAN-s7.md`.
- 2026-09-30: **S8 SHIPPED → ① COMPLETE (8/8).** Event fan-out + Journal contribution (KNO-38/39/40), the emit-only
  producer. **PUSH** (rail): `recordReview` wraps the engine ref → post-commit fan-out (`review.recorded` →
  `[emit_measurement_signal, award_xp]` unconditional; `mastery.changed` → `[emit_measurement_signal]` iff
  `ev.quality != null`); grain = `review_event.id`; failure-isolated + dormant-guarded. **PULL** (journal registry):
  `registerKnowledgeJournal` + dated `getDayKnowledgeDigest` (UTC-day, `count()`); `object.created`/`lab.concluded`
  push nothing (pull-aggregated, ADR-004 §3.2.5:84). Full flow: PLAN-s8 → gate-1 REVISE (B1-B4 grain/routing/§5-
  contradiction + S1-S2)→SHIP → Approval 1 → preflight BLOCKED (G1 `mastery.changed` unconditional)→resolved via
  `contract.md:70` causal chain + BR-KN-S4-3 (fires iff quality!=null) → gate-2 SHIP → Approval 2 → implement →
  Verification Gate (9 live-store) → independent code-review **clean** (correctness `[]`; the double
  `emit_measurement_signal` verified NOT redundant — distinct transitions → distinct ledger rows; 1 efficiency fold
  `count()`) → engineering gate PASS → §XXIX currency. 2 §XXVIII deviations: D1 inline EffectsPort (checkins owns the
  name + `export *` collision, tsc-caught), D2 `count()` over `findWhere` (F1). @vida/core **1433 green (+9)**, tsc 0,
  eslint 0, gitleaks clean. Committed `2354edd` → branch pushed → **PR #69**. **[Victor: "ground it in the documentation"
  ×3 — grain, mastery-gate, and the NIT all re-grounded before each approval.]** PLAN: `PLAN-s8.md`. **① COMPLETE.**

## Slice tracker (decomposition.md — 8 slices)
- [x] S1 Types reconcile + Kinds + Objects + Hierarchy
- [x] S2 Containers + References + link/tag cross-cut
- [x] S3 Review engine ①: methods + curves + bindings
- [x] S4 Review engine ②: due + record + derive + rollup
- [x] S5 Measurement source + Education seams
- [x] S6 Pages-notes + Compound sets + Lab + AI/search/ingestion seams
- [x] S7 Flashcards sub-service
- [x] S8 Event fan-out + Journal contribution  → ① COMPLETE (all 8 slices), PR #69

## Dependencies
- blocked by `mod-notes-and-pages`
- blocked by `mod-sessions`
- blocked by `xs-ai`
- blocked by `xs-backlinks-search-export`
- blocked by `xs-capability`
- blocked by `xs-effect-rail`
- blocked by `xs-ingestion`
- blocked by `xs-measurement-engine`
- blocked by `xs-spaces-tags-links`
