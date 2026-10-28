# Interpretation — fe-shell (CODEC unit #14)

> Entity Delivery Flow ② · Step 1 (Interpretation Layer, methodology §3). Makes the implicit explicit from the
> TRUSTED sources before decomposition. Default scenario. Every claim is `[FACT: path:line]` / `[INTERP: from fact]`
> / `[UNKNOWN: needs X]`. Baseline (this session) established the built shell state; this layer derives the delta.

## 0. What fe-shell is (one-paragraph frame)

fe-shell reshapes the shipped **ui-4/ux-3 app shell** (a 5-fixed-region frame) into the CODEC **two positionable
content-fit panel** model `[FACT: reconstructed-structure.md:39; g6-reshape-runbook.md:48]`. It owns the **panel
frame mechanism** (two macOS/iPadOS-inspector-style panels — dockable, content-fitting, repositionable) + the
**Content** region (`<Outlet/>`) + the **Overlay host** region `[FACT: decomposition.md:53-56]`. The panel
**contents** (Bar 1 scope selector + global surfaces → #15; Session HUD → #16; ⌘K → #17) are **separate units**
`[FACT: g6-reshape-runbook.md:49-51]`. Origin: `ext UI-4/UX-3 (sup LIF-199)` — _extend_ the shipped shell issues;
_supersede_ the old `fe-shell-integration-wiring` planning stub, NOT the ui-4 code `[FACT: g6-reshape-runbook.md:26,48;
g6-edge-ledger.md:56,142-143]`.

---

## 1. DEPENDENCIES — every upstream (built artifacts this composes/extends)

### 1a. The built shell (ui-4/ux-3) — the base being reshaped

- **`apps/web/src/shell/regions.ts`** — the typed layout MODEL (data-only): `ShellRegion` union
  `'moduleDock'|'globalBar'|'spacesBar'|'content'|'overlayHost'` `[FACT: regions.ts:8]`; `DockState`
  drawer→rail→sidebar `[FACT: regions.ts:11,17-22]`; `OverlayMode` sheet/centered `[FACT: regions.ts:14,25-30]`;
  `GLOBAL_BAR_MODE` `[FACT: regions.ts:33-38]`; `REGION_VISIBILITY` (spacesBar hidden<768, reserved≥768)
  `[FACT: regions.ts:44-50]`; `LAYERING` ($sticky/$overlay/$modal, level-3) `[FACT: regions.ts:58-64]`;
  `ShellUIStateContract {isSidebarOpen, isMobileNavOpen}` `[FACT: regions.ts:71-76]`; `*At()` predicates
  `[FACT: regions.ts:79-99]`; `SHELL_REGIONS` `[FACT: regions.ts:105-111]`.
- **`apps/web/src/shell/breakpoints.ts`** — breakpoint SSOT: `BREAKPOINTS` 375/768/1440/1920, `CONTENT_MAX_WIDTH`
  1280, `SIDE_PADDING` 16/24/32, `TOUCH_TARGET` 44, `TAMAGUI_MEDIA` (createMedia seam) `[FACT: shell/CLAUDE.md
"Model" block; shell-layout.md:45-56,84-89]`.
- **`apps/web/src/shell/app-shell.tsx`** — the `AppShell` CHROME: renders the 5 regions, `useMedia()` breakpoint
  resolution, bounded-viewport frame (`height:100vh`+`overflow:hidden`; dock & content scroll independently), mobile
  drawer open-transform + scrim; mounted in `routes.tsx` `RootComponent` wrapping `<Outlet/>` `[FACT: shell/CLAUDE.md
"Chrome" block]`.
- **`module-dock.tsx` / `global-bar.tsx`** — current Bar-2/Bar-1-equivalent renderers: dock renders `MODULE_MAP`
  grouped (drawer/rail/sidebar); global bar renders `GLOBAL_SURFACES` (condensed/full) + ⌘K + overflow Menu
  `[FACT: shell/CLAUDE.md "Chrome" block]`.
- **`command-bar.tsx`** — ⌘K overlay composing UI-1 `Dialog`+`Input`+hand-rolled listbox; two store-driven modes
  (command list / `search-unavailable` stub) `[FACT: shell/CLAUDE.md; ui-4 _index.md:80]`. (Its _content_ is #17's;
  fe-shell owns only where the overlay MOUNTS.)
- **Stores**: `stores/app-shell-ui-store.ts` (`isSidebarOpen`, `isMobileNavOpen` + setters/togglers)
  `[FACT: shell/CLAUDE.md "Store" rule]`; `stores/command-bar-ui-store.ts` (`isOpen`, `query`, `mode`) `[FACT:
baseline inventory §3]`.
- **`apps/web/src/nav/module-map.ts`** — `MODULE_MAP` + `GLOBAL_SURFACES` (the nav data Bar 2 / Bar 1 render)
  `[FACT: shell/CLAUDE.md; ui-4 _index.md:26]`.

### 1b. The CODEC primitives it composes (all shipped in `@vida/ui`)

- UI-1 primitives `Button`/`Menu`/`Dialog`/`Input` + the CODEC ThemeProvider/patterns (`EmptyState`, `SyncStatus`,
  8-state) + the 7 view renderers + the 5 archetype shells (`CollectionView`/`DashboardView`/`EntityView`/
  `CanvasView`/`FlowSessionView`) — all present `[FACT: packages/ui/src/index.ts; baseline inventory §2]`. The shell
  does **not** rebuild any of these.

### 1c. The design authority (what the panels MUST be)

- **`frontend-quality-bar/_index.md:103-111 §4.1`** — the governing spec: two **positionable, content-fitting
  responsive panels** (macOS/iPadOS-inspector: dock together on any side; size to contents 2–3 cols / 1–4 rows;
  viewport-edge only when needed). Bar 1 = system/account (6 global surfaces redistributed across Bar1/Bar2/⌘K, none
  dropped + `Spaces:` scope selector). Bar 2 = content (modules by default, or user choice). ⌘K is the spine; shell
  reflows (dock drawer→rail→sidebar; Spaces→⌘K on mobile).
- **`p6-organization-map.html:135`** — "Responsive panels, not fixed rails … content-fitting panels (like a
  macOS/iPadOS inspector): dock **together** on any side, take only enough room to show their contents — 2–3 columns
  or 1–4 rows, extending to the viewport edge only when they need to."
