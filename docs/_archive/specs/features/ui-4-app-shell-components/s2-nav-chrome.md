# Spec: feature:ui-4-app-shell-components / S2 — Nav chrome

Status: implemented <!-- draft → approved → implemented -->
Source-repo: apps/web/src/shell (chrome), apps/web/src/nav (data, read-only)
No-Guessing: every claim is [FACT: source] / [INTERP: from fact] / [UNKNOWN: needs X]. Inherits the umbrella §2 BR-1..7.
Sessions: 2026-08-16-ui-4-app-shell-components-3

> Unit S2 of UI-4 (umbrella `_index.md` §5). The **nav chrome**: the module dock + the global bar + the reserved
> Spaces-bar seam — the content the S1 frame reserved as labeled placeholder slots. Renders `MODULE_MAP` /
> `GLOBAL_SURFACES` into S1's landmark containers; the frame's geometry/reflow stays S1's. Off clean `main`, own PR.

## 1. Identity

The **navigation chrome** rendered inside the S1 shell frame's three nav regions:

- **Module dock** — `MODULE_MAP` `placement:'dock'` entries, **grouped** by `ModuleGroup`, in three responsive
  forms (off-canvas **drawer** / icon **rail** / full **sidebar**) the S1 frame already positions.
- **Global bar** — the six `GLOBAL_SURFACES` (Home · Calendar · ⌘K Search · Notifications · Settings · Graph) in
  two modes (**condensed** mobile / **full** tablet+).
- **Spaces bar** — the reserved cross-cutting seam (present tablet+, **empty in M1.0**); S2 renders it as a properly
  labeled but content-free reserved region — its content lands with the Spaces module (M1.1).

[FACT: _index.md:79] S2 scope = "module dock + global bar + Spaces-bar seam; responsive drawer→rail→sidebar; renders
`MODULE_MAP`/`GLOBAL_SURFACES`". [FACT: information-architecture.md:65-76,96-107] the dock grouping + the six global
surfaces + placement classes. [FACT: shell-layout.md:64-70] the per-region reflow S2's content adapts to.

**What it renders/wires** (existing artifacts, referenced not redefined):

- [FACT: nav/module-map.ts:66-121] `MODULE_MAP` — **15 `placement:'dock'` entries of 23 total** (the dock renders the
  15; the rest are global/secondary/non-nav/spaces-only) + `GLOBAL_SURFACES` (6) — the DATA; S2 is its first renderer.
- [FACT: shell/regions.ts:16-38,79-91] `dockStateAt`/`GLOBAL_BAR_MODE`/`isRegionVisibleAt` — the reflow predicates.
- [FACT: stores/app-shell-ui-store.ts:12-29] `isSidebarOpen`/`isMobileNavOpen` + setters — the dock's UI state.
- [FACT: stores/command-bar-ui-store.ts:13-25] `open()` — the ⌘K trigger's target (S3 renders the overlay).
- [FACT: state-conventions/keyboard.ts:21-43] `FOCUS_CONTRACT` + `OVERLAY_DISMISS` — the drawer's focus/Esc contract.
- [FACT: @vida/ui index.ts:24-33] compose UI-1 `Button`/`Menu` for actions + overflow; no new `@vida/ui` component (BR-1).

**What it is NOT** — [INTERP] not the command-bar overlay (S3 — S2 only renders the trigger + wires `open()`) · not
onboarding (S4) · not route registration (per-module routes land M1.1+; S2 nav TARGETS them, degrading via
`NotFoundComponent`) · not the Spaces-bar CONTENT (Spaces, M1.1) · not a new `@vida/ui` primitive (rule-of-three
unmet — one consumer) · not per-user nav persistence (`nav_preferences` is a consume-shape seam, M1.1 — IA.md:46-47).

## 2. Business Rules (S2 refinements of the umbrella BR-1..7)

- **S2-BR-a · Render the data, don't restate it.** [FACT: module-map.ts:66-121] the dock renders exactly the
  `placement:'dock'` entries; the global bar renders exactly `GLOBAL_SURFACES`. Grouping/order come from
  `ModuleGroup` in `MODULE_MAP` declaration order (the six groups, declared top-to-bottom = dock order). S2 adds no
  module, reorders nothing, hard-codes no label/route — every string flows from the data (IA.md:65-76).
