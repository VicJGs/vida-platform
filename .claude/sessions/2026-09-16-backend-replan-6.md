---
Session 6 — 2026-09-16
Goal: backend-replan campaign — P6 Frontend Track Scoping (Step 1 Ground → PLAN → §XXVI double-gate → decomposition + coverage gate). Stop at the Linear boundary.
Profile: project-foundation / milestone-delivery-planning
---

## Accomplished
- **Step 1 Ground ✅** — the frontend corpus is DERIVABLE from the P4-certified artifacts, not a fresh intake: `traceability.md` carries exactly 222 `P6:P6` rows (212 ui + 10 single, 0 service — C5). Frontend milestone spine (M1.2.1/.2/.3) already exists (P5.1), mirrors the backend M1.1.* waves 1:1.
- **Steps 2-3 intent + docs pass ✅** — resolved the one real decision (the 25 xcut-UI legs). Scoped each against disk (namespaced to its owning part — caught the id-collision-across-parts trap): **11 RIDE** already-built M1.0 UI (search/UX-2 · serializers/UI-3 · export/UI-2 · graph/UI-2 V7 · Spaces/S2 · views/UI-2) + **8 integrations/AI** config faces + **6 module-folds**. 0 standalone xcut frontend issues.
- **Step 5 PLAN written** — `PLAN-p6-frontend-track.md`: 24 frontend issues (22 per-module ② tracks + 2 thin VISIBLE cross-cutting), consumer-pull homing into M1.2.1(6)/M1.2.2(13)/M1.2.3(5), `HARD-4 ← M1.2.*` (F5), the DB-8/M1.4 search boundary, +24 tail renumber.
- **§XXVI double-gate ✅** — `/critique` REVISE→3 fixed (BR-9 `fe-` convention · R1 resolved to M1.1.2 ride-target · NOT-24 collision named) → **Approval 1 (Victor)** → `/preflight` BLOCKED→2 fixed (RIDE done-when + DB-8/M1.4 boundary · explicit +24 renumber) → **independent adversarial critic (`ad87117b`) SHIP** (re-derived ALL from disk: 222 count · 23 bucket counts · 25-leg xcut split · 197+6+11+8=222 · 0 service · 22 backend twins · no wave inversion · DB-8 boundary · +24 math; 1 cosmetic NOT-24/25 wording slip fixed) → **Approval 2 (Victor)**.
- **Local build ✅** — `tools/backend-intent/p6-decompose.mjs` (deterministic generator) → `decomposition-p6.md` (24 issues) + `traceability-p6.md` (222 leg→issue, slug:id keyed). **P6 coverage gate PASS** — `p6-set-cover.mjs` (independent, re-reads source + assignment separately): 222 · 0 service · 0 unhomed · 0 phantom · 24 issues · partition=222 · NOT-24 collision preserved · per-issue counts EXACT vs plan §3. **Teeth proven** (drop-row→UNHOMED fail · mis-map NOT-24→collision fail · restore→PASS).
- **⏸ STOPPED at the Linear boundary** — nothing written to Linear. The live write is a self-contained next block.

## Decisions Made
- **Grain = per-module ② track, 0 standalone xcut issues** — xcut-UI legs render elsewhere (RIDE or fold), not a new infra layer.
- **Thin layers must be VISIBLE** (Victor) — `fe-shell-integration-wiring` (11 RIDE) + `fe-integrations-ai-surfaces` (8) as tracked issues, not invisible rides.
- **`fe-<slug>` naming** (BR-9) mirrors backend `mod-`/`xs-`; edges join by slug.
- **RIDE search wires to seam + `search-unavailable` now; live FTS5 → DB-8/M1.4** (correctness boundary).
- **Coverage gate independent of the generator + negative-test-proven** — the un-rigged, fail-loud discipline from P4.

## Open Questions
- The live Linear write is pending (24 creates + `HARD-4 ← M1.2.*` + tail renumber #64-116) — needs its own gate-2 + explicit go.
- Small triage still open: re-home `LIF-160 core-vault-init` + delete the stray `M1.1 (hardening)` milestone (c5d99da1).

## Next Session
First step: **P6 · live Linear reorg** — build the 24 `fe-*` task files + a `p6-reshape.mjs` (reuse `p5-reshape.mjs` shape) → wire edges (fe←mod-twin #37-70 · shell←DB-8 search-only · integ-ai←XS-{egress,ingestion,ai}+capability · HARD-4←M1.2.*) → `--status` dry-run → gate-2 (independent on-disk critic) → live write (`--sync --allow-orphan-create`). Fold in the LIF-160 triage.
Context to reload: `.claude/tasks/backend-replan.md` (P0…P6-mid) · `PLAN-p6-frontend-track.md` §5 (exec steps) · `decomposition-p6.md`/`traceability-p6.md` · `PLAN-p5-linear-reorg.md` (mechanics precedent §6.4/§7.4/g1-N5) · memory [[tracker-sync-orphan-create-guard]]. Env: Node 24 via nvm (`nvm use 24`). Branch `backend-replan`, NOT pushed.
