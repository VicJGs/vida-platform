# UI-4 App Shell — Step 0 Document-Context Baseline
Status: baseline (ground truth for the PLAN's gates — §XXVI.1a)
Session: 2026-08-16-ui-4-app-shell-components
No-Guessing: every claim is a [FACT: file:line] gathered this session, or a [RESOLVED] decision with its citation.

> Purpose: establish what is already built (the four UX models + `@vida/ui` surface + the app entry), what
> seams UI-4 must wire, and resolve the three scoping UNKNOWNs from the task — so the forward spec (PLAN step)
> rests on evidence. Gathered by three parallel Explore sweeps of `apps/web/src`, `packages/ui`, and
> `docs/core/architecture/*`.

## 1. What is already built (design-against, do NOT rebuild)

### 1.1 The app entry today — `apps/web/src`
- [FACT: App.tsx:11-58] `App` is a **DB-readiness gate**: `ensureDbReady()` → loading / error+retry / on ready
  renders `<QueryClientProvider><RouterProvider router={router}/>`. Comment (App.tsx:1-2) states it is NOT the
  UI-4 chrome yet.
- [FACT: routes.tsx:21-65] central code-based TanStack Router (ADR-001). `RootComponent` (26-35) is a **minimal
  placeholder nav + `<Outlet/>`** (Home | Notes). Only two routes exist: `/` (`<h2>Vida</h2>`) and `/notes`
  (lazy). `defaultPreload:'intent'`; per-route `lazyRouteComponent` code-splitting (BR-RT-8).
- [FACT] AR-4 runtime is in place: `stores/app-shell-ui-store.ts` (`isSidebarOpen` + `toggleSidebar/setSidebarOpen`),
  `stores/command-bar-ui-store.ts`, `lib/query-client.ts` (staleTime 30s), `lib/forms.ts` (`useZodForm`),
  `hooks/useSchemaVersion.ts` (reference RQ hook), `db/*` (`WorkerDbClient` RPC + `ensureDbReady` boot gate;
  `exec/values/batch` throw — deferred seam).

### 1.2 The four UX design models (typed artifacts + docs — all shipped)
- **UX-3 shell layout** — [FACT: shell/breakpoints.ts:8-67] `BREAKPOINTS` {mobile 0 / tablet 768 / desktop 1440 /
  wide 1920}, `PRIMARY_TEST_WIDTHS=[375,768,1440]`, `CONTENT_MAX_WIDTH=1280`, `SIDE_PADDING`, `TOUCH_TARGET`
  {44/8}, `PADDING_SCALE`, `breakpointForWidth()`, and the **`TAMAGUI_MEDIA` seam** (plain data, NOT a
  `createMedia` call). [FACT: shell/regions.ts:7-114] `SHELL_REGIONS` = {moduleDock, globalBar, spacesBar,
  content, overlayHost}; `DOCK_STATE` (drawer/rail/sidebar per bp), `OVERLAY_MODE` (sheet/centered),
  `GLOBAL_BAR_MODE`, `REGION_VISIBILITY` (spacesBar hidden on mobile), `LAYERING` (sticky/overlay/modal z +
  radius), `ShellUIStateContract {isSidebarOpen, isMobileNavOpen}` (UI-4 extends the store), predicates
  `dockStateAt/overlayModeAt/isRegionVisibleAt/contentGutterAt`. Data only, no chrome, no barrel.
- **UX-2 command bar** — [FACT: command-bar/*] headless model: `types.ts` (`Command{id,label,category,run(ctx)}`,
  `CommandRunContext{navigate}` — **router injected by UI-4**, `SearchProvider`, `SearchStatus` 7-state union
  incl. `search-unavailable`, `resolveKeybind`), `registry.ts` (`createCommandRegistry` + `navProvider` +
  `shellActionsProvider` seeding only "Toggle sidebar"), `nav-commands.ts` (`deriveNavCommands` from MODULE_MAP,
  dedupe by route), `frecency.ts` (`rankByFrecency` pure, pinned-first), `search-provider.ts`
  (`stubSearchProvider → search-unavailable`), `stores/command-bar-ui-store.ts` (`isOpen/query/mode`,
  auto-switch). **No rendered component.**
- **UX-5 onboarding** — [FACT: onboarding/steps.ts:1-51] `ONBOARDING_STEPS` = welcome·privacy·vault·ready, each
  with `OnboardingCopyContract {m1, m3?}` (BR-4 copy honesty: `m1` local-first only, vault step is
  **confirmation** not "create"; `deferredImpl:'vault-key'`). [FACT: onboarding/first-run.ts:1-37]
  `FIRST_RUN_COMPLETE_KEY='first_run:completed'`, `isFirstRun()`, `FIRST_RUN_BRANCH` (App.tsx, dbReady branch,
  before `<RouterProvider>`). **No rendered screen; App.tsx branch unwired.**
- **UX-1 nav model** — [FACT: nav/module-map.ts:35-121] `ModuleNavEntry` (key/label/group/placement/visibleWhen/
  routePath/homeOwner/…), `MODULE_MAP` (26 entries, 6 groups; `routePath` UX-facing, MAY differ from key, MAY be
  null), `GLOBAL_SURFACES` (Home / Calendar / Search(⌘K, no route) / Notifications / Settings / Graph),
  `NAV_AXES` (moduleDock + spacesBar `seam:true, livesFrom:'M1.1'`).
- **UX-4 state conventions** — [FACT: state-conventions/*] `deriveTerminalState<T>` (isPending→isError→data
  precedence), re-exports `@vida/core` `TerminalState` canon, `FOCUS_CONTRACT` (overlayOpen→first-focusable,
  overlayClose→trigger, pageNav→main-heading, toastAppear→none), `OVERLAY_DISMISS {escape:true}`.

### 1.3 `@vida/ui` v0.2.0 — what UI-4 composes with
- [FACT: packages/ui/src/index.ts:1-49] barrel exports: `UIProvider`/`useVidaTheme`/`ThemeName`, `config`,
  tokens (`tokens`, `light`/`dark` + 10 `light_/dark_<Comp>` sub-themes, `fonts`, `motion`, `shadow`),
  **10 UI-1 primitives** (Button·Input·Checkbox·Select·Card·Tabs·Menu·Dialog·Popover·`toast`/`ToastProvider`),
  **7 UI-2 views** (ListView·GalleryView·Timeline·CalendarView·PomodoroWidget·ExportDialog·NeuralGraph),
  `useReducedMotion`.
- [FACT] Portalled/floating: Select, Menu (both zIndex.dropdown), Dialog (modal, focus-trap, zIndex.modal),
  Popover (non-modal, zIndex.overlay), Toast (imperative store, zIndex.toast). Toast API: `toast(opts)→id` +
  `toast.dismiss(id)` callable outside React; `ToastProvider` mounts once near root.
- [FACT: tokens.ts:4-10] zIndex scale: base 0 · dropdown 1000 · sticky 1100 · overlay 1200 · modal 1300 ·
  toast 1400 — matches UX-3 `LAYERING`. Space (4-grid 0–128), size, radius (sm4/md8/lg12/xl16/full), motion
  (instant/fast/moderate/slow + easings), shadow (resting/raised/overlay).
- [FACT: provider.tsx:1-27] `UIProvider theme={theme}` wraps `TamaguiProvider config={config}`; app owns theme
  STATE (Zustand) and passes the resolved `theme` prop. No `@tamagui/next-theme`.
- [FACT] **NeuralGraph** is the sole heavy-WebGL view (sigma + graphology + forceatlas2) — must be lazy-loaded.
- [FACT: agent-2 §6] **`@vida/ui` ships NO shell/sidebar/navbar/header/layout chrome.** Purely primitives +
  views. All chrome is UI-4's to build in `apps/web/src`.

## 2. The seams UI-4 must wire (from the models, all confirmed unbuilt)
| Seam | Current state | UI-4 wiring | Cite |
|------|---------------|-------------|------|
| **D5 · `media` config** | `TAMAGUI_MEDIA` is plain data in `breakpoints.ts` | add a plain `media` object to `createTamagui` in `@vida/ui` `tamagui.config.ts` (NOT `createMedia` — v1 helper, gone in v2; the ONLY `packages/ui` edit) | shell-layout.md:149-151 |
| **Router inject** | `CommandRunContext.navigate` uninjected | wire real `navigate` from the router into the registry | command-bar types.ts:6-8 |
| **App.tsx first-run branch** | described as data (`FIRST_RUN_BRANCH`), unwired | branch on `isFirstRun(app_state[key])` before `<RouterProvider>`; write `='1'` on complete via `Repository`/`run` | onboarding.md:62-63,102 |
| **Search provider** | `stubSearchProvider → search-unavailable` | render the `search-unavailable` terminal state (loud, not blank); real provider = DB-8/M1.4 | command-bar-and-search.md:80 |
| **`app-shell-ui-store` extend** | `isSidebarOpen` only | add `isMobileNavOpen` per `ShellUIStateContract` | shell-layout.md:120 |
| **Breakpoint read** | — | `useMedia()` reactive (NOT stored) after `createMedia` wiring | shell-layout.md:127 |

## 3. The three UNKNOWNs — RESOLVED from the docs (no guessing)
1. **Build in `packages/ui` vs compose in `apps/web/src`?** → [RESOLVED: compose in `apps/web/src`]. `@vida/ui`
   ships no chrome (agent-2 §6); every design doc says "rendering owned by UI-4" with home `apps/web/src`
   (shell-layout.md:11, IA.md:10,152, command-bar.md:78, onboarding.md:102). Rule-of-three is **unmet** — one
   consumer (the web shell; desktop shares the web codebase; mobile is M4). **The only `packages/ui` edit is the
   D5 `createMedia` wiring** (a config seam UX-3 reserved, not a new component).
2. **Onboarding — render full screens now vs stub + seam?** → [RESOLVED: render the four screens now].
   onboarding.md:102 verbatim: "UI-4 renders the four onboarding screens, wires the App.tsx first-run branch,
   and performs the completion write." The **crypto** is the deferred seam (vault step confirmation-only, BR-4),
   NOT the screens.
3. **Command bar — full launcher UI vs host + wiring?** → [RESOLVED: render the full launcher overlay].
   command-bar-and-search.md:78: "Rendered overlay / input / result list / trigger | UI-4 | M1.0." UI-4 renders
   input + command list + result list + trigger, injects the router, and the **search results surface renders
   the `search-unavailable` state** until DB-8 (the only guarded part — the state is shown, not absent).

## 4. Doc-determined behaviors (NOT decisions — the docs already resolve each)
These are not open forks; each is fixed by a cited source. Recorded so the spec cites them, not re-litigates them.
- **B-A · Nav to unbuilt routes → DETERMINED.** Render the full dock from `MODULE_MAP` (IA.md:152, the fixed
  content axis); unbuilt targets fall to the existing router `NotFoundComponent` (routes.tsx:21-24) under UX-4
  degrade-never-crash (state-conventions.md). No mark-unbuilt variant to choose — the graceful not-found IS the
  documented behavior; the visual render is governed by the design docs + Visual Gate, not a spec decision.
- **B-B · Build shape → DERIVED from the documented surfaces.** UI-4's units fall out of the doc-enumerated
  surfaces (5 regions · command-bar · onboarding) built under the repo's established per-unit discipline
  (UI-1 U0–U10 / UI-2 V1–V7 / UI-3 E1–E8, each its own §XXVI gate + PR). The decomposition is a mechanical
  consequence of the structure, authored into the umbrella spec §5 — not a granularity choice to escalate.
- **B-C · Graph route lazy-load → FACT.** NeuralGraph = heavy WebGL (sigma/graphology). The `/graph` route is
  `lazyRouteComponent`-split (routes.tsx already uses that pattern; the app note across handoffs mandates it).

## 5. Gate class
- **FULL §XXVI double-gate** (rendered feature) **+ the component Visual Gate** — UI-4 RENDERS chrome (unlike
  UX-3/4/5 which were design models with no rendered component and no Visual Gate). Confirm against the
  `frontend-visual-gate.md` render table at the PLAN; the UI-1/UI-2 precedent (both carried the Visual Gate)
  strongly indicates UI-4 does too. Per sub-unit if the build is split (D-B).
- Boundary: M1.0 (auth OFF, ADR-017:22) — no vault/crypto UI; every crypto element is a deferred seam
  (AR-3/UX-5b/M3). No default-open action concern (single-user local; no server surface).
