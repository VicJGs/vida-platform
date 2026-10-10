# fe-shell-scope — SLICE MAP (Entity Delivery Flow · Step 2 · Decomposition Gate)

> **Mode: DECIDE** — no doc fixes the #15 slices beyond "Bar 1 + scope selector + 6 surfaces" (reconstructed-structure.md:40).
> Unit #15 · LIF-219 · **all slices FRONTEND** (presentational chrome in `apps/web/src/shell`; composes shipped
> `@vida/ui`, adds no `@vida/ui` component — ui-4 BR-1). No backend slice: the space-list source is a deferred
> `ProviderRead` stub (seam-contract §A). Each slice = its own §XXVI double-gate + a blocking per-slice Visual Gate.

## Slices

### S1 — Scope selector (+ its state substrate) · `frontend`
The `Spaces:` switcher and everything it needs. Folds the state substrate into its only consumer (no logic-only
slice — right-sized).
- **State store** `apps/web/src/stores/scope-store.ts` — Zustand: `{ activeSpaceId: string|null, setScope(id|null) }`
  (NULL = global/All). The `app-shell-ui-store` precedent (ephemeral UI state).
- **Read seam** `apps/web/src/shell/spaces-scope.ts` — `SpacesScopeRead = ProviderRead<SpaceOption[]>` + `stubSpacesScope`
  (M1.0 → `[]` ⇒ global-only). The `shell-prefs.ts`/`stubShellPrefs` precedent (seam-contract §A).
- **Component** `apps/web/src/shell/scope-selector.tsx` — `ScopeSelector` composing `@vida/ui` `Menu` + `Button`;
  active scope label (`Spaces: <name>` | `All`), the space list + **All**, and the degrade states.
- **Covers:** EC-1 (persistent switcher, list + All), EC-2 (degrade: populated/loading/empty→global-only/error).
- **Visual Gate:** selector × {default · open · loading · empty · error} × {light·dark incl. warm-dark} × {375·768·1440}.

### S2 — Global surfaces, re-homed (both forms) · `frontend`
The 6 `GLOBAL_SURFACES` rendered in Bar 1's two forms. Reuses `NavLink` + `navIcon`; **Search = ⌘K action, not a link**.
- **Strip form** `apps/web/src/shell/global-surfaces-strip.tsx` — full (≥768, all 6 as icon-nav) / condensed (≤375,
  Search + overflow Menu). Supersedes `global-bar.tsx` (shape reference; delete it at S3 wire-in).
- **Panel list form** `apps/web/src/shell/global-surfaces-list.tsx` — the labeled nav list (icon + label; ⌘K hint on
  Search) for the expanded System panel body; a labelled `<nav>` inside the `<aside>` landmark (IR6).
- **⚠ ACCOUNT dropped from #15** — EC-4's greybox showed an "Account" row, but there is **no account route/surface**
  in `GLOBAL_SURFACES` and it is **redundant with Settings** (already one of the 6). Rendering a dead affordance
  violates No-Guessing. → Panel body = scope + the 6 surfaces only; account deferred (→ fe-settings / a later System
  re-home). *(Surfaced at Approval 1; EC-4 reduced to scope + labeled surfaces.)*
- **Covers:** EC-3 (strip full/condensed; Search=⌘K; `aria-current`), EC-4 (labeled panel list — scope + 6 surfaces),
  EC-6 (active-surface distinction).
- **Visual Gate:** both forms × {default · active · hover · focus} × {light·dark} × {375·768·1440}.

### S3 — Bar 1 assembly + dual-home wiring · `frontend` (+ the one shipped-shell seam)
Compose S1+S2 into Bar 1 and wire it into BOTH homes.
- **Assembly** `apps/web/src/shell/global-bar-1.tsx` — condensed/full strip (scope + surfaces strip) for the top strip;
  the expanded body (scope + surfaces list + account) for the panel.
- **Shipped-shell seam (IR2):** add `systemPanelSlot?: ReactNode` to `AppShell` (app-shell.tsx) — the `system` panel
  body renders it (both docked :159 + float :344), `modules` keeps `PanelBodyPlaceholder`. The ONLY edit to the shipped
  shell; additive, back-compat (default = placeholder). `bar1Slot` already exists.
- **Wire-in** `routes.tsx` `RootComponent` → `<AppShell bar1Slot={<GlobalBar1 variant="strip"/>} systemPanelSlot={<GlobalBar1 variant="panel"/>}>`.
- **Delete** the superseded `global-bar.tsx` (+ `global-bar.test.tsx`) — **verified dead** (unimported post-#14; only a
  stale comment mention in `use-nav-drawer.ts`), re-homed here.
- **⚠ 375 co-fit:** the top strip at 375 already carries wordmark + 2 panel toggles + `bar1Slot` + `hudSlot`; the
  condensed Bar 1 (scope + Search + overflow Menu) must co-fit without overflow (the `global-bar.tsx` condensed
  precedent proves the pattern). The S3 Visual Gate's 375 column asserts 0 overflow.
- **Covers:** EC-5 (both homes), EC-6 integrated.
- **Visual Gate:** the REAL shell (onboarding→shell) — Bar 1 in the top strip + System panel (dock + float) ×
  {light·dark} × {375·768·1440} + axe + the §XIV a11y sweep.

## EC → slice coverage (every structural EC homed)
| EC | Type | Slice |
|----|------|-------|
| EC-1 | structural | S1 |
| EC-2 | structural | S1 |
| EC-3 | structural | S2 |
| EC-4 | structural | S2 |
| EC-5 | structural | S3 |
| EC-6 | structural | S2 (+S3 integrated) |
| EC-7 | feel | S1/S2/S3 live gates |
| EC-8 | feel | all Visual Gates (warm-dark) |

**Holds:** EC-1…EC-6 (structural) each map to ≥1 slice; EC-7/EC-8 (feel) defer to the live Visual Gates. No unhomed EC.

## Notes (not slices)
- **N-a** scope = emit-to-seam (sets state, no live view consumer in M1.0 — IR3). S1 store is honest; no fake filter.
- **N-b** space CRUD is OUT (→ fe-spaces-page #20). The Modules panel body (module nav) is a separate re-home, not #15.
- **N-c** ADR-006 amendment homed forward (tracked follow-up).
