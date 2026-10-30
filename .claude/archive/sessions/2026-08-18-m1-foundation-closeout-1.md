---
Session 1 — 2026-08-18
Goal: Close out M1.0 (foundation slice) + open M1.1 — became a REROUTE after M1.0 was found closed too soon
Profile: Project Foundation (milestone-delivery-planning + delivery-structure reconcile)
Task: m1-foundation-closeout
Branch: m1-foundation-closeout (off main; NOT merged)
---

## Accomplished
- **Phase 1 — attempted M1.0 close-out** (commit `061b0b5`): completeness audit, §XXIX currency sweep
  (refreshed the 1 real lag — web-client-runtime current-spec gained the UX-2/UI-4 runtime delta;
  8 frontend contexts confirmed documented-by-convention), delivery-structure reconcile (UX-6 glyph ◻→✅,
  ar-4/ar-8 Home cells, status column 15 rows → census 92%→100%), tracker verify (all 94 live), close-out record.
- **Phase 2 — drafted `docs/roadmap/m1.1-delivery-plan.md`** for the 6 M1.1 modules; ran an independent
  adversarial critic (REVISE → 2 MATERIAL + 2 MINOR, all fixed: app/journal→journals, sessions-home grounded
  in DF-7:90, citation paths, AR-4 stub note).
- **⚠ REROUTE (Victor caught the drift)** — corrective commit `e7cba50`: **M1.0 was CLOSED TOO SOON.** Its
  foundation *includes the complete schema* and two schema issues were left unfinished:
  - **DB-3** (substrate, LIF-65): verified — **11 of ~22 charter tables authored, 11 MISSING** (planned_blocks,
    templates, contributions, purpose_reviews, plan_steps, store, rules, review_curves, method_bindings,
    topic_reviews, measurement). NOT marked Done (would have repeated the mistake).
  - **DB-4** (per-domain, LIF-66): not started.
  Reopened M1.0 + flagged the mistake across closeout · roadmap · delivery-plan · reconstructed-structure · TASKS;
  corrected the M1.1 grain (modules = service + UI on the FINISHED schema, they do NOT author schema); gated M1.1
  behind M1.0.

## Decisions Made
- **M1.0 is REOPENED** — closed too soon; census `progress` measures homed-code alignment, NOT issue completion.
- **DB-4 (M1.0 foundation) authors the per-domain schema**; M1.1 modules build service + UI on top, never author schema.
- **DB-4's build flow is DEFERRED to Victor's explicit blueprint** — no schema authored this session.
- (Details in `.claude/docs/decisions.md`, 2026-08-18 rows.)

## Open Questions
- **DB-4 flow blueprint** — Victor will hand it next session (how DB-4 authors the per-domain schema:
  upfront-foundation vs consumer-gated; sequencing; and reconciling roadmap:85 "per-module streaming" vs the DB-4
  charter's "author as its own build").
- **DB-3's remaining 11 tables** — some are ADR-016 §3.5 shape-open (rules/store/planned_blocks), rest are
  substrate for M1.2+ consumers; whether to author now depends on the same DB-4 model decision.

## Next Session
First step: **Victor hands the DB-4 flow blueprint**; then finish the M1.0 schema foundation (DB-3 remaining → DB-4)
per that blueprint. Do NOT start DB-4 or mark DB-3 Done before the blueprint.
Context to reload: `docs/roadmap/m1.0-closeout.md` (correction banner) · `.claude/tasks/m1-foundation-closeout.md`
(Resume block) · `docs/roadmap/m1.1-delivery-plan.md` (gated) · `.claude/tasks/db-4-per-domain-schema.md` +
`db-3-stream-i-consolidation.md` (charters) · memory [[m1-foundation-owns-schema-modules-build-on-it]].
