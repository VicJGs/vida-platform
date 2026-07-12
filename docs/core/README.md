<!-- Core index — system-wide truth. Master map + status: docs/README.md (manifest). -->

# Core — Vida Platform

System-wide truth that every feature, service, and component inherits. Documented with the **canonical 5
aspects** (master manifest: [`../README.md`](../README.md)).

## Aspects
| Aspect | Where | Status |
|--------|-------|:------:|
| **Identity** | [`architecture/system-overview.md`](architecture/system-overview.md) | 🔄 |
| **Business Rules** (the constitution) | [`business-rules.md`](business-rules.md) — 18 invariants, every level inherits | ✅ verified |
| **Contract** (public surface) | [`server-api.md`](server-api.md) | 🔄 scaffold — server routes unimplemented |
| **Structure & Data** | [`decisions/`](decisions/) (ADRs) + [`architecture/module-dependency-graph.md`](architecture/module-dependency-graph.md) | 🔄 |
| **Conventions** | [`conventions.md`](conventions.md) | ✅ |

## Architecture
[`system-overview`](architecture/system-overview.md) · [`module-dependency-graph`](architecture/module-dependency-graph.md) · [`cross-module-integration`](architecture/cross-module-integration.md) · [`data-flow`](architecture/data-flow.md) · [`platform-strategy`](architecture/platform-strategy.md) · [`performance-strategy`](architecture/performance-strategy.md) · [`security-model`](architecture/security-model.md)

## Decisions (ADRs)
- [ADR-001 — Tech Stack](decisions/ADR-001-tech-stack.md)
- [ADR-002 — Data Model](decisions/ADR-002-data-model.md)
- [ADR-003 — Sync Protocol](decisions/ADR-003-sync-protocol.md)
- [ADR-004 — Session Framework](decisions/ADR-004-session-framework.md) (table-per-type sessions + 4-dimension Integration Contract; amends ADR-002)

> The CORE business rules are the **constitution** — the most important rules in the repo. Every lower level
> (features/services/components) inherits and must comply. `[FACT: business-rules.md]`
