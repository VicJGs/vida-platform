# Task: mod-purposes-and-goals
# Status: in-progress
# Linear: LIF-136
# Profile: Add Backend Component
# Scenario: Default (Entity Delivery Flow v1)
# Project: M1 — Whole Manual OS
# Milestone: M1.1.2 — Feature Modules · Backend
# Source: reconstructed-structure.md (Phase V, LIF-110; ADR-016 model)

## Goal
Purposes & Goals (measurability capstone; rolls up every MEASURED module → 1st capstone) — purposes/targets/metrics over all measured modules

## Dependencies
- blocked by `mod-journals` ✅ Done
- blocked by `mod-notes-and-pages` ✅ Done
- blocked by `mod-sessions` ✅ Done
- blocked by `xs-effect-rail` ✅ Done
- blocked by `xs-measurement-engine` ✅ Done
- blocked by `xs-spaces-tags-links` ✅ Done
- blocked by `xs-views` ✅ Done
(all 7 blockers Done — #55 READY)

## Build Steps (Entity Delivery Flow — Default scenario)
- [x] Step 0: document-context BASELINE — aspect corpus (intent authority) + ADR-011 (governing contract) read;
      built seams verified in @vida/core: `foundation/measurement` (normalize/rollup/resolveProgress/assertAcyclic +
      MeasurementSourceRegistry), DB-4 `019_purposes` (6 tables) + DB-3 `007_purpose` (4 substrate tables, already
      built), @vida/types enums present / interfaces = v2 floor (DB-11 owed). Explore agent mapped exact signatures.
- [x] Step 1: Interpretation layer — `docs/features/purposes-and-goals/delivery/interpretation.md` (A deps · B needs ·
      C org · D implicit rules · E M1/M2 boundary · F open questions), each `[FACT: path:line]`. F-2 (review-session
      write) RESOLVED in-doc vs `SHIPPED_SESSION_TYPES=[focus]` + SS-5 (owning-module registers sub-type).
- [x] Step 1.5: Envision Gate — N/A (pure backend, no rendered surface; §3.75 doc test = no novel pattern).
- [x] Step 2: Decomposition Gate — slice-map (9 slices) + seam-contract. **g1 /critique (independent) = REVISE**
      (1 BLOCKER + 5 MAJOR + 3 NIT, all grounded, all folded): #1 sessions port `{registry,service}` not bare
      SessionRegistry (createSession lives on SessionsService); #2 PG-13 FACT honoured → sessions REQUIRED, session
      row at M1 (not demoted to optional); #3 quantitative-target leaf = simple `current/target` (no baseline/dir col,
      those are metric-only); #4 measurementSources introduced at S5 (fixed hidden S4→S5→S6 back-edge); #5
      InvalidContributor two-sided (goal_type AND contributor_type) + citation; #6 S9 cascade two-hop
      metrics→metric-values; #7 deleteMetric ships M1 + cascades values; #8 canonical `DueItem`/`DueProvider`; #9
      citation anchors. → **awaiting Approval 1.**

### Slices (per-slice §XXVI double-gate + live-store Verification Gate + code-review + currency)
- [x] **S1** — Spine CRUD (values/purposes/targets) + DB-11 @vida/types reconcile. `createPurposesService({db,deviceId})`
      + 3 repos + 15 CRUD methods (returning Row types); validators merged into `validators/purpose.ts`; DB-11 reconcile
      in `project.ts` (amend Purpose/Target/PurposeMetric/PurposeMetricValue/TargetReview/Dream + add Value/Contribution/
      PurposeReview/PlanStep + retire BucketListItem/3-junctions/TARGET_TYPE — zero live consumers verified). Verification
      Gate: tsc 0 · eslint 0 · enum-parity 159 · introspection 24 · **9/9 S1 service** · full @vida/core **1793/1793**
      (Node 24). Independent g2 code-review **SHIP** (2 NITs folded: validator file merged to one-per-domain; review_frequency
      create-echo→NULL asserted) → pre-ship /critique **SHIP**. §XXIX currency born (`docs/modules/purposes/current-*`,
      BR-PG-S1-1..10). Caught: @vida/types src edit needs a dist rebuild before @vida/core typecheck [[editing-vida-types-needs-dist-rebuild-before-core-typecheck]].
- [x] **S2** — Dreams CRUD (absorbed bucket_list fields). `createDream`/… 5 methods; `steps` = JSON-in-TEXT (service
      serializes, never json<T>; update distinguishes omit/null/value); backfills status='dream'/priority='medium',
      category nullable (DB default never fires), progress_percentage override slot. Validators co-located. tsc 0 ·
      eslint 0 · purposes **12/12** (3 new). Inline pre-ship critique SHIP (mechanical CRUD; steps round-trip tested).
      §XXIX BR-PG-S2-1..5. Full @vida/core **1796/1796** (first run flaked the known vault-1MB test §XXIV; isolated re-run green).
- [x] **S3** — Metrics + value ledger. `createMetric`/…/`deleteMetric` (hard, two-hop value cascade) + `recordMetricValue`
      + `getMetricCurrent` (override-wins else derive via `calculation_method` sum/avg/latest/max/min/count; empty⇒null
      unmeasured; provenance manual-iff-all-manual). Both tables `softDelete:false`. `enumText`→union so the aggregate
      switch is exhaustive. tsc 0 · eslint 0 · purposes **17/17** (5 new; two-hop cascade proven via raw ledger count 2→0).
      Inline pre-ship /critique SHIP. §XXIX BR-PG-S3-1..5.
