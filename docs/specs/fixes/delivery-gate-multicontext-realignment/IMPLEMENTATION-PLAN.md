# IMPLEMENTATION-PLAN (§XXVI gate 2) — Delivery-gate multi-context realignment · Rev 2

> Fix for the STRUCTURAL diagnosis in `PLAN.md` (gate 1, APPROVED 2026-08-02). **Documentation-only.** Full
> double-gate (Victor). **Rev 2** resolves independent-critique findings 1–7 (DF-id collision, ⊞N legend column,
> AR-6 fold derivation, enforced precondition, acceptance tightening). Author from this file only.

## A. The rule being written (pinned discriminator)

**Increment rule.** An issue that authors **more than one independent substrate** is delivered as **one gated
build-step increment per substrate**, each running the full per-issue flow, in dependency order; the Issue closes
when the census aligns all its homes.

**"Independent substrate" (objective test — all three):** (a) own owning ADR, (b) own `foundation/<x>`/service
home, (c) **buildable against the others' *public interface*** — it rides a shared base or peer through that base's
documented API, and does not need to read a peer's *internal/core tables* to be built or tested.

**Fold (the objective exclusion, finding 3).** A sub-part is a **fold** — one increment with its host, not a peer —
when it **reads the host's core tables/owning aggregate directly** and **cannot be built against a stable public
interface without the host present.** Precedent, now *derived* not decreed: **Views (ADR-007) → AR-6** — the view
engine reads Spaces' `entity_links`/space rows directly (`reconstructed-structure:63` home `{spaces,views}`), so it
is not independently buildable; it folds. A fold is always **declared** in the structure, never implicit.
- Applying the test: **AR-7's four are NOT folds** — `capability/measurement/economy` each own distinct tables and
  ride `effects` through the rail's *public* write-API/handler registry (and economy→measurement is a *dependency
  edge* on the public binding, not a core-table read). So AR-7 = **⊞4**. **AR-6 = 1** (Views folds, derived above).
  **DB-9 = 1** (enums+validators = 2 homes, one deliverable across two layers — home-count, not substrate-count).

**Not the trigger:** Home/census-count. The census counts declared Home paths (`tracker_sync.py:941-944`); that is
the *detector* (a >1-home issue must be adjudicated) but not the *rule* (DB-9 is 2 homes, 1 gate).