- **S2-BR-a2 · No empty group headings (fold of B2).** [FACT: module-map.ts — after the fail-closed filter (S2-BR-b),
  `platform-services` has ZERO visible dock items in M1.0 (`gamification` is its only dock entry and it is hidden);
  `integration` has 1 (Notes; Journals is `placement:'global'`)] a group whose entry list is empty **after** the
  `visibleWhen`/placement filter is **NOT rendered** — no `<h2>`, no `role=group` container. A heading over an empty
  group is a false affordance + an axe finding. (This is why the filter must run before the group is emitted, not per-item.)
- **S2-BR-b · Conditional-dock is closed by default.** [FACT: module-map.ts:43,102 + IA.md:112-113] an entry with
  `visibleWhen` shows only when that flag is ON. M1.0 has **no feature-flag system** → `visibleWhen` entries
  (`gamification`) are **hidden** (fail-closed; a missing flag is treated OFF, never shown). No default-open surface
  (BR-6 security). The flag read is a single `isFeatureEnabled(flag)` seam returning `false` in M1.0 (documented stub).
- **S2-BR-c · Three dock forms, data-driven.** [FACT: regions.ts:16-22,79-81 + shell-layout.md:66] the dock content
  adapts to `dockStateAt(bp)`: **drawer** (mobile, off-canvas, icon+label list, opened by `isMobileNavOpen`) →
  **rail** (tablet, icon-only 64px, label is the `aria-label`/tooltip) → **sidebar** (desktop+, icon+label 240px,
  `isSidebarOpen` toggles expanded↔collapsed-to-rail). Never a hard-coded width; the frame owns geometry (S1), S2
  owns the inner content per form.
- **S2-BR-d · Nav is a landmark of links, not a composite widget.** [FACT: §XIV WAI-ARIA landmarks] the dock is a
  `<nav aria-label="Modules">` containing grouped lists of **links** — each dock/global item is individually
  Tab-focusable (NOT a roving-tabindex menu; a navigation landmark of links needs no arrow-key model). Each group is a
  `role=group` container labeled by its `ModuleGroup` name: in sidebar/drawer forms via a visible `<h2>` heading; **in
  the icon-only rail form there is NO visible heading — the group carries an `aria-label` instead** (preflight FOLD-2)
  so grouping is still announced without text. The current route's item carries `aria-current="page"` (**exact
  pathname match**, so `/` doesn't light up everything — preflight FOLD-3) + an active visual state; the focus ring is
  always visible on `:focus-visible` (§VIII, `--color-focus-ring`).
- **S2-BR-e · Route targets tolerate unbuilt routes (degrade, never crash) — via `to`, never `href` (fold of B1/M3).**
  [FACT: routes.tsx:46-59 → only `/` + `/notes` registered; BR-4] dock/global items navigate **SPA-style** to their
  `routePath`. **Mechanism, stated precisely:**
  - Rendering a link uses TanStack `<Link to={…}>` — a real `<a>` with SPA nav + preload + active props. `to` is
    typed to registered paths only, so an unregistered path needs a widening. Confine that widening to **one**
    boundary inside `NavLink`. **Concrete form (preflight FOLD-5):** NavLink's own `to` prop is typed `string`; at the
    `<Link>` boundary cast once — `<Link to={to as unknown as LinkProps['to']}>` — with a single inline `//` §XV
    justification. (Casting into the huge `LinkProps['to']` union at ONE call site is acceptable; do not scatter it,
    and do not weaken to `any`.) **NEVER use `href`** — TanStack treats `<Link href>` as an _external_ target → a full
    page reload, violating this rule's own "SPA, never full-reload". `href` is forbidden.
  - Runtime: on click the router matches `to` at click time; no matching route → the `NotFoundComponent`
    (routes.tsx:24) renders (never a blank/throw). This holds for `to` only.
  - **Imperative nav (the overflow Menu, M3):** UI-1 `MenuItem` has no link slot (menu.tsx has `onSelect` only), so
    overflow surfaces navigate via `onSelect: () => shellNavigate(path)` — a tiny `shellNavigate(path)` helper wrapping
    `router.navigate({ to: path as ShellRoute … })`, sharing the SAME `ShellRoute` widening as NavLink (one abstraction,
    two call sites — not scattered casts). `routePath: null` entries render no link (none in dock; the `command-palette`
    global surface is the Search action, S2-BR-g, not a link).
