---
Session 5 — 2026-09-16
Goal: backend-replan campaign — P5 Linear reorg (execute) + P5.1 organization pass (milestone hierarchy + labels) + make the full forward build queue seamless per vida's established structure.
Profile: project-foundation / milestone-delivery-planning
---

## Accomplished
- **P5 · Linear reorg — DONE (committed `97c369f`).** Projectized the P4-certified 33-issue carve into live Linear via `tools/backend-intent/p5-reshape.mjs` (deterministic, fail-loud) + `tracker_sync`: created LIF-164…177 (11 XS + 2 health splits + KNO-46 park), reshaped 20 (5 renames incl. mod-notes→mod-notes-and-pages), retired 6 (Canceled). XS homed by first-consumer-pull (ADR-019 §3.5); aggregators re-homed ←22 MOD. Gates: method-gate critic REVISE→2 fixed (slug-vs-LIF dangling · scripted-retire) + gate-2 SHIP (edge-exact 33/33, acyclic). `--sync --allow-orphan-create` (the orphan-guard gotcha) + `--retire ×6`.
- **P5.1 · Milestone hierarchy + labels — DONE (committed `42638a3`).** `backend` label on 34 service-tier issues; 5 stale titles renamed to match slugs (API `issueUpdate`); 30 stale aggregator→Canceled relations deleted (`issueRelationDelete`). Track-first `M1.#.#`: renamed 3 milestones in place (M1.1/2/3 → M1.1.1/.2/.3 · Backend), kept **M1.4 flat** (cross-track closer, Victor's cut), created 3 empty frontend milestones M1.2.1/.2/.3 (sortOrder 3200/3400/3600 + done-whens). Reconciled 39 headers + map (keys replaced) + `_projects.md` (delivery order) + `reconstructed-structure.md` (#31–63 + tail +7). Gate: `/preflight` PASSED + `/critique` + independent critic REVISE→5 fixed (F1-F3 `_projects.md` sync-safety/ordering · F4 explicit sortOrder · F5 HARD-4←frontend load-bearing).
- **Forward-queue refresh — DONE (committed `a4bf3b4`).** Archived the 6 retired task files → `.claude/tasks/archive/` (out of the active `--plan` glob) → `--plan` 81→75 active, 0 dead `[READY]`. Refreshed the stale DB-4-era `TASKS.md` routing note → the post-reorg forward queue (M1.1.* #31–63 → M1.2.* [P6] → M1.4 #64–71 → M2 #72–78 → M3 #79–83 → M4 #84–92).
- Session-log committed `5061e1b`; docs/decisions.md + this session file this pass.

## Decisions Made
- **P5 retire = reshape-not-delete** (keep LIF header, Cancel, archive) — preserves audit, cleans the active plan.
- **Track axis → Linear = track-first `M1.#.#` milestone hierarchy** (primary) + Profile-value labels (secondary). Not a bespoke tag.
- **M1.4 Integration Hardening stays FLAT** — the cross-track coherence CLOSER (Victor's cut `_index.md:130`); "M1 done = operable" needs both tracks → `HARD-4 ← M1.2.*` wired at P6 (F5). B1 fix, zero churn.
- **Milestone done-whens documented (B2):** backend = coverage-gated (not showcase) · frontend = the showcase · M1.4 = the both-track M1-done gate.

## Open Questions
- **P6 (the one real gap):** the frontend track is unscoped — 222 UI legs need decompose → coverage gate → home into the empty M1.2.* milestones → wire `HARD-4 ← M1.2.*` + assign frontend `#` positions (insert #63↔#64, shift M1.4+ down).
- **Small triage (non-blocking):** `LIF-160 core-vault-init` is mis-homed in a stray `M1.1 — … (hardening)` milestone (c5d99da1) — re-home + delete the milestone.

## Next Session
First step: **P6 · Frontend track scoping** — write the P6 plan (decompose the 222 P6 UI legs → P6 coverage gate → P6 Linear projectization into M1.2.*), reusing P5's mechanics verbatim (slug-vs-LIF §6.4 · scripted `--retire` · add-only-edge deletion · reshape→`--status`→gate-2→live-write g1-N5) + the Entity Delivery Flow ①/② fork scoped to frontend (ADR-021 §3.5). Re-assert the 0-service-leg boundary. Own plan + §XXVI gates.
Context to reload: `.claude/tasks/backend-replan.md` (P0…P5.1 ✅ → P6) · `PLAN-p5-linear-reorg.md §11a` (frontend forward-declaration) · `coverage-report.md` C5 (222 UI legs) · `traceability.md` (P6-tagged ids) · `docs/roadmap/backend-consolidation-plan.md` §P6. Env: Node 24 · branch `backend-replan` (14 commits ahead of origin, NOT pushed).
