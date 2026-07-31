# ADR-020: Zustand store placement — per-app React hooks (web), not vanilla stores in `packages/core`

**Status:** Accepted
**Date:** 2026-07-30
**Decision Makers:** Victor J.
**Context:** Vida Platform — resolving the deferred decision ADR-001:286 ("Zustand stores placement: `packages/core` vanilla vs per-app React hooks", deferred to Phase 0.5 / Monorepo Init). AR-1 (topology) did not close it, and AR-4 (LIF-75) is the **first consumer** to place a store — so it resolves it here. Basis: `docs/specs/foundation/ar-4-state-routing-forms/sessions/PLAN-2026-07-29-ar-4-state-routing-forms.md` (gate-1 PLAN, D2), grounded in `docs/core/architecture/data-flow.md §7`.
**Tags:** architecture · state · frontend · foundation
**Amends:** ADR-001 §21 (resolves the deferred store-placement row — a one-line pointer added at ADR-001:286). Doc + first-implementation decision; no prior code changed.
**Does NOT amend:** the state-plane boundary itself (ADR-001 §12 / `data-flow.md §7` — React Query owns DB-derived data, Zustand owns ephemeral UI state) is unchanged; this ADR fixes only *where the store code lives*.

---

## 1. Decision

Zustand stores are authored as **per-app React hooks** under `apps/<app>/src/stores/<feature>-ui-store.ts`
(e.g. `apps/web/src/stores/app-shell-ui-store.ts`), using the v5 curried `create<T>()(...)` form. They are **not**
authored as framework-agnostic vanilla stores in `packages/core`.

## 2. Why

- **No M1.0 consumer for sharing.** The only argument for vanilla-in-`core` is sharing a store across web + React
  Native. Mobile is **M4 (Venues)** — there is no cross-platform store consumer in M1.0, so vanilla-in-core would be
  speculative infrastructure (the over-engineering guard).
- **The architecture already models it per-app.** `data-flow.md §7` shows `apps/web/src/stores/task-ui-store.ts`
  (a per-app hook), and `platform-strategy.md:55` homes "app shell and routing" per-app.
- **Zustand holds only ephemeral UI state** (BR-RT-6/7) — view mode, filters, selections, sidebar/panel state.
  UI state is inherently per-app (it mirrors that app's component tree), so little is lost by not sharing it; genuinely
  shared *data* lives in SQLite and is read via React Query, not Zustand.

## 3. Revisit when

A concrete need arises to **share a Zustand store's logic across web + React Native** (M4). At that point, extract the
shared store as a vanilla store in `packages/core` (`zustand/vanilla`) and wrap it with per-app `useStore` hooks —
a mechanical migration, not a rewrite, because the store shapes are already isolated per feature. Until then, YAGNI.

## 4. Consequences

- Store files live at `apps/web/src/stores/`; each feature owns its own store (no giant global store — engineering §XVII).
- The `packages/core` boundary stays **data/logic only** (encryption, sync, DB, services) — no React/UI-state code leaks in.
- Mobile (M4) will re-open this only if it needs to share a specific store; the default there is also per-app.
