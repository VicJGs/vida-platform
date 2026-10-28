# Spec: feature:ui-4-app-shell-components / S1 — Shell scaffold

Status: implemented
Source-repo: apps/web/src/shell, apps/web/src/App.tsx, packages/ui/src/tamagui.config.ts
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X]. Inherits the umbrella §2 BR-1..7.
Sessions: 2026-08-16-ui-4-app-shell-components

> Unit S1 of UI-4 (umbrella `_index.md` §5). The scaffold: the 5-region frame every other unit mounts into,
> the provider mounts, the `media` config wiring, and the shell UI store extension. Renders placeholder region
> content only — S2 (nav), S3 (command-bar), S4 (onboarding) fill the slots. First unit → the head.

## 1. Identity

A React component `AppShell` (`apps/web/src/shell/app-shell.tsx`) that renders the **five persistent regions**
(`moduleDock · globalBar · spacesBar · content · overlayHost`) in the documented responsive layout, plus the
root provider mounts and the reactive-breakpoint wiring.

- [FACT: regions.ts:7-114] the region set, reflow states, visibility, and layering it renders.
- [FACT: shell-layout.md:28-39,149-151] the region contract + the three UI-4 seams (media config, store extend, render).

**What it is NOT** — [INTERP] not the dock/global-bar CONTENT (S2), not the command-bar overlay (S3), not the
onboarding screens (S4), not route wiring (S5). S1 renders each region as a labeled placeholder slot proving the
FRAME reflows correctly; the slots are filled by later units. No new `@vida/ui` component (BR-1).

## 2. Business Rules (S1 refinements of the umbrella BR-1..7)

- **S1-BR-a** [FACT: regions.ts:44-50] region presence follows `REGION_VISIBILITY` — `spacesBar` hidden on mobile;
  all others present at every breakpoint. Read via `isRegionVisibleAt(region, bp)`, never hard-coded.
- **S1-BR-b** [FACT: regions.ts:16-38] the dock renders `DOCK_STATE[bp]` (drawer/rail/sidebar), the overlay host
  `OVERLAY_MODE[bp]` (sheet/centered), the global bar `GLOBAL_BAR_MODE[bp]` — the placeholder content adapts its
  container to the state so the reflow is Visual-Gate-observable.
- **S1-BR-c** [FACT: shell-layout.md:127] the active breakpoint is read reactively via Tamagui `useMedia()` — NOT
  stored in Zustand. Requires the `media` config (S1-BR-d) to exist first. `useMedia()` typing flows AUTOMATICALLY
  from `config.media` via the existing `tamagui.d.ts` `interface TamaguiCustomConfig extends VidaConfig`
  augmentation (tamagui.d.ts:4-7; `VidaConfig = typeof config`) — **no `.d.ts` edit needed** (gate-1 finding 3).
- **S1-BR-d** [FACT: shell-layout.md:149 + @tamagui/web@2.6.2 API] add a **plain `media` object** to `createTamagui`
  in `packages/ui/src/tamagui.config.ts`: `createTamagui({ …, media: { tablet:{minWidth:768},
desktop:{minWidth:1440}, wide:{minWidth:1920} } })`. **NOT `createMedia(...)`** — that was a Tamagui **v1** helper,
  removed in v2 (the installed core exports only `createMediaStyle`; `CreateTamaguiProps.media` is a plain
  `Record<MediaQueryKey, MediaQueryObject>`). `breakpoints.ts:62-67` already flags itself "NOT a `createMedia`
  call"; shell-layout.md:149's "createMedia" is intent-language, not an API (gate-1 finding 1). **SSOT direction:**
  once live, `config.media` (packages/ui) is the RUNTIME source of truth; `TAMAGUI_MEDIA` (apps/web breakpoints.ts)
  becomes the parity GUARD, not the source. Because `packages/ui` cannot import `apps/web` (BR-1 one-way boundary),
  the values are authored in `tamagui.config.ts` (mirroring `TAMAGUI_MEDIA`, source-of-truth comment) → a **parity
  test in `apps/web`** (imports `config` from `@vida/ui` [index.ts:16] + `TAMAGUI_MEDIA` from the shell) asserts
  `config.media` deep-equals `TAMAGUI_MEDIA` so the mirror can never silently drift. (Per-provider `media` injection
  is impossible — `createTamagui` bakes media at construction — so author-in-config is the idiomatic answer.)
