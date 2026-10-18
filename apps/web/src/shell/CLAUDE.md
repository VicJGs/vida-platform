# apps/web/src/shell — Shell layout model (UX-3) + app-shell chrome (UI-4)

**Owning issues:** UX-3 Shell layout + responsive (LIF-92) — the MODEL · UI-4 App shell components (LIF-89) — the
CHROME. **Owning ADRs:** ADR-006/007 (Spaces/Views), ADR-018 §3.6 (layer-doc homes).
Authority: `standards/design.md §X/§IV/§V` (responsive · spacing · radius/elevation) + §XIV (a11y). Full model:
`docs/core/architecture/shell-layout.md` · nav model: `information-architecture.md`.

## What lives here
Two concerns coexist: the UX-3 **layout model** (data) and the UI-4 **chrome** (the React components that render it).

**Model (UX-3 — data/logic only, no JSX):**
- `breakpoints.ts` — `Breakpoint`, `BREAKPOINTS`, `BREAKPOINT_ORDER`, `PRIMARY_TEST_WIDTHS`, `CONTENT_MAX_WIDTH`,
  `SIDE_PADDING`, `CONTENT_V_INSET` (content vertical inset 24/32/40 — the shell-owned top+bottom breathing room below
  the strip; design.md §X has only the horizontal gutter, so this is shell-owned, documented in shell-layout.md), `TOUCH_TARGET`,
  `PADDING_SCALE`, `breakpointForWidth()`, `TAMAGUI_MEDIA` (the reserved createMedia seam). Accessor: `regions.ts contentVInsetAt()`
  (the `contentGutterAt` twin) → `app-shell.tsx` `ContentMain paddingVertical`.
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
- `spaces-scope.ts` (fe-shell-scope #15, S1) — `SpacesScopeRead = ProviderRead<SpaceOption[]>` + `stubSpacesScope`
  (M1 → `[]` ⇒ global-only). The scope selector's space-list read seam; `SpacesService` has no `listSpaces` yet, so the
  live provider swaps in at the first consumer (the `shell-prefs` deferred-seam precedent). Active scope state is the
  ephemeral `stores/scope-store.ts` (`activeSpaceId|null`, null = global; emit-to-seam — no live view consumer in M1.0).
- `scope-selector.tsx` (fe-shell-scope #15, S1) — the `Spaces:` switcher (EC-1/EC-2). Composes `@vida/ui` `Menu`+`Button`
  (adds NO component); reads the list via `SpacesScopeRead` (React Query) + the scope store. DEGRADES never crashes:
  populated(Menu) / loading(busy) / empty(global-only disabled) / error(calm `role=status`). **Wired in at S3** —
  `GlobalBar1` mounts it in `bar1Slot` + the System panel body. Visual Gate PASS (5 states × light/dark/warm-dark ×
  375/1440, measured 0 AA fails). **`compact` prop (S3; re-tightened by fe-session-hud #16, Victor 2026-10-18):** GLOBE-ONLY for the ≤375
  strip — the active name lives in `aria-label` (EC-1 held via SR). With the HUD filling the #16 slot the 375
  strip overcommitted ~80px (Bar-1 scrollWidth 179 vs clientWidth 87, painting over the HUD); the scope yields
  its text and Search folds into the More menu (see global-surfaces-strip).
- `global-surfaces-strip.tsx` (fe-shell-scope #15, S2) — the 6 `GLOBAL_SURFACES` in Bar 1's TOP-STRIP form, mode-prop
  (parent-resolved) driven: `full` (≥768) = Search launcher + route surfaces as icon-nav · `condensed` (≤375) = a More-only
  overflow `Menu` whose FIRST row is Search (the ⌘K action, never a link — EC-3; the standalone Search button
  folded in at fe-session-hud #16's strip-budget fix, Victor 2026-10-18). **Supersedes `global-bar.tsx`** (deleted at S3) — the one refinement: NO hamburger (app-shell
  #14 owns panel toggles). Search = ⌘K action, never a link (EC-3). Composes `NavLink`+`Button`+`Menu`. Covers EC-3/EC-6.
- `global-surfaces-list.tsx` (fe-shell-scope #15, S2) — the 6 surfaces as a LABELED vertical nav for the expanded System
  panel body (EC-4). Carries its OWN `render:'nav'` landmark inside the `<aside>` (IR6); route surfaces = `NavLink` rows
  (aria-current + active fill, EC-6); Search = a raw `render:'button'` row (mirrors NavLink dims, `type="button"`) with a
  ⌘K hint (`aria-hidden`). Scope sits ABOVE this in the S3 assembly, not here.
- **S2 Visual Gate PASS** (Brave, 3 presets × 2 modes = 132 elements MEASURED, 0 AA fails incl. warm-dark; focus rings
  2px). Surfaced + fixed TWO shipped-primitive AA bugs (Victor-approved, both roots): **(a)** `@vida/ui` Button slot
  icons rendered black in dark → Button frame now carries a per-intent `color` so `leading`/`trailing` icons tint (also
  fixed scope-selector's `ChevronDown` + global-bar); **(b)** `nav-link.tsx` active brand-on-secondary = 4.39/4.44 < 4.5
  → active color `$colorBrandPrimary` → **`$colorBrandEmphasis`** (also fixed the module-dock active item). [[accent-text-on-secondary]]

**Chrome (UI-4 — the rendered app shell):**
- `app-shell.tsx` — **fe-shell #14 · S2 reshaped the frame** to the CODEC dock⇄float inspector model (envision M1–M7).
  The `AppShell` is now a bounded-viewport column (`height:100vh`+`overflow:hidden`): a **reserved top strip** (`<header>`
  → `role="banner"`, `reservedTopInset(bp)` 52/56 tall, `data-top-inset`) carrying the serif `$display` **"Vida"** wordmark +
  **System/Modules** panel toggles (`aria-pressed`←`placement[id].open`, `onPress`→`togglePanel`, S1 store) + the `bar1Slot`
  (#15) / `hudSlot` (#16) slots → a full-bleed **Content** `<main>` (`children`, 1280-centered + per-bp gutters, independent
  scroll) → an **overlay host** (`overlaySlot`, `pointerEvents:none`, `$overlay` z). Props: `children`/`bar1Slot`/`hudSlot`/
  `overlaySlot`/`__bp` (seam-contract §C). Mounted in `routes.tsx` `RootComponent` with `overlaySlot={<CommandBar/>}`
  (⌘K reuses ui-4/ux-2 — CommandBar owns its keybind + self-portals). The **dock⇄float PANELS** the toggles reveal are
  S3 (docked-inline) / S4 (floating-overlay); #15/#16/#17 contents + live `nav_preferences` persistence are deferred.
  _(Superseded S1 five-region frame: left module dock + global bar + spaces bar + mobile drawer — `module-dock.tsx`/
  `global-bar.tsx` stay as files, to be re-homed as panel bodies / #15 content in S3+.)_
  **fe-shell #14 · S3 reshaped app-shell to COMPOSE the docked panels** (`shell-panel.tsx`, below): the below-strip
  region now folds every open+**docked** panel AROUND the Content (`foldDocked`) so Content sits beside it — a flex
  **row** (left/right edges) or **column** (top/bottom edges), panel-first for left/top. Content stays `flex=1
  minHeight=0 minWidth=0` + the panel is content-fit (`flexGrow/Shrink=0`) — the RNW flex-collapse guard for the
  row↔column flip ([[flex1-child-collapses-to-height-0-in-column-under-rnw]], BR-S3-9). The System/Modules bar toggles
  upgraded from `aria-pressed` to a **disclosure**: `aria-expanded={dockedOpen}` (honest — true iff a docked panel is
  actually rendered) + `aria-controls={panelDomId(id)}` when docked-open; app-shell holds `toggleRefs` so a panel's
  ✕-close returns focus to its bar toggle (§XIV). Panel bodies in #14 = an empty-but-functional `PanelBodyPlaceholder`
  (envision L4; real module nav / #15 surfaces deferred). Float render = S4.
  **S4:** the below-strip region wraps the content/docked composition in a ref'd wrapper (`bgRef`) + adds an absolute
  **float layer** (`$overlay`) that mounts a `ShellPanel` (float) per open+floating panel. While any float is open:
  the `bgRef` wrapper is `inert`+`aria-hidden` (modal background, NOT the top strip → re-toggle stays live, G1), and the
  bar toggles go `tabIndex={-1}` (complete the drawer's trap; keyboard/SR dismiss = Esc; pointer re-toggle still works) +
  `aria-haspopup="dialog"` in float mode; the disclosure widened to `aria-expanded={open}` (both modes render a region).
  Concurrent floats are UI-unreachable (inert blocks reaching a 2nd Float control) → coordinated multi-float is S5.
  **S5 (finale):** `foldDocked` groups docked panels **by edge** → **dock-together** (EC-4): panels sharing an edge render
  as ONE `data-dock-edge` cluster stacked along the cross axis (L/R→column, T/B→row), content-fit, Content beside;
  different edges nest (PANEL_IDS-first-seen order). The **persist-read seam** is wired: `AppShell` gains `shellPrefs?:
  ShellPrefsRead` (default `stubShellPrefs`) + a **once, cold-boot-only** hydration effect (`hydratedRef` + applies only
  while `getState().placement === DEFAULT_PLACEMENT` — never clobbers a set arrangement; no `active`-cleanup so it's
  StrictMode-safe). Live `nav_preferences` read/write = first consumer (envision L5). One responsive model, **no mobile
  auto-switch** (dock/float choice IS the model; M7) — a docked panel at 375 stays content-fit-narrow (user floats for a
  near-full sheet). _(fe-shell ②/#14 COMPLETE — S1–S5; PR merges to main.)_
- `shell-panel.tsx` (fe-shell #14, S3) — **`ShellPanel`**, the DOCKED nav panel (A). Presentational + state-as-prop
  (reads `placement`, emits `onSetMode`/`onSetEdge`/`onClose`; app wires the store). `modules` → `<nav aria-label>`,
  `system` → `<aside aria-label>` (semantic landmark via `styled(View,{render})`). **Inline flush** at its edge
  (`BORDER_FACING` map = the 1px separator toward Content; **no scrim, no elevation** — docked, EC-2), **content-fit**
  (`flexGrow/Shrink=0`; body axis = `panelAxis(edge)`, vertical L/R · horizontal T/B, EC-5), **two-row CONTAINED header**
  (⠿ grip aria-hidden + `$display` title + ✕ close · `Dock`/`Float` mode toggles + the 4-edge picker [lucide
  `PanelLeft/Right/Top/Bottom`, `aria-pressed`], `$8` gaps per §X). The **edge picker is LIVE** (`onSetEdge`→`setPanelEdge`,
  store from S1; BR-S3-11) — repositions the docked panel to any edge. **Float is DISABLED until S4** (overlay render = S4;
  shown-but-disabled keeps the dock⇄float control visible per EC-1 without a reachable float dead-end / dishonest
  disclosure — g2 S3 fold, a §XXVIII deviation from the live-Float plan). Composes `@vida/ui` `Button` + `lucide-react`;
  every value a DS token. `panelDomId(id)` = the `aria-controls` target. One consumer ⇒ stays here, NOT `@vida/ui`
  (ui-4 BR-1). Delivery: `docs/specs/foundation/fe-shell/delivery/` (+ `sessions/PLAN-s3-docked-panel.md`).
  **S4 added the FLOATING branch** (`FloatShellPanel`): when `placement.mode==='float'` the SAME chrome renders as an
  edge-anchored **modal drawer** — a scrim (`$colorSurfaceInverse` @ **0.5**, the Dialog scrim value; click→close) + a
  `role="dialog" aria-modal="true"` panel (NOT the `<nav>`/`<aside>` landmark — that's docked; B4) anchored per
  `EDGE_ANCHOR` within the below-strip float layer, Level-3 elevation (the injected `.vida-shell-panel` `shadow.overlay`;
  dark self-cancels → the 1px border carries it). **Dismiss** = Esc / click-scrim / re-toggle → `onClose`; **focus** moves
  IN on open (first focusable) and RETURNS to the bar toggle on dismiss (app-shell's `onClose`, reliable for every open
  path incl. the in-panel Dock→Float switch — capturing `document.activeElement` would grab `<body>` there, g2 #1). The
  Tab **trap** mirrors Dialog's algorithm. Motion = the fail-safe-visible injected keyframes (reduced-motion `@media`).
  Float is now ENABLED (S3's `disabled` removed).
- `shell-panel-styles.ts` (fe-shell #14, S4) — `ensureShellPanelStyles()`: the injected `<style>` (mirrors `@vida/ui`
  `internal/dialog-styles.ts`) for the float scrim-in + per-edge panel slide-in `@keyframes` + the `.vida-shell-panel`
  `box-shadow:shadow.overlay`. **Visible resting base** (scrim 0.5 / panel opacity 1, transform none) so a missed
  animation FAILS SAFE VISIBLE (a modal must never render invisible); reduced-motion `@media`→`animation:none`. B12:
  opacity/transform only.
- `module-dock.tsx` (S2) — the dock content: `MODULE_MAP` grouped, drawer/rail/sidebar forms, empty-group skip,
  collapse toggle. _(`global-bar.tsx` was DELETED at fe-shell-scope #15 S3 — superseded by `global-bar-1.tsx` +
  `global-surfaces-{strip,list}.tsx`.)_
- `global-bar-1.tsx` (fe-shell-scope #15, S3) — **Bar 1 assembly.** `variant="strip"` = the top-strip chrome (bar1Slot):
  scope (left, `compact` ≤375) · spacer · surfaces strip (mode resolved from the breakpoint). `variant="panel"` = the
  System-panel body (systemPanelSlot): scope above the labeled surfaces list. Composition only (ui-4 BR-1); mounted in
  `routes.tsx` `RootComponent`. app-shell gained a `systemPanelSlot?` seam (the `system` panel body renders it, both docked
  + float; `modules` keeps the placeholder) + the **System/Modules toggles condense to icon-only at ≤375** (`PANEL_ICON`,
  label → aria-label) so Bar 1 co-fits the strip (S3 Visual-Gate-caught). EC-5. Visual Gate PASS (real shell: both homes
  × 3 presets × 2 modes = 0 AA fails incl. warm-dark · float dialog · 375 no-overflow · dark portal menu · axe 0).
- `nav-link.tsx` (S2) — a `createLink`-styled SPA anchor (one `ShellRoute` widening + `shellNavigate`; exact
  `aria-current`; `currentColor` icon tint). **Active colour = `$colorBrandEmphasis`** (not brandPrimary — brand-as-text
  on the active `$colorSurfaceSecondary` fill fell to 4.39/4.44 < 4.5 AA; fe-shell-scope #15 S2 Visual-Gate fix, benefits
  the module-dock active item too). `nav-icons.ts` — key→`lucide-react` glyph (+ fallback).
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
  orthogonal to the nav data. `module-dock.tsx` / `global-surfaces-{strip,list}.tsx` are the renderers.
- **No barrel** (`index.ts`) — import specific files (STANDARDS §XX).
- **Mobile-first.** Every rule is base→up; `mobile` is the baseline, larger widths enhance; `wide` is a max-width cap.
