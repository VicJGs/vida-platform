# Task: m1-foundation-closeout
# Status: in-progress
# Profile: Project Foundation
# Scenario: milestone-delivery-planning (with an M1.0 close-out prefix)
# Linear: none — META-TASK, do NOT sync/create a Linear issue (mirrors m1.0-delivery-plan; orphan-create guard also blocks it by default)
# Project: M1 — Whole Manual OS
# Source: user request 2026-08-17 — "close the foundation (M1.0) milestone, finish all docs, start the next milestone"

## Goal
Close out **M1.0 — Boot & Connective Base** (the foundation slice): reconcile the delivery
structure + §XXIX currency, mark it Done in tracker/Linear, and write its close-out record.
Then **open M1.1 — Hub & Foundation Modules** via the milestone-delivery-planning scenario
(produce `docs/roadmap/m1.1-delivery-plan.md`, gated). Next build head after this = MOD-notes #31.

## Dependencies
- none blocking (M1.0 build waves complete; M1.1 head MOD-notes is READY)

## Build Steps
### Phase 1 — Close out M1.0 (LITE: delivery-structure reconcile + §XXIX currency)
- [x] 1. Completeness audit (tracker --census / --plan) — confirm all buildable #1–30 Done; account for streams + 3 "missing"
- [x] 2. §XXIX currency sweep — DONE. 11/12 current-* current; 8 contexts doc-by-convention (ADR-018 §3.6 + frontend-source-of-truth §F); 1 real lag (web-client-runtime) REFRESHED: added UX-2/UI-4 runtime-delta section to current-spec.md (2nd store command-bar-ui-store + AppShell-wrap + lazy /graph route); current-business-rules unchanged (new code conforms to BR-RT-6/8). spaces/sessions/effects were false-positive lags (test-only touches).
- [x] 3. Reconcile delivery-structure — DONE. reconstructed-structure.md UX-6 #26 ◻→✅; delivery-plan ar-4/ar-8 Home cells reconciled to real homes (census M1.0 92%→**100%**, aligned 36→40, missing 3→0); delivery-plan status column bulk-flipped (15 stale ▶/⏳→✅) + header→CLOSED banner; TASKS.md routing head already current (MOD-notes #31).
- [x] 4. Tracker/Linear — DONE (read-only verify; no push needed). --verify: all 94 issues live. --pull (session start): no conflicts → stored=live. --sync --dry-run: every M1.0 issue DONE; deferred homed (db-2→M4 · db-8/10/11→M1.4 · db-5/ar-3/db-8b→M3 · ar-9b/cap-authoring→M4). No mutating sync run (Linear already correct; avoids orphan-creating the meta-task).
- [x] 5. Close-out record — DONE. Wrote `docs/roadmap/m1.0-closeout.md` (what shipped by wave · ADRs realized · key decisions/lessons · deferred→homes table · what M1.0 excluded · handoff to M1.1). Pointers added: docs/roadmap.md M1.0 § banner + delivery-plan banner. **PHASE 1 COMPLETE — M1.0 CLOSED.**

### Phase 2 — Open M1.1 (milestone-delivery-planning, 8 steps)
- [ ] 6. Ground in M1.1 roadmap § + issues + repo-structure ADR + dep-graph
- [ ] 7. Capture delivery intent (sub-waves + per-issue profile/flow policy)
- [ ] 8. Docs pass — verify homes vs real tree; classify flow class; resolve current-* homes
- [ ] 9. Decompose — per-issue delivery table + sub-waves + critical path
- [ ] 10. Write docs/roadmap/m1.1-delivery-plan.md
- [ ] 11. Gate — foundation gate + independent adversarial critic
- [ ] 12. Reconcile grain 1:1 + dep graph to tracker canonical
- [ ] 13. Accept & log

## Route History
- 2026-08-17: created; Phase 1 (close out M1.0) COMPLETE — Steps 1–5 all done (audit clean · currency refreshed 1 lag · glyphs reconciled census→100% · Linear verified · close-out record written). M1.0 CLOSED.
- 2026-08-17: Next = Phase 2 (open M1.1 via milestone-delivery-planning).

## Resume
**PHASE 1 COMPLETE — M1.0 CLOSED (2026-08-17).**
- S1 audit: M1.0 functionally 100% buildable; the 92% census = DB-3/DB-4 `〰` streams + 3 stale Home-paths (now fixed).
- S2 currency: 11/12 current-* current; 8 doc-by-convention; 1 lag (web-client-runtime) refreshed (UX-2/UI-4 runtime delta).
- S3 reconcile: reconstructed-structure UX-6 ◻→✅; delivery-plan Home cells (ar-4/ar-8) + status column (15 rows) + header banner; **census M1.0 92%→100%** (aligned 40 · missing 0 · divergent 0).
- S4 tracker: --verify all 94 live; every M1.0 issue DONE in Linear; deferred homed; no push needed.
- S5 record: `docs/roadmap/m1.0-closeout.md` + pointers (roadmap.md, delivery-plan).
**Changeset (all docs, uncommitted):** docs/roadmap/m1.0-closeout.md (new) · docs/roadmap.md · docs/roadmap/m1.0-delivery-plan.md · docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md · docs/infrastructure/web-client-runtime/current-spec.md · TASKS.md · .claude/tasks/{_index,m1-foundation-closeout}.md
**Next: Phase 2 — open M1.1 (milestone-delivery-planning, 8 steps → docs/roadmap/m1.1-delivery-plan.md, gated).**
