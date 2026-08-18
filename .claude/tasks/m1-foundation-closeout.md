# Task: m1-foundation-closeout
# Status: in-progress
# Profile: Project Foundation
# Scenario: milestone-delivery-planning (with an M1.0 close-out prefix)
# Linear: LIF-159
# Project: M1 — Whole Manual OS
# Source: user request 2026-08-17 — "close the foundation (M1.0) milestone, finish all docs, start the next milestone"

## Goal
Close out **M1.0 — Boot & Connective Base** (the foundation slice): reconcile the delivery
structure + §XXIX currency, mark it Done in tracker/Linear, and write its close-out record.
Then **open M1.1 — Hub & Foundation Modules** via the milestone-delivery-planning scenario
(produce `docs/roadmap/m1.1-delivery-plan.md`, gated). Next build head after this = MOD-notes #31.

## Dependencies
- ⚠ M1.0 REOPENED (schema foundation DB-3+DB-4 unfinished); M1.1 gated behind M1.0. DB-4 flow pending Victor's blueprint.

## Build Steps
### Phase 1 — Close out M1.0 (LITE: delivery-structure reconcile + §XXIX currency)
- [x] 1. Completeness audit (tracker --census / --plan) — confirm all buildable #1–30 Done; account for streams + 3 "missing"
- [x] 2. §XXIX currency sweep — DONE. 11/12 current-* current; 8 contexts doc-by-convention (ADR-018 §3.6 + frontend-source-of-truth §F); 1 real lag (web-client-runtime) REFRESHED: added UX-2/UI-4 runtime-delta section to current-spec.md (2nd store command-bar-ui-store + AppShell-wrap + lazy /graph route); current-business-rules unchanged (new code conforms to BR-RT-6/8). spaces/sessions/effects were false-positive lags (test-only touches).
- [x] 3. Reconcile delivery-structure — DONE. reconstructed-structure.md UX-6 #26 ◻→✅; delivery-plan ar-4/ar-8 Home cells reconciled to real homes (census M1.0 92%→**100%**, aligned 36→40, missing 3→0); delivery-plan status column bulk-flipped (15 stale ▶/⏳→✅) + header→CLOSED banner; TASKS.md routing head already current (MOD-notes #31).
- [x] 4. Tracker/Linear — DONE (read-only verify; no push needed). --verify: all 94 issues live. --pull (session start): no conflicts → stored=live. --sync --dry-run: every M1.0 issue DONE; deferred homed (db-2→M4 · db-8/10/11→M1.4 · db-5/ar-3/db-8b→M3 · ar-9b/cap-authoring→M4). No mutating sync run (Linear already correct; avoids orphan-creating the meta-task).
- [x] 5. Close-out record — wrote `docs/roadmap/m1.0-closeout.md` + pointers. ⚠ **This declared "M1.0 CLOSED" — PREMATURE, REVERTED 2026-08-18** (see Route History): M1.0's schema foundation (DB-3+DB-4) was unfinished. The closeout record is now a REOPENED status record flagging the mistake.

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
- 2026-08-17: created; Phase 1 (close out M1.0) run — Steps 1–5; committed `061b0b5` marking M1.0 CLOSED.
- 2026-08-17: Phase 2 — drafted + gated `m1.1-delivery-plan.md` (critic REVISE→fixed).
- 2026-08-18: ⚠ **REROUTE (Victor caught the drift).** M1.0 was CLOSED TOO SOON — its schema foundation (DB-3 partial,
  11/~22 substrate tables; DB-4 not started) was never verified done. Root cause: census `progress` = homed-code
  alignment, NOT issue completion. Also the M1.1 plan had "reshaped the process" (folded DB-4's M1.0 schema authoring
  into module increments). Corrective edits: reopened M1.0 + flagged the mistake across closeout·roadmap·delivery-plan·
  reconstructed-structure·TASKS; corrected the M1.1 grain (modules = service+UI on the FINISHED schema, don't author it)
  + gated M1.1 behind M1.0. Lesson → memory [[m1-foundation-owns-schema-modules-build-on-it]].

## Resume
**⚠ REROUTED 2026-08-18 — M1.0 REOPENED (was closed too soon).**
- The M1.0 close (Phase 1, commit `061b0b5`) was premature: DB-3 (substrate schema — 11/~22 tables) + DB-4 (per-domain
  schema — 0 tables) are unfinished M1.0 foundation. Docs now flag the mistake + reopen M1.0.
- **Next M1.0 work:** finish DB-3 (author 11 missing substrate tables: planned_blocks·templates·contributions·
  purpose_reviews·plan_steps·store·rules·review_curves·method_bindings·topic_reviews·measurement — some ADR-016 §3.5
  shape-open / consumer-gated) → then DB-4 (per-domain, all ~19 domains). **DB-4 build FLOW pending Victor's blueprint.**
- **M1.1 gated behind M1.0.** m1.1-delivery-plan.md is drafted+gated but grain-corrected: modules = service+UI on the
  finished schema, do NOT author schema.
- **Reroute committed:** `e7cba50` (reopen + flag mistake, 7 docs) + `c8c6e76` (session log). Prior premature close = `061b0b5`.
  Tracker created LIF-159 for this task at session-end (accepted).
- **Do NOT** mark DB-3 Done or start DB-4 without (a) verifying DB-3's remaining scope and (b) Victor's DB-4 flow blueprint.

<details><summary>(superseded) Phase-1 "M1.0 CLOSED" resume — the premature close</summary>
**PHASE 1 COMPLETE — M1.0 CLOSED (2026-08-17).**
- S1 audit: M1.0 functionally 100% buildable; the 92% census = DB-3/DB-4 `〰` streams + 3 stale Home-paths (now fixed).
- S2 currency: 11/12 current-* current; 8 doc-by-convention; 1 lag (web-client-runtime) refreshed (UX-2/UI-4 runtime delta).
- S3 reconcile: reconstructed-structure UX-6 ◻→✅; delivery-plan Home cells (ar-4/ar-8) + status column (15 rows) + header banner; **census M1.0 92%→100%** (aligned 40 · missing 0 · divergent 0).
- S4 tracker: --verify all 94 live; every M1.0 issue DONE in Linear; deferred homed; no push needed.
- S5 record: `docs/roadmap/m1.0-closeout.md` + pointers (roadmap.md, delivery-plan).
**Changeset (all docs, uncommitted):** docs/roadmap/m1.0-closeout.md (new) · docs/roadmap.md · docs/roadmap/m1.0-delivery-plan.md · docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md · docs/infrastructure/web-client-runtime/current-spec.md · TASKS.md · .claude/tasks/{_index,m1-foundation-closeout}.md
**Next: Phase 2 — open M1.1 (milestone-delivery-planning, 8 steps → docs/roadmap/m1.1-delivery-plan.md, gated).**
</details>