- **S1-BR-e** [FACT: shell-layout.md:120 + stores/app-shell-ui-store.ts] extend `app-shell-ui-store` with
  `isMobileNavOpen: boolean` + `setMobileNavOpen(open)`/`toggleMobileNav()`, completing `ShellUIStateContract`.
  Ephemeral UI state only, never persisted.
- **S1-BR-f** [FACT: provider.tsx:1-27 + toast.tsx:233,247] mount `<UIProvider theme='light'>` at the app root and
  `<ToastProvider>` once inside it (the overlay/toast host). Theme STATE (light/dark toggle) is a later concern —
  no theme store exists in M1.0 (command-bar registry.ts:3 confirms "no theme toggle, no store yet"); the app
  runtime is `light`-only. **Dark is reachable ONLY via the Visual-Gate harness** passing `theme='dark'` to a
  wrapping `UIProvider` (gate-1 finding 5) — "both themes" (§4) is a harness obligation, not an app-runtime toggle.
- **S1-BR-g** [FACT: shell-layout.md:92-105 + tokens.ts:9] region z-order from `LAYERING`: sticky bars `$sticky`(1100),
  overlay host `$overlay`(1200), modal host `$modal`(1300); content `$base`. No invented z.
- **S1-BR-h** [FACT: regions.ts:44-50] a region with `isRegionVisibleAt(region, bp) === false` is **NOT rendered**
  (unmounted from the DOM, not `display:none`) — matches `REGION_VISIBILITY` semantics (`spacesBar` absent at
  mobile). S1's empty `overlayHost` is an **unlabeled** `<div data-region="overlayHost">` carrying NO landmark role
  until S3 populates it (an empty landmark would announce falsely) (gate-1 finding 7).

## 3. Contract

- **`AppShell`** (`apps/web/src/shell/app-shell.tsx`): `interface AppShellProps { children?: ReactNode; __bp?:
Breakpoint }` — `children` renders into the `content` region (the router `<Outlet/>` is passed here — see the
  mount rule below). Internally resolves the active breakpoint from `useMedia()` (or `__bp` when provided — the
  test/story override, gate-1 finding 6, so jsdom tests can assert region present/absent per breakpoint without a
  `matchMedia` polyfill), then resolves each region via `regions.ts` predicates and renders a Tamagui flex frame
  (dock aside + main column {globalBar, spacesBar, content}, overlayHost portal-adjacent). Each region is a
  placeholder (`data-region` + visible label) whose CONTAINER adapts to `DOCK_STATE`/`OVERLAY_MODE`/`GLOBAL_BAR_MODE`
  (S1-BR-b) so the reflow is Visual-Gate-observable from the frame alone.
- **AppShell MOUNT RULE** [FACT: routes.tsx:21-36] — `<AppShell>` is mounted in `routes.tsx` `RootComponent`, which
  returns `<AppShell><Outlet/></AppShell>` (replacing the throwaway `<nav>…<Outlet/>` placeholder). `<Outlet/>` is
  only legal INSIDE a route component, so the chrome MUST wrap it there — NOT above `<RouterProvider>` (that would
  orphan the Outlet + collide with `RootComponent` as a second layout owner). The PROVIDERS (`UIProvider`,
  `ToastProvider`) go in `App.tsx` around `<RouterProvider>` (context needs no Outlet) (gate-1 finding 2).
- **`tamagui.config.ts`**: add a plain `media` object to `createTamagui` (S1-BR-d); export it (or `config.media`
  is read) for the parity test.