- **S2-BR-f · The mobile drawer is a focus-managed overlay — S2 adds OPEN, S1 shipped only CLOSED (fold of B3/M1).**
  [FACT: app-shell.tsx:71-100 renders the drawer `<DockNav>` unconditionally at `x={-DOCK_WIDTH.sidebar}` — the
  **static closed/slid-out** container only; it never reads `isMobileNavOpen`, and there is no open transform or scrim
  in S1] S2 adds: the **open transform** (`x:0` when `isMobileNavOpen`), the **scrim**, and the a11y behavior.
  - Focus (keyboard.ts:21-32): open → focus the first focusable inside (`FOCUS_CONTRACT.overlayOpen`); **Esc**
    (`OVERLAY_DISMISS.escape`) closes + returns focus to the hamburger trigger (`overlayClose`); scrim pointer-down closes.
  - **Closed-drawer tab-order (the real bug B3):** the drawer is translated off-screen, NOT unmounted/`display:none`,
    so its ~15 `NavLink`s stay Tab-focusable while closed. When closed, the drawer content must be removed from the tab
    order — `inert` (+ `aria-hidden`) on the drawer container, cleared on open. (jsdom-assertable.)
  - Motion (shell-layout.md:111-113): the slide animates **transform only** (DS-3 `moderate`),
    `prefers-reduced-motion`→instant (BR-5); the scrim sits at a z **below** the drawer, **above** content.
  - No `@vida/ui` Drawer primitive exists → composed in `apps/web` (BR-1), reusing the keyboard contracts (no new
    keybind — ⌘K is UX-2's/S3's). Effect deps gate on the open flag (the U7/U8 mount-gated-focus lesson).
- **S2-BR-g · ⌘K trigger owns the store flip; the overlay is S3's.** [FACT: command-bar-ui-store.ts:13-22] the global
  bar's Search action (full mode) + search icon (condensed mode) call `useCommandBarUIStore().open()`. S2 renders and
  wires the trigger to its owned action; S3 renders what `isOpen` shows. The global keydown listener for ⌘K is S3's
  (paired with the overlay) — S2 wires the click target only.
- **S2-BR-h · Icons: `lucide-react` (ADR-fixed), theme-tinted via `currentColor`.** [FACT: ADR-001:113,239-240 +
  system-overview.md:317 — the icon library is **`lucide-react` for web** / `lucide-react-native` for mobile] the rail
  form requires icons; the library is already decided by ADR-001 — S2 just adds the dep to `apps/web` (web target →
  `lucide-react`) and pins the concrete version at install. A `shell/nav-icons.ts` maps module `key`/surface `key` → a
  lucide component; an unmapped key degrades to a generic fallback icon.
  - **Color bridge (fold of M2):** a lucide icon renders `stroke="currentColor"`, resolved against the CSS `color` of
    its **nearest Tamagui ancestor carrying an explicit `color` token** — NOT ambient inheritance. Proven in-repo:
    `button.tsx:110` wraps its Spinner in a View with `color={TEXT_TOKEN[intent]}` so `currentColor` resolves. So
    **NavLink sets a DS text `color` token on its row**; the icon tints from it (BR-2, no hex) and crosses the theme.
- **S2-BR-i · Spaces bar reserved, honestly labeled.** [FACT: regions.ts:44-50 spacesBar visible tablet+ + IA.md:44-45]
  S2 renders the tablet+ Spaces bar as a labeled `<nav aria-label="Spaces">` that is **empty** in M1.0 (a reserved
  seam) — no fabricated content, no false affordance. Its content lands with Spaces (M1.1).
- **S2-BR-j · Tokens only.** [FACT: BR-2 + app-shell.tsx uses `$colorSurface*`/`$colorBorderDefault`/`$colorTextMuted`]
  every surface/text/border/gap/radius/z resolves to a DS token (the S1 set); touch targets ≥44×44 with ≥8px gaps at
  all widths (shell-layout.md:87); active/hover/focus are token-driven visual states (§VIII).

## 3. Contract

