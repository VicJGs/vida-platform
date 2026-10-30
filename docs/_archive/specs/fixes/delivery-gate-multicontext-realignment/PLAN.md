# Fix (bug-unit) — Delivery-gate spec is half-baked for multi-context issues

> Diagnosis PLAN (§XXVI gate-1) produced by `victor:triage`, 2026-08-02. STRUCTURAL. A **re-alignment** of a
> missing/half-baked spec (Victor's ruling), not a fresh design decision. Persisted before any fix; the fix is
> gated separately from the AR-7 build (its own phase — "no mixed contents").

## 1. Symptom (as presented)

Preparing to build **AR-7 (LIF-78)**, the natural read of the delivery-plan was "one issue → one double-gate."
Applied to AR-7's **four** foundation substrates (`capability · measurement · economy · effects`) that reads as a
single utopian mega-gate — unrunnable as one loop, and inconsistent with how the delivery loop already measures the issue.

## 2. Root cause (one sentence)

The delivery-plan's **per-issue canonical flow silently equates "one issue" with "one build-context,"** an
assumption that held only because every prior substrate issue (AR-5, AR-6) _was_ a single context — so the
**per-context gating rule was never written**; the defect is a **missing spec**, not a mis-scoped AR-7.

## 3. Facets

| Facet                                    | Finding                                                                                                                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Symptom**                              | "One double-gate per issue" cannot run over AR-7's 4 substrates.                                                                                                                                          |
| **Root cause**                           | `delivery-plan §2:48-50` per-issue flow omits per-context gating; assumes issue = context.                                                                                                                |
| **Affected layers**                      | delivery-plan §2 (flow) + §3 (gate policy) + §4 (Consumption Rule); reconstructed-structure §3 (DF register) + §5 rows; the delivery-planning-loop's head/digest presentation (ADR-015 / `tracker_sync`). |
| **Self-contradiction**                   | Same doc streams substrate tables "per-increment (rides AR-5/6/7 gate)" (`:150`) while prescribing one gate per issue (`:48`).                                                                            |
| **Loop already disagrees with the spec** | Census counts **contexts** (`AR-7 missing 4`, `AR-8 missing 2`), not issues — the machinery is ahead of the prose.                                                                                        |
| **Reproduction**                         | `tracker_sync --plan project:M1.0` → AR-7 head shows `census: aligned 0 · missing 4` yet §2 says gate once.                                                                                               |

## 4. Evidence (all `[FACT: file:line]`)

- `docs/roadmap/m1.0-delivery-plan.md:48-50` — "Per-issue canonical flow" = single double-gate, no per-context branch.
- `…:91-92` — Substrate gate policy: one "full §XXVI code loop · double-gate + quality-gate-engineering."
- `…:150` — DB-3 stream issue: "tables land per-substrate as each `foundation/` framework is built (AR-5/6/7)… per-increment (rides AR-5/6/7 gate)."
- `docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md:64` — AR-7, 4 homes, 3 ADRs, `⏳` (not `〰`).
- `…:65` (AR-8, `services/{search,export}`) · `…:126` (HARD-2, `foundation/{measurement,economy}`) — multi-context peers.
- `tracker_sync --plan project:M1.0` (2026-08-02): AR-7 `missing 4` · AR-8 `missing 2` · DB-9 `aligned 2` · AR-5/AR-6 `1`.
- `standards/process.md §XXVI` — "Every **build step** — a script, command, component, feature, or fix — runs this gate." (Gate is per build-step, not per issue — the spec the plan's §2 under-applied.)

## 5. Blast radius (why STRUCTURAL, not ISOLATED)

- **AR-7** — 4 foundation substrates (presenting symptom).
- **AR-8** — `services/{search,export}` (census 2) — same root, surfaces next.
- **HARD-2** — `foundation/{measurement,economy}` (census 2) — same shape; integration-class (rides built substrates) → the fix must decide if it's in-scope for per-increment gating or excluded.
- **Latent** — any future multi-context substrate/service issue until the rule lands.
- **Excluded (proves the discriminator is not raw census-count):** DB-9 shipped correctly as ONE gate at census 2 (enums+validators = one coupled deliverable mirrored across two layers). → The rule must key on **distinct substrates, each with its own owning-ADR + its own `current-*` doc-context**, not on file/home count.

## 6. The fix, in shape (details → the fix-phase IMPLEMENTATION-PLAN, gated separately)

A **documented re-alignment** that:

1. **Flags the defect** — new DF entry (DF-10) in `reconstructed-structure.md §3`, in the existing register's voice: "multi-context issue left without a per-increment gating spec — the per-issue flow assumed issue = context."
2. **Writes the rule (anchored, not invented)** — in `delivery-plan §2`/§3: _an issue spanning N distinct substrates/contexts (each its own owning-ADR + `current-_`context — the census's own unit) is delivered as N gated build-step increments, each a full §XXVI double-gate, in dependency order; the Issue closes when the census aligns all N.* Anchored on the loop's existing census-count + §XXVI's per-build-step gate +`:150`'s per-increment streaming.
3. **Pins the discriminator** — precise inclusion test (excludes coupled DB-9-style multi-file/single-deliverable; includes AR-7/AR-8); resolves HARD-2's class.
4. **Marks the affected rows** — AR-7 (4 increments), AR-8 (2) in the structure, so the plan is self-describing and no future head re-derives it.
5. **Closes the breach generally** — the rule is class-level (not an AR-7 patch); optionally flag whether `tracker_sync --next` should surface per-increment sub-heads (ADR-015 / toolkit follow-up — may be out of this repo's scope).

## 7. Classification

**STRUCTURAL.** Root exists in ≥2 live places (AR-7, AR-8) + latent class. Fix at the source (the spec + register), not per-issue patches.

## 8. Gate

This PLAN = gate 1 (diagnosis). The fix's IMPLEMENTATION-PLAN = gate 2. Two critiques, two approvals, then implement.
Runs in **its own phase**, before and separate from the AR-7 build.
