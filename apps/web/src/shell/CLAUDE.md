# apps/web/src/shell — Shell layout model (UX-3) + app-shell chrome (UI-4)

**Owning issues:** UX-3 Shell layout + responsive (LIF-92) — the MODEL · UI-4 App shell components (LIF-89) — the
CHROME. **Owning ADRs:** ADR-006/007 (Spaces/Views), ADR-018 §3.6 (layer-doc homes).
Authority: `standards/design.md §X/§IV/§V` (responsive · spacing · radius/elevation) + §XIV (a11y). Full model:
`docs/core/architecture/shell-layout.md` · nav model: `information-architecture.md`.

## What lives here
Two concerns coexist: the UX-3 **layout model** (data) and the UI-4 **chrome** (the React components that render it).

**Model (UX-3 — data/logic only, no JSX):**
- `breakpoints.ts` — `Breakpoint`, `BREAKPOINTS`, `BREAKPOINT_ORDER`, `PRIMARY_TEST_WIDTHS`, `CONTENT_MAX_WIDTH`,
  `SIDE_PADDING`, `TOUCH_TARGET`, `PADDING_SCALE`, `breakpointForWidth()`, `TAMAGUI_MEDIA` (the reserved createMedia seam).
- `regions.ts` — `ShellRegion`, `DockState`, `OverlayMode`, `DOCK_STATE`, `OVERLAY_MODE`, `GLOBAL_BAR_MODE`,
  `REGION_VISIBILITY`, `LAYERING`, `ShellUIStateContract`, the `*At()` predicates, `SHELL_REGIONS`.
  **fe-shell #14 (dock⇄float panel model, S1):** `PanelId`/`PanelMode`/`PanelEdge`/`PanelPlacement`/`ShellPlacement` ·
  `DEFAULT_PLACEMENT` (both closed, docked-left — M1/L1) · `PANEL_IDS` · `panelAxis` (L/R=vertical, T/B=horizontal) ·
  `isOverlay` (float⇒overlay) · `reservedTopInset(bp)` (the EC-7 top strip, 52/56 on-grid). The two nav bars are
  macOS/iPadOS-inspector panels: each toggles docked (inline, content beside) ⇄ floating (overlay+scrim), rearrangeable
  to any edge. Governing model: `docs/specs/foundation/fe-shell/delivery/envision.md` M1–M7.
- `shell-prefs.ts` (fe-shell #14, S1) — `ShellPrefsRead = ProviderRead<ShellPlacement>` + `stubShellPrefs` (M1 → DEFAULT;
  live `nav_preferences` read/write = first consumer, envision L5). Panel *arrangement* is ephemeral Zustand
  (`app-shell-ui-store.placement`, BR-RT-6 "panel state"); *persistence* is this deferred seam (never a raw table).

**Chrome (UI-4 — the rendered app shell):**
- `app-shell.tsx` (S1) — the `AppShell` frame: 5 regions in the responsive layout, `useMedia()` breakpoint resolution,
  the bounded-viewport frame (`height:100vh`+`overflow:hidden`; dock & content scroll independently), the mobile
  drawer's open-transform + scrim. Mounted in `routes.tsx` `RootComponent` wrapping `<Outlet/>`.
- `module-dock.tsx` (S2) — the dock content: `MODULE_MAP` grouped, drawer/rail/sidebar forms, empty-group skip,
  collapse toggle. `global-bar.tsx` (S2) — `GLOBAL_SURFACES` condensed/full + ⌘K→`commandBar.open()` + overflow Menu.
- `nav-link.tsx` (S2) — a `createLink`-styled SPA anchor (one `ShellRoute` widening + `shellNavigate`; exact
  `aria-current`; `currentColor` icon tint). `nav-icons.ts` — key→`lucide-react` glyph (+ fallback).
  `feature-flags.ts` — `isFeatureEnabled` (M1.0 fail-closed stub). `use-nav-drawer.ts` — drawer focus/Esc/`inert`.
- **Onboarding (S4) renders OUTSIDE this shell** — the first-run screens live in `apps/web/src/onboarding/*` and mount
  from `App.tsx`'s first-run branch BEFORE `<RouterProvider>`, so no shell chrome exists during onboarding (S4-BR-h).
  Not a shell file; noted here because `App.tsx` gates shell-vs-onboarding. See `onboarding/CLAUDE.md`.
