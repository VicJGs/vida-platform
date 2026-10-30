# AR-8 — Foundation services (⊞≥2) · forward-spec umbrella

**Issue:** AR-8 (LIF-79) · M1.0 `#14` · Profile: Add Backend Component · ← AR-6 ✅.
**Scope source (authoritative):** `m1.0-delivery-plan.md §5:182` · `reconstructed-structure.md #14` ·
`cross-module-integration.md §3.4` (backlink-service governance) · `spaces/current-spec.md:33` · `data-flow.md`.

## What AR-8 is

The cross-cutting **`services/`-tier** utilities that ride the AR-6 `foundation/spaces` substrate (NOT new
substrates — ADR-018 §3.2 homes `export/ search/ analytics/` + `backlink-service.ts` under `core/src/services/`).
Per the delivery plan §5:182 + `#14` title, AR-8 = **{ search, backlink resolver, export serializers,
neural-graph data-prep }**. (Analytics is NOT in AR-8 — later per-feature build.)

## ⊞≥2 increment ledger (DF-11 — one full §XXVI gate per substrate, dependency order)

| #     | Substrate                            | Home                                            | Reads                 | Status                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----- | ------------------------------------ | ----------------------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1** | **Backlink / entity-link resolver**  | `core/src/services/search/` (dir)               | `entity_links` (AR-6) | ✅ DONE 2026-08-04 (double-gated; core 177/177; root typecheck 10/10)                                                                                                                                                                                                                                                                                                                                                  |
| —     | **Search (over FTS5)**               | `services/search/`                              | FTS5 tables           | **STREAMED to DB-8 (#60)** — not built here                                                                                                                                                                                                                                                                                                                                                                            |
| —     | **Neural-graph data-prep**           | —                                               | —                     | **NOT a bespoke build — already solved.** It IS the AR-6 `ViewEngine`+`ViewProviderRegistry` seam (`filter×layout×grouping`, `graph` layout) fed by per-module `ReadProvider`s (register at each module's build, M1.1+) + the `@vida/ui` `neural-graph` renderer (UI-2 #28). Relationships graph rides `network_groups` (spec'd, ADR-002 amendment). Building a `GraphData` service here would duplicate ADR-007/AR-6. |
| ?     | **Export serializers (MD/PDF/DOCX)** | `packages/editor/src/serializers/` (ADR-001 §8) | TipTap JSON           | **Disposition pending** — editor-coupled; likely UI-3/editor-adjacent, not a `@vida/core` AR-8 build. Confirm with Victor before speccing.                                                                                                                                                                                                                                                                             |

**Revised understanding (2026-08-04):** AR-8's genuinely-buildable-at-M1.0 content is the **backlink resolver
(#1, done)**. The other three named pieces are all homed/deferred to their real owners — search→DB-8,
graph→AR-6 Views seam + M1.1 providers + UI-2, export→`@vida/editor`. The `⊞≥2` was really "1 buildable now +
3 deferred seams," not "3 increments to build under AR-8."

See `backlink-resolver.md` for increment #1's forward-spec.
