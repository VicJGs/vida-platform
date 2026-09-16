# PLAN — P5 · Linear Reorg (backend-replan campaign)

> **Phase:** P5 of the backend-replan campaign (ADR-021 §5). **Predecessor:** P4 Coverage Gate = **SHIP**
> (`coverage-report.md` — the certified join key: 33 issues cover 1200 ids, 0 unhomed, 0 smuggled, 0 double-home).
> **Method authority:** `docs/roadmap/backend-consolidation-plan.md` §5 (P5 row) + §4 (supersedes) · ADR-021 §3 · ADR-019 §3.5.
> **Scenario:** project-foundation / milestone-delivery-planning (Steps 5–8 = gate → grain reconcile → dep-graph reconcile → log).
> **Standing rule (ADR-021 §3.6):** this phase authors this plan and clears its own §XXVI double-gate before any Linear mutation.
> **Gate policy:** independent adversarial critic + `/preflight` (Approval 1, method gate) → execute → `/critique` gate-2 (Approval 2, post-write).
> **Env:** Node 24 · branch `backend-replan` (10 commits ahead of `main`, NOT pushed).

---

## 1. Objective

Reshape the Linear tracker so its issue set **equals the P4-certified 33-issue decomposition** (11 XS + 22 MOD),
homed by documented sequencing intent, with edges re-derived and re-proven acyclic — retiring/folding the superseded
module-vertical cohort **without losing identity or intent**. This is the projectization of the SHIP'd carve; it
re-decides **nothing** about scope (that is P1–P4, gated), only the tracker's shape.

**Deliverable:** a reorganized Linear (projects/milestones/issues) + reconciled local task files + `.tracker-map.json`,
provably 1:1 with `decomposition.md` and the coverage report; `TASKS.md` / `reconstructed-structure.md` updated.

## 2. Scope

**In scope:** create the 13 net-new issues (11 XS + 2 health splits); reshape the 20 continuing issues; retire/fold the
6 superseded; park `KNO-46`; re-home the M1.4/M3 aggregator `← every MOD-*` deps onto the new set (g1-N2); re-derive +
re-prove the build-edge graph (XS-first, acyclic); reconcile task files ↔ `.tracker-map.json` ↔ `TASKS.md` ↔
`reconstructed-structure.md`.

**Out of scope (carried, not re-opened):** the carve itself (P3, gated); coverage proof (P4, SHIP); the frontend ② track
(P6); any `@vida/core` service code (the module build phases, M1.1+); schema (P2, done). No new intent enters here.

## 3. Authorities & certified inputs

| Input | Role |
|---|---|
| `coverage-report.md` | certified join key — the 33-issue set covers the 1200-id corpus (SHIP) |
| `decomposition.md` | the 33 issues + build-deps (→XS) + runtime read-seams + item-ids |
| `traceability.md` | 1200-key id→issue matrix (fold-target evidence) |
| ADR-021 §3.2/§3.4/§3.6 | XS-first grain · first-consumer-pull clarification · per-phase gate |
| ADR-019 §3.5 | substrates/services by **first-consumer pull**, never substrate-first-regardless |
| `backend-consolidation-plan.md` §5 P5 + §4 | operation set · g1-N2 (aggregator re-home) · g1-N5 (execution order) |
| live Linear (`tracker_sync --status`) | current 26 `mod-*` + aggregators + milestone spine |

## 4. Target structure — milestone × issue (intent-homed)

**Homing rule (derived, not chosen):** an XS service is homed at its **earliest consumer's milestone** (ADR-019 §3.5);
a build-dep pulls its provider **no later than itself** (transitive closure). The 22 MOD keep their current milestone
homes by module identity. Project = `M1 — Whole Manual OS` throughout (ADR-016 tier); milestone = slice.

| Milestone | XS (built first, new) | MOD (reshaped continuing / new) |
|---|---|---|
| **M1.1 — Hub & Foundation** | spaces-tags-links · views · templates · effect-rail · measurement-engine · **capability** ⚠ | notes-and-pages · preferences · journals · sessions · check-ins **(5)** |
| **M1.2 — Feature Modules** | ingestion · ai · egress-guard · backlinks-search-export · notifications-delivery | books · finance · gamification · habits · knowledge · learning-education · notifications · projects · relationships · routines · tasks · purposes-and-goals **(12)** |
| **M1.3 — Depth & Recovered** | — | health-core · **health-nutrition** · **health-training** · languages · skills **(5)** |

