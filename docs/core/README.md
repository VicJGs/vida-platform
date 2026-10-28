<!-- Core index — system-wide truth. Master map + status: docs/README.md (manifest). -->

# Core — Vida Platform

System-wide truth that every feature, service, and component inherits. Documented with the **canonical 5
aspects** (master manifest: [`../README.md`](../README.md)).

## Aspects

| Aspect                                | Where                                                                                                                    |                  Status                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | :---------------------------------------: |
| **Identity**                          | [`architecture/system-overview.md`](architecture/system-overview.md)                                                     |                    🔄                     |
| **Business Rules** (the constitution) | [`business-rules.md`](business-rules.md) — 18 invariants, every level inherits                                           |                ✅ verified                |
| **Contract** (public surface)         | [`server-api.md`](server-api.md)                                                                                         | 🔄 scaffold — server routes unimplemented |
| **Structure & Data**                  | [`decisions/`](decisions/) (ADRs) + [`architecture/module-dependency-graph.md`](architecture/module-dependency-graph.md) |                    🔄                     |
| **Conventions**                       | [`conventions.md`](conventions.md)                                                                                       |                    ✅                     |

## Architecture

[`system-overview`](architecture/system-overview.md) · [`module-dependency-graph`](architecture/module-dependency-graph.md) · [`cross-module-integration`](architecture/cross-module-integration.md) · [`data-flow`](architecture/data-flow.md) · [`platform-strategy`](architecture/platform-strategy.md) · [`performance-strategy`](architecture/performance-strategy.md) · [`security-model`](architecture/security-model.md)

## Decisions (ADRs)

- [ADR-001 — Tech Stack](decisions/ADR-001-tech-stack.md)
- [ADR-002 — Data Model](decisions/ADR-002-data-model.md)
- [ADR-003 — Sync Protocol](decisions/ADR-003-sync-protocol.md)
- [ADR-004 — Session Framework](decisions/ADR-004-session-framework.md) (table-per-type sessions + 4-dimension Integration Contract; amends ADR-002)
- [ADR-005 — Study-Method Service Framework](decisions/ADR-005-study-method-service-framework.md) (pluggable study-method services on Knowledge's generic review engine; Flashcards = reference impl; amends ADR-002)
- [ADR-006 — Spaces Foundation & Universal Tags](decisions/ADR-006-spaces-foundation-universal-tags.md) (tier + universal `entity_tags` + `spaces`; amends ADR-002)
- [ADR-007 — Saved Views](decisions/ADR-007-saved-views.md) (filter × layout × grouping; amends ADR-002)
- [ADR-008 — Capability/Block Registry](decisions/ADR-008-capability-block-registry.md) (render-targeted capability definitions + `block_instances`; amends ADR-002)
- [ADR-009 — Templates (Fork-on-Instantiate)](decisions/ADR-009-templates-fork-on-instantiate.md) (light `templates` store; amends ADR-002)
- [ADR-010 — Capability Authoring Security](decisions/ADR-010-capability-authoring-security.md) (declare→grant→enforce sandbox; `capability_grants`)
- [ADR-011 — Universal Measurability & Progress Propagation](decisions/ADR-011-universal-measurability-progress-propagation.md) (cross-cutting `measurement_kind`/`binding_mode` + fractal rollup; amends ADR-002)
- [ADR-012 — Points Economy & Consequence Engine](decisions/ADR-012-points-economy-consequence-engine.md) (Gamification "the System": multi-currency economy + rule→consequence coordinator on existing rails; amends ADR-002, extends ADR-004 §3.2.2 + ADR-011 §3.7)
- [ADR-013 — Zero-Knowledge Notification Delivery](decisions/ADR-013-zero-knowledge-notification-delivery.md) (three-tier delivery: in-app · native local-scheduled · content-free wake-signal; server never sees content; amends ADR-001, ADR-002, ADR-003)
- [ADR-014 — External Data Ingestion under Zero-Knowledge](decisions/ADR-014-external-data-ingestion-under-zero-knowledge.md) (device-mediated guard; three integration layers — native · public-reference · user-managed; server blind, third-party leaks disclosed, egress stricter; amends ADR-002, ADR-010) — _first of the two standing EX-2 ZK-integration ADRs_)
- [ADR-015 — AI/LLM Integration under Zero-Knowledge](decisions/ADR-015-ai-llm-integration-under-zero-knowledge.md) (two modes: on-device/agentic ZK-safe-for-content · cloud BYO-key disclosed content dent; dedicated AI page; agent = mediated actor, prompt-injection bounded; amends ADR-002, ADR-014, ADR-010) — _second of the two standing EX-2 ZK-integration ADRs_)
- [ADR-016 — Storage Layer Rebuild from Zero](decisions/ADR-016-storage-layer-rebuild-from-zero.md) (v1 schema ~60% stale → rebuild from zero into `schema/`; DDL = hand-written SQL migrations, Drizzle query-only, no drizzle-kit; per-table build gate; realizes ADR-002 §5.20, resolves ADR-001's migration-gen silence) — _governs the storage-rebuild campaign; master plan: [`storage-build-plan.md`](../infrastructure/storage-build-plan.md)_ — **sequencing parked by ADR-017**
- [ADR-017 — Features-First Resequencing (defer encryption/sync/auth)](decisions/ADR-017-features-first-resequencing-defer-encryption-sync.md) (Phase 1.0 inverted: build the usable product on the local-first stack with encryption/sync/auth **deferred to a later hardening pass** — seams already exist, so each is a bolt-on; deliver web SPA **A** → graduate to Tauri desktop **D** off one codebase; ZK thesis validated later, not dropped; amends the _sequencing_ of ADR-016/001 + the roadmap, changes no architecture) — _parks the 35-issue substrate-first order + `db-2`/LIF-64; next session authors the features-first execution plan_

> The CORE business rules are the **constitution** — the most important rules in the repo. Every lower level
> (features/services/components) inherits and must comply. `[FACT: business-rules.md]`
