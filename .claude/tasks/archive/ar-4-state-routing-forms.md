# Task: ar-4-state-routing-forms
# Status: done
# Linear: LIF-75
# Profile: Generic Coding Session
# Scenario: default
# Project: M1 — Whole Manual OS
# Milestone: M1.0 — Boot & Connective Base
# Phase: 1.0 — Structural Foundation
# Spec: docs/specs/foundation/ar-4-state-routing-forms/_index.md
# Source: docs/roadmap.md → Phase 1.0 ② Architecture Layer · docs/roadmap/m1.0-delivery-plan.md §149 (LIF-75)
# Activated: 2026-07-29 (M1.0 delivery loop — COMPUTED head via tracker_sync --next off db-7)

## Goal
Wire the app runtime in `apps/web` per ADR-001: **Zustand** stores (client state), **React Query v5**
(async/DB state) with the query-key conventions, **TanStack Router** (web), and **TanStack Form + Zod**
for validated forms. The state/routing/forms substrate every module screen and the editor (UI-3/UI-4)
build on — the single convention-fixed home at `apps/web/src/{stores,router,forms}`.

## Dependencies
- blocked by `ar-1-monorepo-topology`
<!-- Sole build-time blocker per delivery-plan §149 + §5.1.1 (AR-4 ← AR-1). AR-1 ✅ done.
     AR-4 is a sibling of DB-6/DB-7 off the spine (AR-2 → AR-4 ∥ DB-6 ∥ DB-7, plan §117) — no DB edge:
     AR-4 wires client planes, it does not read the repository/adapter at build time.
     Downstream: UI-3 (editor mounts in routes + issues React Query reads) ← UI-1, AR-4; UI-4 app shell. -->

## Build Steps
<!-- UNIT-level — mirrors PLAN §5 (gate-1, reworked post-preflight w/ D5). Locked at Approval 2. Awaiting 2nd critique. -->
- [x] B1 deps (zustand/@tanstack ×3; versions via context7) + pnpm install
- [x] B2 worker.ts protocol extension → open·migrate·query·exec·close·exists (values/batch = seam)
- [x] B3 db/client.ts — main-thread SqliteDriver proxy over worker (id-correlated RPC) + first-run exists()
- [x] B4 lib/query-client.ts — module-scope QueryClient (BR-RT-5 defaults)
- [x] B5 routes.tsx — root + not-found + one lazy() route (module-scope router)
- [x] B6 App.tsx — worker start + open+migrate + DB-ready gate; QueryClientProvider ⊃ RouterProvider (main.tsx bare)
- [x] B7 stores/app-shell-ui-store.ts — one UI-only Zustand store
- [x] B8 lib/forms.ts — TanStack Form + Zod resolver factory
- [x] B9 hooks/useSchemaVersion.ts — reference query (queryFn → getSchemaVersion(clientProxy))
- [x] B10 vitest env (jsdom) in vite.config.ts + tests (jsdom route/provider/client-RPC · better-sqlite3 read · config/store/form)
- [x] B11 ADR-020 store-placement + ADR-001:286 pointer; confirm tsconfig
- [x] B12 verify (build/typecheck/tests) + grep-clean + §XXIX currency (incl. db layer-doc AR-4 line); flag Vite 6→7 follow-up

## Progress
<!-- SESSION checklist — mirrors the Default scenario ## Task List. -->
- [x] Step 0 · document-context BASELINE — current-* born at docs/infrastructure/web-client-runtime/ (floor grepped; harvest cited)
- [ ] Forward spec written + §XXVI double-gate cleared (Approval 1 + Approval 2) before any implementation
- [x] Goal stated in one sentence (see ## Goal)
- [ ] Mode chosen (code build → §XXVI gate, not /quick)
- [ ] Work complete
- [ ] Currency Rule §XXIX — current-spec + current-business-rules refreshed for every context touched
- [ ] /session-end run at close — decisions + outcomes logged

## Open Questions
- **GRAIN** — does AR-4 ship all four planes as *working wired infra*, or a spine/scaffold grain like the
  recent substrate builds (AR-5/AR-6 shipped STRUCTURE only)? Resolve at the PLAN gate from the delivery-plan
  §149 intent flags (B·F·C·L) + ADR-001 — do NOT guess. [BLOCKING for the PLAN's scope]
- Router shape: single root route tree now, or a lazy per-module route-registration seam for later waves?
- Query client: default staleTime/gcTime + the local-first read model — confirm the queryFn source is the
  local SQLite repository (db-6), NOT an HTTP fetcher (ZK/local-first: the server is a blob relay only).

## Decisions Made
| Decision | Choice | Reason | Date |
|----------|--------|--------|------|
| Spec bucket | `foundation` (not `features`) | repo convention — every M1.0 spine unit specced at docs/specs/foundation/<unit>/ | 2026-07-29 |
| Profile | Generic Coding Session | delivery-plan §149 profile=generic-coding; switched at /begin this session | 2026-07-29 |

## Route History
| Step | Detour | Why | Resolved |
|------|--------|-----|----------|

## Knowledge Loaded
- BASELINE: docs/infrastructure/web-client-runtime/current-{spec,business-rules}.md (born this session, from-zero)
- ADR-001 §12 (state/routing/forms stack) + §21 (deferred decisions, incl. :286 store-placement)
- docs/core/architecture/: data-flow.md §7 (state boundary), performance-strategy.md §5-6 (cache config + bundle),
  platform-strategy.md §9 (app dir structure), system-overview.md (State & Routing)
- delivery-plan §149 (AR-4 row) + §5.1.1 (dep-graph) + §117 (AR-2 → AR-4∥DB-6∥DB-7)
- Live floor: apps/web/src/{main,App}.tsx + app/* stubs + package.json deps

## Session History
| Date | What was done | Next step |
|------|--------------|-----------|
| 2026-07-29 | activated stub → full task + scaffolded spec stub | run the loop: Step 0 baseline → PLAN (/documentation-component) → /critique → Approval 1 |

## Failures This Session

## Notes
- COMPUTED head via `tracker_sync.py --next` off db-7 (delivery-plan §4 Consumption Rule). Ranked #1 by
  dependent-count; parallel-ready alts were db-10, qa-1. Frontier flagged the profile switch to generic-coding.
