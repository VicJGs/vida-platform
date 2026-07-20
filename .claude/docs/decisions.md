<!-- Last updated: 2026-07-03 by /session-end -->
| Date | Area | Decision | Choice | Reason | Reversible |
|------|------|----------|--------|--------|------------|
| 2026-06-27 | habits | streak semantics | consecutive scheduled occurrences, no grace; counters derive from ledger | one source of truth; cache never lies | yes |
| 2026-06-27 | finance | account balance source of truth | ledger-derived (opening_balance + Σ transactions) | balances can't drift; import-friendly | costly |
| 2026-06-28 | relationships | neural graph edges | contact↔network membership only, no contact↔contact table | matches Victor's model; less schema | yes |
| 2026-06-29 | constitution | extension-model principle | ZK core + guarded OPT-IN integrations; user owns the risk | resolves every external-data/AI tension at once | no (principle) |
| 2026-06-29 | projects | deliverables | dedicated table + multi-type measurement (financial/stats/3rd-party/logs/artifacts) | real 4-level hierarchy; deep progress picture | costly |
| 2026-06-30 | scope | v1 audit — dropped modules | KEEP all: Health, Duties, Skills(separated), Finance→Commitments, Projects→Investigations → Wave R | intent must be tracked, not silently cut | yes |
| 2026-07-01 | process | Routines re-sequenced to Wave 4; Learning split into 5 sub-contexts | document dependencies first; one context per pass | orchestrator needs its modules; token discipline | yes |
| 2026-07-02 | learning | Education hierarchy reframe | 8 levels: Institution/Self-taught→Program→Curriculum→Degree→Term→Subject→Module→Topic (optional depth) | flat courses ≠ envisioned academic structure | costly |
| 2026-07-03 | learning | grading + progress | grading_systems builder (weighted components, modality); progress = Projects measurement pattern FORGED separately | matches real professor practice; no cross-module data mixing | yes |
| 2026-06-07 | setup | toolkit initialized on existing repo | Generic Coding Session | wire up toolkit without regenerating existing CLAUDE.md | yes |
| 2026-06-07 | setup | rename Claude.md → CLAUDE.md | git mv | cross-platform memory loading (case-sensitive CI) | yes |
| 2026-06-08 | build | declare cross-package imports as deps | `@vida/types: workspace:*` in core | tsc --noEmit resolves bare specifiers via node_modules, not tsconfig references | yes |
| 2026-06-08 | core | unlockVault return value | return `keyChain.vault_key` not `_vaultKey` | avoid null-widening of module-level mutable across call boundary | yes |

## documentation-blueprint — completed 2026-07-19

The foundational documentation effort for vida-platform. Built a discovery-driven **Levels × Aspects** framework, then documented the entire platform against it and locked the architecture in ADRs.

**Delivered:**
- **21 documented contexts** (19 modules + sub-contexts), each as the canonical 5 aspect docs (`identity · business-rules · contract · structure-data · conventions`) under `docs/features/`.
- **15 ADRs, all Accepted** (`docs/core/decisions/ADR-001…015`) — this session added ADR-011 (Universal Measurability), ADR-012 (Points Economy & Consequence Engine), ADR-013 (ZK Notification Delivery), ADR-014 (External Data Ingestion under ZK), ADR-015 (AI/LLM under ZK). ADR-014/015 are the two standing EX-2 ZK-integration ADRs — closing that constitution loop.
- **The constitution** (`docs/core/business-rules.md`) and **the owed-tables ledger** (ADR-002 §5.20 — the single scoped input for the build phase: all ADR tables + the 21-module target schema).

**Key decisions / patterns established:**
- Feature docs describe **intent**; ADRs decide **cross-cutting mechanism** — the discipline that kept the modules coherent.
- **Every gated ADR ran an independent adversarial critique.** It caught a ZK-honesty overclaim in **five consecutive ADRs** (011–015) plus a prompt-injection security hole — the gate is load-bearing on this project.
- Doc-only throughout: **`packages/` diff = 0** across the entire task. The build phase (schema consolidation from §5.20) is the next stone.

## Build Roadmap — completed 2026-07-20
Set the whole platform's **buildable deliverables** as a phased, clustered dependency map (`docs/roadmap.md`), then projectized it into Linear (initiative `vida-platform`).

**Delivered:**
- **`docs/roadmap.md`** — 3 phases (1 Local dogfood · 2 Venues+release · 3 Personality), the 5-layer Structural Foundation (① Database · ② Architecture · ③ Design System · ④ UI · ⑤ UX), a tiered dependency map, Phase-1 module sub-slices (1a–1d), the integration register (6 defined / 16 undefined-by-design), and sequencing rules.
- **35 Phase-1.0 issues in Linear** (LIF-61…95) · 5 Projects · 14 milestones · corrected acyclic blocks-graph. Enhanced the toolkit tracker first (milestones + project descriptions).
- **Reusable scenario** `project-foundation/scenarios/build-roadmap.md` (crystallized from this task).

**Key decisions / patterns established:**
- **Database Layer leads.** Technical track (DB→AR) is the critical path; the shorter experience track (UX→DS→UI) blocks on Architecture — a single-track bottleneck, not balanced parity.
- **Single-user localhost web needs NO server + NO sync** — sync/SRP/relay/mobile/desktop defer wholesale to Phase 2; Phase 1 only scaffolds `_sync_*`/`sync_queue` (write, never flush). Caveat: the HLC *encoding* is F10-coupled, so DB-2 carries a deferred decision, not a free one.
- **Gate the roadmap AND its dependency graph before the outward push.** The Step-7 foundation gate (run late, after the Linear push) found a BLOCKER **dependency inversion** (AR-2 adapter declared below the DB-6 repository it sits above) that forced a Linear re-sync — an independent adversarial critic caught it by cross-checking every edge against the code, not the roadmap prose. The scenario now encodes gate-before-push.
- **The tracker's relation sync is add-only** — it can't prune a removed/inverted edge, so an inversion would create a Linear cycle. Filed as a §XXVI toolkit follow-up (needs `issueRelationDelete` + diff-reconcile).
- Planning-only: **`packages/` diff = 0**. The build phase (Phase-1.0 ① Database Layer, DB-1) is the next stone.