Existing UI-1 primitives + `MODULE_MAP`/`GLOBAL_SURFACES`/stores/keyboard contracts are REFERENCED, not redefined.
New chrome lives in `apps/web/src/shell/`; the pure-data `apps/web/src/nav/` layer is read-only (its CLAUDE.md forbids
chrome). app-shell.tsx keeps each region's landmark container + geometry (S1); S2 injects content.

- **`ModuleDock`** (`apps/web/src/shell/module-dock.tsx`) — `interface ModuleDockProps { dock: DockState; bp:
Breakpoint }`. Renders the grouped dock content for the active form: filter `placement:'dock'` by
  `isFeatureEnabled`, group by `ModuleGroup` order, **drop empty groups** (S2-BR-a2) → each surviving group is a
  labeled `role=group`/`<h2>` list of `NavLink`s. Rail form → icon-only, label to `aria-label`. Sidebar form →
  icon+label, honoring `isSidebarOpen` (collapsed→rail-like). Consumes `useAppShellUIStore` for `isSidebarOpen`.
  - **Collapse toggle (fold of M4 + preflight FOLD-1):** a `Button` in the dock header, shown **whenever
    `dock==='sidebar'`** (desktop+) in BOTH expanded and collapsed states — so a collapsed sidebar can always be
    expanded again. Accessible name "Collapse sidebar"/"Expand sidebar" (state-dependent), `aria-expanded={isSidebarOpen}`,
    `onPress: toggleSidebar` (app-shell-ui-store.ts:24). **Collapsed desktop = `dock==='sidebar'` + `isSidebarOpen=false`
    (icon-only render), DISTINCT from tablet `dock==='rail'`** — the toggle is absent only for `rail`/`drawer` (breakpoint
    forms), never for a collapsed desktop sidebar. +test (name + aria-expanded flip; present when collapsed).
- **`GlobalBar`** (`apps/web/src/shell/global-bar.tsx`) — `interface GlobalBarProps { mode: 'condensed' | 'full';
onOpenMobileNav: () => void }`. Full: the six `GLOBAL_SURFACES` — route surfaces as `NavLink`s + a Search `Button`
  wired to `commandBar.open()`. Condensed (mobile): a hamburger `Button` (`onOpenMobileNav` → `toggleMobileNav`), a
  search-icon `Button` (`open()`), and an **overflow** UI-1 `Menu` collecting the remaining surfaces (BR-1 compose).
  - **Overflow items are NOT links (fold of M3):** `MenuItem` (menu.tsx:35-46) has `onSelect` only, no link slot — so
    each overflow surface is `{ id, label, leading:<icon/>, onSelect: () => shellNavigate(routePath) }` (the S2-BR-e
    `shellNavigate` helper, the same `ShellRoute` widening — not a second cast site). `command-palette`
    (`routePath:null`) renders as the Search action (`open()`), never a link/menu-nav.
- **`NavLink`** (`apps/web/src/shell/nav-link.tsx`) — `interface NavLinkProps { to: string; label: string;
icon?: LucideIcon; iconOnly?: boolean; children?: ReactNode }`. Wraps TanStack `<Link>` with the single documented
  cast for unregistered targets (S2-BR-e); computes `aria-current="page"` from `useRouterState` location; renders
  the icon (currentColor) + label (or `aria-label` when `iconOnly`); ≥44×44 target; `:focus-visible` ring; hover +
  active visual states (§VIII).
- **Mobile drawer behavior** — a `useNavDrawer()` hook manages: focus-into on open, Esc + scrim-pointerdown close,
  focus-restore to the hamburger trigger, and `inert`/`aria-hidden` on the drawer while closed (S2-BR-f). app-shell
  owns the drawer's static **closed** container from S1 (app-shell.tsx:71-100, `x=-width`); S2 **adds** the **open**
  transform (`x:0` on `isMobileNavOpen`) + the scrim (z below drawer, above content) — these do NOT exist in S1.
- **`isFeatureEnabled`** (`apps/web/src/shell/feature-flags.ts`) — `(flag: string) => boolean`; returns `false` in
  M1.0 (documented stub; the real flag source lands with Preferences, M1.1). The single seam S2-BR-b reads.
