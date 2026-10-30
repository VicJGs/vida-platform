---
Session 4 — 2026-09-29
Goal: build createKnowledgeService ① S5 — measurement source + Education seams (KNO-25/26/27/42)
Profile: Add Backend Component · Scenario: Default (Entity Delivery Flow v1)
---

## Accomplished
- **S5 SHIPPED (`fb2918b`) — measurement source + Education seams** (KNO-25/26/27/42). One method:
  `getMasterySource(subjectRef) → {objectMastery, assessmentResults, paceVsSyllabus}` on `KnowledgeService`
  (+ `MasterySource` service-layer type). `objectMastery` composes S4's `rollupMastery`; the two Education
  signals are **deny-safe `null`** (assessments + syllabus-as-calendar entities unbuilt — forward-dep,
  No-Guessing). **No schema, no new dep, no `@vida/types` change** (+92 lines: 2 code files + 3 live-store tests).
- Full Entity Delivery Flow: PLAN-s5 → gate-1 `/critique` **REVISE→3 folds** → Approval 1 → `/preflight` PASSED →
  gate-2 `/critique` **SHIP→2 NITs** → Approval 2 → implement → Verification Gate (3 tests, **@vida/core 1392
  green**, tsc 0, eslint 0, gitleaks clean) → independent code-review **SHIP (0 findings)** → §XXIX currency.
- Currency promoted: `current-{spec,business-rules}.md` (BR-KN-S5-1..5), `decomposition.md` (KNO-25 🧩→🔨
  reclassification + S5 delivery status), task Route History + slice tracker.
- Memory saved: `measurement-source-registry-is-sync-scalar-per-subject-uses-a-method`.

## Decisions Made
- **KN-10 exposure = a service METHOD (`getMasterySource`), NOT a scalar `measurement.advertise`.** The
  source-registry resolver is sync/scalar (`()=>number|null`); mastery is async/per-subject/struct; and no
  consumer exists (gamification is a `query`-only consumer; no module has ever `advertise`d). KNO-25
  reclassified COMPOSED→BUILT. The scalar registry (ratified #33, ADR-011 §3.8) stays untouched.
- **"Subject" = the spine `knowledge_object`** (`structure-data.md:28-30`), NOT the `container_type='subject'`
  container → `rollupMastery(subjectRef)` (parent_object_id walk) is correct. (The gate-1 catch — one misread
  away from `rollupMastery(containerId)` garbage.)
- **KNO-42 latency is PROVEN, not asserted:** Subject/Unit/Topic are positional (no level attribute; kinds seed
  topic/concept/definition), so level/ref-mismatch is unvalidatable; signal-vs-signal needs ≥2 present signals.
  Both fold into the KNO-26/27 forward-dep bucket. The `null` discipline is the M1.0 flag.
- **F3:** dropped the unbacked "`log()`-visible" claim — grep-verified no logger seam at `services/knowledge`;
  visibility = return type + cited comment.

## Open Questions
- none blocking. (The two Education signals unlock when Education's assessments + syllabus-as-calendar entities
  are built — a known forward-dep, not an open question.)
- One pre-existing **full-suite timing flake** (1391/1392 twice, then 1392/1392 clean) — NOT S5 (additive, no
  shared/time state; knowledge suite 52/52 isolated). Likely a `getDue`/scheduling `Date.now`-window test. Watch.

## Route History (detours this session)
| Step | Detour | Why | Resolved |
| — | none | S5 ran clean through the flow (contrast S4's mastery-formula drift) | — |

## Next Session
First step: resume at **S6 — Pages-notes + Compound sets + Lab + AI/search/ingestion seams**
(KNO-28,31,32,33,34,35,36,37,43) — the largest remaining slice. Composes `createNotesService`
(`openObjectNote` → a `pages` row, NEVER a `knowledge_notes` insert, table retired KN-5) + `buildCompoundSet`/
`applyDefaultCompoundSet` (KN-11, shipped default) + `createLabEntry`/`concludeLabEntry`/`promoteToObject` +
KNO-33 AI-assist (`createAiService` extension-model, opt-in/consent-gated) + KNO-37 `searchKnowledge`
(`search-unavailable` seam — FTS5 `fts_knowledge` = DB-8, not built) + KNO-43 auto-population
(`createIngestionGuard`, opt-in/device-side/deny-safe).
Context to reload: `docs/modules/knowledge/delivery/decomposition.md` (§S6, lines 83-90),
`parts/knowledge.md` (KNO-28…37,43), `business-rules.md` KN-5/KN-11, `current-{spec,business-rules}.md`, and the
substrate seams (`services/notes`, `foundation/ai`, `foundation/ingestion`). Env: Node 24 via nvm (better-sqlite3
ABI). Same per-slice §XXVI gate cycle. Branch `mod-knowledge-rebuild`; PR when ① (all 8 slices) completes.