Totals: **11 XS** (6 @ M1.1 + 5 @ M1.2) + **22 MOD** (5 + 12 + 5) = **33**. ✅ matches `decomposition.md`.

⚠ **`XS-capability` is @M1.1 by transitivity, not first-MOD-consumer.** Its first *MOD* consumer is M1.2
(gamification), but `XS-templates` (M1.1, pulled by notes) build-deps `XS-capability` → forced to M1.1. The gate
re-derives the full transitive closure to confirm no other XS is mis-homed the same way. Candidate to double-check:
`XS-views` (build-dep of `XS-templates`@M1.1 → M1.1 ✓) and `XS-effect-rail` (build-dep of `XS-measurement-engine` used
by journals/sessions @M1.1 → M1.1 ✓).

## 5. Operation set (33 target = 13 create + 20 reshape; 6 retire; 1 park)

### 5.1 CREATE — 13 net-new task files (no `# Linear:` header → tracker assigns LIF on `--sync`)

**11 XS** (slug `xs-<name>`): `xs-ai` · `xs-backlinks-search-export` · `xs-capability` · `xs-effect-rail` ·
`xs-egress-guard` · `xs-ingestion` · `xs-measurement-engine` · `xs-notifications-delivery` · `xs-spaces-tags-links` ·
`xs-templates` · `xs-views`.
**2 health splits** (slug `mod-<name>`): `mod-health-nutrition` · `mod-health-training`.

Each new file carries: `# Task`, `# Profile: Add Backend Component`, `# Project: M1 — Whole Manual OS`,
`# Milestone: <per §4>`, `# Source: decomposition.md (P3) + coverage-report.md (P4)`, a Goal = the issue's item-set
+ its build-deps/runtime-seams (verbatim from `decomposition.md`), and `## Dependencies` blocked-by = its build-deps.

### 5.2 RESHAPE — 20 continuing issues (KEEP `# Linear:` header = same issue, reshaped)

**Rename+reshape (5)** — file slug changes, `# Linear:` preserved, `.tracker-map.json` slug key updated:

| Current slug (LIF) | → New slug | Note |
|---|---|---|
| `mod-notes` (LIF-131, **in-progress**) | `mod-notes-and-pages` | reshape-not-delete (g1-N5); reports re-plan, not phantom Done |
| `mod-checkins` | `mod-check-ins` | |
| `mod-learning` | `mod-learning-education` | |
| `mod-purposes` | `mod-purposes-and-goals` | |
| `mod-health` (LIF-126) | `mod-health-core` | + 2 new splits (§5.1); health 1→3 |

**Keep-name reshape (15)** — slug + LIF unchanged; Goal/scope updated to ride the XS services + edges re-derived:
`mod-books` · `mod-finance` · `mod-gamification` · `mod-habits` · `mod-journals` · `mod-knowledge` · `mod-languages` ·
`mod-notifications` · `mod-preferences` · `mod-projects` · `mod-relationships` · `mod-routines` · `mod-sessions` ·
`mod-skills` · `mod-tasks`.

### 5.3 RETIRE / FOLD — 6 superseded (KEEP LIF; `tracker_sync --retire LIF-NN` → CANCELED; fold pointer in file)

| Current slug (LIF) | Folded into | Coverage evidence |
|---|---|---|
| `mod-spaces` (LIF-141) | **XS-spaces-tags-links** (now cross-cutting) | `xcut-spaces:XCU-SP-27` ∈ XS-spaces-tags-links |
| `mod-fiscal-legal` | **MOD-finance** | `finance:FL-01…FL-10` ∈ MOD-finance |
| `mod-finance-commitments` | **MOD-finance** | commitments intent ∈ `finance:FIN-*` (no separate id-set) |
| `mod-bucket-list` | **MOD-purposes-and-goals** | dreams (ADR-006 / §5.7); no standalone id-set |
| `mod-duties` | **dissolved** (ADR-006 worked-example) | no id-set in the 1200 |
| `mod-projects-investigations` | **MOD-projects** | investigations intent ∈ `projects:PRO-*` |