- **`nav-icons.ts`** (`apps/web/src/shell/nav-icons.ts`) — `Record<string, LucideIcon>` mapping module/surface `key`
  → a `lucide-react` icon, + a `FALLBACK_ICON`. No JSX (chrome data): components-as-values only.
- **app-shell.tsx changes** [FACT: app-shell.tsx:59-156] — replace the dock `RegionLabel` placeholder with
  `<ModuleDock dock={dock} bp={bp}/>`; the global-bar placeholder with `<GlobalBar mode={globalBarMode}
onOpenMobileNav={…}/>`; the spaces placeholder with the empty labeled reserved seam (S2-BR-i); add the scrim +
  drawer focus wiring for the mobile form. The 5-region frame, `useMedia()` bp resolution, `__bp` test override, and
  `LAYERING` z stay unchanged.
- **a11y** [FACT: §XIV] — dock `<nav aria-label="Modules">` of grouped links; global bar `<header>` actions reachable
  by Tab in visual order; `aria-current="page"` on the active item; drawer focus-managed + Esc; overflow `Menu`
  inherits UI-1's menu a11y; every actionable element has an accessible name (label or `aria-label` for icon-only).

## 4. Acceptance (S2 DoD — includes the component Visual Gate)

- [ ] Dock renders every `placement:'dock'` entry, grouped in `ModuleGroup` order; labels/routes all from `MODULE_MAP`
      (no hard-coded strings) (S2-BR-a)
- [ ] `gamification` (`visibleWhen`) is **absent** in M1.0 (fail-closed); no default-open surface (S2-BR-b, BR-6)
- [ ] `platform-services` group is **not rendered** in M1.0 (its only dock entry is hidden → empty group, no heading);
      `integration` renders 1 item (Notes) (S2-BR-a2)
- [ ] Dock reflows drawer→rail→sidebar across 375/768/1440; rail is icon-only with accessible names; desktop
      collapse toggle (name + `aria-expanded`) drives `isSidebarOpen` (S2-BR-c, M4) — **verified in a real browser**
- [ ] Global bar: condensed (hamburger + search icon + overflow menu) at 375; full (6 surfaces + search) at 768+;
      Search click flips `commandBar.isOpen` (S2-BR-g) — asserted via the store
- [ ] Nav to a registered route (`/`, `/notes`) renders it; nav to an unregistered route (`/tasks`) renders
      `NotFoundComponent` (no blank/throw); via `to` (SPA), never `href`; the widening is one `ShellRoute` boundary
      (NavLink + `shellNavigate`) (S2-BR-e, BR-4)
- [ ] Active route carries `aria-current="page"`; dock is `<nav>` of grouped links, each Tab-focusable with a
      visible `:focus-visible` ring (S2-BR-d, §XIV/§VIII)
- [ ] Mobile drawer: opens focus-into-first-focusable; Esc closes + restores focus to the hamburger; scrim-click
      closes; slide animates transform-only, reduced-motion→instant (S2-BR-f, BR-5)
- [ ] Closed mobile drawer: its links are **not** in the tab order (`inert`/`aria-hidden`), cleared on open (S2-BR-f, B3)
- [ ] Spaces bar present tablet+ as an empty labeled reserved region; absent at mobile (S2-BR-i)
- [ ] `lucide-react` added; rail/dock icons tint via `currentColor` from NavLink's row `color` token — theme-crossing
      confirmed in the Visual Gate (light + dark); no hex, all DS tokens; ≥44×44 targets (S2-BR-h, M2, S2-BR-j)
- [ ] Visual Gate = running app (`pnpm dev`) at 375/768/1440, **both themes** (temporary root `theme='dark'` flip):
      dock forms, global-bar modes, active highlight, drawer slide all correct (render-table:45)
- [ ] `@vida/web` typecheck · tests · lint green; `apps/web`→`@vida/ui` boundary one-way; jsdom tests via `__bp`
      cover: dock forms per bp, `aria-current`, gamification-hidden, drawer focus/Esc, global-bar modes, Search flip
- [ ] Currency (§XXIX): `information-architecture.md`/`shell-layout.md` re-verified current for the rendered nav;
      shell layer-doc (`apps/web/src/shell/CLAUDE.md`) updated with the new chrome files

## 5. Implementation Prompt (ordered; each step cites §2/§3)