- **`app-shell-ui-store.ts`**: extended shape per S1-BR-e (additive; `isSidebarOpen`/`toggleSidebar` unchanged).
- a11y [FACT: shell-layout.md + §XIV]: rendered regions use landmark roles — dock `<nav aria-label="Modules">`,
  global bar `<header>` (banner), content `<main>`; `spacesBar` when present is a labeled `<nav>`/complementary;
  `overlayHost` is unlabeled until S3 (S1-BR-h). Focus contract is exercised by the interactive units (S2–S4);
  S1's placeholders are static.

## 4. Acceptance (S1 DoD — includes the component Visual Gate)

- [ ] `AppShell` renders all 5 regions; `spacesBar` **unmounted** at 375 (not `display:none`), present at 768+ (S1-BR-a,h)
- [ ] Reflow observable at 375/768/1440/1920: dock drawer→rail→sidebar; overlay host sheet→centered; global bar
      condensed→full (S1-BR-b) — **verified in a real browser (Visual Gate)**
- [ ] `config.media` wired as a plain object; `useMedia()` drives the reflow; **parity test** green
      (`config.media` deep-equals `TAMAGUI_MEDIA`) (S1-BR-c,d)
- [ ] `app-shell-ui-store` has `isMobileNavOpen` + setters; existing sidebar state untouched (S1-BR-e)
- [ ] `UIProvider` + `ToastProvider` mounted at root (App.tsx); `AppShell` mounted in `RootComponent` wrapping
      `<Outlet/>` (S1-BR-f + mount rule)
- [ ] Visual Gate = running app (`pnpm dev`) captured at 375/768/1440 (render-table:45); **both themes** via a
      temporary root `theme='dark'` flip; theme crosses into region surfaces (S1-BR-f, FOLD-1)
- [ ] Landmark roles present (nav/header/main); `overlayHost` unlabeled; z-order per `LAYERING` (S1-BR-g,h, §XIV)
- [ ] No hex, no invented spacing/z (all DS tokens); `@vida/web` + `@vida/ui` typecheck · tests · lint green;
      `packages/ui` boundary intact (no `apps/web` import); dist barrel imports clean (first runtime consumer)

## 5. Implementation Prompt (ordered; each step cites §2/§3)

1. `packages/ui/src/tamagui.config.ts` — add a plain `media: { tablet:{minWidth:768}, desktop:{minWidth:1440},
wide:{minWidth:1920} }` object to the `createTamagui({ … })` call (NOT `createMedia` — S1-BR-d); ensure it's
   readable for the parity test (export or via `config.media`). Source-of-truth comment → mirrors
   `apps/web/src/shell/breakpoints.ts` `TAMAGUI_MEDIA`. **No `tamagui.d.ts` edit** — `useMedia()` typing flows from
   `TamaguiCustomConfig extends VidaConfig` (S1-BR-c). Satisfies S1-BR-d.
2. `apps/web/src/shell/media-parity.test.ts` — assert `config.media` (from `@vida/ui`) deep-equals `TAMAGUI_MEDIA`
   (from the shell) (drift guard, S1-BR-d).
3. `apps/web/src/stores/app-shell-ui-store.ts` — add `isMobileNavOpen:false` + `setMobileNavOpen`/`toggleMobileNav`;
   completes `ShellUIStateContract` (S1-BR-e). +test.
4. `apps/web/src/shell/app-shell.tsx` — the `AppShell` frame: resolve active bp from `useMedia()` (or the `__bp`
   test override) → render 5 regions via `isRegionVisibleAt` (unmounting invisible ones) + `DOCK_STATE`/
   `OVERLAY_MODE`/`GLOBAL_BAR_MODE` (container adapts), landmark roles (overlayHost unlabeled), `LAYERING` z, DS
   tokens only. Placeholder labeled slots. Satisfies §3, S1-BR-a,b,g,h. +test (jsdom via `__bp`: regions
   present/absent per breakpoint; roles present; overlayHost unlabeled).
