# PLAN — P3 · Horizontal Decomposition (corpus → acyclic issue set)

> **Phase:** P3 of the backend-replan campaign (`docs/roadmap/backend-consolidation-plan.md`, ADR-021).
> **Status:** DRAFT — awaiting its own Approval 1 (§XXVI gate 1). Per ADR-021 §3.6 this phase runs its
> own plan + gates; campaign approval ≠ phase authorization.
> **Profile:** project-foundation / milestone-delivery-planning · **Authored:** 2026-09-14
> **Consumes:** `corpus.md` (+ 34 `parts/*.md`) [P1 ground truth] · `schema-audit.md` +
> `-deferred-homes.md` [P2 built-vs-deferred] · `backend-consolidation-plan.md` §5/§6 [scope + principle].
> **Deliverables:** `decomposition.md` — the acyclic backend issue set (XS + MOD classes) with per-issue
> corpus-item coverage, dep edges, and gate policy · `traceability.md` — the item→bucket matrix that
> P4's coverage gate joins on.

---

## 1. Goal & the well-formedness contract

Carve the 1194-item corpus into a set of **acyclic, buildable backend issues** that provably cover 100%
of the backend-service intent, cross-cutting services first. This is a **grouping-and-edge** phase, not a
re-homing one: every corpus item already carries a `boundary` (service/UI/SPLIT, ADR-020) and a
`candidate home` column (P1, gated; P2-verified). P3 groups already-homed items into issues and derives
the dependency graph. Done when:

- **D1 · Every backend-service corpus item lands in exactly one issue** — no item is in two issues, none
  is dropped. UI-leg and DEFERRED items are homed OUT (to the P6 track / their named build home) but
  remain traced (D5), never silently lost.
- **D2 · Cross-cutting services are first-class issues, built first** — the Part B rows that carry
  DEFERRED service work become the XS issue class; Part B.1 substrate (built **or** forward-homed to
  M3/DB-5 — LWW built, [E]/R2/CRDT homed to M3/DB-5) rides and spawns no issue but IS a traced dependency
  note (§3 built-substrate-rides rule). §6 principle upheld: extract the shared services as their own
  issues, then per-module CRUD against them.
- **D3 · The dependency graph is acyclic** — `assertAcyclic` holds over the full edge set; the direction
  rule (§4) forbids the consumer-pull cycles that the module-vertical grain smuggled.
- **D4 · Nothing is smuggled** — every dep edge is justified by a cited corpus row (the `cross-cutting`
  column or a named read-seam), not invented; no issue silently absorbs another module's intent.
- **D5 · Coverage is a mechanical join over a canonical id-set** — the reader first emits a **canonical
  item-id list** (the join key) and reconciles the corpus's own 1192/1194/1201 discrepancy
  (`corpus.md:47-50` — reader-declared 1194 vs assembly 1201 vs mechanical 1192; the +7/−2 deltas are
  continuation/note rows) into one authoritative set, BEFORE any bucketing. `traceability.md` then maps
  every canonical id (and, for a SPLIT, each `{id, leg}`) to exactly one bucket (an XS issue · a MOD
  issue · the P6 UI track · a DEFERRED home). P4's set-cover (⋃(issues) ⊇ corpus · 0 UNHOMED) is then a
  join against that canonical set, not a re-derivation over a fuzzy denominator.

## 2. The carve surface — which corpus items become backend issues (the filter)

Each corpus row routes by its two classifier columns (already authored in `parts/*.md`):

| Row signal                                                                                               | Destination bucket                    | In a P3 issue?            |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------------- |
| `boundary = service` **and** `home = "<module> service"`                                                 | **MOD issue** for that module         | ✅ yes                    |
| `boundary = service` **and** `home = "cross-cutting: X (Part B)"` — **pure delegation/consumption**      | **XS issue** for service X            | ✅ yes                    |
| `boundary = service` **and** `home = "cross-cutting: X (Part B)"` — **module-owned derivation riding X** | **MOD issue** + a derived MOD→XS edge | ✅ yes (in MOD)           |
| `boundary = service (…SPLIT)` — the **service leg**                                                      | its module/XS issue (as above)        | ✅ yes (service leg only) |
| `boundary = UI` **or** the **UI leg** of a SPLIT (`home = "P6 (…)"`)                                     | **P6 frontend track**                 | ❌ traced-out (D5)        |
| `home = "DEFERRED — …"` / a `schema-audit-deferred-homes.md` home                                        | its **named build home**              | ❌ traced-out (D5)        |
| Part B.1 substrate row (built **or** forward-homed to M3/DB-5)                                           | rides — no P3 issue                   | ❌ dependency note only   |