> **Correction vs the Step-1 grounding note ("5 retire"):** it is **6** — `mod-projects-investigations` belongs here.
> Arithmetic closes: 26 current = 20 reshaped + 6 retired; new = 22 MOD + 11 XS = 33.
>
> **Retire is scripted, not manual** (gate B2 fix): `tracker_sync --retire LIF-NN` (`tracker_sync.py:726`) calls
> `set_state(CANCELED)` after a pre-check that the team has a CANCELED state (`:754` aborts if absent) and drops the
> map key. Set `# Status: canceled` + a fold pointer in each file first (substring-normalized, `:162`), then run
> `--retire` per LIF. The retired slugs must ALSO be removed from any aggregator/consumer blocked-by (add-only sync —
> §6.4 + §7.4).
>
> **Fold-coverage caveat (gate N3):** 4 of 6 folds are id-backed (`mod-spaces`→`XCU-SP-27`; `mod-fiscal-legal`→
> `finance:FL-01…10`; `mod-bucket-list`→purposes dreams; `mod-duties`→dissolved-no-ids). **`mod-finance-commitments`
> and `mod-projects-investigations` have NO distinct id-set** — their intent is covered *by composition* inside
> `finance:FIN-*` / `projects:PRO-*` (commitments = liability/obligation rows; investigations = intake
> `_scope-reconciliation-v1.md:46`), NOT by ids landing in a fold target. So the §9 risk-1 "ids land in fold target"
> mitigation is **vacuous for these two** — their coverage rests on P4 SHIP + the design-is-composition ruling, which
> the gate confirms rather than re-proving via ids.

### 5.4 PARK — 1 undesigned-surface backlog item

`KNO-46` ("future cross-module rules ADR — undocumented surface", `corpus.md:477`): create an explicit
**`M2+ undesigned`** backlog task file (e.g. `xmod-cross-module-rules-adr`, status = backlog, milestone = M2 or a
dedicated "undesigned" holder), so the honestly-homed-but-untargeted intent is tracked, not lost. NOT a P3 re-entry
(Victor-ratified at P4).

## 6. Edge re-derivation (g1-N2)

**6.1 XS-first build edges (intra-33):** every MOD's `## Dependencies` blocked-by = its `build-deps (→XS)` +
seam-owner MOD build-deps from `decomposition.md`. Runtime read-seams (MOD↔MOD) are **NOT** blocked-by edges (they are
decoupled provider contracts, may be bidirectional — PLAN §4 of P3). **Re-prove `assertAcyclic` over build edges only.**

**6.2 Aggregator re-home (`← every MOD-*`):** these carry the old 26-`mod-*` blocked-by; remap to the new 22 MOD (drop
6 retired · apply 5 renames · add 2 health splits):

| Aggregator (milestone) | Action |
|---|---|
| `db-10-seed-and-fixtures` (M1.4) | blocked-by → 22 MOD (+ existing db-6/7/9) |
| `db-11-adr-002-reconciliation` (M1.4) | blocked-by → 22 MOD (+ db-1) |
| `mig-1-v1-retire` (M1.4) | blocked-by → 22 MOD (+ db-1) |
| `hard-1-summary-registry` (M1.4) | blocked-by → 22 MOD (summary contributors) |
| `db-5-encryption-boundary-map` (M3.0) | blocked-by → 22 MOD (+ ar-3) |
| `hard-2-rollups` (M1.4) | `mod-gamification`→`MOD-gamification`, `mod-purposes`→`MOD-purposes-and-goals`; **flag:** does it also need `XS-measurement-engine`? (gate) |
| `hard-3-graph-backlinks` (M1.4) | no `mod-*` dep today; **flag:** does `XS-backlinks-search-export` now supersede part of it? (gate — do not silently rewire) |

**6.3 XS not re-listed on aggregators:** an aggregator needing "every MOD" transitively pulls the XS via each MOD's
build edge, so XS need not be enumerated on it — EXCEPT where an aggregator directly consumes an XS engine (hard-2 →
measurement; hard-3 → backlinks). Those direct edges are added explicitly and gate-verified.