- **Integration (S5)** — S5 adds no shell file; it composes/verifies S1–S4 as one shell (`App.integration.test.tsx`,
  a full-`<App/>` end-to-end test of the §3.1 seams: ⌘K→real-router nav · search-unavailable · first-run branch) and
  ships the BR-7 **`/graph` lazy split**: `apps/web/src/app/graph/index.tsx` (default-export `GraphRoute` rendering
  `<NeuralGraph state="empty"/>` — no graph-data source in M1.0, AR-8 seam) is `lazyRouteComponent`-imported in
  `routes.tsx`, and `packages/ui/package.json` gained `"sideEffects": false` so Rollup tree-shakes the unused
  `NeuralGraph` out of the eager barrel graph. MEASURED: sigma/graphology leave the initial chunk into a ~42 KB lazy
  `graph-*` chunk (< 50 KB, performance-strategy §6). ⚠ the residual ~154 KB initial chunk (React+Tamagui+router,
  unsplit) is a SEPARATE framework-split perf task, NOT BR-7. See `docs/specs/features/ui-4-app-shell-components/s5-integration.md`.
- `command-bar.tsx` (S3) — the ⌘K launcher overlay: COMPOSES UI-1 `Dialog` (modal envelope) + `Input` (a `role=combobox`
  field via Input's `{...rest}` pass-through — no `packages/ui` edit) + a hand-rolled `role=listbox` of non-focusable
  `role=option` divs (aria-activedescendant, ↑/↓, Enter — the Select pattern, one tab stop). Builds the registry
  (`navProvider`+`shellActionsProvider`), injects `useShellNavigate` into `CommandRunContext`, `visibleWhen`-filters
  (gamification fail-closed). Two STORE-driven modes: empty query → command list; non-empty → the `SearchProvider`
  outcome (`search-unavailable` in M1.0 — a loud `role=status`, the grouped `results` UI is a DB-8 seam). Self-portals
  via Dialog (the `overlayHost` region stays a reserved marker). `use-command-keybind.ts` (S3) — the global launcher
  keydown; opens on **EITHER ⌘ or Ctrl + K** (lenient mod — reachability must not hinge on fragile `navigator`
  detection, which Brave farbles; `resolveKeybind` stays the canonical/display binding). `use-command-search.ts` (S3)
  — the race-guarded async search hook (last-query-wins). (+ `apps/web/src/lib/platform.ts` — `detectPlatform()`.)
- `test-router.tsx` — test-only memory-router render helper (not shipped).

## Rules (do not violate)
- **The MODEL files (`breakpoints.ts`, `regions.ts`) are data, not chrome.** No JSX, no components. The CHROME files
  render them. Do not import `@tamagui`/JSX into the model files; do not put layout constants the model owns into the chrome.
- **Chrome composes UI-1, never rebuilds it.** The shell adds NO `@vida/ui` component (rule-of-three unmet — one
  consumer); it composes UI-1 primitives (`Button`/`Menu`/…) + `lucide-react` icons. Icon LIBRARY is ADR-001-fixed
  (`lucide-react` web); the icon MAP is rendering data. Every value is a DS token (no hex, no invented z/spacing).
  The only `packages/ui` writes are non-component config: the S1 `media` object (D5 seam) + the S5 `"sideEffects":
  false` metadata (DF-S5-1, a barrel-defect fix enabling the `/graph` tree-shake — NOT a component; the barrel-defect
  precedent [[first-runtime-consumer-surfaces-latent-barrel-defects]]).
- **Nav degrades, never crashes.** Links target `routePath` via TanStack `to` (SPA) — never `href` (reload);
  unregistered routes render `NotFoundComponent` (BR-4). The `ShellRoute` widening is confined to `nav-link.tsx`.
- **Apply the standard, never invent.** Breakpoints (`375/768/1440/1920`), containers (1280 centered, 16/24/32),
  touch targets (44×44), padding scale, overlay radius/elevation all come from `design.md §X/§IV/§V`. Do NOT introduce
  a value the standard doesn't set; the **region reflow model** (drawer→rail→sidebar, sheet→centered, Spaces seam) IS
  this layer's own design and is the one thing not in the standard.
- **No `@tamagui` import.** `TAMAGUI_MEDIA` is plain data in the `createMedia` shape. UI-4 registers it into
  `createMedia` when it wires `@vida/ui` into apps/web (the D5 seam) — editing `packages/ui/tamagui.config.ts` is UI-4's,
  out of UX-3's `apps/web/src` Home.
- **Store: the MODEL only reserves the shape; the CHROME consumes it.** `ShellUIStateContract` (`isSidebarOpen`,
  `isMobileNavOpen`) lives on `stores/app-shell-ui-store.ts`; the chrome reads/toggles it, the model never touches it.
  The current breakpoint is read via `useMedia()`, never stored.
- **`MODULE_MAP` import: the CHROME renders it (dock/global bar); the MODEL must not** — the layout model is
  orthogonal to the nav data. `module-dock.tsx`/`global-bar.tsx` are the renderers.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Mobile-first.** Every rule is base→up; `mobile` is the baseline, larger widths enhance; `wide` is a max-width cap.
