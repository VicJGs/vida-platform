# Fix: bug:m1.0-baseline-gather-protocol
Status: implemented
Source-repo: /Users/victor/Documents/CODE/vida-platform
Type: process defect (STRUCTURAL) — the M1.0 build gate's baseline step
Session: 2026-07-28-ar-6-spaces

## 1. Triage (§XXIV / espinha TRIAGE transversal)

**Symptom.** In the AR-6 head, decided shapes were repeatedly treated as open decisions — a build-grain
`AskUserQuestion`, an invented `entity_links` source-polymorphic shape, a fabricated `link_type` column — each
already fixed in `docs/` (`capability-framework §3`; `cross-module-integration.md §3.2`; `security-model.md`).

**Classification: STRUCTURAL.** Recurs by design, not slip. The baseline `[B]` gate (§XXVI.1a) + delivery-plan
DOC spine named the OUTPUT (`current-*` docs) but never the routed, exhaustive INPUT-gathering. Ad-hoc gathering
reliably misses shapes that live in `core/architecture/*` and the `ADR-002 §5.20` owed-ledger rather than the ADR
the author happened to open.

**Root cause (one sentence).** The plan's baseline/PLAN gate had no *documentation-gathering protocol* — so every
head re-ran the same under-gather and derived-instead-of-found.

**Blast radius.** Every remaining M1.0 head (AR-6/7/8, DB-7/8/10, UI/UX). Unfixed → the cluster can't finish "with quality."

## 2. Fix (pragmatic, cluster-scoped)

Encoded the gathering discipline into the plan's own steps, where every head reads it — not the global toolkit
(too broad; Victor scoped it to this cluster):
- **`docs/roadmap/m1.0-delivery-plan.md` §2.1 — Baseline Documentation-Gathering Protocol (BINDING).** Route from
  `docs/README.md` → scope front-door → `core/architecture/*` + `business-rules.md` + **`ADR-002 §5.20` owed-ledger**
  (read before authoring ANY table) → full-`docs/` grep of every entity/term → never derive a decided shape →
  present genuine gaps for decision → cite `[FACT: file:line]` → the critic's source list = the full gathered set.
- **§3 gate precondition:** the double-gate does not open until §2.1's `[B]` DoD is met.

## 3. Learning (→ known-failures + memory)
Saved as memory `gather-scoped-docs-not-just-adrs` + sharpened `read-architecture-before-implementing`. The critic
can only catch a decided-elsewhere shape if its sources are the FULL gathered set, not the author's partial read.

## 4. Change Log
| Date | Session | Change |
|------|---------|--------|
| 2026-07-28 | 2026-07-28-ar-6-spaces | triage + fix: added binding §2.1 gathering protocol + §3 gate precondition to the M1.0 delivery plan |
