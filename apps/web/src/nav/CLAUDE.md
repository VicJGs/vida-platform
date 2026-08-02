# apps/web/src/nav — Navigation / IA layer

**Owning issue:** UX-1 Information Architecture (LIF-90) · **Owning ADRs:** ADR-006/007 (Spaces/Views), ADR-018 §3.6 (layer-doc homes).

## What lives here
The **canonical nav / module map** — central DATA describing what modules exist, where each sits in navigation,
and how it is reached. Consumed by the nav chrome (UI-4) and by each module's route wiring when it lands (M1.1+).

- `module-map.ts` — `ModuleGroup`, `NavPlacement`, `ModuleNavEntry`, `NAV_AXES`, `MODULE_MAP`, `GLOBAL_SURFACES`.

## Rules (do not violate)
- **Data, not chrome.** This layer holds no JSX, no components, no layout. Rendering is UI-4 (chrome) / UX-3 (layout).
- **No route self-registration.** It does NOT import or mutate `routes.tsx`. AR-4 resolved the router as a single
  central `routes.tsx` with no self-registration seam (web-client-runtime/current-spec.md:88-89). The map is *read*
  by the router/chrome; it never registers routes itself.
- **Nav model = co-primary dual-axis** — module dock (content home) + Spaces bar (cross-cutting overlays). The
  Spaces bar is a designed seam here, live in M1.1. Full model: `docs/core/architecture/information-architecture.md`.
- **`placement` classifies each module**: `dock` (top-level) · `global` (owned cross-cutting surface) · `secondary`
  (standalone page surfaced within another realm's flow) · `non-nav` (lives inside another realm) · `spaces-only`
  (dissolved into Spaces). Placement is anchored in each module's `docs/features/<module>/identity.md`.
- **`routePath` is UX-facing** and MAY differ from `key` (e.g. `relationships` → `/people`). Do not assume `'/' + key`.
