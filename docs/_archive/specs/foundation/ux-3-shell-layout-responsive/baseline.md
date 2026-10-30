# Baseline — ux-3-shell-layout-responsive (§XXVI.1a ground truth)

> No-Guessing: every line is `[FACT: source]` / `[INTERP: from fact]` / `[UNKNOWN: needs X]`.
> This is the ground truth the PLAN + both gates are measured against. Gathered 2026-08-09 from the live tree
> (branch `main`, post UX-1/UX-2 merged).

## 0. What UX-3 is, per the authoritative IA (UX-1)

- `[FACT: docs/core/architecture/information-architecture.md:153]` "**UX-3** designs the **visual layout /
  responsive behavior** of those regions" — the regions being the module dock, Spaces bar, and global bar.
- `[FACT: ia.md:10]` "Rendering is owned by **UI-4** (chrome) and **UX-3** (layout)." `[FACT: ia.md:16-18]`
  UX-1 scopes OUT "the shell visual layout/responsive design (UX-3)" and "the shell components —
  dock/sidebar/top-bar/command-bar/modal host (UI-4)".
- `[FACT: web-client-runtime/current-spec.md:101]` "**UI-4** (app shell, LIF-89) ← UI-1, UX-3 — **implements the
  UX-3 layout** on AR-4's router."
- `[INTERP]` UX-3 owns the **layout + responsive model** of the shell frame: how the regions compose, how the
  frame reflows across widths, and the density that makes it livable all day. UX-3 emits the **spec that UI-4
  implements as components** — UX-3 builds NO chrome components itself (that boundary is hard).

## 1. The regions UX-3 must lay out (from UX-1's reserved surfaces)

- `[FACT: ia.md:23-33]` **Two co-primary nav axes**: the **module dock** (content axis — grouped module list) +
  the **Spaces bar** (cross-cutting axis). `[FACT: ia.md:44-47]` The dock is **concrete in M1.0**; the Spaces bar
  is a **designed seam** that goes live in M1.1 → `[INTERP]` UX-3 must _reserve the region_ for the Spaces bar in
  the layout, but its content is empty/seam in M1.0.
- `[FACT: ia.md:98-107]` **Global bar surfaces** (reached from anywhere): Home `/`, Calendar `/calendar`,
  Search `⌘K` (overlay), Notifications `/notifications`, Settings `/settings`, Graph `/graph`.
- `[FACT: ia.md:71-76]` The module dock groups: Integration · Productivity · Knowledge · Personal Growth · Life
  Management · Platform Services (Gamification conditional on `feature_gamification`).
- `[INTERP]` The shell frame therefore composes at minimum: **module dock**, **Spaces bar (seam)**, **global bar**
  (top or edge), a **content region** (`<Outlet/>`), and a **command-bar/modal overlay host** (⌘K + dialogs).

## 2. What EXISTS today (the substrate UX-3 sits on)

- `[FACT: apps/web/src/routes.tsx:22-31]` The current shell is an explicit **placeholder** — `RootComponent`
  renders a bare `<nav>` + `<Outlet/>` with the comment _"Minimal shell only — the real app layout/IA is UX-3 /
  UI-4, out of AR-4 scope."_ `[INTERP]` UX-3's layout is the design that replaces this placeholder (built by UI-4).
- `[FACT: apps/web/src/stores/app-shell-ui-store.ts]` The shell UI store holds **one** piece of state today:
  `isSidebarOpen` (+ `toggleSidebar`/`setSidebarOpen`). Zustand, UI-only (BR-RT-6 — NEVER entity data or persisted
  prefs). `[INTERP]` The responsive layout will need _more_ ephemeral shell state (current breakpoint, dock
  collapsed, mobile drawer open) — UX-3 specifies what the store must reserve; the store extension is UI-4's build.
