# Task: fe-codec-seams
# Status: done
# Linear: LIF-212
# Profile: Add Frontend Component
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.2.1 — Hub & Foundation · Frontend
# Source: frontend-replan G0–G6 (reconstructed-structure.md + g6-reshape-runbook.md §2) — supersedes the P6 fe-* grain
# Reshape: G6 net-new · unit #13 · NEW

## Goal
② Frontend — unit #13. CODEC · Composition seams — SavedView · Capability/Block · Template · Spaces engine wiring.
The apps/web runtime-wiring + convention layer that lets surfaces CONSUME the four @vida/core composition engines.
Renders nothing → Verification Gate, no Visual Gate.

## Dependencies
- blocked by `fe-codec-viewmodes` (#3) ✅
- blocked by `fe-codec-collection` (#4) ✅
- blocked by `fe-codec-canvas-editor` (#7) — governing-doc edge the task file originally omitted
  (reconstructed-structure.md:33); RESOLVED: the block registry #13 wires already ships in @vida/editor, so #7's
  codec aesthetic pass does not block #13's convention deliverable.

## Decomposition (Entity Delivery Flow ② front matter — Approval 1 ✅ 2026-10-10)
delivery/{interpretation,envision,slice-map,seam-contract}.md. **Scope = Option A (convention + defer live)**, doc-resolved
(db/CLAUDE.md homes the live Drizzle-proxy bootstrap to UI-3/first-consumer; reconstructed-structure.md:44 tags #19→#13
"(ProviderRead)"; s5-conventions.md ProviderRead = type+convention). 2 slices, both Verification Gate (no Visual Gate):
- **S1 — Read-consumption seams (SavedView + Capability/Block)** — seams barrel + ReadProvider-registration + offered-set
  conventions + RATIFY the shipped collection/dashboard adapters.
- **S2 — Portability seams (Template + Spaces)** — Templates barrel export (@vida/core) + fork-on-instantiate + Spaces
  enabled_blocks consumption conventions.

## Build Steps / Slice Log
- [x] **S1** (2026-10-10) — `apps/web/src/seams/` : `index.ts` (barrel re-exporting collection+dashboard adapters) +
  `index.test.ts` (3 tests: barrel resolve · ReadProvider registration ratify vs live registry · offered-set signature
  ratify) + `CLAUDE.md` (service-access / ReadProvider-registration / offered-set→add-menu conventions). §XXVI double-gate
  (spec Approval + impl Approval); /critique SHIP (R1 dropped a speculative `ServiceAccess` type; R2 thinned the test to a
  drift-guard). Verification Gate PASS: @vida/web tsc 0 · seams 3/3 · eslint 0. No Visual Gate (renders nothing).
- [x] **S2** (2026-10-10) — `@vida/core/src/index.ts` NAMED re-export of `./foundation/templates` (§XXVIII deviation D1:
  `export *` collided with services/checkins' `CreateTemplateInput` → named re-export of the 6 non-colliding names,
  `CreateTemplateInput` omitted as the public surface doesn't need it — capture = deferred core S3–S5) +
  `apps/web/src/seams/portability.test.ts` (3 tests: template barrel import · InstantiationResult shape · addEnabledBlock
  signature) + `seams/CLAUDE.md` (Template fork-on-instantiate + Spaces enabled_blocks conventions). §XXVI double-gate;
  /critique SHIP. Verification Gate PASS: @vida/core build 0 · @vida/web tsc 0 · seams 6/6 · eslint 0. No Visual Gate.

**STATUS: both slices built + fully gated. All four composition seams covered.**
- Verification: @vida/core build 0 · @vida/web tsc 0 · seams **6/6** · eslint 0.
- Full @vida/web suite: 249 passed · **2–4 jsdom timeout flakes in src/shell (pre-existing, PASS 5/5 in isolation,
  varying count, zero dep on this additive change)** — NOT a #13 regression. Follow-up candidate: raise `testTimeout`
  for shell render tests (separate infra debt, like ci-prettier-reformat).
- **g2 independent review: SHIP** (all 5 risks clean — under-build/collision/convention-accuracy/test-quality/build).
- §XXVIII deviation D1 (export* → named re-export) handled + recorded. §XXIX currency: seams/CLAUDE.md current.
- **PENDING: commit → PR → merge → Linear LIF-212 Done** (awaiting Victor's go — harness commit rule).
