# PLAN — P6 · Frontend Track Scoping (the separated ② UI tier)

> Campaign: `backend-replan` (LIF-163) · Phase P6 · Profile: project-foundation / milestone-delivery-planning
> Gate policy: own plan + §XXVI double-gate (ADR-021 §3.6). This file = the **gate-1 spec** (Approval 1 target).
> Env: Node 24 · branch `backend-replan`. Grounded on the P3/P4 gated artifacts (no fresh intake — §11a).

## 0. Source model (No-Guessing)

Every claim below is `[FACT: source]` / `[INTERPRETATION]` / `[UNKNOWN]`. The frontend corpus is **derived**
from the P4-certified partition, not re-intook: `traceability.md` already carries **222 rows tagged `P6:P6`**
`[FACT: traceability.md — 222 P6:P6 rows, re-counted on disk]`, and P4 proved the split is clean
`[FACT: coverage-report.md:50 — "P6 (222 legs) ✅ — 212 ui + 10 single; zero service legs"]`.

## 1. Context — what P6 is (and is not)

P5 projectized the **backend service tier** (33 XS/MOD issues) into live Linear. The **frontend ② tier was
explicitly NOT projectized** `[FACT: PLAN-p5-linear-reorg.md:219-220 §11a]`; the 222 homed-out UI legs stay
un-tracked until P6 reshapes them. P6 runs **the same shape as P1→P5, one tier down**
`[FACT: PLAN-p5 §11a:226-231]`:

1. **Decompose** the 222 UI legs into frontend issues (consumer-pull homing — a UI leg homes at its owning
   module's _frontend_ milestone, riding the finished service tier).
2. **P6 coverage gate** — ⋃ frontend-issues ⊇ 222 UI legs (0 unhomed) **and re-assert 0 `service` legs leaked**
   `[FACT: §11a:232-233 — boundary invariant to re-check]`.
3. **P6 Linear reorg** — project the frontend issues into the (already-created, empty) **M1.2.\*** milestones,
   reusing P5's mechanics verbatim.

**Out of scope (carried, not re-opened):** the carve of the backend tier (P3/P5, done); any `@vida/core`
service code (the M1.1.\* build phases); schema (P2, done); M2+ intent. No new intent enters here — the input
is the fixed 222-leg set.

**The Entity Delivery Flow ①/② fork is now scoped to the frontend** `[FACT: ADR-021 §3.5; consolidation-plan
backend-consolidation-plan.md:94]`: each frontend issue is the **② UI/UX Build Flow** for its module,
consuming that module's finished ① service, closing each slice with a **per-slice blocking Visual Gate**.

## 2. Business rules / invariants (the acceptance spine)

- **BR-1 — Full coverage.** ⋃(frontend-issue leg-sets) ⊇ the 222 `P6:P6` legs; **0 unhomed**.
- **BR-2 — Boundary re-assert.** **0 `service` legs** in the P6 set (a UI issue must not smuggle service logic
  back in) `[FACT: §11a:232-233]`. Verified against `traceability.md` leg-type column.
- **BR-3 — Per-module grain.** One frontend issue per module per wave (the ② track). **0 standalone `xcut`
  frontend issues** — the 25 xcut-UI legs are UI-halves of already-split legs that render **elsewhere** (RIDE
  or fold), not a new infra layer `[FACT: docs-pass on the 25 legs, this session; each leg's corpus row marks
"both → SPLIT: service … + UI (P6)"]`.
- **BR-4 — Consumer-pull homing.** A module's frontend issue homes at its wave's frontend milestone
  (M1.2.1/.2/.3), mirroring its backend twin's wave (M1.1.1/.2/.3) 1:1 `[FACT: reconstructed-structure.md:89-147]`.
- **BR-5 — RIDE visibility.** Already-built-M1.0 UI is wired by a **thin, VISIBLE** issue with a done-when
  (`fe-shell-integration-wiring`), never an invisible RIDE-only note `[Victor 2026-09-16]`.
- **BR-6 — "M1 done" honesty.** `HARD-4 ← M1.2.*` edge is REQUIRED — M1.4 (the flat cross-track closer) cannot
  close on the backend alone `[FACT: P5.1 F5; ADR-019 §3.2; _projects.md:8-10]`.
- **BR-7 — Mechanics reuse (no re-derivation).** slug-vs-LIF join care (§6.4) · scripted `--retire` ·
  add-only-edge deletion (§7.4) · reshape→`--status`→gate-2→live-write (g1-N5) · `--allow-orphan-create` for
  new issues `[FACT: PLAN-p5 §6.4/§7.4; memory tracker-sync-orphan-create-guard]`.
- **BR-8 — Grain reconciles 1:1 to the tracker.** No fold/split away from the issue grain that hides an
  orphan/gap; reconcile both directions.
- **BR-9 — Naming convention (decision, introduced here).** Frontend issues are slugged **`fe-<module-slug>`**,
  mirroring the backend `mod-<slug>` / `xs-<slug>`; edges resolve by slug (BR-7), so `fe-notes-and-pages ←
mod-notes-and-pages` joins cleanly. P6 is the first frontend projectization → no prior convention exists; this
  is the choice `[DECISION 2026-09-16, not a FACT — pending Approval 1]`.

## 3. The decomposition — 24 frontend issues

**24 issues = 22 per-module ② tracks + 2 thin cross-cutting**, covering all 222 legs. Leg counts are exact
(raw `traceability.md` bucket counts + the xcut redistribution below); Σ = 222.

### M1.2.1 — Hub & Foundation · Frontend (6 issues)

| Issue                                | Legs                                       | Source                                                                                          |
| ------------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `fe-preferences`                     | 7 + folds SP-27, TPL-12 = **9**            | preferences bucket + Spaces-config folds                                                        |
| `fe-sessions`                        | 2 + pomodoro 3 = **5**                     | sessions-and-scheduling + pomodoro (intra-domain fold; pomodoro = a sessions sub-type, ADR-004) |
| `fe-journals`                        | **8**                                      | journals bucket                                                                                 |
| `fe-notes-and-pages`                 | 10 + folds BSE-12, CAP-12, CAP-13 = **13** | notes bucket + preview-card/Space-add-menu folds                                                |
| `fe-check-ins`                       | **10**                                     | check-ins bucket                                                                                |
| `fe-shell-integration-wiring` (thin) | **11**                                     | RIDE bucket (below)                                                                             |

### M1.2.2 — Feature Modules · Frontend (13 issues)

| Issue                                | Legs                    |
| ------------------------------------ | ----------------------- |
| `fe-finance`                         | 29                      |
| `fe-gamification`                    | 7                       |
| `fe-habits`                          | 8                       |
| `fe-knowledge`                       | 4 + fold CAP-26 = **5** |
| `fe-books`                           | 32                      |
| `fe-learning-education`              | 6                       |
| `fe-notifications`                   | 2                       |
| `fe-projects`                        | 3                       |
| `fe-purposes-and-goals`              | 2                       |
| `fe-relationships`                   | 3                       |
| `fe-routines`                        | 7                       |
| `fe-tasks`                           | 11                      |
| `fe-integrations-ai-surfaces` (thin) | **8**                   |

### M1.2.3 — Depth & Recovered · Frontend (5 issues)

| Issue                 | Legs |
| --------------------- | ---- |
| `fe-health-core`      | 12   |
| `fe-health-nutrition` | 2    |
| `fe-health-training`  | 9    |
| `fe-languages`        | 2    |
| `fe-skills`           | 18   |

### The 25 xcut-UI legs — explicit disposition (0 standalone xcut issues)

**RIDE bucket → `fe-shell-integration-wiring` (M1.2.1), 11 legs** — wire already-built M1.0 UI to the finished
service tier.
**Done-when (resolves GAP-1 + R2):** each built component (⌘K search · export dialog · serializers · neural-graph ·
Spaces add-menu · view degradation) wired to its available provider seam, with all terminal states rendered
correctly. **Cross-milestone boundary:** the search legs (`BSE-14/15/16`) wire to the `SearchProvider` seam +
render `search-unavailable` **now** (M1.2.1); **live FTS5 ranked results defer to DB-8/M1.4**
`[FACT: xcut-backlinks-search-export.md:45-47 — engine DEFERRED DB-8/M1.4; SearchProvider/states fixed by UX-2;
stubSearchProvider→search-unavailable until DB-8]`. So `fe-shell-integration-wiring ← DB-8` for the _live-search_
completion only; its M1.2.1 done-when is seam+states, not live FTS5. The export/graph/spaces/views legs ride
services already built (no cross-milestone defer).

- `BSE-14/15/16` ⌘K search UI ← UX-2 command-bar `[FACT: command-bar-and-search.md; search-provider built]`
- `BSE-19/20/21` MD/PDF/DOCX serializer UI ← UI-3 `@vida/editor` E6/E7/E8 `[FACT: ui-3 archive — serializer suite COMPLETE]`
- `BSE-22` export dialog ← UI-2 `export-dialog` `[FACT: ui-2 archive]`
- `BSE-23/24` neural-graph surface ← UI-2 V7 neural-graph `[FACT: ui-2 archive]`
- `SP-29` Spaces add-menu/slash ← S2 Spaces seam + editor slash-menu `[FACT: ui-4 S2; ui-3 E4]`
- `views:XCU-14` view-renderer degradation ← UI-2 platform views `[FACT: ui-2 archive; capability-framework graceful-degradation]`

**Integrations/AI cluster → `fe-integrations-ai-surfaces` (M1.2.2), 8 legs** — net-new cross-module config faces
no single feature module owns:

- `ING-03u` consent gate · `06u` egress audit-trail · `10u` import reconcile/review · `16u` Preferences
  integrations page · `18u` AI mode-choice · `19u` outgoing-context review · `25u` AI management page · `CAP-17`
  grant/consent prompt `[FACT: xcut-ingestion-ai.md rows; xcut-capability XCU-CAP-17]`
- **Ride-target (resolves R1):** these config faces consume the **finished M1.1.2 backend twins** —
  `XS-egress-guard (#43)` · `XS-ingestion (#44)` · `XS-ai (#45)` (grant/consent → `XS-capability #31`), all built
  in M1 `[FACT: reconstructed-structure.md:109-115,93]`. So the M1.2.2 home is legitimate (finished service to
  ride); the residual risk is only "no ingestion/egress _service_ logic leaks into the UI issue" (BR-2 spot-check).

**Module folds (6 legs)** into the consuming module's issue: `BSE-12`+`CAP-12`+`CAP-13` → `fe-notes-and-pages` ·
`CAP-26` → `fe-knowledge` · `SP-27`+`TPL-12` → `fe-preferences`.

Arithmetic: 197 non-xcut bucket legs + 6 folds → 22 module issues (203) · 11 RIDE · 8 integrations/AI =
**222** ✅.

## 4. Acceptance (§4 — what "P6 plan done" means)

1. A `decomposition-p6.md` + `traceability-p6.md` exist: every one of the 222 `P6:P6` legs assigned to exactly
   one of the 24 issues (BR-1), machine-verified 1:1, 0 unhomed.
2. **P6 coverage gate PASS** — a deterministic set-cover re-derivation (reuse `p4-set-cover.mjs` shape) proves
   ⋃ ⊇ 222 · 0 unhomed · **0 `service` leg** in the set (BR-2) · partition closes; + a Layer-2 adversarial critic
   that re-derives from disk (not the plan's prose).
3. The 24 issues home to M1.2.1(6)/M1.2.2(13)/M1.2.3(5) per BR-4; each carries its ② profile (add-frontend-
   component), its consumed backend twin, and its per-slice Visual Gate policy.
4. `HARD-4 ← M1.2.*` wired (BR-6); frontend `#` positions assigned. **Explicit renumber (+24):** the 24 frontend
   issues take **#64–87** (M1.2.1 → M1.2.2 → M1.2.3 order); the whole tail shifts +24 → **M1.4 #88–95 · M2
   #96–102 · M3 #103–107 · M4 #108–116** `[FACT: current P5.1 tail M1.4 #64-71/M2 #72-78/M3 #79-83/M4 #84-92 +
24 inserted]`. No free variable — the reconcile step (§5.7) applies exactly this map.
5. Grain reconciles 1:1 to the tracker after the live write; `--status` clean, 0 stray.

## 5. Execution steps (the build prompt — worked after Approval 2)

1. **Build `decomposition-p6.md`** — emit the 222→24 assignment deterministically from `traceability.md`
   (group by module; apply the xcut redistribution table in §3; pomodoro→sessions intra-domain fold). Namespace
   every leg by its source part (item-ids unique only within a part — the P3 namespacing trap
   `[FACT: memory namespacing; this session's wrong-part grep]`). **Worked collision to guard:** both `notes-and-pages`
   and `notifications` carry a `NOT-24` leg (distinct P6 rows in different buckets) `[FACT: traceability.md —
notes-and-pages:NOT-24 + notifications:NOT-24 both present; notifications additionally has NOT-25]` → the
   `slug:id` namespace is MANDATORY; dropping it silently collapses the two `NOT-24` legs into one (fails BR-1
   undetected). The set-cover key MUST be `slug:id`, never bare `id`.
2. **Build `traceability-p6.md`** — one row per {leg, issue}; assert 0 unhomed + 0 service-leg.
3. **P6 coverage gate** (Approval-2-internal) — `p6-set-cover.mjs` (fork `p4-set-cover.mjs`, fail-loud, Node 24)
   - independent Layer-2 critic. Fix every REVISE before the live write.
4. **Reshape task files + map** — create 24 `fe-*` task files (headers: M1.2.\* milestone, add-frontend-
   component profile, backend-twin dep, `P6` label); reuse `p5-reshape.mjs` shape (deterministic, fail-loud).
5. **Wire edges** — each `fe-<module>` ← its backend twin (`mod-<module>`, #37–70); `fe-shell-integration-wiring`
   ← the built M1.0 UI + **`← DB-8`** for the live-search leg only (GAP-1); `fe-integrations-ai-surfaces` ←
   `XS-{egress-guard,ingestion,ai}` + `XS-capability` (R1); **`HARD-4 ← M1.2.*`** (BR-6). Build-acyclicity checked
   (Kahn) before write.
6. **`--status` clean → gate-2 → live write** (g1-N5 order) — `--sync --allow-orphan-create` (24 orphan
   creates) → verify only the intended orphans. Delete any add-only stale edges via GraphQL (§7.4).
7. **Reconcile** — `#` positions in `reconstructed-structure.md`: frontend = **#64–87**, tail **+24** (M1.4
   #88–95 · M2 #96–102 · M3 #103–107 · M4 #108–116); `--plan` clean.
8. **Small triage (fold in):** re-home `LIF-160 core-vault-init` + delete the stray `M1.1 (hardening)`
   milestone (c5d99da1) `[FACT: P5.1 note]`.

## 6. Sequencing + forward-declaration

- P6 is a **planning phase** (produces the frontend delivery contract + live Linear reshape), not a code phase.
  The 24 `fe-*` issues then build in wave order (M1.2.1→.2→.3), each riding its finished backend twin, during the
  actual UI build phase (post-P6).
- After P6, the campaign umbrella `backend-replan` (LIF-163) can close — the full M1 build queue (backend +
  frontend + M1.4 closer) is then projectized and coverage-gated end to end.

## 7. Risks / open points (for the gate to test)

- **R1 — thin `fe-integrations-ai-surfaces` boundary (RESOLVED — residual spot-check only).** Ride-target
  confirmed: the 8 legs consume the finished M1.1.2 twins (`XS-egress-guard #43` · `XS-ingestion #44` ·
  `XS-ai #45` · `XS-capability #31`), so the M1.2.2 home is legitimate (§3). Residual: the gate spot-checks the 8
  are UI _config faces_ only — no ingestion/egress _service_ logic leaked in (BR-2).
- **R2 — RIDE "done-when" (RESOLVED).** Defined in §3 (each built component wired to its provider seam + terminal
  states verified; search = seam+`search-unavailable` now, live FTS5 → DB-8/M1.4). No longer open.
- **R3 — pomodoro/sessions fold.** pomodoro has 3 P6 legs and no standalone backend MOD (folded to MOD-sessions);
  confirm the frontend fold mirrors the backend fold exactly (no orphan pomodoro UI).
- **R4 — `#` renumber blast radius.** Inserting ~24 frontend rows shifts M1.4/M2/M3/M4 `#` positions; the P5.1
  tail already moved once — verify no stale `#` cite remains.