**§2-tiebreak (the blocking fix — a terse `cross-cutting: X` home is NOT self-disambiguating).** ~60 module
rows are homed purely to `"cross-cutting: X (Part B)"` with no `<module> service` prefix, and they are a
**mix**: pure delegation (verb = advertise / consume / read-through / emit-through-rail, no module-local
derivation → **XS**) vs a **module-owned derivation/import/rollup that merely rides X** (→ **MOD** + a
derived MOD→XS edge). The reader (§6 step 1) classifies each by that verb test, and **when a named `MOD-X`
owner exists in Part D (`corpus.md` Part D) or `schema-audit-deferred-homes.md`, that gated home OUTRANKS
the terse column string** and forces the MOD route. Worked counterexamples the naïve filter mis-routed:
`knowledge.md` KNO-23/KNO-24 (mastery derive + rollup) home to `"cross-cutting: mastery … (Part B)"` yet
Part D (`corpus.md:602`) + `schema-audit-deferred-homes.md:332-333` both home them to **MOD-knowledge
(M1.2)** → they route to MOD-knowledge with an XS edge, NOT into an XS issue. Likewise `learning-education.md`
LEA-24 (`syncFeed`) / LEA-49 (GPA rollup) are MOD-learning-education work riding ingestion/measurement, not
the shared engine. Each of the ~60 is enumerated + classified (delegation|derivation) in `traceability.md`
so the split is auditable at gate 2.

**A SPLIT row is counted once per leg** — its service leg lands in an issue; its UI leg is traced to P6.
Both legs share the same item-id, disambiguated by a compound `{item-id, leg}` key in `traceability.md` (so
D1's "exactly one issue" means "exactly one issue per service leg"; the UI leg is never in a backend issue).

## 3. Grain (Victor-confirmed 2026-09-14)

- **XS grain = one issue per coherent service** (~11–15 issues), grouping Part B rows by the owning
  service, **not** one issue per Part B row. Mirrors the B.1–B.11 grouping the corpus already fixed and
  how the substrate is owned. Provisional XS roster (B-group → issue), fixed exactly at execution:
  `XS-effect-rail` (B.2 — substrate is AR-7 built; the **firing/applyEffect wiring is DEFERRED** → genuine
  XS work) · `XS-review-engine` (B.3) · `XS-spaces-tags-links` + `XS-views` + `XS-capability` +
  `XS-templates` (B.4) · `XS-measurement-engine` (B.5) · `XS-summary-registry` + `XS-dueIn-aggregator` +
  `XS-read-seam-R7` (B.7) · `XS-ingestion` + `XS-ai` + `XS-egress-guard` (B.8) ·
  `XS-notifications-delivery` (B.9) · `XS-notes-pages-platform` + `XS-search-fts5` +
  `XS-export-serializers` (B.10).
- **Built-substrate-rides rule (XS-vs-ride, the fix).** A Part B service whose substrate is
  AR-7/`foundation/*` FINAL **and** whose only remaining work is a module-surface leg spawns **no XS
  issue** — it rides (like B.1), and its remaining work homes to the owning MOD issue. **Economy (B.6)
  is the instance:** `foundation/economy.ts` is FINAL (currencies/ledger/handlers/`dispatchConsequence`
  built), so there is **no `XS-economy-coordinator` issue**; the economy application work is the
  module-surface leg — `MOD-gamification` (rules engine, grammar, defaults, level derivation — GG4) with
  `MOD-finance` (`move_money`/store) + `MOD-notifications` (`surface_notification`) as effect consumers.
  The reader applies this test to every provisional XS row (an XS row survives only if it carries
  DEFERRED service work, as B.2 firing does).
- **B.11 domain-owned providers** fold into their **owning module's MOD issue** with a provider-contract
  note (they are module-owned, consumed by others — not standalone services); consumers get MOD→MOD
  read-seam edges. The execution reader confirms each B.11 row's single owner (e.g. Duties/Obligations
  fabric: **MOD-tasks owns the `duty` type**, MOD-health/MOD-sessions consume via edges).