- **`decomposition.md:53-57`** — Tier-1 shell table: Bar 1 (system/account panel) · Bar 2 (content panel) · Content
  `<Outlet/>` · Overlay host · Session HUD (region 6, net-new).
- **`docs/core/architecture/shell-layout.md`** — the responsive/layering/motion/density model fe-shell inherits
  (breakpoints, mobile-first reflow, z-scale, B12 transform/opacity-only motion, 44×44 touch targets).

### 1d. Inherited whole-issue invariants (ui-4 BR-1…7 — fe-shell re-inherits)

- BR-1 compose-don't-rebuild (chrome in `apps/web/src` over UI-1; only non-component `packages/ui` edit allowed)
  `[FACT: ui-4 _index.md:33-36]` · BR-2 no shell-invented values (every spacing/radius/z = DS token)
  `[FACT: ui-4 _index.md:37-39]` · BR-3 responsive reflow is data-driven (read `regions.ts`/`useMedia()`, never a
  hard-coded width) `[FACT: ui-4 _index.md:40-42]` · BR-4 degrade-never-crash (terminal states; unknown route →
  `NotFoundComponent`; no-index search → `search-unavailable`) `[FACT: ui-4 _index.md:43-46]` · BR-5 focus+motion
  contract `[FACT: ui-4 _index.md:47-49]` · BR-6 M1.0 boundary (auth OFF; crypto = deferred seam)
  `[FACT: ui-4 _index.md:50-51]` · BR-7 lazy-load heavy WebGL (`/graph` split) `[FACT: ui-4 _index.md:52-53]`.

---

## 2. NEEDS — preconditions to function

- **Boot/runtime:** the shell mounts in `routes.tsx` `RootComponent` AFTER `App.tsx`'s DB-ready gate + `UIProvider`
  `[FACT: shell/CLAUDE.md; baseline inventory §1]`. fe-shell changes the frame INSIDE `AppShell`; the mount point and
  provider order are unchanged `[INTERP]`.