- [x] **S4** — Contributions edge. `linkContribution`/`unlinkContribution`/`reweightContribution`/`listContributions`
      over `contributions` (softDelete:true). Two-sided `InvalidContributor` domain guard (goal_type ∈ GOAL_TYPE AND
      contributor_type ∈ CONTRIBUTOR_TYPE; typed, not ZodError). Weight-only edge (contribution_percentage), never a
      copied value (PG-10). listContributions = findWhere + explicit isNull(deleted_at). tsc 0 · eslint 0 · purposes
      **45/45** (4 new). Inline pre-ship /critique SHIP. §XXIX BR-PG-S4-1..3.
- [x] **S5** — Measurability core (the keystone). `progress(entity)` leaf (normalize by kind; quantitative=current/target
      baseline0 higher-better, milestone=status, rate=current, qualitative→null-never-0; dream=override slot) +
      `computeProgress(goal)` **two-channel** rollup (A: spine-targets+metrics equal-weight; B: contributions
      percentage-weight; combine equal — keystone g2 catch #2) + `PurposeProgressView`. Composes `foundation/measurement`
      (normalize/rollup); [0,1] internal, 0–100 at edge (toPct/fromPct); `measurementSources?` deny-safe (empty M1⇒null).
      **Independent g2 keystone review REVISE→folded** (BLOCKER #1 metrics never fed rollup → metric channel added;
      MAJOR #2 weight-scale asymmetry → two-channel equal-combine; #3 6 test gaps added [metric-only/mixed-75/weight-0/
      all-unmeasured/nested]; #4 doc `?? 0`→null PG-3 reconcile; #5 per-entity key note). tsc 0 · eslint 0 · purposes
      **60/60** (16 S5 tests). Pre-ship /critique SHIP. §XXIX BR-PG-S5-1..7.
- [ ] **S6** — Bindings + DAG guard + derived-pull source resolution
- [ ] **S7** — Reviews (target+purpose) + plan_steps + deny-safe sessions? port
- [ ] **S8** — Tags/links/pages (Spaces+Notes) + entity_type value/dream additions
- [ ] **S9** — Provider (Journal summary + dueIn) + emit-only fan-out + deletion propagation (PG-19)

## Open Questions
- F-1 progress 0–100↔[0,1] → RESOLVED (Projects `toPct` boundary precedent)
- F-2 review-session write → RESOLVED (deny-safe `sessions?` port; SS-5 owning-module registers `review` sub-type)
- F-3 cross-module contributor progress via source registry → LEAN (query(key), absent⇒null/excluded)
- F-4 DB-11 reconcile in-place in project.ts → LEAN (reconcile-and-extend, no double-export)
- F-5 is_achieved/analytics → RESOLVED (derived-on-read, no stored counter, PG-17)

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| *(logged automatically by /session-log)* | | | |

## On Failure
1. Always invoke victor:triage first — classify before any fix attempt
2. Check .claude/knowledge/failure-patterns/known-failures.md for this exact error
3. If not documented: solve it, then document per _template.md — before /session-end

## Route History
- 2026-10-06: activated (was backend-replan P5 `planned` stub) via /begin → next `#`-order head #55 (`--next`
  agrees, highest dependent-count 6). Scenario = Default (Entity Delivery Flow v1). Branch `mod-purposes-and-goals`
  off main @ `a27aaa8` (front-matter phase in the main tree; worktree if the Verification Gate needs it). All 7
  blockers Done. Step 0 BASELINE + Step 1 Interpretation + Step 2 decomposition (slice-map 9 slices + seam-contract)
  authored; g1 /critique dispatched (independent critic) → awaiting Approval 1.
- 2026-10-06: Approval 1 GRANTED ("ground everything in the documentation") → **S1–S5 built + committed** (front
  matter `5ce324e` · S1 `666ac3d` · S2 `08fc4c3` · S3 `ece5018` · S4 `1904555` · S5 `d94ceba`). Each slice full
  Entity Delivery Flow; S1 + the S5 keystone ran independent g2 reviews (keystone caught 2 real rollup bugs →
  two-channel rollup). purposes 60/60, full @vida/core 1819 green (vault-1MB flake §XXIV ISOLATED).
- 2026-10-06 (session-end): **STRUCTURAL recovery** — a parallel fe-codec session switched the shared working tree to
  `main` (its session-end `e073178`, already on origin/main), so my 6 commits landed on local main. Facts gathered
  (origin/main=e073178; `origin/main..main` = exactly my 6 commits) → `git branch -f mod-purposes-and-goals d94ceba`
  (feature branch = my work on origin/main) + `git branch -f main origin/main` (realign) + pushed the branch. Nothing
  lost. Lesson re-confirmed [[parallel-session-shared-tree-collision-use-worktree]] → **S6 should use a git worktree.**
  **Next: S6 bindings + DAG + derived-pull** in a FRESH session (`git checkout mod-purposes-and-goals`).

## Notes
- Env: Node 24 via nvm for @vida/core tests (better-sqlite3 ABI; `.nvmrc`=22 base).
- Composes BOTH migration sets: DB-4 `019_purposes` (owned 6) + DB-3 `007_purpose` (substrate 4, already built).
- The measurement engine is RATIFY-compose (ADR-011 §3.8 "contributions → MOD-purposes"); do not rebuild it.
- Parallel worktree `fe-codec-primitives-refinement` may be active — don't disturb it.