- **Module-owned SEAM fold (ratified 2026-09-15, gate-2 round-2).** A cross-cutting seam whose engine
  is owned by a _module_ (not pure infra) is NOT a standalone XS issue — it folds into that owner MOD, and
  consumers carry a **build** edge to the owner MOD (the seam must exist before they register/read). This
  is the B.11-fold + economy rule applied consistently. The folds: **summary(date) registry → MOD-journals**
  · **dueIn(range) → MOD-sessions** · **review engine → MOD-knowledge** · **notes `pages` platform →
  MOD-notes-and-pages** · **economy module-surface → MOD-gamification**. XS issues therefore = the
  **pure-infra engines only** (no natural module home): effect-rail, measurement, spaces-tags-links, views,
  capability, templates, ingestion, ai, egress, notifications-delivery, backlinks-search-export
  (search-FTS5 + export + read-seam-R7 merged). Net ≈ **12–14 XS + ~22 MOD**. This is a homing/grain
  correction only — coverage is unchanged (0 unhomed), no intent lost. Build order still puts every seam
  before its consumers (the owner MODs are hubs built early).
- **MOD grain = one issue per module** (~23 issues): `MOD-<module>` carries that module's service rows
  minus the rows routed to an XS issue / UI / DEFERRED. Large modules (learning-education 81, knowledge
  58, relationships 59, finance 57) stay **one issue** — the corpus does not fix intra-module ordering,
  so splitting would smuggle grain the intake didn't decide.