- **Responsive seam:** `useMedia()` is live (ui-4 registered `TAMAGUI_MEDIA` into `createMedia`)
  `[FACT: shell-layout.md:149; ui-4 BR-1]` — panel reflow reads it, never a stored width.
- **Panel-position state:** the positionable/dockable panels need ephemeral position/arrangement state. The current
  store only holds `isSidebarOpen`/`isMobileNavOpen` `[FACT: regions.ts:71-76]`. Positionable panels need MORE
  (which side each panel is docked, whether docked-together, open/collapsed). `[INTERP]` this extends
  `app-shell-ui-store` (the ui-4 pattern: "UI-4 extends the store; UX-3 reserves the shape"
  `[FACT: shell-layout.md:120,151]`). `[UNKNOWN: the exact new store shape — resolve at decomposition/envision]`.
- **Panel-position PERSISTENCE:** panel position/arrangement is a user preference persisted to **`nav_preferences`**
  `[FACT: traceability.md:34 "Bar1+Bar2 … nav_preferences"]`. `nav_preferences` is a @vida/core Preferences table
  (shipped service). `[INTERP]` M1 consumes it via a **`ProviderRead` seam** (never direct tables — the
  `providers/CLAUDE.md` convention); `[UNKNOWN: is the live provider wired in M1 or stubbed to defaults?` —
  mirror the CODEC "live hook deferred to first consumer" pattern; resolve at decomposition]`.
- **Content region:** the routed `<Outlet/>` must stay the single content host; module surfaces render inside it
  (inherited, not redesigned) `[FACT: shell-layout.md:152]`.
- **Overlay host:** the ⌘K/modal layer must remain mountable at `$overlay`/`$modal` with sheet(mobile)/centered(tablet+)
  geometry `[FACT: regions.ts:58-64; shell-layout.md:134-143]`.

---

## 3. ORGANIZATION — OWNS vs CONSUMES vs DELEGATES

|               | fe-shell (#14)                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **OWNS**      | the **two-panel positionable/content-fit/dockable FRAME mechanism** (generic Panel container + its positioning/docking/content-fit/collapse layout behavior + responsive reflow) · the **Content region** (`<Outlet/>` host + gutters/max-width) · the **Overlay host region** (placement/geometry/layering) · the panel-position store extension · the reshaped `regions.ts`/`app-shell.tsx` frame                                                             |
| **CONSUMES**  | `@vida/ui` primitives (never rebuilt, BR-1) · the extended `regions.ts`/`breakpoints.ts` model · `useMedia()` · `nav_preferences` via a `ProviderRead` seam (panel position) · `app-shell-ui-store`                                                                                                                                                                                                                                                             |
| **DELEGATES** | **Bar 1 contents** (scope selector + 6 global surfaces) → **#15 fe-shell-scope** `[FACT: g6-reshape-runbook.md:49]` · **Session HUD** (region 6) → **#16 fe-session-hud** `[FACT: :50]` · **⌘K command content** → **#17 fe-cmdk** (fe-shell owns only the overlay-host MOUNT, not the command registry/search) `[FACT: :51]` · module/Space/pin CONTENT rendered INTO Bar 2 → the nav data layer + module surfaces (M1.1+) `[INTERP from decomposition.md:54]` |

**The load-bearing boundary (#14 vs #15):** fe-shell builds the **panels as empty positionable containers** with
their layout/docking behavior + slots; #15 fills Bar 1's slot with the scope selector + global surfaces. `[INTERP:
from g6-reshape-runbook.md:48-49 — "#14 = panels + regions"; "#15 = Bar 1 + selector + surfaces"]`. **Flagged for the
Interpretation Gate / Envision review** (see §5-F1).

---

## 4. IMPLICIT RULES — hidden invariants no single doc states outright

- **IR-1 (frame-not-content):** fe-shell renders the panel _shells_ and their positioning behavior; it must render a
  **teaching/placeholder slot** (not Bar 1's real content) so #15 can later inject — else #14 can't ship independently.
  `[INTERP: the #14/#15 split only works if #14 ships with empty-but-functional panels]`.
- **IR-2 (positionable ⇒ new state ⇒ persistence seam):** "positionable" is meaningless without stored position;
  stored position implies `nav_preferences` persistence; persistence in M1 implies a `ProviderRead` seam with an
  honest default (panels at their default dock) when the provider is absent. `[INTERP from traceability.md:34 +
providers/CLAUDE.md deny-safe-default precedent]`.
- **IR-3 (content-fit ⇒ measure, not fixed width):** "size to contents (2–3 cols / 1–4 rows), viewport-edge only
  when needed" means the panel width is **driven by its content**, NOT a fixed `SIDE_PADDING`/sidebar width — a real
  departure from the current fixed `DockState` sidebar `[FACT: regions.ts:17-22]`. The reflow model gains a
  content-fit dimension the current `*At()` predicates don't express. `[INTERP]`.
- **IR-4 (dock-together ⇒ a combined arrangement):** the two panels can dock _together_ on a side
  `[FACT: p6-organization-map.html:135]` — a layout state beyond "each panel independently placed". `[INTERP: the
arrangement model must represent together-vs-separate]`.
- **IR-5 (reflow continuity):** the existing mobile reflow (drawer→rail→sidebar; Spaces→⌘K on mobile) must survive
  the reshape — at 375 the positionable panels collapse to the mobile drawer/⌘K behavior, not a broken desktop layout
  `[FACT: quality-bar §4.1:110; shell-layout.md:60-75]`.
- **IR-6 (no shell-invented values, re-inherited):** every new panel metric (gaps, radii, collapse widths, z) is a DS
  token; the only novel design is the _reflow/positioning behaviour_, not values `[FACT: ui-4 BR-2; shell/CLAUDE.md
"Apply the standard, never invent"]`.
- **IR-7 (ADR-006 amendment owed):** the Spaces-strip → scope-selector refactor is an owed ADR-006/shell-layout
  amendment `[FACT: quality-bar §5:149]` — but the SELECTOR is #15; fe-shell only reshapes the _region_ that the
  strip occupied (spacesBar) into panel real estate. `[INTERP: fe-shell retires/repurposes the `spacesBar` region;
the selector content is #15]`.
- **IR-8 (package boundary):** one-way `apps/web → @vida/ui`; any `packages/ui` touch must be non-component config
  only (the ui-4 `media`/`sideEffects` precedent) `[FACT: shell/CLAUDE.md "Chrome composes UI-1" + BR-1]`. `[INTERP:
rule-of-three likely still unmet → the panel frame stays in `apps/web/src/shell`, not a new `@vida/ui` component]`.

---

## 5. Interpretation flags — RESOLVED at the Envision Gate (2026-10-10)

The locked interaction model is **`delivery/envision.md` M1–M7** (the macOS/iPadOS inspector dock⇄detach — each nav
panel toggles between **docked** [inline, content beside — "A"] and **floating** [overlay + scrim — "B"], rearrangeable
to any of the four edges, content-fit, one responsive model, reserved top strip). It supersedes the pre-envision
inline-vs-overlay framing in §3/§4 above.

- **F1 — #14/#15 boundary** → RESOLVED: #14 ships the panels as empty-but-functional containers + slots; Bar 1 content
  (scope + 6 surfaces)→#15, HUD→#16, ⌘K→#17 (envision L4; `g6-reshape-runbook.md:48-51`).
- **F2 — `nav_preferences` provider** → RESOLVED: placement (dock/float · edge) + open-state persist via `ProviderRead`;
  **M1 stubs to the default** (envision L5; CODEC first-consumer-defers precedent).
- **F3 — `regions.ts` reshape** → DECOMPOSITION: the fixed `DockState`/`*At()` model gains a placement dimension
  (dock|float × edge × content-fit); slice-map decides extend-in-place vs a parallel panel model.
- **F4 — Envision** → FIRED + **human review PASSED, model LOCKED** (envision.md). EC-1…EC-12 pinned.

## 6. Sources

reconstructed-structure.md · g6-reshape-runbook.md · g6-edge-ledger.md · decomposition.md · surface-map.md ·
traceability.md · frontend-quality-bar/\_index.md · p6-organization-map.html · docs/core/architecture/shell-layout.md ·
apps/web/src/shell/{regions.ts,breakpoints.ts,app-shell.tsx,CLAUDE.md} · ui-4-app-shell-components/\_index.md ·
baseline inventory (this session).
