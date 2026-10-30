---
Session 4 — 2026-09-15
Goal: backend-replan campaign (ADR-021) — P4 · Coverage Gate: prove the P3 33-issue carve is a complete, sound, non-overlapping cover of the 1200-id intent corpus before P5 reshapes Linear.
Profile: project-foundation / milestone-delivery-planning
---

## Accomplished
- **P4 method gate (Approval 1):** wrote `PLAN-p4-coverage-gate.md` → independent adversarial critic **REVISE** (2 blocking: a false leg "anomaly" [misdiagnosed 968+229≠1200] + the `-u` suffix-regex undercount [naive parts sweep = 1192, not 1200]) + `/preflight` **BLOCKED** → **6 fixes** (suffix-preserving id regex `[A-Z]+-[0-9]+u?`; `-u` integrity sub-check; C5 accepted-home-form allowlist; C6 acyclicity spot-confirm; corpus per-file counts not-a-check-input; critic sample pinned to the `-u` ids + projects46/47) → **Victor approved.**
- **Execution (two-layer, cheap-iteration):** authored `tools/backend-intent/p4-set-cover.mjs` (Node 24, fail-loud, dumb auditable set-algebra). Fresh-extracts D* from 34 `parts/*.md`, issue-coverage from `decomposition.md`, homed-out from `traceability.md`; computes C-COVER/C-SOUND/C-PARTITION + partition/leg identities; exits 1 + offending ids on any defect.
- **Layer-1 result (re-derived from disk, not P3's asserted numbers):** **D\*=1200 authoritative** — disk suffix-preserving sweep = corpus per-file table = traceability, **bijective (D*∖trace=∅ · trace∖D*=∅)**. C-COVER **0 unhomed** · C-SOUND **0 smuggled** (both directions) · C-PARTITION **0 double-home**; identities close (985+401−186=1200 · oneLeg990+twoLeg210=1200). Fail-loud proven (`--inject-smuggle` → exit 1).
- **Layer-2 flagship critic (§XXVI gate-2): SHIP, zero blocking** — independently re-derived all 4 properties from disk; hand-verified the pinned sample (8 `-u` ids + projects=47); audited the script un-rigged; confirmed not self-certifying (P3 artifacts untouched, HEAD 4c1560d). **Closed the report's `#85 CAP-authoring` flag** (real documented issue, DF-12). Caught 1 prose NIT (RIDE = 96 single + 2 legitimate `skills` service rides) → currency-fixed post-SHIP.
- Wrote `coverage-report.md` (the certified join key for P5). Committed `372284a` (P4 artifacts) + `63d9d00` (session-log).

## Decisions Made
- **P4 = SHIP** (Victor ratified). Denominator D*=1200 = disk truth; corpus header prose 1194 is a stale reader-declaration undercount (1192 naive drops the 8 `-u`; 1201 assembly +1) — superseded, not a defect.
- **Coverage-gate method** = deterministic script + independent critic, both re-deriving from the corpus on disk (never from the matrix under test) — the independence is what makes the PASS meaningful; C-SOUND adds the inward soundness direction P3's own gate under-tested.
- **`KNO-46`** → park as an `M2+ undesigned` backlog item at P5 (homed but untargeted; not a P3 re-entry).

## Open Questions
- [P5] Dispose the module-vertical Linear issues #31–#48 + mod-notes LIF-131; park KNO-46 as M2+ undesigned.
- (none blocking P5 start)

## Next Session
First step: **P5 · Linear reorg** — build the real projects/milestones/issues from the SHIP'd 33-issue set (`coverage-report.md` = certified join key); retire #31–#48; dispose LIF-131; park KNO-46. Runs its own plan + §XXVI gates (ADR-021 §3.6).
Context to reload: `coverage-report.md` + `decomposition.md`/`traceability.md` (the issue set) · `.claude/tasks/backend-replan.md` (Progress P0✅…P4✅ → P5) · `docs/roadmap/backend-consolidation-plan.md` (P5 scope). Env: Node 24. Branch `backend-replan`, 10 commits ahead, NOT pushed.
