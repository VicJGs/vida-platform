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
- ✅ M1.0 schema foundation COMPLETE (DB-3 + DB-4 done 2026-08-21) → **M1.0 CLOSED 2026-08-21**; M1.1 opens in Phase 2. (History: M1.0 was reopened 2026-08-18 when DB-3+DB-4 were unfinished; model + flow decided Model B → `docs/roadmap/schema-foundation-build-flow.md`.)

## Build Steps
### Phase 0 — Delivery-truth gate on the two schema issues (DB-3 LIF-65, DB-4 LIF-66) — added 2026-08-21 (Victor request)
Verify the two issues that reopened M1.0 were not just *marked* Done but *truly delivered their scope* — the exact
check a census-only close (2026-08-17) missed. Root-cause guard, not ceremony.
- [x] 0a. Tracker/Linear Done — both `DONE` in Linear (`tracker --status`), blockers satisfied (db-3←db-1; db-4←db-1+db-3); local task files `# Status: done`.
- [x] 0b. DB-3 delivered — all **11 §5.20 Stream (i) ADD tables** declared in `schema/foundation/*` + `CREATE TABLE` in migrations 007–011 (planned_blocks·templates·review_curves·method_bindings·review_events·values·contributions·purpose_reviews·plan_steps·store·rules); RETIRE set absent; ledger faithful to ADR-002 §5.20.
- [x] 0c. DB-4 delivered — all **21 active groups** authored (migrations 012–032, 117 tables); 6-group deep sample (Projects/Purpose/Finance/Learning/Health-Core/Gamification) matches each `structure-data.md` floor member-by-member; Languages #13 = doc-licensed 0-table dissolution (ADR-006); `_registry.ts` ENTITY_TYPES appends present (79 types); `database-layer/current-*` promoted (dated 2026-08-21).
- [x] 0d. Independent adversarial critic (fresh subagent, checked disk not prose) → **SHIP** — both "Done" statuses HONEST, not overclaims. `@vida/core` 786/787 green; the 1 failure = pre-existing `vault.test.ts` 1 MB perf-timeout flake (encryption layer, touches no schema) — passes standalone 36/36. **Verdict: GATE PASSED.** Only findings = doc-currency (NOT delivery gaps) → folded into Phase 1 step 3.

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
- 2026-08-21: **RESUMED** — DB-3 + DB-4 both complete (DB-4 merged, PR #32). Ran a **Phase 0 delivery-truth gate**
  (Victor request) on the two issues that reopened M1.0: verified true delivery vs the §5.20 ledger (DB-3) + the
  `structure-data.md` floors (DB-4), not just "Done" status. Independent adversarial critic → **SHIP / both HONEST**.
  Gate PASSED — the premature-close failure mode (census-only 2026-08-17) is retired this time. Findings limited to
  doc-currency: (1) stale P0 roster ☐ marks for groups #5/#6/#7/#8/#15/#20/#21/#22 (migrations exist; checkbox lag);
  (2) db-3/db-4 task files not archived (`/task-complete` not run). Both fold into Phase 1 step 3. → proceeding to Phase 1.
- 2026-08-21: **PHASE 1 COMPLETE — M1.0 genuinely CLOSED (this time on evidence, not census).** Re-ran all 5 steps now
  that the schema foundation is truly done: (1) census M1.0 **100%** (aligned 40 · missing/stub/divergent 0; 5 orphans =
  known ADR-017 encryption seams + barrels, 2 quarantined `_legacy` — none blocking); (2) §XXIX currency — reconciled the
  `database-layer/current-spec.md` summary (18→21 groups, migrations …032, `LATEST_VERSION`=32; the per-group sections
  #20–22 were already current); (3) delivery-structure reconcile — `reconstructed-structure.md` #9 DB-3/#10 DB-4 ⏳◻→✅ +
  UX-6 "NOT closed" note→CLOSED; `m1.0-delivery-plan.md` header REOPENED→✅ CLOSED + DB-3/DB-4 rows→DONE; DB-4 task P0
  roster 8 stale ☐→✅; **+ the 2 Phase-0 findings fixed** (P0 checkboxes; db-3/db-4 task files git-archived + `_index.md`
  Planned→Completed + stale "PR #31 NOT merged"→MERGED); (4) tracker/Linear — `--verify` 95 live, zero non-DONE M1.0
  issue, deferred homed (no push); (5) **`m1.0-closeout.md` rewritten REOPENED→✅ CLOSED 2026-08-21** (premature-close
  kept as the resolved lesson). → **Next = Phase 2: open M1.1.**
- 2026-08-17: created; Phase 1 (close out M1.0) run — Steps 1–5; committed `061b0b5` marking M1.0 CLOSED.
- 2026-08-17: Phase 2 — drafted + gated `m1.1-delivery-plan.md` (critic REVISE→fixed).
- 2026-08-18: ⚠ **REROUTE (Victor caught the drift).** M1.0 was CLOSED TOO SOON — its schema foundation (DB-3 partial,
  11/~22 substrate tables; DB-4 not started) was never verified done. Root cause: census `progress` = homed-code
  alignment, NOT issue completion. Also the M1.1 plan had "reshaped the process" (folded DB-4's M1.0 schema authoring
  into module increments). Corrective edits: reopened M1.0 + flagged the mistake across closeout·roadmap·delivery-plan·
  reconstructed-structure·TASKS; corrected the M1.1 grain (modules = service+UI on the FINISHED schema, don't author it)
  + gated M1.1 behind M1.0. Lesson → memory [[m1-foundation-owns-schema-modules-build-on-it]].
- 2026-08-18: **Schema-foundation model + flow DECIDED + DOCUMENTED (Victor's blueprint).** Model B (upfront
  foundation) + 5-phase lifecycle persisted to `docs/roadmap/schema-foundation-build-flow.md`; DB-3 ledger corrected
  vs ADR-002 §5.20; Model-A streaming layer retired across 7 docs; both DB task files primed for clean-context pickup;
  TASKS.md routed to DB-3. No schema authored (that's DB-3's own session). This closes the reconciliation/setup work.

## Resume
**✅ 2026-08-21 — PHASE 0 (delivery-truth gate) + PHASE 1 (close out M1.0) DONE. M1.0 is genuinely CLOSED. Next = Phase 2: open M1.1.**
- **Phase 0 gate PASSED:** DB-3 (LIF-65) + DB-4 (LIF-66) verified *truly delivered* their scope (not just marked Done) — against the ADR-002 §5.20 ledger (11 tables) + the per-domain `structure-data.md` floors (21 groups / 117 tables); independent adversarial critic → both HONEST. `@vida/core` 786/787 (1 pre-existing vault-1MB flake, passes standalone).
- **Phase 1 done:** census M1.0 100%; §XXIX currency reconciled; delivery-structure reconciled (reconstructed-structure · delivery-plan · P0 roster); tracker/Linear verified (95 live, all M1.0 DONE); `m1.0-closeout.md` → ✅ CLOSED; db-3/db-4 task files archived.
- **Phase 2 (next):** re-open `docs/roadmap/m1.1-delivery-plan.md` (drafted 2026-08-17, gated) and re-confirm it holds now that the schema is genuinely complete → run the 8-step milestone-delivery-planning workflow (Steps 6–13) → foundation gate + independent critic → reconcile grain/dep-graph to tracker → accept. Head after = MOD-notes #31.
- Reload: `docs/roadmap/schema-foundation-build-flow.md` · `docs/roadmap/m1.1-delivery-plan.md` · this file's Build Steps Phase 2.

<details><summary>(superseded) 2026-08-18 resume — schema-foundation model decided</summary>

**✅ 2026-08-18 — schema-foundation MODEL + FLOW decided and documented. Reconciliation complete. Next = DB-3 (fresh session).**
- **Model B (upfront foundation) DECIDED** (Victor's blueprint): DB-3 then DB-4 are gated build HEADS authored upfront
  BEFORE M1.1; M1.1+ modules build service+UI on the finished schema, author none. Run via a **5-phase lifecycle**.
- **Authoritative flow doc written:** `docs/roadmap/schema-foundation-build-flow.md` (model + 5-phase lifecycle +
  corrected DB-3 ledger + reconciliation record). All plans/rows/closeout/task-files point here.
- **DB-3 ledger CORRECTED** vs the earlier drifted list (verified vs ADR-002 §5.20): the 11 remaining substrate ADD
  tables = `planned_blocks·templates·review_curves·method_bindings·review_events·values·contributions·purpose_reviews·
  plan_steps·store·rules` (+`values`,+`review_events`; −`topic_reviews` [DB-4], −`measurement` [a column AMEND]).
- **Model-A "streaming" layer RETIRED** across 7 docs (roadmap · m1.0-delivery-plan rows+note+§5.1.1 ·
  reconstructed-structure #9/#10 · m1.0-closeout · m1.1-delivery-plan · both task files).
- **Task files primed** (`db-3-stream-i-consolidation`, `db-4-per-domain-schema`): profile add-backend-component +
  scenario + intent source + 5-phase Build Steps — ready for clean-context pickup.
- **Next:** DB-3 in its own fresh session (`/task-switch db-3-stream-i-consolidation`), running the 5-phase lifecycle.
  DB-4 after DB-3. Do NOT start schema in THIS closeout task/session.

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
</details>

Last session: 2026-08-21 — Phase 0 (delivery-truth gate) + Phase 1 (close out M1.0) complete; M1.0 genuinely CLOSED. Next = Phase 2 (open M1.1).
