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
- [x] **S6** — Bindings + DAG guard + derived-pull source resolution. `bind(target,{binding_mode,ref?})` persists
      `binding_mode` + the source ref in `measurement_method` (`${type}:${id}`, the PG-11/PG-15 restored column;
      `manual` clears both). Composes the built `assertAcyclic` over the BINDING graph (other bound targets' edges
      reconstructed from `measurement_method` + the proposed `source→target` edge, both modes) → `CyclicBinding` at
      author time (PG-8). `derived-pull` targets route their leaf through `measurementSources` (override `current_value`,
      §3.6) → null at M1 (empty registry), live M2. **Independent g2 review SHIP** → 3 folds: DAG = binding edges ONLY
      (contributions can't close a binding cycle → removed inert edges, matches seam-contract §3); `measurement_method`
      bind-managed (`createTarget`/`updateTarget` reject a direct write → `BindingRefManaged`, closes a ref-corruption +
      DAG-bypass leak); misnamed 3-node-cycle test fixed. tsc 0 · eslint 0 · purposes **72/72** (+12 S6) · full
      @vida/core **1832/1832**. §XXIX BR-PG-S6-1..6. Commit `80038a1`.
- [x] **S7** — Reviews (target+purpose) + plan_steps + the **REQUIRED** `sessions` port (the task-file "deny-safe?"
      line was stale — seam-contract/interpretation F-2 say REQUIRED, PG-13 FACT, g1 #1/#2). `openTargetReview`/
      `openPurposeReview` write the `target_reviews` (no `deleted_at`)/`purpose_reviews` ledgers, register the SHARED
      `review` sub-type idempotently (catch `DuplicateSubType` — flashcards also registers it; first-wins keyed by
      sub_type; `createSession` enforces presence only, so the lifecycle divergence is inert at M1), fire a
      `scheduled` review session (firing M2), + (targets) compute `next_review_date` (inline UTC math, no date-fns —
      finance precedent; month-clamp). `plan_steps` doc layer (add/toggle/list, PG-11). **All 3 doc-ambiguous calls
      (def lifecycle · session status · attach) resolved as FACTS from the seam-contract + `createSession` code, not
      manufactured decisions** (Victor ×2: "ground it in the documentation and code"). Independent g2 **SHIP** (2 NITs,
      both spec-consistent, no folds). tsc 0 · eslint 0 · purposes **79/79** (+7 S7) · full @vida/core **1839/1839**.
      §XXIX BR-PG-S7-1..7. Commit `f8f875e`.
- [x] **S8** — Tags · links · pages (Spaces + Notes). ✅ **BUILT** — tsc 0 · eslint 0 · purposes **86/86** (62 service
      [+7 S8] + 24 introspection, live SQLite Node 22) · full @vida/core **1845/1846** (1 = known vault-1MB flake,
      encryption untouched §XXIV). g1 /critique REVISE→folded · g2 code-review **SHIP** ("exemplary thin-wrapper slice",
      2 NITs folded: `void p` test smell + stale seam-contract:20) · pre-ship /critique SHIP. §XXIX currency written
      (current-spec S8 surface+deps · BR-PG-S8-1..5). **1 §XXVIII deviation (gate-caught):** note method uses
      `getPagesForEntity`+`createPage` (titled page) not `notes.ensureEntityNote` (which seeds `content` not `title`) —
      the critic's pre-vetted option (a). **PLAN v2 (REVISED after g1 /critique REVISE — folded 1 BLOCKER + 2 MAJOR + NITs):**
      **Scope (PG-18, seam-contract composition-seam-5):** wire universal tagging + entity-linking + a standalone-note
      surface for the purposes-owned entities, composing the BUILT `SpacesService` (WRITE) + `NotesService` (`pages`).
      Read/write split holds — purposes never touches `entity_tags`/`entity_links`/`pages` tables directly; all go THROUGH
      spaces/notes ([[spaces-junctions-split-read-write-tagentity-blind-inserts]]).
      **Deps (factory):** ADD `spaces: SpacesService` + `notes: NotesService` (both REQUIRED — seam-contract.md:16-21).
      **DEVIATION — DROP `registry: TaggableTypeRegistry` (g1 UPHELD, premise corrected):** [FACT:
      `value`/`purpose`/`target`/`dream`/`purpose_metric_value` already in shared `ENTITY_TYPES` (`_registry.ts:13,50-53`);
      `createTaggableTypeRegistry` seeds from it (`registry.ts:15-16`) → "add value+dream" is RATIFY-done at DB-4, no
      `register()`.] [FACT: `spaces.*` validate `entityType` INTERNALLY against the registry injected at its construction
      (`spaces/service.ts:76-78,128-129,158-159`; `createSpacesService(db,deviceId,registry)`) — S8 writes THROUGH spaces,
      so it inherits validation + needs no own registry.] Correction: projects DOES take `registry` (`projects/types.ts:29`)
      — but only to build a READ `createAssociationResolver` at its S7 (`projects/service.ts:61`), NOT for tag/link writes.
      S8 specs no link-READ surface → no resolver → no registry. (If S9 needs link reads, it pulls registry first-consumer.)
      **Methods (factory-no-`this`):**
      · tag/link WRITES = projects-precedent-exact thin wrappers → `tagEntity(t,id,tagId)`→`spaces.tagEntity(tagId,t,id)` ·
        `untagEntity(t,id,tagId)`→`spaces.untagEntity` · `linkEntity(pageId,{t,id},ctx?)`→`spaces.createLink(pageId,t,id,ctx)`
        · `unlinkEntity(pageId,{t,id})`→`spaces.removeLink` (arg-orders verified vs `spaces/service.ts:44,47-53`).
      · note surface (NOT projects-precedent — purposes OWNS it by ratified seam-contract, unlike projects which punts
        general notes to FE): **`ensureEntityNote(t,id)`** → findById the owned entity (throws `*NotFound` — getProjectPage
        guard precedent `projects/service.ts:385`) → `notes.ensureEntityNote('note', t, id, { title })` (the real 4-arg
        sig `notes/types.ts:68-73`; `title` = the owned entity's `title`/`name`, a client-side read of OWNED data, in-contract
        per `EntityNoteSeed` `notes/types.ts:38-45`). No new PAGE_TYPE. (DROPPED `getEntityPages` — no consumer; FE reads
        via NotesService directly, scope-creep NIT.)
      **Typed entity_type unions (MAJOR #2 — PG-18 outranks the slice-map roster, [[aspect-docs-outrank-rebuild-decomposition-artifacts]]):**
      `PurposeTagLinkType = 'value'|'purpose'|'target'|'dream'|'purpose_metric_value'` (full PG-18 set `business-rules.md:99-102`,
      `purpose_metric_value` seeded `_registry.ts:53`) for tag/link; `PurposeNoteType = 'value'|'purpose'|'target'|'dream'`
      for `ensureEntityNote` (the titled first-class entities; a `purpose_metric_value` ledger row has no title → not a
      standalone-note subject, only a tag/link target).
      **OUT of S8 (NIT #6 boundary):** the Bucket List Space over `dreams` + vision-board/Gallery + neural graph = ②
      `fe-purposes`/Spaces-view (`contract.md:40-41`, `slice-map.md:54`); S9 owns the provider. No creep here.
      **Verification Gate (blocking):** tag/untag + link/unlink round-trips · `ensureEntityNote` idempotency (2nd call = same
      page id) + `*NotFound` on a missing owner · tag/link rejects an out-of-set type (spaces registry) · live-store smoke
      (real SQLite junction + pages writes) · tsc 0 · eslint 0 · @vida/core green (Node 24).
      **Then:** independent g2 code-review → /critique SHIP → §XXIX currency (current-spec S8 + BR-PG-S8-*).
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
- 2026-10-06: **S6 built + committed (`80038a1`)** in an isolated worktree `.claude/worktrees/mod-purposes-and-goals`
  (root parked on `main`; sibling fe-codec-controls-refinement WIP stashed `stash@{0}` for recovery). Victor
  drift-catch at the start: I framed the `ref`-persistence as an options-menu decision → he directed "check the
  documentation, this is a clear drift of a question." Reading the full aspect set (`structure-data.md` "binding_mode
  (+ ref)" + measurement_method restore) + ADR-011 §3.5/§3.6/§3.7 (delegates only traversal/perf to build-phase,
  NOT storage) resolved it as FACT: `measurement_method` is the source-key home. [[dont-frame-a-doc-resolved-handling-as-a-decision-nor-over-correct]].
  Built → Verification Gate green → independent g2 SHIP (3 folds: inert contributions-graph removed; `BindingRefManaged`
  bind-managed guard; misnamed test) → §XXIX BR-PG-S6-1..6. **Env gotcha:** the parallel g2 agent ran `pnpm rebuild
  better-sqlite3` under Node 20 in the shared worktree → ABI 115 vs my Node-22 ABI 127 → all tests failed at setup;
  fixed by recompiling against Node 22 (§XXIV ISOLATED env). **Next: S7 — reviews + plan_steps + sessions port** (same
  worktree; branch NOT pushed/PR'd yet — PR when ① complete).
- 2026-10-07: **S8 built** (tags · links · pages) in the worktree. Compose `SpacesService` (tag/link WRITE wrappers) +
  `NotesService` (titled standalone note find-or-create). Full Entity Delivery Flow: Step 0–2 grounding (3 grounded
  findings surfaced vs the slice-map prose: entity_types already seeded = RATIFY not build; `contract.md:42` "⚠
  INTENDED" stale vs shipped `_registry`; projects takes `spaces`+`notes`) → g1 /critique **REVISE** (1 BLOCKER
  `ensureEntityNote` 4-arg/misattributed + 2 MAJOR [union omits `purpose_metric_value`; drop-registry premise false —
  projects DOES take registry for a READ resolver] + NITs) → all folded → Approval 1 (Victor) → preflight PASSED →
  **implemented** (deps `+spaces +notes`, **no `registry`** write-only; `PurposeTagLinkType`/`PurposeNoteType` split per
  PG-18) → Verification Gate (tsc 0, eslint 0, purposes 86/86 live, full core 1845/1846) → g2 code-review **SHIP** (2
  NITs folded) → pre-ship /critique SHIP → §XXIX currency (BR-PG-S8-1..5). **§XXVIII deviation (gate-caught):**
  `notes.ensureEntityNote` seeds `content` not `title` → switched to `getPagesForEntity`+`createPage` (critic's option a,
  titled). **Env churn (§XXIV ISOLATED):** the g1/g2 agents rebuilt `better-sqlite3` to Node 20 ABI 115 → `node-gyp
  rebuild` under Node 22 restored ABI 127; tests pass only when the binding ABI matches the running Node (Node 22 ⇄ 127).
  **Next: S9 — provider (Journal summary + dueIn) + emit-only fan-out + deletion propagation (PG-19), the ① closer; then
  PR the whole ① build.**
- 2026-10-06: **S7 built + committed (`f8f875e`, pushed to origin)** in the worktree. Reviews (target+purpose ledgers)
  + plan_steps + the **REQUIRED** `sessions` port. Victor drift-catch ×2 again ("check the documentation" / "ground
  it in the documentation and code"): I twice presented the review-session semantics (def lifecycle · session status ·
  attach) as a recommendation table; all three are FACTS — the seam-contract specifies the def verbatim, contract.md:24
  fixes status=`scheduled`, and `createSession` (service.ts:276/291) enforces sub-type *presence* only + stores status
  as-given (so the shared-`review`-sub-type divergence with flashcards is inert at M1). Lesson: read the full aspect set
  **+ the governing foundation code** before presenting anything. Independent g2 **SHIP** (no folds; 2 spec-consistent
  NITs). Guarded the g2 agent against `pnpm rebuild` this time (the S6 ABI gotcha). tsc 0 · eslint 0 · purposes 79/79 ·
  full @vida/core 1839/1839. §XXIX BR-PG-S7-1..7. **Next: S8 — tags/links/pages (Spaces+Notes) + value/dream
  entity_types** (same worktree).

## Notes
- Env: Node 24 via nvm for @vida/core tests (better-sqlite3 ABI; `.nvmrc`=22 base).
- Composes BOTH migration sets: DB-4 `019_purposes` (owned 6) + DB-3 `007_purpose` (substrate 4, already built).
- The measurement engine is RATIFY-compose (ADR-011 §3.8 "contributions → MOD-purposes"); do not rebuild it.
- Parallel worktree `fe-codec-primitives-refinement` may be active — don't disturb it.