1. **Dep + icons.** Add `lucide-react` (ADR-001:239; pin the resolved version) to `apps/web/package.json`;
   `pnpm install`. Create `apps/web/src/shell/nav-icons.ts` — `Record<string, LucideIcon>` for the dock modules +
   global surfaces + a `FALLBACK_ICON`. **Import named icons individually** (`import { Home, CheckSquare, … } from
'lucide-react'`), NEVER `import * as` — preserves tree-shaking (§XIII bundle budget, preflight FOLD-4) (S2-BR-h).
   +test (every dock/global `key` has a mapping OR resolves to the fallback).
2. **Feature-flag seam.** `apps/web/src/shell/feature-flags.ts` — `isFeatureEnabled(flag): boolean` returning
   `false` (M1.0 stub; doc-comment the M1.1 Preferences source). +test (S2-BR-b).
3. **`NavLink` + `shellNavigate`.** `apps/web/src/shell/nav-link.tsx` — TanStack `<Link to={path as ShellRoute…}>`
   wrapper (the single `ShellRoute` widening, inline §XV justification; **never `href`** — SPA only, S2-BR-e);
   `aria-current="page"` via `useRouterState` **exact** `location.pathname` compare (FOLD-3 — `/` must not match all;
   works even for unregistered targets);
   icon under a `color`-token row so `currentColor` tints (M2); label / `iconOnly` `aria-label`; ≥44×44;
   `:focus-visible` ring; hover/active states (S2-BR-d,e,h,j). Also export `shellNavigate(path)` (wraps
   `router.navigate` through the same `ShellRoute`) for the overflow Menu. +test (jsdom: aria-current on match;
   navigates to an unregistered path without throw; iconOnly sets aria-label; no `href` emitted).
4. **`ModuleDock`.** `apps/web/src/shell/module-dock.tsx` — filter `MODULE_MAP` `placement:'dock'` by
   `isFeatureEnabled` FIRST, group by `ModuleGroup` (declaration order), **omit any group left empty** (S2-BR-a2);
   render each surviving group as a labeled `role=group` list of `NavLink`s; switch content by `dock` form
   (rail=iconOnly; sidebar honors `isSidebarOpen` + the collapse toggle: header `Button`, name "Collapse/Expand
   sidebar", `aria-expanded`, `toggleSidebar`, M4) (S2-BR-a,a2,b,c,d). +test (jsdom via `dock`/`bp`: entries per
   group; **gamification absent + platform-services group absent**; rail sets aria-labels; toggle name/aria-expanded).
5. **`GlobalBar`.** `apps/web/src/shell/global-bar.tsx` — full: the 6 `GLOBAL_SURFACES` (`command-palette`→Search
   `Button`→`commandBar.open()`; route surfaces→`NavLink`); condensed: hamburger (`onOpenMobileNav`) + search icon +
   overflow UI-1 `Menu` whose items use `onSelect: () => shellNavigate(routePath)` (NOT links — MenuItem has no link
   slot, M3) (S2-BR-e,g, BR-1). +test (mode split; Search click flips the store; overflow onSelect navigates).
6. **Drawer a11y.** `apps/web/src/shell/use-nav-drawer.ts` — focus-into on open, Esc + scrim close, focus-restore to
   trigger, **`inert`+`aria-hidden` while closed** (B3), keyed to `isMobileNavOpen` (mount-gated effect dep — the
   U7/U8 portal-focus lesson) (S2-BR-f). +test (open→focus-in; Esc→closed+trigger focus; closed→inert).
7. **Wire app-shell.** `apps/web/src/shell/app-shell.tsx` — replace the three region placeholders with `<ModuleDock/>`
   / `<GlobalBar/>` / the empty labeled Spaces seam; **add** the mobile scrim (z below drawer, above content) + the
   drawer **open** transform (`x:0` on `isMobileNavOpen`, transform-only motion, reduced-motion instant) + `inert`
   binding + the `useNavDrawer` wiring — the closed slid-out container is S1's; the open state is new (B3). Frame
   geometry / `useMedia` / `__bp` / `LAYERING` unchanged (§3, S2-BR-c,f,i). Update the existing app-shell.test.tsx.