**Integration-class exclusion:** an issue that *wires* already-built contexts rather than *authoring* substrates
(e.g. HARD-2 "rollups live" over AR-7's substrates) is **one gate**; reassess only if it authors new substrate structure.

**Marking (Outcome-cell marker, orthogonal to Status — finding 2/5):** `⊞N` written **into the Outcome cell**.
- **AR-7 = ⊞4** — `effects → capability → measurement → economy`.
- **AR-8 = ⊞≥2 (pin at AR-8's turn)** — floor recorded; exact N set at AR-8's own `[B]` baseline (deferral visible in the artifact, finding 7).
- **AR-6 / DB-9 / HARD-2 = unmarked (1 gate).**

## B. Exact edits

### Edit 1 — `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md`
**1a. §3 DF register — append after the EXISTING DF-10 (line 41) as `DF-11` (DF-10 is taken = the `#` order):**
```
| **DF-11** *(this session)* | multi-substrate issue had no per-increment gating spec — the delivery-plan's per-issue flow (§2) assumed issue = one build-context (true only of the single-substrate issues it was written against, AR-5/AR-6) | per-substrate **increment rule** + **enforced gate precondition** written into `delivery-plan §2/§3`; issues authoring >1 independent substrate marked `⊞N` in Outcome (AR-7 ⊞4, AR-8 ⊞≥2); folds/coupled/integration stay 1 gate (Views→AR-6, DB-9, HARD-2) |
```
**1b. §2 glossary — add a NEW bullet after line 27 (`⊕agg`), a sibling to `DF`/`⊕agg` (NOT inside the Status legend line 25):**
```
  - **`⊞N`** = an **Outcome-cell** marker (orthogonal to Status): the issue authors N independent substrates and is delivered in **N gated build-step increments** — one full §XXVI double-gate per substrate, in dependency order (the multi-substrate rule, `delivery-plan §2`; DF-11). Absent = single increment. Folds (Views→AR-6) and coupled multi-layer deliverables (DB-9) are NOT marked.
```
**1c. Row Outcome cells (edit only the Outcome column; leave ID/Status/Home/edges untouched):**
- Line 64 (AR-7) Outcome → `⊞4 · capability registry + measurability + effects`
- Line 65 (AR-8) Outcome → `⊞≥2 (pin at AR-8's turn) · backlink/export/graph-prep (search sub-part → DB-8)`
- Line 126 (HARD-2) Outcome → append ` (integration-class — 1 gate, DF-11)`

### Edit 2 — `docs/roadmap/m1.0-delivery-plan.md`
**2a. §2 — insert after line 50 (Per-issue canonical flow):**
```
**Multi-substrate issues (the increment rule · DF-11).** When an issue authors **more than one independent
substrate** — each with its own owning ADR, its own `foundation/<x>`/service home, and buildable against the
others' **public interface** (rides a shared base/peer through its documented API, not by reading a peer's internal
core tables) — it is delivered as **one gated build-step increment per substrate**, each running the full per-issue
flow above, in dependency order; the Issue closes when the census aligns all N homes. This is §XXVI applied
literally ("every **build step** … runs this gate", `standards/process.md:343-344`) and is what `:150`'s per-increment
substrate streaming already assumes. **Home-count is only the detector, not the rule** — the census counts Home
paths (`tracker_sync.py:941-944`), so DB-9's enums+validators (2 homes, 1 deliverable) is **1** gate. A sub-part
that reads its host's core tables directly and cannot be built without the host **folds** into one increment — a
*declared* fold, precedented by Views (ADR-007) → AR-6 (`:164`), never implicit. Integration-class issues that wire
already-built contexts (HARD-2) are one gate. `reconstructed-structure.md` marks each issue `⊞N` in its Outcome cell.
```
**2b. §3 gate-policy table — extend the Substrate row (line 92) gate-policy cell:**
`double-gate + quality-gate-engineering` → `double-gate + quality-gate-engineering (multi-substrate → one double-gate **per substrate**, §2 increment rule)`
**2c. §3 — extend the "Gate precondition (all classes)" note (line 99-100) with an ENFORCED clause (finding 4):**
Append: ` **Substrate-count precondition:** if an issue's Home resolves to >1 path, gate-1 does not open until its PLAN declares either \`⊞N\` (N independent substrates, per the §2 test) or an explicit fold for each extra home. An unmarked multi-home issue is rejected at gate-1 — the same failure class as an under-gathered [B] baseline.`
**2d. §5 rows — mark the Status cell (inert to parsing, finding 6):**
- Line 165 (AR-7): `⏳` → `⏳ ⊞4`
- Line 166 (AR-8): `⏳` → `⏳ ⊞≥2`

## C. Out of scope (flagged, not fixed here)
- **Toolkit follow-up (not this repo):** whether `tracker_sync --next` should emit per-increment **sub-heads** for a `⊞N` issue. ADR-015 / `~/dev-toolkit`. Record in the task; do not touch the toolkit. *(Critic: correct deferral — human runs N increments under one head today.)*
- **AR-8 exact N** — pinned at AR-8's `[B]` baseline (⊞≥2 floor recorded, visible in the row).

## D. Acceptance (§4)
1. **DF-11** present (NOT DF-10); `⊞N` defined as its own §2 glossary bullet (not in the Status legend); AR-7/AR-8/HARD-2 Outcome cells marked.
2. `delivery-plan §2` increment rule present with the objective fold test + DB-9/integration exclusions, each `[FACT]`-anchored.
3. `§3` Substrate gate policy references per-substrate rule; **the enforced substrate-count precondition (2c) is present**; `§5` AR-7 `⏳ ⊞4`, AR-8 `⏳ ⊞≥2`.
4. Every new claim traces to a cited line (`process.md:343`, `delivery-plan:150/164`, `tracker_sync.py:941-944`, `reconstructed-structure:41/63`). Zero invented shapes.
5. **Placement-exact grep:** `⊞` appears in reconstructed-structure Outcome cells (AR-7/AR-8) + the glossary bullet, and delivery-plan §2 rule + §5 AR-7/AR-8 Status cells; DB-9/AR-6 NOT marked; no dangling `DF-11`/`⊞` reference.
6. **Live regression (finding 6):** after edits, re-run `tracker_sync --plan project:M1.0` and confirm the tables still ingest — **AR-7 = `miss 4`, AR-8 = `miss 2`** (a column-count slip silently de-ingests the row; grep alone won't catch it).
7. Docs commit alone (no code); AR-7 un-blocked afterward.

## E. Build Steps (ordered)
1. Edit 1a (DF-11) → 1b (⊞N glossary bullet) → 1c (AR-7/AR-8/HARD-2 Outcome).
2. Edit 2a (§2 rule) → 2b (§3 policy) → 2c (§3 enforced precondition) → 2d (§5 Status marks).
3. Grep-verify acceptance #5; **run acceptance #6 live census regression**; fix any drift.
4. Commit docs alone; update task Progress; un-block AR-7 (TaskUpdate #1) → resume Phase 2.