**6.4 Downstream slug-rename fan-out (gate B1 fix — the dangling-edge trap).** blocked-by edges are resolved by
**slug**, not LIF (`tracker_sync.py` `_parse_blockers` collects backtick slugs → slug→slug link). So a rename changes
the key that *every OTHER file* references. §6.1 (the 22 MOD) and §6.2 (7 aggregators) rewrite their blocked-by
wholesale — but issues **outside** that scope that cite a renamed/retired slug are NOT covered and would dangle on the
next `--sync`. Confirmed on disk — the M2 integration consumers:
- `p3-3-integrations-health-wearables` `blocked by mod-health` → **`mod-health-core`**
- `p3-6-calendar-extraction` `blocked by mod-learning` → **`mod-learning-education`**

**Operation:** after the 5 renames, `grep -rn` every `.claude/tasks/*.md` for the 5 old rename slugs (`mod-notes`,
`mod-checkins`, `mod-learning`, `mod-purposes`, `mod-health`) **and** the 6 retired slugs; repoint each renamed→new,
each retired→its fold target (or remove). Sibling MODs + the 7 aggregators self-heal via §6.1/§6.2's wholesale
rewrite (no action — noted so a reader doesn't re-flag them); only the out-of-scope consumers above need a direct edit.
Acceptance #3 ("0 dangling") is checked by a final `grep` + `--status` showing no unresolvable blocker.

## 7. Execution order (g1-N5 — reshape-then-verify-then-write)

1. **Reshape task files locally** — apply §5 (create/rename/reshape/retire/park) + §6 edges to `.claude/tasks/*.md` +
   `.tracker-map.json` (update renamed slug keys) + `_index.md`. **No network.**
2. **`tracker_sync --status`** — confirm the local↔Linear diff is exactly the intended create/reshape/retire set,
   nothing stray. A partially-built-then-torn-down issue (LIF-131) must report its **reshape**, not a phantom Done.
3. **Gate-2** (`/critique` + independent on-disk critic) on the reshaped files BEFORE the live write.
4. **Live write** — `tracker_sync --sync` (push new/reshaped) + **`tracker_sync --retire LIF-NN` ×6** (scripted CANCELED,
   §5.3) + **manual** deletion of the 6 retired slugs from the 5 aggregator blocked-by lists in Linear (add-only sync
   re-adds a deleted edge — remove the local blocked-by AND the Linear relation; this deletion is the one genuinely
   manual step, N2).
5. **Re-verify** — `--status` clean; `--next` sanity; acyclicity holds on the live graph.

## 8. Mechanics & caveats

- **Join identity:** `# Linear: LIF-NN` header is the stable key (`tracker_sync.py:98`), NOT the slug — so a rename
  reshapes the existing issue. New files (no header) create; tracker writes the LIF back + into `.tracker-map.json`.
- **`.tracker-map.json`:** committed, IDs only. Renamed slugs need their map keys updated or the join drifts.
- **Retire semantics:** `tracker_sync --retire LIF-NN` sets CANCELED + drops the map key (`:726`, pre-checks the
  CANCELED state exists at `:754`); set `# Status: canceled` + fold pointer in the file first (keep LIF for audit).
  The only manual residue is deleting the retired slug from consumers' blocked-by (below).
- **Add-only edge caveat:** deleting an aggregator blocked-by requires removing it in BOTH the task file and the Linear
  relation, or the next `--sync` re-adds it (milestone-delivery-planning anti-pattern).
- **`backend-replan` (LIF-163):** the campaign umbrella issue stays `in-progress` (P6 remains); not reshaped.
- **`hard-4-polish` (N1):** blocked-by the 7 aggregators only (no direct `mod-*` edge) → **unaffected** by the remap;
  listed here so it isn't re-flagged as a missed re-home.
- **`reconstructed-structure.md #31–#48`:** update the `#`-order rows to reflect the reshaped set (methodology
  retained, concrete edges re-derived — ADR-021 §3 amends).

## 9. Risks (mitigated)

| Risk | Mitigation |
|---|---|
| A fold silently drops intent | every fold target is a P4-certified home; gate re-checks each retiree's ids land in its fold target via `traceability.md` |
| An XS mis-homed to the wrong milestone | gate re-derives the transitive build-dep closure (the `XS-capability` class of error) |
| Deleted aggregator edge re-added by add-only sync | remove BOTH sides (task file + Linear); §7.4 |
| LIF-131 reported as phantom-Done | reshape-not-delete + `--status` before write (g1-N5) |
| Live-write partial failure leaves a split-brain tracker | reshape+verify locally first; live write is the LAST step; `--status` re-verify after |

## 10. Acceptance criteria (gate-checkable)

1. Local task-file set = **33 active** (11 `xs-*` + 22 `mod-*`) + 6 retired (canceled+fold) + 1 parked; 1:1 with
   `decomposition.md`.
2. Every MOD blocked-by = its `decomposition.md` build-deps; **`assertAcyclic` PASS** over build edges.
3. Aggregator `← every MOD-*` deps remapped to the 22 MOD (6 dropped, 5 renamed, 2 added); 0 dangling.
4. Milestone homing matches §4 (XS by first-consumer-pull + transitive closure).
5. `KNO-46` parked as an explicit tracked backlog item.
6. `tracker_sync --status` clean post-write; `.tracker-map.json` + `TASKS.md` + `reconstructed-structure.md` reconciled.
7. No intent re-decided; no scope change vs the SHIP'd carve.

## 11a. Forward-declaration — P6 needs the SAME reorg for the frontend track ⚠

**This P5 reorg covers the BACKEND service tier only** (the 33 XS/MOD issues). The **frontend ② tier is NOT projectized
here** and must get an equivalent reorg at **P6**, or the 222 homed-out UI legs stay un-tracked. Flagged now so it is
not forgotten (Victor, 2026-09-15):

- **Input already exists:** P4 homed **222 P6 UI legs** (`coverage-report.md` C5 — 212 `ui` split-legs + 10
  UI-boundary rows; **0 `service` legs**, so the split is clean). `traceability.md` already carries each with a P6
  bucket tag → the frontend corpus is *derivable from the existing artifacts*, not a fresh intake.
- **P6 runs the same shape as P1→P5, one tier down:** decompose the 222 UI legs into frontend issues (consumer-pull
  homing — a UI leg homes at its owning module's *frontend* milestone, riding the finished service tier) → a P6
  coverage gate (⋃ frontend-issues ⊇ 222 UI legs, 0 unhomed) → a **P6 Linear reorg** that reuses THIS plan's
  mechanics verbatim: **slug-vs-LIF join care (§6.4), scripted `--retire`, add-only-edge deletion (§7.4), reshape→
  `--status`→gate-2→live-write order (g1-N5)**, plus the Entity Delivery Flow ①/② fork now scoped to the frontend
  (ADR-021 §3.5).
- **Boundary invariant to re-check at P6:** no `service` leg leaked into the P6 set (P4 proved 0 today — re-assert it
  when the frontend corpus is cut, since a UI issue must not smuggle service logic back in).
- **Not started here.** P6 is its own gated phase; this is a scope-forward pointer only. Reconcile the frontend
  milestone spine (M1 UI waves vs a dedicated frontend milestone) at P6's Step 1, the same way §4 derived the backend
  homing from intent rather than choosing it.

## 11. Gate plan (§XXVI, ADR-021 §3.6)

- **Approval 1 (method gate — before any file touch):** an independent adversarial critic (fresh subagent) cross-checks
  §4 homing + §5 operation set + §6 edges against `decomposition.md`/`traceability.md`/live Linear on disk (NOT this
  plan's prose); `/preflight` on the execution mechanics (join identity, retire semantics, add-only caveat). Verdict
  SHIP/REVISE/RETHINK → fix all before executing.
- **Approval 2 (gate-2 — after local reshape, before live write, §7.3):** `/critique` + on-disk critic verify the
  reshaped task files + `--status` diff = intended set, acyclic, no orphans/phantoms.
- **Accept & log (Step 8):** `/session-log`; record verdict + LIF IDs + flagged edges (hard-2/hard-3).
</content>
