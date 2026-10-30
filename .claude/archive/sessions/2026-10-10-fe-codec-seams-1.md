---
Session 1 — 2026-10-10
Goal: build the next ready, non-colliding FE head — fe-codec-seams #13 (CODEC Composition seams), the apps/web
      runtime-wiring + convention layer consuming the four @vida/core composition engines.
Profile: Add Frontend Component · Scenario: default (Entity Delivery Flow ②)
Worktree: fe-codec-controls-refinement · branch fe-codec-seams off main
---

## Accomplished
- **fe-codec-seams #13 — WHOLE UNIT shipped + MERGED (PR #119 → origin/main `2887e21`); LIF-212 → Done.**
- Entity Delivery Flow ② front matter: BASELINE + interpretation.md (every claim [FACT:]-cited) → Envision Gate
  **SKIP** (§3.75 test = NO user affordance; renders nothing, stated) → **Decomposition Gate Approval 1**
  (slice-map.md + seam-contract.md). Scope = **Option A (convention + defer live)**, doc-resolved.
- **S1 — read-consumption seams (SavedView + Capability/Block):** `apps/web/src/seams/` barrel re-exporting the
  shipped Collection + Dashboard adapters + `CLAUDE.md` conventions (ReadProvider-registration · offered-set→add-menu ·
  service-access) + `index.test.ts` ratify (3 tests). §XXVI double-gate; /critique dropped a speculative `ServiceAccess`
  type (R1) + thinned the test to a drift-guard (R2).
- **S2 — portability seams (Template + Spaces):** named re-export of `./foundation/templates` on the `@vida/core`
  barrel (the only core change) + Template/Spaces consumption conventions + `portability.test.ts` (3 tests).
- Gates: @vida/core build 0 · @vida/web tsc 0 · seams **6/6** · eslint 0 · CI Typecheck/Lint/Test/E2E green · g2
  independent review **SHIP** · /critique **SHIP**.

## Decisions Made
- **Scope = Option A (convention + defer live)** — doc-resolved, NOT a judgment call: `db/CLAUDE.md` homes the live
  main-thread Drizzle-proxy bootstrap to UI-3/first-consumer; `reconstructed-structure.md:44` tags #19→#13 as
  "(ProviderRead)" (the convention seam); `s5-conventions.md` ProviderRead = type+convention. #13 ships the conventions,
  not the live bootstrap. (Victor: "check the documentation" → the gate firing is a doc test.)
- **#7 dependency (task file omitted it) does not block** — the block registry #13 wires already ships in @vida/editor;
  #7's codec aesthetic pass is orthogonal.
- **Templates barrel = NAMED re-export, not `export *`** (§XXVIII deviation D1) — `export *` collided with
  services/checkins' `CreateTemplateInput` (TS2308); named re-export of the 6 non-colliding names, omitting the one
  (not needed on the public surface — capture = deferred core S3–S5).
- **No speculative `ServiceAccess` type** — it prescribed the consumer's injection architecture with no consumer to
  validate; the first consumer (UI-3/#27) chooses the mechanism.

## Open Questions
- **Pre-existing `@vida/web` shell-test flake** — 2–4 `src/shell` jsdom timeout flakes under full-suite load (pass 5/5
  in isolation; CI Test green). Follow-up candidate: raise `testTimeout` for shell render tests. Separate infra debt,
  not a #13 regression. (Decision pending: file a task or leave tracked-open.)
- LIF-212 was found **already Done** in Linear at session start (pre-existing status drift — local was `planned`, code
  didn't exist). This session made that Done status genuinely true.

## Next Session
First step: pick the next ready, non-colliding FE head (`fe-codec-system` #12 if untaken; shell #14 is PR #118,
Victor's parallel session, merging). Fresh `/begin` off `main`; add-frontend-component / Entity Delivery Flow ②.
Context to reload: g6-reshape-runbook.md §2 (unit roster + deps), reconstructed-structure.md, the target unit's deps.
