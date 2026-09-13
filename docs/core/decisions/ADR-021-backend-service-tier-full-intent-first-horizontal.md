# ADR-021: The backend service tier is delivered full-intent-first and horizontally — all modules' service intent is intaken as one corpus, then decomposed into layered issues with cross-cutting services built first — reversing the per-module vertical ①/② slice for the backend; the frontend splits to its own track; the DB-4 schema is reconciled-and-targeted-fixed, not redone

**Status:** Accepted
**Date:** 2026-09-11
**Decision Makers:** Victor J.
**Context:** Vida Platform — M1.1 delivery. MOD-notes (the first vertical slice ①+②) was built to entity-complete, then torn down (2026-09-11) on the judgment that building the backend module-by-module "leaves things undone." This ADR ratifies the replacement delivery grain for the backend/service tier. Basis: `docs/roadmap/backend-consolidation-plan.md` (the gate-1 PLAN, adversarial-critique-verified — REVISE→resolved, 6 blocking fixed).
**Tags:** architecture · process · foundation · sequencing · delivery · backend
**Amends (delivery grain only — no architecture is changed):**
- **`docs/roadmap/m1.1-delivery-plan.md §2` (per-module ①/② grain) + `§9` (per-module deferred scope)** — the *backend half* is replaced by full-intent horizontal decomposition (this ADR §3). The frontend ② half is unchanged (it splits to its own later track).
- **`docs/specs/foundation/delivery-structure-reconstruction/reconstructed-structure.md #31–#48`** — the module-vertical ① issues are reshaped into layered backend issues; the `#`-order *methodology* is retained, the concrete edge set + the `⊕agg`/HARD-* `← every MOD-*` deps are re-derived for the new shape (campaign P5).
- **Entity Delivery Flow reference** — its ①/② fork now scopes to the *frontend* track; the backend runs the horizontal flow.
**Does NOT amend:** ADR-016 (per-table schema gating — the DB-4 schema stands; this ADR reconciles, not redoes it), ADR-017 (features-first), ADR-018 (`foundation/`+`services/` homes), ADR-019 (the M1→M4 spine + §3.5 substrate-by-first-consumer — see §3.4 reconciliation), Model B schema philosophy. No encryption/sync/ZK invariant is touched.
**Inherits:** the No-Guessing Principle; the §XXVI per-step build gate (every campaign phase runs its own plan + gates).

---

## 1. Summary

The backend **service tier** (the `@vida/core` per-module services + the cross-cutting application services) is delivered **full-intent-first and horizontally**, not as per-module vertical slices:

1. **Intake the whole backend service intent as one corpus** before carving any issue.
2. **Decompose horizontally** — cross-cutting application services (`summary(date)`, `dueIn`, backlinks, measurement rollups, …) become first-class issues built first; per-module CRUD follows, against the unified intent + the built cross-cutting services.
3. **Prove coverage** — an independent adversarial gate asserts ⋃(issues) ⊇ corpus, 0 unhomed, before any build.
4. **Reconcile the schema** — DB-4 + `@vida/types` + validators are audited against the corpus and targeted-fixed; the notes hub (`pages`/`page_links`/`note_attachments`) is rebuilt; the other gated tables stand.
5. **Split the frontend** — the ② UI tier is a separate later track, consuming the finished service tier.

## 2. Context — what triggered this

- **The vertical ①/② slice fragments cross-cutting service intent.** `[FACT]` Building each module's backend in isolation lets shared concerns be pulled ad-hoc by the first module that hits them, or deferred into "the consumer module will do it" (`m1.1-delivery-plan §9`).
- **The fragmentation is demonstrated, not hypothetical.** `[FACT]` The MOD-notes teardown found sessions-domain vocab (`POMODORO_TYPE`/`POMODORO_STATUS`) filed inside the *notes* types module (`@vida/types/note.ts`, deleted; canonical home `session.ts:73-76`) — leaked there because notes was the module being built.
- **The service tier is still un-built.** `[FACT]` Every `services/<module>/` is an empty stub; only notes ① existed (now removed). So the grain can still be reversed at zero sunk cost in the service tier.
- **The schema/substrate tiers were built holistically already.** `[FACT: schema-foundation-build-flow.md Model B]` DB-3/DB-4 authored the 117-table schema upfront under a per-domain No-Decisions Gate; the `foundation/` substrates-with-engines (AR-5/6/7) were built once. So the schema is *reconciled*, not redone — a wholesale redo would be redundant of already-gated work.