- `[FACT: apps/web/src/nav/module-map.ts + nav/CLAUDE.md]` `MODULE_MAP` / `GLOBAL_SURFACES` are the **central data**
  the dock/global-bar render from. "Data, not chrome… Rendering is UI-4 (chrome) / **UX-3 (layout)**." `routePath`
  is UX-facing and may differ from `key` (relationships → /people). `[INTERP]` UX-3 lays out regions that _read_
  this map; it does not modify the map.
- `[FACT: apps/web/src/command-bar/ + CLAUDE.md]` UX-2 shipped the ⌘K **contract** (`registry`, `nav-commands`,
  `frecency`, `search-provider` stub) + a `shellActionsProvider` seeded with **"Toggle sidebar"**. "Rendering is
  UI-4; **layout is UX-3**." `[INTERP]` UX-3 lays out the **command-bar overlay host** (position, max-width,
  z-layer, mobile behavior); the interaction is UX-2's, the render is UI-4's.
- `[FACT: web-client-runtime/current-spec.md:52,74]` Zustand = UI state incl. **sidebar**; `app-shell-ui-store.ts`
  is the reference store pattern. Routing = one central type-safe `routes.tsx`, lazy-split, **< 80 KB** initial
  bundle. `[FACT: web-client-runtime/current-spec.md:82]` "bundle budget (<80 KB) is a **UI-4/shell-era gate**."
  `[INTERP]` the perf budget lands on UI-4's build, not UX-3's spec — but UX-3's layout must be _designed_ to fit it.

> **⚠ CORRECTION (2026-08-09, post-profile-fix):** this baseline was first gathered under the wrong profile
> (`Generic`, loads only `process`), so it MISSED that **`STANDARDS/design.md §X` already fixes the breakpoint +
> container + density + touch-target values**. UX-3's authoritative profile is **add-frontend-component
> (design-led)** with authority **design.md (responsive)** `[FACT: m1.0-delivery-plan.md:210]`. The breakpoints are
> NOT an open UX-3 decision (see §3.1 corrected). design.md §X: breakpoints `375/768/1440/1920` (mobile-first, 3
> primary test widths 375/768/1440); §X Layout Containers: max content **1280 centered**, side padding **16/24/32**;
> §X Touch targets **44×44** min, 8px gap; §IV padding scale **Compact 8/12 · Default 12/16 · Loose 16/24 ·
> Spacious 24/32**; §V drawer radius `xl 16` / modal `lg 12` / shadow Level-3. UX-3 _applies the standard_ to the
> shell regions + expresses it in the Tamagui mechanism; it does not invent the widths.

## 3. What does NOT exist yet — seams UX-3 designs AGAINST but must NOT build

1. **`[FACT: grep packages/ui/src/tamagui.config.ts — no `media`/`createMedia`]` No responsive breakpoint system
   is WIRED yet** — DS-4's `tamagui.config.ts` composes tokens + fonts + animations + light/dark, but has **no
   `media` key**. `[FACT: design.md §X]` BUT the breakpoint _values_ ARE fixed by the standard (375/768/1440/1920).
   `[INTERP]` So UX-3 does NOT invent the widths (corrected) — it **applies design.md §X's breakpoints** to the
   shell regions and decides only the _mechanism/home_: encode them app-local + reserve a UI-4 `createMedia` seam,
   OR add `media` to DS-4's config. That home is the remaining `[UNKNOWN: PLAN]` (OQ-5), not the values.
2. **`[FACT: apps/web/package.json — deps are only @vida/core + @vida/types]` `@vida/ui` is NOT wired into
   `apps/web`.** The UI-1 primitives (v0.1.0) + the Tamagui provider are not a dependency of the web app yet.
   `[INTERP]` UX-3 designs the layout in terms of DS tokens/primitives, but the **wiring of `@vida/ui` + the
   `UIProvider` into `apps/web` is UI-4's** first step — a seam, not UX-3's build.
3. **The rendering shell (UI-4, LIF-89)** — `[FACT: ia.md:152; web-runtime:101]` dock/sidebar/top-bar/command-bar/
   modal host are UI-4 components, unbuilt. `[INTERP]` UX-3 defines the layout model UI-4 renders.
