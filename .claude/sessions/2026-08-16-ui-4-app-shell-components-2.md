---
Session 2 — 2026-08-16
Goal: UI-4 app shell — compose the web chrome (dock/sidebar · top-bar · command-bar host · Outlet · modal host) rendering the UX-2/3/5 models on UI-1
Profile: New Feature (scenario Default, document-first)
---

## Accomplished
- **Head verification (Victor's steer):** confirmed **UI-4 (#30)** is the true next head from the authoritative docs — an independent `#`-walk of `reconstructed-structure.md` against git-confirmed done-status + the `-d needs -c` sub-wave gate + `tracker --next`, all converging. The walk surfaced a real bookkeeping drift: **UX-2 (#22)** was shipped (PR #9 merged, LIF-91 Done) but missing from the `_index.md` Completed section + never archived → fixed (ticked checklist, `git mv` to archive, backfilled `_index.md` + `docs/specs/_index.md` rows).
- **Opened UI-4** (`/task-new`, new-feature) + authored the umbrella spec (BR-1..7 + the doc-derived S1–S5 unit roster) + the S1 detailed spec. Step-0 baseline (`baseline.md`) via 3 parallel Explore sweeps (apps/web · @vida/ui · architecture docs) — resolved all 3 pre-identified UNKNOWNs from doc citations.
- **Killed 3 manufactured "decisions"** I initially surfaced (nav-to-unbuilt-routes, unit-split, graph-lazy-load) — Victor: "every gap was already solved in the documentation." Reframed as doc-determined (baseline §4).
- **§XXVI gate:** gate-1 critique **REVISE → 7 findings folded** (2 blockers: `createMedia` removed in Tamagui v2 → plain `media` object; AppShell must mount in `routes.tsx` RootComponent wrapping `<Outlet/>`) → Approval 1. Preflight **PASSED (2 folds:** Visual Gate = running app not Storybook; jsdom docblock). Gate-2 clean → Approval 2.
- **Built + shipped S1 (shell scaffold):** the 5-region `AppShell` frame + `media` config + `app-shell-ui-store` extension (`+isMobileNavOpen`) + `UIProvider`/`ToastProvider` mounts. **`apps/web` became the first `@vida/ui` consumer** (+`@vida/ui`/`@tamagui/core@2.6.2` deps).
- **Visual Gate (real Brave) SHIP** — caught + fixed 2 bugs jsdom structurally can't: `process is not defined` (untamed-Tamagui runtime `process.env.*` → blank page → `index.html` shim, the UI-1 U0 fix) + shell not filling the viewport (`minHeight:100%` collapse → `index.css` reset + `minHeight:100vh`). Barrel sigma-WebGL crash → `setupFiles` stub (the `@vida/editor` precedent).
- Green: web typecheck · 96 tests · lint 0 err · build · @vida/ui 317. **PR #25 merged to `main`** (`f0fff60`).

## Decisions Made
- **D5 media seam** = a plain `media` object on `createTamagui` (Tamagui v2 has no `createMedia`); `config.media` = runtime SSOT, `apps/web` `TAMAGUI_MEDIA` = a parity-test guard (boundary is one-way).
- **AppShell mounts in `routes.tsx` RootComponent** (`<AppShell><Outlet/></AppShell>`), providers in `App.tsx` — `<Outlet/>` is only legal inside a route component.
- **Semantic landmarks via `styled(View,{render:'nav'})`** — Tamagui's runtime `tag` prop is not honoured.
- **Compose-in-`apps/web`**, no new `packages/ui` component (rule-of-three unmet; the only `packages/ui` edit is the media config).
- Profile = new-feature (delivery-plan row over reconstructed-structure's coarse "Generic").

## Open Questions
- CI red repo-wide (known pnpm `action-setup@v4` infra conflict — not S1; no branch protection, merges unblocked).
- App is **light-only** until a theme store lands (a later unit); dark reachable only via the Visual-Gate `theme="dark"` flip.
- The dark "Vida" low-contrast is the AR-4 placeholder index route, not shell chrome — resolves with real themed module content.

## Next Session
First step: **S2 (nav chrome)** — the module dock + global bar + Spaces-bar seam over `MODULE_MAP`/`GLOBAL_SURFACES`, off clean `main`, through the §XXVI gate (+ component Visual Gate).
Context to reload: `docs/specs/features/ui-4-app-shell-components/{_index,baseline}.md` (umbrella + roster), `apps/web/src/shell/{app-shell.tsx,regions.ts}`, `apps/web/src/nav/module-map.ts`, memory [[apps-web-is-the-first-vida-ui-consumer]] (Tamagui gotchas).