## 3. Decision

**3.1 Full-intent-first, horizontal service delivery** (§1) is the backend grain. The unit of planning is the **whole backend service corpus**, not the module.

**3.2 Cross-cutting services are first-class and built first.** The shared application services are extracted as their own issues ahead of per-module CRUD, so no module smuggles a cross-cutting concern. Per-module CRUD stays per-module (it is genuinely module-local), now safe because its cross-cutting dependencies exist and are planned.

**3.3 The DB-4 schema is reconciled, not redone.** `[DECISION]` Audit DB-4 + `@vida/types` colocation + validator CHECK-vocab placement against the corpus; apply targeted fixes only where the corpus proves a gap; rebuild the torn-down notes hub (migration **appended**, forward-only — not refilling slot 012). No wholesale redo of the 18 non-notes domains.

**3.4 Reconciliation with ADR-019 §3.5 (substrate-by-first-consumer-pull).** `[DECISION]` "Cross-cutting-services-first" does not violate §3.5's ban on speculative substrate-first ordering: the cross-cutting **services** are `services/` application code with an existing M1.1 consumer (Journals/Sessions/Notes), so building them first is consumer-pull. Genuine `foundation/` substrates that are still unbuilt (e.g. `review` — a 0-LOC stub whose consumer is M1.2 MOD-knowledge) remain governed by §3.5 (built at their first consumer, possibly a later milestone). This is an ADR-019-compatible clarification, not an amendment.

**3.5 The frontend splits to its own track.** `[DECISION]` The ② UI tier is planned separately (campaign P6), consuming the finished service tier. The corpus (P1) service-vs-UI-classifies each intent item (per ADR-020 state ownership) so the split boundary is drawn from intent, not assumed.

**3.6 Every campaign phase runs its own plan + gates.** `[DECISION]` (Victor, 2026-09-11.) The campaign-level approval does not authorize phases to execute off the campaign plan alone — each of P1–P6 authors its own persisted PLAN and clears the §XXVI double-gate before executing, so intent cannot leak between phases.

## 4. Consequences

**Positive:**
- Cross-cutting service intent is captured and homed in one place before build — the "leaves things undone" failure mode is designed out, and provably so (the P4 coverage gate).
- The schema's already-gated work is preserved (reconcile, not redo) — no redundant re-authoring of 117 tables.
- The service tier is decoupled from the UI, so the backend can be built and verified without UI churn.

**Negative / accepted:**
- Front-loads a large intake + planning effort before any runnable UI (accepted: completeness over speed for the foundation).
- Reshapes the `#` global build order (#31–#48) — P5 must re-derive the edge set + re-home the M1.4 aggregator deps.
- The notes hub rebuild ripples to ~10 polymorphic `entity_type='page'` consumers (re-validated in P2).

**Risks (mitigated):**
- **Intent lost at intake** (the corpus is self-authored) → mitigated by the P1 mechanical `⚠ INTENDED`/deferred-flag sweep + a Victor glance (borrowed from `schema-foundation-build-flow.md:104-108`), not resting on the downstream set-cover gate alone.
- **"Audit" hiding a hub-rebuild** → P2 names the notes-hub blast radius as an explicit sub-deliverable + a deleted-symbol consumer sweep.

Governed by the No-Guessing Principle. Realized by `docs/roadmap/backend-consolidation-plan.md` (phases P0–P6, each independently gated).
