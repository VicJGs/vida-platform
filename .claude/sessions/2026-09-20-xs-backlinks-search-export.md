# Session 2026-09-20 — xs-backlinks-search-export

Task initialized. Goal: reconcile the built AR-8 backlink resolver against its docs and re-scope
the `xs-backlinks-search-export` cross-cutting read/query service tier (backlinks · search · export ·
graph-prep) to its correct M1.1.2 boundary as a consumable `@vida/core` service.

Profile: Add Backend Component · Scenario: Entity Re-scope (Entity Delivery Flow recovery variant).
Head: M1/M1.1.2 `#42` · ← none · `#`-order over `--next`'s xs-ingestion.

Starting: Step 0 (document-context baseline, both planes) → Step 1 (Documentation Gate).
Built code: `services/search/backlink-resolver.ts` (AR-8). Source corpus:
`docs/specs/foundation/backend-intent/parts/xcut-backlinks-search-export.md`.