8. **Visual Gate = running app** (`pnpm dev`, render-table:45; `apps/web` has no Storybook) — capture 375/768/1440 ×
   {light, dark via a temporary root `theme='dark'`}: dock drawer/rail/sidebar, global-bar condensed/full, active
   highlight, drawer slide + scrim, rail icons legible. Fix anything jsdom can't see (the S1 process-shim/viewport
   lessons already landed).
9. **Currency + docs.** Re-verify `information-architecture.md`/`shell-layout.md` current for the rendered nav; update
   `apps/web/src/shell/CLAUDE.md` with the new files. Done-check → §4; run `@vida/web` typecheck/test/lint + build,
   confirm the one-way boundary; then the Visual Gate (step 8).

## 6. Open UNKNOWNs / Decisions Needed

- **None.** Every gap is closed by the documentation, no forks:
  - Icon library → **ADR-001:113,239-240** fixes `lucide-react` (web); the icon MAP (`key`→component) is rendering
    data S2 authors, not a decision (S2-BR-h).
  - Routing-degrade to unbuilt routes → **BR-4** + routes.tsx `NotFoundComponent` (S2-BR-e).
  - Mobile drawer behavior → **keyboard.ts** `FOCUS_CONTRACT`/`OVERLAY_DISMISS` + shell-layout.md motion (S2-BR-f).
  - Conditional-dock default → **BR-6** fail-closed + IA.md:112-113 (S2-BR-b).
  - ⌘K seam → command-bar-ui-store `open()` + the S3 boundary (S2-BR-g).

## 7. Change Log

| Date       | Session                                | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-3 | S2 detailed spec authored (nav chrome: module dock + global bar + Spaces seam; BR-a..j; §5 9-step prompt; §6 = none/all doc-resolved) — per Step-0 baseline (current) + Step-2 integration-check (5 risks resolved)                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-3 | **Rev 2 — gate-1 critique (independent) REVISE folded** (3 blockers + 4 material): B1 router escape-hatch precision (`to`+`ShellRoute` widening, `href` FORBIDDEN, `shellNavigate` for imperative nav); B2 skip empty groups (`platform-services` empty in M1.0 → new S2-BR-a2); B3 S1 ships only the CLOSED drawer — S2 adds the open transform+scrim + `inert`-when-closed (closed-drawer tab leak); M1 miscites fixed (`shell-layout` motion≠focus; "15 dock of 23"); M2 `currentColor` bridge needs a `color`-token row (`button.tsx:110` precedent); M3 overflow Menu uses `onSelect`+`shellNavigate` (MenuItem has no link slot); M4 collapse-toggle a11y (name+`aria-expanded`). |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-3 | **Corrected a manufactured "decision"** (Victor): icon library is NOT an open choice — **ADR-001:113,239-240** already fixes `lucide-react` (web). §6 → "None, all doc-resolved"; S2-BR-h re-grounded on the ADR (dropped the `@tamagui/lucide-icons` deliberation — that RC would've violated ADR-001's web/RN split anyway). [[read-architecture-before-implementing]]                                                                                                                                                                                                                                                                                                                |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-3 | **Visual-Gate finding (bounded frame + region scroll).** The dock renders all 14 dock modules, but S1's `minHeight:100vh` frame never bounded the viewport → tall dock content fell below the fold with no scroll (read as "missing modules"). Fix: root `height:100vh` + `overflow:hidden`; dock (both forms) + content region get `overflowY:auto` — each region scrolls independently, the global bar stays put, the closed off-canvas drawer is clipped. Refines S1's fill-only frame to fill-AND-bound.                                                                                                                                                                            |
| 2026-08-16 | 2026-08-16-ui-4-app-shell-components-3 | **Rev 3 — Approval 1 ✅ + preflight PASSED (5 folds).** FOLD-1 collapse toggle shows whenever `dock==='sidebar'` (collapsed-desktop ≠ tablet rail) so it can always re-expand; FOLD-2 rail (icon-only) groups use `aria-label` not visible `<h2>`; FOLD-3 `aria-current` is an EXACT pathname match (`/` must not light everything); FOLD-4 import named lucide icons individually (§XIII tree-shaking); FOLD-5 concrete cast form `to as unknown as LinkProps['to']` at one site, no `any`.                                                                                                                                                                                            |