5. `apps/web/src/App.tsx` — wrap the `dbReady` branch's `<QueryClientProvider>` tree in `<UIProvider theme='light'>
<ToastProvider>…</ToastProvider></UIProvider>` (providers only — they need no Outlet). **Do NOT mount AppShell
   here** (S1-BR-f + mount rule).
6. `apps/web/src/routes.tsx` — change `RootComponent` to return `<AppShell><Outlet/></AppShell>` (replacing the
   placeholder `<nav>…<Outlet/>`), so the chrome wraps the routed content from inside the router (gate-1 finding 2).
7. **Visual Gate = the RUNNING APP** (`frontend-visual-gate.md:45` render table — app-shell/layout gates via
   `pnpm dev` + capture at 375/768/1440, NOT Storybook; `apps/web` has no Storybook — preflight FOLD-1). After
   steps 5–6 the shell renders at `/` in the real app; capture the 3 breakpoints. **Both themes:** the app is
   light-only (no theme store, M1.0); reach dark for the Gate via a temporary root `<UIProvider theme='dark'>`
   flip during the capture (the primitives' dark is already proven by UI-1/UI-2 — this checks the shell's OWN
   surfaces cross the theme) (S1-BR-f).
8. Done-check → §4. Run `@vida/web` + `@vida/ui` typecheck/test/lint + build (+ verify the `@vida/ui` dist barrel
   imports clean — S1 is the first runtime consumer); then the Visual Gate (step 7). NB: the `AppShell` jsdom test
   (step 4) needs the `// @vitest-environment jsdom` docblock — `apps/web` vite test env defaults to `node`
   (preflight FOLD-2).

## 6. Open UNKNOWNs / Decisions Needed

- None. The packages/ui↔apps/web media duplication is resolved by S1-BR-d (author-in-config + parity-test,
  `config.media` = runtime SSOT); the AppShell mount point is resolved by the mount rule (§3); the jsdom media
  test seam by `__bp` (§3). All gate-1 findings folded in (Rev 2).

## 7. Change Log

| Date       | Session                              | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components | S1 detailed spec authored (scaffold: frame + media + store + providers)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components | **Rev 2 — gate-1 critique folded** (7 findings): F1 `createMedia`→plain `media` object (v1 API removed in v2); F2 AppShell mounts in `routes.tsx` `RootComponent` wrapping `<Outlet/>`, NOT above `RouterProvider`; F3 drop `tamagui.d.ts` edit (typing auto-flows); F4 `config.media`=SSOT, `TAMAGUI_MEDIA`=guard; F5 dark via harness only; F6 `__bp` test seam; F7 unmount invisible regions + overlayHost unlabeled                                                                                                                                                                                                                                                                                       |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components | **Rev 3 — preflight PASSED (2 folds) + gate-2**: FOLD-1 Visual Gate = running app (`pnpm dev` @ 375/768/1440, render-table:45) not Storybook (`apps/web` has none); FOLD-2 AppShell jsdom test needs `// @vitest-environment jsdom`. gate-2 scrubbed 2 residual `createMedia` mentions (intro + Identity). Spec coherent → Approval 2.                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components | **IMPLEMENTED + Visual Gate SHIP.** apps/web became the first `@vida/ui` consumer (+`@vida/ui`/`@tamagui/core@2.6.2` deps). Landmarks via `styled(View,{render:'nav'})` (runtime `tag` not honoured). **The Visual Gate (real Brave) caught 2 bugs jsdom couldn't:** (1) `process is not defined` — untamed-Tamagui runtime `process.env.*` → blank page → the UI-1-U0 `index.html` shim; (2) shell didn't fill the viewport (`minHeight:100%` collapsed) → `index.css` reset + `minHeight:100vh`. Barrel-eval sigma WebGL crash → `setupFiles` stub (the @vida/editor precedent). Green: web typecheck + 96 tests + lint 0 + build · ui 317. Reflow + theme-crossing confirmed at 375/768/1440 × light/dark. |
