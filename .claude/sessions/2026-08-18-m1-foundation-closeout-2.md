---
Session 2 — 2026-08-18
Goal: Decide + document the DB-3/DB-4 schema-foundation build model & flow (Victor's blueprint), reconcile the corpus, prime the DB tasks for clean-context sessions
Profile: Project Foundation
Task: m1-foundation-closeout
Branch: m1-foundation-closeout (off main; NOT merged)
---

## Accomplished
- **Verified DB-3's exact remaining scope** against ADR-002 §5.20 + on-disk `schema/foundation/*.ts`: 17 tables
  authored (15 substrate + sync_queue + app_state); **11 substrate ADD tables remain**. Found the reopen's informal
  "11 missing" list had **drifted** — corrected it (+`values`, +`review_events`; −`topic_reviews` [DB-4], −`measurement`
  [a column AMEND, not a table]).
- **Surfaced the Model-A/Model-B contradiction**: the reopen asserted "finish schema before M1.1" (Model B) in banners,
  but the corpus still carried the original streaming mechanism (Model A: `# Stream: true`, per-module, "never a
  delivery head") across 7 docs — so it silently contradicted itself and defaulted to the old model.
- **Victor decided Model B** (upfront foundation) + the **5-phase lifecycle** for both DB-3 and DB-4.
- **Wrote the authoritative flow doc** `docs/roadmap/schema-foundation-build-flow.md` (model + 5-phase lifecycle +
  corrected DB-3 ledger + ADR-016 reconciliation + reconciliation record).
- **Retired the Model-A layer across the corpus** (roadmap.md · m1.0-delivery-plan rows+note+§5.1.1 ·
  reconstructed-structure #9/#10 `〰`→real heads · m1.0-closeout · m1.1-delivery-plan · both DB task files).
- **Primed both DB task files** (profile add-backend-component + scenario + intent source + 5-phase Build Steps) for
  clean-context pickup; routed TASKS.md + _index.md to DB-3 as the next head.
- **SHIP gate:** independent adversarial critique → SHIP (ADR-016 reasoning sound; ledger airtight; task files
  pickup-ready). 3 clarity-polish items applied. Mechanical sweep caught + fixed 4 stale "pending blueprint" refs.
- No schema authored (by design — that's DB-3's own session).

## Decisions Made
- **Model B (upfront foundation)**: DB-3 then DB-4 are gated build HEADS authored upfront BEFORE M1.1; M1.1+ modules
  build service+UI on the finished schema, author none. Consistent with ADR-016 §3.5 (no ADR reversal — DB-4 is the
  domain-schema build phase).
- **5-phase lifecycle** (intent-intake → current-state → plan double-gate → implement → foundation-soundness verify) —
  the §XXVI gate plus two foundation bookends.
- **DB-3 ledger corrected** vs ADR-002 §5.20 (see flow doc §3).
- (Full rows in `.claude/docs/decisions.md`, 2026-08-18.)

## Open Questions
- DB-4's **P0** must fix the canonical domain-group count (~17–21 across charters) — flagged as P0's authority.
- Session sub-type extension tables (`reading_sessions` etc.) — DB-3 Phase-3 decides author-now vs defer-to-consumer.
- ⚠ CI red repo-wide = known pnpm action-setup infra conflict (local green); no branch protection.

## Next Session
First step: fresh clean-context session → `/task-switch db-3-stream-i-consolidation` → run the 5-phase lifecycle,
starting **P1 intent-intake from ADR-002 §5.20**. DB-4 after DB-3. M1.1 stays gated behind M1.0.
Context to reload: `docs/roadmap/schema-foundation-build-flow.md` (the flow) · `.claude/tasks/db-3-stream-i-consolidation.md`
(primed task) · ADR-002 §5.20 (the intent source) · memory [[m1-foundation-owns-schema-modules-build-on-it]].

Paused at: 2026-08-18. Switching to db-3-stream-i-consolidation (start the 5-phase schema-foundation lifecycle).