4. **The Spaces bar content (M1.1)** — `[FACT: ia.md:44-47,126-133]` Spaces is PARKED → M1.1. `[INTERP]` UX-3
   reserves the _region_ only.

## 4. Raw material that DOES exist (UX-3 composes from these)

- `[FACT: packages/ui/src/themes/tokens.ts:6]` **Spacing = a 4pt-grid token scale**: `space` = 0/4/8/12/16/20/24/
  32/40/48/64/80/96/128. `[INTERP]` the shell's **density** (gaps, region padding, dock item height, bar heights)
  is expressed in these tokens — UX-3 does not invent spacing values (DS-2 owns them). No dedicated "density" token
  exists → density is a _composition_ of spacing tokens, defined by UX-3.
- `[FACT: packages/ui/src/themes/]` DS foundation present: `tokens.ts`, `fonts.ts`, `motion.ts`, `shadow.ts`,
  `themes.ts`, light/dark. `[INTERP]` layer/elevation of the shell regions (dock over content, overlay host on top)
  expresses via `shadow.ts` + z-layer; motion of dock-collapse/drawer via `motion.ts` (B12: transform/opacity only).

## 5. Class determination (sets the §XXVI gate variant)

- `[FACT: sibling UX-1 _index.md + UX-2 baseline §3]` UX-1 and UX-2 were both classed **"design/spec issue that
  emits a declarative code artifact"** (UX-1 → `information-architecture.md` + `nav/module-map.ts`; UX-2 →
  `command-bar-and-search.md` + `command-bar/*` contract) → **FULL** double-gate, NOT the LITE variant.
- `[INTERP]` UX-3 is the **same class**: a design/layout-model spec over unbuilt seams. Its governing doc will be
  `docs/core/architecture/shell-layout.md` (mirroring `information-architecture.md` / `command-bar-and-search.md`).
  `[UNKNOWN: PLAN]` whether it _also_ emits a declarative code artifact this session (e.g. a `createMedia`
  breakpoint config or a `shell-regions.ts` layout-region model in `apps/web/src` or `packages/ui`) or is a
  pure-doc deliverable — **decided at the PLAN step**. Both are FULL-class. → **Recommend FULL §XXVI gate.**

## 6. UNKNOWNs to resolve at PLAN

- ⏳ `[UNKNOWN: PLAN]` **Breakpoint set** — how many named breakpoints + their widths (mobile / tablet / desktop /
  wide?), and the reflow behavior of each region at each (dock → rail → drawer; Spaces bar; global bar; overlay host).
- ⏳ `[UNKNOWN: PLAN]` **Code artifact vs pure-doc** — does UX-3 emit a `createMedia`/region model, or spec-only?
- ⏳ `[UNKNOWN: PLAN]` **Density model** — one density, or comfortable/compact? Which spacing tokens map to which
  region metric (bar heights, dock item size, content gutter).
- ⏳ `[UNKNOWN: PLAN]` **Scope line** — does UX-3 spec the _modal/overlay host_ geometry (⌘K + dialogs), or only
  the persistent frame? (Command-bar interaction is UX-2's; render is UI-4's — UX-3 owns only its _placement_.)

## 7. Contexts touched (Currency Rule §XXIX targets at close)

- `docs/core/architecture/` — UX-3 promotes its layout model here (new `shell-layout.md`), as UX-1/UX-2 did.
- `apps/web/src` shell — **read-only baseline** this session (nav model, shell store, command-bar, routes
  placeholder); a code artifact (breakpoint config / region model) is a `[UNKNOWN: PLAN]` add, not assumed.
- **No shell components are built** (that is UI-4) and **no nav/command-bar code is modified** (UX-1/UX-2 own it).
- `[INTERP]` The shell **code context is from-zero** (routes.tsx is a placeholder; no shell component context
  exists to baseline). Per §XXX's from-zero caveat, there are **no prior `current-*` docs to refresh** — the
  contexts UX-3 _reads_ (nav, web-client-runtime, command-bar) are verified **current** as of this baseline.