- **Total ≈ 35–38 issues** (XS + MOD). This is deliberately close to the existing module-vertical issue
  space (#31–#48) that P5 will reshape.

## 4. Dependency-edge derivation + acyclicity (the D3/D4 core)

Edges are **derived, not authored** — each is read off a corpus row's `cross-cutting` column or a named
read-seam, and cited in the issue's coverage list:

- **MOD → XS:** a MOD issue depends on every XS service its rows cite (e.g. MOD-tasks → XS-effect-rail,
  XS-measurement-engine, XS-summary-registry, XS-notes-pages-platform — all read off `parts/tasks.md`
  cross-cutting columns TAS-16/19/26/31…; the economy feeder TAS-20 rides built substrate → a note, not
  an XS edge).
- **XS → XS:** an XS service may depend on another XS service + built substrate only (e.g.
  XS-summary-registry → XS-read-seam-R7).
- **MOD → MOD:** allowed **only via a documented read-seam (R7)** — never a direct cross-module table
  read (the corpus already enforces this per-row: e.g. TAS-05 fans out via R7/V4, not table reads). Such
  an edge is a provider-consumer contract, not a build-blocker where a seam decouples it.
- **BUILD edges vs RUNTIME edges (the acyclicity contract).** Split the edge set:
  **BUILD edges** = a consumer → the service it rides, where the service is an **XS issue** OR a
  **seam-owner MOD** (after the module-owned-seam fold: MOD-journals/sessions/knowledge/notes-and-pages/
  gamification — see §3). These are the build-order graph.
  **RUNTIME read-seam edges** = MOD→MOD data reads (non-seam) and any XS→MOD reference — provider-consumer
  contracts decoupled by the seam; they may legitimately be **bidirectional** (e.g. finance↔projects
  source-binding), so they are recorded but are NOT build-order dependencies.
- **Direction rule (acyclicity):** an XS issue never build-depends on a MOD → the consumer-pull cycle the
  module-vertical grain smuggled cannot form. An XS row that references a MOD is recorded as a
  **contributor/runtime note**, never a build edge. `assertAcyclic` (the ADR-011 guard vocabulary) runs
  over the **BUILD edges only**. Because build targets are XS issues or the 5 seam-owner MODs, a cycle can
  only form among those; any such cycle is a blocking defect and is broken by demoting the corpus-wrong
  direction to a runtime edge (e.g. the round-3 fixes: `XS-views→XS-templates` dropped —
  templates _compose_ views; `MOD-sessions→MOD-journals` demoted — `surface_journal` is an effect-rail
  runtime emit). (Running acyclicity over runtime read-seams would falsely fail on legitimate bidirectional
  seams — what the P3 v1 carve surfaced.)
- **Fail-loud mis-route guard (the blocking fix):** the assembler (§6 step 2) asserts that **no row
  routed to an XS issue cites a MOD as a provider/dep**. Such a citation is a §2-tiebreak mis-route (the
  row is really module-owned derivation), NOT a licence to emit an XS→MOD edge — it fails the run loudly
  and the row is re-classified to its MOD home. This is what prevents the latent cycle KNO-24 would form
  (it cites "Program via Education" → if left in an XS issue that would be XS→MOD; homed to MOD-knowledge
  it is a benign MOD→MOD read-seam edge).

## 5. Issue row schema (the `decomposition.md` table)

`issue-id · title · class (XS|MOD) · corpus item-ids covered · candidate home (package path, e.g.
packages/core/src/services/<x>) · depends-on (issue-ids) · P6-UI-split-out (item-ids) · gate policy ·
notes`. Mirrors the m1.1-delivery-plan per-issue row + the corpus's own columns. The `candidate home`
is the code path from the repo-structure ADR (verified against the real tree during execution, scenario
Step 2 — not ADR prose alone).

## 6. Method — execution (a Workflow, after Approval 1 — not before)

The carve is a 34-file, ~1194-item mechanical sweep that must be exhaustive → a **Workflow** (as P1/P2):

0. **Canonical id-set pass (D5 prerequisite)** — emit the authoritative item-id list across all 34
   `parts/*.md`, reconciling the 1192/1194/1201 discrepancy (`corpus.md:47-50`) into one set; this list
   is the join key everything downstream (and P4) measures against.
1. **Per-part readers** (34, one per `parts/*.md`, schema'd output) — emit each row's `{item-id, leg,
bucket-key, route-kind (delegation|derivation), cited-xs-services, cited-read-seams, ui-split?,
part-d-home?}` per the §2 filter **and the §2-tiebreak** (verb test + Part D / deferred-homes
   override). No re-homing beyond what the gated docs already fix — read the authored columns + Part D.
2. **Assembler** (in-script, deterministic) — apply the built-substrate-rides rule (§3) to drop
   ride-only XS candidates; group by bucket-key into the XS + MOD issues; build the dep-edge set per §4;
   run the **fail-loud mis-route guard** (any XS-routed row citing a MOD dep → abort + re-home); run
   `assertAcyclic`; build the item→bucket traceability matrix over the canonical id-set.
3. **Adversarial well-formedness reader** — verify D1 (partition: no item in two issues, none dropped),
   D3 (acyclic), D4 (every edge cites a corpus row), and spot-check the ~60 tiebreak classifications vs
   Part D, against the emitted set on disk.
4. **Assemble deliverables** — `decomposition.md` (issue set + edge graph) + `traceability.md` (the
   canonical-id matrix, one row per `{id, leg}`). Then the P3 gate (§7) runs on those.

## 7. Gate (P3's own — §XXVI, two points)

- **Gate 1 · Method (Approval 1, THIS plan, before execution):** `/critique` + `/preflight` on this
  plan's grain/edge-rules/coverage method. Fix every finding before running the Workflow.
- **Gate 2 · Decomposition Gate (post-execution, before P4):** independent adversarial critic verifies
  the produced issue set is **well-formed** — D1–D5 checked against `corpus.md`/`parts/*.md` on disk, not
  the plan's prose. Explicitly re-checks: (a) the ~60 tiebreak classifications (a sample vs Part D), (b)
  the mis-route guard fired 0 times / all re-homes are correct, (c) `#(traceability rows) ≈ canonical-ids
  - SPLIT UI-legs` (not merely = canonical-ids — else a SPLIT UI leg is silently unhomed). Verdict SHIP /
    REVISE / RETHINK. (P4 is the _separate_ flagship coverage gate; P3's gate 2 is well-formedness, P4 is
    set-cover completeness.)

## 8. Acceptance (P3 done when)

- [ ] A **canonical item-id set** is emitted + the 1192/1194/1201 delta reconciled (D5 prerequisite).
- [ ] `decomposition.md` — ~35–38 acyclic issues (XS + MOD; XS only where DEFERRED service work exists),
      each with covered item-ids, home path, and dep edges; grain per §3.
- [ ] `traceability.md` — every canonical id (and each SPLIT `{id, leg}`) mapped to exactly one bucket
      (issue / P6 / DEFERRED-home); 0 UNHOMED; the ~60 tiebreak rows classified delegation|derivation.
- [ ] `assertAcyclic` passes; the mis-route guard fired 0 unresolved times; every edge cites a corpus row
      (D3/D4).
- [ ] Decomposition Gate (gate 2) SHIP.

## 9. Out of scope for P3

- **Linear reorg** (create/reshape projects/milestones/issues; retire #31–#48; mod-notes LIF-131
  disposition) — that is **P5**.
- **The P4 coverage gate itself** — P3 produces the traceability matrix P4 gates; P4 is its own phase.
- **The frontend track plan** — the UI-leg items are traced-out here; **P6** scopes them.
- **Sub-milestone / wave sequencing into the tracker** — P5 re-derives `#` edges + HARD-\* deps from this
  issue set.

## 10. Execution note

Env: Node 24 for any tooling (`export PATH="$HOME/.nvm/versions/node/v24.17.0/bin:$PATH"; corepack pnpm`).
The Workflow (§6) runs only after Approval 1. Branch `backend-replan` (not pushed).
